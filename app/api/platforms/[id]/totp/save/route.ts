import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { encrypt } from '@/lib/utils/encryption';
import { verifyTOTP } from '@/lib/utils/totp';

// PUT /api/platforms/[id]/totp/save - Save TOTP secret from social media platform
export async function PUT(
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

    const body = await request.json();
    const { secret } = body;

    if (!secret || typeof secret !== 'string') {
      return NextResponse.json(
        { error: 'TOTP secret is required' },
        { status: 400 }
      );
    }

    // Validate the secret by trying to generate a token
    try {
      // Test if the secret is valid by attempting to generate a token
      verifyTOTP('000000', secret); // This will fail but validates the secret format
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid TOTP secret format' },
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

    // Encrypt and save the TOTP secret
    const encryptedSecret = encrypt(secret);

    await prisma.socialMediaPlatform.update({
      where: { id: platformId },
      data: {
        totp_enabled: true,
        totp_secret: encryptedSecret,
        updated_at: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'TOTP secret saved successfully'
    });
  } catch (error) {
    console.error('Error saving TOTP secret:', error);
    return NextResponse.json(
      { error: 'Failed to save TOTP secret' },
      { status: 500 }
    );
  }
}
