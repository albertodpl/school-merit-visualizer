export interface SchoolAddress {
  street: string;
  postalCode: string;
  city: string;
}

export interface MeritHistory {
  year: string;
  value: number;
}

export interface SchoolStatistics {
  meritValue: number | null;
  meritHistory: MeritHistory[];
  studentsPerTeacher: number | null;
  certifiedTeachersRatio: number | null;
  passRateGrade9: number | null;
}

export interface School {
  id: string;
  name: string;
  coordinates: [number, number]; // [lat, lng] WGS84
  municipality: string;
  type: 'municipal' | 'independent';
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
