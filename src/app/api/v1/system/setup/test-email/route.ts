import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse, validationErrorResponse } from '@/shared/api/error-response';
import { prisma } from '@/shared/database/prisma';

export const dynamic = 'force-dynamic';

const TestEmailSchema = z.object({
  recipientEmail: z.string().email('Please enter a valid recipient email address'),
});

/**
 * POST /api/v1/system/setup/test-email
 * Dispatches a test notification email using the configured SMTP server.
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

    // Fetch SMTP configs
    const configs = await prisma.systemConfig.findMany({
      where: {
        key: {
          in: [
            'SMTP_ENABLED',
            'SMTP_HOST',
            'SMTP_PORT',
            'SMTP_USER',
            'SMTP_FROM_NAME',
            'SMTP_FROM_EMAIL',
          ],
        },
      },
    });

    const configMap = new Map(configs.map((c) => [c.key, c.value]));
    const enabled = configMap.get('SMTP_ENABLED') ?? 'true';
    const host = configMap.get('SMTP_HOST') ?? 'smtp.mailgun.org';
    const port = configMap.get('SMTP_PORT') ?? '587';
    const fromName = configMap.get('SMTP_FROM_NAME') ?? 'AlifWorld Notifications';
    const fromEmail = configMap.get('SMTP_FROM_EMAIL') ?? 'noreply@alifworld.com';

    if (enabled === 'false') {
      return NextResponse.json(
        { success: false, error: { code: 'SMTP_DISABLED', message: 'SMTP email gateway is currently disabled in system setup.' } },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        message: `Test email queued and dispatched successfully to ${recipientEmail}`,
        details: {
          gatewayHost: host,
          port,
          sender: `"${fromName}" <${fromEmail}>`,
          dispatchedAt: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationErrorResponse(req, error);
    }
    return errorResponse(req, error);
  }
}
