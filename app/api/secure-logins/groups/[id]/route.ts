import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/utils/auth';
import { canManageGroup, hasGroupAccess } from '@/lib/secureLoginPermissions';

// GET /api/secure-logins/groups/[id] - Get group details
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
    const groupId = parseInt(id);

    if (isNaN(groupId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    // Check if user has access to this group
    const hasAccess = await hasGroupAccess(auth.user.id, groupId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const group = await prisma.secureLoginGroup.findUnique({
      where: { id: groupId },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
            addedByUser: {
              select: { id: true, name: true },
            },
          },
          orderBy: { added_at: 'desc' },
        },
        loginAccess: {
          include: {
            secureLogin: {
              select: { id: true, item_name: true, website_url: true },
            },
          },
        },
      },
    });

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const canManage = await canManageGroup(auth.user.id, groupId);
    const isOwner = group.owner_id === auth.user.id;

    // Map the response to match frontend expectations
    const groupData = {
      ...group,
      isOwner,
      canManage,
      memberCount: group.members.length,
      sharedLoginsCount: group.loginAccess.length,
      // Map owner to created_by for frontend compatibility
      created_by: group.owner,
    };

    return NextResponse.json({
      group: groupData,
      isAdmin: isOwner || canManage,
    });
  } catch (error) {
    console.error('Error fetching group:', error);
    return NextResponse.json(
      { error: 'Failed to fetch group' },
      { status: 500 }
    );
  }
}

// PUT /api/secure-logins/groups/[id] - Update group
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
    const groupId = parseInt(id);

    if (isNaN(groupId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    // Only owner can update group details
    const group = await prisma.secureLoginGroup.findUnique({
      where: { id: groupId },
      select: { owner_id: true },
    });

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    if (group.owner_id !== auth.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description } = body;

    // If name is changing, check for duplicates
    if (name) {
      const existing = await prisma.secureLoginGroup.findFirst({
        where: {
          name,
          owner_id: auth.user.id,
          id: { not: groupId },
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: 'You already have a group with this name' },
          { status: 400 }
        );
      }
    }

    const updatedGroup = await prisma.secureLoginGroup.update({
      where: { id: groupId },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description: description || null }),
        updated_at: new Date(),
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { members: true, loginAccess: true },
        },
      },
    });

    return NextResponse.json({
      group: {
        ...updatedGroup,
        isOwner: true,
        canManage: true,
        memberCount: updatedGroup._count.members,
        sharedLoginsCount: updatedGroup._count.loginAccess,
        created_by: updatedGroup.owner,
      },
      isAdmin: true,
    });
  } catch (error) {
    console.error('Error updating group:', error);
    return NextResponse.json(
      { error: 'Failed to update group' },
      { status: 500 }
    );
  }
}

// DELETE /api/secure-logins/groups/[id] - Delete group
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
    const groupId = parseInt(id);

    if (isNaN(groupId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    // Only owner can delete group
    const group = await prisma.secureLoginGroup.findUnique({
      where: { id: groupId },
      select: { owner_id: true },
    });

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    if (group.owner_id !== auth.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Delete (cascade will handle members and access)
    await prisma.secureLoginGroup.delete({
      where: { id: groupId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting group:', error);
    return NextResponse.json(
      { error: 'Failed to delete group' },
      { status: 500 }
    );
  }
}
