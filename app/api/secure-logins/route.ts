import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { encrypt, decrypt } from '@/lib/utils/encryption';
import { requireAuth } from '@/lib/utils/auth';
import { getAccessibleSecureLogins, getSecureLoginAccess } from '@/lib/secureLoginPermissions';
import { logSecureLoginCreate } from '@/lib/secureLoginAudit';

// GET /api/secure-logins - List secure logins accessible by the user
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
    const loginType = searchParams.get('loginType') || '';
    const accessFilter = searchParams.get('access') || ''; // owned, shared, all
    const folderId = searchParams.get('folder_id'); // Filter by folder

    const skip = (page - 1) * limit;

    // Get IDs of all accessible secure logins for this user
    const accessibleIds = await getAccessibleSecureLogins(auth.user.id);

    if (accessibleIds.length === 0) {
      return NextResponse.json({
        list: [],
        folders: [],
        pagination: { total: 0, page, limit, totalPages: 0 },
      });
    }

    // Build where clause
    interface WhereClause {
      id: { in: number[] };
      OR?: Array<{ item_name?: { contains: string; mode: 'insensitive' }; website_url?: { contains: string; mode: 'insensitive' } }>;
      login_type?: string;
      owner_id?: number | { not: number };
      folder_id?: number | null;
    }

    const where: WhereClause = {
      id: { in: accessibleIds },
    };

    // Apply search filter
    if (search) {
      where.OR = [
        { item_name: { contains: search, mode: 'insensitive' } },
        { website_url: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Apply login type filter
    if (loginType) {
      where.login_type = loginType;
    }

    // Apply access filter (owned vs shared)
    if (accessFilter === 'owned') {
      where.owner_id = auth.user.id;
    } else if (accessFilter === 'shared') {
      where.owner_id = { not: auth.user.id };
    }

    // Apply folder filter
    if (folderId === 'null' || folderId === 'root') {
      where.folder_id = null; // Root level (unfiled) logins
    } else if (folderId) {
      where.folder_id = parseInt(folderId);
    }

    // Get total count
    const total = await prisma.secureLogin.count({ where });

    // Get paginated secure logins
    const secureLogins = await prisma.secureLogin.findMany({
      where,
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        googleAccount: {
          select: { id: true, email_address: true },
        },
        folder: {
          select: { id: true, name: true, color: true, icon: true },
        },
      },
      orderBy: { updated_at: 'desc' },
      skip,
      take: limit,
    });

    // Get user's folders for the sidebar
    const folders = await prisma.secureLoginFolder.findMany({
      where: { owner_id: auth.user.id },
      include: {
        _count: {
          select: { logins: true, children: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Process results: decrypt sensitive fields and add access level
    const processedLogins = await Promise.all(
      secureLogins.map(async (login) => {
        const access = await getSecureLoginAccess(auth.user.id, login.id);
        return {
          ...login,
          username: login.username ? decrypt(login.username) : '',
          password: login.password ? decrypt(login.password) : '',
          totp_secret: login.totp_secret ? decrypt(login.totp_secret) : '',
          accessLevel: access.level,
        };
      })
    );

    return NextResponse.json({
      list: processedLogins,
      folders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching secure logins:', error);
    return NextResponse.json(
      { error: 'Failed to fetch secure logins' },
      { status: 500 }
    );
  }
}

// POST /api/secure-logins - Create a new secure login
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
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
      folder_id,
    } = body;

    // Use either field name for google account id
    const googleAccountId = google_account_id || linked_google_account_id;

    // Validate folder if provided
    if (folder_id) {
      const folder = await prisma.secureLoginFolder.findFirst({
        where: { id: folder_id, owner_id: auth.user.id },
      });
      if (!folder) {
        return NextResponse.json(
          { error: 'Invalid folder' },
          { status: 400 }
        );
      }
    }

    // Validate required fields
    if (!item_name) {
      return NextResponse.json(
        { error: 'Item name is required' },
        { status: 400 }
      );
    }

    // Validate login type
    const validLoginTypes = ['email_password', 'google_oauth'];
    if (login_type && !validLoginTypes.includes(login_type)) {
      return NextResponse.json(
        { error: 'Invalid login type' },
        { status: 400 }
      );
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

    // Create the secure login
    const secureLogin = await prisma.secureLogin.create({
      data: {
        item_name,
        username: username ? encrypt(username) : null,
        password: password ? encrypt(password) : null,
        totp_secret: totp_secret ? encrypt(totp_secret) : null,
        website_url: website_url || null,
        notes: notes || null,
        login_type: login_type || 'email_password',
        google_account_id: googleAccountId || null,
        folder_id: folder_id || null,
        owner_id: auth.user.id,
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        googleAccount: {
          select: { id: true, email_address: true },
        },
      },
    });

    // Log the creation
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
    const userAgent = request.headers.get('user-agent') || undefined;
    await logSecureLoginCreate(secureLogin.id, auth.user.id, ipAddress, userAgent);

    // Return with decrypted fields wrapped in secureLogin object
    return NextResponse.json(
      {
        secureLogin: {
          ...secureLogin,
          username: secureLogin.username ? decrypt(secureLogin.username) : '',
          password: secureLogin.password ? decrypt(secureLogin.password) : '',
          totp_secret: secureLogin.totp_secret ? decrypt(secureLogin.totp_secret) : '',
        },
        accessLevel: 'owner',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating secure login:', error);
    return NextResponse.json(
      { error: 'Failed to create secure login' },
      { status: 500 }
    );
  }
}
