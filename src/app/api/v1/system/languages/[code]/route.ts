import { NextRequest, NextResponse } from 'next/server';
import { I18nService } from '@/services/i18n.service';
import { errorResponse } from '@/shared/api/error-response';
import { authenticateRequest } from '@/shared/authz/guard.helper';
import { defaultPolicyEngine } from '@/shared/authz';
import { AppError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

const i18nService = new I18nService();

/**
 * PATCH /api/v1/system/languages/[code]
 * 
 * Updates a language (activate/deactivate, name, wordForLanguage, etc.).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const actor = authenticateRequest(req);
    await defaultPolicyEngine.assert(actor, 'system:config', { type: 'SYSTEM', id: 'I18N_LANGUAGE_REGISTRY' });
    const { code } = await params;
    const body = await req.json().catch(() => ({}));

    const updatedConfig = await i18nService.updateLanguage(code, body);

    return NextResponse.json(
      {
        success: true,
        data: updatedConfig,
        message: `Language '${code}' updated successfully`,
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
          message: 'Failed to update language',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/system/languages/[code]
 * 
 * Removes a non-default language from the system.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const actor = authenticateRequest(_req);
    await defaultPolicyEngine.assert(actor, 'system:config', { type: 'SYSTEM', id: 'I18N_LANGUAGE_REGISTRY' });
    const { code } = await params;

    const updatedConfig = await i18nService.deleteLanguage(code);

    return NextResponse.json(
      {
        success: true,
        data: updatedConfig,
        message: `Language '${code}' removed successfully`,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return errorResponse(_req, error, 'Failed to delete language');
  }
}
