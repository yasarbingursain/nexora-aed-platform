import type { NextWebVitalsMetric } from 'next/app';

export function reportWebVitals(metric: NextWebVitalsMetric) {
  // Minimal no-op implementation; hook point for real analytics
  if (process.env.NODE_ENV === 'development') {
    console.debug('[WebVitals]', metric);
  }
}
