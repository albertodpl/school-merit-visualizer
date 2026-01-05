import * as fs from 'fs';
import * as path from 'path';

interface StatValue {
  value: string;
  valueType: string;
  timePeriod: string;
}

interface StatisticsBody {
  // Grade 9 stats
  averageGradesMeritRating9thGrade?: StatValue[];
  ratioOfPupilsIn9thGradeWithAllSubjectsPassed?: StatValue[];
  // Grade 6 stats
  ratioOfPupilsIn6thGradeWithAllSubjectsPassed?: StatValue[];
  averageResultNationalTestsSubjectSVE6thGrade?: StatValue[];
  averageResultNationalTestsSubjectENG6thGrade?: StatValue[];
  averageResultNationalTestsSubjectMA6thGrade?: StatValue[];
  // Common stats
  studentsPerTeacherQuota?: StatValue[];
  certifiedTeachersQuota?: StatValue[];
  totalNumberOfPupils?: StatValue[];
  [key: string]: unknown;
}

interface CompactSchoolUnit {
  schoolUnitCode: string;
  schoolUnitName: string;
  wgs84Latitude: string;
  wgs84Longitude: string;
  abroadSchool: boolean;
}

interface TypeOfSchooling {
  code: string;
  displayName: string;
  schoolYears: string[];
}

interface SchoolDetailBody {
  code: string;
  name: string;
  principalOrganizerType?: string;
  typeOfSchooling?: TypeOfSchooling[];
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
  statistics: StatisticsBody | null;
}

type SchoolCategory = 'F-6' | 'F-9' | '7-9' | 'gymnasium' | 'anpassad' | 'other';

