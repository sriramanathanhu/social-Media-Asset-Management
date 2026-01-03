import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("nandi_session_token");

    if (!sessionToken) {
      return new Response(JSON.stringify({ authenticated: false }), {
        status: 401,
      });
    }

    // pass cookies from the request to the auth server
    const res = await fetch(
      `${process.env.NEXT_AUTH_URL}/auth/get-session?client_id=${process.env.NEXT_AUTH_CLIENT_ID}`,
      {
        headers: {
          "Content-Type": "application/json",
          cookie: sessionToken ? `nandi_session=${sessionToken.value}` : "",
        },
      },
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
        // Auto-create new user with "pending" role (no access until admin approves)
        console.log("New user detected, creating with pending status:", userEmail);
        const nandiUser = data.user || data;

        const newUser = await prisma.user.create({
          data: {
            email: userEmail.toLowerCase(),
            name: nandiUser.name || nandiUser.display_name || userEmail.split('@')[0],
            ecitizen_id: nandiUser.id || nandiUser.sub || null,
            role: "pending", // No access until admin approves
          }
        });

        return new Response(JSON.stringify({
          authenticated: true,
          user: {
            ...nandiUser,
            role: newUser.role,
            dbId: newUser.id,
            ecitizenId: newUser.ecitizen_id,
            isPending: true
          },
          provider: 'nandi',
          message: "Account created. Please wait for admin approval."
        }), { status: 200 });
      }

      // Check if user is pending approval
      if (dbUser.role === "pending") {
        return new Response(JSON.stringify({
          authenticated: true,
          user: {
            ...(data.user || data),
            role: dbUser.role,
            dbId: dbUser.id,
            ecitizenId: dbUser.ecitizen_id,
            isPending: true
          },
          provider: 'nandi',
          message: "Your account is pending admin approval."
        }), { status: 200 });
      }

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
    cookieStore.delete("nandi_session_token");
    return new Response(JSON.stringify({ message: "Logged out successfully" }), {
      status: 200,
    });
  } catch (error) {
    console.error(error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
