import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Secret key encoded as Uint8Array for jose in Edge runtime
const SECRET_KEY = new TextEncoder().encode(
  process.env.SECRET_KEY || 'super-secret-exam-invigilation-jwt-token-key-2026-delta-university'
);

interface TokenClaims {
  sub: string;
  email: string;
  role: string;
  exp: number;
  iat: number;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('access_token')?.value;

  let claims: TokenClaims | null = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, SECRET_KEY, {
        algorithms: ['HS256'],
      });
      claims = payload as unknown as TokenClaims;
    } catch {
      // Token is invalid, expired, or tampered with
      claims = null;
    }
  }

  const isAuthenticated = !!claims;
  const userRole = claims?.role?.toUpperCase();

  // 1. If user is already authenticated and visits /login, auto-redirect to their respective dashboard
  if (pathname === '/login' || pathname === '/login/') {
    if (isAuthenticated && userRole) {
      if (userRole === 'ADMIN') {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      } else if (userRole === 'DOCTOR' || userRole === 'PROFESSOR') {
        return NextResponse.redirect(new URL('/doctor/dashboard', request.url));
      } else if (userRole === 'TA') {
        return NextResponse.redirect(new URL('/ta/dashboard', request.url));
      }
    }
    return NextResponse.next();
  }

  // 2. Protected route prefixes
  const isAdminRoute = pathname.startsWith('/admin');
  const isDoctorRoute = pathname.startsWith('/doctor') || pathname.startsWith('/professor');
  const isTaRoute = pathname.startsWith('/ta');

  if (isAdminRoute || isDoctorRoute || isTaRoute) {
    // Unauthenticated access -> immediately redirect to /login
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Role-based isolation checks
    if (isAdminRoute && userRole !== 'ADMIN') {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }

    if (isDoctorRoute && userRole !== 'ADMIN' && userRole !== 'DOCTOR' && userRole !== 'PROFESSOR') {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }

    if (isTaRoute && userRole !== 'ADMIN' && userRole !== 'TA') {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/doctor/:path*',
    '/professor/:path*',
    '/ta/:path*',
    '/login',
  ],
};
