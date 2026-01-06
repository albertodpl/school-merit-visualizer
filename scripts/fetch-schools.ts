import * as fs from 'fs';
import * as path from 'path';

const API_BASE = 'https://api.skolverket.se/planned-educations/v3';
const ACCEPT_HEADER = 'application/vnd.skolverket.plannededucations.api.v3.hal+json';

interface CompactSchoolUnit {
  schoolUnitCode: string;
  schoolUnitName: string;
  wgs84Latitude: string;
  wgs84Longitude: string;
  abroadSchool: boolean;
}

interface ApiResponse {
  status: string;
  body: {
    _embedded?: {
      compactSchoolUnits?: CompactSchoolUnit[];
    };
    page?: {
      totalPages: number;
    };
  };
}

interface StatValue {
  value: string;
  valueType: string;
  timePeriod: string;
}

interface GrundskoleStatisticsBody {
  averageGradesMeritRating9thGrade?: StatValue[];
  ratioOfPupilsIn9thGradeWithAllSubjectsPassed?: StatValue[];
  ratioOfPupilsIn6thGradeWithAllSubjectsPassed?: StatValue[];
  averageResultNationalTestsSubjectSVE6thGrade?: StatValue[];
  averageResultNationalTestsSubjectENG6thGrade?: StatValue[];
  averageResultNationalTestsSubjectMA6thGrade?: StatValue[];
  studentsPerTeacherQuota?: StatValue[];
  certifiedTeachersQuota?: StatValue[];
  totalNumberOfPupils?: StatValue[];
  [key: string]: unknown;
}

interface GymnasiumProgramMetric {
  programCode: string;
  ratioOfStudentsEligibleForUndergraduateEducation?: StatValue[];
  gradesPointsForStudents?: StatValue[];
  gradesPointsForStudentsWithExam?: StatValue[];
  ratioOfPupilsWithExamWithin3Years?: StatValue[];
  admissionPointsMin?: StatValue[];
  admissionPointsAverage?: StatValue[];
  totalNumberOfPupils?: StatValue[];
  [key: string]: unknown;
}

interface GymnasiumStatisticsBody {
  programMetrics?: GymnasiumProgramMetric[];
  studentsPerTeacherQuota?: StatValue[];
  certifiedTeachersQuota?: StatValue[];
  totalNumberOfPupils?: StatValue[];
  [key: string]: unknown;
}

interface SchoolDetailBody {
  code: string;
  name: string;
  principalOrganizerType?: string;
  contactInfo?: {
    addresses?: Array<{
      type: string;
      street?: string;
      zipCode?: string;
      city?: string;
    }>;
  };
  geographicalAreaCode?: string;
  [key: string]: unknown;
}

interface RawSchoolData {
  schoolUnitCode: string;
  compactData: CompactSchoolUnit;
  details: SchoolDetailBody | null;
  statistics: GrundskoleStatisticsBody | null;
  gymnasiumStatistics: GymnasiumStatisticsBody | null;
}

async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        headers: { Accept: ACCEPT_HEADER },
      });
      if (response.ok) return response;
      if (response.status === 429) {
        console.log(`  Rate limited, waiting ${2 * (i + 1)}s...`);
        await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
        continue;
      }
      if (response.status === 404) {
        throw new Error('NOT_FOUND');
      }
      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw new Error('Max retries exceeded');
}

async function fetchAllSchoolUnits(): Promise<CompactSchoolUnit[]> {
  const schools: CompactSchoolUnit[] = [];
  let page = 0;
  let totalPages = 1;

  console.log('Fetching school units...');

  while (page < totalPages) {
    const url = `${API_BASE}/compact-school-units?coordinateSystemType=WGS84&page=${page}&size=100`;
    const response = await fetchWithRetry(url);
    const data: ApiResponse = await response.json();

    if (data.body?._embedded?.compactSchoolUnits) {
      schools.push(...data.body._embedded.compactSchoolUnits);
    }

    if (data.body?.page) {
      totalPages = data.body.page.totalPages;
    }

    page++;
    if (page % 10 === 0 || page === totalPages) {
      console.log(`  Page ${page}/${totalPages} - ${schools.length} schools`);
    }

    await new Promise(resolve => setTimeout(resolve, 50));
  }

  return schools;
}

async function fetchSchoolDetails(schoolUnitCode: string): Promise<SchoolDetailBody | null> {
  try {
    const url = `${API_BASE}/school-units/${schoolUnitCode}`;
    const response = await fetchWithRetry(url);
    const data = await response.json();
    return data.body || null;
  } catch {
    return null;
  }
}

