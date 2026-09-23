import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { TaxRuleService } from '@/features/catalog/services/taxonomy-seo-service';
import { TaxRuleWriteSchema } from '@/features/catalog/localization';
import { ValidationError } from '@/shared/errors/app-error';
import { errorResponse } from '@/shared/api/error-response';

export const dynamic = 'force-dynamic';
const service = new TaxRuleService();

export async function GET(req: NextRequest) {
  try { authenticateRequest(req); return NextResponse.json({ success: true, data: await service.list() }); }
  catch (error) { return errorResponse(req, error, 'Failed to load tax rules'); }
}

export async function POST(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    const parsed = TaxRuleWriteSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new ValidationError('Invalid tax rule.', parsed.error.flatten());
    return NextResponse.json({ success: true, data: await service.create(actor.userId, parsed.data) }, { status: 201 });
  } catch (error) { return errorResponse(req, error, 'Failed to create tax rule'); }
}
