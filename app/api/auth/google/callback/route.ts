import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  id_token: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    
    console.log("Google OAuth callback received");
    console.log("- Code present:", code ? "yes" : "no");
    console.log("- Error:", error || "none");

    if (error) {
      console.error("OAuth error:", error);
      return new Response(`OAuth error: ${error}`, { status: 400 });
    }

    if (!code) {
      console.error("Missing authorization code");
      return new Response("Missing authorization code", { status: 400 });
    }

    // Validate environment variables
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    if (!clientId || !clientSecret) {
      console.error("Missing Google OAuth credentials");
      return new Response("Google OAuth not properly configured", { status: 500 });
    }

    // Exchange code for tokens
    console.log("Exchanging code for tokens...");
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: "authorization_code",
        redirect_uri: `${baseUrl}/api/auth/google/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Token exchange failed:", errorData);
      return new Response("Failed to exchange code for tokens", { status: 500 });
    }

    const tokens: GoogleTokenResponse = await tokenResponse.json();
    console.log("Token exchange successful");

    // Get user info from Google
    console.log("Fetching user info from Google...");
    const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!userResponse.ok) {
      console.error("Failed to fetch user info");
      return new Response("Failed to fetch user information", { status: 500 });
    }

    const googleUser: GoogleUserInfo = await userResponse.json();
    console.log("Google user info retrieved:", { email: googleUser.email, name: googleUser.name });

    // Check if user exists in our database
    const dbUser = await prisma.user.findUnique({
      where: {
        email: googleUser.email.toLowerCase()
      }
    });

    if (!dbUser) {
      console.log("User not found in database, denying access");
      return new Response("User not authorized. Please contact administrator to add your email to the system.", { 
        status: 403,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    console.log("User found in database:", { id: dbUser.id, role: dbUser.role });

    // Create session - we'll store Google user info in a cookie
    const cookieStore = await cookies();
    
    // Clear any existing cookies first
    cookieStore.delete("google_session_token");
    cookieStore.delete("nandi_session_token");
    cookieStore.delete("force_logout");

    // Create a simple session object
    const sessionData = {
      provider: 'google',
      user: {
        id: googleUser.id,
        email: googleUser.email,
        name: googleUser.name,
        picture: googleUser.picture,
        role: dbUser.role,
        dbId: dbUser.id,
        ecitizenId: dbUser.ecitizen_id
      },
      expires_at: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    };

    // Set session cookie
    cookieStore.set({
      name: "google_session_token",
      value: Buffer.from(JSON.stringify(sessionData)).toString('base64'),
      httpOnly: true,
      sameSite: "strict",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24, // 24 hours
    });

    console.log("Google session created, redirecting to dashboard");

    // Redirect to dashboard
    return Response.redirect(`${baseUrl}/dashboard`, 302);

  } catch (error) {
    console.error("Google OAuth callback error:", error);
    return new Response(`Internal Server Error: ${error.message}`, { status: 500 });
  }
}