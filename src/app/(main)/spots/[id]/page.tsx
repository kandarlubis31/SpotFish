'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Spot, Review, FishSpecies, SPOT_TYPE_LABELS } from '@/lib/types';
import SpotTypeIcon from '@/components/ui/SpotTypeIcon';
import { formatRating } from '@/lib/utils';
import StarRating from '@/components/reviews/StarRating';
import SpotPhotoManager from '@/components/spots/SpotPhotoManager';
import ShareMenu from '@/components/ui/ShareMenu';
import CatchLog from '@/components/spots/CatchLog';
import WeatherCard from '@/components/ui/WeatherCard';
import SpotInfoGrid from '@/components/spots/SpotInfoGrid';
import ReviewSection from '@/components/spots/ReviewSection';
import { useToast } from '@/components/ui/Toast';

const MapView = dynamic(() => import('@/components/map/MapView'), {
  ssr: false,
  loading: () => (
    <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center">
      <span className="text-gray-400 dark:text-gray-500">Memuat peta...</span>
    </div>
  ),
});

export default function SpotDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [spot, setSpot] = useState<Spot | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [fishSpecies, setFishSpecies] = useState<FishSpecies[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Favorites & ownership state
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [confirming, setConfirming] = useState<0 | 1 | -1>(0);

  const { toast } = useToast();

  useEffect(() => {
    const ctrl = new AbortController();
    if (params.id) {
      fetchSpot(params.id as string);
      checkFavorite(params.id as string);
      fetchFishSpecies(ctrl.signal);
    }
    return () => ctrl.abort();
  }, [params.id]);



  async function fetchFishSpecies(signal?: AbortSignal) {
    try {
      const res = await fetch('/api/fish', { signal });
      const data = await res.json();
      setFishSpecies(data.fish || []);
    } catch (e) { console.warn('Failed to fetch fish species:', e); }
  }

  async function checkFavorite(spotId: string) {
    try {
      const res = await fetch('/api/favorites');
      const data = await res.json();
      setIsFavorited(data.favorites?.some((f: { spot_id: string }) => f.spot_id === spotId) || false);
    } catch (e) { console.warn('Failed to check favorite:', e); }
  }

  async function toggleFavorite() {
    if (!spot) return;
    // Optimistic: flip immediately, rollback on failure
    const prev = isFavorited;
    setIsFavorited(!prev);
    try {
      const res = await fetch(`/api/favorites/${spot.id}`, { method: 'POST' });
      if (res.status === 401) {
        setIsFavorited(prev);
        router.push(`/login?redirect=/spots/${spot.id}`);
        return;
      }
      if (!res.ok) {
        setIsFavorited(prev);
        return;
      }
      const data = await res.json();
      setIsFavorited(data.favorited);
    } catch (e) {
      setIsFavorited(prev);
      console.warn('Failed to toggle favorite:', e);
    }
  }

  async function fetchSpot(id: string) {
    try {
      // Parallel fetch: spot detail + auth check
      const [spotRes, meRes] = await Promise.all([
        fetch(`/api/spots/${id}`),
        fetch('/api/auth/me'),
      ]);

      if (!spotRes.ok) throw new Error('Spot not found');
      const data = await spotRes.json();
      setSpot({ ...data.spot, tags: data.tags || [] });
      setReviews(data.reviews || []);

      // Check ownership + admin
      if (meRes.ok) {
        const meData = await meRes.json();
        if (meData.user) {
          setIsLoggedIn(true);
          if (data.spot?.user_id === meData.user.id) setIsOwner(true);
          if (meData.isAdmin) setIsAdminUser(true);
        }
      }
    } catch (err) {
      setError('Spot tidak ditemukan');
    } finally {
      setLoading(false);
    }
  }

  function handleRequireAuth() {
    router.push(`/login?redirect=/spots/${params.id}`);
  }

  async function handleConfirm(value: 1 | -1) {
    if (!spot) return;
    if (!isLoggedIn) {
      router.push(`/login?redirect=/spots/${spot.id}`);
      return;
    }
    setConfirming(value);
    try {
      const res = await fetch(`/api/spots/${spot.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value }),
      });
      if (res.ok) {
        const data = await res.json();
        setSpot({
          ...spot,
          legit_count: data.legit_count,
          reject_count: data.reject_count,
          my_vote: data.my_vote,
        });
      } else if (res.status === 401) {
        router.push(`/login?redirect=/spots/${spot.id}`);
      }
    } catch (err) {
      console.warn('Failed to confirm spot:', err);
    } finally {
      setConfirming(0);
    }
  }

  async function handleVerify() {
    if (!spot) return;
    // Optimistic: flip badge immediately, rollback on failure
    const prev = spot.is_verified;
    setSpot({ ...spot, is_verified: !prev });
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spot_id: spot.id, verified: !prev }),
      });
      if (!res.ok) {
        setSpot({ ...spot, is_verified: prev });
        return;
      }
      const data = await res.json();
      setSpot({ ...spot, is_verified: data.is_verified });
    } catch (err) {
      setSpot({ ...spot, is_verified: prev });
      console.warn('Failed to verify spot:', err);
    }
  }

  async function handleDelete() {
    if (!spot) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/spots/${spot.id}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/spots');
      } else {
        const data = await res.json();
        toast(data.error || 'Gagal menghapus spot', 'error');
      }
    } catch (err) {
      console.warn('Failed to delete spot:', err);
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
        </div>
      </div>
    );
  }

  if (error || !spot) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-4 opacity-40">?</div>
        <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-200 mb-2">{error}</h2>
        <Link href="/spots" className="text-blue-600 dark:text-blue-400 hover:underline">
          ← Kembali ke daftar spot
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        <Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400">Peta</Link>
        <span className="mx-2">›</span>
        <Link href="/spots" className="hover:text-blue-600 dark:hover:text-blue-400">Spot</Link>
        <span className="mx-2">›</span>
        <span className="text-gray-700 dark:text-gray-200">{spot.name}</span>
      </div>

      {/* Hero photo — full-width with overlay badges */}
      {spot.photos && spot.photos.length > 0 && (
        <div className="relative -mx-4 md:mx-0 mb-6 rounded-b-xl md:rounded-xl overflow-hidden md:border md:border-gray-200 dark:md:border-gray-700 h-56 md:h-72">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={spot.photos[0]}
            alt={spot.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          {spot.photos.length > 1 && (
            <span className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5 backdrop-blur-sm">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
              {spot.photos.length} foto
            </span>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <SpotTypeIcon type={spot.spot_type} size="lg" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{spot.name}</h1>
            {spot.is_verified && (
              <span className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold px-2 py-1 rounded-full">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Terverifikasi
              </span>
            )}
            {(spot.legit_count ?? 0) - (spot.reject_count ?? 0) >= 3 && (
              <span className="inline-flex items-center gap-1 bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-semibold px-2 py-1 rounded-full">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21h19v-2H2v2zM20 8l-8.5-5L3 8l1 2 1-.6V15h2v-6l4-2.35L15 9v6h2V9.4l1 .6 1-2z"/></svg>
                Dikonfirmasi Komunitas
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-gray-500 dark:text-gray-400">{SPOT_TYPE_LABELS[spot.spot_type]}</span>
            <span className="flex items-center gap-1">
              <StarRating rating={Math.round(Number(spot.rating_avg || 0))} readonly size="sm" />
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {formatRating(spot.rating_avg)} ({spot.review_count} ulasan)
              </span>
            </span>
          </div>
          {spot.tags && spot.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {spot.tags.map((tag: any) => (
                <span key={tag.id} className="inline-block bg-green-50 dark:bg-green-500/20 text-green-700 dark:text-green-400 text-xs px-2 py-0.5 rounded-full">
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>
        {/* Desktop action buttons */}
        <div className="hidden md:flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShareMenuOpen(!shareMenuOpen)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
            >
              Bagikan
            </button>
            {shareMenuOpen && (
              <ShareMenu
                spot={spot}
                onClose={() => setShareMenuOpen(false)}
              />
            )}
          </div>
          <button
            onClick={toggleFavorite}
            disabled={favoriteLoading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              isFavorited
                ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 hover:bg-red-100 dark:hover:bg-red-500/20'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {favoriteLoading ? (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="opacity-25"/><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            ) : isFavorited ? (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
            )}
            {isFavorited ? 'Tersimpan' : 'Simpan'}
          </button>
          {isOwner && (
            <>
              <Link
                href={`/spots/${spot.id}/edit`}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
              >
                Edit
              </Link>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 hover:bg-red-100 dark:hover:bg-red-500/20 transition-all"
              >
                Hapus
              </button>
            </>
          )}
          {isAdminUser && (
            <button
              onClick={handleVerify}
              disabled={verifying}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                spot.is_verified
                  ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30 hover:bg-blue-100 dark:hover:bg-blue-500/20'
                  : 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-500/30 hover:bg-green-100 dark:hover:bg-green-500/20'
              }`}
            >
              {verifying ? '...' : spot.is_verified ? 'Verifikasi ✓' : 'Verifikasi'}
            </button>
          )}
        </div>
      </div>

      {/* Mobile sticky action bar */}
      <div className="md:hidden sticky top-16 z-40 -mx-4 px-4 py-2.5 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-y border-gray-200 dark:border-gray-700 flex items-center gap-2 mb-6">
        <button
          onClick={toggleFavorite}
          className={`press-scale flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
            isFavorited
              ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
          }`}
        >
          {isFavorited ? (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
          )}
          {isFavorited ? 'Tersimpan' : 'Simpan'}
        </button>
        <div className="relative flex-1">
          <button
            onClick={() => setShareMenuOpen(!shareMenuOpen)}
            className="press-scale w-full flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            Bagikan
          </button>
          {shareMenuOpen && (
            <ShareMenu
              spot={spot}
              onClose={() => setShareMenuOpen(false)}
            />
          )}
        </div>
        {isOwner && (
          <Link
            href={`/spots/${spot.id}/edit`}
            className="press-scale flex items-center justify-center px-3.5 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
          >
            Edit
          </Link>
        )}
      </div>

      {/* Legit Check — community confirmation */}
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="font-bold text-sm text-gray-900 dark:text-white">
              Cek Legit — apakah spot ini beneran ada?
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {spot.my_vote === 1
                ? 'Kamu konfirmasi spot ini legit ✓'
                : spot.my_vote === -1
                  ? 'Kamu lapor belum ketemu di spot ini'
                  : isOwner
                    ? 'Ini spot-mu — konfirmasi dari pemancing lain'
                    : 'Bantu komunitas: pernah mancing di sini?'}
            </p>
          </div>
          {!isOwner && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleConfirm(1)}
                disabled={confirming !== 0}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all border ${
                  spot.my_vote === 1
                    ? 'bg-green-600 text-white border-green-600'
                    : 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-500/30 hover:bg-green-100 dark:hover:bg-green-500/20'
                } disabled:opacity-50`}
              >
                {confirming === 1 ? (
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="opacity-25"/><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                )}
                Legit
                <span className={`text-xs font-medium px-1.5 rounded-full ${spot.my_vote === 1 ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-700'}`}>
                  {spot.legit_count ?? 0}
                </span>
              </button>
              <button
                onClick={() => handleConfirm(-1)}
                disabled={confirming !== 0}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all border ${
                  spot.my_vote === -1
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30 hover:bg-red-100 dark:hover:bg-red-500/20'
                } disabled:opacity-50`}
              >
                {confirming === -1 ? (
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="opacity-25"/><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                )}
                Belum Ketemu
                <span className={`text-xs font-medium px-1.5 rounded-full ${spot.my_vote === -1 ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-700'}`}>
                  {spot.reject_count ?? 0}
                </span>
              </button>
            </div>
          )}
        </div>
        {(spot.reject_count ?? 0) > (spot.legit_count ?? 0) &&
          (spot.reject_count ?? 0) + (spot.legit_count ?? 0) >= 2 && (
            <p className="mt-3 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg px-3 py-2">
              Beberapa pemancing melaporkan belum menemukan spot ini. Info mungkin belum akurat.
            </p>
          )}
        {!isLoggedIn && !isOwner && (
          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
            Login dulu untuk ikut konfirmasi.
          </p>
        )}
      </div>

      {/* Map */}
      <div className="mb-6 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
        <MapView
          spots={[spot]}
          center={[spot.lat, spot.lng]}
          zoom={14}
          height="300px"
        />
      </div>

      {/* Photos */}
      <div className="mb-6">
        <SpotPhotoManager
          spotId={spot.id}
          photos={spot.photos || []}
          isOwner={isOwner}
          onPhotosUpdate={(newPhotos) => setSpot({ ...spot, photos: newPhotos })}
        />
      </div>

      {/* Info Grid */}
      <SpotInfoGrid spot={spot} fishSpecies={fishSpecies} />

      {/* Weather */}
      <div className="mb-6">
        <WeatherCard lat={spot.lat} lng={spot.lng} />
      </div>

      {/* Catch Log */}
      <div className="mb-6">
        <CatchLog spotId={spot.id} />
      </div>

      {/* Reviews Section */}
      <ReviewSection
        spotId={spot.id}
        reviews={reviews}
        onReviewSubmitted={() => fetchSpot(spot.id)}
        requireAuth={handleRequireAuth}
      />

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Hapus Spot?</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Tindakan ini tidak dapat dibatalkan. Spot <strong>{spot?.name}</strong> akan dihapus permanen beserta semua ulasan dan foto.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="press-scale px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Menghapus...' : 'Hapus Permanen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
