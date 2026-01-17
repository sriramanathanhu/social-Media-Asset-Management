import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/utils/auth";

// GET /api/secure-logins/folders - List all folders for current user
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const folders = await prisma.secureLoginFolder.findMany({
      where: {
        owner_id: auth.user.id,
      },
      include: {
        _count: {
          select: {
            logins: true,
            children: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({ folders });
  } catch (error) {
    console.error("Error fetching folders:", error);
    return NextResponse.json(
      { error: "Failed to fetch folders" },
      { status: 500 }
    );
  }
}

// POST /api/secure-logins/folders - Create a new folder
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, color, icon, parent_id } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Folder name is required" },
        { status: 400 }
      );
    }

    // Check if folder with same name already exists at same level
    const existingFolder = await prisma.secureLoginFolder.findFirst({
      where: {
        name: name.trim(),
        owner_id: auth.user.id,
        parent_id: parent_id || null,
      },
    });

    if (existingFolder) {
      return NextResponse.json(
        { error: "A folder with this name already exists at this level" },
        { status: 400 }
      );
    }

    // If parent_id is provided, verify it exists and belongs to user
    if (parent_id) {
      const parentFolder = await prisma.secureLoginFolder.findFirst({
        where: {
          id: parent_id,
          owner_id: auth.user.id,
        },
      });

      if (!parentFolder) {
        return NextResponse.json(
          { error: "Parent folder not found" },
          { status: 404 }
        );
      }
    }

    const folder = await prisma.secureLoginFolder.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        color: color || "#6366f1",
        icon: icon || "folder",
        parent_id: parent_id || null,
        owner_id: auth.user.id,
      },
      include: {
        _count: {
          select: {
            logins: true,
            children: true,
          },
        },
      },
    });

    return NextResponse.json(folder, { status: 201 });
  } catch (error) {
    console.error("Error creating folder:", error);
    return NextResponse.json(
      { error: "Failed to create folder" },
      { status: 500 }
    );
  }
}
