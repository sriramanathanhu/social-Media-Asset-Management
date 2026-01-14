import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/utils/auth';

// GET /api/secure-logins/folders/[id] - Get folder details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const { id } = await params;
    const folderId = parseInt(id);

    if (isNaN(folderId)) {
      return NextResponse.json({ error: 'Invalid folder ID' }, { status: 400 });
    }

    const folder = await prisma.secureLoginFolder.findFirst({
      where: {
        id: folderId,
        owner_id: auth.user.id,
      },
      include: {
        parent: {
          select: { id: true, name: true },
        },
        children: {
          select: { id: true, name: true, color: true, icon: true },
          orderBy: { name: 'asc' },
        },
        logins: {
          select: {
            id: true,
            item_name: true,
            username: true,
            website_url: true,
            login_type: true,
            created_at: true,
          },
          orderBy: { item_name: 'asc' },
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
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    return NextResponse.json({ folder });
  } catch (error) {
    console.error('Error fetching folder:', error);
    return NextResponse.json(
      { error: 'Failed to fetch folder' },
      { status: 500 }
    );
  }
}

// PUT /api/secure-logins/folders/[id] - Update folder
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const { id } = await params;
    const folderId = parseInt(id);

    if (isNaN(folderId)) {
      return NextResponse.json({ error: 'Invalid folder ID' }, { status: 400 });
    }

    // Verify ownership
    const existingFolder = await prisma.secureLoginFolder.findFirst({
      where: { id: folderId, owner_id: auth.user.id },
    });

    if (!existingFolder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, color, icon, parent_id } = body;

    // Prevent circular reference
    if (parent_id === folderId) {
      return NextResponse.json(
        { error: 'Folder cannot be its own parent' },
        { status: 400 }
      );
    }

    // If changing parent, verify new parent exists and belongs to user
    if (parent_id !== undefined && parent_id !== null) {
      const parentFolder = await prisma.secureLoginFolder.findFirst({
        where: { id: parent_id, owner_id: auth.user.id },
      });
      if (!parentFolder) {
        return NextResponse.json(
          { error: 'Parent folder not found' },
          { status: 404 }
        );
      }

      // Check for circular reference (parent cannot be a child of this folder)
      const isCircular = await checkCircularReference(folderId, parent_id, auth.user.id);
      if (isCircular) {
        return NextResponse.json(
          { error: 'Cannot move folder into its own subfolder' },
          { status: 400 }
        );
      }
    }

    // Check for duplicate name at new level
    if (name && name !== existingFolder.name) {
      const targetParentId = parent_id !== undefined ? parent_id : existingFolder.parent_id;
      const duplicate = await prisma.secureLoginFolder.findFirst({
        where: {
          name: name.trim(),
          owner_id: auth.user.id,
          parent_id: targetParentId,
          id: { not: folderId },
        },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: 'A folder with this name already exists at this level' },
          { status: 400 }
        );
      }
    }

    const folder = await prisma.secureLoginFolder.update({
      where: { id: folderId },
      data: {
        name: name?.trim() || existingFolder.name,
        description: description !== undefined ? description : existingFolder.description,
        color: color || existingFolder.color,
        icon: icon || existingFolder.icon,
        parent_id: parent_id !== undefined ? parent_id : existingFolder.parent_id,
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

    return NextResponse.json({ folder });
  } catch (error) {
    console.error('Error updating folder:', error);
    return NextResponse.json(
      { error: 'Failed to update folder' },
      { status: 500 }
    );
  }
}

// DELETE /api/secure-logins/folders/[id] - Delete folder
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const { id } = await params;
    const folderId = parseInt(id);

    if (isNaN(folderId)) {
      return NextResponse.json({ error: 'Invalid folder ID' }, { status: 400 });
    }

    // Verify ownership
    const folder = await prisma.secureLoginFolder.findFirst({
      where: { id: folderId, owner_id: auth.user.id },
      include: {
        _count: {
          select: { logins: true, children: true },
        },
      },
    });

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const moveToParent = searchParams.get('move_contents') === 'true';

    if (moveToParent) {
      // Move all logins and subfolders to parent folder (or root if no parent)
      await prisma.$transaction([
        prisma.secureLogin.updateMany({
          where: { folder_id: folderId },
          data: { folder_id: folder.parent_id },
        }),
        prisma.secureLoginFolder.updateMany({
          where: { parent_id: folderId },
          data: { parent_id: folder.parent_id },
        }),
        prisma.secureLoginFolder.delete({
          where: { id: folderId },
        }),
      ]);
    } else {
      // Just delete the folder - logins will have folder_id set to null (onDelete: SetNull)
      await prisma.secureLoginFolder.delete({
        where: { id: folderId },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting folder:', error);
    return NextResponse.json(
      { error: 'Failed to delete folder' },
      { status: 500 }
    );
  }
}

// Helper function to check for circular reference
async function checkCircularReference(
  folderId: number,
  newParentId: number,
  ownerId: number
): Promise<boolean> {
  let currentId: number | null = newParentId;
  const visited = new Set<number>();

  while (currentId !== null) {
    if (currentId === folderId) {
      return true; // Circular reference detected
    }
    if (visited.has(currentId)) {
      break; // Already visited, avoid infinite loop
    }
    visited.add(currentId);

    const folder = await prisma.secureLoginFolder.findFirst({
      where: { id: currentId, owner_id: ownerId },
      select: { parent_id: true },
    });

    currentId = folder?.parent_id ?? null;
  }

  return false;
}
