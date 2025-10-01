import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { decrypt } from '@/lib/utils/encryption';
import { generateTOTPToken } from '@/lib/utils/totp';

// GET /api/platforms/[id]/totp/generate - Generate current TOTP code
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

    const { id } = await params;
    const platformId = parseInt(id);

    if (isNaN(platformId)) {
      return NextResponse.json(
        { error: 'Invalid platform ID' },
        { status: 400 }
      );
    }

    // Get platform
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

    // Check if TOTP is enabled
    if (!platform.totp_enabled || !platform.totp_secret) {
      return NextResponse.json(
        { error: 'TOTP is not enabled for this platform' },
        { status: 400 }
      );
    }

    // Decrypt the secret and generate current token
    const secret = decrypt(platform.totp_secret);
    const token = generateTOTPToken(secret);

    // Calculate time remaining until next token
    const epoch = Math.floor(Date.now() / 1000);
    const timeRemaining = 30 - (epoch % 30);

    return NextResponse.json({
      token,
      timeRemaining
    });
  } catch (error) {
    console.error('Error generating TOTP token:', error);
    return NextResponse.json(
      { error: 'Failed to generate TOTP token' },
      { status: 500 }
    );
  }
}
