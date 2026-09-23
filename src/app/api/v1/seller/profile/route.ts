import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, defaultPolicyEngine } from '@/shared/authz';
import { errorResponse } from '@/shared/api/error-response';
import { SellerRepository } from '@/features/seller/repositories/seller-repository';
import { AuthorizationError, NotFoundError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';
const repository = new SellerRepository();

export async function GET(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    const requestedSellerId = req.nextUrl.searchParams.get('sellerId');
    if (!actor.roles.includes('SUPER_ADMIN') && requestedSellerId && requestedSellerId !== actor.sellerId) {
      throw new AuthorizationError('Tenant isolation violation: Requested seller does not match the active seller tenant.');
    }
    const sellerId = requestedSellerId || actor.sellerId;
    if (!sellerId) throw new AuthorizationError('No seller tenant is associated with this session.');
    await defaultPolicyEngine.assert(actor, 'read', { type: 'SELLER', id: sellerId, sellerId });
    const profile = await repository.getSellerProfile(sellerId);
    if (!profile) throw new NotFoundError('Seller profile not found.');
    return NextResponse.json({
      success: true,
      data: {
        id: profile.id,
        businessName: profile.businessName,
        slug: profile.slug,
        status: profile.status,
        verifiedAt: profile.verifiedAt,
        version: profile.version,
        settings: profile.settings || null,
      },
    }, { status: 200 });
  } catch (error) {
    return errorResponse(req, error, 'Failed to load seller profile');
  }
}
