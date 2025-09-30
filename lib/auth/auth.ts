import { Session } from '@/lib/types';

export async function getSession(): Promise<Session | null> {
  try {
    const response = await fetch('/api/auth/session', {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

export async function logout() {
  try {
    const response = await fetch('/api/auth/session', {
      method: 'DELETE',
      credentials: 'include',
    });

    if (response.ok) {
      window.location.href = '/';
    }
  } catch (error) {
    console.error('Error logging out:', error);
  }
}

export function getLoginUrl() {
  // Use Nandi Auth variables matching API documentation
  const authUrl = process.env.NEXT_PUBLIC_NEXT_AUTH_URL || 'https://auth.kailasa.ai';
  const clientId = process.env.NEXT_PUBLIC_NEXT_AUTH_CLIENT_ID || '';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  const redirectUri = `${baseUrl}/api/auth/callback`;

  // Use /auth/sign-in endpoint per API documentation
  return `${authUrl}/auth/sign-in?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}`;
}