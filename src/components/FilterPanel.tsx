'use client';

import { useState, useEffect, useMemo } from 'react';
import { School, SchoolCategory, getCategoryColor } from '@/lib/types';
import { Search, Home, X, ChevronDown, ChevronUp, MapPin, Palette } from 'lucide-react';
import AddressSearch from './AddressSearch';

type ColorMode = 'performance' | 'category';

interface FilterPanelProps {
  schools: School[];
  onFilter: (schools: School[]) => void;
  homePosition: { lat: number; lng: number } | null;
  isSettingHome: boolean;
  onSetHomeClick: () => void;
  onClearHome: () => void;
  onHomePositionChange: (lat: number, lng: number, displayName?: string) => void;
  sortBy: 'merit' | 'distance';
  onSortChange: (sort: 'merit' | 'distance') => void;
  colorMode: ColorMode;
  onColorModeChange: (mode: ColorMode) => void;
}

const ALL_CATEGORIES: SchoolCategory[] = ['F-6', 'F-9', '7-9', 'gymnasium', 'anpassad', 'other'];

const CATEGORY_SHORT_LABELS: Record<SchoolCategory, string> = {
  'F-6': 'F-6',
  'F-9': 'F-9',
  '7-9': '7-9',
  'gymnasium': 'Gym',
  'anpassad': 'Anp.',
  'other': 'Övrig',
};