async function fetchGrundskoleStatistics(schoolUnitCode: string): Promise<GrundskoleStatisticsBody | null> {
  try {
    const url = `${API_BASE}/school-units/${schoolUnitCode}/statistics/gr`;
    const response = await fetchWithRetry(url);
    const data = await response.json();
    return data.body || null;
  } catch {
    return null;
  }
}

async function fetchGymnasiumStatistics(schoolUnitCode: string): Promise<GymnasiumStatisticsBody | null> {
  try {
    const url = `${API_BASE}/school-units/${schoolUnitCode}/statistics/gy`;
    const response = await fetchWithRetry(url);
    const data = await response.json();
    return data.body || null;
  } catch {
    return null;
  }
}

function hasValidCoordinates(school: CompactSchoolUnit): boolean {
  const lat = parseFloat(school.wgs84Latitude);
  const lng = parseFloat(school.wgs84Longitude);
  return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0 && !school.abroadSchool;
}

async function main() {
  console.log('Starting school data fetch...\n');

  // Create data directory for raw data
  const rawDataDir = path.join(__dirname, '../src/data/raw');
  if (!fs.existsSync(rawDataDir)) {
    fs.mkdirSync(rawDataDir, { recursive: true });
  }

  // Fetch all school units
  const allSchools = await fetchAllSchoolUnits();
  console.log(`\nTotal schools fetched: ${allSchools.length}`);

  // Save raw compact data
  fs.writeFileSync(
    path.join(rawDataDir, 'compact-school-units.json'),
    JSON.stringify(allSchools, null, 2)
  );
  console.log('Saved raw compact school units data');

  const schoolsWithCoords = allSchools.filter(hasValidCoordinates);
  console.log(`Schools with valid coordinates: ${schoolsWithCoords.length}`);

  // Collect all raw data
  const rawData: RawSchoolData[] = [];
  let processed = 0;
  let withGrundskoleData = 0;
  let withGymnasiumData = 0;

  console.log('\nFetching details, grundskola stats, and gymnasium stats...');
  console.log('(This will take several minutes for ~6500 schools)\n');

  const batchSize = 10;
  for (let i = 0; i < schoolsWithCoords.length; i += batchSize) {
    const batch = schoolsWithCoords.slice(i, i + batchSize);

    const results = await Promise.all(
      batch.map(async (school) => {
        const [details, statistics, gymnasiumStatistics] = await Promise.all([
          fetchSchoolDetails(school.schoolUnitCode),
          fetchGrundskoleStatistics(school.schoolUnitCode),
          fetchGymnasiumStatistics(school.schoolUnitCode),
        ]);
        return {
          schoolUnitCode: school.schoolUnitCode,
          compactData: school,
          details,
          statistics,
          gymnasiumStatistics,
        };
      })
    );

    for (const raw of results) {
      processed++;
      rawData.push(raw);

      // Count schools with data
      if (raw.statistics && Object.keys(raw.statistics).length > 0) {
        withGrundskoleData++;
      }
      if (raw.gymnasiumStatistics && raw.gymnasiumStatistics.programMetrics && raw.gymnasiumStatistics.programMetrics.length > 0) {
        withGymnasiumData++;
      }
    }

    if (processed % 500 === 0 || processed === schoolsWithCoords.length) {
      console.log(`  Processed ${processed}/${schoolsWithCoords.length} - GR: ${withGrundskoleData}, GY: ${withGymnasiumData}`);
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\nFetch complete!`);
  console.log(`  Schools with grundskola stats: ${withGrundskoleData}`);
  console.log(`  Schools with gymnasium stats: ${withGymnasiumData}`);

  // Save all raw data for offline processing
  fs.writeFileSync(
    path.join(rawDataDir, 'all-school-data.json'),
    JSON.stringify(rawData, null, 2)
  );
  console.log(`\nSaved all raw data to ${path.join(rawDataDir, 'all-school-data.json')}`);

  // Save fetch metadata
  const metadata = {
    fetchedAt: new Date().toISOString(),
    totalSchools: rawData.length,
    withGrundskoleStats: withGrundskoleData,
    withGymnasiumStats: withGymnasiumData,
  };
  fs.writeFileSync(
    path.join(rawDataDir, 'fetch-metadata.json'),
    JSON.stringify(metadata, null, 2)
  );
  console.log('Saved fetch metadata');

  console.log(`\nRun "pnpm run process-data" to process the raw data into schools.json`);
}

main().catch(console.error);
