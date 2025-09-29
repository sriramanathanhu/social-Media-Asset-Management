import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Define public paths that don't require authentication
  const publicPaths = [
    '/',
    '/api/auth/callback', 
    '/api/auth/sso/callback',
    '/api/auth/session',
    '/force-logout',
    '/api/health'
  ];
  
  const isPublicPath = publicPaths.includes(path);
  const token = request.cookies.get('nandi_session_token')?.value || '';

  // Redirect authenticated users from login page to dashboard
  if (path === '/' && token) {
    const dashboardUrl = new URL('/dashboard', request.nextUrl);
    return NextResponse.redirect(dashboardUrl);
  }

  // Redirect unauthenticated users from protected pages to login
  if (!isPublicPath && !token) {
    const loginUrl = new URL('/', request.nextUrl);
    return NextResponse.redirect(loginUrl);
  }

  // Allow the request to proceed
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth/* (authentication endpoints)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|public).*)',
  ],
};