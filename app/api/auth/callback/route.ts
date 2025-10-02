import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const authCode = searchParams.get("auth_code");
    
    console.log("=== NANDI AUTH CALLBACK (Official Implementation) ===");
    console.log("Full URL:", request.url);
    console.log("Search params:", searchParams.toString());
    console.log("Auth code:", authCode ? "present" : "missing");
    console.log("Environment check:");
    console.log("- NEXT_AUTH_URL:", process.env.NEXT_AUTH_URL);
    console.log("- NEXT_AUTH_CLIENT_ID:", process.env.NEXT_AUTH_CLIENT_ID);
    console.log("- AUTH_CLIENT_SECRET:", process.env.AUTH_CLIENT_SECRET ? "present" : "missing");

    if (!authCode) {
      console.error("No auth_code found in query parameters");
      return new Response("Missing auth_code", { status: 400 });
    }

    // Use official Nandi Auth token exchange endpoint (from API docs: /auth/session/exchange-token)
    const tokenExchangeUrl = `${process.env.NEXT_AUTH_URL}/auth/session/exchange-token`;
    console.log("Calling official token exchange:", tokenExchangeUrl);

    const res = await fetch(tokenExchangeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: process.env.NEXT_AUTH_CLIENT_ID,
        client_secret: process.env.AUTH_CLIENT_SECRET,
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

    // Set the cookie with correct name (nandi_session per API docs)
    cookieStore.set({
      name: "nandi_session",
      value: data.session_token,
      httpOnly: true,
      sameSite: "strict",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: maxAge,
    });

    console.log("Session token set successfully, redirecting to home");
    
    // Use official Nandi Auth redirect (redirect to home, not dashboard)
    const baseUrl = process.env.NEXT_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL;
    return Response.redirect(`${baseUrl}`, 302);
    
  } catch (error) {
    console.error("Callback error:", error);
    return new Response(`Internal Server Error: ${error.message}`, { status: 500 });
  }
}