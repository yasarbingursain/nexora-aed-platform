import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { nanoid } from 'nanoid';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const url = request.nextUrl;

  // Generate CSP nonce for inline scripts
  const nonce = nanoid();
  response.headers.set('x-nonce', nonce);

  // A/B Testing: Assign variant if on landing page
  if (url.pathname === '/') {
    const existingVariant = request.cookies.get('abv')?.value;
    
    if (!existingVariant) {
      // Assign new variant (50/50 split)
      const variant = Math.random() < 0.5 ? 'A' : 'B';
      response.cookies.set('abv', variant, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
      response.headers.set('x-variant', variant);
    } else {
      response.headers.set('x-variant', existingVariant);
    }
  }

  // Update CSP header with nonce
  const csp = response.headers.get('Content-Security-Policy');
  if (csp) {
    const updatedCSP = csp.replace(
      "script-src 'self' 'strict-dynamic'",
      `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`
    );
    response.headers.set('Content-Security-Policy', updatedCSP);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif)$).*)',
  ],
};
