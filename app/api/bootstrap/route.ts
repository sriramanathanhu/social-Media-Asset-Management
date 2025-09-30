import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function POST(request: NextRequest) {
  try {
    // Check if any admin users exist
    const adminCount = await prisma.user.count({
      where: { role: 'admin' }
    });

    if (adminCount > 0) {
      return Response.json({
        error: "Admin users already exist. Bootstrap not needed."
      }, { status: 400 });
    }

    const body = await request.json();
    const { email, name, bootstrapKey } = body;

    // Simple bootstrap protection - check for environment variable
    const expectedKey = process.env.BOOTSTRAP_KEY || "bootstrap_setup_2024";
    if (bootstrapKey !== expectedKey) {
      return Response.json({
        error: "Invalid bootstrap key"
      }, { status: 401 });
    }

    if (!email || !name) {
      return Response.json({
        error: "Email and name are required"
      }, { status: 400 });
    }

    // Create first admin user
    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name: name,
        role: 'admin'
      }
    });

    return Response.json({
      message: "Bootstrap admin user created successfully",
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role
      }
    });

  } catch (error) {
    console.error("Bootstrap error:", error);
    return Response.json({
      error: "Failed to create bootstrap user"
    }, { status: 500 });
  }
}