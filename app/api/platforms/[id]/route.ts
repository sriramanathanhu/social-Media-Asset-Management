import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { encrypt, decrypt } from '@/lib/utils/encryption';
import { getPermissions, canAccessEcosystem } from '@/lib/permissions';
import { extractPlatformChanges, logPlatformUpdate, logPlatformDelete } from '@/lib/audit';

// GET /api/platforms/[id] - Get a specific platform
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
    
    if (!id || id === 'undefined') {
      return NextResponse.json(
        { error: 'Invalid platform ID' },
        { status: 400 }
      );
    }
    
    const platformId = parseInt(id);
    if (isNaN(platformId)) {
      return NextResponse.json(
        { error: 'Invalid platform ID format' },
        { status: 400 }
      );
    }
    
    // Get platform with ecosystem info
    const platform = await prisma.socialMediaPlatform.findUnique({
      where: { id: platformId },
      include: {
        ecosystem: true
      }
    });
    
    if (!platform) {
      return NextResponse.json(
        { error: 'Platform not found' },
        { status: 404 }
      );
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
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
    }
    
    // Decrypt sensitive fields
    const decryptedPlatform = {
      ...platform,
      username: platform.username ? decrypt(platform.username) : '',
      password: platform.password ? decrypt(platform.password) : '',
      totp_secret: platform.totp_secret ? decrypt(platform.totp_secret) : '',
    };
    
    return NextResponse.json(decryptedPlatform);
  } catch (error) {
    console.error('Error fetching platform:', error);
    return NextResponse.json(
      { error: 'Failed to fetch platform' },
      { status: 500 }
    );
  }
}

// PUT /api/platforms/[id] - Update a platform
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
    
    if (!id || id === 'undefined') {
      return NextResponse.json(
        { error: 'Invalid platform ID' },
        { status: 400 }
      );
    }
    
    const platformId = parseInt(id);
    if (isNaN(platformId)) {
      return NextResponse.json(
        { error: 'Invalid platform ID format' },
        { status: 400 }
      );
    }
    
    // Check if platform exists and user has access
    const platform = await prisma.socialMediaPlatform.findUnique({
      where: { id: platformId }
    });
    
    if (!platform) {
      return NextResponse.json(
        { error: 'Platform not found' },
        { status: 404 }
      );
    }
    
    // Check permissions
    const permissions = getPermissions(session.user.role);

    // Check if user can write
    if (!permissions.canWrite) {
      return NextResponse.json(
        { error: 'You do not have permission to edit platforms. Required role: Write or higher.' },
        { status: 403 }
      );
    }

    // Check if user has access to this ecosystem
    if (session.user.role !== 'admin') {
      const userEcosystems = await prisma.userEcosystem.findMany({
        where: { user_id: session.user.dbId },
        select: { ecosystem_id: true }
      });

      const ecosystemIds = userEcosystems.map(ue => ue.ecosystem_id);

      if (!canAccessEcosystem(session.user.role, ecosystemIds, platform.ecosystem_id)) {
        return NextResponse.json(
          { error: 'Access denied to this ecosystem' },
          { status: 403 }
        );
      }
    }

    const body = await request.json();

    // Get old platform data for audit logging
    const oldPlatform = { ...platform };
    const { username, password, changed_by, ...otherFields } = body;
    
    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      interface UpdateData {
        updated_at: Date;
        username?: string;
        password?: string;
        [key: string]: unknown;
      }
      
      const updateData: UpdateData = {
        ...otherFields,
        updated_at: new Date(),
      };
      
      // Track credential changes
      const historyRecords = [];
      
      if (username !== undefined && username !== decrypt(platform.username || '')) {
        updateData.username = encrypt(username);
        historyRecords.push({
          platform_id: platformId,
          field_name: 'username',
          old_value: platform.username,
          new_value: updateData.username,
          changed_by: changed_by || session.user.dbId || null,
          changed_at: new Date(),
        });
      }
      
      if (password !== undefined && password !== decrypt(platform.password || '')) {
        updateData.password = encrypt(password);
        historyRecords.push({
          platform_id: platformId,
          field_name: 'password',
          old_value: platform.password,
          new_value: updateData.password,
          changed_by: changed_by || session.user.dbId || null,
          changed_at: new Date(),
        });
      }
      
      if (otherFields.profile_id !== undefined && otherFields.profile_id !== platform.profile_id) {
        historyRecords.push({
          platform_id: platformId,
          field_name: 'profile_id',
          old_value: platform.profile_id,
          new_value: otherFields.profile_id,
          changed_by: changed_by || session.user.dbId || null,
          changed_at: new Date(),
        });
      }
      
      // Update platform
      const updated = await tx.socialMediaPlatform.update({
        where: { id: platformId },
        data: updateData
      });
      
      // Save history records
      if (historyRecords.length > 0) {
        await tx.credentialHistory.createMany({
          data: historyRecords
        });
      }
      
      return updated;
    });

    // Log all changes to audit log
    const changes = extractPlatformChanges(oldPlatform, result);
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
    const userAgent = request.headers.get('user-agent') || undefined;

    for (const change of changes) {
      await logPlatformUpdate(
        platformId,
        change.field,
        change.oldValue,
        change.newValue,
        session.user.dbId,
        session.user.role,
        ipAddress,
        userAgent
      );
    }

    // Return decrypted data
    return NextResponse.json({
      ...result,
      username: result.username ? decrypt(result.username) : '',
      password: result.password ? decrypt(result.password) : '',
    });
  } catch (error) {
    console.error('Error updating platform:', error);
    return NextResponse.json(
      { error: 'Failed to update platform' },
      { status: 500 }
    );
  }
}

// DELETE /api/platforms/[id] - Delete a platform
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

    // Check permissions
    const permissions = getPermissions(session.user.role);

    if (!permissions.canDeletePlatforms) {
      return NextResponse.json(
        { error: 'Only admin users can delete platforms' },
        { status: 403 }
      );
    }
    
    const { id } = await params;
    
    if (!id || id === 'undefined') {
      return NextResponse.json(
        { error: 'Invalid platform ID' },
        { status: 400 }
      );
    }
    
    const platformId = parseInt(id);
    if (isNaN(platformId)) {
      return NextResponse.json(
        { error: 'Invalid platform ID format' },
        { status: 400 }
      );
    }
    
    // Log deletion before deleting
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
    const userAgent = request.headers.get('user-agent') || undefined;

    await logPlatformDelete(
      platformId,
      session.user.dbId,
      session.user.role,
      ipAddress,
      userAgent
    );

    // Use transaction to delete platform and related data
    await prisma.$transaction(async (tx) => {
      // Delete credential history
      await tx.credentialHistory.deleteMany({
        where: { platform_id: platformId }
      });

      // Delete audit logs
      await tx.platformAuditLog.deleteMany({
        where: { platform_id: platformId }
      });

      // Delete the platform
      await tx.socialMediaPlatform.delete({
        where: { id: platformId }
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting platform:', error);
    return NextResponse.json(
      { error: 'Failed to delete platform' },
      { status: 500 }
    );
  }
}