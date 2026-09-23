import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest, defaultPolicyEngine } from '@/shared/authz';
import { ProductService } from '@/features/catalog/services/product-service';
import { errorResponse } from '@/shared/api/error-response';
import { ValidationError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';
const service = new ProductService();

export async function GET(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    await defaultPolicyEngine.assert(actor, 'catalog:read', { type: 'CATALOG', id: 'PRODUCT_ADMIN' });
    const parsedQuery = z.object({ status: z.enum(['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'PUBLISHED', 'ARCHIVED']).optional(), categoryId: z.string().trim().min(1).optional(), brandId: z.string().trim().min(1).optional(), search: z.string().trim().max(100).optional(), page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) }).safeParse(Object.fromEntries(req.nextUrl.searchParams.entries()));
    if (!parsedQuery.success) throw new ValidationError('Invalid product list query.', parsedQuery.error.flatten());
    const result = await service.listProducts(parsedQuery.data);
    return NextResponse.json({ success: true, data: result.items, meta: { ...parsedQuery.data, total: result.total } });
  } catch (error) { return errorResponse(req, error, 'Failed to load catalog products'); }
}
