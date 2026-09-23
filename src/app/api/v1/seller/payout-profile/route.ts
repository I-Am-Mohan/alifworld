import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse } from '@/shared/api/error-response';
import { SellerPayoutProfileService } from '@/features/seller/services/seller-payout-profile-service';
import { PayoutProfileInputSchema } from '@/features/seller/payout-profile';
import { ValidationError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';
const service = new SellerPayoutProfileService();

export async function GET(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    const sellerId = req.nextUrl.searchParams.get('sellerId') || actor.sellerId;
    if (!sellerId) throw new ValidationError('sellerId is required.');
    return NextResponse.json({ success: true, data: await service.getPrimary(actor, sellerId) }, { status: 200 });
  } catch (error) {
    return errorResponse(req, error, 'Failed to load payout profile');
  }
}

export async function PUT(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    const parsed = PayoutProfileInputSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new ValidationError('Invalid payout profile.', parsed.error.flatten());
    const result = await service.replace(actor, parsed.data);
    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error) {
    return errorResponse(req, error, 'Failed to save payout profile');
  }
}
