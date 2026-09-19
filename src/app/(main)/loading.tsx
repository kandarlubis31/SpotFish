export default function HomeLoading() {
  return (
    <div className="h-[calc(100vh-64px)] bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-blue-100 dark:bg-blue-500/20 animate-pulse" />
        <p className="text-gray-400 dark:text-gray-500 text-sm">Memuat peta...</p>
      </div>
    </div>
  );
}
