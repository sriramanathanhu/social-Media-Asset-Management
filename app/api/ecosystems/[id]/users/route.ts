import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

// POST /api/ecosystems/[id]/users - Assign user to ecosystem
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ecosystemId = parseInt(params.id);
    const { userId } = await request.json();

    if (isNaN(ecosystemId) || !userId) {
      return NextResponse.json(
        { error: 'Invalid ecosystem ID or user ID' },
        { status: 400 }
      );
    }

    // Check authentication
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
    if (!session.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can assign users' }, { status: 403 });
    }

    // Check if assignment already exists
    const existing = await prisma.userEcosystem.findFirst({
      where: {
        user_id: userId,
        ecosystem_id: ecosystemId
      }
    });

    if (existing) {
      return NextResponse.json(
        { error: 'User is already assigned to this ecosystem' },
        { status: 400 }
      );
    }

    // Create assignment
    const assignment = await prisma.userEcosystem.create({
      data: {
        user_id: userId,
        ecosystem_id: ecosystemId,
        assigned_by: session.user.dbId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      assignment
    });

  } catch (error) {
    console.error('Error assigning user:', error);
    return NextResponse.json(
      { error: 'Failed to assign user' },
      { status: 500 }
    );
  }
}

// DELETE /api/ecosystems/[id]/users?userId=X - Unassign user from ecosystem
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ecosystemId = parseInt(params.id);
    const userId = parseInt(request.nextUrl.searchParams.get('userId') || '');

    if (isNaN(ecosystemId) || isNaN(userId)) {
      return NextResponse.json(
        { error: 'Invalid ecosystem ID or user ID' },
        { status: 400 }
      );
    }

    // Check authentication
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
    if (!session.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can unassign users' }, { status: 403 });
    }

    // Delete assignment
    await prisma.userEcosystem.deleteMany({
      where: {
        user_id: userId,
        ecosystem_id: ecosystemId
      }
    });

    return NextResponse.json({
      success: true,
      message: 'User unassigned successfully'
    });

  } catch (error) {
    console.error('Error unassigning user:', error);
    return NextResponse.json(
      { error: 'Failed to unassign user' },
      { status: 500 }
    );
  }
}
