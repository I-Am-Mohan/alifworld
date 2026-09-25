import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { errorResponse, validationErrorResponse } from '@/shared/api/error-response';
import { prisma } from '@/shared/database/prisma';
import { PricingService } from '@/services/pricing.service';
import { CalculateQuoteSchema } from '@/validators/pricing.validator';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/pricing/quote
 * Calculates an authoritative server-side pricing quote for cart or checkout line items.
 * Includes price resolution, stacked promotion discounts, tax/VAT breakdown, seller vs platform attributions,
 * Product Points snapshots, and grand total in BDT poisha.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CalculateQuoteSchema.parse(body);

    const service = new PricingService(prisma);
    const result = await service.calculateQuote(parsed);

    // Format BigInt fields to String for JSON serialization
    const responseData = {
      currency: result.currency,
      channel: result.channel,
      buyerSegment: result.buyerSegment,
      lineItems: result.lineItems.map((item) => ({
        ...item,
        unitPricePoisha: item.unitPricePoisha.toString(),
        compareAtPricePoisha: item.compareAtPricePoisha ? item.compareAtPricePoisha.toString() : null,
        costPricePoisha: item.costPricePoisha ? item.costPricePoisha.toString() : null,
        minPricePoisha: item.minPricePoisha ? item.minPricePoisha.toString() : null,
        baseTotalPoisha: item.baseTotalPoisha.toString(),
        discountPoisha: item.discountPoisha.toString(),
        sellerFundedDiscountPoisha: item.sellerFundedDiscountPoisha.toString(),
        platformFundedDiscountPoisha: item.platformFundedDiscountPoisha.toString(),
        netAmountPoisha: item.netAmountPoisha.toString(),
        taxAmountPoisha: item.taxAmountPoisha.toString(),
        grossAmountPoisha: item.grossAmountPoisha.toString(),
      })),
      totals: {
        currency: result.totals.currency,
        channel: result.totals.channel,
        buyerSegment: result.totals.buyerSegment,
        subtotalBasePoisha: result.totals.subtotalBasePoisha.toString(),
        totalDiscountPoisha: result.totals.totalDiscountPoisha.toString(),
        sellerFundedTotalDiscountPoisha: result.totals.sellerFundedTotalDiscountPoisha.toString(),
        platformFundedTotalDiscountPoisha: result.totals.platformFundedTotalDiscountPoisha.toString(),
        netSubtotalPoisha: result.totals.netSubtotalPoisha.toString(),
        totalTaxPoisha: result.totals.totalTaxPoisha.toString(),
        shippingFeePoisha: result.totals.shippingFeePoisha.toString(),
        shippingDiscountPoisha: result.totals.shippingDiscountPoisha.toString(),
        grandTotalPoisha: result.totals.grandTotalPoisha.toString(),
        totalProductPoints: result.totals.totalProductPoints,
      },
      promotions: {
        applied: result.promotions.applied.map((p) => ({
          ...p,
          discountAmountPoisha: p.discountAmountPoisha.toString(),
          sellerSharePoisha: p.sellerSharePoisha.toString(),
          platformSharePoisha: p.platformSharePoisha.toString(),
        })),
        excluded: result.promotions.excluded,
      },
      calculationSnapshot: result.calculationSnapshot,
    };

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationErrorResponse(req, error);
    }
    return errorResponse(req, error);
  }
}
