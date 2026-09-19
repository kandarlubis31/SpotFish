'use client';

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Spot, SPOT_TYPE_LABELS, FACILITY_LABELS, ACCESSIBILITY_LABELS } from '@/lib/types';
import WaterLayer from './WaterLayer';
import GPSTracker from './GPSTracker';
import LingerDetector from './LingerDetector';
import ClusteredMarkers from './ClusteredMarkers';
import { useToast } from '@/components/ui/Toast';
import { formatDistance, formatRating } from '@/lib/utils';
import Link from 'next/link';

// Fix Leaflet default marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom pin-shaped marker icons per spot type
const createSpotIcon = (spotType: string) => {
  const colors: Record<string, string> = {
    laut: '#0ea5e9',
    sungai: '#06b6d4',
    danau: '#8b5cf6',
    kolam: '#22c55e',
    waduk: '#3b82f6',
    dermaga: '#f59e0b',
    muara: '#6366f1',
    rawa: '#84cc16',
    irigasi: '#14b8a6',
    lainnya: '#6b7280',
  };

  const color = colors[spotType] || '#6b7280';
  // Use first letter of spot type
  const letter = (SPOT_TYPE_LABELS[spotType as keyof typeof SPOT_TYPE_LABELS] || spotType).charAt(0).toUpperCase();

  return L.divIcon({
    html: `<svg width="36" height="44" viewBox="0 0 36 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 0C8.06 0 0 8.06 0 18C0 31.5 18 44 18 44C18 44 36 31.5 36 18C36 8.06 27.94 0 18 0Z" fill="${color}"/>
      <circle cx="18" cy="18" r="12" fill="white" opacity="0.95"/>
      <text x="18" y="23" text-anchor="middle" font-size="13" font-weight="600" fill="${color}" font-family="system-ui,sans-serif">${letter}</text>
      <path d="M18 0C8.06 0 0 8.06 0 18C0 31.5 18 44 18 44C18 44 36 31.5 36 18C36 8.06 27.94 0 18 0Z" fill="none" stroke="white" stroke-width="2"/>
    </svg>`,
    className: 'custom-marker',
    iconSize: [36, 44],
    iconAnchor: [18, 44],
    popupAnchor: [0, -44],
  });
};

// Component to handle map events (click to add spot)
function MapEvents({ onMapClick }: { onMapClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

// Component to recenter map
function RecenterMap({ center }: { center: [number, number] }) {
  const map = useMap();
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      map.setView(center, 15);
      firstRun.current = false;
    } else {
      map.flyTo(center, 15, { duration: 1.5 });
    }
  }, [center, map]);
  return null;
}

// "My Position" button component
function LocationButton({ onLocate }: { onLocate: () => void }) {
  const map = useMap();

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    onLocate();
  }

  return (
    <div className="leaflet-bar" style={{ position: 'absolute', top: '56px', right: '10px', zIndex: 1000 }}>
      <button
        onClick={handleClick}
        title="Lokasi saya"
        className="flex items-center justify-center w-[34px] h-[34px] bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <line x1="12" y1="2" x2="12" y2="6"/>
          <line x1="12" y1="18" x2="12" y2="22"/>
          <line x1="2" y1="12" x2="6" y2="12"/>
          <line x1="18" y1="12" x2="22" y2="12"/>
        </svg>
      </button>
    </div>
  );
}

interface MapViewProps {
  spots?: Spot[];
  center?: [number, number];
  zoom?: number;
  onMapClick?: (lat: number, lng: number) => void;
  onSpotClick?: (spot: Spot) => void;
  height?: string;
}

type MapStyle = 'clean' | 'gray' | 'satellite' | 'hybrid';

const MAP_STYLES: { value: MapStyle; label: string }[] = [
  { value: 'clean', label: 'Standar' },
  { value: 'gray', label: 'Minimal' },
  { value: 'satellite', label: 'Satelit' },
  { value: 'hybrid', label: 'Hybrid' },
];

