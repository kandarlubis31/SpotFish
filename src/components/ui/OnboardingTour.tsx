'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const STORAGE_KEY = 'spotfish-onboarding-v1';

interface Step {
  title: string;
  body: string;
  icon: React.ReactNode;
  position: string; // tailwind positioning classes
}

export default function OnboardingTour() {
  // -1 = hidden, 0..2 = active step
  const [step, setStep] = useState(-1);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    let seen = false;
    try {
      seen = !!localStorage.getItem(STORAGE_KEY);
    } catch {
      // storage unavailable — don't nag every visit, just skip
      return;
    }
    setIsMobile(window.innerWidth < 768);
    if (!seen) {
      // small delay so the map finishes rendering first
      const t = setTimeout(() => setStep(0), 900);
      return () => clearTimeout(t);
    }
  }, []);

  function finish() {
    try {
      localStorage.setItem(STORAGE_KEY, 'done');
    } catch {
      // ignore
    }
    setStep(-1);
  }

  function next() {
    if (step >= 2) finish();
    else setStep(step + 1);
  }

  if (step < 0) return null;

  const steps: Step[] = [
    {
      title: 'Selamat datang di SpotFish!',
      body: 'Ketuk pin di peta untuk melihat detail spot mancing — rating, foto, dan ulasan angler lain.',
      icon: (
        <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
        </svg>
      ),
      position: 'top-16 left-4 right-4 sm:right-auto sm:max-w-xs',
    },
    {
      title: 'Jelajahi daftar spot',
      body: isMobile
        ? 'Geser panel dari bawah ke atas untuk melihat spot terdekat dari lokasimu.'
        : 'Klik tombol "Daftar" di kanan atas untuk melihat daftar spot, atau aktifkan lokasi untuk sorting terdekat.',
      icon: (
        <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      ),
      position: isMobile ? 'bottom-28 left-4 right-4' : 'top-16 right-4 w-80',
    },
    {
      title: 'Punya spot rahasia?',
      body: 'Bagikan spot favoritmu ke komunitas dan kumpulkan poin di papan peringkat.',
      icon: (
        <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      ),
      position: 'inset-0 flex items-center justify-center p-4',
    },
  ];

  const current = steps[step];

  return (
    <div className="absolute inset-0 z-[2000] pointer-events-none">
      {/* Card */}
      <div className={`absolute ${current.position}`}>
        <div className="pointer-events-auto bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
              {current.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 dark:text-white mb-1">{current.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{current.body}</p>
            </div>
          </div>

          {/* Footer: dots + actions */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-1.5">
              {steps.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === step ? 'w-5 bg-blue-600' : 'w-1.5 bg-gray-300 dark:bg-gray-600'
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={finish}
                className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 px-2 py-1.5"
              >
                Lewati
              </button>
              {step === 2 ? (
                <>
                  <Link
                    href="/spots/new"
                    onClick={finish}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    Bagikan Spot
                  </Link>
                  <button
                    onClick={finish}
                    className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-2 py-1.5"
                  >
                    Nanti
                  </button>
                </>
              ) : (
                <button
                  onClick={next}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Lanjut
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
