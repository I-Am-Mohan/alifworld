import { NextRequest, NextResponse } from 'next/server';
import { I18nService } from '@/services/i18n.service';
import { AppError } from '@/shared/errors/app-error';

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
          message: 'Failed to update system default language',
        },
      },
      { status: 500 }
    );
  }
}
