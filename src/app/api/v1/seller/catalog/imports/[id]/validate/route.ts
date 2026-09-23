import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { CatalogBulkService } from '@/features/catalog/services/bulk-service';
import { ValidationError } from '@/shared/errors/app-error';
import { errorResponse } from '@/shared/api/error-response';

export const dynamic = 'force-dynamic';
const service = new CatalogBulkService();

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { const actor = authenticateRequest(req); if (!actor.sellerId) return NextResponse.json({ success: false, error: { code: 'SELLER_SCOPE_REQUIRED', message: 'Seller scope is required.' } }, { status: 422 }); const body = await req.json().catch(() => ({})); if (typeof body.content !== 'string') throw new ValidationError('Import content is required.'); return NextResponse.json({ success: true, data: await service.validateImport(actor.userId, actor.sellerId, (await params).id, body.content) }); }
  catch (error) { return errorResponse(req, error, 'Failed to validate catalog import'); }
}
