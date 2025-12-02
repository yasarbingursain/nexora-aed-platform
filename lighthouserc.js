module.exports = {
  ci: {
    collect: {
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
        throttling: {
          rttMs: 40,
          throughputKbps: 10240,
          cpuSlowdownMultiplier: 1,
        },
      },
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/demo',
        'http://localhost:3000/client-dashboard',
      ],
    },
    assert: {
      assertions: {
        // Performance budgets
        'categories:performance': ['error', { minScore: 0.95 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.90 }],
        'categories:seo': ['error', { minScore: 0.95 }],

        // Core Web Vitals
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'first-contentful-paint': ['error', { maxNumericValue: 1200 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.08 }],
        'total-blocking-time': ['error', { maxNumericValue: 200 }],
        'interactive': ['error', { maxNumericValue: 2500 }],

        // Resource budgets
        'total-byte-weight': ['error', { maxNumericValue: 300000 }], // 300KB
        'unused-javascript': ['warn', { maxLength: 184320 }], // 180KB
        'modern-image-formats': 'warn',
        'uses-optimized-images': 'warn',
        'uses-text-compression': 'error',
        'uses-responsive-images': 'warn',

        // Security
        'is-on-https': 'off', // Skip for localhost
        'uses-http2': 'off', // Skip for localhost
        
        // Accessibility
        'color-contrast': 'error',
        'document-title': 'error',
        'html-has-lang': 'error',
        'meta-viewport': 'error',
        'aria-allowed-attr': 'error',
        'aria-required-attr': 'error',
        'button-name': 'error',
        'image-alt': 'error',
        'link-name': 'error',
        'tabindex': 'error',
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
