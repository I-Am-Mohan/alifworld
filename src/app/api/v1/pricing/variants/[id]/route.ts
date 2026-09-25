import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse, validationErrorResponse } from '@/shared/api/error-response';
import { prisma } from '@/shared/database/prisma';
import { PricingService } from '@/services/pricing.service';
import { UpdateVariantPriceSchema } from '@/validators/pricing.validator';

export const dynamic = 'force-dynamic';

/**
 * PUT /api/v1/pricing/variants/[id]
 * Updates base variant pricing in integer poisha and appends a PriceHistory log entry.
 */
export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = authenticateRequest(req);
    const { id: variantId } = await context.params;

    const body = await req.json();
    const parsedInput = UpdateVariantPriceSchema.parse({
      ...body,
      variantId,
    });

    const service = new PricingService(prisma);
    const result = await service.updateVariantBasePrice(actor, parsedInput);

    return NextResponse.json({
      success: true,
      data: {
        id: result.id,
        productId: result.productId,
        sku: result.sku,
        title: result.title,
        pricePoisha: result.pricePoisha.toString(),
        compareAtPricePoisha: result.compareAtPricePoisha ? result.compareAtPricePoisha.toString() : null,
        costPricePoisha: result.costPricePoisha ? result.costPricePoisha.toString() : null,
        minPricePoisha: result.minPricePoisha ? result.minPricePoisha.toString() : null,
        productPoint: result.productPoint,
        updatedAt: result.updatedAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationErrorResponse(req, error);
    }
    return errorResponse(req, error);
  }
}
