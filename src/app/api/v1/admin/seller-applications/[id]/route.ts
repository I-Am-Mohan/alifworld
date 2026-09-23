import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, defaultPolicyEngine } from '@/shared/authz';
import { errorResponse } from '@/shared/api/error-response';
import { SellerApplicationIdSchema } from '@/features/seller/application';
import { SellerApplicationService } from '@/features/seller/services/seller-application-service';
import { ValidationError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';
const service = new SellerApplicationService();

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = authenticateRequest(req);
    const id = (await params).id;
    const parsed = SellerApplicationIdSchema.safeParse(id);
    if (!parsed.success) throw new ValidationError('Invalid seller application identifier.', parsed.error.flatten());
    await defaultPolicyEngine.assert(actor, 'seller_application:review', { type: 'SELLER', id });
    const application = await service.getForAdmin(id);
    return NextResponse.json({ success: true, data: application }, { status: 200 });
  } catch (error) {
    return errorResponse(req, error, 'Failed to load seller application review details');
  }
}
