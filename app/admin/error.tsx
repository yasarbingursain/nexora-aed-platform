'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCcw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Admin panel error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
      <div className="max-w-lg w-full bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Admin Panel Error
            </h3>
            
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Failed to load admin data. This may be due to missing API endpoints or a connection issue.
            </p>

            {process.env.NODE_ENV === 'development' && error.message && (
              <div className="mb-4 p-3 bg-slate-100 dark:bg-slate-700 rounded-lg">
                <p className="text-xs font-mono text-slate-700 dark:text-slate-300 break-all">
                  {error.message}
                </p>
              </div>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={reset}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <RefreshCcw className="w-4 h-4" />
                Retry
              </button>
              
              <Link
                href="/admin"
                className="flex-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Admin
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
