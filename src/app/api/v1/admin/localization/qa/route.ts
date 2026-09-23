import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz/guard.helper';
import { defaultPolicyEngine } from '@/shared/authz';
import { errorResponse } from '@/shared/api/error-response';
import { TranslationQaService, catalogQaQuerySchema } from '@/services/translation-qa.service';

export const dynamic = 'force-dynamic';

const service = new TranslationQaService();

export async function GET(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    await defaultPolicyEngine.assert(actor, 'system:config', { type: 'SYSTEM', id: 'LOCALIZATION_QA' });

    const query = catalogQaQuerySchema.safeParse({
      referenceLocale: req.nextUrl.searchParams.get('referenceLocale') || undefined,
      targetLocale: req.nextUrl.searchParams.get('targetLocale') || undefined,
      expansionLimit: req.nextUrl.searchParams.get('expansionLimit') || undefined,
    });
    if (!query.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_FAILED', message: 'Invalid localization QA query', details: query.error.flatten() } },
        { status: 422 }
      );
    }

    const report = await service.getOverview(
      query.data.referenceLocale,
      query.data.targetLocale,
      query.data.expansionLimit
    );
    return NextResponse.json({ success: true, data: report }, { status: 200 });
  } catch (error) {
    return errorResponse(req, error, 'Failed to generate localization QA report');
  }
}
