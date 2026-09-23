import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest, defaultPolicyEngine } from '@/shared/authz';
import { CollectionService } from '@/features/catalog/services/collection-service';
import { UpdateCollectionSchema } from '@/features/catalog/collection';
import { ValidationError } from '@/shared/errors/app-error';
import { errorResponse } from '@/shared/api/error-response';

export const dynamic = 'force-dynamic';
const service = new CollectionService();
const statusSchema = z.object({ version: z.number().int().positive() });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = authenticateRequest(req); const id = (await params).id;
    await defaultPolicyEngine.assert(actor, 'catalog:write', { type: 'CATALOG', id });
    const parsed = UpdateCollectionSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new ValidationError('Invalid collection update.', parsed.error.flatten());
    const { version, ...input } = parsed.data;
    return NextResponse.json({ success: true, data: await service.updateCollection(actor.userId, id, version, input) });
  } catch (error) { return errorResponse(req, error, 'Failed to update collection'); }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = authenticateRequest(req); const id = (await params).id;
    await defaultPolicyEngine.assert(actor, 'catalog:write', { type: 'CATALOG', id });
    const parsed = statusSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new ValidationError('Invalid collection status request.', parsed.error.flatten());
    const action = req.nextUrl.searchParams.get('action');
    const data = action === 'publish'
      ? await service.publishCollection(actor.userId, id, parsed.data.version)
      : action === 'archive'
        ? await service.archiveCollection(actor.userId, id, parsed.data.version)
        : (() => { throw new ValidationError('Unsupported collection action.'); })();
    return NextResponse.json({ success: true, data });
  } catch (error) { return errorResponse(req, error, 'Failed to change collection status'); }
}
