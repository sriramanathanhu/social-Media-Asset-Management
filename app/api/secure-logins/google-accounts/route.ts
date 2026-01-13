import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/utils/auth';

// GET /api/secure-logins/google-accounts - Get available Google accounts for selection
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    // Get all active email accounts that could be Google accounts
    // Filter by primary_use containing 'Google' or email ending with gmail.com/google.com
    const googleAccounts = await prisma.emailId.findMany({
      where: {
        status: 'active',
        OR: [
          { primary_use: { contains: 'Google', mode: 'insensitive' } },
          { primary_use: { contains: 'Gmail', mode: 'insensitive' } },
          { email_address: { endsWith: '@gmail.com' } },
          { email_address: { contains: 'google', mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        email_address: true,
        ecosystem_name: true,
        primary_use: true,
        notes: true,
      },
      orderBy: { email_address: 'asc' },
    });

    return NextResponse.json({ accounts: googleAccounts });
  } catch (error) {
    console.error('Error fetching Google accounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Google accounts' },
      { status: 500 }
    );
  }
}
