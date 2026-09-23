import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz/guard.helper';
import { defaultPolicyEngine } from '@/shared/authz';
import { errorResponse } from '@/shared/api/error-response';
import { TranslationQaService } from '@/services/translation-qa.service';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const service = new TranslationQaService();
const messageQuerySchema = z.object({
  locale: z.string().min(2).max(20),
  key: z.string().regex(/^[A-Za-z0-9_.-]+$/).min(1).max(200),
});

export async function GET(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    await defaultPolicyEngine.assert(actor, 'system:config', { type: 'SYSTEM', id: 'LOCALIZATION_QA' });

    const parsed = messageQuerySchema.safeParse({
      locale: req.nextUrl.searchParams.get('locale'),
      key: req.nextUrl.searchParams.get('key'),
    });
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_FAILED', message: 'A valid locale and translation key are required', details: parsed.error.flatten() } },
        { status: 422 }
      );
    }

    const message = await service.getMessage(parsed.data.locale, parsed.data.key);
    return NextResponse.json({ success: true, data: message }, { status: 200 });
  } catch (error) {
    return errorResponse(req, error, 'Failed to retrieve translation message');
  }
}
