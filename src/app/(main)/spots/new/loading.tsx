export default function NewSpotLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-2 animate-pulse" />
      <div className="h-5 bg-gray-100 dark:bg-gray-800 rounded w-80 mb-8 animate-pulse" />
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2 animate-pulse" />
              <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded-lg w-full animate-pulse" />
            </div>
          ))}
          <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}
