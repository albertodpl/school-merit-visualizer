'use client';

import { School, getMeritPercentage, formatDistance, getGoogleMapsDirectionsUrl } from '@/lib/types';
import { MapPin, Users, GraduationCap, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';

interface SchoolPopupProps {
  school: School;
  homePosition: { lat: number; lng: number } | null;
  distance: number | null;
}

export default function SchoolPopup({ school, homePosition, distance }: SchoolPopupProps) {
  const { statistics } = school;
  const meritPercentage = getMeritPercentage(statistics.meritValue);

  // Calculate trend from history
  const trend = statistics.meritHistory.length >= 2
    ? statistics.meritHistory[0].value - statistics.meritHistory[1].value
    : null;

  return (
    <div className="min-w-[280px] p-0">
      {/* Header */}
      <div className="border-b border-gray-100 pb-3 mb-3">
        <h3 className="font-semibold text-lg leading-tight">{school.name}</h3>
        <p className="text-sm text-gray-500 mt-1">
          {school.municipality} · {school.type === 'municipal' ? 'Kommunal' : 'Fristående'}
        </p>
      </div>

      {/* Merit Value */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium">Meritvärde</span>
          <span className="text-lg font-bold">
            {statistics.meritValue?.toFixed(1) || 'N/A'}
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${meritPercentage}%`,
              background: `linear-gradient(90deg, hsl(0, 70%, 50%), hsl(45, 90%, 50%), hsl(120, 60%, 40%), hsl(210, 80%, 50%))`,
              backgroundSize: '400% 100%',
              backgroundPosition: `${100 - meritPercentage}% 0`,
            }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>0</span>
          <span>340</span>
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-2 text-sm border-b border-gray-100 pb-3 mb-3">
        {trend !== null && (
          <div className="flex items-center gap-2">
            {trend >= 0 ? (
              <TrendingUp className="w-4 h-4 text-green-600" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-600" />
            )}
            <span>
              5-year trend: {trend >= 0 ? '+' : ''}{trend.toFixed(1)}
            </span>
          </div>
        )}

        {statistics.certifiedTeachersRatio !== null && (
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-gray-400" />
            <span>
              {statistics.certifiedTeachersRatio}% certified teachers
            </span>
          </div>
        )}

        {statistics.passRateGrade9 !== null && (
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-gray-400" />
            <span>
              {statistics.passRateGrade9}% pass rate (grade 9)
            </span>
          </div>
        )}

        {statistics.studentsPerTeacher !== null && (
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" />
            <span>
              {statistics.studentsPerTeacher.toFixed(1)} students per teacher
            </span>
          </div>
        )}
      </div>

      {/* Distance & Directions */}
      {homePosition && distance !== null && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span className="font-medium">{formatDistance(distance)} from home</span>
          </div>

          <div className="flex gap-2 mt-2">
            <a
              href={getGoogleMapsDirectionsUrl(
                homePosition.lat,
                homePosition.lng,
                school.coordinates[0],
                school.coordinates[1],
                'walking'
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center py-1.5 px-2 text-xs bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              title="Walking directions"
            >
              🚶 Walk
            </a>
            <a
              href={getGoogleMapsDirectionsUrl(
                homePosition.lat,
                homePosition.lng,
                school.coordinates[0],
                school.coordinates[1],
                'bicycling'
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center py-1.5 px-2 text-xs bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              title="Cycling directions"
            >
              🚴 Bike
            </a>
            <a
              href={getGoogleMapsDirectionsUrl(
                homePosition.lat,
                homePosition.lng,
                school.coordinates[0],
                school.coordinates[1],
                'transit'
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center py-1.5 px-2 text-xs bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              title="Transit directions"
            >
              🚌 Transit
            </a>
          </div>
        </div>
      )}

      {/* Address */}
      {school.address.street && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            {school.address.street}, {school.address.postalCode} {school.address.city}
          </p>
        </div>
      )}
    </div>
  );
}
