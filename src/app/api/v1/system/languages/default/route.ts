import { NextRequest, NextResponse } from 'next/server';
import { I18nService } from '@/services/i18n.service';
import { errorResponse } from '@/shared/api/error-response';
import { authenticateRequest } from '@/shared/authz/guard.helper';
import { defaultPolicyEngine } from '@/shared/authz';

export const dynamic = 'force-dynamic';

const i18nService = new I18nService();

/**
 * PATCH /api/v1/system/languages/default
 * 
 * Sets the system-wide default language for all new visitors.
 * Request body: { "defaultLocale": "bn" } or { "defaultLocale": "en" }
 */
export async function PATCH(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    await defaultPolicyEngine.assert(actor, 'system:config', { type: 'SYSTEM', id: 'I18N_LANGUAGE_REGISTRY' });
    const body = await req.json().catch(() => ({}));
    const { defaultLocale } = body;

    if (!defaultLocale || typeof defaultLocale !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Field "defaultLocale" is required (e.g. "bn" or "en")',
          },
        },
        { status: 422 }
      );
    }

    const updatedConfig = await i18nService.setDefaultLocale(defaultLocale);

    return NextResponse.json(
      {
        success: true,
        data: updatedConfig,
        message: `System default language successfully updated to '${defaultLocale}'`,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return errorResponse(req, error, 'Failed to update system default language');
  }
}