interface School {
  id: string;
  name: string;
  coordinates: [number, number];
  municipality: string;
  ownership: 'municipal' | 'independent';
  category: SchoolCategory;
  schoolTypes: string[]; // e.g., ["Grundskolan", "Gymnasieskolan"]
  grades: string[]; // e.g., ["1", "2", "3", "4", "5", "6"]
  address: {
    street: string;
    postalCode: string;
    city: string;
  };
  statistics: {
    meritValue: number | null;
    meritHistory: { year: string; value: number }[];
    passRateGrade9: number | null;
    passRateGrade6: number | null;
    avgTestSwedish6: number | null;
    avgTestEnglish6: number | null;
    avgTestMath6: number | null;
    studentsPerTeacher: number | null;
    certifiedTeachersRatio: number | null;
    totalPupils: number | null;
  };
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

// Determine school category based on available data, typeOfSchooling, and name
function determineCategory(raw: RawSchoolData): SchoolCategory {
  const name = raw.compactData.schoolUnitName.toLowerCase();
  const stats = raw.statistics;
  const schooling = raw.details?.typeOfSchooling || [];
  const schoolingCodes = schooling.map(s => s.code);

  // Check for gymnasium - either by code or name
  if (schoolingCodes.includes('gy') || name.includes('gymnasium') || name.includes('gymnasie')) {
    return 'gymnasium';
  }

  // Check for anpassad grundskola (special needs)
  if (schoolingCodes.includes('gran') || name.includes('anpassad')) {
    return 'anpassad';
  }

  // Check what grade data is available from statistics
  const hasGrade9Data = stats?.averageGradesMeritRating9thGrade?.some(v => v.valueType === 'EXISTS') ||
                        stats?.ratioOfPupilsIn9thGradeWithAllSubjectsPassed?.some(v => v.valueType === 'EXISTS');

  const hasGrade6Data = stats?.ratioOfPupilsIn6thGradeWithAllSubjectsPassed?.some(v => v.valueType === 'EXISTS') ||
                        stats?.averageResultNationalTestsSubjectSVE6thGrade?.some(v => v.valueType === 'EXISTS');

  if (hasGrade9Data && hasGrade6Data) {
    return 'F-9';
  }

  if (hasGrade9Data) {
    return '7-9';
  }

  if (hasGrade6Data) {
    return 'F-6';
  }

  // Use typeOfSchooling to determine category
  if (schoolingCodes.includes('gr')) {
    // It's a grundskola - figure out which grades
    const grSchooling = schooling.find(s => s.code === 'gr');
    const grades = grSchooling?.schoolYears || [];
    const hasGrade9 = grades.includes('9');
    const hasGrade6 = grades.includes('6');
    const hasLowGrades = grades.some(g => ['1', '2', '3'].includes(g));

    if (hasGrade9 && hasLowGrades) return 'F-9';
    if (hasGrade9) return '7-9';
    if (hasGrade6 || hasLowGrades) return 'F-6';
  }

  // Check name patterns as fallback
  if (name.includes('f-9') || name.includes('f–9')) return 'F-9';
  if (name.includes('f-6') || name.includes('f–6') || name.includes('f-3')) return 'F-6';
  if (name.includes('7-9') || name.includes('högstadium')) return '7-9';

  // If has any grundskola stats, default to F-6
  if (stats && Object.keys(stats).length > 0) {
    return 'F-6';
  }

  return 'other';
}

function processSchoolData(raw: RawSchoolData): School {
  const { compactData, details, statistics } = raw;

  const visitingAddress = details?.contactInfo?.addresses?.find(
    a => a.type === 'VISITING_ADDRESS'
  );

  // Extract school types and grades offered
  const schoolTypes = details?.typeOfSchooling?.map(s => s.displayName) || [];
  const grades = details?.typeOfSchooling?.flatMap(s => s.schoolYears) || [];
  const uniqueGrades = [...new Set(grades)].sort((a, b) => {
    const numA = a === '0' ? -1 : parseInt(a) || 99;
    const numB = b === '0' ? -1 : parseInt(b) || 99;
    return numA - numB;
  });

  return {
    id: compactData.schoolUnitCode,
    name: compactData.schoolUnitName,
    coordinates: [
      parseFloat(compactData.wgs84Latitude),
      parseFloat(compactData.wgs84Longitude),
    ],
    municipality: visitingAddress?.city || 'Unknown',
    ownership: details?.principalOrganizerType === 'Kommunal' ? 'municipal' : 'independent',
    category: determineCategory(raw),
    schoolTypes,
    grades: uniqueGrades,
    address: {
      street: visitingAddress?.street || '',
      postalCode: visitingAddress?.zipCode || '',
      city: visitingAddress?.city || '',
    },
    statistics: {
      // Grade 9 data
      meritValue: getMostRecentValue(statistics?.averageGradesMeritRating9thGrade),
      meritHistory: getMeritHistory(statistics?.averageGradesMeritRating9thGrade),
      passRateGrade9: getMostRecentValue(statistics?.ratioOfPupilsIn9thGradeWithAllSubjectsPassed),
      // Grade 6 data
      passRateGrade6: getMostRecentValue(statistics?.ratioOfPupilsIn6thGradeWithAllSubjectsPassed),
      avgTestSwedish6: getMostRecentValue(statistics?.averageResultNationalTestsSubjectSVE6thGrade),
      avgTestEnglish6: getMostRecentValue(statistics?.averageResultNationalTestsSubjectENG6thGrade),
      avgTestMath6: getMostRecentValue(statistics?.averageResultNationalTestsSubjectMA6thGrade),
      // Common data
      studentsPerTeacher: getMostRecentValue(statistics?.studentsPerTeacherQuota),
      certifiedTeachersRatio: getMostRecentValue(statistics?.certifiedTeachersQuota),
      totalPupils: getMostRecentValue(statistics?.totalNumberOfPupils),
    },
  };
}

async function main() {
  console.log('Processing raw school data...\n');

  const rawDataPath = path.join(__dirname, '../src/data/raw/all-school-data.json');

  if (!fs.existsSync(rawDataPath)) {
    console.error('Raw data file not found. Run "pnpm run fetch-data" first.');
    process.exit(1);
  }

  const rawData: RawSchoolData[] = JSON.parse(fs.readFileSync(rawDataPath, 'utf-8'));
  console.log(`Loaded ${rawData.length} raw school records`);

  const schools: School[] = [];
  const categoryCount: Record<SchoolCategory, number> = {
    'F-6': 0,
    'F-9': 0,
    '7-9': 0,
    'gymnasium': 0,
    'anpassad': 0,
    'other': 0,
  };

  for (const raw of rawData) {
    const school = processSchoolData(raw);
    schools.push(school);
    categoryCount[school.category]++;
  }

  console.log(`\nProcessed ${schools.length} schools`);
  console.log('\nBy category:');
  for (const [cat, count] of Object.entries(categoryCount)) {
    console.log(`  ${cat}: ${count}`);
  }

  // Count schools with useful data
  const withMerit = schools.filter(s => s.statistics.meritValue !== null).length;
  const withGrade6 = schools.filter(s => s.statistics.passRateGrade6 !== null || s.statistics.avgTestSwedish6 !== null).length;

  console.log(`\nSchools with grade 9 merit data: ${withMerit}`);
  console.log(`Schools with grade 6 data: ${withGrade6}`);

  // Sort by category, then by merit/performance
  schools.sort((a, b) => {
    // First by category priority (F-9 first, then 7-9, F-6, gymnasium, other)
    const catOrder: Record<SchoolCategory, number> = { 'F-9': 0, '7-9': 1, 'F-6': 2, 'gymnasium': 3, 'anpassad': 4, 'other': 5 };
    if (catOrder[a.category] !== catOrder[b.category]) {
      return catOrder[a.category] - catOrder[b.category];
    }
    // Then by merit/performance
    const aMerit = a.statistics.meritValue ?? a.statistics.passRateGrade6 ?? 0;
    const bMerit = b.statistics.meritValue ?? b.statistics.passRateGrade6 ?? 0;
    return bMerit - aMerit;
  });

  const outputPath = path.join(__dirname, '../src/data/schools.json');
  fs.writeFileSync(outputPath, JSON.stringify(schools, null, 2));
  console.log(`\nSaved processed data to ${outputPath}`);

  // Print top schools by category
  console.log('\nTop schools by category:');
  for (const cat of ['F-9', '7-9', 'F-6'] as SchoolCategory[]) {
    const catSchools = schools.filter(s => s.category === cat);
    const top = catSchools[0];
    if (top) {
      const metric = top.statistics.meritValue ?? top.statistics.passRateGrade6;
      console.log(`  ${cat}: ${top.name} (${metric?.toFixed(1) ?? 'N/A'})`);
    }
  }
}

main().catch(console.error);
