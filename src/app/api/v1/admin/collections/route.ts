import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, defaultPolicyEngine } from '@/shared/authz';
import { CollectionService } from '@/features/catalog/services/collection-service';
import { CreateCollectionSchema } from '@/features/catalog/collection';
import { ValidationError } from '@/shared/errors/app-error';
import { errorResponse } from '@/shared/api/error-response';

export const dynamic = 'force-dynamic';
const service = new CollectionService();

export async function GET(req: NextRequest) {
  try { const actor = authenticateRequest(req); await defaultPolicyEngine.assert(actor, 'catalog:write', { type: 'CATALOG', id: 'COLLECTION_ADMIN' }); return NextResponse.json({ success: true, data: await service.getAdminAll() }); }
  catch (error) { return errorResponse(req, error, 'Failed to load collection administration list'); }
}

export async function POST(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    await defaultPolicyEngine.assert(actor, 'catalog:write', { type: 'CATALOG', id: 'COLLECTION_ADMIN' });
    const parsed = CreateCollectionSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new ValidationError('Invalid collection.', parsed.error.flatten());
    return NextResponse.json({ success: true, data: await service.createCollection(actor.userId, parsed.data) }, { status: 201 });
  } catch (error) { return errorResponse(req, error, 'Failed to create collection'); }
}
