'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Spot } from '@/lib/types';
import SpotCard from '@/components/spots/SpotCard';

export default function FavoritesPage() {
  const router = useRouter();
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch('/api/auth/me', { signal: ctrl.signal })
      .then(res => res.json())
      .then(data => {
        if (!data.user) {
          router.push('/login?redirect=/favorites');
        } else {
          setAuthChecked(true);
          fetchFavorites();
        }
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, []);

  async function fetchFavorites() {
    try {
      // Single query — server joins favorites + spots
      const res = await fetch('/api/favorites?include=spots');
      const data = await res.json();

      if (data.favorites) {
        const spotsData = data.favorites.map((f: any) => ({
          id: f.spot_id,
          name: f.name,
          description: f.description,
          spot_type: f.spot_type,
          lat: Number(f.lat),
          lng: Number(f.lng),
          rating_avg: f.rating_avg,
          review_count: f.review_count,
          photos: f.photos || [],
          facilities: f.facilities || [],
          accessibility: f.accessibility,
          best_times: f.best_times,
          fish_species: f.fish_species || [],
          username: f.username,
          avatar_url: f.avatar_url,
          user_id: '',
          conditions: {},
          is_verified: false,
          favorites_count: 0,
          created_at: f.created_at,
          updated_at: f.created_at,
        })) as Spot[];
        setSpots(spotsData);
      }
    } catch (error) {
      console.error('Failed to fetch favorites:', error);
    } finally {
      setLoading(false);
    }
  }

  if (!authChecked) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Spot Favorit</h1>
      <p className="text-gray-600 dark:text-gray-300 mb-8">Spot mancing yang sudah kamu simpan</p>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-gray-100 dark:bg-gray-800 rounded-xl h-48" />
          ))}
        </div>
      ) : spots.length === 0 ? (
        <div className="text-center py-16">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-2">Belum ada spot favorit</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">Klik simpan di halaman spot untuk menambahkan ke favorit</p>
          <Link
            href="/spots"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Jelajahi Spot
          </Link>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{spots.length} spot tersimpan</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {spots.map((spot) => (
              <SpotCard key={spot.id} spot={spot} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
