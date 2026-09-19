'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { SpotType, FishSpecies, Tag, SPOT_TYPE_LABELS } from '@/lib/types';
import SpotTypeIcon from '@/components/ui/SpotTypeIcon';

const MapView = dynamic(() => import('@/components/map/MapView'), {
  ssr: false,
  loading: () => (
    <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center">
      <span className="text-gray-400 dark:text-gray-500">Memuat peta...</span>
    </div>
  ),
});

const FACILITY_OPTIONS = [
  { value: 'parkir', label: 'Parkir' },
  { value: 'toilet', label: 'Toilet' },
  { value: 'warung', label: 'Warung' },
  { value: 'tempat_teduh', label: 'Tempat Teduh' },
  { value: 'perahu_sewa', label: 'Perahu Sewa' },
];

const ACCESSIBILITY_OPTIONS = [
  { value: 'mudah', label: 'Mudah' },
  { value: 'sedang', label: 'Sedang' },
  { value: 'sulit', label: 'Sulit' },
  { value: 'hanya_perahu', label: 'Hanya Perahu' },
];

export default function EditSpotPage() {
  return (
    <Suspense fallback={<div className="max-w-4xl mx-auto px-4 py-8"><p className="text-gray-400 dark:text-gray-500">Memuat...</p></div>}>
      <EditSpotForm />
    </Suspense>
  );
}

