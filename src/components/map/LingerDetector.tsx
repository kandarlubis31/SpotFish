'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { haversineDistance as haversine } from '@/lib/utils';

const LINGER_RADIUS = 50; // meters
const LINGER_MIN_DURATION = 15 * 60 * 1000; // 15 minutes
const CHECK_INTERVAL = 30_000; // 30 seconds

interface Position {
  lat: number;
  lng: number;
  timestamp: number;
}

interface LingerSpot {
  lat: number;
  lng: number;
  startTime: number;
}

interface LingerDetectorProps {
  isTracking: boolean;
}

export default function LingerDetector({ isTracking }: LingerDetectorProps) {
  const map = useMap();
  const [suggestion, setSuggestion] = useState<LingerSpot | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const positionsRef = useRef<Position[]>([]);
  const watchIdRef = useRef<number | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const detectedRef = useRef(false);

  // Lightweight position watcher (only for linger detection)
  useEffect(() => {
    if (!isTracking) {
      // Cleanup
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      positionsRef.current = [];
      detectedRef.current = false;
      if (markerRef.current) {
        try { map.removeLayer(markerRef.current); } catch {}
        markerRef.current = null;
      }
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        positionsRef.current.push({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          timestamp: pos.timestamp,
        });
        // Keep last 30 minutes of positions
        const cutoff = Date.now() - 30 * 60 * 1000;
        positionsRef.current = positionsRef.current.filter(p => p.timestamp > cutoff);
      },
      () => {},
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5000 }
    );

    watchIdRef.current = id;
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isTracking, map]);

  // Check for linger periodically
  useEffect(() => {
    if (!isTracking || dismissed) return;

    const interval = setInterval(() => {
      if (detectedRef.current) return;

      const positions = positionsRef.current;
      if (positions.length < 3) return;

      // Centroid of recent positions (last 20 min)
      const cutoff = Date.now() - 20 * 60 * 1000;
      const recent = positions.filter(p => p.timestamp > cutoff);
      if (recent.length < 3) return;

      const avgLat = recent.reduce((s, p) => s + p.lat, 0) / recent.length;
      const avgLng = recent.reduce((s, p) => s + p.lng, 0) / recent.length;

      // Check all within radius
      const allNear = recent.every(p => haversine(p.lat, p.lng, avgLat, avgLng) < LINGER_RADIUS);
      if (!allNear) return;

      // Check duration
      const oldest = recent[0];
      const duration = Date.now() - oldest.timestamp;
      if (duration < LINGER_MIN_DURATION) return;

      // Linger detected!
      detectedRef.current = true;

      // Add marker
      const marker = L.marker([avgLat, avgLng], {
        icon: L.divIcon({
          html: `<div style="position:relative;width:28px;height:28px;">
            <div style="position:absolute;inset:0;background:rgba(16,185,129,0.15);border-radius:50%;animation:ping 2s infinite;"></div>
            <div style="position:absolute;inset:4px;background:#10b981;border-radius:50%;border:2px solid white;box-shadow:0 0 8px rgba(16,185,129,0.5);display:flex;align-items:center;justify-content:center;">
              <span style="color:white;font-size:10px;font-weight:bold;">+</span>
            </div>
          </div>`,
          className: 'linger-marker',
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }),
      }).addTo(map);

      marker.bindTooltip('Lokasi potensial spot', {
        permanent: true,
        direction: 'top',
        offset: [0, -14],
        className: 'linger-tooltip',
      });
      markerRef.current = marker;

      setSuggestion({ lat: avgLat, lng: avgLng, startTime: oldest.timestamp });
    }, CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [isTracking, dismissed, map]);

  function handleDismiss() {
    setDismissed(true);
    setSuggestion(null);
  }

  function handleAdd() {
    if (!suggestion) return;
    // Navigate with pre-filled coordinates
    window.location.href = `/spots/new?lat=${suggestion.lat.toFixed(6)}&lng=${suggestion.lng.toFixed(6)}`;
  }

  if (!suggestion) return null;

  const minutesSince = Math.round((Date.now() - suggestion.startTime) / 60000);

  return (
    <div
      className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-[1002] bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-green-200 dark:border-green-500/30 overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 dark:bg-green-500/10 border-b border-green-100 dark:border-green-500/20">
        <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-green-800 dark:text-green-300">Spot Potensial Terdeteksi</p>
          <p className="text-xs text-green-600 dark:text-green-400">Kamu sudah di sini {minutesSince} menit</p>
        </div>
        <button onClick={handleDismiss} className="text-green-400 hover:text-green-600 text-lg leading-none shrink-0">
          ✕
        </button>
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
          Lokasi ini berpotensi menjadi spot mancing baru. Mau tambahkan ke peta?
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleAdd}
            className="flex-1 bg-green-600 text-center py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors text-white"
          >
            Tambah Spot
          </button>
          <button
            onClick={handleDismiss}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Lewati
          </button>
        </div>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 text-center">
          {suggestion.lat.toFixed(6)}, {suggestion.lng.toFixed(6)}
        </p>
      </div>
    </div>
  );
}
