/**
 * useNonce Hook
 * 
 * Extracts CSP nonce from response headers for proper inline script execution
 * in production with strict Content Security Policy.
 * 
 * Usage in client components:
 * ```tsx
 * const nonce = useNonce();
 * <script nonce={nonce} dangerouslySetInnerHTML={{__html: ...}} />
 * ```
 * 
 * Security: Nonce is generated per-request in middleware.ts
 * References: OWASP CSP, NIST SP 800-211 (Secure Software Development)
 */

'use client';

export function useNonce(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  // Get nonce from meta tag set by middleware
  const nonceElement = document.querySelector('meta[property="csp-nonce"]');
  return nonceElement?.getAttribute('content') ?? undefined;
}
