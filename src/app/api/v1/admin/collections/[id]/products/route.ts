import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, defaultPolicyEngine } from '@/shared/authz';
import { CollectionService } from '@/features/catalog/services/collection-service';
import { CollectionProductsSchema } from '@/features/catalog/collection';
import { ValidationError } from '@/shared/errors/app-error';
import { errorResponse } from '@/shared/api/error-response';

export const dynamic = 'force-dynamic';
const service = new CollectionService();

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = authenticateRequest(req); const id = (await params).id;
    await defaultPolicyEngine.assert(actor, 'catalog:write', { type: 'CATALOG', id });
    const parsed = CollectionProductsSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new ValidationError('Invalid collection products.', parsed.error.flatten());
    return NextResponse.json({ success: true, data: await service.replaceProducts(actor.userId, id, parsed.data.version, parsed.data.productIds) });
  } catch (error) { return errorResponse(req, error, 'Failed to replace collection products'); }
}
