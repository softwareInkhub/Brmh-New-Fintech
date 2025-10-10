import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  console.log(`[Fintech Middleware] 🔍 Request: ${pathname}`);

  // Public paths that don't require authentication
  const publicPaths = [
    '/login-signup',
    '/api/users',
    '/debug-auth',
    '/test-cookies',
    '/_next',
    '/favicon.ico',
  ];

  // Check if path is public
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));
  if (isPublicPath) {
    console.log(`[Fintech Middleware] ✅ Public path, allowing access: ${pathname}`);
    return NextResponse.next();
  }

  // IMPORTANT: Skip ALL auth checks for localhost (development)
  const host = request.headers.get('host') || '';
  if (host.includes('localhost')) {
    console.log(`[Fintech Middleware] ✅ Localhost detected, bypassing all auth checks`);
    return NextResponse.next();
  }

  // For production (fintech.brmh.in), check for httpOnly cookies
  const accessToken = request.cookies.get('access_token');
  const idToken = request.cookies.get('id_token');

  console.log(`[Fintech Middleware] 🍪 Cookies check:`, {
    hasAccessToken: !!accessToken,
    hasIdToken: !!idToken,
    host
  });

  if (accessToken && idToken) {
    console.log(`[Fintech Middleware] ✅ User authenticated via SSO cookies, allowing access`);
    
    // Set a client-readable cookie flag (non-httpOnly) so client can check auth status
    const response = NextResponse.next();
    response.cookies.set('auth_valid', 'true', {
      httpOnly: false, // Client-readable
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
    });
    
    console.log(`[Fintech Middleware] ✅ Set auth_valid flag for client-side`);
    return response;
  }

  // No tokens found - redirect to SSO login
  const loginUrl = new URL('https://auth.brmh.in/login');
  loginUrl.searchParams.set('next', request.url);
  
  console.log(`[Fintech Middleware] ❌ No authentication found, redirecting to: ${loginUrl.toString()}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};

