import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { CatalogBulkService } from '@/features/catalog/services/bulk-service';
import { CatalogImportCreateSchema } from '@/features/catalog/bulk';
import { ValidationError } from '@/shared/errors/app-error';
import { errorResponse } from '@/shared/api/error-response';

export const dynamic = 'force-dynamic';
const service = new CatalogBulkService();

export async function GET(req: NextRequest) {
  try { const actor = authenticateRequest(req); if (!actor.sellerId) return NextResponse.json({ success: false, error: { code: 'SELLER_SCOPE_REQUIRED', message: 'Seller scope is required.' } }, { status: 422 }); return NextResponse.json({ success: true, data: await service.listImports(actor.userId, actor.sellerId) }); }
  catch (error) { return errorResponse(req, error, 'Failed to load catalog imports'); }
}

export async function POST(req: NextRequest) {
  try { const actor = authenticateRequest(req); if (!actor.sellerId) return NextResponse.json({ success: false, error: { code: 'SELLER_SCOPE_REQUIRED', message: 'Seller scope is required.' } }, { status: 422 }); const parsed = CatalogImportCreateSchema.safeParse(await req.json().catch(() => ({}))); if (!parsed.success) throw new ValidationError('Invalid catalog import.', parsed.error.flatten()); return NextResponse.json({ success: true, data: await service.createImport(actor.userId, actor.sellerId, parsed.data) }, { status: 201 }); }
  catch (error) { return errorResponse(req, error, 'Failed to create catalog import'); }
}
