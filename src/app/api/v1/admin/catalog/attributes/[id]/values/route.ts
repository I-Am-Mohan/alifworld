import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, defaultPolicyEngine } from '@/shared/authz';
import { AttributeService } from '@/features/catalog/services/attribute-service';
import { CreateCatalogAttributeValueSchema } from '@/features/catalog/validators';
import { ValidationError } from '@/shared/errors/app-error';
import { errorResponse } from '@/shared/api/error-response';

export const dynamic = 'force-dynamic';
const service = new AttributeService();

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = authenticateRequest(req);
    await defaultPolicyEngine.assert(actor, 'catalog:write', { type: 'CATALOG', id: (await params).id });
    return NextResponse.json({ success: true, data: await service.listValues((await params).id, true) });
  } catch (error) { return errorResponse(req, error, 'Failed to load attribute values'); }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = authenticateRequest(req);
    const attributeId = (await params).id;
    await defaultPolicyEngine.assert(actor, 'catalog:write', { type: 'CATALOG', id: attributeId });
    const parsed = CreateCatalogAttributeValueSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new ValidationError('Invalid catalog attribute value.', parsed.error.flatten());
    return NextResponse.json({ success: true, data: await service.createValue(actor.userId, attributeId, parsed.data) }, { status: 201 });
  } catch (error) { return errorResponse(req, error, 'Failed to create attribute value'); }
}
