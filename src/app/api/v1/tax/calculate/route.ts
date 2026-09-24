import { NextRequest, NextResponse } from 'next/server';
import { errorResponse } from '@/shared/api/error-response';
import { TaxService } from '@/features/catalog/services/tax-service';
import { CalculateTaxSchema } from '@/validators/tax.validator';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/tax/calculate
 * Calculates line-item and order-level tax/VAT breakdowns and generates immutable tax snapshot.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CalculateTaxSchema.parse(body);

    const taxService = new TaxService();
    const effectiveDate = parsed.effectiveDate ? new Date(parsed.effectiveDate) : new Date();

    const snapshot = taxService.generateTaxSnapshot(
      parsed.lines.map((line) => ({
        lineItemId: line.lineItemId,
        title: line.title,
        netPricePoisha: line.netPricePoisha,
        quantity: line.quantity,
        productTaxRatePercent: line.productTaxRatePercent ?? line.taxRatePercent,
        categoryTaxRatePercent: line.categoryTaxRatePercent,
        priceIncludesTax: line.priceIncludesTax,
        taxType: line.taxType,
        taxRuleId: line.taxRuleId,
      })),
      effectiveDate,
      parsed.jurisdiction
    );

    // Convert BigInts for JSON response
    const serializedSnapshot = {
      ...snapshot,
      totalNetPoisha: snapshot.totalNetPoisha.toString(),
      totalTaxPoisha: snapshot.totalTaxPoisha.toString(),
      totalGrossPoisha: snapshot.totalGrossPoisha.toString(),
      lines: snapshot.lines.map((l) => ({
        ...l,
        netPricePoisha: l.netPricePoisha.toString(),
        taxAmountPoisha: l.taxAmountPoisha.toString(),
        grossPricePoisha: l.grossPricePoisha.toString(),
      })),
    };

    return NextResponse.json({
      success: true,
      data: serializedSnapshot,
    });
  } catch (error) {
    return errorResponse(req, error);
  }
}
