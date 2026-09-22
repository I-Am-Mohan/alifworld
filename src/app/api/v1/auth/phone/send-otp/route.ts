import { NextRequest, NextResponse } from 'next/server';
import { PhoneAuthService } from '@/services/phone-auth.service';
import { AppError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

const phoneAuthService = new PhoneAuthService();

/**
 * POST /api/v1/auth/phone/send-otp
 * 
 * Generates and dispatches a 6-digit numeric OTP to a Bangladesh mobile number.
 * Supports purpose: 'LOGIN' | 'REGISTRATION'
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { phone, purpose = 'LOGIN' } = body;

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Phone number is required',
          },
        },
        { status: 422 }
      );
    }

    const result =
      purpose === 'REGISTRATION'
        ? await phoneAuthService.sendRegisterOtp(phone)
        : await phoneAuthService.sendLoginOtp(phone);

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
          message: error.message || 'Failed to send OTP code',
        },
      },
      { status: 500 }
    );
  }
}
