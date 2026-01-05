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

interface StatisticsBody {
  averageGradesMeritRating9thGrade?: StatValue[];
  studentsPerTeacherQuota?: StatValue[];
  certifiedTeachersQuota?: StatValue[];
  ratioOfPupilsIn9thGradeWithAllSubjectsPassed?: StatValue[];
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

interface School {
  id: string;
  name: string;
  coordinates: [number, number];
  municipality: string;
  type: 'municipal' | 'independent';
  address: {
    street: string;
    postalCode: string;
    city: string;
  };
  statistics: {
    meritValue: number | null;
    meritHistory: { year: string; value: number }[];
    studentsPerTeacher: number | null;
    certifiedTeachersRatio: number | null;
    passRateGrade9: number | null;
  };
}

interface RawSchoolData {
  schoolUnitCode: string;
  compactData: CompactSchoolUnit;
  details: SchoolDetailBody | null;
  statistics: StatisticsBody | null;
}

// Parse Swedish decimal format "217,6" to 217.6
function parseSwedishNumber(value: string | undefined): number | null {
  if (!value || value === '.' || value === '-') return null;
  const parsed = parseFloat(value.replace(',', '.'));
  return isNaN(parsed) ? null : parsed;
}

// Get most recent value from StatValue array
function getMostRecentValue(data: StatValue[] | undefined): number | null {
  if (!data || data.length === 0) return null;
  for (const entry of data) {
    if (entry.valueType === 'EXISTS') {
      return parseSwedishNumber(entry.value);
    }
  }
  return null;
}

// Get merit history from StatValue array
function getMeritHistory(data: StatValue[] | undefined): { year: string; value: number }[] {
  if (!data) return [];
  return data
    .filter(entry => entry.valueType === 'EXISTS')
    .map(entry => ({
      year: entry.timePeriod,
      value: parseSwedishNumber(entry.value) || 0,
    }))
    .slice(0, 5);
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

async function fetchSchoolStatistics(schoolUnitCode: string): Promise<StatisticsBody | null> {
  try {
    const url = `${API_BASE}/school-units/${schoolUnitCode}/statistics/gr`;
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

function processSchoolData(raw: RawSchoolData): School {
  const { compactData, details, statistics } = raw;

  const visitingAddress = details?.contactInfo?.addresses?.find(
    a => a.type === 'VISITING_ADDRESS'
  );

  return {
    id: compactData.schoolUnitCode,
    name: compactData.schoolUnitName,
    coordinates: [
      parseFloat(compactData.wgs84Latitude),
      parseFloat(compactData.wgs84Longitude),
    ],
    municipality: visitingAddress?.city || 'Unknown',
    type: details?.principalOrganizerType === 'Kommunal' ? 'municipal' : 'independent',
    address: {
      street: visitingAddress?.street || '',
      postalCode: visitingAddress?.zipCode || '',
      city: visitingAddress?.city || '',
    },
    statistics: {
      meritValue: getMostRecentValue(statistics?.averageGradesMeritRating9thGrade),
      meritHistory: getMeritHistory(statistics?.averageGradesMeritRating9thGrade),
      studentsPerTeacher: getMostRecentValue(statistics?.studentsPerTeacherQuota),
      certifiedTeachersRatio: getMostRecentValue(statistics?.certifiedTeachersQuota),
      passRateGrade9: getMostRecentValue(statistics?.ratioOfPupilsIn9thGradeWithAllSubjectsPassed),
    },
  };
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
  const schools: School[] = [];
  let processed = 0;
  let withMeritData = 0;

  console.log('\nFetching details and statistics...');
  console.log('(This will take several minutes for ~6500 schools)\n');

  const batchSize = 10;
  for (let i = 0; i < schoolsWithCoords.length; i += batchSize) {
    const batch = schoolsWithCoords.slice(i, i + batchSize);

    const results = await Promise.all(
      batch.map(async (school) => {
        const [details, statistics] = await Promise.all([
          fetchSchoolDetails(school.schoolUnitCode),
          fetchSchoolStatistics(school.schoolUnitCode),
        ]);
        return {
          schoolUnitCode: school.schoolUnitCode,
          compactData: school,
          details,
          statistics
        };
      })
    );

    for (const raw of results) {
      processed++;
      rawData.push(raw);

      const school = processSchoolData(raw);
      schools.push(school);
      if (school.statistics.meritValue !== null) {
        withMeritData++;
      }
    }

    if (processed % 500 === 0 || processed === schoolsWithCoords.length) {
      console.log(`  Processed ${processed}/${schoolsWithCoords.length} - Found ${withMeritData} with merit data`);
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\nSchools with merit data: ${schools.length}`);

  // Save all raw data for offline processing
  fs.writeFileSync(
    path.join(rawDataDir, 'all-school-data.json'),
    JSON.stringify(rawData, null, 2)
  );
  console.log(`\nSaved all raw data to ${path.join(rawDataDir, 'all-school-data.json')}`);

  // Sort and save processed data
  schools.sort((a, b) => (b.statistics.meritValue || 0) - (a.statistics.meritValue || 0));

  const outputPath = path.join(__dirname, '../src/data/schools.json');
  fs.writeFileSync(outputPath, JSON.stringify(schools, null, 2));
  console.log(`Saved processed data to ${outputPath}`);

  // Print stats
  const avgMerit = schools.reduce((sum, s) => sum + (s.statistics.meritValue || 0), 0) / schools.length;
  const municipalities = [...new Set(schools.map(s => s.municipality))];
  console.log(`\nStats:`);
  console.log(`  Total schools with merit data: ${schools.length}`);
  console.log(`  Average merit: ${avgMerit.toFixed(1)}`);
  console.log(`  Highest merit: ${schools[0]?.statistics.meritValue?.toFixed(1)} (${schools[0]?.name})`);
  console.log(`  Municipal: ${schools.filter(s => s.type === 'municipal').length}`);
  console.log(`  Independent: ${schools.filter(s => s.type === 'independent').length}`);
  console.log(`  Municipalities: ${municipalities.length}`);
}

main().catch(console.error);
