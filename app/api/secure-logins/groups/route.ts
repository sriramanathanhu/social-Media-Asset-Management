import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/utils/auth';

// GET /api/secure-logins/groups - List groups user owns or is member of
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';

    const skip = (page - 1) * limit;

    // Get groups the user owns
    const ownedGroupIds = await prisma.secureLoginGroup.findMany({
      where: { owner_id: auth.user.id },
      select: { id: true },
    });

    // Get groups the user is a member of
    const memberGroupIds = await prisma.secureLoginGroupMember.findMany({
      where: { user_id: auth.user.id },
      select: { group_id: true },
    });

    const allGroupIds = [
      ...ownedGroupIds.map((g) => g.id),
      ...memberGroupIds.map((g) => g.group_id),
    ];

    // Remove duplicates
    const uniqueGroupIds = [...new Set(allGroupIds)];

    if (uniqueGroupIds.length === 0) {
      return NextResponse.json({
        list: [],
        pagination: { total: 0, page, limit, totalPages: 0 },
      });
    }

    // Build where clause
    interface WhereClause {
      id: { in: number[] };
      OR?: Array<{ name?: { contains: string; mode: 'insensitive' }; description?: { contains: string; mode: 'insensitive' } }>;
    }

    const where: WhereClause = {
      id: { in: uniqueGroupIds },
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get total count
    const total = await prisma.secureLoginGroup.count({ where });

    // Get paginated groups
    const groups = await prisma.secureLoginGroup.findMany({
      where,
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
          take: 10, // Limit members for list view
        },
        _count: {
          select: { members: true, loginAccess: true },
        },
      },
      orderBy: { updated_at: 'desc' },
      skip,
      take: limit,
    });

    // Add role info for each group and format for frontend
    const groupsWithRole = groups.map((group) => ({
      ...group,
      created_by: group.owner, // Alias owner as created_by for frontend
      isOwner: group.owner_id === auth.user.id,
      isAdmin: group.owner_id === auth.user.id, // Owner is admin
      memberCount: group._count.members,
      sharedLoginsCount: group._count.loginAccess,
      _count: {
        members: group._count.members,
        group_access: group._count.loginAccess, // Rename for frontend compatibility
      },
    }));

    return NextResponse.json({
      list: groupsWithRole,
      groups: groupsWithRole, // Also include as 'groups' for frontend compatibility
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching groups:', error);
    return NextResponse.json(
      { error: 'Failed to fetch groups' },
      { status: 500 }
    );
  }
}

// POST /api/secure-logins/groups - Create a new group
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Group name is required' },
        { status: 400 }
      );
    }

    // Check if group with same name already exists for this user
    const existing = await prisma.secureLoginGroup.findFirst({
      where: {
        name,
        owner_id: auth.user.id,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'You already have a group with this name' },
        { status: 400 }
      );
    }

    // Create the group
    const group = await prisma.secureLoginGroup.create({
      data: {
        name,
        description: description || null,
        owner_id: auth.user.id,
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

    return NextResponse.json(
      {
        group: {
          ...group,
          isOwner: true,
          memberCount: 0,
          sharedLoginsCount: 0,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating group:', error);
    return NextResponse.json(
      { error: 'Failed to create group' },
      { status: 500 }
    );
  }
}
