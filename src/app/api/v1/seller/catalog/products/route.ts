import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
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
    const parsedQuery = z.object({ status: z.enum(['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'PUBLISHED', 'ARCHIVED']).optional(), search: z.string().trim().max(100).optional(), page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) }).safeParse(Object.fromEntries(req.nextUrl.searchParams.entries()));
    if (!parsedQuery.success) throw new ValidationError('Invalid product list query.', parsedQuery.error.flatten());
    const result = await service.listProducts({ sellerId: actor.sellerId, ...parsedQuery.data });
    return NextResponse.json({ success: true, data: result.items, meta: { ...parsedQuery.data, total: result.total } });
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
