import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/utils/auth';
import { canManageGroup, hasGroupAccess } from '@/lib/secureLoginPermissions';

// GET /api/secure-logins/groups/[id]/members - List group members
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

    const members = await prisma.secureLoginGroupMember.findMany({
      where: { group_id: groupId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        addedByUser: {
          select: { id: true, name: true },
        },
      },
      orderBy: { added_at: 'desc' },
    });

    return NextResponse.json({ members });
  } catch (error) {
    console.error('Error fetching members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    );
  }
}

// POST /api/secure-logins/groups/[id]/members - Add member to group
export async function POST(
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

    // Check if user can manage this group
    const canManage = await canManageGroup(auth.user.id, groupId);
    if (!canManage) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { user_id, role } = body;

    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ['member', 'admin'];
    if (role && !validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be "member" or "admin"' },
        { status: 400 }
      );
    }

    // Check if user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: user_id },
    });
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is already a member
    const existingMember = await prisma.secureLoginGroupMember.findUnique({
      where: {
        group_id_user_id: {
          group_id: groupId,
          user_id,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: 'User is already a member of this group' },
        { status: 400 }
      );
    }

    // Can't add group owner as member
    const group = await prisma.secureLoginGroup.findUnique({
      where: { id: groupId },
      select: { owner_id: true },
    });

    if (group?.owner_id === user_id) {
      return NextResponse.json(
        { error: 'Group owner cannot be added as a member' },
        { status: 400 }
      );
    }

    // Add member
    const member = await prisma.secureLoginGroupMember.create({
      data: {
        group_id: groupId,
        user_id,
        role: role || 'member',
        added_by: auth.user.id,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        addedByUser: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    console.error('Error adding member:', error);
    return NextResponse.json(
      { error: 'Failed to add member' },
      { status: 500 }
    );
  }
}

// DELETE /api/secure-logins/groups/[id]/members - Remove member from group
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

    const searchParams = request.nextUrl.searchParams;
    const userId = parseInt(searchParams.get('userId') || '');

    if (isNaN(userId)) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Users can remove themselves, or managers can remove others
    const canManage = await canManageGroup(auth.user.id, groupId);
    const isSelf = userId === auth.user.id;

    if (!canManage && !isSelf) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Can't remove the owner
    const group = await prisma.secureLoginGroup.findUnique({
      where: { id: groupId },
      select: { owner_id: true },
    });

    if (group?.owner_id === userId) {
      return NextResponse.json(
        { error: 'Cannot remove the group owner' },
        { status: 400 }
      );
    }

    // Remove member
    await prisma.secureLoginGroupMember.delete({
      where: {
        group_id_user_id: {
          group_id: groupId,
          user_id: userId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing member:', error);
    return NextResponse.json(
      { error: 'Failed to remove member' },
      { status: 500 }
    );
  }
}

// PATCH /api/secure-logins/groups/[id]/members - Update member role
export async function PATCH(
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

    // Only group owner can change roles
    const group = await prisma.secureLoginGroup.findUnique({
      where: { id: groupId },
      select: { owner_id: true },
    });

    if (!group || group.owner_id !== auth.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { user_id, role } = body;

    if (!user_id || !role) {
      return NextResponse.json(
        { error: 'user_id and role are required' },
        { status: 400 }
      );
    }

    const validRoles = ['member', 'admin'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be "member" or "admin"' },
        { status: 400 }
      );
    }

    const updatedMember = await prisma.secureLoginGroupMember.update({
      where: {
        group_id_user_id: {
          group_id: groupId,
          user_id,
        },
      },
      data: { role },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(updatedMember);
  } catch (error) {
    console.error('Error updating member role:', error);
    return NextResponse.json(
      { error: 'Failed to update member role' },
      { status: 500 }
    );
  }
}
