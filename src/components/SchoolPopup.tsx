'use client';

import {
  School,
  getMeritPercentage,
  formatDistance,
  getGoogleMapsDirectionsUrl,
  getCategoryLabel,
  getTestPerformanceLevel,
  getTestPerformanceLabel,
  getPerformanceColor,
  TEST_BENCHMARKS,
} from '@/lib/types';
import { MapPin, Users, GraduationCap, CheckCircle, TrendingUp, TrendingDown, BookOpen } from 'lucide-react';

interface SchoolPopupProps {
  school: School;
  homePosition: { lat: number; lng: number } | null;
  distance: number | null;
}

export default function SchoolPopup({ school, homePosition, distance }: SchoolPopupProps) {
  const { statistics, category } = school;
  const meritPercentage = getMeritPercentage(statistics.meritValue);
  const hasGrade9Data = category === 'F-9' || category === '7-9';
  const hasGrade6Data = category === 'F-6' || category === 'F-9';

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
          {getCategoryLabel(category)} · {school.ownership === 'municipal' ? 'Kommunal' : 'Fristående'}
        </p>
        <p className="text-xs text-gray-400">{school.municipality}</p>
      </div>

      {/* Grade 9 Data (Merit) */}
      {hasGrade9Data && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">Meritvärde (åk 9)</span>
            <span className="text-lg font-bold">
              {statistics.meritValue?.toFixed(1) || 'N/A'}
            </span>
          </div>
          {statistics.meritValue !== null ? (
            <>
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
            </>
          ) : (
            <p className="text-xs text-gray-400 italic">Merit data not available</p>
          )}
        </div>
      )}

      {/* Grade 6 Data */}
      {hasGrade6Data && (
        <div className="mb-4">
          {statistics.passRateGrade6 !== null && (
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Godkänt åk 6</span>
              <span className="text-lg font-bold">
                {statistics.passRateGrade6}%
              </span>
            </div>
          )}
          {(statistics.avgTestSwedish6 !== null || statistics.avgTestEnglish6 !== null || statistics.avgTestMath6 !== null) && (
            <div className="space-y-1">
              <p className="text-xs text-gray-500 font-medium">Nationella prov åk 6:</p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {/* Swedish */}
                <div
                  className="text-center p-1.5 rounded border-2"
                  style={{
                    borderColor: getPerformanceColor(getTestPerformanceLevel(statistics.avgTestSwedish6, 'swedish')),
                    backgroundColor: statistics.avgTestSwedish6 !== null
                      ? getPerformanceColor(getTestPerformanceLevel(statistics.avgTestSwedish6, 'swedish')) + '15'
                      : '#f9fafb'
                  }}
                >
                  <div className="text-gray-500 font-medium">SV</div>
                  <div className="font-bold">{statistics.avgTestSwedish6?.toFixed(1) ?? '-'}</div>
                  {statistics.avgTestSwedish6 !== null && (
                    <div className="text-[10px] opacity-80">
                      {getTestPerformanceLabel(statistics.avgTestSwedish6, 'swedish')}
                    </div>
                  )}
                </div>
                {/* English */}
                <div
                  className="text-center p-1.5 rounded border-2"
                  style={{
                    borderColor: getPerformanceColor(getTestPerformanceLevel(statistics.avgTestEnglish6, 'english')),
                    backgroundColor: statistics.avgTestEnglish6 !== null
                      ? getPerformanceColor(getTestPerformanceLevel(statistics.avgTestEnglish6, 'english')) + '15'
                      : '#f9fafb'
                  }}
                >
                  <div className="text-gray-500 font-medium">EN</div>
                  <div className="font-bold">{statistics.avgTestEnglish6?.toFixed(1) ?? '-'}</div>
                  {statistics.avgTestEnglish6 !== null && (
                    <div className="text-[10px] opacity-80">
                      {getTestPerformanceLabel(statistics.avgTestEnglish6, 'english')}
                    </div>
                  )}
                </div>
                {/* Math */}
                <div
                  className="text-center p-1.5 rounded border-2"
                  style={{
                    borderColor: getPerformanceColor(getTestPerformanceLevel(statistics.avgTestMath6, 'math')),
                    backgroundColor: statistics.avgTestMath6 !== null
                      ? getPerformanceColor(getTestPerformanceLevel(statistics.avgTestMath6, 'math')) + '15'
                      : '#f9fafb'
                  }}
                >
                  <div className="text-gray-500 font-medium">MA</div>
                  <div className="font-bold">{statistics.avgTestMath6?.toFixed(1) ?? '-'}</div>
                  {statistics.avgTestMath6 !== null && (
                    <div className="text-[10px] opacity-80">
                      {getTestPerformanceLabel(statistics.avgTestMath6, 'math')}
                    </div>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                Snitt: SV {TEST_BENCHMARKS.swedish.avg} · EN {TEST_BENCHMARKS.english.avg} · MA {TEST_BENCHMARKS.math.avg}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Gymnasium notice */}
      {category === 'gymnasium' && (
        <div className="mb-4 p-2 bg-orange-50 rounded text-xs text-orange-700">
          Gymnasium - gymnasiedata kommer snart
        </div>
      )}

      {/* Anpassad grundskola notice */}
      {category === 'anpassad' && (
        <div className="mb-4 p-2 bg-pink-50 rounded text-xs text-pink-700">
          Anpassad grundskola (särskola)
        </div>
      )}

      {/* Show school types and grades for schools with minimal data */}
      {(category === 'other' || category === 'gymnasium' || category === 'anpassad') && school.schoolTypes && school.schoolTypes.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 font-medium mb-1">Utbildningstyper:</p>
          <div className="flex flex-wrap gap-1">
            {school.schoolTypes.map((type, i) => (
              <span key={i} className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                {type}
              </span>
            ))}
          </div>
          {school.grades && school.grades.length > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              Årskurser: {school.grades.join(', ')}
            </p>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="space-y-2 text-sm border-b border-gray-100 pb-3 mb-3">
        {trend !== null && hasGrade9Data && (
          <div className="flex items-center gap-2">
            {trend >= 0 ? (
              <TrendingUp className="w-4 h-4 text-green-600" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-600" />
            )}
            <span>
              5-årig trend: {trend >= 0 ? '+' : ''}{trend.toFixed(1)}
            </span>
          </div>
        )}

        {statistics.certifiedTeachersRatio !== null && (
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-gray-400" />
            <span>
              {statistics.certifiedTeachersRatio}% behöriga lärare
            </span>
          </div>
        )}

        {statistics.passRateGrade9 !== null && hasGrade9Data && (
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-gray-400" />
            <span>
              {statistics.passRateGrade9}% godkänt (åk 9)
            </span>
          </div>
        )}

        {statistics.studentsPerTeacher !== null && (
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" />
            <span>
              {statistics.studentsPerTeacher.toFixed(1)} elever per lärare
            </span>
          </div>
        )}

        {statistics.totalPupils !== null && (
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-gray-400" />
            <span>
              {statistics.totalPupils} elever totalt
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
