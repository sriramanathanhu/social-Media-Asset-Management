import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/utils/auth';

// GET /api/resources/[id] - Get a specific resource
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error },
        { status: 401 }
      );
    }

    const resourceId = parseInt(params.id);

    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
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

    if (!resource) {
      return NextResponse.json(
        { error: 'Resource not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(resource);
  } catch (error) {
    console.error('Error fetching resource:', error);
    return NextResponse.json(
      { error: 'Failed to fetch resource' },
      { status: 500 }
    );
  }
}

// PUT /api/resources/[id] - Update a resource
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error },
        { status: 401 }
      );
    }

    const resourceId = parseInt(params.id);
    const body = await request.json();

    // Check if resource exists and user is the author or admin
    const existingResource = await prisma.resource.findUnique({
      where: { id: resourceId }
    });

    if (!existingResource) {
      return NextResponse.json(
        { error: 'Resource not found' },
        { status: 404 }
      );
    }

    if (existingResource.author_id !== auth.user.id && auth.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized to update this resource' },
        { status: 403 }
      );
    }

    const updated = await prisma.resource.update({
      where: { id: resourceId },
      data: {
        title: body.title,
        content: body.content,
        category: body.category,
        published: body.published
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

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating resource:', error);
    return NextResponse.json(
      { error: 'Failed to update resource' },
      { status: 500 }
    );
  }
}

// DELETE /api/resources/[id] - Delete a resource
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error },
        { status: 401 }
      );
    }

    const resourceId = parseInt(params.id);

    // Check if resource exists and user is the author or admin
    const existingResource = await prisma.resource.findUnique({
      where: { id: resourceId }
    });

    if (!existingResource) {
      return NextResponse.json(
        { error: 'Resource not found' },
        { status: 404 }
      );
    }

    if (existingResource.author_id !== auth.user.id && auth.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized to delete this resource' },
        { status: 403 }
      );
    }

    await prisma.resource.delete({
      where: { id: resourceId }
    });

    return NextResponse.json({ message: 'Resource deleted successfully' });
  } catch (error) {
    console.error('Error deleting resource:', error);
    return NextResponse.json(
      { error: 'Failed to delete resource' },
      { status: 500 }
    );
  }
}
