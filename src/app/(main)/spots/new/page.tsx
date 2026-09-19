'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { SpotType, FishSpecies, Tag, SPOT_TYPE_LABELS } from '@/lib/types';
import SpotTypeIcon from '@/components/ui/SpotTypeIcon';
import PhotoUpload from '@/components/ui/PhotoUpload';

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

const DRAFT_KEY = 'spotfish-spot-draft';

interface SpotDraft {
  description?: string;
  spotType?: SpotType;
  lat?: number | null;
  lng?: number | null;
  bestTimes?: string;
  facilities?: string[];
  accessibility?: string;
  selectedFish?: string[];
  photos?: string[];
  selectedTags?: string[];
}

export default function NewSpotPage() {
  return (
    <Suspense fallback={<div className="max-w-4xl mx-auto px-4 py-8"><p className="text-gray-400 dark:text-gray-500">Memuat...</p></div>}>
      <NewSpotForm />
    </Suspense>
  );
}

function NewSpotForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetLat = searchParams.get('lat');
  const presetLng = searchParams.get('lng');
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
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
  const [photos, setPhotos] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Fish species + tags
  const [fishSpecies, setFishSpecies] = useState<FishSpecies[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  // Restore draft (before preset so URL params win), then autosave
  const restoredRef = useRef(false);
  const optionalDetailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d: SpotDraft = JSON.parse(raw);
        if (d.description) setDescription(d.description);
        if (d.spotType) setSpotType(d.spotType);
        if (typeof d.lat === 'number' && typeof d.lng === 'number') {
          setLat(d.lat);
          setLng(d.lng);
        }
        if (d.bestTimes) setBestTimes(d.bestTimes);
        if (Array.isArray(d.facilities)) setFacilities(d.facilities);
        if (d.accessibility) setAccessibility(d.accessibility);
        if (Array.isArray(d.selectedFish)) setSelectedFish(d.selectedFish);
        if (Array.isArray(d.photos)) setPhotos(d.photos);
        if (Array.isArray(d.selectedTags)) setSelectedTags(d.selectedTags);
        const hasOptional =
          !!d.description ||
          !!d.bestTimes ||
          (Array.isArray(d.facilities) && d.facilities.length > 0) ||
          (Array.isArray(d.selectedFish) && d.selectedFish.length > 0) ||
          (Array.isArray(d.selectedTags) && d.selectedTags.length > 0) ||
          (Array.isArray(d.photos) && d.photos.length > 0);
        if (hasOptional && optionalDetailsRef.current) {
          optionalDetailsRef.current.open = true;
        }
      }
    } catch {}
    restoredRef.current = true;
  }, []);

  // Preset coordinates from query params (from linger detector / homepage)
  useEffect(() => {
    if (presetLat && presetLng) {
      setLat(parseFloat(presetLat));
      setLng(parseFloat(presetLng));
    }
  }, [presetLat, presetLng]);

  // Autosave draft
  useEffect(() => {
    if (!restoredRef.current) return;
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          description,
          spotType,
          lat,
          lng,
          bestTimes,
          facilities,
          accessibility,
          selectedFish,
          photos,
          selectedTags,
        })
      );
    } catch {}
  }, [
    description,
    spotType,
    lat,
    lng,
    bestTimes,
    facilities,
    accessibility,
    selectedFish,
    photos,
    selectedTags,
  ]);

  useEffect(() => {
    // Check auth first
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (!data.user) {
          router.push('/login?redirect=/spots/new');
        }
      });

    fetchFish();
  }, [router]);

  async function fetchFish() {
    const [fishRes, tagsRes] = await Promise.all([
      fetch('/api/fish'),
      fetch('/api/tags'),
    ]);
    const fishData = await fishRes.json();
    const tagsData = await tagsRes.json();
    setFishSpecies(fishData.fish || []);
    setTags(tagsData.tags || []);
  }

  function handleMapClick(clickLat: number, clickLng: number) {
    setLat(clickLat);
    setLng(clickLng);
  }

  function useMyLocation() {
    if (!('geolocation' in navigator) || locating) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setLocating(false);
      },
      () => {
        setError('Gagal mengambil lokasi GPS. Klik manual di peta ya.');
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
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
      const res = await fetch('/api/spots', {
        method: 'POST',
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
          photos,
          tags: selectedTags,
        }),
      });

      if (res.status === 401) {
        router.push('/login?redirect=/spots/new');
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal menyimpan spot');
      }

      const data = await res.json();
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {}
      router.push(`/spots/${data.spot.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const missingLocation = !lat || !lng;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-28 md:pb-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Tambah Spot Baru</h1>
      <p className="text-gray-600 dark:text-gray-300 mb-8">
        Cukup klik lokasi di peta + kasih nama — simpan! Detail lain bisa menyusul.
      </p>

      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* ============================================
            WAJIB — cukup bagian ini untuk membuat spot
            ============================================ */}
        <section className="space-y-5 mb-6">
          {/* Map Picker */}
          <div>
            <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                1. Pilih Lokasi *
              </label>
              <button
                type="button"
                onClick={useMyLocation}
                disabled={locating}
                className="px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors disabled:opacity-50"
              >
                {locating ? 'Mencari...' : 'Pakai Lokasiku'}
              </button>
            </div>
            <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
              <MapView
                center={lat && lng ? [lat, lng] : [-6.2088, 106.8456]}
                zoom={lat && lng ? 14 : 10}
                onMapClick={handleMapClick}
                height="350px"
              />
            </div>
            <p className={`text-sm mt-2 ${lat && lng ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
              {lat && lng
                ? `✓ Lokasi dipilih: ${lat.toFixed(6)}, ${lng.toFixed(6)}`
                : 'Belum dipilih — klik titik spot di peta atas'}
            </p>
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
            OPSIONAL — dilipat biar form tetap singkat
            ============================================ */}
        <details
          ref={optionalDetailsRef}
          className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl mb-6 overflow-hidden"
        >
          <summary className="cursor-pointer select-none list-none px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
            <span className="font-semibold text-sm text-gray-700 dark:text-gray-200">
              Detail opsional — biar makin lengkap
              <span className="ml-2 font-normal text-xs text-gray-400 dark:text-gray-500">
                (deskripsi, ikan, foto, dll)
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
                  {fishSpecies.length === 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-6 w-20 bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse" />
                      ))}
                    </div>
                  ) : (
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
                  )}
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  Tag
                </label>
                <div className="flex flex-wrap gap-2">
                  {tags.length === 0 ? (
                    [1, 2, 3].map((i) => (
                      <div key={i} className="h-6 w-16 bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse" />
                    ))
                  ) : tags.map((tag) => (
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

              {/* Photo Upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  Foto Spot
                </label>
                <PhotoUpload
                  onUpload={(url) => setPhotos((prev) => [...prev, url])}
                  onRemove={(url) => setPhotos((prev) => prev.filter((p) => p !== url))}
                  existingPhotos={photos}
                  maxPhotos={5}
                />
              </div>
            </div>
          </div>
        </details>

        {/* Submit — sticky di mobile biar selalu terlihat */}
        <div className="sticky bottom-0 z-20 -mx-4 px-4 py-3 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700 flex items-center gap-3">
          <div className="flex-1 min-w-0 hidden sm:block">
            {missingLocation && (
              <p className="text-xs text-amber-600 dark:text-amber-400 truncate">
                Klik peta atau pakai GPS untuk memilih lokasi dulu
              </p>
            )}
            {!missingLocation && !name.trim() && (
              <p className="text-xs text-amber-600 dark:text-amber-400 truncate">
                Isi nama spot untuk bisa simpan
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={submitting || !lat || !lng}
            className="press-scale flex-1 sm:flex-none bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Menyimpan...' : 'Simpan Spot'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
          >
            Batal
          </button>
        </div>
      </form>
    </div>
  );
}
