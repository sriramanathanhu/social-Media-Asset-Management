import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { encrypt, decrypt } from '@/lib/utils/encryption';
import { requireAuth } from '@/lib/utils/auth';
import { getSecureLoginAccess, canEditSecureLogin, isSecureLoginOwner } from '@/lib/secureLoginPermissions';
import { logSecureLoginUpdate, logSecureLoginDelete, extractSecureLoginChanges } from '@/lib/secureLoginAudit';

// GET /api/secure-logins/[id] - Get a single secure login
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const { id } = await params;
    const secureLoginId = parseInt(id);

    if (isNaN(secureLoginId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    // Check access
    const access = await getSecureLoginAccess(auth.user.id, secureLoginId);
    if (!access.canAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get the secure login
    const secureLogin = await prisma.secureLogin.findUnique({
      where: { id: secureLoginId },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        googleAccount: {
          select: { id: true, email_address: true },
        },
        userAccess: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
            grantedByUser: {
              select: { id: true, name: true },
            },
          },
        },
        groupAccess: {
          include: {
            group: {
              select: { id: true, name: true },
            },
            grantedByUser: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!secureLogin) {
      return NextResponse.json({ error: 'Secure login not found' }, { status: 404 });
    }

    // Return with decrypted fields wrapped in secureLogin object
    return NextResponse.json({
      secureLogin: {
        ...secureLogin,
        username: secureLogin.username ? decrypt(secureLogin.username) : '',
        password: secureLogin.password ? decrypt(secureLogin.password) : '',
        totp_secret: secureLogin.totp_secret ? decrypt(secureLogin.totp_secret) : '',
        // Map database field names to frontend expected names
        linked_google_account_id: secureLogin.google_account_id,
        linked_google_account: secureLogin.googleAccount,
        creator: secureLogin.owner,
      },
      accessLevel: access.level,
    });
  } catch (error) {
    console.error('Error fetching secure login:', error);
    return NextResponse.json(
      { error: 'Failed to fetch secure login' },
      { status: 500 }
    );
  }
}

// PUT /api/secure-logins/[id] - Update a secure login
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const { id } = await params;
    const secureLoginId = parseInt(id);

    if (isNaN(secureLoginId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    // Check edit permission
    const canEdit = await canEditSecureLogin(auth.user.id, secureLoginId);
    if (!canEdit) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const {
      item_name,
      username,
      password,
      totp_secret,
      website_url,
      notes,
      login_type,
      google_account_id,
      linked_google_account_id, // Also accept this field name from frontend
    } = body;

    // Use either field name for google account id
    const googleAccountId = google_account_id ?? linked_google_account_id;

    // Validate login type if provided
    if (login_type) {
      const validLoginTypes = ['email_password', 'google_oauth'];
      if (!validLoginTypes.includes(login_type)) {
        return NextResponse.json(
          { error: 'Invalid login type' },
          { status: 400 }
        );
      }
    }

    // If google_oauth, validate google_account_id exists
    if (login_type === 'google_oauth' && googleAccountId) {
      const googleAccount = await prisma.emailId.findUnique({
        where: { id: googleAccountId },
      });
      if (!googleAccount) {
        return NextResponse.json(
          { error: 'Invalid Google account' },
          { status: 400 }
        );
      }
    }

    // Get current data for change tracking
    const currentLogin = await prisma.secureLogin.findUnique({
      where: { id: secureLoginId },
    });

    if (!currentLogin) {
      return NextResponse.json({ error: 'Secure login not found' }, { status: 404 });
    }

    // Build update data
    interface UpdateData {
      item_name?: string;
      username?: string | null;
      password?: string | null;
      totp_secret?: string | null;
      website_url?: string | null;
      notes?: string | null;
      login_type?: string;
      google_account_id?: number | null;
      updated_at: Date;
    }

    const updateData: UpdateData = {
      updated_at: new Date(),
    };

    if (item_name !== undefined) updateData.item_name = item_name;
    if (username !== undefined) updateData.username = username ? encrypt(username) : null;
    if (password !== undefined) updateData.password = password ? encrypt(password) : null;
    if (totp_secret !== undefined) updateData.totp_secret = totp_secret ? encrypt(totp_secret) : null;
    if (website_url !== undefined) updateData.website_url = website_url || null;
    if (notes !== undefined) updateData.notes = notes || null;
    if (login_type !== undefined) updateData.login_type = login_type;
    if (googleAccountId !== undefined) updateData.google_account_id = googleAccountId || null;

    // Update the secure login
    const updatedLogin = await prisma.secureLogin.update({
      where: { id: secureLoginId },
      data: updateData,
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        googleAccount: {
          select: { id: true, email_address: true },
        },
      },
    });

    // Log changes
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
    const userAgent = request.headers.get('user-agent') || undefined;

    // Prepare old data with decrypted values for comparison
    const oldData = {
      ...currentLogin,
      username: currentLogin.username ? decrypt(currentLogin.username) : '',
      password: currentLogin.password ? decrypt(currentLogin.password) : '',
      totp_secret: currentLogin.totp_secret ? decrypt(currentLogin.totp_secret) : '',
    };

    const newData = {
      item_name: item_name ?? oldData.item_name,
      username: username ?? oldData.username,
      password: password ?? oldData.password,
      totp_secret: totp_secret ?? oldData.totp_secret,
      website_url: website_url ?? oldData.website_url,
      notes: notes ?? oldData.notes,
      login_type: login_type ?? oldData.login_type,
      google_account_id: googleAccountId ?? oldData.google_account_id,
    };

    const changes = extractSecureLoginChanges(oldData, newData);
    for (const change of changes) {
      await logSecureLoginUpdate(
        secureLoginId,
        change.field,
        change.oldValue,
        change.newValue,
        auth.user.id,
        ipAddress,
        userAgent
      );
    }

    // Get access level for response
    const access = await getSecureLoginAccess(auth.user.id, secureLoginId);

    return NextResponse.json({
      secureLogin: {
        ...updatedLogin,
        username: updatedLogin.username ? decrypt(updatedLogin.username) : '',
        password: updatedLogin.password ? decrypt(updatedLogin.password) : '',
        totp_secret: updatedLogin.totp_secret ? decrypt(updatedLogin.totp_secret) : '',
        // Map database field names to frontend expected names
        linked_google_account_id: updatedLogin.google_account_id,
        linked_google_account: updatedLogin.googleAccount,
        creator: updatedLogin.owner,
      },
      accessLevel: access.level,
    });
  } catch (error) {
    console.error('Error updating secure login:', error);
    return NextResponse.json(
      { error: 'Failed to update secure login' },
      { status: 500 }
    );
  }
}

// DELETE /api/secure-logins/[id] - Delete a secure login (owner only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const { id } = await params;
    const secureLoginId = parseInt(id);

    if (isNaN(secureLoginId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    // Only owner can delete
    const isOwner = await isSecureLoginOwner(auth.user.id, secureLoginId);
    if (!isOwner) {
      return NextResponse.json(
        { error: 'Only the owner can delete this item' },
        { status: 403 }
      );
    }

    // Log deletion before deleting
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
    const userAgent = request.headers.get('user-agent') || undefined;
    await logSecureLoginDelete(secureLoginId, auth.user.id, ipAddress, userAgent);

    // Delete (cascade will handle related records)
    await prisma.secureLogin.delete({
      where: { id: secureLoginId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting secure login:', error);
    return NextResponse.json(
      { error: 'Failed to delete secure login' },
      { status: 500 }
    );
  }
}
