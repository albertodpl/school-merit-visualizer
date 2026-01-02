'use client';

import { getMeritColor, MeritLevel } from '@/lib/types';

const levels: { level: MeritLevel; label: string; range: string }[] = [
  { level: 'high', label: 'Top', range: '> 280' },
  { level: 'above-avg', label: 'High', range: '250-280' },
  { level: 'avg', label: 'Average', range: '230-250' },
  { level: 'below-avg', label: 'Below avg', range: '200-230' },
  { level: 'low', label: 'Low', range: '< 200' },
];

export default function Legend() {
  return (
    <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-card p-3 z-[1000]">
      <h4 className="text-xs font-medium text-gray-600 mb-2">Merit Scale</h4>
      <div className="space-y-1.5">
        {levels.map(({ level, label, range }) => (
          <div key={level} className="flex items-center gap-2 text-xs">
            <div
              className="w-4 h-4 rounded-full border border-white shadow-sm"
              style={{ backgroundColor: getMeritColor(level) }}
            />
            <span className="text-gray-700">{label}</span>
            <span className="text-gray-400 ml-auto">{range}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
