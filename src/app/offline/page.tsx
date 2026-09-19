'use client';

export default function OfflinePage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-blue-600 dark:text-blue-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M16.72 11.06C10.66 10.84 5 13.5 2 17.5" />
            <path d="M5 8.55C9.7 6.7 15.1 6.5 19.5 8.5" />
            <path d="M8.5 12.5C11.5 11.4 14.8 11.3 17.5 12.5" />
            <path d="M12 20h.01" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Anda Sedang Offline
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          Halaman ini belum tersimpan di cache. Peta yang pernah dibuka masih bisa diakses.
          Cek sinyal internet Anda lalu coba lagi.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="press-scale bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Coba Lagi
        </button>
      </div>
    </div>
  );
}