export default function MapView({
  spots = [],
  center = [-6.2088, 106.8456], // Default: Jakarta
  zoom = 10,
  onMapClick,
  onSpotClick,
  height = '100vh',
}: MapViewProps) {
  const { toast } = useToast();
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(center);
  const [locating, setLocating] = useState(false);
  const [isDark, setIsDark] = useState(false);
  // Default = 'gray' (Minimal/Esri) — fishing-first: kanvas bersih, air & spot jadi fokus
  const [mapStyle, setMapStyleState] = useState<MapStyle>('gray');
  const [showStylePicker, setShowStylePicker] = useState(false);
  const [isTracking, setIsTracking] = useState(false);

  // Persisted style — load once from localStorage (client-side only, after hydration)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('spotfish-map-style') as MapStyle | null;
      if (saved && MAP_STYLES.some((s) => s.value === saved)) {
        setMapStyleState(saved);
      }
    } catch {
      // storage unavailable — keep default
    }
  }, []);

  const setMapStyle = (style: MapStyle) => {
    setMapStyleState(style);
    try {
      localStorage.setItem('spotfish-map-style', style);
    } catch {
      // ignore
    }
  };

  // Detect dark mode
  useEffect(() => {
    function checkDark() {
      setIsDark(document.documentElement.classList.contains('dark'));
    }
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Toggle satellite-mode CSS class on map container
  useEffect(() => {
    const container = document.querySelector('.leaflet-container');
    if (container) {
      container.classList.toggle('satellite-mode', mapStyle === 'satellite' || mapStyle === 'hybrid' || mapStyle === 'gray');
    }
  }, [mapStyle]);

  // Close style picker when clicking outside
  useEffect(() => {
    if (!showStylePicker) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-layer-picker]')) {
        setShowStylePicker(false);
      }
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [showStylePicker]);

  function handleLocate() {
    if (!navigator.geolocation) {
      toast('Browser kamu tidak mendukung geolocation.', 'error');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation([latitude, longitude]);
        setMapCenter([latitude, longitude]);
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        if (err.code === 1) {
          toast('Izin lokasi ditolak. Aktifkan di address bar (ikon gembok) lalu refresh.', 'error', 6000);
        } else if (err.code === 2) {
          toast('Lokasi tidak tersedia. Pastikan GPS aktif.', 'error');
        } else {
          toast('Timeout mendapatkan lokasi. Coba lagi.', 'error');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  return (
    <div style={{ height, width: '100%', position: 'relative' }}>
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        zoomControl={false}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        {/* ===== BASE TILES ===== */}
        {(mapStyle === 'clean') && (
          <TileLayer
            key="clean"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM contributors</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            // OSM policy: maxZoom 19, no heavy usage. Dark mode diberi filter CSS.
          />
        )}

        {/* Minimal — Esri Light/Dark Gray Canvas: clean look tanpa kebisingan POI, no API key */}
        {(mapStyle === 'gray') && (
          <TileLayer
            key="gray"
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url={isDark
              ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
              : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'
            }
            maxZoom={16}
          />
        )}

        {(mapStyle === 'satellite' || mapStyle === 'hybrid') && (
          <TileLayer
            key="satellite"
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        )}

        {/* ===== LABELS OVERLAY (for hybrid mode) ===== */}
        {mapStyle === 'hybrid' && (
          <>
            <TileLayer
              key="labels-boundaries"
              attribution=''
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
              pane="overlayPane"
            />
            <TileLayer
              key="labels-transport"
              attribution=''
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}"
              pane="overlayPane"
            />
          </>
        )}

        {/* Water bodies overlay */}
        <WaterLayer />

        {/* Map click handler */}
        <MapEvents onMapClick={onMapClick} />

        {/* Recenter when user location changes */}
        <RecenterMap center={mapCenter} />

        {/* GPS Tracker */}
        <GPSTracker onTrackingChange={setIsTracking} />

        {/* Linger Detection */}
        <LingerDetector isTracking={isTracking} />

        {/* Layer toggle button */}
        <div className="leaflet-bar" style={{ position: 'absolute', top: '56px', right: '10px', zIndex: 1000 }} data-layer-picker>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowStylePicker(!showStylePicker);
            }}
            title="Ganti tampilan peta"
            className="flex items-center justify-center w-[34px] h-[34px] bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2"/>
              <polyline points="2 17 12 22 22 17"/>
              <polyline points="2 12 12 17 22 12"/>
            </svg>
          </button>
          {showStylePicker && (
            <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-[120px] z-50">
              {MAP_STYLES.map((style) => (
                <button
                  key={style.value}
                  onClick={(e) => {
                    e.stopPropagation();
                    setMapStyle(style.value);
                    setShowStylePicker(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                    mapStyle === style.value
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 font-medium'
                      : 'text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700/50'
                  }`}
                >
                  {mapStyle === style.value && (
                    <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  {!mapStyle.includes(style.value) && <span className="w-4" />}
                  <span>{style.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* My Position button */}
        <LocationButton onLocate={handleLocate} />

        {/* Spot markers — clustered when many, individual when few (detail page) */}
        {spots.length > 15 ? (
          <ClusteredMarkers spots={spots} onSpotClick={onSpotClick} />
        ) : (
          spots.map((spot) => (
            <Marker
              key={spot.id}
              position={[spot.lat, spot.lng]}
              icon={createSpotIcon(spot.spot_type)}
              eventHandlers={{
                click: () => {
                  if (onSpotClick) onSpotClick(spot);
                },
              }}
            >
              <Popup maxWidth={300} minWidth={250}>
              <div className="p-1">
                {spot.photos && spot.photos.length > 0 && (
                  <div className="relative -mx-1 -mt-1 mb-2 h-28 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={spot.photos[0]}
                      alt={spot.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{backgroundColor: '#3b82f6'}}>{spot.spot_type.charAt(0).toUpperCase()}</div>
                  <div>
                    <h3 className="font-bold text-lg leading-tight">{spot.name}</h3>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {SPOT_TYPE_LABELS[spot.spot_type]}
                    </span>
                  </div>
                </div>

                {spot.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 line-clamp-2">
                    {spot.description}
                  </p>
                )}

                <div className="flex items-center gap-3 text-sm mb-2">
                  <span className="flex items-center gap-1">
                    {formatRating(spot.rating_avg)} ({spot.review_count})
                  </span>
                  {spot.distance_meters !== undefined && (
                    <span className="text-blue-600">
                      {formatDistance(spot.distance_meters)}
                    </span>
                  )}
                </div>

                {spot.facilities && spot.facilities.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {spot.facilities.map((f) => (
                      <span
                        key={f}
                        className="text-xs bg-gray-100 dark:bg-gray-700 dark:text-gray-200 px-2 py-0.5 rounded"
                      >
                        {FACILITY_LABELS[f] || f}
                      </span>
                    ))}
                  </div>
                )}

                <Link
                  href={`/spots/${spot.id}`}
                  className="block w-full text-center bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Lihat Detail →
                </Link>
              </div>
              </Popup>
            </Marker>
          ))
        )}

        {/* User location marker */}
        {userLocation && (
          <Marker
            position={userLocation}
            icon={L.divIcon({
              html: `<div style="position:relative;width:24px;height:24px;">
                <div style="position:absolute;inset:0;background:rgba(239,68,68,0.2);border-radius:50%;animation:ping 1.5s infinite;"></div>
                <div style="position:absolute;inset:4px;background:#ef4444;border-radius:50%;border:3px solid white;box-shadow:0 0 12px rgba(239,68,68,0.6);"></div>
              </div>
              <style>@keyframes ping{0%{transform:scale(1);opacity:1}75%,100%{transform:scale(2.5);opacity:0}}</style>`,
              className: 'user-location-marker',
              iconSize: [24, 24],
              iconAnchor: [12, 12],
            })}
          >
            <Popup>
              <div className="text-center p-1">
                <span className="font-bold">Lokasi Anda</span>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {userLocation[0].toFixed(6)}, {userLocation[1].toFixed(6)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
