import * as fs from 'fs';
import * as path from 'path';

const API_BASE = 'https://api.skolverket.se/planned-educations/v3';
const ACCEPT_HEADER = 'application/vnd.skolverket.plannededucations.api.v3.hal+json';

interface CompactSchoolUnit {
  schoolUnitCode: string;
  schoolUnitName: string;
  wgs84Latitude: number;
  wgs84Longitude: number;
  educationEventTypeOfSchooling?: string;
}

interface ApiResponse {
  _embedded?: {
    listedSchoolUnits?: CompactSchoolUnit[];
  };
  page?: {
    totalElements: number;
    totalPages: number;
    number: number;
  };
}

interface SchoolUnitDetail {
  schoolUnitCode: string;
  schoolUnitName: string;
  principalOrganizerType?: string;
  visitingAddress?: {
    street?: string;
    zipCode?: string;
    city?: string;
  };
  geographicalAreaCode?: string;
}

interface StatisticsResponse {
  gradeNineAverageMeritRating?: Record<string, number>;
  studentTeacherQuota?: Record<string, number>;
  certifiedTeachersQuota?: Record<string, number>;
  gradeNineAllSubjectsPassedRatio?: Record<string, number>;
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

async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        headers: { Accept: ACCEPT_HEADER },
      });
      if (response.ok) return response;
      if (response.status === 429) {
        // Rate limited, wait and retry
        await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
        continue;
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

    if (data._embedded?.listedSchoolUnits) {
      schools.push(...data._embedded.listedSchoolUnits);
    }

    if (data.page) {
      totalPages = data.page.totalPages;
    }

    page++;
    console.log(`  Page ${page}/${totalPages} - ${schools.length} schools`);

    // Be nice to the API
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return schools;
}

async function fetchSchoolDetails(schoolUnitCode: string): Promise<SchoolUnitDetail | null> {
  try {
    const url = `${API_BASE}/school-units/${schoolUnitCode}`;
    const response = await fetchWithRetry(url);
    return await response.json();
  } catch (error) {
    console.warn(`  Failed to fetch details for ${schoolUnitCode}`);
    return null;
  }
}

async function fetchSchoolStatistics(schoolUnitCode: string): Promise<StatisticsResponse | null> {
  try {
    const url = `${API_BASE}/school-units/${schoolUnitCode}/statistics/gr`;
    const response = await fetchWithRetry(url);
    return await response.json();
  } catch (error) {
    // Not all schools have GR statistics
    return null;
  }
}

function isGrundskola(school: CompactSchoolUnit): boolean {
  // Filter for grundskola (primary/secondary education)
  // The educationEventTypeOfSchooling might contain 'GR' or similar
  // We'll also include schools without this field if they have coordinates
  return school.wgs84Latitude !== undefined &&
         school.wgs84Longitude !== undefined &&
         school.wgs84Latitude !== 0 &&
         school.wgs84Longitude !== 0;
}

function getMostRecentValue(data: Record<string, number> | undefined): number | null {
  if (!data) return null;
  const years = Object.keys(data).sort().reverse();
  if (years.length === 0) return null;
  return data[years[0]];
}

function getMeritHistory(data: Record<string, number> | undefined): { year: string; value: number }[] {
  if (!data) return [];
  return Object.entries(data)
    .map(([year, value]) => ({ year, value }))
    .sort((a, b) => b.year.localeCompare(a.year))
    .slice(0, 5); // Last 5 years
}

function getMunicipalityFromCode(code: string | undefined): string {
  // The geographical area code contains municipality info
  // For now, we'll just return "Unknown" if not available
  // TODO: Map codes to names
  return code || 'Unknown';
}

async function main() {
  console.log('Starting school data fetch...\n');

  // Fetch all school units
  const allSchools = await fetchAllSchoolUnits();
  console.log(`\nTotal schools fetched: ${allSchools.length}`);

  // Filter for schools with coordinates (likely grundskolor)
  const schoolsWithCoords = allSchools.filter(isGrundskola);
  console.log(`Schools with coordinates: ${schoolsWithCoords.length}`);

  // Fetch details and statistics for each school
  const schools: School[] = [];
  let processed = 0;

  console.log('\nFetching details and statistics...');

  for (const school of schoolsWithCoords) {
    processed++;
    if (processed % 100 === 0) {
      console.log(`  Processed ${processed}/${schoolsWithCoords.length}`);
    }

    const [details, stats] = await Promise.all([
      fetchSchoolDetails(school.schoolUnitCode),
      fetchSchoolStatistics(school.schoolUnitCode),
    ]);

    // Only include schools that have merit data
    const meritValue = getMostRecentValue(stats?.gradeNineAverageMeritRating);
    if (meritValue === null) continue;

    const schoolData: School = {
      id: school.schoolUnitCode,
      name: school.schoolUnitName,
      coordinates: [school.wgs84Latitude, school.wgs84Longitude],
      municipality: getMunicipalityFromCode(details?.geographicalAreaCode),
      type: details?.principalOrganizerType === 'Kommunal' ? 'municipal' : 'independent',
      address: {
        street: details?.visitingAddress?.street || '',
        postalCode: details?.visitingAddress?.zipCode || '',
        city: details?.visitingAddress?.city || '',
      },
      statistics: {
        meritValue,
        meritHistory: getMeritHistory(stats?.gradeNineAverageMeritRating),
        studentsPerTeacher: getMostRecentValue(stats?.studentTeacherQuota),
        certifiedTeachersRatio: getMostRecentValue(stats?.certifiedTeachersQuota),
        passRateGrade9: getMostRecentValue(stats?.gradeNineAllSubjectsPassedRatio),
      },
    };

    schools.push(schoolData);

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  console.log(`\nSchools with merit data: ${schools.length}`);

  // Write to file
  const outputPath = path.join(__dirname, '../src/data/schools.json');
  fs.writeFileSync(outputPath, JSON.stringify(schools, null, 2));
  console.log(`\nData written to ${outputPath}`);

  // Print some stats
  const avgMerit = schools.reduce((sum, s) => sum + (s.statistics.meritValue || 0), 0) / schools.length;
  console.log(`\nStats:`);
  console.log(`  Total schools: ${schools.length}`);
  console.log(`  Average merit: ${avgMerit.toFixed(1)}`);
  console.log(`  Municipal: ${schools.filter(s => s.type === 'municipal').length}`);
  console.log(`  Independent: ${schools.filter(s => s.type === 'independent').length}`);
}

main().catch(console.error);
