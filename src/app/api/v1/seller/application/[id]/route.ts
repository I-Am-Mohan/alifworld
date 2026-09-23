import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz/guard.helper';
import { defaultPolicyEngine } from '@/shared/authz';
import { errorResponse } from '@/shared/api/error-response';
import { SellerApplicationIdSchema, SellerApplicationUpdateSchema } from '@/features/seller/application';
import { SellerApplicationService } from '@/features/seller/services/seller-application-service';

export const dynamic = 'force-dynamic';
const service = new SellerApplicationService();

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = authenticateRequest(req);
    const parsedId = SellerApplicationIdSchema.safeParse((await params).id);
    if (!parsedId.success) return NextResponse.json({ success: false, error: { code: 'VALIDATION_FAILED', message: 'Invalid seller application identifier.' } }, { status: 422 });
    const application = await service.getForApplicant(parsedId.data, actor.userId);
    if (!application) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Seller application not found.' } }, { status: 404 });
    await defaultPolicyEngine.assert(actor, 'seller_application:read', { type: 'SELLER', id: application.id, ownerId: application.applicantUserId, sellerId: application.sellerId });
    return NextResponse.json({ success: true, data: application }, { status: 200 });
  } catch (error) {
    return errorResponse(req, error, 'Failed to load seller application');
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = authenticateRequest(req);
    const id = (await params).id;
    const parsedId = SellerApplicationIdSchema.safeParse(id);
    if (!parsedId.success) return NextResponse.json({ success: false, error: { code: 'VALIDATION_FAILED', message: 'Invalid seller application identifier.' } }, { status: 422 });
    const parsed = SellerApplicationUpdateSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ success: false, error: { code: 'VALIDATION_FAILED', message: 'Invalid seller application update.', details: parsed.error.flatten() } }, { status: 422 });
    await defaultPolicyEngine.assert(actor, 'seller_application:update', { type: 'SELLER', id, ownerId: actor.userId });
    const application = await service.updateDraft(actor.userId, id, parsed.data);
    return NextResponse.json({ success: true, data: application }, { status: 200 });
  } catch (error) {
    return errorResponse(req, error, 'Failed to update seller application');
  }
}