function EditSpotForm() {
  const router = useRouter();
  const params = useParams();
  const spotId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [spotType, setSpotType] = useState<SpotType>('laut');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [bestTimes, setBestTimes] = useState('');
  const [facilities, setFacilities] = useState<string[]>([]);
  const [accessibility, setAccessibility] = useState('sedang');
  const [selectedFish, setSelectedFish] = useState<string[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const [fishSpecies, setFishSpecies] = useState<FishSpecies[]>([]);

  const optionalDetailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      fetch(`/api/spots/${spotId}`).then(r => r.json()),
      fetch('/api/fish').then(r => r.json()),
      fetch('/api/tags').then(r => r.json()),
    ]).then(([meData, spotData, fishData, tagsData]) => {
      if (!meData.user) {
        router.push(`/login?redirect=/spots/${spotId}/edit`);
        return;
      }

      const spot = spotData.spot;
      if (!spot) {
        setError('Spot tidak ditemukan');
        setLoading(false);
        return;
      }

      if (spot.user_id !== meData.user.id && !meData.isAdmin) {
        setError('Kamu bukan pemilik spot ini');
        setLoading(false);
        return;
      }

      // Pre-fill form
      setName(spot.name || '');
      setDescription(spot.description || '');
      setSpotType(spot.spot_type || 'laut');
      setLat(spot.lat);
      setLng(spot.lng);
      setBestTimes(spot.best_times || '');
      setFacilities(spot.facilities || []);
      setAccessibility(spot.accessibility || 'sedang');
      setSelectedFish(spot.fish_species || []);
      setFishSpecies(fishData.fish || []);
      setSelectedTags((spot.tags || []).map((t: any) => t.id || t.tag_id || ''));
      setTags(tagsData.tags || []);
      const hasOptional =
        !!spot.description ||
        !!spot.best_times ||
        (Array.isArray(spot.facilities) && spot.facilities.length > 0) ||
        (Array.isArray(spot.fish_species) && spot.fish_species.length > 0) ||
        (spot.tags || []).length > 0;
      if (hasOptional && optionalDetailsRef.current) {
        optionalDetailsRef.current.open = true;
      }
      setLoading(false);
    }).catch(() => {
      setError('Gagal memuat data spot');
      setLoading(false);
    });
  }, [spotId, router]);

  function handleMapClick(clickLat: number, clickLng: number) {
    setLat(clickLat);
    setLng(clickLng);
  }

  function toggleFacility(facility: string) {
    setFacilities((prev) =>
      prev.includes(facility)
        ? prev.filter((f) => f !== facility)
        : [...prev, facility]
    );
  }

  function toggleFish(fishId: string) {
    setSelectedFish((prev) =>
      prev.includes(fishId)
        ? prev.filter((f) => f !== fishId)
        : [...prev, fishId]
    );
  }

  function toggleTag(tagId: string) {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((t) => t !== tagId)
        : [...prev, tagId]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Nama spot harus diisi');
      return;
    }
    if (lat === null || lng === null) {
      setError('Klik di peta untuk memilih lokasi');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/spots/${spotId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          spot_type: spotType,
          lat,
          lng,
          fish_species: selectedFish,
          best_times: bestTimes.trim() || undefined,
          facilities,
          accessibility,
          tags: selectedTags,
        }),
      });

      if (res.status === 401) {
        router.push(`/login?redirect=/spots/${spotId}/edit`);
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal menyimpan perubahan');
      }

      router.push(`/spots/${spotId}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error && !name) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-4 opacity-30">!</div>
        <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-200 mb-2">{error}</h2>
        <Link href={`/spots/${spotId}`} className="text-blue-600 dark:text-blue-400 hover:underline">
          Kembali ke spot
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
        <Link href={`/spots/${spotId}`} className="hover:text-blue-600 dark:hover:text-blue-400">{name}</Link>
        <span className="mx-2">›</span>
        <span className="text-gray-700 dark:text-gray-200">Edit</span>
      </div>

      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Edit Spot</h1>
      <p className="text-gray-600 dark:text-gray-300 mb-8">
        Perbarui informasi spot mancing
      </p>

      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* ============================================
            WAJIB
            ============================================ */}
        <section className="space-y-5 mb-6">
          {/* Map Picker */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
              1. Lokasi di Peta *
            </label>
            <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
              <MapView
                center={lat && lng ? [lat, lng] : [-6.2088, 106.8456]}
                zoom={lat && lng ? 14 : 10}
                onMapClick={handleMapClick}
                height="350px"
              />
            </div>
            {lat && lng && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                {lat.toFixed(6)}, {lng.toFixed(6)} — klik peta untuk ubah lokasi
              </p>
            )}
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">
              2. Nama Spot *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.substring(0, 100))}
              placeholder="Contoh: Pantai Kuta, Spot Favorit"
              maxLength={100}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              required
            />
          </div>

          {/* Spot Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
              3. Jenis Spot *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {Object.entries(SPOT_TYPE_LABELS).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSpotType(value as SpotType)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    spotType === value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <SpotTypeIcon type={value as SpotType} size="sm" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================
            OPSIONAL — dilipat biar ringkas
            ============================================ */}
        <details
          ref={optionalDetailsRef}
          className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl mb-6 overflow-hidden"
        >
          <summary className="cursor-pointer select-none list-none px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
            <span className="font-semibold text-sm text-gray-700 dark:text-gray-200">
              Detail opsional
              <span className="ml-2 font-normal text-xs text-gray-400 dark:text-gray-500">
                (deskripsi, fasilitas, ikan, tag)
              </span>
            </span>
            <span className="text-gray-400 group-open:rotate-180 transition-transform">▾</span>
          </summary>

          <div className="p-4 border-t border-gray-100 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">
                  Deskripsi
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value.substring(0, 2000))}
                  placeholder="Ceritakan tentang spot ini..."
                  maxLength={2000}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                  rows={3}
                />
                <div className="text-xs text-gray-400 dark:text-gray-500 text-right mt-1">
                  {description.length}/2000
                </div>
              </div>

              {/* Best Times */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">
                  Waktu Terbaik
                </label>
                <input
                  type="text"
                  value={bestTimes}
                  onChange={(e) => setBestTimes(e.target.value.substring(0, 200))}
                  placeholder="Contoh: Pagi (05:00-09:00)"
                  maxLength={200}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              {/* Facilities */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  Fasilitas
                </label>
                <div className="flex flex-wrap gap-2">
                  {FACILITY_OPTIONS.map((f) => (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => toggleFacility(f.value)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        facilities.includes(f.value)
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Accessibility */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  Aksesibilitas
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {ACCESSIBILITY_OPTIONS.map((a) => (
                    <button
                      key={a.value}
                      type="button"
                      onClick={() => setAccessibility(a.value)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        accessibility === a.value
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {/* Fish Species */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  Jenis Ikan yang Ada
                </label>
                <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                  <div className="flex flex-wrap gap-2">
                    {fishSpecies.map((fish) => (
                      <button
                        key={fish.id}
                        type="button"
                        onClick={() => toggleFish(fish.id)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          selectedFish.includes(fish.id)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {fish.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  Tag
                </label>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        selectedTags.includes(tag.id)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </details>

        {/* Submit — sticky di mobile */}
        <div className="sticky bottom-0 z-20 -mx-4 px-4 py-3 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700 flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting || !lat || !lng}
            className="flex-1 sm:flex-none bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
          <Link
            href={`/spots/${spotId}`}
            className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Batal
          </Link>
        </div>
      </form>
    </div>
  );
}
