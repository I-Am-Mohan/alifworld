import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, defaultPolicyEngine } from '@/shared/authz';
import { AttributeService } from '@/features/catalog/services/attribute-service';
import { CreateCatalogAttributeSchema } from '@/features/catalog/validators';
import { ValidationError } from '@/shared/errors/app-error';
import { errorResponse } from '@/shared/api/error-response';

export const dynamic = 'force-dynamic';
const service = new AttributeService();

export async function GET(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    await defaultPolicyEngine.assert(actor, 'catalog:write', { type: 'CATALOG', id: 'ATTRIBUTE_ADMIN' });
    return NextResponse.json({ success: true, data: await service.listAttributes(true) });
  } catch (error) { return errorResponse(req, error, 'Failed to load catalog attributes'); }
}

export async function POST(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    await defaultPolicyEngine.assert(actor, 'catalog:write', { type: 'CATALOG', id: 'ATTRIBUTE_ADMIN' });
    const parsed = CreateCatalogAttributeSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new ValidationError('Invalid catalog attribute.', parsed.error.flatten());
    return NextResponse.json({ success: true, data: await service.createAttribute(actor.userId, parsed.data) }, { status: 201 });
  } catch (error) { return errorResponse(req, error, 'Failed to create catalog attribute'); }
}
