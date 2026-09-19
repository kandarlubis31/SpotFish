'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SPOT_TYPE_LABELS, SpotType } from '@/lib/types';
import SpotTypeIcon from '@/components/ui/SpotTypeIcon';
import { formatRating } from '@/lib/utils';

interface Activity {
  type: 'spot' | 'review';
  id: string;
  username: string;
  avatar_url?: string;
  spot_name: string;
  spot_type: string;
  spot_id: string;
  rating_avg?: number;
  review_count?: number;
  rating?: number;
  comment?: string;
  created_at: string;
}

interface LegitCheckSpot {
  id: string;
  name: string;
  spot_type: string;
  legit_count: number;
  reject_count: number;
  net_votes: number;
  confirmed: boolean;
  username?: string;
}

interface Stats {
  totalSpots: number;
  avgRating: number;
  totalReviews: number;
  totalConfirmed: number;
  spotTypes: { spot_type: string; count: string }[];
  ratingDistribution: { rating_bucket: number; count: string }[];
  topContributors: { username: string; avatar_url?: string; spot_count: string }[];
}

export default function CommunityPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [legitChecks, setLegitChecks] = useState<LegitCheckSpot[]>([]);
  const [legitThreshold, setLegitThreshold] = useState(3);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchData(ctrl.signal);
    return () => ctrl.abort();
  }, []);

  async function fetchData(signal?: AbortSignal) {
    try {
      const [statsRes, activityRes, legitRes] = await Promise.all([
        fetch('/api/stats', { signal }),
        fetch('/api/activity?limit=15', { signal }),
        fetch('/api/community/legit-checks?limit=20', { signal }),
      ]);
      const statsData = await statsRes.json();
      const activityData = await activityRes.json();
      let legitData: { confirmed?: LegitCheckSpot[]; pending?: LegitCheckSpot[]; threshold?: number } = {};
      if (legitRes.ok) legitData = await legitRes.json();
      setStats(statsData);
      setActivities(activityData.activities || []);
      setLegitChecks([...(legitData.pending || []), ...(legitData.confirmed || [])]);
      if (legitData.threshold) setLegitThreshold(legitData.threshold);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }

  const totalSpots = stats?.totalSpots || 0;
  const totalReviews = stats?.totalReviews || 0;
  const avgRating = stats?.avgRating || 0;
  const spotTypes = stats?.spotTypes || [];
  const ratingDist = stats?.ratingDistribution || [];
  const topContributors = stats?.topContributors || [];

  const maxRatingCount = Math.max(...ratingDist.map(r => Number(r.count)), 1);

  function timeAgo(dateStr: string): string {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diff = Math.floor((now - then) / 1000);
    if (diff < 60) return 'baru saja';
    if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}j lalu`;
    return `${Math.floor(diff / 86400)}h lalu`;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Komunitas SpotFish!</h1>
      <p className="text-gray-600 dark:text-gray-300 mb-8">Bersama membangun database spot mancing Indonesia</p>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-center hover:shadow-md transition-shadow">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalSpots}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Total Spot</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-center hover:shadow-md transition-shadow">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalReviews}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Total Ulasan</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-green-200 dark:border-green-500/30 p-6 text-center hover:shadow-md transition-shadow">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats?.totalConfirmed || 0}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Legit ✓ Komunitas</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-center hover:shadow-md transition-shadow">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{topContributors.length}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Kontributor</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-center hover:shadow-md transition-shadow">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{spotTypes.length}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Jenis Spot</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Activity Feed */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Activity */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="font-bold text-lg mb-4">Aktivitas Terbaru</h2>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="animate-pulse h-16 bg-gray-100 dark:bg-gray-800 rounded-lg" />
                ))}
              </div>
            ) : activities.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">Belum ada aktivitas</p>
            ) : (
              <div className="space-y-3">
                {activities.map((activity) => (
                  <div key={`${activity.type}-${activity.id}`} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-500/20 rounded-full flex items-center justify-center text-sm font-bold text-blue-600 dark:text-blue-400 shrink-0">
                      {activity.avatar_url ? (
                        <img src={activity.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        activity.username?.charAt(0).toUpperCase() || '?'
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 dark:text-gray-200">
                        <span className="font-medium">{activity.username}</span>
                        {activity.type === 'spot' ? (
                          <> menambahkan spot </>
                        ) : (
                          <> memberi ulasan di </>
                        )}
                        <Link href={`/spots/${activity.spot_id}`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
                          {activity.spot_name}
                        </Link>
                      </p>
                      {activity.type === 'review' && activity.rating && (
                        <div className="flex items-center gap-1 mt-1">
                          <span className="flex items-center gap-0.5">{Array.from({ length: activity.rating }).map((_, i) => (
                            <svg key={i} className="w-3 h-3 text-yellow-500 dark:text-yellow-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                          ))}</span>
                          {activity.comment && (
                            <span className="text-xs text-gray-400 dark:text-gray-500 truncate ml-2">
                              &ldquo;{activity.comment}&rdquo;
                            </span>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{timeAgo(activity.created_at)}</p>
                    </div>
                    <Link href={`/spots/${activity.spot_id}`} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 shrink-0">
                      →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Legit Check — community confirmations */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-bold text-lg">Cek Legit</h2>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                badge legit: {legitThreshold} suara net
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Hasil verifikasi komunitas — apakah spot ini beneran ada?
            </p>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse h-14 bg-gray-100 dark:bg-gray-800 rounded-lg" />
                ))}
              </div>
            ) : legitChecks.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4 text-sm">
                Belum ada konfirmasi. Buka detail spot untuk kasih vote Legit / Belum Ketemu.
              </p>
            ) : (
              <div className="space-y-2">
                {legitChecks.map((check) => {
                  const total = check.legit_count + check.reject_count;
                  const pct = Math.max(
                    0,
                    Math.min(100, (check.net_votes / legitThreshold) * 100)
                  );
                  return (
                    <Link
                      key={check.id}
                      href={`/spots/${check.id}`}
                      className={`block p-3 rounded-lg transition-colors ${
                        check.confirmed
                          ? 'bg-green-50 dark:bg-green-500/10 hover:bg-green-100 dark:hover:bg-green-500/20'
                          : 'bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <SpotTypeIcon type={check.spot_type as SpotType} size="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm truncate">{check.name}</span>
                            {check.confirmed && (
                              <span className="inline-flex items-center gap-0.5 bg-green-600 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                                ✓ Legit
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            👍 {check.legit_count} legit · 👎 {check.reject_count} belum ketemu
                            {!check.confirmed && (
                              <span className="ml-1 text-blue-600 dark:text-blue-400 font-medium">
                                · butuh {Math.max(0, legitThreshold - check.net_votes)} lagi
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {!check.confirmed && (
                        <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                          <div
                            className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${total > 0 ? pct : 0}%` }}
                          />
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Spot Type Distribution */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="font-bold text-lg mb-4">Distribusi Jenis Spot</h2>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse h-8 bg-gray-100 dark:bg-gray-800 rounded" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {spotTypes.map((st) => {
                  const count = Number(st.count);
                  const percentage = totalSpots > 0 ? (count / totalSpots) * 100 : 0;
                  const type = st.spot_type as SpotType;
                  return (
                    <div key={type}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium flex items-center gap-1">
                          <SpotTypeIcon type={type} size="sm" />
                          {SPOT_TYPE_LABELS[type] || type}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">{count} spot</span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Rating Distribution */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="font-bold text-lg mb-4">Distribusi Rating</h2>
            {[5, 4, 3, 2, 1].map((stars) => {
              const bucket = ratingDist.find(r => r.rating_bucket === stars);
              const count = bucket ? Number(bucket.count) : 0;
              const pct = maxRatingCount > 0 ? (count / maxRatingCount) * 100 : 0;
              return (
                <div key={stars} className="flex items-center gap-2 mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-300 w-4 text-right">{stars}</span>
                  <svg className="w-3.5 h-3.5 text-yellow-400 dark:text-yellow-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-3">
                    <div
                      className="bg-yellow-400 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 w-8 text-right">{count}</span>
                </div>
              );
            })}
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 text-center">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatRating(avgRating)}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">rata-rata</span>
            </div>
          </div>

          {/* Top Contributors */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="font-bold text-lg mb-4">Top Kontributor</h2>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse h-12 bg-gray-100 dark:bg-gray-800 rounded-lg" />
                ))}
              </div>
            ) : topContributors.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">Belum ada kontributor</p>
            ) : (
              <div className="space-y-2">
                {topContributors.map((contributor, index) => (
                  <Link
                    href={`/users/${contributor.username}`}
                    key={contributor.username}
                    className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <span className={`text-sm font-bold w-6 ${index === 0 ? 'text-yellow-500 dark:text-yellow-400' : index === 1 ? 'text-gray-400 dark:text-gray-500' : index === 2 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400 dark:text-gray-500'}`}>
                      {index === 0 ? '1' : index === 1 ? '2' : index === 2 ? '3' : `#${index + 1}`}
                    </span>
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-500/20 rounded-full flex items-center justify-center text-sm font-bold text-blue-600 dark:text-blue-400">
                      {contributor.avatar_url ? (
                        <img src={contributor.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        contributor.username.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm hover:text-blue-600 dark:hover:text-blue-400">{contributor.username}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{contributor.spot_count} spot</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
