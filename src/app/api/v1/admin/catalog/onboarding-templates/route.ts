import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, defaultPolicyEngine } from '@/shared/authz';
import { CatalogOnboardingService } from '@/features/catalog/services/onboarding-service';
import { OnboardingContentSchema } from '@/features/catalog/onboarding';
import { ValidationError } from '@/shared/errors/app-error';
import { errorResponse } from '@/shared/api/error-response';

export const dynamic = 'force-dynamic';
const service = new CatalogOnboardingService();

export async function GET(req: NextRequest) {
  try { const actor = authenticateRequest(req); await defaultPolicyEngine.assert(actor, 'catalog:write', { type: 'CATALOG', id: 'ONBOARDING_TEMPLATES' }); return NextResponse.json({ success: true, data: await service.listTemplates(actor.userId) }); }
  catch (error) { return errorResponse(req, error, 'Failed to load onboarding templates'); }
}

export async function POST(req: NextRequest) {
  try { const actor = authenticateRequest(req); await defaultPolicyEngine.assert(actor, 'catalog:write', { type: 'CATALOG', id: 'ONBOARDING_TEMPLATES' }); const parsed = OnboardingContentSchema.safeParse(await req.json().catch(() => ({}))); if (!parsed.success) throw new ValidationError('Invalid onboarding template.', parsed.error.flatten()); return NextResponse.json({ success: true, data: await service.createTemplate(actor.userId, parsed.data) }, { status: 201 }); }
  catch (error) { return errorResponse(req, error, 'Failed to create onboarding template'); }
}
