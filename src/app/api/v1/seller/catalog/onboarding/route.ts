import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { CatalogOnboardingService } from '@/features/catalog/services/onboarding-service';
import { errorResponse } from '@/shared/api/error-response';

export const dynamic = 'force-dynamic';
const service = new CatalogOnboardingService();

export async function GET(req: NextRequest) {
  try { const actor = authenticateRequest(req); if (!actor.sellerId) return NextResponse.json({ success: false, error: { code: 'SELLER_SCOPE_REQUIRED', message: 'Seller scope is required.' } }, { status: 422 }); return NextResponse.json({ success: true, data: await service.getSellerOnboarding(actor.userId, actor.sellerId) }); }
  catch (error) { return errorResponse(req, error, 'Failed to load seller onboarding progress'); }
}
