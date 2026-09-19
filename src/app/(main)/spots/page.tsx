'use client';

import { useEffect, useState, useRef } from 'react';
import { Spot, Tag, SPOT_TYPE_LABELS, SpotType } from '@/lib/types';
import SpotCard from '@/components/spots/SpotCard';
import { SpotCardSkeleton } from '@/components/ui/Skeleton';

const SPOT_TYPES: { value: string; label: string }[] = [
  { value: '', label: 'Semua' },
  ...Object.entries(SPOT_TYPE_LABELS).map(([value, label]) => ({ value, label })),
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Terbaru' },
  { value: 'rating', label: 'Rating Tertinggi' },
  { value: 'name', label: 'Nama A-Z' },
];

export default function SpotsPage() {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [tags, setTags] = useState<Tag[]>([]);
  const [sortBy, setSortBy] = useState('newest');
  const [totalCount, setTotalCount] = useState(0);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const searchRef = useRef('');

  // Keep ref in sync with search state
  useEffect(() => { searchRef.current = search; }, [search]);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch('/api/tags', { signal: ctrl.signal }).then(r => r.json()).then(data => setTags(data.tags || [])).catch(() => {});
    return () => ctrl.abort();
  }, []);

  useEffect(() => {
    fetchSpots(searchRef.current);
  }, [filterType, filterTag, sortBy]);

  // Debounced search
  function handleSearchChange(value: string) {
    setSearch(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      fetchSpots(value);
    }, 300);
  }

  const fetchCtrlRef = useRef<AbortController | null>(null);

  async function fetchSpots(searchOverride?: string) {
    fetchCtrlRef.current?.abort();
    const ctrl = new AbortController();
    fetchCtrlRef.current = ctrl;
    try {
      setLoading(true);
      const searchValue = searchOverride !== undefined ? searchOverride : search;
      const params = new URLSearchParams();
      if (filterType) params.set('type', filterType);
      if (filterTag) params.set('tag', filterTag);
      if (searchValue) {
        params.set('q', searchValue);
      }
      params.set('sort', sortBy);
      params.set('limit', '100');

      const res = await fetch(`/api/spots?${params}`, { signal: ctrl.signal });
      const data = await res.json();
      setSpots(data.spots || []);
      setTotalCount(data.total || 0);
    } catch (error: any) {
      if (error.name !== 'AbortError') console.error('Failed to fetch spots:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleFormSearch(e: React.FormEvent) {
    e.preventDefault();
    fetchSpots();
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 dark:text-white">
          Semua Spot Mancing
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Temukan spot mancing terbaik di seluruh Indonesia
        </p>
      </div>

      {/* Search & Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
        {/* Search bar + sort */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <form onSubmit={handleFormSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                type="text"
                placeholder="Cari nama spot..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => { setSearch(''); fetchSpots(''); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>
            <button
              type="submit"
              className="press-scale bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium shrink-0"
            >
              Cari
            </button>
          </form>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Type filter chips */}
        <div className="flex flex-wrap gap-2 mb-2">
          {SPOT_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => setFilterType(type.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filterType === type.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        {/* Tag filter chips */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterTag('')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                !filterTag
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Semua Tag
            </button>
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => setFilterTag(tag.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  filterTag === tag.id
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {tag.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results count */}
      {!loading && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {totalCount > 0 ? `Menampilkan ${spots.length} dari ${totalCount} spot` : `${spots.length} spot ditemukan`}
        </p>
      )}

      {/* Spots Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SpotCardSkeleton key={i} />
          ))}
        </div>
      ) : spots.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4 opacity-40">?</div>
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-2">
            Tidak ada spot ditemukan
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {search ? `Tidak ada hasil untuk "${search}"` : 'Coba ubah filter atau jadilah yang pertama menambah spot!'}
          </p>
          <a
            href="/spots/new"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            + Tambah Spot Baru
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {spots.map((spot) => (
            <SpotCard key={spot.id} spot={spot} />
          ))}
        </div>
      )}
    </div>
  );
}
