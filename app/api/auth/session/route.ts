import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const nandiSessionToken = cookieStore.get("nandi_session_token");
    const googleSessionToken = cookieStore.get("google_session_token");
    const logoutFlag = cookieStore.get("force_logout");

    // Check if user has been forcefully logged out
    if (logoutFlag?.value === "true") {
      return new Response(JSON.stringify({ authenticated: false, message: "User has been logged out" }), {
        status: 401,
      });
    }

    // Check Google session first
    if (googleSessionToken) {
      try {
        const sessionData = JSON.parse(Buffer.from(googleSessionToken.value, 'base64').toString());
        
        // Check if session is expired
        if (sessionData.expires_at && Date.now() > sessionData.expires_at) {
          return new Response(JSON.stringify({ authenticated: false, message: "Session expired" }), {
            status: 401,
          });
        }

        return new Response(JSON.stringify({ 
          authenticated: true,
          user: sessionData.user,
          provider: 'google'
        }), { status: 200 });
      } catch (error) {
        console.error("Error parsing Google session:", error);
        // Continue to check Nandi session
      }
    }

    // Check Nandi session
    if (!nandiSessionToken) {
      return new Response(JSON.stringify({ authenticated: false }), {
        status: 401,
      });
    }

    const res = await fetch(
      `${process.env.NANDI_SSO_URL}/auth/get-session?client_id=${process.env.NANDI_APP_ID}`,
      {
        headers: {
          "Content-Type": "application/json",
          cookie: `nandi_session=${sessionToken.value}`,
        },
      }
    );

    const data = await res.json();

    if (res.status !== 200) {
      return new Response(JSON.stringify({ authenticated: false, error: data.message }), { status: res.status });
    }

    // Verify user exists in our database and get their role
    try {
      const userEmail = data.user?.email || data.email;
      
      if (!userEmail) {
        return new Response(JSON.stringify({ authenticated: false, error: "No email found in session" }), { status: 401 });
      }
      
      // Look up user in Prisma database
      const dbUser = await prisma.user.findUnique({
        where: {
          email: userEmail.toLowerCase()
        }
      });
      
      if (!dbUser) {
        // User not found in database - deny access
        console.log("User not in database, denying access");
        return new Response(JSON.stringify({ 
          authenticated: false,
          error: "User not authorized. Please contact administrator."
        }), { status: 403 });
      }
      
      // Return the actual user data from Nandi merged with database info
      return new Response(JSON.stringify({ 
        authenticated: true,
        user: {
          ...(data.user || data),
          role: dbUser.role,
          dbId: dbUser.id,
          ecitizenId: dbUser.ecitizen_id
        },
        provider: 'nandi'
      }), { status: 200 });
    } catch (error) {
      console.error("Error verifying user:", error);
      return new Response(JSON.stringify({ 
        authenticated: true,
        user: data.user || data,
        ...data 
      }), { status: 200 });
    }
  } catch (error) {
    console.error(error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    
    // Get both session tokens
    const nandiSessionToken = cookieStore.get("nandi_session_token");
    const googleSessionToken = cookieStore.get("google_session_token");
    
    // Try to revoke the Nandi session if it exists
    if (nandiSessionToken?.value) {
      try {
        // First try to get the actual session from the token
        const sessionRes = await fetch(
          `${process.env.NANDI_SSO_URL}/auth/get-session?client_id=${process.env.NANDI_APP_ID}`,
          {
            headers: {
              "Content-Type": "application/json",
              cookie: `nandi_session=${nandiSessionToken.value}`,
            },
          }
        );
        
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          console.log("Current session data:", sessionData);
        }
        
        // Then logout
        const logoutRes = await fetch(
          `${process.env.NANDI_SSO_URL}/auth/logout`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              cookie: `nandi_session=${nandiSessionToken.value}`,
            },
            body: JSON.stringify({
              client_id: process.env.NANDI_APP_ID,
              session_token: nandiSessionToken.value
            })
          }
        );
        
        console.log("Nandi logout response:", logoutRes.status);
        if (!logoutRes.ok) {
          const text = await logoutRes.text();
          console.error("Nandi logout failed:", text);
        }
      } catch (error) {
        console.error("Failed to revoke Nandi session:", error);
      }
    }
    
    // Delete all session cookies with proper options
    cookieStore.set("nandi_session_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 0,
      path: "/",
    });
    
    cookieStore.set("google_session_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 0,
      path: "/",
    });
    
    // Also delete any other possible cookie variations
    cookieStore.delete("nandi_session_token");
    cookieStore.delete("google_session_token");
    cookieStore.delete("nandi_session");
    
    // Set a logout flag since we can't actually logout from Nandi
    cookieStore.set("force_logout", "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });
    
    // Set multiple Set-Cookie headers to ensure deletion
    const headers = new Headers();
    headers.append("Set-Cookie", "nandi_session_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Strict");
    headers.append("Set-Cookie", "nandi_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Strict");
    headers.append("Set-Cookie", "force_logout=true; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800");
    
    return new Response(JSON.stringify({ message: "Logged out successfully" }), {
      status: 200,
      headers
    });
  } catch (error) {
    console.error(error);
    return new Response("Internal Server Error", { status: 500 });
  }
}