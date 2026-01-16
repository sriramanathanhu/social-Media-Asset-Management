import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/utils/auth';
import { isSecureLoginOwner, getSecureLoginAccess } from '@/lib/secureLoginPermissions';
import { logSecureLoginAccessGranted, logSecureLoginAccessRevoked } from '@/lib/secureLoginAudit';

// GET /api/secure-logins/[id]/access - Get all access for a secure login
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
    const secureLoginId = parseInt(id);

    if (isNaN(secureLoginId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    // Anyone with access can view access list (for transparency)
    const access = await getSecureLoginAccess(auth.user.id, secureLoginId);
    if (!access.canAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get user access
    const userAccess = await prisma.secureLoginUserAccess.findMany({
      where: { secure_login_id: secureLoginId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        grantedByUser: {
          select: { id: true, name: true },
        },
      },
      orderBy: { granted_at: 'desc' },
    });

    // Get group access
    const groupAccess = await prisma.secureLoginGroupAccess.findMany({
      where: { secure_login_id: secureLoginId },
      include: {
        group: {
          include: {
            _count: { select: { members: true } },
          },
        },
        grantedByUser: {
          select: { id: true, name: true },
        },
      },
      orderBy: { granted_at: 'desc' },
    });

    return NextResponse.json({
      userAccess,
      groupAccess,
    });
  } catch (error) {
    console.error('Error fetching access:', error);
    return NextResponse.json(
      { error: 'Failed to fetch access' },
      { status: 500 }
    );
  }
}

// POST /api/secure-logins/[id]/access - Grant access to user or group
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
    const secureLoginId = parseInt(id);

    if (isNaN(secureLoginId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    // Only owner can grant access
    const isOwner = await isSecureLoginOwner(auth.user.id, secureLoginId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { type, target_id, access_level } = body;

    // Validate input
    if (!type || !target_id || !access_level) {
      return NextResponse.json(
        { error: 'type, target_id, and access_level are required' },
        { status: 400 }
      );
    }

    if (!['user', 'group'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be "user" or "group"' },
        { status: 400 }
      );
    }

    if (!['read', 'edit'].includes(access_level)) {
      return NextResponse.json(
        { error: 'Invalid access_level. Must be "read" or "edit"' },
        { status: 400 }
      );
    }

    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
    const userAgent = request.headers.get('user-agent') || undefined;

    if (type === 'user') {
      // Can't share with yourself
      if (target_id === auth.user.id) {
        return NextResponse.json(
          { error: 'Cannot share with yourself' },
          { status: 400 }
        );
      }

      // Verify user exists
      const targetUser = await prisma.user.findUnique({
        where: { id: target_id },
      });
      if (!targetUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Create or update user access
      const access = await prisma.secureLoginUserAccess.upsert({
        where: {
          secure_login_id_user_id: {
            secure_login_id: secureLoginId,
            user_id: target_id,
          },
        },
        create: {
          secure_login_id: secureLoginId,
          user_id: target_id,
          access_level,
          granted_by: auth.user.id,
        },
        update: {
          access_level,
          granted_by: auth.user.id,
          granted_at: new Date(),
        },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      await logSecureLoginAccessGranted(
        secureLoginId,
        'user',
        target_id,
        access_level,
        auth.user.id,
        ipAddress,
        userAgent
      );

      return NextResponse.json(access, { status: 201 });
    } else {
      // type === 'group'
      // Verify group exists and user has access to it
      const group = await prisma.secureLoginGroup.findUnique({
        where: { id: target_id },
      });
      if (!group) {
        return NextResponse.json({ error: 'Group not found' }, { status: 404 });
      }

      // Create or update group access
      const access = await prisma.secureLoginGroupAccess.upsert({
        where: {
          secure_login_id_group_id: {
            secure_login_id: secureLoginId,
            group_id: target_id,
          },
        },
        create: {
          secure_login_id: secureLoginId,
          group_id: target_id,
          access_level,
          granted_by: auth.user.id,
        },
        update: {
          access_level,
          granted_by: auth.user.id,
          granted_at: new Date(),
        },
        include: {
          group: {
            select: { id: true, name: true },
          },
        },
      });

      await logSecureLoginAccessGranted(
        secureLoginId,
        'group',
        target_id,
        access_level,
        auth.user.id,
        ipAddress,
        userAgent
      );

      return NextResponse.json(access, { status: 201 });
    }
  } catch (error) {
    console.error('Error granting access:', error);
    return NextResponse.json(
      { error: 'Failed to grant access' },
      { status: 500 }
    );
  }
}

// DELETE /api/secure-logins/[id]/access - Revoke access
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
    const secureLoginId = parseInt(id);

    if (isNaN(secureLoginId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    // Only owner can revoke access
    const isOwner = await isSecureLoginOwner(auth.user.id, secureLoginId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const targetId = parseInt(searchParams.get('targetId') || '');

    if (!type || isNaN(targetId)) {
      return NextResponse.json(
        { error: 'type and targetId are required' },
        { status: 400 }
      );
    }

    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
    const userAgent = request.headers.get('user-agent') || undefined;

    if (type === 'user') {
      await prisma.secureLoginUserAccess.delete({
        where: {
          secure_login_id_user_id: {
            secure_login_id: secureLoginId,
            user_id: targetId,
          },
        },
      });

      await logSecureLoginAccessRevoked(
        secureLoginId,
        'user',
        targetId,
        auth.user.id,
        ipAddress,
        userAgent
      );
    } else if (type === 'group') {
      await prisma.secureLoginGroupAccess.delete({
        where: {
          secure_login_id_group_id: {
            secure_login_id: secureLoginId,
            group_id: targetId,
          },
        },
      });

      await logSecureLoginAccessRevoked(
        secureLoginId,
        'group',
        targetId,
        auth.user.id,
        ipAddress,
        userAgent
      );
    } else {
      return NextResponse.json(
        { error: 'Invalid type. Must be "user" or "group"' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error revoking access:', error);
    return NextResponse.json(
      { error: 'Failed to revoke access' },
      { status: 500 }
    );
  }
}
