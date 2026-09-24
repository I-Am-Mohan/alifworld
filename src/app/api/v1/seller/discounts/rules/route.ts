import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse } from '@/shared/api/error-response';
import { prisma } from '@/shared/database/prisma';
import { DiscountRuleService } from '@/services/discount-rule.service';
import { CreateDiscountRuleSchema } from '@/validators/discount-rule.validator';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/seller/discounts/rules
 * Authenticated seller lists their discount rules.
 */
export async function GET(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    const searchParams = req.nextUrl.searchParams;

    const discountType = searchParams.get('discountType') || undefined;
    const status = searchParams.get('status') || undefined;
    const page = Number(searchParams.get('page') || '1');
    const limit = Number(searchParams.get('limit') || '20');

    const service = new DiscountRuleService(prisma);
    const result = await service.listDiscountRules(actor, { discountType, status, page, limit });

    return NextResponse.json({
      success: true,
      data: result.items,
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

/**
 * POST /api/v1/seller/discounts/rules
 * Authenticated seller creates a seller-funded discount rule.
 */
export async function POST(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    const body = await req.json();

    const parsed = CreateDiscountRuleSchema.parse({
      ...body,
      sellerId: actor.sellerId || body.sellerId,
      fundingType: 'SELLER_FUNDED',
    });

    const service = new DiscountRuleService(prisma);
    const rule = await service.createDiscountRule(actor, parsed);

    return NextResponse.json({ success: true, data: rule }, { status: 201 });
  } catch (error) {
    return errorResponse(req, error);
  }
}
