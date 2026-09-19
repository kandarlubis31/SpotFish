'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getPasswordStrength } from '@/lib/passwordStrength';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/';
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Touched state — show inline errors only after field interaction
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const strength = getPasswordStrength(password);

  // Inline field validation
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const usernameValid = /^[a-zA-Z0-9_]{3,20}$/.test(username);
  const passwordValid = password.length >= 6;
  const confirmValid = confirmPassword.length > 0 && confirmPassword === password;

  function markTouched(field: string) {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  function fieldClass(field: string, valid: boolean): string {
    const base = 'w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none';
    if (!touched[field]) return `${base} border-gray-300 dark:border-gray-600`;
    return valid
      ? `${base} border-green-400 dark:border-green-500`
      : `${base} border-red-400 dark:border-red-500`;
  }

  function FieldError({ show, message }: { show: boolean; message: string }) {
    if (!show) return null;
    return (
      <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        {message}
      </p>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Validate all — mark everything touched
    setTouched({ email: true, username: true, password: true, confirm: true });

    if (!emailValid) {
      setError('Format email tidak valid');
      return;
    }
    if (!usernameValid) {
      setError('Username 3-20 karakter, hanya huruf, angka, dan underscore');
      return;
    }
    if (!passwordValid) {
      setError('Password minimal 6 karakter');
      return;
    }
    if (!confirmValid) {
      setError('Konfirmasi password tidak cocok');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Registrasi gagal');
      }

      router.push(redirectTo);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <svg width="48" height="48" viewBox="0 0 36 44" fill="none"><path d="M18 0C8.06 0 0 8.06 0 18C0 31.5 18 44 18 44C18 44 36 31.5 36 18C36 8.06 27.94 0 18 0Z" fill="#2563eb"/><circle cx="18" cy="18" r="12" fill="white" opacity="0.95"/></svg>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-4">Daftar SpotFish!</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Bergabung dengan komunitas pemancing Indonesia</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => markTouched('email')}
                placeholder="email@contoh.com"
                className={fieldClass('email', emailValid)}
                required
              />
              <FieldError show={touched.email && !emailValid} message="Format email tidak valid" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/\s/g, ''))}
                onBlur={() => markTouched('username')}
                placeholder="pemancing_jkt"
                className={fieldClass('username', usernameValid)}
                required
              />
              <FieldError
                show={touched.username && !usernameValid}
                message="3-20 karakter, hanya huruf/angka/underscore"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => markTouched('password')}
                placeholder="••••••••"
                className={fieldClass('password', passwordValid)}
                required
                minLength={6}
              />
              <FieldError show={touched.password && !passwordValid} message="Minimal 6 karakter" />

              {/* Password strength meter */}
              {password && (
                <div className="mt-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex gap-1">
                      {[1, 2, 3, 4].map((i) => (
                        <span
                          key={i}
                          className={`h-1.5 flex-1 rounded-full transition-colors ${
                            i <= strength.score ? strength.color : 'bg-gray-200 dark:bg-gray-700'
                          }`}
                        />
                      ))}
                    </div>
                    <span className={`text-xs font-medium ${strength.textColor}`}>{strength.label}</span>
                  </div>
                  {strength.hints.length > 0 && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Tambahkan: {strength.hints.join(', ')}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Konfirmasi Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onBlur={() => markTouched('confirm')}
                placeholder="••••••••"
                className={fieldClass('confirm', confirmValid)}
                required
                minLength={6}
              />
              <FieldError show={touched.confirm && !confirmValid} message="Password tidak cocok" />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="press-scale w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Mendaftar...' : 'Daftar Sekarang'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
          Sudah punya akun?{' '}
          <Link href={`/login${redirectTo !== '/' ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`} className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
            Masuk
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-[calc(100vh-64px)] flex items-center justify-center"><p className="text-gray-400 dark:text-gray-500">Memuat...</p></div>}>
      <RegisterForm />
    </Suspense>
  );
}
