import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, defaultPolicyEngine } from '@/shared/authz';
import { ProductService } from '@/features/catalog/services/product-service';
import { errorResponse } from '@/shared/api/error-response';

export const dynamic = 'force-dynamic';
const service = new ProductService();

export async function GET(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    await defaultPolicyEngine.assert(actor, 'catalog:read', { type: 'CATALOG', id: 'PRODUCT_ADMIN' });
    const params = req.nextUrl.searchParams;
    const result = await service.listProducts({ status: (params.get('status') as any) || undefined, categoryId: params.get('categoryId') || undefined, brandId: params.get('brandId') || undefined, search: params.get('search') || undefined, page: Number(params.get('page') || 1), limit: Number(params.get('limit') || 20) });
    return NextResponse.json({ success: true, data: result.items, meta: { page: Number(params.get('page') || 1), limit: Number(params.get('limit') || 20), total: result.total } });
  } catch (error) { return errorResponse(req, error, 'Failed to load catalog products'); }
}
