import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerLocale } from '@/i18n/server';
import { formatServerMessage } from '@/i18n/server';
import { formatLocalizedText } from '@/shared/utils/localization';
import { AppError } from '@/shared/errors/app-error';

export function localizedErrorMessage(
  code: string,
  fallback: string,
  locale: string,
  params: Record<string, string | number | bigint> = {},
  messageKey?: string
): string {
  if (messageKey) {
    const translated = formatServerMessage(
      messageKey,
      Object.fromEntries(
        Object.entries(params).map(([name, value]) => [name, typeof value === 'bigint' ? value.toString() : value])
      ),
      locale
    );
    if (translated !== messageKey) return translated;
  }

  if (fallback && fallback.trim()) {
    return formatLocalizedText(fallback, params);
  }

  const defaultKey = `errors.${code}`;
  const defaultTranslated = formatServerMessage(
    defaultKey,
    Object.fromEntries(
      Object.entries(params).map(([name, value]) => [name, typeof value === 'bigint' ? value.toString() : value])
    ),
    locale
  );

  return defaultTranslated === defaultKey ? code : defaultTranslated;
}

export function validationDetails(error: z.ZodError): Array<{ path: string; code: string; message: string }> {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    code: issue.code,
    message: issue.message,
  }));
}

export function errorResponse(req: NextRequest, error: unknown, fallbackMessage = 'An unexpected error occurred'): NextResponse {
  const locale = getServerLocale(req.headers);
  if (error instanceof AppError) {
    const message = localizedErrorMessage(
      error.errorCode,
      error.message,
      locale,
      error.messageParams || {},
      error.messageKey
    );
    return NextResponse.json(
      { success: false, error: { code: error.errorCode, message, details: error.details } },
      { status: error.statusCode }
    );
  }

  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: localizedErrorMessage('INTERNAL_SERVER_ERROR', fallbackMessage, locale),
      },
    },
    { status: 500 }
  );
}

export function validationErrorResponse(req: NextRequest, error: z.ZodError): NextResponse {
  const locale = getServerLocale(req.headers);
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: formatServerMessage('errors.VALIDATION_FAILED', undefined, locale),
        details: validationDetails(error),
      },
    },
    { status: 422 }
  );
}
