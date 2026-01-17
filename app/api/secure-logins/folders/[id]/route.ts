import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/utils/auth";

// GET /api/secure-logins/folders/[id] - Get a specific folder
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const folderId = Number.parseInt(params.id);
    if (Number.isNaN(folderId)) {
      return NextResponse.json({ error: "Invalid folder ID" }, { status: 400 });
    }

    const folder = await prisma.secureLoginFolder.findFirst({
      where: {
        id: folderId,
        owner_id: auth.user.id,
      },
      include: {
        logins: true,
        children: {
          include: {
            _count: {
              select: {
                logins: true,
                children: true,
              },
            },
          },
        },
        _count: {
          select: {
            logins: true,
            children: true,
          },
        },
      },
    });

    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    return NextResponse.json({ folder });
  } catch (error) {
    console.error("Error fetching folder:", error);
    return NextResponse.json(
      { error: "Failed to fetch folder" },
      { status: 500 }
    );
  }
}

// PUT /api/secure-logins/folders/[id] - Update a folder
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const folderId = Number.parseInt(params.id);
    if (Number.isNaN(folderId)) {
      return NextResponse.json({ error: "Invalid folder ID" }, { status: 400 });
    }

    // Verify folder exists and belongs to user
    const existingFolder = await prisma.secureLoginFolder.findFirst({
      where: {
        id: folderId,
        owner_id: auth.user.id,
      },
    });

    if (!existingFolder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, color, icon, parent_id } = body;

    // If name is being changed, check for duplicates
    if (name && name.trim() !== existingFolder.name) {
      const duplicateFolder = await prisma.secureLoginFolder.findFirst({
        where: {
          name: name.trim(),
          owner_id: auth.user.id,
          parent_id: parent_id !== undefined ? parent_id : existingFolder.parent_id,
          id: { not: folderId },
        },
      });

      if (duplicateFolder) {
        return NextResponse.json(
          { error: "A folder with this name already exists at this level" },
          { status: 400 }
        );
      }
    }

    // Prevent circular parent reference
    if (parent_id !== undefined && parent_id !== null) {
      if (parent_id === folderId) {
        return NextResponse.json(
          { error: "A folder cannot be its own parent" },
          { status: 400 }
        );
      }

      // Check if parent exists and belongs to user
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

      // Check for circular reference (parent is a descendant of this folder)
      let currentParent = parentFolder;
      while (currentParent.parent_id) {
        if (currentParent.parent_id === folderId) {
          return NextResponse.json(
            { error: "Cannot create circular folder reference" },
            { status: 400 }
          );
        }
        const nextParent = await prisma.secureLoginFolder.findFirst({
          where: { id: currentParent.parent_id },
        });
        if (!nextParent) break;
        currentParent = nextParent;
      }
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (color !== undefined) updateData.color = color;
    if (icon !== undefined) updateData.icon = icon;
    if (parent_id !== undefined) updateData.parent_id = parent_id;

    const folder = await prisma.secureLoginFolder.update({
      where: { id: folderId },
      data: updateData,
      include: {
        _count: {
          select: {
            logins: true,
            children: true,
          },
        },
      },
    });

    return NextResponse.json(folder);
  } catch (error) {
    console.error("Error updating folder:", error);
    return NextResponse.json(
      { error: "Failed to update folder" },
      { status: 500 }
    );
  }
}

// DELETE /api/secure-logins/folders/[id] - Delete a folder
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const folderId = Number.parseInt(params.id);
    if (Number.isNaN(folderId)) {
      return NextResponse.json({ error: "Invalid folder ID" }, { status: 400 });
    }

    // Verify folder exists and belongs to user
    const folder = await prisma.secureLoginFolder.findFirst({
      where: {
        id: folderId,
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

    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    // Check if folder has children or logins
    if (folder._count.children > 0) {
      return NextResponse.json(
        { error: "Cannot delete folder with subfolders. Delete subfolders first." },
        { status: 400 }
      );
    }

    if (folder._count.logins > 0) {
      // Move logins to root (no folder) before deleting
      await prisma.secureLogin.updateMany({
        where: { folder_id: folderId },
        data: { folder_id: null },
      });
    }

    await prisma.secureLoginFolder.delete({
      where: { id: folderId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting folder:", error);
    return NextResponse.json(
      { error: "Failed to delete folder" },
      { status: 500 }
    );
  }
}
