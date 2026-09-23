import { NextRequest, NextResponse } from 'next/server';
import { I18nService } from '@/services/i18n.service';
import { errorResponse } from '@/shared/api/error-response';
import { authenticateRequest } from '@/shared/authz/guard.helper';
import { defaultPolicyEngine } from '@/shared/authz';
import { AppError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

const i18nService = new I18nService();

/**
 * GET /api/v1/system/languages
 * 
 * Returns the platform's supported languages, active languages list, and system default locale.
 */
export async function GET() {
  try {
    const config = await i18nService.getConfig();
    const activeLanguages = config.languages.filter((l) => l.isActive);

    return NextResponse.json(
      {
        success: true,
        data: {
          defaultLocale: config.defaultLocale,
          languages: config.languages,
          activeLanguages,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            details: error.details,
          },
        },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve platform languages',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/system/languages
 * 
 * Dynamically registers a new language on the platform.
 */
export async function POST(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    await defaultPolicyEngine.assert(actor, 'system:config', { type: 'SYSTEM', id: 'I18N_LANGUAGE_REGISTRY' });
    const body = await req.json().catch(() => ({}));
    const { code, name, nativeName, wordForLanguage, direction, isActive } = body;

    const updatedConfig = await i18nService.addLanguage({
      code,
      name,
      nativeName,
      wordForLanguage,
      direction,
      isActive,
    });

    return NextResponse.json(
      {
        success: true,
        data: updatedConfig,
        message: `Language '${code}' successfully registered`,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return errorResponse(req, error, 'Failed to register language');
  }
}
