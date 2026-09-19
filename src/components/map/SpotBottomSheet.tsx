'use client';

import { useState, useRef, useCallback } from 'react';
import SpotCard from '@/components/spots/SpotCard';
import { Spot } from '@/lib/types';

const RADIUS_OPTIONS = [10, 25, 50, 100];
const SNAP_PEEK = 88; // collapsed: header + filters visible
const SNAP_HALF = 45; // % of viewport
const SNAP_FULL = 90; // % of viewport

interface BottomSheetProps {
  spots: Spot[];
  loading: boolean;
  hasLocation: boolean;
  geoState: 'pending' | 'ok' | 'denied' | 'unsupported';
  radiusKm: number | null;
  onRadiusChange: (r: number | null) => void;
  onRetryLocation: () => void;
}

type Snap = 'peek' | 'half' | 'full';

export default function SpotBottomSheet({
  spots,
  loading,
  hasLocation,
  geoState,
  radiusKm,
  onRadiusChange,
  onRetryLocation,
}: BottomSheetProps) {
  const [snap, setSnap] = useState<Snap>('peek');
  const [dragY, setDragY] = useState<number | null>(null); // live drag offset
  const startY = useRef(0);
  const startHeight = useRef(0);
  const dragging = useRef(false);

  const heightFor = useCallback((s: Snap): number => {
    if (s === 'peek') return SNAP_PEEK;
    if (s === 'half') return (window.innerHeight * SNAP_HALF) / 100;
    return (window.innerHeight * SNAP_FULL) / 100;
  }, []);

  const nearestSnap = useCallback(
    (px: number): Snap => {
      const half = (window.innerHeight * SNAP_HALF) / 100;
      const full = (window.innerHeight * SNAP_FULL) / 100;
      const dists: [Snap, number][] = [
        ['peek', Math.abs(px - SNAP_PEEK)],
        ['half', Math.abs(px - half)],
        ['full', Math.abs(px - full)],
      ];
      dists.sort((a, b) => a[1] - b[1]);
      return dists[0][0];
    },
    []
  );

  const onTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('[data-no-drag]')) return;
    dragging.current = true;
    startY.current = e.touches[0].clientY;
    startHeight.current = heightFor(snap);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragging.current) return;
    const delta = startY.current - e.touches[0].clientY;
    const next = Math.min(
      (window.innerHeight * SNAP_FULL) / 100 + 40,
      Math.max(SNAP_PEEK - 20, startHeight.current + delta)
    );
    setDragY(next);
  };

  const onTouchEnd = () => {
    if (!dragging.current) return;
    dragging.current = false;
    if (dragY !== null) setSnap(nearestSnap(dragY));
    setDragY(null);
  };

  // Mouse support (desktop testing)
  const onMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-no-drag]')) return;
    dragging.current = true;
    startY.current = e.clientY;
    startHeight.current = heightFor(snap);

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const delta = startY.current - ev.clientY;
      setDragY(
        Math.min(
          (window.innerHeight * SNAP_FULL) / 100 + 40,
          Math.max(SNAP_PEEK - 20, startHeight.current + delta)
        )
      );
    };
    const onUp = () => {
      dragging.current = false;
      setDragY((y) => {
        if (y !== null) setSnap(nearestSnap(y));
        return null;
      });
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const height = dragY !== null ? dragY : heightFor(snap);
  const isDragging = dragY !== null;

  return (
    <div
      className="absolute left-0 right-0 bottom-0 z-[1000] md:hidden"
      style={{ touchAction: 'none' }}
    >
      <div
        className={`bg-white dark:bg-gray-900 rounded-t-2xl shadow-[0_-4px_24px_rgba(0,0,0,0.15)] border-t border-x border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden ${
          isDragging ? '' : 'transition-[height] duration-300 ease-out'
        }`}
        style={{ height }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
      >
        {/* Drag handle */}
        <button
          aria-label="Geser daftar spot"
          onClick={() => setSnap(snap === 'peek' ? 'half' : snap === 'half' ? 'full' : 'peek')}
          className="w-full pt-2.5 pb-1.5 flex justify-center shrink-0"
        >
          <span className="w-10 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />
        </button>

        {/* Header */}
        <div className="px-4 pb-2 flex items-center justify-between shrink-0">
          <h2 className="font-bold text-base text-gray-900 dark:text-white">
            {hasLocation ? 'Spot Terdekat' : 'Spot Terbaru'}
          </h2>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {spots.length} spot
          </span>
        </div>

        {/* Radius filter */}
        {hasLocation ? (
          <div className="px-4 pb-2 flex items-center gap-1.5 flex-wrap shrink-0" data-no-drag>
            {RADIUS_OPTIONS.map((r) => (
              <button
                key={r}
                onClick={() => onRadiusChange(r)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  radiusKm === r
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                }`}
              >
                {r} km
              </button>
            ))}
            <button
              onClick={() => onRadiusChange(null)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                radiusKm === null
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
              }`}
            >
              Semua
            </button>
          </div>
        ) : geoState === 'denied' ? (
          <div className="px-4 pb-2 flex items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400 shrink-0" data-no-drag>
            <span>Aktifkan lokasi untuk spot terdekat.</span>
            <button
              onClick={onRetryLocation}
              className="shrink-0 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium"
            >
              Coba lagi
            </button>
          </div>
        ) : null}

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pt-1" data-no-drag>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse bg-gray-100 dark:bg-gray-800 rounded-xl h-32" />
              ))}
            </div>
          ) : spots.length === 0 && !hasLocation ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p className="font-medium">Belum ada spot ditemukan</p>
              <p className="text-sm mt-1 mb-4">Jadilah yang pertama membagikan spot mancing!</p>
              <a
                href="/spots/new"
                className="inline-block px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium"
              >
                Tambah Spot
              </a>
            </div>
          ) : spots.length === 0 && hasLocation ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <svg className="w-10 h-10 mx-auto mb-2 opacity-30" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
              <p className="font-medium">Tidak ada spot dalam radius {radiusKm} km</p>
              <p className="text-sm mt-1">Coba perbesar radius untuk melihat lebih banyak spot.</p>
              <button
                onClick={() => onRadiusChange(null)}
                className="mt-3 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium"
              >
                Tampilkan semua spot
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {spots.map((spot) => (
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
  );
}
