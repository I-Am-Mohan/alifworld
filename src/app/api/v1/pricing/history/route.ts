import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse, validationErrorResponse } from '@/shared/api/error-response';
import { prisma } from '@/shared/database/prisma';
import { PricingService } from '@/services/pricing.service';
import { QueryPriceHistorySchema } from '@/validators/pricing.validator';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/pricing/history
 * Lists append-only historical price change records for variants or products.
 * Scoped by seller tenant rules for seller roles.
 */
export async function GET(req: NextRequest) {
  try {
    let actor;
    try {
      actor = authenticateRequest(req);
    } catch {
      actor = { userId: 'anonymous', roles: ['CUSTOMER'], permissions: [], sellerId: null };
    }

    const searchParams = req.nextUrl.searchParams;
    const queryInput = QueryPriceHistorySchema.parse({
      variantId: searchParams.get('variantId') || undefined,
      productId: searchParams.get('productId') || undefined,
      sellerId: searchParams.get('sellerId') || undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
    });

    const service = new PricingService(prisma);
    const result = await service.getPriceHistory(actor, queryInput);

    const serializedItems = result.items.map((item) => ({
      ...item,
      previousPricePoisha: item.previousPricePoisha ? item.previousPricePoisha.toString() : null,
      newPricePoisha: item.newPricePoisha.toString(),
      previousCompareAtPoisha: item.previousCompareAtPoisha ? item.previousCompareAtPoisha.toString() : null,
      newCompareAtPoisha: item.newCompareAtPoisha ? item.newCompareAtPoisha.toString() : null,
    }));

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        items: serializedItems,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationErrorResponse(req, error);
    }
    return errorResponse(req, error);
  }
}
