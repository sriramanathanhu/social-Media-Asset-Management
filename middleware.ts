import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // TEMPORARILY DISABLE ALL MIDDLEWARE LOGIC FOR DEBUGGING
  // Just pass through all requests without any redirects
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Minimal matcher to avoid any conflicts
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ],
};