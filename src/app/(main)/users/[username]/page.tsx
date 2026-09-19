'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import SpotCard from '@/components/spots/SpotCard';
import StarRating from '@/components/reviews/StarRating';
import SpotTypeIcon from '@/components/ui/SpotTypeIcon';
import { SpotType } from '@/lib/types';

interface UserProfile {
  id: string;
  username: string;
  avatar_url?: string;
  bio?: string;
  specialization: string;
  spots_count: number;
  reviews_count: number;
  created_at: string;
}

interface UserSpot {
  id: string;
  name: string;
  description?: string;
  spot_type: string;
  lat: number;
  lng: number;
  rating_avg: number;
  review_count: number;
  photos: string[];
  facilities: string[];
  accessibility: string;
  created_at: string;
}

interface UserReview {
  id: string;
  rating: number;
  comment?: string;
  created_at: string;
  spot_id: string;
  spot_name: string;
  spot_type: string;
}

const SPECIALIZATION_LABELS: Record<string, string> = {
  laut: 'Mancing Laut',
  air_tawar: 'Mancing Air Tawar',
  campuran: 'Campuran',
  all: 'Semua',
};

export default function PublicProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [spots, setSpots] = useState<UserSpot[]>([]);
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'spots' | 'reviews'>('spots');

  useEffect(() => {
    const ctrl = new AbortController();
    if (username) fetchProfile(ctrl.signal);
    return () => ctrl.abort();
  }, [username]);

  async function fetchProfile(signal?: AbortSignal) {
    try {
      const res = await fetch(`/api/users/${username}`, { signal });
      if (!res.ok) throw new Error('User not found');
      const data = await res.json();
      setProfile(data.profile);
      setSpots(data.spots || []);
      setReviews(data.reviews || []);
    } catch (err) {
      setError('Pengguna tidak ditemukan');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-4 opacity-30">?</div>
        <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-200 mb-2">{error || 'Pengguna tidak ditemukan'}</h2>
        <Link href="/community" className="text-blue-600 dark:text-blue-400 hover:underline">
          Kembali ke komunitas
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Profile Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-white text-3xl font-bold shrink-0">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.username} className="w-20 h-20 rounded-full object-cover" />
            ) : (
              profile.username.charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{profile.username}</h1>
            {profile.bio && (
              <p className="text-gray-600 dark:text-gray-300 mt-1">{profile.bio}</p>
            )}
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
              <span>{SPECIALIZATION_LABELS[profile.specialization] || 'Semua'}</span>
              <span>Bergabung {new Date(profile.created_at).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{profile.spots_count}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Spot</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{profile.reviews_count}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Ulasan</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('spots')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'spots'
              ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Spot ({spots.length})
        </button>
        <button
          onClick={() => setActiveTab('reviews')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'reviews'
              ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Ulasan ({reviews.length})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'spots' ? (
        spots.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <p className="font-medium">{profile.username} belum membagikan spot</p>
            <Link href="/spots" className="inline-block mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline">
              Jelajahi spot lain →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {spots.map((spot) => (
              <SpotCard
                key={spot.id}
                spot={{
                  ...spot,
                  spot_type: spot.spot_type as SpotType,
                  accessibility: spot.accessibility as 'mudah' | 'sedang' | 'sulit' | 'hanya_perahu',
                  user_id: profile.id,
                  fish_species: [],
                  conditions: {},
                  is_verified: false,
                  favorites_count: 0,
                  updated_at: spot.created_at,
                  username: profile.username,
                  avatar_url: profile.avatar_url,
                }}
              />
            ))}
          </div>
        )
      ) : (
        reviews.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-30" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            <p className="font-medium">{profile.username} belum menulis ulasan</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => (
              <Link
                key={review.id}
                href={`/spots/${review.spot_id}`}
                className="block bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <SpotTypeIcon type={review.spot_type as any} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900 dark:text-white truncate">{review.spot_name}</h3>
                      <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                        {new Date(review.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <StarRating rating={review.rating} readonly size="sm" />
                    {review.comment && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">{review.comment}</p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )
      )}
    </div>
  );
}
