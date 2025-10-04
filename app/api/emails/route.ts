import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/utils/auth';

// GET /api/emails - Get email settings
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.authorized || auth.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const settings = await prisma.emailSettings.findFirst({
      orderBy: { id: 'desc' }
    });

    if (!settings) {
      return NextResponse.json({
        sendgrid_api_key: '',
        from_email: '',
        from_name: ''
      });
    }

    // Don't send the full API key to the client
    return NextResponse.json({
      sendgrid_api_key: settings.sendgrid_api_key ? '••••••••••••' + settings.sendgrid_api_key.slice(-4) : '',
      from_email: settings.from_email || '',
      from_name: settings.from_name || '',
      has_api_key: !!settings.sendgrid_api_key
    });
  } catch (error) {
    console.error('Error fetching email settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email settings' },
      { status: 500 }
    );
  }
}

// POST /api/emails - Save email settings
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.authorized || auth.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { sendgrid_api_key, from_email, from_name } = body;

    // Validate required fields
    if (!from_email || !from_name) {
      return NextResponse.json(
        { error: 'From email and name are required' },
        { status: 400 }
      );
    }

    // Get existing settings
    const existing = await prisma.emailSettings.findFirst({
      orderBy: { id: 'desc' }
    });

    let settings;
    if (existing) {
      // Update existing settings
      settings = await prisma.emailSettings.update({
        where: { id: existing.id },
        data: {
          // Only update API key if it's not the masked value
          sendgrid_api_key: sendgrid_api_key && !sendgrid_api_key.includes('••••')
            ? sendgrid_api_key
            : existing.sendgrid_api_key,
          from_email,
          from_name
        }
      });
    } else {
      // Create new settings
      settings = await prisma.emailSettings.create({
        data: {
          sendgrid_api_key,
          from_email,
          from_name
        }
      });
    }

    return NextResponse.json({
      message: 'Email settings saved successfully',
      sendgrid_api_key: settings.sendgrid_api_key ? '••••••••••••' + settings.sendgrid_api_key.slice(-4) : '',
      from_email: settings.from_email,
      from_name: settings.from_name,
      has_api_key: !!settings.sendgrid_api_key
    });
  } catch (error) {
    console.error('Error saving email settings:', error);
    return NextResponse.json(
      { error: 'Failed to save email settings' },
      { status: 500 }
    );
  }
}
