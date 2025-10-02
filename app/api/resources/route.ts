import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/utils/auth';

// GET /api/resources - List all resources
export async function GET(request: NextRequest) {
  try {
    // Get user session
    const auth = await requireAuth();
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const published = searchParams.get('published');

    const skip = (page - 1) * limit;

    interface WhereClause {
      OR?: Array<{ title?: { contains: string; mode: 'insensitive' } | undefined; content?: { contains: string; mode: 'insensitive' } | undefined }>;
      category?: string;
      published?: boolean;
    }

    const where: WhereClause = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (category && category !== 'all') {
      where.category = category;
    }

    if (published !== null && published !== '') {
      where.published = published === 'true';
    }

    // Get total count for pagination
    const total = await prisma.resource.count({ where });

    // Get paginated resources
    const resources = await prisma.resource.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      },
      skip,
      take: limit
    });

    return NextResponse.json({
      list: resources,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching resources:', error);
    return NextResponse.json(
      { error: 'Failed to fetch resources' },
      { status: 500 }
    );
  }
}

// POST /api/resources - Create a new resource
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error },
        { status: 401 }
      );
    }

    const body = await request.json();

    const resource = await prisma.resource.create({
      data: {
        title: body.title,
        content: body.content,
        category: body.category || 'sop',
        published: body.published || false,
        author_id: auth.user.id
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json(resource, { status: 201 });
  } catch (error) {
    console.error('Error creating resource:', error);

    return NextResponse.json(
      { error: 'Failed to create resource' },
      { status: 500 }
    );
  }
}
