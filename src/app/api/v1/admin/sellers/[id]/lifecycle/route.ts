import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, defaultPolicyEngine } from '@/shared/authz';
import { errorResponse } from '@/shared/api/error-response';
import { ValidationError } from '@/shared/errors/app-error';
import { SellerService } from '@/features/seller/services/seller-service';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
const service = new SellerService();
const schema = z.object({ action: z.enum(['RESTRICT', 'SUSPEND', 'REACTIVATE']), version: z.number().int().positive(), reason: z.string().trim().min(5).max(1000) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = authenticateRequest(req);
    const { id } = await params;
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new ValidationError('Invalid seller lifecycle request.', parsed.error.flatten());
    const action = parsed.data.action;
    await defaultPolicyEngine.assert(actor, action === 'REACTIVATE' ? 'sellers:verify' : 'sellers:suspend', { type: 'SELLER', id });
    const result = action === 'RESTRICT'
      ? await service.restrictSeller(id, parsed.data.version, parsed.data.reason, actor.userId)
      : action === 'SUSPEND'
        ? await service.suspendSeller(id, parsed.data.version, parsed.data.reason, actor.userId)
        : await service.reactivateSeller(id, parsed.data.version, parsed.data.reason, actor.userId);
    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error) {
    return errorResponse(req, error, 'Failed to update seller lifecycle status');
  }
}
