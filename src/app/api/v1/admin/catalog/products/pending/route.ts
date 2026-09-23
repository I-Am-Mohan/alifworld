import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, defaultPolicyEngine } from '@/shared/authz';
import { ProductApprovalService } from '@/features/catalog/services/product-approval-service';
import { errorResponse } from '@/shared/api/error-response';

export const dynamic = 'force-dynamic';
const service = new ProductApprovalService();

export async function GET(req: NextRequest) {
  try { const actor = authenticateRequest(req); await defaultPolicyEngine.assert(actor, 'catalog:approve', { type: 'CATALOG', id: 'PRODUCT_APPROVAL_QUEUE' }); return NextResponse.json({ success: true, data: await service.pending() }); }
  catch (error) { return errorResponse(req, error, 'Failed to load product approval queue'); }
}
