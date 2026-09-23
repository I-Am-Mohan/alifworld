import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz/guard.helper';
import { defaultPolicyEngine } from '@/shared/authz';
import { errorResponse } from '@/shared/api/error-response';
import { SellerApplicationIdSchema, SellerApplicationReviewSchema } from '@/features/seller/application';
import { SellerApplicationService } from '@/features/seller/services/seller-application-service';

export const dynamic = 'force-dynamic';
const service = new SellerApplicationService();

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = authenticateRequest(req);
    const id = (await params).id;
    const parsedId = SellerApplicationIdSchema.safeParse(id);
    const parsed = SellerApplicationReviewSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsedId.success) {
      return NextResponse.json({ success: false, error: { code: 'VALIDATION_FAILED', message: 'Invalid seller application identifier.', details: parsedId.error.flatten() } }, { status: 422 });
    }
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: { code: 'VALIDATION_FAILED', message: 'Invalid seller application review.', details: parsed.error.flatten() } }, { status: 422 });
    }
    await defaultPolicyEngine.assert(actor, 'seller_application:review', { type: 'SELLER', id });
    const application = await service.review(id, actor.userId, parsed.data);
    return NextResponse.json({ success: true, data: application }, { status: 200 });
  } catch (error) {
    return errorResponse(req, error, 'Failed to review seller application');
  }
}
