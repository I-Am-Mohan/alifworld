import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz/guard.helper';
import { defaultPolicyEngine } from '@/shared/authz';
import { errorResponse } from '@/shared/api/error-response';
import { SellerApplicationIdSchema } from '@/features/seller/application';
import { SellerApplicationService } from '@/features/seller/services/seller-application-service';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
const service = new SellerApplicationService();
const submitSchema = z.object({ version: z.number().int().positive() });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = authenticateRequest(req);
    const id = (await params).id;
    const parsedId = SellerApplicationIdSchema.safeParse(id);
    const parsedBody = submitSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsedId.success || !parsedBody.success) {
      return NextResponse.json({ success: false, error: { code: 'VALIDATION_FAILED', message: 'A valid application identifier and version are required.' } }, { status: 422 });
    }
    await defaultPolicyEngine.assert(actor, 'seller_application:submit', { type: 'SELLER', id, ownerId: actor.userId });
    const application = await service.submit(actor.userId, id, parsedBody.data.version);
    return NextResponse.json({ success: true, data: application }, { status: 200 });
  } catch (error) {
    return errorResponse(req, error, 'Failed to submit seller application');
  }
}
