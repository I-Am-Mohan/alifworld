import { NextRequest, NextResponse } from 'next/server';
import { errorResponse } from '@/shared/api/error-response';
import { prisma } from '@/shared/database/prisma';
import { PricingService } from '@/services/pricing.service';
import { ResolvePriceQuerySchema } from '@/validators/pricing.validator';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/pricing/resolve
 * Resolves authoritative effective unit price, total poisha, tier rules, and MAP floor status for a variant.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = ResolvePriceQuerySchema.parse(body);

    const service = new PricingService(prisma);
    const result = await service.resolveVariantPrice(parsed);

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        unitPricePoisha: result.unitPricePoisha.toString(),
        compareAtPricePoisha: result.compareAtPricePoisha?.toString() || null,
        costPricePoisha: result.costPricePoisha?.toString() || null,
        minPricePoisha: result.minPricePoisha?.toString() || null,
        totalPoisha: result.totalPoisha.toString(),
      },
    });
  } catch (error) {
    return errorResponse(req, error);
  }
}
