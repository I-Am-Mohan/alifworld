import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, defaultPolicyEngine } from '@/shared/authz';
import { ProductService } from '@/features/catalog/services/product-service';
import { UpdateProductSchema } from '@/features/catalog/validators';
import { ValidationError } from '@/shared/errors/app-error';
import { errorResponse } from '@/shared/api/error-response';

export const dynamic = 'force-dynamic';
const service = new ProductService();

async function assertCatalogWrite(req: NextRequest, id: string) {
  const actor = authenticateRequest(req);
  await defaultPolicyEngine.assert(actor, 'catalog:write', { type: 'CATALOG', id });
  return actor;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = authenticateRequest(req);
    await defaultPolicyEngine.assert(actor, 'catalog:read', { type: 'CATALOG', id: (await params).id });
    const product = await service.getProductById((await params).id);
    if (!product) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found.' } }, { status: 404 });
    return NextResponse.json({ success: true, data: product });
  } catch (error) { return errorResponse(req, error, 'Failed to load catalog product'); }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = (await params).id;
    const actor = await assertCatalogWrite(req, id);
    const parsed = UpdateProductSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new ValidationError('Invalid product update.', parsed.error.flatten());
    const { status: _status, sellerId: _sellerId, variants: _variants, media: _media, ...input } = parsed.data;
    return NextResponse.json({ success: true, data: await service.updateProduct(actor.userId, id, input.version, input) });
  } catch (error) { return errorResponse(req, error, 'Failed to update catalog product'); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = (await params).id;
    const actor = await assertCatalogWrite(req, id);
    const version = Number(req.nextUrl.searchParams.get('version'));
    if (!Number.isInteger(version) || version < 1) throw new ValidationError('A positive product version query parameter is required.');
    return NextResponse.json({ success: true, data: await service.deleteProduct(actor.userId, id, version) });
  } catch (error) { return errorResponse(req, error, 'Failed to delete catalog product'); }
}
