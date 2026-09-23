import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { TaxRuleService } from '@/features/catalog/services/taxonomy-seo-service';
import { TaxRuleUpdateSchema } from '@/features/catalog/localization';
import { ValidationError } from '@/shared/errors/app-error';
import { errorResponse } from '@/shared/api/error-response';

export const dynamic = 'force-dynamic';
const service = new TaxRuleService();

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = authenticateRequest(req);
    const parsed = TaxRuleUpdateSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new ValidationError('Invalid tax rule update.', parsed.error.flatten());
    return NextResponse.json({ success: true, data: await service.update(actor.userId, (await params).id, parsed.data) });
  } catch (error) { return errorResponse(req, error, 'Failed to update tax rule'); }
}
