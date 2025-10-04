import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/utils/auth';
import sgMail from '@sendgrid/mail';

// POST /api/emails/test - Send test email
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
    const { to_email } = body;

    if (!to_email) {
      return NextResponse.json(
        { error: 'Recipient email is required' },
        { status: 400 }
      );
    }

    // Get email settings
    const settings = await prisma.emailSettings.findFirst({
      orderBy: { id: 'desc' }
    });

    if (!settings || !settings.sendgrid_api_key) {
      return NextResponse.json(
        { error: 'SendGrid API key not configured. Please save your settings first.' },
        { status: 400 }
      );
    }

    if (!settings.from_email || !settings.from_name) {
      return NextResponse.json(
        { error: 'From email and name not configured. Please save your settings first.' },
        { status: 400 }
      );
    }

    // Configure SendGrid
    sgMail.setApiKey(settings.sendgrid_api_key);

    // Prepare email message
    const msg = {
      to: to_email,
      from: {
        email: settings.from_email,
        name: settings.from_name
      },
      subject: 'Test Email from Social Media Portal',
      text: `This is a test email from the Social Media Asset Management Portal.

If you're receiving this email, your email configuration is working correctly!

Sent at: ${new Date().toLocaleString()}
From: ${settings.from_name} <${settings.from_email}>
To: ${to_email}

--
Social Media Asset Management Portal`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">✉️ Test Email</h1>
          </div>

          <div style="background-color: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; color: #374151; line-height: 1.6;">
              This is a test email from the <strong>Social Media Asset Management Portal</strong>.
            </p>

            <div style="background-color: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="color: #065f46; margin: 0; font-weight: 600;">
                ✅ Success! Your email configuration is working correctly!
              </p>
            </div>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="font-size: 13px; color: #6b7280; margin: 5px 0;">
                <strong>Sent at:</strong> ${new Date().toLocaleString()}
              </p>
              <p style="font-size: 13px; color: #6b7280; margin: 5px 0;">
                <strong>From:</strong> ${settings.from_name} &lt;${settings.from_email}&gt;
              </p>
              <p style="font-size: 13px; color: #6b7280; margin: 5px 0;">
                <strong>To:</strong> ${to_email}
              </p>
            </div>
          </div>

          <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
            <p>Social Media Asset Management Portal</p>
          </div>
        </div>
      `
    };

    // Send email
    await sgMail.send(msg);

    return NextResponse.json({
      success: true,
      message: `Test email sent successfully to ${to_email}`
    });
  } catch (error: any) {
    console.error('Error sending test email:', error);

    // Provide more detailed error messages for common SendGrid errors
    let errorMessage = 'Failed to send test email';

    if (error.response) {
      const { body } = error.response;
      if (body && body.errors && body.errors.length > 0) {
        errorMessage = body.errors[0].message || errorMessage;
      }
    } else if (error.message) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: error.response?.body || error.message
      },
      { status: 500 }
    );
  }
}
