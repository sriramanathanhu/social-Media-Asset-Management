import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const authCode = searchParams.get("auth_code") || searchParams.get("code");
    
    console.log("Auth callback received, auth_code:", authCode ? "present" : "missing");
    console.log("Environment check:");
    console.log("- NANDI_SSO_URL:", process.env.NANDI_SSO_URL ? "present" : "missing");
    console.log("- NANDI_APP_ID:", process.env.NANDI_APP_ID ? "present" : "missing");
    console.log("- NEXT_PUBLIC_BASE_URL:", process.env.NEXT_PUBLIC_BASE_URL ? "present" : "missing");

    if (!authCode) {
      console.error("Missing auth_code in callback");
      return new Response("Missing auth_code", { status: 400 });
    }

    // Validate required environment variables
    if (!process.env.NANDI_SSO_URL || !process.env.NANDI_APP_ID) {
      console.error("Missing required environment variables");
      return new Response("Server configuration error", { status: 500 });
    }

    // Exchange auth code for session token with Nandi SSO
    const tokenExchangeUrl = `${process.env.NANDI_SSO_URL}/auth/session/token`;
    console.log("Calling token exchange:", tokenExchangeUrl);

    const res = await fetch(tokenExchangeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: process.env.NANDI_APP_ID,
        code: authCode,
      }),
    });

    const data = await res.json();
    console.log("Token exchange response status:", res.status);

    if (res.status !== 200) {
      console.error("Token exchange failed:", data);
      return new Response(data.message || "Token exchange failed", { status: 500 });
    }

    const cookieStore = await cookies();
    
    // Calculate maxAge from the expires_at timestamp if provided
    let maxAge = 60 * 60 * 24; // Default 1 day
    if (data.expires_at) {
      const expiresAt = typeof data.expires_at === 'number' ? data.expires_at * 1000 : data.expires_at;
      const now = Date.now();
      maxAge = Math.floor((expiresAt - now) / 1000);
    }

    // Clear any existing cookies first
    cookieStore.delete("nandi_session_token");
    cookieStore.delete("nandi_session");
    cookieStore.delete("force_logout");
    
    // Set the new cookie
    cookieStore.set({
      name: "nandi_session_token",
      value: data.session_token,
      httpOnly: true,
      sameSite: "strict",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: maxAge,
    });

    console.log("Session token set successfully, redirecting to dashboard");
    
    // Use correct environment variable for redirect
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL;
    return Response.redirect(`${baseUrl}/dashboard`, 302);
    
  } catch (error) {
    console.error("Callback error:", error);
    return new Response(`Internal Server Error: ${error.message}`, { status: 500 });
  }
}