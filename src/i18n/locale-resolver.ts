/**
 * AlifWorld Server-Side Locale Resolver & Negotiation Engine
 * 
 * Implements deterministic locale resolution hierarchy:
 * 1. Path prefix (/bn-BD/..., /en-BD/..., /bn/..., /en/...)
 * 2. Query parameter (?locale=... or ?lang=...)
 * 3. Request header (x-locale)
 * 4. Cookie (aw_locale)
 * 5. Accept-Language header (RFC 7231 quality-weighted parsing)
 * 6. Default launch fallback (bn-BD)
 * 
 * Invariants: ADR-0003, Phase 06 Milestone 051, BCP 47
 */

import { NextRequest } from 'next/server';
import {
  CanonicalLocale,
  SupportedLocale,
  LocaleNegotiationSource,
  ResolvedLocaleInfo,
} from './types';
import {
  CANONICAL_LOCALES,
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  DEFAULT_SHORT_LOCALE,
  LOCALE_COOKIE_NAME,
  CANONICAL_LANGUAGES,
  INITIAL_LANGUAGES,
  normalizeToCanonicalLocale,
  normalizeToShortLocale,
  isSupportedLocale,
} from './config';

/**
 * Extracts locale from URL path prefix if present.
 * Matches /bn-BD/..., /en-BD/..., /bn/..., /en/...
 */
export function extractLocaleFromPath(pathname: string): {
  locale: CanonicalLocale | null;
  rawPrefix: string | null;
  pathnameWithoutLocale: string;
} {
  if (!pathname || pathname === '/') {
    return { locale: null, rawPrefix: null, pathnameWithoutLocale: '/' };
  }

  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) {
    return { locale: null, rawPrefix: null, pathnameWithoutLocale: '/' };
  }

  const firstSegment = segments[0].toLowerCase();

  if (firstSegment === 'bn-bd' || firstSegment === 'bn') {
    const remaining = '/' + segments.slice(1).join('/');
    return {
      locale: 'bn-BD',
      rawPrefix: segments[0],
      pathnameWithoutLocale: remaining === '' ? '/' : remaining,
    };
  }

  if (firstSegment === 'en-bd' || firstSegment === 'en') {
    const remaining = '/' + segments.slice(1).join('/');
    return {
      locale: 'en-BD',
      rawPrefix: segments[0],
      pathnameWithoutLocale: remaining === '' ? '/' : remaining,
    };
  }

  return { locale: null, rawPrefix: null, pathnameWithoutLocale: pathname };
}

/**
 * Parses and sorts an Accept-Language header according to RFC 7231 quality values.
 */
export function parseAcceptLanguage(header: string | null | undefined): string[] {
  if (!header || typeof header !== 'string') {
    return [];
  }

  return header
    .split(',')
    .map((entry) => {
      const parts = entry.trim().split(';');
      const code = parts[0].trim();
      let q = 1.0;
      if (parts[1]) {
        const qPart = parts[1].trim();
        if (qPart.startsWith('q=')) {
          const parsedQ = parseFloat(qPart.slice(2));
          if (!isNaN(parsedQ)) q = parsedQ;
        }
      }
      return { code, q };
    })
    .filter((item) => item.code.length > 0 && item.q > 0)
    .sort((a, b) => b.q - a.q)
    .map((item) => item.code);
}

/**
 * Resolves the preferred supported locale from an Accept-Language header.
 */
export function resolveFromAcceptLanguage(header: string | null | undefined): CanonicalLocale | null {
  const preferred = parseAcceptLanguage(header);

  for (const candidate of preferred) {
    const clean = candidate.toLowerCase();
    if (clean.startsWith('bn') || clean.includes('bangla') || clean.includes('bengali')) {
      return 'bn-BD';
    }
    if (clean.startsWith('en')) {
      return 'en-BD';
    }
  }

  return null;
}

/**
 * Determines the authoritative locale for an incoming HTTP request using strict precedence.
 */
export function resolveLocaleFromRequest(req: NextRequest): {
  locale: CanonicalLocale;
  shortCode: 'bn' | 'en';
  source: LocaleNegotiationSource;
} {
  const pathname = req.nextUrl?.pathname || new URL(req.url).pathname;

  // 1. Path prefix check (highest precedence)
  const pathResult = extractLocaleFromPath(pathname);
  if (pathResult.locale) {
    return {
      locale: pathResult.locale,
      shortCode: normalizeToShortLocale(pathResult.locale),
      source: 'path',
    };
  }

  // 2. Explicit query parameter (?locale=... or ?lang=...)
  const queryLocale =
    req.nextUrl?.searchParams?.get('locale') ||
    req.nextUrl?.searchParams?.get('lang') ||
    new URL(req.url).searchParams.get('locale') ||
    new URL(req.url).searchParams.get('lang');

  if (queryLocale && isSupportedLocale(queryLocale)) {
    const canonical = normalizeToCanonicalLocale(queryLocale);
    return {
      locale: canonical,
      shortCode: normalizeToShortLocale(canonical),
      source: 'query',
    };
  }

  // 3. Custom request header (e.g. from Flutter mobile app or API client)
  const headerLocale = req.headers.get('x-locale');
  if (headerLocale && isSupportedLocale(headerLocale)) {
    const canonical = normalizeToCanonicalLocale(headerLocale);
    return {
      locale: canonical,
      shortCode: normalizeToShortLocale(canonical),
      source: 'header',
    };
  }

  // 4. Client cookie (aw_locale)
  const cookieLocale = req.cookies.get(LOCALE_COOKIE_NAME)?.value;
  if (cookieLocale && isSupportedLocale(cookieLocale)) {
    const canonical = normalizeToCanonicalLocale(cookieLocale);
    return {
      locale: canonical,
      shortCode: normalizeToShortLocale(canonical),
      source: 'cookie',
    };
  }

  // 5. Accept-Language header negotiation
  const acceptLangHeader = req.headers.get('accept-language');
  const negotiated = resolveFromAcceptLanguage(acceptLangHeader);
  if (negotiated) {
    return {
      locale: negotiated,
      shortCode: normalizeToShortLocale(negotiated),
      source: 'accept-language',
    };
  }

  // 6. Default platform fallback
  return {
    locale: DEFAULT_LOCALE,
    shortCode: DEFAULT_SHORT_LOCALE,
    source: 'default',
  };
}

/**
 * Returns comprehensive locale metadata for a request.
 */
export function getResolvedLocaleDetails(req: NextRequest): ResolvedLocaleInfo {
  const { locale, shortCode, source } = resolveLocaleFromRequest(req);
  const language =
    CANONICAL_LANGUAGES.find((l) => l.code === locale) ||
    INITIAL_LANGUAGES.find((l) => l.code === shortCode) ||
    CANONICAL_LANGUAGES[0];

  return {
    locale,
    shortCode,
    source,
    direction: language.direction || 'ltr',
    language,
  };
}

/**
 * Strips locale prefix from a pathname.
 */
export function stripLocaleFromPath(pathname: string): string {
  return extractLocaleFromPath(pathname).pathnameWithoutLocale;
}

/**
 * Prepends a target canonical locale to a pathname.
 */
export function buildLocalizedUrl(pathname: string, targetLocale: string = DEFAULT_LOCALE): string {
  const canonical = normalizeToCanonicalLocale(targetLocale);
  const cleanPath = stripLocaleFromPath(pathname);
  if (cleanPath === '/') {
    return `/${canonical}`;
  }
  return `/${canonical}${cleanPath}`;
}
