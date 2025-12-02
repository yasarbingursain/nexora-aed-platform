"use client";

import dynamic from 'next/dynamic';
import { Suspense, useState, useEffect } from 'react';

const ThreatGlobe = dynamic(() => import('./ThreatGlobe'), {
  ssr: false,
  loading: () => (
    <div className="relative aspect-square w-full rounded-2xl bg-slate-900/40 border border-slate-700 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-400 text-sm">Loading Live Threat Globe...</p>
      </div>
    </div>
  ),
});

export function ThreatGlobeWrapper() {
  const [error, setError] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setTimeout(() => {
      // If still loading after 5 seconds, something is wrong
      if (!mounted) {
        console.error('ThreatGlobe failed to load');
        setError(true);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [mounted]);

  if (!mounted) {
    return (
      <div className="relative aspect-square w-full rounded-2xl bg-slate-900/40 border border-slate-700 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Initializing...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative aspect-square w-full rounded-2xl bg-slate-900/40 border border-slate-700 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-sm">Failed to load globe</p>
        </div>
      </div>
    );
  }

  return <ThreatGlobe />;
}
