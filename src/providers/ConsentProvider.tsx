"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

interface ConsentState {
  necessary: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp?: string;
  region?: string;
}

interface ConsentContextType {
  consent: ConsentState;
  updateConsent: (newConsent: Partial<ConsentState>) => void;
  hasConsent: (category: keyof ConsentState) => boolean;
  showBanner: boolean;
  acceptAll: () => void;
  rejectAll: () => void;
}

const ConsentContext = createContext<ConsentContextType | undefined>(undefined);

const CONSENT_STORAGE_KEY = 'nexora_consent_v1';

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [showBanner, setShowBanner] = useState(false);
  const [consent, setConsent] = useState<ConsentState>({
    necessary: true, // Always true
    functional: false,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    // Load saved consent from localStorage
    const saved = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setConsent(parsed);
        setShowBanner(false);
      } catch (e) {
        setShowBanner(true);
      }
    } else {
      setShowBanner(true);
    }
  }, []);

  const updateConsent = (newConsent: Partial<ConsentState>) => {
    const updated: ConsentState = {
      ...consent,
      ...newConsent,
      necessary: true, // Always true
      timestamp: new Date().toISOString(),
      region: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
    
    setConsent(updated);
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(updated));
    setShowBanner(false);

    // Log consent for audit trail
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      fetch('/api/consent-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      }).catch(() => {}); // Fire and forget
    }
  };

  const hasConsent = (category: keyof ConsentState): boolean => {
    return consent[category] === true;
  };

  const acceptAll = () => {
    updateConsent({
      functional: true,
      analytics: true,
      marketing: true,
    });
  };

  const rejectAll = () => {
    updateConsent({
      functional: false,
      analytics: false,
      marketing: false,
    });
  };

  return (
    <ConsentContext.Provider
      value={{ consent, updateConsent, hasConsent, showBanner, acceptAll, rejectAll }}
    >
      {children}
    </ConsentContext.Provider>
  );
}

export function useConsent() {
  const context = useContext(ConsentContext);
  if (!context) {
    throw new Error('useConsent must be used within ConsentProvider');
  }
  return context;
}
