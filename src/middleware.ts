import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * SECURITY FIX: Frontend Authentication Enforcement
 * 
 * Next.js middleware to protect routes and verify authentication.
 * Redirects unauthenticated users to login page.
 */

const protectedRoutes = ['/customer-dashboard', '/admin'];
const publicRoutes = ['/', '/login', '/signup', '/about', '/pricing', '/contact'];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route));
  const isPublicRoute = publicRoutes.includes(path);

  const token = request.cookies.get('auth-token')?.value;

  // Redirect unauthenticated users from protected routes
  if (isProtectedRoute && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect authenticated users from public routes to dashboard
  if (isPublicRoute && token && !path.startsWith('/customer-dashboard')) {
    return NextResponse.redirect(new URL('/customer-dashboard', request.url));
  }

  // Verify token with backend
  if (token) {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      const response = await fetch(`${apiUrl}/api/v1/auth/verify`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        // Invalid or expired token - redirect to login
        const redirectResponse = NextResponse.redirect(new URL('/login', request.url));
        redirectResponse.cookies.delete('auth-token');
        return redirectResponse;
      }
    } catch (error) {
      // Network error or backend down - redirect to login
      const redirectResponse = NextResponse.redirect(new URL('/login', request.url));
      redirectResponse.cookies.delete('auth-token');
      return redirectResponse;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
