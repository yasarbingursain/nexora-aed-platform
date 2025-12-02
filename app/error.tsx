'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-6 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
        </div>
        
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-3">
          Something went wrong
        </h2>
        
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          An unexpected error occurred. Please try again or return to the home page.
        </p>

        {process.env.NODE_ENV === 'development' && error.message && (
          <div className="mb-6 p-4 bg-slate-100 dark:bg-slate-700 rounded-lg text-left">
            <p className="text-sm font-mono text-slate-700 dark:text-slate-300 break-all">
              {error.message}
            </p>
          </div>
        )}
        
        <div className="flex gap-3">
          <button
            onClick={reset}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCcw className="w-4 h-4" />
            Try again
          </button>
          
          <Link
            href="/"
            className="flex-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
