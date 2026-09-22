import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthLoginService } from '@/services/auth-login.service';
import { AuthTokenService } from '@/services/auth-token.service';
import { extractBearerToken } from '@/shared/auth/jwt';
import { TOKEN_POLICIES } from '@/shared/auth/token-policy';
import { AppError } from '@/shared/errors/app-error';
import { prisma } from '@/shared/database/prisma';
import { generateId, ID_PREFIXES } from '@/shared/utils/id';

export const dynamic = 'force-dynamic';

const authLoginService = new AuthLoginService();
const authTokenService = new AuthTokenService();

/**
 * GET /api/v1/auth/me
 * 
 * Returns authenticated user profile, assigned roles, permissions, multi-wallets,
 * and loyalty point balances for the currently active session.
 * 
 * Accepts token via `Authorization: Bearer <token>` or `aw_access_token` cookie.
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Try Authorization header
    const authHeader = req.headers.get('authorization');
    let token = extractBearerToken(authHeader);

    // 2. Fall back to HttpOnly access token cookie
    if (!token) {
      token = req.cookies.get(TOKEN_POLICIES.ACCESS_TOKEN_COOKIE_NAME)?.value || null;
    }

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication credentials required',
          },
        },
        { status: 401 }
      );
    }

    const profile = await authLoginService.getCurrentUser(token);

    return NextResponse.json(
      {
        success: true,
        data: profile,
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
          code: 'UNAUTHORIZED',
          message: error.message || 'Session invalid or expired',
        },
      },
      { status: 401 }
    );
  }
}

/**
 * PATCH /api/v1/auth/me
 * 
 * Allows an authenticated operator or user (such as Super Admin) to update their
 * profile details including full name, email address (with uniqueness collision checks),
 * and Bangladesh mobile phone number.
 */
export async function PATCH(req: NextRequest) {
  try {
    const auth = await authTokenService.authenticateRequest(req);

    const body = await req.json().catch(() => ({}));
    const updateSchema = z.object({
      name: z.string().min(2, 'Name must be at least 2 characters').max(100).trim().optional(),
      email: z
        .string()
        .email('Please enter a valid email address')
        .max(255)
        .transform((v) => v.trim().toLowerCase())
        .optional(),
      phone: z
        .string()
        .regex(
          /^(\+8801[3-9]\d{8}|01[3-9]\d{8})$/,
          'Please provide a valid Bangladesh mobile number (+8801XXXXXXXXX or 01XXXXXXXXX)'
        )
        .optional()
        .nullable()
        .transform((val) => {
          if (!val) return val;
          let clean = val.replace(/\s+/g, '');
          if (clean.startsWith('01')) clean = `+88${clean}`;
          return clean;
        }),
    });

    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Invalid profile update input.',
            details: parsed.error.flatten(),
          },
        },
        { status: 422 }
      );
    }

    const { name, email, phone } = parsed.data;

    if (!name && !email && phone === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NO_CHANGES_PROVIDED',
            message: 'No profile fields provided to update.',
          },
        },
        { status: 400 }
      );
    }

    // Check email uniqueness if email changed
    if (email && email !== auth.user.email) {
      const existingEmail = await prisma.user.findFirst({
        where: {
          email,
          id: { not: auth.user.id },
          deletedAt: null,
        },
      });
      if (existingEmail) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'EMAIL_ALREADY_EXISTS',
              message: 'This email address is already in use by another account.',
            },
          },
          { status: 409 }
        );
      }
    }

    // Check phone uniqueness if phone changed
    if (phone && phone !== auth.user.phone) {
      const existingPhone = await prisma.user.findFirst({
        where: {
          phone,
          id: { not: auth.user.id },
          deletedAt: null,
        },
      });
      if (existingPhone) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'PHONE_ALREADY_EXISTS',
              message: 'This mobile phone number is already in use by another account.',
            },
          },
          { status: 409 }
        );
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: auth.user.id },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Create cryptographic audit log
    await prisma.auditLog.create({
      data: {
        id: generateId(ID_PREFIXES.AUDIT),
        actorId: auth.user.id,
        actorRole: auth.claims.roles?.[0] || 'SUPER_ADMIN',
        action: 'USER_PROFILE_UPDATED',
        resource: 'User',
        resourceId: auth.user.id,
        metadata: {
          updatedFields: Object.keys(parsed.data),
          newName: name,
          newEmail: email,
          newPhone: phone,
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: updatedUser,
        message: 'Profile updated successfully.',
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
          message: error.message || 'Failed to update profile.',
        },
      },
      { status: 500 }
    );
  }
}
