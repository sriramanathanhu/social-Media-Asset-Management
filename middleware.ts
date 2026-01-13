import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  const publicPaths = ['/', '/api/auth', '/pending-approval'];
  const isPublicPath = publicPaths.some(path =>
    pathname === path || pathname.startsWith(path + '/')
  );

  if (isPublicPath) {
    return NextResponse.next();
  }

  // Check session for protected routes
  const sessionToken = request.cookies.get('nandi_session_token');

  if (!sessionToken) {
    // Not logged in, redirect to home
    return NextResponse.redirect(new URL('/', request.url));
  }

  // For protected routes, we need to check if user is pending
  // This is done client-side since middleware can't easily call external APIs
  // The dashboard/pages will handle showing pending state

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ],
};
