import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { ProductVersionHistoryService } from '@/features/catalog/services/product-version-history-service';
import { errorResponse } from '@/shared/api/error-response';

export const dynamic = 'force-dynamic';
const service = new ProductVersionHistoryService();

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string; version: string }> }) {
  try {
    const actor = authenticateRequest(req);
    const routeParams = await params;
    const version = Number(routeParams.version);
    if (!Number.isInteger(version) || version < 1) return NextResponse.json({ success: false, error: { code: 'VALIDATION_FAILED', message: 'Version must be a positive integer.' } }, { status: 422 });
    const data = await service.get(actor, routeParams.id, version);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return errorResponse(req, error, 'Failed to load product version');
  }
}
