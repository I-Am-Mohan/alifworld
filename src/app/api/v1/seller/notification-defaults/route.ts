import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse } from '@/shared/api/error-response';
import { ValidationError } from '@/shared/errors/app-error';
import { SellerNotificationDefaultsSchema } from '@/features/seller/operational-defaults';
import { SellerOperationalDefaultsService } from '@/features/seller/services/seller-operational-defaults-service';

export const dynamic = 'force-dynamic';
const service = new SellerOperationalDefaultsService();

export async function GET(req: NextRequest) {
  try { const actor = authenticateRequest(req); const sellerId = req.nextUrl.searchParams.get('sellerId') || actor.sellerId; if (!sellerId) throw new ValidationError('sellerId is required.'); return NextResponse.json({ success: true, data: await service.getNotifications(actor, sellerId) }); } catch (error) { return errorResponse(req, error, 'Failed to load seller notification defaults'); }
}

export async function PUT(req: NextRequest) {
  try { const actor = authenticateRequest(req); const parsed = SellerNotificationDefaultsSchema.safeParse(await req.json().catch(() => ({}))); if (!parsed.success) throw new ValidationError('Invalid seller notification defaults.', parsed.error.flatten()); return NextResponse.json({ success: true, data: await service.saveNotifications(actor, parsed.data) }); } catch (error) { return errorResponse(req, error, 'Failed to save seller notification defaults'); }
}
