import { NextRequest, NextResponse } from 'next/server';
import { getPlatformAuditLogs } from '@/lib/audit';
import { getPermissions } from '@/lib/permissions';
import { prisma } from '@/lib/db/prisma';

// GET /api/platforms/[id]/audit - Get audit logs for a platform
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get user session to check permissions
    const baseUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : (process.env.NEXT_PUBLIC_BASE_URL || request.url);
    const sessionRes = await fetch(new URL('/api/auth/session', baseUrl), {
      headers: {
        cookie: request.headers.get('cookie') || '',
      },
    });

    if (!sessionRes.ok) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const session = await sessionRes.json();

    if (!session.user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Check permissions
    const permissions = getPermissions(session.user.role);

    if (!permissions.canViewAuditLogs) {
      return NextResponse.json(
        { error: 'You do not have permission to view audit logs. Required role: Write or higher.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const platformId = parseInt(id);

    if (isNaN(platformId)) {
      return NextResponse.json(
        { error: 'Invalid platform ID' },
        { status: 400 }
      );
    }

    // Verify user has access to this platform's ecosystem
    const platform = await prisma.socialMediaPlatform.findUnique({
      where: { id: platformId },
      include: {
        ecosystem: {
          include: {
            userEcosystems: {
              where: {
                user_id: session.user.dbId
              }
            }
          }
        }
      }
    });

    if (!platform) {
      return NextResponse.json(
        { error: 'Platform not found' },
        { status: 404 }
      );
    }

    // Check if user has access (admin or assigned to ecosystem)
    if (session.user.role !== 'admin' && platform.ecosystem.userEcosystems.length === 0) {
      return NextResponse.json(
        { error: 'Access denied to this ecosystem' },
        { status: 403 }
      );
    }

    // Get audit logs
    const logs = await getPlatformAuditLogs(platformId, 100);

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}
