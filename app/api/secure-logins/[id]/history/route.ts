import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/utils/auth';
import { isSecureLoginOwner } from '@/lib/secureLoginPermissions';
import { getSecureLoginAuditLogs } from '@/lib/secureLoginAudit';

// GET /api/secure-logins/[id]/history - Get audit history for a secure login
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

    // Only owner can view history
    const isOwner = await isSecureLoginOwner(auth.user.id, secureLoginId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');

    const history = await getSecureLoginAuditLogs(secureLoginId, limit);

    return NextResponse.json({ history });
  } catch (error) {
    console.error('Error fetching history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch history' },
      { status: 500 }
    );
  }
}
