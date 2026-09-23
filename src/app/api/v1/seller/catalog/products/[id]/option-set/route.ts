import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { ProductOptionSetService } from '@/features/catalog/services/attribute-service';
import { ProductOptionSetsSchema } from '@/features/catalog/validators';
import { ValidationError } from '@/shared/errors/app-error';
import { errorResponse } from '@/shared/api/error-response';

export const dynamic = 'force-dynamic';
const service = new ProductOptionSetService();

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { authenticateRequest(req); return NextResponse.json({ success: true, data: await service.list((await params).id) }); }
  catch (error) { return errorResponse(req, error, 'Failed to load product option sets'); }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = authenticateRequest(req);
    const parsed = ProductOptionSetsSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new ValidationError('Invalid product option sets.', parsed.error.flatten());
    return NextResponse.json({ success: true, data: await service.replace(actor.userId, (await params).id, parsed.data) });
  } catch (error) { return errorResponse(req, error, 'Failed to replace product option sets'); }
}
