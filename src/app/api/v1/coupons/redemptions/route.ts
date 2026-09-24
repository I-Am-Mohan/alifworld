import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse } from '@/shared/api/error-response';
import { prisma } from '@/shared/database/prisma';
import { CouponLifecycleService } from '@/services/coupon-lifecycle.service';
import { RedemptionQuerySchema } from '@/validators/coupon.validator';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/coupons/redemptions
 * Lists coupon redemptions for authenticated customer or seller. Enforces strict scoping.
 */
export async function GET(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    const searchParams = req.nextUrl.searchParams;

    const queryInput = RedemptionQuerySchema.parse({
      customerId: searchParams.get('customerId') || undefined,
      sellerId: searchParams.get('sellerId') || undefined,
      couponCode: searchParams.get('couponCode') || undefined,
      status: searchParams.get('status') || undefined,
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
    });

    const service = new CouponLifecycleService(prisma);
    const result = await service.listRedemptions(actor, queryInput);

    const serializedItems = result.items.map((item) => ({
      ...item,
      discountAmountPoisha: item.discountAmountPoisha.toString(),
    }));

    return NextResponse.json({
      success: true,
      data: serializedItems,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    return errorResponse(req, error);
  }
}
