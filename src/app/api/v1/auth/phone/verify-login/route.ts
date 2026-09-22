import { NextRequest, NextResponse } from 'next/server';
import { PhoneAuthService } from '@/services/phone-auth.service';
import { AppError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

const phoneAuthService = new PhoneAuthService();

/**
 * POST /api/v1/auth/phone/verify-login
 * 
 * Verifies the 6-digit OTP code sent to the phone, validates attempts,
 * and issues active session tokens with cookies for Web browsers.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { phone, code, clientType = 'WEB' } = body;

    if (!phone || !code) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Phone number and verification code are required',
          },
        },
        { status: 422 }
      );
    }

    const ipAddress =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      null;
    const userAgent = req.headers.get('user-agent') || null;

    const result = await phoneAuthService.verifyLoginOtp(phone, code, clientType, {
      ipAddress,
      userAgent,
    });

    const response = NextResponse.json(
      {
        success: true,
        data: {
          user: result.user,
          tokens: result.tokens,
          sessionId: result.sessionId,
          message: result.message,
        },
      },
      { status: 200 }
    );

    // Set secure HttpOnly cookies for web browsers
    if (clientType === 'WEB' && result.cookies) {
      for (const cookieOpt of result.cookies) {
        response.cookies.set({
          name: cookieOpt.name,
          value: cookieOpt.value,
          httpOnly: cookieOpt.httpOnly,
          secure: cookieOpt.secure,
          sameSite: cookieOpt.sameSite,
          path: cookieOpt.path,
          maxAge: cookieOpt.maxAge,
        });
      }
    }

    return response;
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            details: error.details,
          },
        },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'OTP verification failed',
        },
      },
      { status: 500 }
    );
  }
}
