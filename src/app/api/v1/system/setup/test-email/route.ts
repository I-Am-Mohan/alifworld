import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse, validationErrorResponse } from '@/shared/api/error-response';
import { sendEmailViaSmtp, getSmtpConfig } from '@/shared/email/smtp-transport';

export const dynamic = 'force-dynamic';

const TestEmailSchema = z.object({
  recipientEmail: z.string().email('Please enter a valid recipient email address'),
});

/**
 * POST /api/v1/system/setup/test-email
 * Dispatches a real test notification email using the configured SMTP gateway server.
 */
export async function POST(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    const isAdmin = actor.roles.includes('ADMIN') || actor.roles.includes('SUPER_ADMIN');
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Only administrators can test SMTP configurations.' } },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { recipientEmail } = TestEmailSchema.parse(body);

    const nowStr = new Date().toLocaleString('en-BD', { timeZone: 'Asia/Dhaka' });
    const config = await getSmtpConfig();

    const sendResult = await sendEmailViaSmtp({
      to: recipientEmail,
      subject: 'AlifWorld SMTP Email Gateway Test',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; font-size: 14px; color: #1e293b;">
          <div style="background-color: #0f172a; padding: 20px; text-align: center; color: #ffffff;">
            <h1 style="color: #FF6A00; margin: 0; font-size: 22px;">AlifWorld Platform</h1>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8;">SMTP Gateway Verification Test</p>
          </div>
          <div style="padding: 24px; background-color: #ffffff;">
            <p style="font-size: 16px; font-weight: bold; color: #0f172a; margin-top: 0;">SMTP Test Dispatch Successful!</p>
            <p>Your SMTP email configuration is operational and actively delivering messages.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;">
              <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px; font-weight: bold;">SMTP Host:</td>
                <td style="padding: 10px; font-family: monospace;">${config.host}:${config.port}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px; font-weight: bold;">Sender:</td>
                <td style="padding: 10px; font-family: monospace;">${config.from}</td>
              </tr>
              <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px; font-weight: bold;">Recipient:</td>
                <td style="padding: 10px; font-family: monospace;">${recipientEmail}</td>
              </tr>
              <tr>
                <td style="padding: 10px; font-weight: bold;">Dispatched At:</td>
                <td style="padding: 10px;">${nowStr} (Asia/Dhaka)</td>
              </tr>
            </table>
            <p style="font-size: 12px; color: #64748b;">If you received this email, your outgoing email server settings in Admin System &gt; Setup are correctly configured.</p>
          </div>
          <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 11px; color: #64748b;">
            &copy; 2026 AlifWorld. All rights reserved.
          </div>
        </div>
      `,
    });

    return NextResponse.json({
      success: true,
      data: {
        message: `Test email successfully sent to ${recipientEmail} via ${sendResult.configUsed.host}`,
        messageId: sendResult.messageId,
        smtpResponse: sendResult.response,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return validationErrorResponse(req, error);
    }
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SMTP_SEND_FAILED',
          message: error.message || 'Failed to dispatch email via SMTP server.',
        },
      },
      { status: 500 }
    );
  }
}
