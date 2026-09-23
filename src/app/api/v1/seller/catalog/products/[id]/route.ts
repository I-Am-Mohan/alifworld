import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { ProductService } from '@/features/catalog/services/product-service';
import { UpdateProductSchema } from '@/features/catalog/validators';
import { ConflictError, NotFoundError, ValidationError } from '@/shared/errors/app-error';
import { errorResponse } from '@/shared/api/error-response';

export const dynamic = 'force-dynamic';
const service = new ProductService();

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { const actor = authenticateRequest(req); if (!actor.sellerId) throw new ValidationError('Seller scope is required.'); const product = await service.getProductById((await params).id); if (!product || product.sellerId !== actor.sellerId) throw new NotFoundError('Product not found.'); return NextResponse.json({ success: true, data: product }); }
  catch (error) { return errorResponse(req, error, 'Failed to load product draft'); }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = authenticateRequest(req); if (!actor.sellerId) throw new ValidationError('Seller scope is required.');
    const id = (await params).id; const existing = await service.getProductById(id);
    if (!existing || existing.sellerId !== actor.sellerId) throw new NotFoundError('Product not found.');
    if (!['DRAFT', 'REJECTED'].includes(existing.status)) throw new ConflictError('Only draft or rejected products can be edited by sellers.');
    const parsed = UpdateProductSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new ValidationError('Invalid product update.', parsed.error.flatten());
    if (parsed.data.status && parsed.data.status !== 'DRAFT') throw new ValidationError('Seller edits cannot change product approval status.');
    const { status: _status, ...input } = parsed.data;
    return NextResponse.json({ success: true, data: await service.updateProduct(actor.userId, id, input.version, input) });
  } catch (error) { return errorResponse(req, error, 'Failed to update product draft'); }
}
