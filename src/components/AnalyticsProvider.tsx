"use client";

import { useEffect } from 'react';
import { useConsent } from '@/providers/ConsentProvider';
import { initAnalytics, initMarketing } from '@/lib/analytics';

export function AnalyticsProvider() {
  const { consent } = useConsent();

  useEffect(() => {
    // Only initialize analytics after user consent
    if (consent.analytics) {
      initAnalytics();
    }
  }, [consent.analytics]);

  useEffect(() => {
    // Only initialize marketing after user consent
    if (consent.marketing) {
      initMarketing();
    }
  }, [consent.marketing]);

  return null;
}
