'use client';

import { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { School, getMeritLevel, getMeritColor, calculateDistance } from '@/lib/types';
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

function createMeritIcon(meritValue: number | null): L.DivIcon {
  const level = getMeritLevel(meritValue);
  const color = getMeritColor(level);

  return L.divIcon({
    className: 'merit-marker',
    html: `<div style="
      width: 24px;
      height: 24px;
      background: ${color};
      border: 2px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
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

interface SchoolMapProps {
  schools: School[];
}

export default function SchoolMap({ schools }: SchoolMapProps) {
  const [homePosition, setHomePosition] = useState<HomePosition | null>(null);
  const [isSettingHome, setIsSettingHome] = useState(false);
  const [filteredSchools, setFilteredSchools] = useState<School[]>(schools);
  const [sortBy, setSortBy] = useState<'merit' | 'distance'>('merit');

  // Load home position from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('homePosition');
    if (saved) {
      setHomePosition(JSON.parse(saved));
    }
  }, []);

  // Save home position to localStorage
  useEffect(() => {
    if (homePosition) {
      localStorage.setItem('homePosition', JSON.stringify(homePosition));
    }
  }, [homePosition]);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setHomePosition({ lat, lng });
    setIsSettingHome(false);
  }, []);

  const handleClearHome = useCallback(() => {
    setHomePosition(null);
    localStorage.removeItem('homePosition');
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
        className="h-full w-full"
        style={{ cursor: isSettingHome ? 'crosshair' : 'grab' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        <MapClickHandler onMapClick={handleMapClick} isSettingHome={isSettingHome} />

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
              icon={createMeritIcon(school.statistics.meritValue)}
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
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      {/* Legend */}
      <Legend />

      {/* Setting home mode indicator */}
      {isSettingHome && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-full shadow-lg z-[1000]">
          Click on the map to set your home location
        </div>
      )}
    </div>
  );
}
