import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse } from '@/shared/api/error-response';
import { TaxPolicy } from '@/shared/authz/policies/tax.policy';
import { TaxRuleRepository } from '@/features/catalog/repositories/tax-rule-repository';
import { CreateTaxRuleSchema } from '@/validators/tax.validator';

export const dynamic = 'force-dynamic';

const taxRuleRepo = new TaxRuleRepository();

/**
 * GET /api/v1/admin/tax-rules
 * Admin lists all jurisdiction tax rules.
 */
export async function GET(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    if (!TaxPolicy.canManageTaxRules(actor)) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    const rules = await taxRuleRepo.findAll();

    return NextResponse.json({
      success: true,
      data: rules,
    });
  } catch (error) {
    return errorResponse(req, error);
  }
}

/**
 * POST /api/v1/admin/tax-rules
 * Admin creates a new jurisdiction tax rule.
 */
export async function POST(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    if (!TaxPolicy.canManageTaxRules(actor)) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = CreateTaxRuleSchema.parse(body);

    const rule = await taxRuleRepo.create(actor.userId, {
      jurisdiction: 'BD',
      categoryId: parsed.categoryId || null,
      name: parsed.name,
      taxType: parsed.taxType,
      ratePercent: parsed.ratePercent,
      priceIncludesTax: parsed.priceIncludesTax,
      effectiveFrom: new Date(parsed.effectiveFrom),
      effectiveTo: parsed.effectiveTo ? new Date(parsed.effectiveTo) : null,
      status: parsed.status,
    });

    return NextResponse.json({ success: true, data: rule }, { status: 201 });
  } catch (error) {
    return errorResponse(req, error);
  }
}
