import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

// DELETE /api/platforms/[id]/totp/disable - Disable TOTP for a platform
export async function DELETE(
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

    const { id } = await params;
    const platformId = parseInt(id);

    if (isNaN(platformId)) {
      return NextResponse.json(
        { error: 'Invalid platform ID' },
        { status: 400 }
      );
    }

    // Check if platform exists
    const platform = await prisma.socialMediaPlatform.findUnique({
      where: { id: platformId }
    });

    if (!platform) {
      return NextResponse.json(
        { error: 'Platform not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this ecosystem
    if (session.user.role !== 'admin') {
      const userEcosystem = await prisma.userEcosystem.findFirst({
        where: {
          user_id: session.user.dbId,
          ecosystem_id: platform.ecosystem_id
        }
      });

      if (!userEcosystem) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
    }

    // Disable TOTP
    await prisma.socialMediaPlatform.update({
      where: { id: platformId },
      data: {
        totp_enabled: false,
        totp_secret: null,
        updated_at: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'TOTP disabled successfully'
    });
  } catch (error) {
    console.error('Error disabling TOTP:', error);
    return NextResponse.json(
      { error: 'Failed to disable TOTP' },
      { status: 500 }
    );
  }
}
