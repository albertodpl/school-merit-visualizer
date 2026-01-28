'use client';

import { useEffect, useState, useCallback, useSyncExternalStore } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  School,
  getMeritLevel,
  getMeritColor,
  calculateDistance,
  getCategoryColor,
  getPerformanceLevel,
  getPerformanceColor,
} from '@/lib/types';
import SchoolPopup from './SchoolPopup';
import Legend from './Legend';
import FilterPanel from './FilterPanel';

// Fix for default marker icons in Leaflet with webpack
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

type ColorMode = 'performance' | 'category';

// Hook to sync with localStorage for home position
const HOME_POSITION_KEY = 'homePosition';
let homePositionListeners: Array<() => void> = [];

function subscribeToHomePosition(callback: () => void) {
  homePositionListeners.push(callback);
  return () => {
    homePositionListeners = homePositionListeners.filter(l => l !== callback);
  };
}

function getHomePositionSnapshot(): HomePosition | null {
  const saved = localStorage.getItem(HOME_POSITION_KEY);
  return saved ? JSON.parse(saved) : null;
}

function getHomePositionServerSnapshot(): HomePosition | null {
  return null;
}

function setStoredHomePosition(position: HomePosition | null) {
  if (position) {
    localStorage.setItem(HOME_POSITION_KEY, JSON.stringify(position));
  } else {
    localStorage.removeItem(HOME_POSITION_KEY);
  }
  // Notify all subscribers
  homePositionListeners.forEach(l => l());
}

function useHomePosition(): [HomePosition | null, (position: HomePosition | null) => void] {
  const position = useSyncExternalStore(
    subscribeToHomePosition,
    getHomePositionSnapshot,
    getHomePositionServerSnapshot
  );
  return [position, setStoredHomePosition];
}

