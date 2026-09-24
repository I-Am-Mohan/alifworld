import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse } from '@/shared/api/error-response';
import { prisma } from '@/shared/database/prisma';
import { CouponLifecycleService } from '@/services/coupon-lifecycle.service';
import { ApplyCouponSchema } from '@/validators/coupon.validator';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/coupons/apply
 * Authenticated customer validates & reserves a coupon redemption atomically.
 */
export async function POST(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    const body = await req.json();
    const parsed = ApplyCouponSchema.parse(body);

    const service = new CouponLifecycleService(prisma);
    const redemption = await service.applyAndReserveCoupon(actor, parsed);

    return NextResponse.json({
      success: true,
      data: {
        ...redemption,
        discountAmountPoisha: redemption.discountAmountPoisha.toString(),
      },
    });
  } catch (error) {
    return errorResponse(req, error);
  }
}
