'use client';

import { Component, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('SpotFish! Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center">
          <div className="text-6xl mb-4 opacity-30 font-bold text-gray-400 dark:text-gray-500">!</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2 dark:text-gray-100">Ups! Ada yang salah</h2>
          <p className="text-gray-500 mb-4 max-w-md dark:text-gray-400">
            Sepertinya ada gangguan teknis. Coba refresh halaman atau kembali lagi nanti.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Refresh
            </button>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = '/';
              }}
              className="bg-gray-200 text-gray-700 px-5 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors dark:bg-gray-700 dark:text-gray-200"
            >
              Beranda
            </button>
          </div>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mt-6 text-left max-w-lg w-full">
              <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700 dark:text-gray-400">
                Detail Error (dev mode)
              </summary>
              <pre className="mt-2 p-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 overflow-auto dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-400">
                {this.state.error.message}
                {'\n\n'}
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
