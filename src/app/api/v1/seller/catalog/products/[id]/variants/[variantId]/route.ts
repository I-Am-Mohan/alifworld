import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/shared/authz';
import { ProductVariantService } from '@/features/catalog/services/product-variant-service';
import { CreateProductVariantSchema } from '@/features/catalog/validators';
import { ValidationError } from '@/shared/errors/app-error';
import { errorResponse } from '@/shared/api/error-response';

export const dynamic = 'force-dynamic';
const service = new ProductVariantService();

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string; variantId: string }> }) {
  try {
    const actor = authenticateRequest(req);
    const routeParams = await params;
    return NextResponse.json({ success: true, data: await service.get(actor.userId, routeParams.id, routeParams.variantId, actor.sellerId || undefined) });
  } catch (error) { return errorResponse(req, error, 'Failed to load product variant'); }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; variantId: string }> }) {
  try {
    const actor = authenticateRequest(req);
    const routeParams = await params;
    const payload = await req.json().catch(() => ({}));
    const parsed = CreateProductVariantSchema.partial().extend({ version: z.number().int().positive() }).safeParse(payload);
    if (!parsed.success) throw new ValidationError('Invalid product variant update.', parsed.error.flatten());
    const { version, ...input } = parsed.data;
    return NextResponse.json({ success: true, data: await service.update(actor.userId, routeParams.id, routeParams.variantId, payload.version, input, actor.sellerId || undefined) });
  } catch (error) { return errorResponse(req, error, 'Failed to update product variant'); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; variantId: string }> }) {
  try {
    const actor = authenticateRequest(req);
    const routeParams = await params;
    const version = Number(req.nextUrl.searchParams.get('version'));
    if (!Number.isInteger(version) || version < 1) throw new ValidationError('A positive variant version query parameter is required.');
    return NextResponse.json({ success: true, data: await service.remove(actor.userId, routeParams.id, routeParams.variantId, version, actor.sellerId || undefined) });
  } catch (error) { return errorResponse(req, error, 'Failed to delete product variant'); }
}
