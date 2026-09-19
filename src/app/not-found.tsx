import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center px-4">
      <div className="text-center">
        {/* Pin icon */}
        <div className="w-20 h-20 mx-auto mb-6">
          <svg viewBox="0 0 64 64" width="80" height="80">
            <defs>
              <linearGradient id="pinGrad404" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#2563eb', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: '#1d4ed8', stopOpacity: 1 }} />
              </linearGradient>
            </defs>
            <path
              d="M32 4 C20 4 10 14 10 26 C10 40 32 60 32 60 C32 60 54 40 54 26 C54 14 44 4 32 4Z"
              fill="url(#pinGrad404)"
              opacity="0.2"
            />
            <text x="32" y="34" textAnchor="middle" fontSize="20" fontWeight="bold" fill="#94a3b8">?</text>
          </svg>
        </div>

        <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-2">Spot Tidak Ditemukan</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md">
          Halaman yang kamu cari tidak ada atau mungkin sudah dipindahkan.
        </p>

        <div className="flex gap-3 justify-center">
          <Link
            href="/"
            className="press-scale bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Kembali ke Peta
          </Link>
          <Link
            href="/spots"
            className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-6 py-3 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Jelajahi Spot
          </Link>
        </div>
      </div>
    </div>
  );
}
