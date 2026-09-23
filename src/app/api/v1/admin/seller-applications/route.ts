import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz/guard.helper';
import { defaultPolicyEngine } from '@/shared/authz';
import { errorResponse } from '@/shared/api/error-response';
import { SellerApplicationService } from '@/features/seller/services/seller-application-service';

export const dynamic = 'force-dynamic';
const service = new SellerApplicationService();

export async function GET(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    await defaultPolicyEngine.assert(actor, 'seller_application:review', { type: 'SELLER', id: 'SELLER_APPLICATION_DIRECTORY' });
    const page = Number(req.nextUrl.searchParams.get('page') || 1);
    const limit = Number(req.nextUrl.searchParams.get('limit') || 20);
    const status = req.nextUrl.searchParams.get('status') || undefined;
    const search = req.nextUrl.searchParams.get('search') || undefined;
    const result = await service.listForAdmin({ page, limit, status, search });
    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error) {
    return errorResponse(req, error, 'Failed to list seller applications');
  }
}
