import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { ProductService } from '@/features/catalog/services/product-service';
import { CreateProductSchema } from '@/features/catalog/validators';
import { ValidationError } from '@/shared/errors/app-error';
import { errorResponse } from '@/shared/api/error-response';

export const dynamic = 'force-dynamic';
const service = new ProductService();

export async function GET(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    if (!actor.sellerId) return NextResponse.json({ success: false, error: { code: 'SELLER_SCOPE_REQUIRED', message: 'Seller scope is required.' } }, { status: 422 });
    const params = req.nextUrl.searchParams;
    const result = await service.listProducts({ sellerId: actor.sellerId, status: (params.get('status') as any) || undefined, search: params.get('search') || undefined, page: Number(params.get('page') || 1), limit: Number(params.get('limit') || 20) });
    return NextResponse.json({ success: true, data: result.items, meta: { page: Number(params.get('page') || 1), limit: Number(params.get('limit') || 20), total: result.total } });
  } catch (error) { return errorResponse(req, error, 'Failed to load seller catalog products'); }
}

export async function POST(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    if (!actor.sellerId) return NextResponse.json({ success: false, error: { code: 'SELLER_SCOPE_REQUIRED', message: 'Seller scope is required.' } }, { status: 422 });
    const parsed = CreateProductSchema.safeParse({ ...(await req.json().catch(() => ({}))), sellerId: actor.sellerId });
    if (!parsed.success) throw new ValidationError('Invalid product draft.', parsed.error.flatten());
    return NextResponse.json({ success: true, data: await service.createProduct(actor.userId, parsed.data) }, { status: 201 });
  } catch (error) { return errorResponse(req, error, 'Failed to create seller product draft'); }
}
