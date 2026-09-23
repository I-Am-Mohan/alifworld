import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, defaultPolicyEngine } from '@/shared/authz';
import { CatalogOnboardingService } from '@/features/catalog/services/onboarding-service';
import { OnboardingContentSchema } from '@/features/catalog/onboarding';
import { ValidationError } from '@/shared/errors/app-error';
import { errorResponse } from '@/shared/api/error-response';

export const dynamic = 'force-dynamic';
const service = new CatalogOnboardingService();

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { const actor = authenticateRequest(req); await defaultPolicyEngine.assert(actor, 'catalog:write', { type: 'CATALOG', id: (await params).id }); const parsed = OnboardingContentSchema.safeParse(await req.json().catch(() => ({}))); if (!parsed.success) throw new ValidationError('Invalid onboarding template update.', parsed.error.flatten()); return NextResponse.json({ success: true, data: await service.updateTemplate(actor.userId, (await params).id, parsed.data) }); }
  catch (error) { return errorResponse(req, error, 'Failed to update onboarding template'); }
}
