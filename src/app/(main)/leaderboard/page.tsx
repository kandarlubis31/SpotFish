'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { SPOT_TYPE_LABELS, SpotType } from '@/lib/types';

interface LeaderboardAngler {
  id: string;
  username: string;
  avatar_url?: string;
  specialization: string;
  spots_count: number;
  reviews_count: number;
  catches_count: number;
  total_fish: number;
  points: number;
}

interface TopSpot {
  id: string;
  name: string;
  spot_type: SpotType;
  rating_avg: number;
  review_count: number;
  photos: string[];
  username?: string;
}

const SPECIALIZATION_LABELS: Record<string, string> = {
  laut: 'Angler Laut',
  air_tawar: 'Angler Air Tawar',
  campuran: 'Campuran',
  all: 'Semua',
};

function RankBadge({ rank }: { rank: number }) {
  const colors: Record<number, string> = {
    1: 'bg-yellow-400 text-yellow-900',
    2: 'bg-gray-300 text-gray-800',
    3: 'bg-orange-400 text-orange-900',
  };
  if (rank <= 3) {
    return (
      <span
        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${colors[rank]}`}
      >
        {rank}
      </span>
    );
  }
  return (
    <span className="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm text-gray-500 dark:text-gray-400 shrink-0">
      {rank}
    </span>
  );
}

export default function LeaderboardPage() {
  const [anglers, setAnglers] = useState<LeaderboardAngler[]>([]);
  const [topSpots, setTopSpots] = useState<TopSpot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch('/api/leaderboard', { signal: ctrl.signal })
      .then((r) => r.json())
      .then((data) => {
        setAnglers(data.anglers || []);
        setTopSpots(data.topSpots || []);
      })
      .catch((e) => {
        if ((e as Error).name !== 'AbortError') console.warn('Failed to fetch leaderboard:', e);
      })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Papan Peringkat</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Angler paling aktif di komunitas SpotFish!
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse h-16 bg-gray-100 dark:bg-gray-800 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-5 gap-6">
          {/* Anglers ranking */}
          <div className="md:col-span-3">
            <h2 className="font-bold text-lg mb-3 text-gray-900 dark:text-white">
              Top Anglers
            </h2>
            {anglers.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-500 dark:text-gray-400">
                Belum ada aktivitas. Jadilah yang pertama berkontribusi!
              </div>
            ) : (
              <div className="space-y-2">
                {anglers.map((a, i) => (
                  <Link
                    key={a.id}
                    href={`/users/${a.username}`}
                    className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 hover:border-blue-300 dark:hover:border-blue-500 transition-colors"
                  >
                    <RankBadge rank={i + 1} />
                    {a.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={a.avatar_url}
                        alt={a.username}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <span className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm shrink-0">
                        {a.username.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                        {a.username}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        {SPECIALIZATION_LABELS[a.specialization] || a.specialization}
                      </div>
                    </div>
                    <div className="flex gap-3 text-xs text-gray-500 dark:text-gray-400 shrink-0">
                      <span title="Spot">{a.spots_count} spot</span>
                      <span title="Ulasan">{a.reviews_count} ulasan</span>
                      <span title="Tangkapan">{a.total_fish} ikan</span>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-blue-600 dark:text-blue-400">{a.points}</div>
                      <div className="text-[10px] text-gray-400 uppercase">poin</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Top spots */}
          <div className="md:col-span-2">
            <h2 className="font-bold text-lg mb-3 text-gray-900 dark:text-white">
              Spot Rating Tertinggi
            </h2>
            {topSpots.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                Belum cukup ulasan untuk membuat peringkat.
              </div>
            ) : (
              <div className="space-y-2">
                {topSpots.map((s, i) => (
                  <Link
                    key={s.id}
                    href={`/spots/${s.id}`}
                    className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 hover:border-blue-300 dark:hover:border-blue-500 transition-colors"
                  >
                    <span className="w-6 text-center font-bold text-gray-400 dark:text-gray-500 text-sm shrink-0">
                      {i + 1}
                    </span>
                    {s.photos && s.photos.length > 0 ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={s.photos[0]}
                        alt={s.name}
                        className="w-10 h-10 rounded-lg object-cover shrink-0"
                      />
                    ) : (
                      <span className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                        </svg>
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                        {s.name}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        {SPOT_TYPE_LABELS[s.spot_type] || s.spot_type}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1 justify-end">
                        <svg className="w-3.5 h-3.5 text-yellow-500" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                        <span className="font-bold text-sm">{Number(s.rating_avg).toFixed(1)}</span>
                      </div>
                      <div className="text-[10px] text-gray-400">{s.review_count} ulasan</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* How points work */}
            <div className="mt-4 bg-blue-50 dark:bg-blue-500/10 rounded-xl p-4 text-sm text-blue-800 dark:text-blue-300">
              <div className="font-semibold mb-1">Cara kerja poin:</div>
              <ul className="space-y-0.5 text-xs">
                <li>Bagikan spot baru: +5 poin</li>
                <li>Tulis ulasan: +3 poin</li>
                <li>Catat tangkapan: +2 poin</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
