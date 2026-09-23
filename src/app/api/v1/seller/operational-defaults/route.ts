import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse } from '@/shared/api/error-response';
import { ValidationError } from '@/shared/errors/app-error';
import { SellerOperationalDefaultsSchema } from '@/features/seller/operational-defaults';
import { SellerOperationalDefaultsService } from '@/features/seller/services/seller-operational-defaults-service';

export const dynamic = 'force-dynamic';
const service = new SellerOperationalDefaultsService();

export async function GET(req: NextRequest) {
  try { const actor = authenticateRequest(req); const sellerId = req.nextUrl.searchParams.get('sellerId') || actor.sellerId; if (!sellerId) throw new ValidationError('sellerId is required.'); return NextResponse.json({ success: true, data: await service.get(actor, sellerId) }); } catch (error) { return errorResponse(req, error, 'Failed to load seller operational defaults'); }
}

export async function PUT(req: NextRequest) {
  try { const actor = authenticateRequest(req); const parsed = SellerOperationalDefaultsSchema.safeParse(await req.json().catch(() => ({}))); if (!parsed.success) throw new ValidationError('Invalid seller operational defaults.', parsed.error.flatten()); return NextResponse.json({ success: true, data: await service.save(actor, parsed.data) }); } catch (error) { return errorResponse(req, error, 'Failed to save seller operational defaults'); }
}
