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
  // Use Nandi Auth variables only (NextAuth removed)
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_NANDI_APP_ID || '',
    redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL || window.location.origin}/api/auth/callback`,
    response_type: 'code',
  });

  return `${process.env.NEXT_PUBLIC_NANDI_SSO_URL || ''}/auth/authorize?${params.toString()}`;
}