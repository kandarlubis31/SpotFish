'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Profile } from '@/lib/types';

const SPECIALIZATION_LABELS: Record<string, string> = {
  laut: 'Mancing Laut',
  air_tawar: 'Mancing Air Tawar',
  campuran: 'Campuran',
  all: 'Semua',
};

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit form
  const [bio, setBio] = useState('');
  const [specialization, setSpecialization] = useState('all');

  // Password form
  const [showPwForm, setShowPwForm] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMessage, setPwMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (!data.user) {
        router.push('/login?redirect=/profile');
        return;
      }
      setProfile(data.user);
      setBio(data.user.bio || '');
      setSpecialization(data.user.specialization || 'all');
    } catch (e) {
      console.warn('Failed to fetch profile:', e);
      router.push('/login?redirect=/profile');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio, specialization }),
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data.user);
        setEditing(false);
      }
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwMessage(null);

    if (newPw.length < 6) {
      setPwMessage({ type: 'err', text: 'Password baru minimal 6 karakter' });
      return;
    }
    if (newPw !== confirmPw) {
      setPwMessage({ type: 'err', text: 'Konfirmasi password tidak cocok' });
      return;
    }

    setPwSaving(true);
    try {
      const res = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: currentPw, new_password: newPw }),
      });
      const data = await res.json();
      if (res.ok) {
        setPwMessage({ type: 'ok', text: 'Password berhasil diganti' });
        setCurrentPw('');
        setNewPw('');
        setConfirmPw('');
        setShowPwForm(false);
      } else {
        setPwMessage({ type: 'err', text: data.error || 'Gagal mengganti password' });
      }
    } catch {
      setPwMessage({ type: 'err', text: 'Gagal mengganti password' });
    } finally {
      setPwSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Profile</h1>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        {/* User Info */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.username} className="w-16 h-16 rounded-full object-cover" />
            ) : (
              profile.username.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{profile.username}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{profile.email}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Bergabung {new Date(profile.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-500/10 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{profile.spots_count}</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Spot Dikirim</div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-500/10 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{profile.reviews_count}</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Ulasan Diberikan</div>
          </div>
        </div>

        {/* Bio & Specialization */}
        {editing ? (
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Ceritakan tentang dirimu..."
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                rows={3}
                maxLength={200}
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{bio.length}/200</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Spesialisasi</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(SPECIALIZATION_LABELS).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSpecialization(value)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      specialization === value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
              <button
                type="button"
                onClick={() => { setEditing(false); setBio(profile.bio || ''); setSpecialization(profile.specialization || 'all'); }}
                className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-6 py-2 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Batal
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Bio</h3>
              <p className="text-gray-700 dark:text-gray-200">{profile.bio || 'Belum ada bio'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Spesialisasi</h3>
              <p className="text-gray-700 dark:text-gray-200">{SPECIALIZATION_LABELS[profile.specialization] || 'Semua'}</p>
            </div>
            <button
              onClick={() => setEditing(true)}
              className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-6 py-2 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Edit Profile
            </button>
          </div>
        )}
      </div>

      {/* Password Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-lg text-gray-900 dark:text-white">Keamanan</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Ganti password akun Anda</p>
          </div>
          <button
            onClick={() => {
              setShowPwForm(!showPwForm);
              setPwMessage(null);
            }}
            className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {showPwForm ? 'Tutup' : 'Ganti Password'}
          </button>
        </div>

        {pwMessage && (
          <div
            className={`mb-4 px-4 py-2.5 rounded-lg text-sm ${
              pwMessage.type === 'ok'
                ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400'
                : 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400'
            }`}
          >
            {pwMessage.text}
          </div>
        )}

        {showPwForm && (
          <form onSubmit={handlePasswordChange} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Password Lama
              </label>
              <input
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Password Baru
                </label>
                <input
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Konfirmasi Password Baru
                </label>
                <input
                  type="password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={pwSaving}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {pwSaving ? 'Menyimpan...' : 'Simpan Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
