import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { ProductApprovalService } from '@/features/catalog/services/product-approval-service';
import { errorResponse } from '@/shared/api/error-response';

export const dynamic = 'force-dynamic';
const service = new ProductApprovalService();

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { authenticateRequest(req); return NextResponse.json({ success: true, data: await service.history((await params).id) }); }
  catch (error) { return errorResponse(req, error, 'Failed to load product review history'); }
}
