import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getPermissions } from '@/lib/permissions';

// GET /api/platforms/[id]/access - Get all access assignments for a platform
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get user session to check permissions
    const baseUrl = process.env.NODE_ENV === 'development'
      ? 'http://localhost:3000'
      : (process.env.NEXT_PUBLIC_BASE_URL || request.url);

    const sessionRes = await fetch(new URL('/api/auth/session', baseUrl), {
      headers: {
        cookie: request.headers.get('cookie') || '',
      },
    });

    if (!sessionRes.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await sessionRes.json();

    if (!session.user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const platformId = parseInt(id);

    if (isNaN(platformId)) {
      return NextResponse.json({ error: 'Invalid platform ID' }, { status: 400 });
    }

    // Verify user has access to this platform's ecosystem
    const platform = await prisma.socialMediaPlatform.findUnique({
      where: { id: platformId },
      include: {
        ecosystem: true
      }
    });

    if (!platform) {
      return NextResponse.json({ error: 'Platform not found' }, { status: 404 });
    }

    // Check if user has access (admin or assigned to ecosystem)
    if (session.user.role !== 'admin') {
      const userEcosystem = await prisma.userEcosystem.findFirst({
        where: {
          user_id: session.user.dbId,
          ecosystem_id: platform.ecosystem_id
        }
      });

      if (!userEcosystem) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Get all access assignments for this platform
    const accessList = await prisma.platformAccess.findMany({
      where: {
        platform_id: platformId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        grantedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: [
        { access_level: 'asc' },
        { granted_at: 'desc' }
      ]
    });

    return NextResponse.json({ list: accessList });
  } catch (error) {
    console.error('Error fetching platform access:', error);
    return NextResponse.json(
      { error: 'Failed to fetch platform access' },
      { status: 500 }
    );
  }
}

// POST /api/platforms/[id]/access - Add access assignment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get user session to check permissions
    const baseUrl = process.env.NODE_ENV === 'development'
      ? 'http://localhost:3000'
      : (process.env.NEXT_PUBLIC_BASE_URL || request.url);

    const sessionRes = await fetch(new URL('/api/auth/session', baseUrl), {
      headers: {
        cookie: request.headers.get('cookie') || '',
      },
    });

    if (!sessionRes.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await sessionRes.json();

    if (!session.user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    // Check permissions - only Write+ can manage access
    const permissions = getPermissions(session.user.role);
    if (!permissions.canWrite) {
      return NextResponse.json(
        { error: 'You do not have permission to manage platform access. Required role: Write or higher.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const platformId = parseInt(id);
    const { userId, accessLevel, notes } = await request.json();

    if (isNaN(platformId) || !userId || !accessLevel) {
      return NextResponse.json(
        { error: 'Invalid platform ID, user ID, or access level' },
        { status: 400 }
      );
    }

    // Verify user has access to this platform's ecosystem
    const platform = await prisma.socialMediaPlatform.findUnique({
      where: { id: platformId },
      include: {
        ecosystem: true
      }
    });

    if (!platform) {
      return NextResponse.json({ error: 'Platform not found' }, { status: 404 });
    }

    // Check if user has access (admin or assigned to ecosystem)
    if (session.user.role !== 'admin') {
      const userEcosystem = await prisma.userEcosystem.findFirst({
        where: {
          user_id: session.user.dbId,
          ecosystem_id: platform.ecosystem_id
        }
      });

      if (!userEcosystem) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Create access assignment
    const access = await prisma.platformAccess.create({
      data: {
        platform_id: platformId,
        user_id: userId,
        access_level: accessLevel,
        granted_by: session.user.dbId,
        notes: notes || null
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        grantedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json({ success: true, access });
  } catch (error: any) {
    console.error('Error adding platform access:', error);

    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'This user already has this access level for this platform' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to add platform access' },
      { status: 500 }
    );
  }
}

// DELETE /api/platforms/[id]/access?accessId=X - Remove access assignment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get user session to check permissions
    const baseUrl = process.env.NODE_ENV === 'development'
      ? 'http://localhost:3000'
      : (process.env.NEXT_PUBLIC_BASE_URL || request.url);

    const sessionRes = await fetch(new URL('/api/auth/session', baseUrl), {
      headers: {
        cookie: request.headers.get('cookie') || '',
      },
    });

    if (!sessionRes.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await sessionRes.json();

    if (!session.user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    // Check permissions - only Write+ can manage access
    const permissions = getPermissions(session.user.role);
    if (!permissions.canWrite) {
      return NextResponse.json(
        { error: 'You do not have permission to manage platform access. Required role: Write or higher.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const platformId = parseInt(id);
    const accessId = parseInt(request.nextUrl.searchParams.get('accessId') || '');

    if (isNaN(platformId) || isNaN(accessId)) {
      return NextResponse.json(
        { error: 'Invalid platform ID or access ID' },
        { status: 400 }
      );
    }

    // Verify user has access to this platform's ecosystem
    const platform = await prisma.socialMediaPlatform.findUnique({
      where: { id: platformId },
      include: {
        ecosystem: true
      }
    });

    if (!platform) {
      return NextResponse.json({ error: 'Platform not found' }, { status: 404 });
    }

    // Check if user has access (admin or assigned to ecosystem)
    if (session.user.role !== 'admin') {
      const userEcosystem = await prisma.userEcosystem.findFirst({
        where: {
          user_id: session.user.dbId,
          ecosystem_id: platform.ecosystem_id
        }
      });

      if (!userEcosystem) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Delete access assignment
    await prisma.platformAccess.delete({
      where: {
        id: accessId,
        platform_id: platformId // Ensure it belongs to this platform
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Platform access removed successfully'
    });
  } catch (error) {
    console.error('Error removing platform access:', error);
    return NextResponse.json(
      { error: 'Failed to remove platform access' },
      { status: 500 }
    );
  }
}
