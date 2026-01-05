export interface SchoolAddress {
  street: string;
  postalCode: string;
  city: string;
}

export interface MeritHistory {
  year: string;
  value: number;
}

// School category based on grade levels
export type SchoolCategory = 'F-6' | 'F-9' | '7-9' | 'gymnasium' | 'anpassad' | 'other';

export interface SchoolStatistics {
  // Grade 9 data (F-9, 7-9 schools)
  meritValue: number | null;
  meritHistory: MeritHistory[];
  passRateGrade9: number | null;
  // Grade 6 data (F-6, F-9 schools)
  passRateGrade6: number | null;
  avgTestSwedish6: number | null;
  avgTestEnglish6: number | null;
  avgTestMath6: number | null;
  // Common data
  studentsPerTeacher: number | null;
  certifiedTeachersRatio: number | null;
  totalPupils: number | null;
}

export interface School {
  id: string;
  name: string;
  coordinates: [number, number]; // [lat, lng] WGS84
  municipality: string;
  ownership: 'municipal' | 'independent';
  category: SchoolCategory;
  schoolTypes: string[]; // e.g., ["Grundskolan", "Gymnasieskolan"]
  grades: string[]; // e.g., ["1", "2", "3", "4", "5", "6"]
  address: SchoolAddress;
  statistics: SchoolStatistics;
}

export type MeritLevel = 'low' | 'below-avg' | 'avg' | 'above-avg' | 'high';

export function getMeritLevel(meritValue: number | null): MeritLevel | null {
  if (meritValue === null) return null;
  if (meritValue < 200) return 'low';
  if (meritValue < 230) return 'below-avg';
  if (meritValue < 250) return 'avg';
  if (meritValue < 280) return 'above-avg';
  return 'high';
}

export function getMeritColor(level: MeritLevel | null): string {
  switch (level) {
    case 'low': return 'hsl(0, 70%, 50%)';        // Red
    case 'below-avg': return 'hsl(30, 80%, 50%)'; // Orange
    case 'avg': return 'hsl(45, 90%, 50%)';       // Yellow
    case 'above-avg': return 'hsl(120, 60%, 40%)';// Green
    case 'high': return 'hsl(210, 80%, 50%)';     // Blue
    default: return 'hsl(0, 0%, 60%)';            // Gray for unknown
  }
}

export function getMeritPercentage(meritValue: number | null): number {
  if (meritValue === null) return 0;
  return Math.round((meritValue / 340) * 100);
}

export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  // Haversine formula
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}

export function getGoogleMapsDirectionsUrl(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  mode: 'walking' | 'bicycling' | 'transit' | 'driving'
): string {
  return `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}&travelmode=${mode}`;
}

// Category display names
export function getCategoryLabel(category: SchoolCategory): string {
  switch (category) {
    case 'F-6': return 'Grundskola F-6';
    case 'F-9': return 'Grundskola F-9';
    case '7-9': return 'Grundskola 7-9';
    case 'gymnasium': return 'Gymnasium';
    case 'anpassad': return 'Anpassad grundskola';
    case 'other': return 'Övriga';
  }
}

// Category colors (for markers when not using merit coloring)
export function getCategoryColor(category: SchoolCategory): string {
  switch (category) {
    case 'F-6': return 'hsl(280, 60%, 55%)';      // Purple - primary
    case 'F-9': return 'hsl(210, 80%, 50%)';      // Blue - full grundskola
    case '7-9': return 'hsl(170, 60%, 45%)';      // Teal - upper grundskola
    case 'gymnasium': return 'hsl(30, 80%, 50%)'; // Orange - high school
    case 'anpassad': return 'hsl(330, 60%, 50%)'; // Pink - special needs
    case 'other': return 'hsl(0, 0%, 60%)';       // Gray
  }
}

// Get a performance score for grade 6 schools (0-100 scale based on pass rate)
export function getGrade6Performance(stats: SchoolStatistics): number | null {
  if (stats.passRateGrade6 !== null) return stats.passRateGrade6;
  // Fallback: average of test results if available
  const tests = [stats.avgTestSwedish6, stats.avgTestEnglish6, stats.avgTestMath6].filter(v => v !== null) as number[];
  if (tests.length > 0) {
    return tests.reduce((a, b) => a + b, 0) / tests.length;
  }
  return null;
}

// National test score benchmarks (based on actual data analysis)
// Scores are on 0-20 scale (A=20, F=0)
export const TEST_BENCHMARKS = {
  swedish: { avg: 12.6, p75: 13.8, p90: 14.8, max: 20 },
  english: { avg: 15.6, p75: 16.6, p90: 17.4, max: 20 },
  math: { avg: 11.4, p75: 12.9, p90: 14.2, max: 20 },
} as const;

export type TestSubject = 'swedish' | 'english' | 'math';

// Get performance level for a test score relative to national benchmarks
export function getTestPerformanceLevel(score: number | null, subject: TestSubject): PerformanceLevel | null {
  if (score === null) return null;
  const bench = TEST_BENCHMARKS[subject];

  if (score >= bench.p90) return 'high';      // Top 10%
  if (score >= bench.p75) return 'above-avg'; // Top 25%
  if (score >= bench.avg) return 'avg';       // Above average
  if (score >= bench.avg * 0.85) return 'below-avg'; // Within 15% below avg
  return 'low';
}

// Get a descriptive label for test performance
export function getTestPerformanceLabel(score: number | null, subject: TestSubject): string {
  if (score === null) return '';
  const bench = TEST_BENCHMARKS[subject];

  if (score >= bench.p90) return 'Topp 10%';
  if (score >= bench.p75) return 'Topp 25%';
  if (score >= bench.avg) return 'Över snitt';
  if (score >= bench.avg * 0.85) return 'Under snitt';
  return 'Låg';
}

// Performance level for coloring (works for both grade 6 and grade 9)
export type PerformanceLevel = 'low' | 'below-avg' | 'avg' | 'above-avg' | 'high';

export function getPerformanceLevel(value: number | null, maxValue: number = 100): PerformanceLevel | null {
  if (value === null) return null;
  const percentage = (value / maxValue) * 100;
  if (percentage < 60) return 'low';
  if (percentage < 75) return 'below-avg';
  if (percentage < 85) return 'avg';
  if (percentage < 95) return 'above-avg';
  return 'high';
}

export function getPerformanceColor(level: PerformanceLevel | null): string {
  switch (level) {
    case 'low': return 'hsl(0, 70%, 50%)';
    case 'below-avg': return 'hsl(30, 80%, 50%)';
    case 'avg': return 'hsl(45, 90%, 50%)';
    case 'above-avg': return 'hsl(120, 60%, 40%)';
    case 'high': return 'hsl(210, 80%, 50%)';
    default: return 'hsl(0, 0%, 60%)';
  }
}
