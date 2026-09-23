import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { CatalogBulkService } from '@/features/catalog/services/bulk-service';
import { errorResponse } from '@/shared/api/error-response';

export const dynamic = 'force-dynamic';
const service = new CatalogBulkService();

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { const actor = authenticateRequest(req); if (!actor.sellerId) return NextResponse.json({ success: false, error: { code: 'SELLER_SCOPE_REQUIRED', message: 'Seller scope is required.' } }, { status: 422 }); return NextResponse.json({ success: true, data: await service.getImport(actor.userId, actor.sellerId, (await params).id) }); }
  catch (error) { return errorResponse(req, error, 'Failed to load catalog import'); }
}