function createSchoolIcon(school: School, colorMode: ColorMode): L.DivIcon {
  let color: string;

  if (colorMode === 'category') {
    color = getCategoryColor(school.category);
  } else {
    // Performance-based coloring
    if (school.category === 'F-9' || school.category === '7-9') {
      // Use merit for grade 9 schools
      const level = getMeritLevel(school.statistics.meritValue);
      color = getMeritColor(level);
    } else if (school.category === 'F-6') {
      // Use pass rate for grade 6 schools
      const level = getPerformanceLevel(school.statistics.passRateGrade6, 100);
      color = getPerformanceColor(level);
    } else {
      // Gymnasium or other - use category color
      color = getCategoryColor(school.category);
    }
  }

  // Category shape indicators
  const isGymnasium = school.category === 'gymnasium';
  const borderRadius = isGymnasium ? '4px' : '50%';

  return L.divIcon({
    className: 'school-marker',
    html: `<div style="
      width: 22px;
      height: 22px;
      background: ${color};
      border: 2px solid white;
      border-radius: ${borderRadius};
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -11],
  });
}

function createHomeIcon(): L.DivIcon {
  return L.divIcon({
    className: 'home-marker',
    html: `<div style="
      width: 32px;
      height: 32px;
      background: hsl(0, 0%, 20%);
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 12px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="none">
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
      </svg>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}

interface HomePosition {
  lat: number;
  lng: number;
}

interface MapClickHandlerProps {
  onMapClick: (lat: number, lng: number) => void;
  isSettingHome: boolean;
}

function MapClickHandler({ onMapClick, isSettingHome }: MapClickHandlerProps) {
  useMapEvents({
    click: (e) => {
      if (isSettingHome) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

// Component to programmatically control the map
interface MapControllerProps {
  center: [number, number] | null;
  onCenterHandled: () => void;
}

function MapController({ center, onCenterHandled }: MapControllerProps) {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.flyTo(center, 14, { duration: 1 });
      onCenterHandled();
    }
  }, [center, map, onCenterHandled]);

  return null;
}

interface SchoolMapProps {
  schools: School[];
  dataFetchedAt?: string;
}

export default function SchoolMap({ schools, dataFetchedAt }: SchoolMapProps) {
  const [homePosition, setHomePosition] = useHomePosition();
  const [isSettingHome, setIsSettingHome] = useState(false);
  const [filteredSchools, setFilteredSchools] = useState<School[]>(schools);
  const [sortBy, setSortBy] = useState<'merit' | 'distance'>('merit');
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [colorMode, setColorMode] = useState<ColorMode>('category');

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setHomePosition({ lat, lng });
    setIsSettingHome(false);
  }, [setHomePosition]);

  const handleClearHome = useCallback(() => {
    setHomePosition(null);
  }, [setHomePosition]);

  const handleHomePositionChange = useCallback((lat: number, lng: number) => {
    setHomePosition({ lat, lng });
    setMapCenter([lat, lng]);
    setIsSettingHome(false);
  }, [setHomePosition]);

  const handleMapCenterHandled = useCallback(() => {
    setMapCenter(null);
  }, []);

  // Sort schools based on selection
  const sortedSchools = [...filteredSchools].sort((a, b) => {
    if (sortBy === 'merit') {
      return (b.statistics.meritValue || 0) - (a.statistics.meritValue || 0);
    }
    if (sortBy === 'distance' && homePosition) {
      const distA = calculateDistance(homePosition.lat, homePosition.lng, a.coordinates[0], a.coordinates[1]);
      const distB = calculateDistance(homePosition.lat, homePosition.lng, b.coordinates[0], b.coordinates[1]);
      return distA - distB;
    }
    return 0;
  });

  // Stockholm center
  const defaultCenter: [number, number] = [59.3293, 18.0686];
  const defaultZoom = 11;

  return (
    <div className="relative h-screen w-full">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        zoomControl={true}
        className="h-full w-full"
        style={{ cursor: isSettingHome ? 'crosshair' : 'grab' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        <MapClickHandler onMapClick={handleMapClick} isSettingHome={isSettingHome} />
        <MapController center={mapCenter} onCenterHandled={handleMapCenterHandled} />

        {/* Home marker */}
        {homePosition && (
          <Marker
            position={[homePosition.lat, homePosition.lng]}
            icon={createHomeIcon()}
            draggable={true}
            eventHandlers={{
              dragend: (e) => {
                const marker = e.target;
                const position = marker.getLatLng();
                setHomePosition({ lat: position.lat, lng: position.lng });
              },
            }}
          >
            <Popup>
              <div className="p-2">
                <p className="font-medium">Your Home Location</p>
                <p className="text-sm text-gray-500">Drag to move</p>
                <button
                  onClick={handleClearHome}
                  className="mt-2 text-sm text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            </Popup>
          </Marker>
        )}

        {/* School markers */}
        {sortedSchools.map((school) => {
          const distance = homePosition
            ? calculateDistance(
                homePosition.lat,
                homePosition.lng,
                school.coordinates[0],
                school.coordinates[1]
              )
            : null;

          return (
            <Marker
              key={school.id}
              position={school.coordinates}
              icon={createSchoolIcon(school, colorMode)}
            >
              <Popup>
                <SchoolPopup
                  school={school}
                  homePosition={homePosition}
                  distance={distance}
                />
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Filter Panel */}
      <FilterPanel
        schools={schools}
        onFilter={setFilteredSchools}
        homePosition={homePosition}
        isSettingHome={isSettingHome}
        onSetHomeClick={() => setIsSettingHome(!isSettingHome)}
        onClearHome={handleClearHome}
        onHomePositionChange={handleHomePositionChange}
        sortBy={sortBy}
        onSortChange={setSortBy}
        colorMode={colorMode}
        onColorModeChange={setColorMode}
      />

      {/* Legend */}
      <Legend colorMode={colorMode} />

      {/* Setting home mode indicator */}
      {isSettingHome && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-full shadow-lg z-[1000]">
          Click on the map to set your home location
        </div>
      )}

      {/* Data timestamp */}
      {dataFetchedAt && (
        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded px-2 py-1 text-xs text-gray-500 z-[1000]">
          Data från Skolverket: {new Date(dataFetchedAt).toLocaleDateString('sv-SE', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </div>
      )}
    </div>
  );
}
