export default function UserProfileLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Profile header skeleton */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
        <div>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2 animate-pulse" />
          <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-48 animate-pulse" />
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700">
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse" />
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-28 animate-pulse" />
      </div>

      {/* Content skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 animate-pulse">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
              <div className="flex-1">
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2" />
                <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-20" />
              </div>
            </div>
            <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-full mb-2" />
            <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
