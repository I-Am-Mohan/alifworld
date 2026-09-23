import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { ProductVersionHistoryService } from '@/features/catalog/services/product-version-history-service';
import { errorResponse } from '@/shared/api/error-response';

export const dynamic = 'force-dynamic';
const service = new ProductVersionHistoryService();

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = authenticateRequest(req);
    const data = await service.list(actor, (await params).id);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return errorResponse(req, error, 'Failed to load product version history');
  }
}
