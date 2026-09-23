import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { ProductVariantService } from '@/features/catalog/services/product-variant-service';
import { CreateProductVariantSchema } from '@/features/catalog/validators';
import { ValidationError } from '@/shared/errors/app-error';
import { errorResponse } from '@/shared/api/error-response';

export const dynamic = 'force-dynamic';
const service = new ProductVariantService();

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = authenticateRequest(req);
    const productId = (await params).id;
    return NextResponse.json({ success: true, data: await service.list(actor.userId, productId, actor.sellerId || undefined) });
  } catch (error) { return errorResponse(req, error, 'Failed to load product variants'); }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = authenticateRequest(req);
    const parsed = CreateProductVariantSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new ValidationError('Invalid product variant.', parsed.error.flatten());
    return NextResponse.json({ success: true, data: await service.create(actor.userId, (await params).id, parsed.data, actor.sellerId || undefined) }, { status: 201 });
  } catch (error) { return errorResponse(req, error, 'Failed to create product variant'); }
}
