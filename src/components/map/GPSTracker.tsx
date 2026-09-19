'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { haversineDistance as haversine } from '@/lib/utils';
import { downloadGpx } from '@/lib/gpx';
import { useToast } from '@/components/ui/Toast';

interface TrackPoint {
  lat: number;
  lng: number;
  timestamp: number;
  altitude: number | null;
}

interface GPSTrackerProps {
  onTrackingChange?: (isTracking: boolean) => void;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}j ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

function formatSpeed(mps: number): string {
  const kmh = mps * 3.6;
  if (kmh < 1) return `${Math.round(mps * 1000)} m/menit`;
  return `${kmh.toFixed(1)} km/j`;
}

export default function GPSTracker({ onTrackingChange }: GPSTrackerProps) {
  const map = useMap();
  const { toast } = useToast();
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  // Tracking data
  const [totalDistance, setTotalDistance] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [pointCount, setPointCount] = useState(0);

  // Last session summary (kept after stop so user can export)
  const [lastSession, setLastSession] = useState<{ points: TrackPoint[] } | null>(null);

  // Refs
  const watchIdRef = useRef<number | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const pointsRef = useRef<TrackPoint[]>([]);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastPositionRef = useRef<{ lat: number; lng: number } | null>(null);

  // Elapsed time timer
  useEffect(() => {
    if (isTracking && !isPaused) {
      timerRef.current = setInterval(() => {
        const now = Date.now();
        const pausedDuration = pausedTimeRef.current;
        setElapsedTime(now - startTimeRef.current - pausedDuration);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTracking, isPaused]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, []);

  const addPoint = useCallback((lat: number, lng: number, altitude: number | null, timestamp: number) => {
    const point: TrackPoint = { lat, lng, timestamp, altitude };
    pointsRef.current.push(point);
    setPointCount(pointsRef.current.length);

    // Calculate distance from last point
    if (lastPositionRef.current) {
      const dist = haversine(lastPositionRef.current.lat, lastPositionRef.current.lng, lat, lng);
      // Only add if moved more than 3m (filter GPS noise)
      if (dist > 3) {
        setTotalDistance(prev => prev + dist);
        setCurrentSpeed(dist / Math.max((timestamp - (pointsRef.current[pointsRef.current.length - 2]?.timestamp || timestamp)) / 1000, 0.1));
      }
    }
    lastPositionRef.current = { lat, lng };

    // Update polyline
    const positions = pointsRef.current.map(p => [p.lat, p.lng] as [number, number]);
    if (polylineRef.current) {
      polylineRef.current.setLatLngs(positions);
    }

    // Update current position marker
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    }
  }, []);

  function startTracking() {
    if (!navigator.geolocation) {
      toast('Browser tidak mendukung GPS tracking.', 'error');
      return;
    }

    // Reset state
    pointsRef.current = [];
    lastPositionRef.current = null;
    setTotalDistance(0);
    setCurrentSpeed(0);
    setElapsedTime(0);
    setPointCount(0);
    startTimeRef.current = Date.now();
    pausedTimeRef.current = 0;

    // Create polyline
    const polyline = L.polyline([], {
      color: '#3b82f6',
      weight: 3,
      opacity: 0.8,
      dashArray: '8 4',
      className: 'gps-route',
    }).addTo(map);

    // Create current position marker
    const marker = L.marker([0, 0], {
      icon: L.divIcon({
        html: `<div style="position:relative;width:16px;height:16px;">
          <div style="position:absolute;inset:0;background:rgba(59,130,246,0.3);border-radius:50%;animation:ping 1.5s infinite;"></div>
          <div style="position:absolute;inset:3px;background:#3b82f6;border-radius:50%;border:2px solid white;box-shadow:0 0 8px rgba(59,130,246,0.6);"></div>
        </div>`,
        className: 'gps-position-marker',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      }),
    }).addTo(map);

    polylineRef.current = polyline;
    markerRef.current = marker;

    // Start watching position
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, altitude } = pos.coords;
        addPoint(latitude, longitude, altitude, pos.timestamp);
      },
      (err) => {
        console.warn('GPS tracking error:', err.message);
        if (err.code === 1) {
          toast('Izin lokasi ditolak. Aktifkan izin lokasi di browser.', 'error');
          stopTracking();
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );

    watchIdRef.current = id;
    setIsTracking(true);
    setIsPaused(false);
    setPanelOpen(true);
    onTrackingChange?.(true);
  }

  function pauseTracking() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsPaused(true);
    pausedTimeRef.current += Date.now() - (startTimeRef.current + elapsedTime);
  }

  function resumeTracking() {
    if (!navigator.geolocation) return;

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, altitude } = pos.coords;
        addPoint(latitude, longitude, altitude, pos.timestamp);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );

    watchIdRef.current = id;
    setIsPaused(false);
  }

  function stopTracking() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    // Remove map elements
    if (polylineRef.current) {
      map.removeLayer(polylineRef.current);
      polylineRef.current = null;
    }
    if (markerRef.current) {
      map.removeLayer(markerRef.current);
      markerRef.current = null;
    }

    // Keep points so user can export GPX after finishing
    if (pointsRef.current.length > 0) {
      setLastSession({ points: [...pointsRef.current] });
    }

    setIsTracking(false);
    setIsPaused(false);
    onTrackingChange?.(false);
  }

  return (
    <>
      {/* GPS Tracker button */}
      <div className="leaflet-bar" style={{ position: 'absolute', top: '56px', right: '50px', zIndex: 1000 }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (isTracking) {
              setPanelOpen(!panelOpen);
            } else {
              startTracking();
            }
          }}
          title={isTracking ? 'Lihat tracking' : 'Mulai GPS tracking'}
          className={`flex items-center justify-center w-[34px] h-[34px] transition-colors ${
            isTracking
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
          }`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        </button>
      </div>

      {/* Tracking panel */}
      {isTracking && panelOpen && (
        <div
          className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-72 z-[1001] bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 bg-blue-600 text-white">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isPaused ? 'bg-yellow-400' : 'bg-green-400 animate-pulse'}`} />
              <span className="text-sm font-medium">{isPaused ? 'Dijeda' : 'Tracking Aktif'}</span>
            </div>
            <button onClick={() => setPanelOpen(false)} className="text-white/80 hover:text-white text-lg leading-none">
              ✕
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 p-3">
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900 dark:text-white">{formatDistance(totalDistance)}</div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">Jarak</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900 dark:text-white">{formatDuration(elapsedTime)}</div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">Waktu</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900 dark:text-white">{pointCount}</div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">Titik</div>
            </div>
          </div>

          {/* Speed */}
          {currentSpeed > 0 && (
            <div className="px-3 pb-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Kecepatan</span>
                <span className="font-medium text-gray-700 dark:text-gray-200">{formatSpeed(currentSpeed)}</span>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex gap-2 p-3 pt-1 border-t border-gray-100 dark:border-gray-700">
            {isPaused ? (
              <button
                onClick={resumeTracking}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
              >
                Lanjutkan
              </button>
            ) : (
              <button
                onClick={pauseTracking}
                className="flex-1 bg-yellow-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-yellow-600 transition-colors"
              >
                Jeda
              </button>
            )}
            <button
              onClick={stopTracking}
              className="flex-1 bg-red-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
            >
              Selesai
            </button>
          </div>
        </div>
      )}

      {/* Finished session card with GPX export */}
      {!isTracking && lastSession && lastSession.points.length > 0 && (
        <div
          className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-72 z-[1001] bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-4 py-2 bg-gray-700 dark:bg-gray-900 text-white">
            <span className="text-sm font-medium">Session Selesai</span>
            <button
              onClick={() => setLastSession(null)}
              className="text-white/80 hover:text-white text-lg leading-none"
              aria-label="Tutup"
            >
              ✕
            </button>
          </div>
          <div className="p-3 space-y-2">
            <div className="text-sm text-gray-600 dark:text-gray-300">
              {lastSession.points.length} titik GPS terekam. Ekspor route untuk dibuka di aplikasi lain (Strava, Google Earth, dll).
            </div>
            <button
              onClick={() => {
                if (downloadGpx(lastSession.points)) {
                  toast('Track GPX berhasil diunduh', 'success');
                } else {
                  toast('Track terlalu pendek untuk diekspor (minimal 2 titik).', 'error');
                }
              }}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Ekspor GPX
            </button>
          </div>
          <style jsx>{`
            @keyframes ping {
              0% { transform: scale(1); opacity: 0.8; }
              75%, 100% { transform: scale(2.2); opacity: 0; }
            }
            .ping { animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite; }
          `}</style>
        </div>
      )}
    </>
  );
}
