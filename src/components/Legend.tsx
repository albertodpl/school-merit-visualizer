'use client';

import { getMeritColor, MeritLevel, SchoolCategory, getCategoryColor, getCategoryLabel } from '@/lib/types';

const meritLevels: { level: MeritLevel | null; label: string; range: string }[] = [
  { level: 'high', label: 'Topp', range: '> 280' },
  { level: 'above-avg', label: 'Hög', range: '250-280' },
  { level: 'avg', label: 'Medel', range: '230-250' },
  { level: 'below-avg', label: 'Under medel', range: '200-230' },
  { level: 'low', label: 'Låg', range: '< 200' },
  { level: null, label: 'Ingen data', range: '' },
];

const categories: SchoolCategory[] = ['F-6', 'F-9', '7-9', 'gymnasium', 'anpassad', 'other'];

interface LegendProps {
  colorMode?: 'category' | 'performance';
}

export default function Legend({ colorMode = 'category' }: LegendProps) {
  return (
    <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-card p-3 z-[1000]">
      {colorMode === 'category' ? (
        <>
          <h4 className="text-xs font-medium text-gray-600 mb-2">Skoltyper</h4>
          <div className="space-y-1.5">
            {categories.map((cat) => (
              <div key={cat} className="flex items-center gap-2 text-xs">
                <div
                  className={`w-4 h-4 border border-white shadow-sm ${cat === 'gymnasium' ? 'rounded' : 'rounded-full'}`}
                  style={{ backgroundColor: getCategoryColor(cat) }}
                />
                <span className="text-gray-700">{getCategoryLabel(cat)}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <h4 className="text-xs font-medium text-gray-600 mb-2">Prestationsnivå</h4>
          <div className="space-y-1.5">
            {meritLevels.map(({ level, label, range }) => (
              <div key={level ?? 'no-data'} className="flex items-center gap-2 text-xs">
                <div
                  className="w-4 h-4 rounded-full border border-white shadow-sm"
                  style={{ backgroundColor: getMeritColor(level) }}
                />
                <span className="text-gray-700">{label}</span>
                {range && <span className="text-gray-400 ml-auto">{range}</span>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
