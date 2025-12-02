/**
 * Accessibility Hook: Prefers Reduced Motion
 * 
 * Respects user's motion preferences for WCAG 2.1 compliance
 * Used to disable/reduce animations for users with vestibular disorders
 */

'use client'

import { useEffect, useState } from 'react'

export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    // Check if window is available (client-side only)
    if (typeof window === 'undefined') {
      return
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    
    // Set initial value
    setPrefersReducedMotion(mediaQuery.matches)

    // Listen for changes
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches)
    }

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
    // Legacy browsers
    else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange)
      return () => mediaQuery.removeListener(handleChange)
    }
  }, [])

  return prefersReducedMotion
}
