'use client';

import { Spot, FishSpecies, FACILITY_LABELS, ACCESSIBILITY_LABELS } from '@/lib/types';
import { sanitizeHtml } from '@/lib/utils';

interface SpotInfoGridProps {
  spot: Spot;
  fishSpecies: FishSpecies[];
}

export default function SpotInfoGrid({ spot, fishSpecies }: SpotInfoGridProps) {
  function getFishName(fishId: string): string {
    const fish = fishSpecies.find(f => f.id === fishId);
    return fish ? fish.name : fishId;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      {/* Left: Description */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="font-bold text-lg mb-3">Deskripsi</h2>
        <p className="text-gray-600 dark:text-gray-300">{sanitizeHtml(spot.description || 'Tidak ada deskripsi')}</p>

        {spot.fish_species && spot.fish_species.length > 0 && (
          <div className="mt-4">
            <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-200 mb-1">Jenis Ikan</h3>
            <div className="flex flex-wrap gap-2">
              {spot.fish_species.map((fishId: string) => (
                <span key={fishId} className="bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-full text-sm">
                  {getFishName(fishId)}
                </span>
              ))}
            </div>
          </div>
        )}

        {spot.best_times && (
          <div className="mt-4">
            <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-200 mb-1">Waktu Terbaik</h3>
            <p className="text-gray-600 dark:text-gray-300">{spot.best_times}</p>
          </div>
        )}

        <div className="mt-4">
          <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-200 mb-1">Koordinat</h3>
          <p className="text-gray-600 dark:text-gray-300 font-mono text-sm">
            {Number(spot.lat).toFixed(6)}, {Number(spot.lng).toFixed(6)}
          </p>
        </div>
      </div>

      {/* Right: Facilities & Accessibility */}
      <div className="space-y-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="font-bold text-lg mb-3">Fasilitas</h2>
          {spot.facilities && spot.facilities.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {spot.facilities.map((f) => (
                <span key={f} className="bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 px-3 py-1.5 rounded-full text-sm">
                  {FACILITY_LABELS[f] || f}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-sm">Tidak ada info fasilitas</p>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="font-bold text-lg mb-3">Aksesibilitas</h2>
          <span className="inline-flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-lg">
            {spot.accessibility === 'mudah' && (
              <svg className="w-4 h-4 text-green-500 dark:text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            )}
            {spot.accessibility === 'sedang' && (
              <svg className="w-4 h-4 text-yellow-500 dark:text-yellow-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            )}
            {spot.accessibility === 'sulit' && (
              <svg className="w-4 h-4 text-red-500 dark:text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            )}
            {spot.accessibility === 'hanya_perahu' && (
              <svg className="w-4 h-4 text-blue-500 dark:text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 20l2-1h16l2 1"/><path d="M4 20l1-12h14l1 12"/><path d="M12 4V2"/><path d="M9 3l3-1 3 1"/></svg>
            )}
            {ACCESSIBILITY_LABELS[spot.accessibility]}
          </span>
        </div>
      </div>
    </div>
  );
}
