import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, defaultPolicyEngine } from '@/shared/authz';
import { errorResponse } from '@/shared/api/error-response';
import { AuthorizationError } from '@/shared/errors/app-error';
import { SellerStaffService } from '@/features/seller/services/seller-staff-service';

export const dynamic = 'force-dynamic';
const service = new SellerStaffService();

export async function GET(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    const sellerId = req.nextUrl.searchParams.get('sellerId') || actor.sellerId;
    if (!sellerId) throw new AuthorizationError('Seller tenant context is required.');
    await defaultPolicyEngine.assert(actor, 'staff:read', { type: 'SELLER', id: sellerId, sellerId });
    if (!actor.roles.includes('SUPER_ADMIN') && actor.sellerId !== sellerId) throw new AuthorizationError('Cross-tenant access denied.');
    const page = Math.max(1, Number(req.nextUrl.searchParams.get('page') || 1));
    const limit = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get('limit') || 50)));
    return NextResponse.json({ success: true, data: await service.listActivity(sellerId, page, limit) });
  } catch (error) {
    return errorResponse(req, error, 'Failed to load seller staff activity');
  }
}
