import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { VariantOptionService } from '@/features/catalog/services/attribute-service';
import { VariantOptionsSchema } from '@/features/catalog/validators';
import { ValidationError } from '@/shared/errors/app-error';
import { errorResponse } from '@/shared/api/error-response';

export const dynamic = 'force-dynamic';
const service = new VariantOptionService();

export async function GET(req: NextRequest, { params }: { params: Promise<{ variantId: string }> }) {
  try { authenticateRequest(req); return NextResponse.json({ success: true, data: await service.list((await params).variantId) }); }
  catch (error) { return errorResponse(req, error, 'Failed to load variant options'); }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ variantId: string }> }) {
  try {
    const actor = authenticateRequest(req);
    const parsed = VariantOptionsSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new ValidationError('Invalid variant options.', parsed.error.flatten());
    return NextResponse.json({ success: true, data: await service.replace(actor.userId, (await params).variantId, parsed.data) });
  } catch (error) { return errorResponse(req, error, 'Failed to replace variant options'); }
}
