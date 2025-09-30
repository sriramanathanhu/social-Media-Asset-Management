import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";

export async function getAuthenticatedUser() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("nandi_session");
    
    if (!sessionToken) {
      return { authenticated: false, error: "No session token" };
    }

    const res = await fetch(
      `${process.env.NEXT_AUTH_URL}/auth/get-session?client_id=${process.env.NEXT_AUTH_CLIENT_ID}`,
      {
        headers: {
          "Content-Type": "application/json",
          cookie: `nandi_session=${sessionToken.value}`,
        },
      }
    );

    if (!res.ok) {
      return { authenticated: false, error: "Invalid session" };
    }

    const data = await res.json();
    const userEmail = data.user?.email || data.email;
    
    if (!userEmail) {
      return { authenticated: false, error: "No email in session" };
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: userEmail.toLowerCase() }
    });
    
    if (!dbUser) {
      return { authenticated: false, error: "User not found in database" };
    }

    return { 
      authenticated: true, 
      user: dbUser,
      session: data 
    };
  } catch (error) {
    console.error("Auth check error:", error);
    return { authenticated: false, error: "Authentication failed" };
  }
}

export async function requireAdmin() {
  const auth = await getAuthenticatedUser();
  
  if (!auth.authenticated || !auth.user) {
    return { authorized: false, error: auth.error || "Not authenticated" };
  }
  
  if (auth.user.role !== 'admin') {
    return { authorized: false, error: "Admin role required" };
  }
  
  return { authorized: true, user: auth.user };
}

export async function requireAuth() {
  const auth = await getAuthenticatedUser();
  
  if (!auth.authenticated || !auth.user) {
    return { authorized: false, error: auth.error || "Not authenticated" };
  }
  
  return { authorized: true, user: auth.user };
}