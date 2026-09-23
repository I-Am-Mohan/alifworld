import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz/guard.helper';
import { defaultPolicyEngine } from '@/shared/authz';
import { errorResponse } from '@/shared/api/error-response';
import { SellerApplicationDraftSchema } from '@/features/seller/application';
import { SellerApplicationService } from '@/features/seller/services/seller-application-service';

export const dynamic = 'force-dynamic';
const service = new SellerApplicationService();

export async function GET(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    await defaultPolicyEngine.assert(actor, 'seller_application:read', { type: 'SELLER', ownerId: actor.userId, sellerId: actor.sellerId });
    const application = await service.getCurrentForApplicant(actor.userId);
    return NextResponse.json({ success: true, data: application }, { status: 200 });
  } catch (error) {
    return errorResponse(req, error, 'Failed to load seller application');
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    await defaultPolicyEngine.assert(actor, 'seller_application:create', { type: 'SELLER', ownerId: actor.userId });
    const parsed = SellerApplicationDraftSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: { code: 'VALIDATION_FAILED', message: 'Invalid seller application details.', details: parsed.error.flatten() } }, { status: 422 });
    }
    const application = await service.createDraft(actor.userId, parsed.data);
    return NextResponse.json({ success: true, data: application }, { status: 201 });
  } catch (error) {
    return errorResponse(req, error, 'Failed to create seller application');
  }
}
