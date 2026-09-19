'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Spot } from '@/lib/types';
import SpotCard from '@/components/spots/SpotCard';
import SpotBottomSheet from '@/components/map/SpotBottomSheet';
import OnboardingTour from '@/components/ui/OnboardingTour';
import { haversineDistance as haversine } from '@/lib/utils';

// Dynamic import for MapView (no SSR needed for Leaflet)
const MapView = dynamic(() => import('@/components/map/MapView'), {
  ssr: false,
  loading: () => (
    <div className="h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="text-center">
        <div className="text-4xl mb-4 opacity-40">&#8943;</div>
        <div className="text-gray-500 dark:text-gray-400">Memuat peta...</div>
      </div>
    </div>
  ),
});

const RADIUS_OPTIONS = [10, 25, 50, 100];

type GeoState = 'pending' | 'ok' | 'denied' | 'unsupported';

interface UserPos {
  lat: number;
  lng: number;
}

export default function HomePage() {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);
  const [geoState, setGeoState] = useState<GeoState>('pending');
  const [userPos, setUserPos] = useState<UserPos | null>(null);
  const [radiusKm, setRadiusKm] = useState<number | null>(25);
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [showSidebar, setShowSidebar] = useState(false); // Desktop only
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const ctrl = new AbortController();
    fetchSpots(ctrl.signal);
    if (window.innerWidth >= 768) {
      setShowSidebar(true);
    }
    return () => {
      mountedRef.current = false;
      ctrl.abort();
    };
  }, []);

  // Fetch is decoupled from geolocation: data renders as soon as it arrives,
  // distance sorting/filtering applies independently once a fix is available.
  async function fetchSpots(signal?: AbortSignal) {
    try {
      const res = await fetch('/api/spots?limit=200', { signal });
      const data = await res.json();
      if (!mountedRef.current) return;
      setSpots(data.spots || []);
    } catch (error) {
      console.error('Failed to fetch spots:', error);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

  const requestLocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setGeoState('unsupported');
      return;
    }
    setGeoState('pending');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!mountedRef.current) return;
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoState('ok');
      },
      () => {
        if (!mountedRef.current) return;
        setGeoState('denied');
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  }, []);

  // All spots annotated with distance (map markers stay complete).
  const locatedSpots = useMemo(() => {
    if (!userPos) return spots;
    return spots
      .map((s) => ({
        ...s,
        distance_meters: haversine(userPos.lat, userPos.lng, s.lat, s.lng),
      }))
      .sort(
        (a, b) => (a.distance_meters ?? Infinity) - (b.distance_meters ?? Infinity)
      );
  }, [spots, userPos]);

  // Sidebar list honors the selected radius.
  const nearbySpots = useMemo(() => {
    if (!userPos || radiusKm === null) return locatedSpots;
    return locatedSpots.filter(
      (s) => (s.distance_meters ?? Infinity) <= radiusKm * 1000
    );
  }, [locatedSpots, userPos, radiusKm]);

  const waitingLocation = loading || geoState === 'pending';
  const hasLocation = geoState === 'ok' && userPos !== null;

  return (
    <div className="relative h-[calc(100vh-64px)] md:h-[calc(100vh-64px)]">
      {/* First-visit onboarding tour */}
      <OnboardingTour />

      {/* Map — always full width */}
      <div className="absolute inset-0">
        <MapView
          spots={locatedSpots}
          onSpotClick={(spot) => {
            setSelectedSpot(spot);
            setShowSidebar(true);
          }}
          height="100%"
        />
      </div>

      {/* Spot Count Badge */}
      <div className="absolute top-4 left-4 z-[1000] bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm shadow-lg rounded-lg px-3 py-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
          {spots.length} spot
        </span>
      </div>

      {/* Toggle Sidebar Button — desktop only */}
      <button
        onClick={() => setShowSidebar(!showSidebar)}
        className="hidden md:block absolute top-4 right-4 z-[1000] bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm shadow-lg rounded-lg px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-800 transition-colors"
      >
        {showSidebar ? 'Tutup' : 'Daftar'}
      </button>

      {/* Mobile — draggable bottom sheet (md:hidden) */}
      <SpotBottomSheet
        spots={nearbySpots}
        loading={waitingLocation}
        hasLocation={hasLocation}
        geoState={geoState}
        radiusKm={radiusKm}
        onRadiusChange={setRadiusKm}
        onRetryLocation={requestLocation}
      />

      {/* Desktop sidebar */}
      <div
        className={`
          hidden md:block absolute top-0 right-0 h-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-2xl z-[999]
          transition-all duration-300 ease-in-out overflow-hidden
          ${showSidebar ? 'translate-x-0' : 'translate-x-full'}
          w-96
        `}
      >
          <div className="h-full overflow-y-auto">
            {/* Sidebar Header */}
            <div className="sticky top-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
              <h2 className="font-bold text-lg text-gray-900 dark:text-white">
                {hasLocation ? 'Spot Terdekat' : 'Spot Terbaru'}
              </h2>
              <button
                onClick={() => setShowSidebar(false)}
                className="md:hidden p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                ✕
              </button>
            </div>

            {/* Radius filter + location feedback */}
            {hasLocation ? (
              <div className="px-4 pt-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">
                    Radius:
                  </span>
                  {RADIUS_OPTIONS.map((r) => (
                    <button
                      key={r}
                      onClick={() => setRadiusKm(r)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        radiusKm === r
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {r} km
                    </button>
                  ))}
                  <button
                    onClick={() => setRadiusKm(null)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      radiusKm === null
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    Semua
                  </button>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  {nearbySpots.length} dari {spots.length} spot dalam radius{' '}
                  {radiusKm === null ? 'tak terbatas' : `${radiusKm} km`}
                </p>
              </div>
            ) : geoState === 'denied' ? (
              <div className="px-4 pt-3 flex items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span>Aktifkan lokasi untuk spot terdekat.</span>
                <button
                  onClick={requestLocation}
                  className="shrink-0 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium hover:bg-blue-100 dark:hover:bg-blue-500/20"
                >
                  Coba lagi
                </button>
              </div>
            ) : null}

            <div className="p-4">
              {waitingLocation ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse bg-gray-100 dark:bg-gray-800 rounded-xl h-32" />
                  ))}
                </div>
              ) : spots.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <div className="text-4xl mb-2 opacity-30">?</div>
                  <p>Belum ada spot ditemukan</p>
                  <p className="text-sm mt-1">Jadilah yang pertama menambah spot!</p>
                </div>
              ) : hasLocation && nearbySpots.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <svg className="w-10 h-10 mx-auto mb-2 opacity-30" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                  <p>Tidak ada spot dalam radius {radiusKm} km</p>
                  <button
                    onClick={() => setRadiusKm(null)}
                    className="mt-3 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    Tampilkan semua spot
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {nearbySpots.map((spot) => (
                    <SpotCard
                      key={spot.id}
                      spot={spot}
                      showDistance={spot.distance_meters !== undefined}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
      </div>

      {/* Selected Spot Quick Card — bottom of screen on mobile */}
      {selectedSpot && (
        <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-[1001]">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-3">
            <svg width="32" height="32" viewBox="0 0 36 44" fill="none" className="shrink-0"><path d="M18 0C8.06 0 0 8.06 0 18C0 31.5 18 44 18 44C18 44 36 31.5 36 18C36 8.06 27.94 0 18 0Z" fill="#2563eb"/><circle cx="18" cy="18" r="10" fill="white"/><text x="18" y="22" text-anchor="middle" fontSize="12" fill="#2563eb">&#x1F41F;</text></svg>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 dark:text-white truncate">{selectedSpot.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {Number(selectedSpot.rating_avg || 0).toFixed(1)} · {selectedSpot.review_count || 0} ulasan
              </p>
            </div>
            <a
              href={`/spots/${selectedSpot.id}`}
              className="press-scale bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shrink-0"
            >
              Detail →
            </a>
            <button
              onClick={() => setSelectedSpot(null)}
              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 shrink-0"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
