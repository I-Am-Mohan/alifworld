import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse, validationErrorResponse } from '@/shared/api/error-response';
import { prisma } from '@/shared/database/prisma';
import { PricingService } from '@/services/pricing.service';
import { QueryScheduledPricesSchema } from '@/validators/pricing.validator';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/pricing/scheduled
 * Lists upcoming scheduled price lists and volume break rules.
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
    const queryInput = QueryScheduledPricesSchema.parse({
      variantId: searchParams.get('variantId') || undefined,
      productId: searchParams.get('productId') || undefined,
      sellerId: searchParams.get('sellerId') || undefined,
      channel: searchParams.get('channel') || undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
    });

    const service = new PricingService(prisma);
    const result = await service.getScheduledPrices(actor, queryInput);

    const serializedItems = result.items.map((item) => ({
      ...item,
      pricePoisha: item.pricePoisha.toString(),
      compareAtPricePoisha: item.compareAtPricePoisha ? item.compareAtPricePoisha.toString() : null,
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
