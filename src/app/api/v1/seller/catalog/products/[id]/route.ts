import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { ProductService } from '@/features/catalog/services/product-service';
import { UpdateProductSchema } from '@/features/catalog/validators';
import { ConflictError, NotFoundError, ValidationError } from '@/shared/errors/app-error';
import { errorResponse } from '@/shared/api/error-response';

export const dynamic = 'force-dynamic';
const service = new ProductService();

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { const actor = authenticateRequest(req); if (!actor.sellerId) throw new ValidationError('Seller scope is required.'); const product = await service.getProductById((await params).id, actor.sellerId); if (!product) throw new NotFoundError('Product not found.'); return NextResponse.json({ success: true, data: product }); }
  catch (error) { return errorResponse(req, error, 'Failed to load product draft'); }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = authenticateRequest(req); if (!actor.sellerId) throw new ValidationError('Seller scope is required.');
    const id = (await params).id; const existing = await service.getProductById(id, actor.sellerId);
    if (!existing) throw new NotFoundError('Product not found.');
    if (!['DRAFT', 'REJECTED'].includes(existing.status)) throw new ConflictError('Only draft or rejected products can be edited by sellers.');
    const parsed = UpdateProductSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new ValidationError('Invalid product update.', parsed.error.flatten());
    if (parsed.data.status && parsed.data.status !== 'DRAFT') throw new ValidationError('Seller edits cannot change product approval status.');
    const { status: _status, sellerId: _sellerId, ...input } = parsed.data;
    return NextResponse.json({ success: true, data: await service.updateProduct(actor.userId, id, input.version, input) });
  } catch (error) { return errorResponse(req, error, 'Failed to update product draft'); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = authenticateRequest(req);
    if (!actor.sellerId) throw new ValidationError('Seller scope is required.');
    const version = Number(req.nextUrl.searchParams.get('version'));
    if (!Number.isInteger(version) || version < 1) throw new ValidationError('A positive product version query parameter is required.');
    return NextResponse.json({ success: true, data: await service.deleteProduct(actor.userId, (await params).id, version, actor.sellerId) });
  } catch (error) { return errorResponse(req, error, 'Failed to delete product'); }
}
