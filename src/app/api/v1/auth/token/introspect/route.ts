import { NextRequest, NextResponse } from 'next/server';
import { tokenIntrospectSchema } from '@/validators/auth.validator';
import { AuthTokenService } from '@/services/auth-token.service';

export const dynamic = 'force-dynamic';

const authTokenService = new AuthTokenService();

/**
 * POST /api/v1/auth/token/introspect
 * 
 * RFC 7662 compliant token introspection endpoint.
 * Allows microservices, API gateways, and trusted internal services
 * to verify whether an access token is active, valid, and not revoked.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parseResult = tokenIntrospectSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Invalid introspection payload',
            details: parseResult.error.flatten(),
          },
        },
        { status: 422 }
      );
    }

    const { token } = parseResult.data;
    const introspection = await authTokenService.introspectToken(token);

    return NextResponse.json(
      {
        success: true,
        data: introspection,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Token introspection failed',
        },
      },
      { status: 500 }
    );
  }
}