export default function FilterPanel({
  schools,
  onFilter,
  homePosition,
  isSettingHome,
  onSetHomeClick,
  onClearHome,
  onHomePositionChange,
  sortBy,
  onSortChange,
  colorMode,
  onColorModeChange,
}: FilterPanelProps) {
  const [homeDisplayName, setHomeDisplayName] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>('all');
  const [selectedOwnership, setSelectedOwnership] = useState<'all' | 'municipal' | 'independent'>('all');
  const [selectedCategories, setSelectedCategories] = useState<Set<SchoolCategory>>(new Set(ALL_CATEGORIES));
  const [meritRange, setMeritRange] = useState<[number, number]>([0, 340]);

  // Get unique municipalities
  const municipalities = useMemo(() => {
    const unique = [...new Set(schools.map((s) => s.municipality))].sort();
    return unique;
  }, [schools]);

  // Filter schools based on criteria
  useEffect(() => {
    let filtered = schools;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.municipality.toLowerCase().includes(query) ||
          s.address.city.toLowerCase().includes(query)
      );
    }

    // Municipality filter
    if (selectedMunicipality !== 'all') {
      filtered = filtered.filter((s) => s.municipality === selectedMunicipality);
    }

    // Ownership filter
    if (selectedOwnership !== 'all') {
      filtered = filtered.filter((s) => s.ownership === selectedOwnership);
    }

    // Category filter
    filtered = filtered.filter((s) => selectedCategories.has(s.category));

    // Merit/performance range filter (only apply to schools with grade 9 data)
    filtered = filtered.filter((s) => {
      // For F-9 and 7-9 schools, filter by merit range
      if (s.category === 'F-9' || s.category === '7-9') {
        const merit = s.statistics.meritValue;
        if (merit === null) return true; // Show schools without data
        return merit >= meritRange[0] && merit <= meritRange[1];
      }
      // For other categories, always show
      return true;
    });

    onFilter(filtered);
  }, [schools, searchQuery, selectedMunicipality, selectedOwnership, selectedCategories, meritRange, onFilter]);

  const filteredCount = useMemo(() => {
    let filtered = schools;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.municipality.toLowerCase().includes(query)
      );
    }

    if (selectedMunicipality !== 'all') {
      filtered = filtered.filter((s) => s.municipality === selectedMunicipality);
    }

    if (selectedOwnership !== 'all') {
      filtered = filtered.filter((s) => s.ownership === selectedOwnership);
    }

    filtered = filtered.filter((s) => selectedCategories.has(s.category));

    filtered = filtered.filter((s) => {
      if (s.category === 'F-9' || s.category === '7-9') {
        const merit = s.statistics.meritValue;
        if (merit === null) return true;
        return merit >= meritRange[0] && merit <= meritRange[1];
      }
      return true;
    });

    return filtered.length;
  }, [schools, searchQuery, selectedMunicipality, selectedOwnership, selectedCategories, meritRange]);

  const toggleCategory = (cat: SchoolCategory) => {
    const newCategories = new Set(selectedCategories);
    if (newCategories.has(cat)) {
      newCategories.delete(cat);
    } else {
      newCategories.add(cat);
    }
    setSelectedCategories(newCategories);
  };

  return (
    <div className="absolute top-4 left-4 bg-white rounded-lg shadow-soft z-[1000] w-72">
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 rounded-t-lg"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div>
          <h2 className="font-semibold text-sm">Filters</h2>
          <p className="text-xs text-gray-500">
            {filteredCount} of {schools.length} schools
          </p>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </div>

      {isExpanded && (
        <div className="p-3 pt-0 space-y-4 border-t border-gray-100">
          {/* Home Location */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1.5 block">
              Home Location
            </label>
            {homePosition ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 text-sm text-gray-700 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="truncate">
                      {homeDisplayName || `${homePosition.lat.toFixed(4)}, ${homePosition.lng.toFixed(4)}`}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      onClearHome();
                      setHomeDisplayName(null);
                    }}
                    className="p-1 text-gray-400 hover:text-red-500"
                    title="Remove home"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-400">Drag marker on map to adjust</p>
              </div>
            ) : (
              <div className="space-y-2">
                <AddressSearch
                  placeholder="Search address in Sweden..."
                  onLocationSelect={(lat, lng, displayName) => {
                    onHomePositionChange(lat, lng, displayName);
                    setHomeDisplayName(displayName);
                  }}
                />
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400">or</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
                <button
                  onClick={onSetHomeClick}
                  className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm transition-colors ${
                    isSettingHome
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  <Home className="w-4 h-4" />
                  {isSettingHome ? 'Click on map...' : 'Click on Map'}
                </button>
              </div>
            )}
          </div>

          {/* Search */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1.5 block">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="School name or area..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-200"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Municipality */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1.5 block">
              Municipality
            </label>
            <select
              value={selectedMunicipality}
              onChange={(e) => setSelectedMunicipality(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-200 bg-white"
            >
              <option value="all">All municipalities</option>
              {municipalities.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* School Categories */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1.5 block">
              School Categories
            </label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`py-1 px-2 text-xs rounded-md transition-colors flex items-center gap-1 ${
                    selectedCategories.has(cat)
                      ? 'bg-gray-800 text-white'
                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: getCategoryColor(cat) }}
                  />
                  {CATEGORY_SHORT_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>

          {/* Ownership Type */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1.5 block">
              Ownership
            </label>
            <div className="flex gap-2">
              {(['all', 'municipal', 'independent'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedOwnership(type)}
                  className={`flex-1 py-1.5 px-2 text-xs rounded-md transition-colors ${
                    selectedOwnership === type
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  {type === 'all' ? 'All' : type === 'municipal' ? 'Kommunal' : 'Fristående'}
                </button>
              ))}
            </div>
          </div>

          {/* Color Mode */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1.5 block">
              Color By
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => onColorModeChange('category')}
                className={`flex-1 py-1.5 px-2 text-xs rounded-md transition-colors flex items-center justify-center gap-1 ${
                  colorMode === 'category'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                <Palette className="w-3 h-3" />
                Category
              </button>
              <button
                onClick={() => onColorModeChange('performance')}
                className={`flex-1 py-1.5 px-2 text-xs rounded-md transition-colors ${
                  colorMode === 'performance'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                Performance
              </button>
            </div>
          </div>

          {/* Merit Range (for F-9 and 7-9 schools) */}
          {(selectedCategories.has('F-9') || selectedCategories.has('7-9')) && (
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                Merit Range (Grade 9): {meritRange[0]} - {meritRange[1]}
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="range"
                  min="0"
                  max="340"
                  value={meritRange[0]}
                  onChange={(e) =>
                    setMeritRange([parseInt(e.target.value), meritRange[1]])
                  }
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <input
                  type="range"
                  min="0"
                  max="340"
                  value={meritRange[1]}
                  onChange={(e) =>
                    setMeritRange([meritRange[0], parseInt(e.target.value)])
                  }
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Sort */}
          {homePosition && (
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                Sort By
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => onSortChange('merit')}
                  className={`flex-1 py-1.5 px-2 text-xs rounded-md transition-colors ${
                    sortBy === 'merit'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  Merit
                </button>
                <button
                  onClick={() => onSortChange('distance')}
                  className={`flex-1 py-1.5 px-2 text-xs rounded-md transition-colors ${
                    sortBy === 'distance'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  Distance
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
