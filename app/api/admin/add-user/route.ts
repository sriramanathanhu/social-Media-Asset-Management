import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function POST(request: NextRequest) {
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