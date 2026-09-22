import { NextRequest, NextResponse } from 'next/server';
import { PhoneAuthService } from '@/services/phone-auth.service';
import { AppError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

const phoneAuthService = new PhoneAuthService();

/**
 * POST /api/v1/auth/phone/verify-register
 * 
 * Verifies the 6-digit OTP code sent for registration and issues a verification ticket
 * permitting completion of name, password, and optional details.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { phone, code } = body;

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

    const result = await phoneAuthService.verifyRegisterOtp(phone, code);

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 200 }
    );
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
          message: error.message || 'Verification failed',
        },
      },
      { status: 500 }
    );
  }
}
