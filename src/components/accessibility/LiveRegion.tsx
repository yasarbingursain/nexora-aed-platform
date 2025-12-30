/**
 * ARIA Live Region Component
 * Announces dynamic content changes to screen readers
 */

import React, { useRef, useEffect } from 'react';

interface LiveRegionProps {
  message: string;
  politeness?: 'polite' | 'assertive' | 'off';
  atomic?: boolean;
  relevant?: 'additions' | 'removals' | 'text' | 'all';
  className?: string;
}

export const LiveRegion: React.FC<LiveRegionProps> = ({
  message,
  politeness = 'polite',
  atomic = true,
  relevant = 'additions',
  className = ''
}) => {
  const regionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (regionRef.current && message) {
      // Clear and re-set to ensure announcement
      regionRef.current.textContent = '';
      setTimeout(() => {
        if (regionRef.current) {
          regionRef.current.textContent = message;
        }
      }, 100);
    }
  }, [message]);

  return (
    <div
      ref={regionRef}
      role="status"
      aria-live={politeness}
      aria-atomic={atomic}
      aria-relevant={relevant}
      className={`sr-only ${className}`}
    />
  );
};

/**
 * Hook for managing live region announcements
 */
export const useLiveAnnouncer = () => {
  const [message, setMessage] = React.useState('');

  const announce = (text: string, politeness: 'polite' | 'assertive' = 'polite') => {
    setMessage(''); // Clear first
    setTimeout(() => setMessage(text), 100);
  };

  return { message, announce };
};
