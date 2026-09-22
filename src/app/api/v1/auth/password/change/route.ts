import { NextRequest, NextResponse } from 'next/server';
import { AuthTokenService } from '@/services/auth-token.service';
import { PasswordSecurityService } from '@/services/password-security.service';
import { changePasswordSchema } from '@/validators/auth.validator';
import { AppError } from '@/shared/errors/app-error';
import { clearAuthCookies } from '@/shared/auth/token-policy';

export const dynamic = 'force-dynamic';

const authService = new AuthTokenService();
const passwordService = new PasswordSecurityService();

export async function POST(req: NextRequest) {
  try {
    const auth = await authService.authenticateRequest(req);
    const parsed = changePasswordSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Invalid password change payload.',
            details: parsed.error.flatten(),
          },
        },
        { status: 422 }
      );
    }

    const result = await passwordService.changePassword(
      auth.user.id,
      parsed.data.currentPassword,
      parsed.data.newPassword,
      {
        ipAddress: req.headers.get('x-forwarded-for') || req.ip || null,
        userAgent: req.headers.get('user-agent'),
      }
    );
    const response = NextResponse.json({ success: true, data: result }, { status: 200 });
    clearAuthCookies(response);
    return response;
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toJSON(), { status: error.statusCode });
    }
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Password change failed.' },
      },
      { status: 500 }
    );
  }
}
