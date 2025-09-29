import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  // Only enable in development or if specifically requested
  const isDev = process.env.NODE_ENV === 'development';
  const forceDebug = request.nextUrl.searchParams.get('force') === 'true';
  
  if (!isDev && !forceDebug) {
    return new Response('Debug endpoint only available in development', { status: 403 });
  }

  const envCheck = {
    // Server-side environment variables
    server: {
      NANDI_SSO_URL: process.env.NANDI_SSO_URL ? 'SET' : 'MISSING',
      NANDI_APP_ID: process.env.NANDI_APP_ID ? 'SET' : 'MISSING',
      NANDI_CLIENT_SECRET: process.env.NANDI_CLIENT_SECRET ? 'SET' : 'MISSING',
      NANDI_RETURN_URL: process.env.NANDI_RETURN_URL ? 'SET' : 'MISSING',
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL ? 'SET' : 'MISSING',
      NODE_ENV: process.env.NODE_ENV || 'MISSING',
    },
    // Public environment variables that should be available to frontend
    public: {
      NEXT_PUBLIC_NANDI_SSO_URL: process.env.NEXT_PUBLIC_NANDI_SSO_URL ? 'SET' : 'MISSING',
      NEXT_PUBLIC_NANDI_APP_ID: process.env.NEXT_PUBLIC_NANDI_APP_ID ? 'SET' : 'MISSING',
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL ? 'SET' : 'MISSING',
    },
    // Actual values (be careful in production)
    values: isDev || forceDebug ? {
      NANDI_SSO_URL: process.env.NANDI_SSO_URL,
      NANDI_APP_ID: process.env.NANDI_APP_ID,
      NEXT_PUBLIC_NANDI_SSO_URL: process.env.NEXT_PUBLIC_NANDI_SSO_URL,
      NEXT_PUBLIC_NANDI_APP_ID: process.env.NEXT_PUBLIC_NANDI_APP_ID,
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    } : 'Hidden in production'
  };

  return new Response(JSON.stringify(envCheck, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}