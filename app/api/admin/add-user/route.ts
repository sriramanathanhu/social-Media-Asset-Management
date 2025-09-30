import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";

async function checkAdminAuth() {
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
    
    if (!dbUser || dbUser.role !== 'admin') {
      return { authenticated: false, error: "Admin role required" };
    }

    return { authenticated: true, user: dbUser };
  } catch (error) {
    return { authenticated: false, error: "Authentication failed" };
  }
}

export async function POST(request: NextRequest) {
  const authCheck = await checkAdminAuth();
  if (!authCheck.authenticated) {
    return Response.json({
      error: authCheck.error
    }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { email, name, role = 'user' } = body;

    if (!email || !name) {
      return Response.json({
        error: "Email and name are required"
      }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      return Response.json({
        error: "User already exists",
        user: existingUser
      }, { status: 409 });
    }

    // Create new user
    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name: name,
        role: role // 'user' or 'admin'
      }
    });

    return Response.json({
      message: "User created successfully",
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role
      }
    });

  } catch (error) {
    console.error("Error creating user:", error);
    return Response.json({
      error: "Failed to create user",
      details: error.message
    }, { status: 500 });
  }
}

export async function GET() {
  const authCheck = await checkAdminAuth();
  if (!authCheck.authenticated) {
    return Response.json({
      error: authCheck.error
    }, { status: 401 });
  }

  try {
    // List all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        created_at: true
      },
      orderBy: { created_at: 'desc' }
    });

    return Response.json({
      users,
      count: users.length
    });

  } catch (error) {
    console.error("Error fetching users:", error);
    return Response.json({
      error: "Failed to fetch users"
    }, { status: 500 });
  }
}