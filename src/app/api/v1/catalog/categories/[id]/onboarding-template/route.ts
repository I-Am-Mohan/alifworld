import { NextRequest, NextResponse } from 'next/server';
import { CatalogOnboardingService } from '@/features/catalog/services/onboarding-service';
import { errorResponse } from '@/shared/api/error-response';

export const dynamic = 'force-dynamic';
const service = new CatalogOnboardingService();

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { const locale = req.nextUrl.searchParams.get('locale') || 'bn-BD'; return NextResponse.json({ success: true, data: await service.getTemplate((await params).id, locale) }); }
  catch (error) { return errorResponse(req, error, 'Failed to load onboarding template'); }
}
