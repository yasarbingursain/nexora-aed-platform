/**
 * Skip Navigation Component
 * WCAG 2.1 AA Compliant - Allows keyboard users to skip to main content
 */

import React from 'react';

export const SkipNavigation: React.FC = () => {
  return (
    <>
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-nexora-primary text-white px-4 py-2 rounded-md z-[9999] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-nexora-primary transition-all"
      >
        Skip to main content
      </a>
      <a 
        href="#main-navigation" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-48 bg-nexora-primary text-white px-4 py-2 rounded-md z-[9999] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-nexora-primary transition-all"
      >
        Skip to navigation
      </a>
    </>
  );
};
