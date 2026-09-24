import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse } from '@/shared/api/error-response';
import { prisma } from '@/shared/database/prisma';
import { PromotionAttributionService } from '@/services/promotion-attribution.service';
import { CreatePromotionSchema } from '@/validators/promotion.validator';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/admin/promotions
 * Admin lists promotions.
 */
export async function GET(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    const isAdmin = actor.roles.includes('ADMIN') || actor.roles.includes('SUPER_ADMIN');
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const sellerId = searchParams.get('sellerId') || undefined;
    const status = searchParams.get('status') || undefined;
    const page = Number(searchParams.get('page') || '1');
    const limit = Number(searchParams.get('limit') || '20');

    const service = new PromotionAttributionService(prisma);
    const repo = service['repo'];

    const result = await repo.listPromotions({ sellerId, status, page, limit });

    const serializedItems = result.items.map((promo) => ({
      ...promo,
      maxDiscountPoisha: promo.maxDiscountPoisha?.toString() || null,
      minOrderSubtotalPoisha: promo.minOrderSubtotalPoisha.toString(),
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

/**
 * POST /api/v1/admin/promotions
 * Admin creates a new promotion with specified funding configuration.
 */
export async function POST(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    const body = await req.json();

    const parsed = CreatePromotionSchema.parse(body);

    const service = new PromotionAttributionService(prisma);

    const promo = await service.createPromotion(actor, parsed);

    return NextResponse.json(
      {
        success: true,
        data: {
          ...promo,
          maxDiscountPoisha: promo.maxDiscountPoisha?.toString() || null,
          minOrderSubtotalPoisha: promo.minOrderSubtotalPoisha.toString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return errorResponse(req, error);
  }
}
