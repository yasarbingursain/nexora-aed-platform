/**
 * Consent-Gated Analytics
 * 
 * Only loads analytics scripts after user consent
 * Compliant with GDPR, CCPA, and privacy regulations
 */

let analyticsInitialized = false;
let marketingInitialized = false;

export function initAnalytics() {
  if (analyticsInitialized) return;
  analyticsInitialized = true;

  // Initialize GA4 or PostHog only after consent
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_GA_ID) {
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`;
    script.async = true;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function(...args: any[]) {
      window.dataLayer.push(args);
    };
    window.gtag('js', new Date());
    window.gtag('config', process.env.NEXT_PUBLIC_GA_ID, {
      anonymize_ip: true,
      cookie_flags: 'SameSite=None;Secure',
    });
  }
}

export function initMarketing() {
  if (marketingInitialized) return;
  marketingInitialized = true;

  // Initialize marketing pixels (Facebook, LinkedIn, etc.) only after consent
  if (typeof window !== 'undefined') {
    // Add marketing scripts here
    console.log('[Analytics] Marketing tracking initialized');
  }
}

export function trackEvent(
  eventName: string,
  properties?: Record<string, any>
) {
  if (!analyticsInitialized) return;

  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, properties);
  }
}

export function trackPageView(url: string) {
  if (!analyticsInitialized) return;

  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', process.env.NEXT_PUBLIC_GA_ID, {
      page_path: url,
    });
  }
}

// Type declarations
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}
