'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Catch, FishSpecies } from '@/lib/types';

const TECHNIQUES = [
  { value: 'pancing', label: 'Pancing' },
  { value: 'jaring', label: 'Jaring' },
  { value: 'tombak', label: 'Tombak' },
  { value: 'pukat', label: 'Pukat' },
  { value: 'trawal', label: 'Trawal' },
  { value: 'lainnya', label: 'Lainnya' },
];

interface CatchLogProps {
  spotId: string;
  isOwner?: boolean;
}

export default function CatchLog({ spotId }: CatchLogProps) {
  const router = useRouter();
  const [catches, setCatches] = useState<Catch[]>([]);
  const [fishSpecies, setFishSpecies] = useState<FishSpecies[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [fishSpeciesId, setFishSpeciesId] = useState('');
  const [fishName, setFishName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [weightKg, setWeightKg] = useState('');
  const [lengthCm, setLengthCm] = useState('');
  const [baitUsed, setBaitUsed] = useState('');
  const [technique, setTechnique] = useState('pancing');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const ctrl = new AbortController();
    fetchCatches(ctrl.signal);
    fetchFishSpecies(ctrl.signal);
    return () => ctrl.abort();
  }, [spotId]);

  async function fetchCatches(signal?: AbortSignal) {
    try {
      const res = await fetch(`/api/catches?spot_id=${spotId}`, { signal });
      const data = await res.json();
      setCatches(data.catches || []);
    } catch (err) {
      console.warn('Failed to fetch catches:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchFishSpecies(signal?: AbortSignal) {
    try {
      const res = await fetch('/api/fish', { signal });
      const data = await res.json();
      setFishSpecies(data.fish || []);
    } catch (e) { console.warn('Failed to fetch fish species:', e); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Auth check
    const meRes = await fetch('/api/auth/me');
    const meData = await meRes.json();
    if (!meData.user) {
      router.push(`/login?redirect=/spots/${spotId}`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/catches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spot_id: spotId,
          fish_species_id: fishSpeciesId || undefined,
          fish_name: fishName || undefined,
          quantity,
          weight_kg: weightKg ? parseFloat(weightKg) : undefined,
          length_cm: lengthCm ? parseFloat(lengthCm) : undefined,
          bait_used: baitUsed || undefined,
          technique,
          notes: notes || undefined,
        }),
      });

      if (res.status === 401) {
        router.push(`/login?redirect=/spots/${spotId}`);
        return;
      }

      if (res.ok) {
        // Reset form
        setFishSpeciesId('');
        setFishName('');
        setQuantity(1);
        setWeightKg('');
        setLengthCm('');
        setBaitUsed('');
        setTechnique('pancing');
        setNotes('');
        setShowForm(false);
        fetchCatches();
      }
    } catch (err) {
      console.error('Failed to log catch:', err);
    } finally {
      setSubmitting(false);
    }
  }

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m lalu`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}j lalu`;
    const days = Math.floor(hours / 24);
    return `${days}h lalu`;
  }

  // Stats
  const totalFish = catches.reduce((sum, c) => sum + c.quantity, 0);
  const speciesCounts = catches.reduce((acc, c) => {
    const name = c.species_name || c.fish_name || 'Ikan';
    acc[name] = (acc[name] || 0) + c.quantity;
    return acc;
  }, {} as Record<string, number>);
  const topSpecies = Object.entries(speciesCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  // CSV export
  function exportCsv() {
    const headers = ['Tanggal', 'Ikan', 'Jumlah', 'Berat (kg)', 'Panjang (cm)', 'Umpan', 'Teknik', 'Pemancing', 'Catatan'];
    const escape = (v: unknown) => {
      const s = v == null ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = catches.map((c) =>
      [
        new Date(c.caught_at).toLocaleString('id-ID'),
        c.species_name || c.fish_name || 'Ikan',
        c.quantity,
        c.weight_kg ?? '',
        c.length_cm ?? '',
        c.bait_used ?? '',
        TECHNIQUES.find((t) => t.value === c.technique)?.label || c.technique || '',
        c.username ?? '',
        c.notes ?? '',
      ]
        .map(escape)
        .join(',')
    );
    const csv = '\ufeff' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spotfish-catchlog-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-bold text-lg">Tangkapan</h2>
          {catches.length > 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {totalFish} ikan dari {catches.length} pencatatan
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {catches.length > 0 && (
            <button
              onClick={exportCsv}
              title="Ekspor catatan tangkapan ke CSV"
              className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              CSV
            </button>
          )}
          <button
            onClick={() => {
              fetch('/api/auth/me')
                .then(r => r.json())
                .then(d => {
                  if (!d.user) router.push(`/login?redirect=/spots/${spotId}`);
                  else setShowForm(!showForm);
                })
                .catch(() => router.push(`/login?redirect=/spots/${spotId}`));
            }}
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
          >
            {showForm ? 'Tutup' : '+ Catat Tangkapan'}
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      {catches.length > 0 && topSpecies.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {topSpecies.map(([name, count]) => (
            <span key={name} className="bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-full text-sm">
              {name} <span className="font-semibold">×{count}</span>
            </span>
          ))}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-4 space-y-3">
          {/* Fish Species */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Jenis Ikan</label>
            <select
              value={fishSpeciesId}
              onChange={(e) => {
                setFishSpeciesId(e.target.value);
                if (e.target.value) setFishName('');
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
            >
              <option value="">Pilih dari daftar...</option>
              {fishSpecies.map(f => (
                <option key={f.id} value={f.id}>{f.name} ({f.category})</option>
              ))}
            </select>
          </div>

          {/* Custom fish name */}
          {!fishSpeciesId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Atau ketik nama ikan</label>
              <input
                type="text"
                value={fishName}
                onChange={(e) => setFishName(e.target.value.substring(0, 100))}
                placeholder="Contoh: Barramundi, Kakap Merah"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
          )}

          {/* Quantity + Weight + Length */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Jumlah</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                min={1}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Berat (kg)</label>
              <input
                type="number"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                placeholder="0.0"
                step="0.1"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Panjang (cm)</label>
              <input
                type="number"
                value={lengthCm}
                onChange={(e) => setLengthCm(e.target.value)}
                placeholder="0"
                step="1"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
          </div>

          {/* Bait + Technique */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Umpan</label>
              <input
                type="text"
                value={baitUsed}
                onChange={(e) => setBaitUsed(e.target.value.substring(0, 200))}
                placeholder="Contoh: Cacing, Udang"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Teknik</label>
              <select
                value={technique}
                onChange={(e) => setTechnique(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
              >
                {TECHNIQUES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Catatan</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value.substring(0, 500))}
              placeholder="Cuaca, kondisi air, tips..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none resize-none"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting || (!fishSpeciesId && !fishName)}
              className="bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Menyimpan...' : 'Simpan'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
            >
              Batal
            </button>
          </div>
        </form>
      )}

      {/* Catches List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse h-16 bg-gray-100 dark:bg-gray-800 rounded-lg" />
          ))}
        </div>
      ) : catches.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>Belum ada catatan tangkapan</p>
          <p className="text-sm">Jadilah yang pertama mencatat di sini!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {catches.map((c) => (
            <div key={c.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center text-green-700 dark:text-green-400 text-sm font-bold shrink-0">
                ×{c.quantity}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-gray-900 dark:text-white">
                    {c.species_name || c.fish_name || 'Ikan'}
                  </span>
                  {c.weight_kg && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">{c.weight_kg} kg</span>
                  )}
                  {c.length_cm && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">{c.length_cm} cm</span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  <span>{c.username}</span>
                  {c.bait_used && <span>Umpan: {c.bait_used}</span>}
                  {c.technique && <span>{TECHNIQUES.find(t => t.value === c.technique)?.label || c.technique}</span>}
                  <span>{timeAgo(c.caught_at)}</span>
                </div>
                {c.notes && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{c.notes}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
