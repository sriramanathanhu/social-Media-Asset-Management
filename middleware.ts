import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Skip middleware for API routes and static files
  if (path.startsWith('/api/') || path.startsWith('/_next/') || path.includes('.')) {
    return NextResponse.next();
  }
  
  // Define public paths that don't require authentication
  const publicPaths = ['/', '/force-logout', '/test'];
  const isPublicPath = publicPaths.includes(path);
  
  const token = request.cookies.get('nandi_session_token')?.value || '';

  // Only redirect unauthenticated users from protected pages
  if (!isPublicPath && !token) {
    const loginUrl = new URL('/', request.nextUrl);
    return NextResponse.redirect(loginUrl);
  }

  // Allow the request to proceed (including authenticated users on login page)
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files and API routes
     * The middleware function handles the filtering internally
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};