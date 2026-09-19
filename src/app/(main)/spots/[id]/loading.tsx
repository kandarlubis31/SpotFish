export default function SpotDetailLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Breadcrumb skeleton */}
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4 animate-pulse" />

      {/* Header skeleton */}
      <div className="flex items-start gap-4 mb-6">
        <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
        <div className="flex-1">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64 mb-2 animate-pulse" />
          <div className="h-5 bg-gray-100 dark:bg-gray-800 rounded w-40 animate-pulse" />
        </div>
      </div>

      {/* Map skeleton */}
      <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl mb-6 animate-pulse" />

      {/* Info grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-4 animate-pulse" />
          <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-full mb-2 animate-pulse" />
          <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-full mb-2 animate-pulse" />
          <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-2/3 animate-pulse" />
        </div>
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-4 animate-pulse" />
            <div className="flex gap-2">
              <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded-full w-20 animate-pulse" />
              <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded-full w-16 animate-pulse" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-28 mb-4 animate-pulse" />
            <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded-lg w-40 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
