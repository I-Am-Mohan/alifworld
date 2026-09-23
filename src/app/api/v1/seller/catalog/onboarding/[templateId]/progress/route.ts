import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { CatalogOnboardingService } from '@/features/catalog/services/onboarding-service';
import { OnboardingProgressSchema } from '@/features/catalog/onboarding';
import { ValidationError } from '@/shared/errors/app-error';
import { errorResponse } from '@/shared/api/error-response';

export const dynamic = 'force-dynamic';
const service = new CatalogOnboardingService();

export async function POST(req: NextRequest, { params }: { params: Promise<{ templateId: string }> }) {
  try { const actor = authenticateRequest(req); if (!actor.sellerId) return NextResponse.json({ success: false, error: { code: 'SELLER_SCOPE_REQUIRED', message: 'Seller scope is required.' } }, { status: 422 }); const parsed = OnboardingProgressSchema.safeParse({ ...(await req.json().catch(() => ({}))), templateId: (await params).templateId }); if (!parsed.success) throw new ValidationError('Invalid onboarding progress.', parsed.error.flatten()); return NextResponse.json({ success: true, data: await service.saveProgress(actor.userId, actor.sellerId, parsed.data) }); }
  catch (error) { return errorResponse(req, error, 'Failed to save seller onboarding progress'); }
}
