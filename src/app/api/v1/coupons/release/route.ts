import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse } from '@/shared/api/error-response';
import { prisma } from '@/shared/database/prisma';
import { CouponLifecycleService } from '@/services/coupon-lifecycle.service';
import { ReleaseCouponSchema } from '@/validators/coupon.validator';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/coupons/release
 * Authenticated customer releases / reverses a reserved coupon redemption on checkout cancellation.
 */
export async function POST(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    const body = await req.json();
    const parsed = ReleaseCouponSchema.parse(body);

    const service = new CouponLifecycleService(prisma);
    const result = await service.releaseRedemption(actor, parsed);

    return NextResponse.json({
      success: true,
      data: result
        ? {
            ...result,
            discountAmountPoisha: result.discountAmountPoisha.toString(),
          }
        : null,
    });
  } catch (error) {
    return errorResponse(req, error);
  }
}
