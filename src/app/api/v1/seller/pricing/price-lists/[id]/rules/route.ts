import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse } from '@/shared/api/error-response';
import { prisma } from '@/shared/database/prisma';
import { PricingService } from '@/services/pricing.service';
import { CreatePriceListRuleSchema } from '@/validators/pricing.validator';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/seller/pricing/price-lists/[id]/rules
 * Adds a variant or volume tier rule to a price list.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = authenticateRequest(req);
    const { id } = await params;
    const body = await req.json();

    const parsed = CreatePriceListRuleSchema.parse({
      ...body,
      priceListId: id,
    });

    const service = new PricingService(prisma);
    const rule = await service.addRuleToPriceList(actor, parsed);

    return NextResponse.json(
      {
        success: true,
        data: {
          ...rule,
          pricePoisha: rule.pricePoisha.toString(),
          compareAtPricePoisha: rule.compareAtPricePoisha?.toString() || null,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return errorResponse(req, error);
  }
}
