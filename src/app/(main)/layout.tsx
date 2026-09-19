import Navbar from '@/components/layout/Navbar';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import ToastProvider from '@/components/ui/Toast';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <ErrorBoundary>
        <ToastProvider>{children}</ToastProvider>
      </ErrorBoundary>
    </div>
  );
}
