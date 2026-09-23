import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, defaultPolicyEngine } from '@/shared/authz';
import { AttributeService } from '@/features/catalog/services/attribute-service';
import { UpdateCatalogAttributeSchema } from '@/features/catalog/validators';
import { ValidationError } from '@/shared/errors/app-error';
import { errorResponse } from '@/shared/api/error-response';

export const dynamic = 'force-dynamic';
const service = new AttributeService();

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = authenticateRequest(req);
    const id = (await params).id;
    await defaultPolicyEngine.assert(actor, 'catalog:write', { type: 'CATALOG', id });
    const parsed = UpdateCatalogAttributeSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new ValidationError('Invalid catalog attribute update.', parsed.error.flatten());
    return NextResponse.json({ success: true, data: await service.updateAttribute(actor.userId, id, parsed.data) });
  } catch (error) { return errorResponse(req, error, 'Failed to update catalog attribute'); }
}
