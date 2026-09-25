import { NextRequest, NextResponse } from 'next/server';
import { customerRegistrationSchema } from '@/validators/auth.validator';
import { AuthRegistrationService } from '@/services/auth-registration.service';
import { ConflictError, ValidationError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

const registrationService = new AuthRegistrationService();

/**
 * POST /api/v1/auth/register
 * 
 * Registers a new customer user account.
 * Provisions customer wallets (MAIN, SHOPPING, GOOD_LUCK, CHARITY),
 * assigns CUSTOMER role, initializes loyalty point account, and generates email OTP.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parseResult = customerRegistrationSchema.safeParse(body);

    if (!parseResult.success) {
      const issueSummary = parseResult.error.issues
        .map((i) => `${i.path.join('.') || 'input'}: ${i.message}`)
        .join('; ');

      const fieldDetails: Record<string, string> = {};
      parseResult.error.issues.forEach((i) => {
        const fieldName = i.path.join('.');
        if (fieldName && !fieldDetails[fieldName]) {
          fieldDetails[fieldName] = i.message;
        }
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: `Registration validation failed: ${issueSummary}`,
            details: fieldDetails,
            issues: parseResult.error.issues.map((i) => ({
              field: i.path.join('.'),
              message: i.message,
            })),
          },
        },
        { status: 422 }
      );
    }

    const ipAddress =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      null;
    const userAgent = req.headers.get('user-agent') || null;

    const result = await registrationService.registerCustomer(parseResult.data, {
      ipAddress,
      userAgent,
    });

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof ConflictError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CONFLICT',
            message: error.message,
            details: error.details,
          },
        },
        { status: 409 }
      );
    }

    if (error instanceof ValidationError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: error.message,
            details: error.details,
          },
        },
        { status: 422 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Registration processing failed',
        },
      },
      { status: 500 }
    );
  }
}
