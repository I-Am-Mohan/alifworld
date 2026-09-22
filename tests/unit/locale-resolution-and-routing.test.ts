/**
 * Unit Tests: Locale Resolution & Internationalization Architecture (Milestone 051)
 * 
 * Verifies:
 * 1. BCP 47 locale normalization (bn-BD, en-BD, short aliases bn, en)
 * 2. Deterministic locale resolution priority (path > query > header > cookie > accept-language > fallback)
 * 3. Path prefix extraction, stripping, and localized URL generation
 * 4. RFC 7231 Accept-Language quality-weighted parsing
 * 5. Server-side translation dictionary retrieval and parameter interpolation
 * 6. Bangladesh localization primitives (BDT poisha formatting, Bengali numerals, Asia/Dhaka dates)
 * 
 * Invariants: ADR-0003, ADR-0022, Phase 06 Milestone 051
 */

import { describe, it, expect } from 'bun:test';
import { NextRequest } from 'next/server';
import {
  normalizeToCanonicalLocale,
  normalizeToShortLocale,
  isSupportedLocale,
  DEFAULT_LOCALE,
  DEFAULT_SHORT_LOCALE,
  LOCALE_COOKIE_NAME,
} from '@/i18n/config';
import {
  extractLocaleFromPath,
  parseAcceptLanguage,
  resolveFromAcceptLanguage,
  resolveLocaleFromRequest,
  stripLocaleFromPath,
  buildLocalizedUrl,
} from '@/i18n/locale-resolver';
import {
  getDictionary,
  resolveTranslationValue,
  registerTranslation,
} from '@/i18n/translations';
import {
  formatServerMessage,
  createTranslator,
} from '@/i18n/server';
import {
  formatLocalizedCurrency,
  formatLocalizedNumber,
  formatLocalizedDateTime,
  toBengaliNumerals,
  parseBengaliNumerals,
  DHAKA_TIMEZONE,
} from '@/shared/utils/localization';

describe('Locale Resolution & i18n Architecture Unit Tests (Milestone 051)', () => {
  // ── 1. BCP 47 Normalization & Verification ──────────────────────────────────

  describe('1. BCP 47 Normalization & Support Checks', () => {
    it('normalizes Bengali locale variants to canonical bn-BD', () => {
      expect(normalizeToCanonicalLocale('bn')).toBe('bn-BD');
      expect(normalizeToCanonicalLocale('bn-bd')).toBe('bn-BD');
      expect(normalizeToCanonicalLocale('BN-BD')).toBe('bn-BD');
      expect(normalizeToCanonicalLocale('bn_BD')).toBe('bn-BD');
      expect(normalizeToCanonicalLocale('bangla')).toBe('bn-BD');
      expect(normalizeToCanonicalLocale('bengali')).toBe('bn-BD');
    });

    it('normalizes English locale variants to canonical en-BD', () => {
      expect(normalizeToCanonicalLocale('en')).toBe('en-BD');
      expect(normalizeToCanonicalLocale('en-bd')).toBe('en-BD');
      expect(normalizeToCanonicalLocale('EN-BD')).toBe('en-BD');
      expect(normalizeToCanonicalLocale('en_BD')).toBe('en-BD');
      expect(normalizeToCanonicalLocale('en-us')).toBe('en-BD');
      expect(normalizeToCanonicalLocale('english')).toBe('en-BD');
    });

    it('falls back to default bn-BD for unknown, null, or empty locales', () => {
      expect(normalizeToCanonicalLocale(null)).toBe('bn-BD');
      expect(normalizeToCanonicalLocale(undefined)).toBe('bn-BD');
      expect(normalizeToCanonicalLocale('')).toBe('bn-BD');
      expect(normalizeToCanonicalLocale('fr-FR')).toBe('bn-BD');
      expect(normalizeToCanonicalLocale('es')).toBe('bn-BD');
    });

    it('normalizes canonical locales to short ISO 639-1 language codes', () => {
      expect(normalizeToShortLocale('bn-BD')).toBe('bn');
      expect(normalizeToShortLocale('bn')).toBe('bn');
      expect(normalizeToShortLocale('en-BD')).toBe('en');
      expect(normalizeToShortLocale('en')).toBe('en');
      expect(normalizeToShortLocale(null)).toBe('bn');
    });

    it('isSupportedLocale correctly validates supported launch locales', () => {
      expect(isSupportedLocale('bn')).toBe(true);
      expect(isSupportedLocale('en')).toBe(true);
      expect(isSupportedLocale('bn-BD')).toBe(true);
      expect(isSupportedLocale('en-BD')).toBe(true);
      expect(isSupportedLocale('bn-bd')).toBe(true);
      expect(isSupportedLocale('en-bd')).toBe(true);
      expect(isSupportedLocale('fr')).toBe(false);
      expect(isSupportedLocale('de')).toBe(false);
      expect(isSupportedLocale(null)).toBe(false);
    });
  });

  // ── 2. Path Locale Extraction & URL Manipulation ────────────────────────────

  describe('2. Path Extraction & Localized URL Generation', () => {
    it('extracts canonical bn-BD and en-BD from URL path prefixes', () => {
      const bnPath = extractLocaleFromPath('/bn-BD/products/smart-watch');
      expect(bnPath.locale).toBe('bn-BD');
      expect(bnPath.pathnameWithoutLocale).toBe('/products/smart-watch');

      const enPath = extractLocaleFromPath('/en-BD/cart');
      expect(enPath.locale).toBe('en-BD');
      expect(enPath.pathnameWithoutLocale).toBe('/cart');
    });

    it('extracts short aliases /bn/ and /en/ and normalizes them to canonical tags', () => {
      const shortBn = extractLocaleFromPath('/bn/orders');
      expect(shortBn.locale).toBe('bn-BD');
      expect(shortBn.pathnameWithoutLocale).toBe('/orders');

      const shortEn = extractLocaleFromPath('/en/deals');
      expect(shortEn.locale).toBe('en-BD');
      expect(shortEn.pathnameWithoutLocale).toBe('/deals');
    });

    it('returns locale: null for un-prefixed paths', () => {
      const root = extractLocaleFromPath('/');
      expect(root.locale).toBeNull();
      expect(root.pathnameWithoutLocale).toBe('/');

      const products = extractLocaleFromPath('/products');
      expect(products.locale).toBeNull();
      expect(products.pathnameWithoutLocale).toBe('/products');
    });

    it('stripLocaleFromPath removes locale prefix cleanly', () => {
      expect(stripLocaleFromPath('/bn-BD/products/tv')).toBe('/products/tv');
      expect(stripLocaleFromPath('/en/checkout')).toBe('/checkout');
      expect(stripLocaleFromPath('/cart')).toBe('/cart');
    });

    it('buildLocalizedUrl constructs prefixed URLs with target canonical locale', () => {
      expect(buildLocalizedUrl('/products', 'en-BD')).toBe('/en-BD/products');
      expect(buildLocalizedUrl('/bn-BD/products', 'en-BD')).toBe('/en-BD/products');
      expect(buildLocalizedUrl('/en/cart', 'bn-BD')).toBe('/bn-BD/cart');
      expect(buildLocalizedUrl('/', 'en-BD')).toBe('/en-BD');
    });
  });

  // ── 3. Accept-Language Header Parsing ───────────────────────────────────────

  describe('3. RFC 7231 Accept-Language Quality-Weighted Parsing', () => {
    it('parses and sorts language preferences by quality weight q', () => {
      const header = 'en-US,en;q=0.8,bn-BD;q=0.9,bn;q=0.7';
      const sorted = parseAcceptLanguage(header);

      // en-US (q=1.0) > bn-BD (q=0.9) > en (q=0.8) > bn (q=0.7)
      expect(sorted[0]).toBe('en-US');
      expect(sorted[1]).toBe('bn-BD');
      expect(sorted[2]).toBe('en');
      expect(sorted[3]).toBe('bn');
    });

    it('resolves preferred supported locale from Accept-Language header', () => {
      // Bengali preferred
      expect(resolveFromAcceptLanguage('bn-BD,bn;q=0.9,en-US;q=0.5')).toBe('bn-BD');

      // English preferred
      expect(resolveFromAcceptLanguage('en-US,en;q=0.9,bn;q=0.5')).toBe('en-BD');

      // No match returns null
      expect(resolveFromAcceptLanguage('fr-FR,fr;q=0.9,es;q=0.8')).toBeNull();
    });
  });

  // ── 4. Deterministic Precedence Hierarchy ───────────────────────────────────

  describe('4. Locale Negotiation Precedence Hierarchy', () => {
    it('Priority 1: Path prefix overrides query, header, cookie, and accept-language', () => {
      const req = new NextRequest('http://localhost:3000/en-BD/products?locale=bn-BD', {
        headers: {
          'x-locale': 'bn-BD',
          'accept-language': 'bn-BD,bn;q=0.9',
          cookie: `${LOCALE_COOKIE_NAME}=bn-BD`,
        },
      });

      const result = resolveLocaleFromRequest(req);
      expect(result.locale).toBe('en-BD');
      expect(result.source).toBe('path');
    });

    it('Priority 2: Query param overrides header, cookie, and accept-language', () => {
      const req = new NextRequest('http://localhost:3000/products?locale=en-BD', {
        headers: {
          'x-locale': 'bn-BD',
          'accept-language': 'bn-BD,bn;q=0.9',
          cookie: `${LOCALE_COOKIE_NAME}=bn-BD`,
        },
      });

      const result = resolveLocaleFromRequest(req);
      expect(result.locale).toBe('en-BD');
      expect(result.source).toBe('query');
    });

    it('Priority 3: Custom x-locale header overrides cookie and accept-language', () => {
      const req = new NextRequest('http://localhost:3000/api/v1/orders', {
        headers: {
          'x-locale': 'en-BD',
          'accept-language': 'bn-BD,bn;q=0.9',
          cookie: `${LOCALE_COOKIE_NAME}=bn-BD`,
        },
      });

      const result = resolveLocaleFromRequest(req);
      expect(result.locale).toBe('en-BD');
      expect(result.source).toBe('header');
    });

    it('Priority 4: aw_locale cookie overrides Accept-Language header', () => {
      const req = new NextRequest('http://localhost:3000/products', {
        headers: {
          'accept-language': 'en-US,en;q=0.9',
          cookie: `${LOCALE_COOKIE_NAME}=bn-BD`,
        },
      });

      const result = resolveLocaleFromRequest(req);
      expect(result.locale).toBe('bn-BD');
      expect(result.source).toBe('cookie');
    });

    it('Priority 5: Accept-Language resolves when cookie and explicit parameters are absent', () => {
      const req = new NextRequest('http://localhost:3000/products', {
        headers: {
          'accept-language': 'en-US,en;q=0.9',
        },
      });

      const result = resolveLocaleFromRequest(req);
      expect(result.locale).toBe('en-BD');
      expect(result.source).toBe('accept-language');
    });

    it('Priority 6: Falls back to default launch locale (bn-BD) when no indicators exist', () => {
      const req = new NextRequest('http://localhost:3000/products');

      const result = resolveLocaleFromRequest(req);
      expect(result.locale).toBe(DEFAULT_LOCALE);
      expect(result.source).toBe('default');
    });
  });

  // ── 5. Translation Resolution & Interpolation ───────────────────────────────

  describe('5. Translation Resolution & Parameter Interpolation', () => {
    it('retrieves dictionaries for canonical bn-BD and en-BD without throwing', () => {
      const bnDict = getDictionary('bn-BD');
      expect(bnDict.common.save).toBe('সংরক্ষণ করুন');

      const enDict = getDictionary('en-BD');
      expect(enDict.common.save).toBe('Save');
    });

    it('resolves nested keys and interpolates dynamic parameters', () => {
      const bnDict = getDictionary('bn-BD');
      const resolved = resolveTranslationValue(bnDict, 'store.divisions.locationSet', {
        location: 'ঢাকা',
      });
      expect(resolved).toBe('ডেলিভারি লোকেশন নির্ধারণ করা হয়েছে: ঢাকা');
    });

    it('formatServerMessage formats localized message on the server', () => {
      const messageEn = formatServerMessage('common.save', undefined, 'en-BD');
      expect(messageEn).toBe('Save');

      const messageBn = formatServerMessage('common.save', undefined, 'bn-BD');
      expect(messageBn).toBe('সংরক্ষণ করুন');
    });

    it('createTranslator creates a pre-bound translation function', () => {
      const t = createTranslator('en-BD');
      expect(t('common.cancel')).toBe('Cancel');
      expect(t('nav.home')).toBe('Home');
    });
  });

  // ── 6. Bangladesh Localization Formatting Primitives ────────────────────────

  describe('6. Bangladesh Localization Formatting Primitives', () => {
    it('formats BDT currency in Bengali numerals for bn-BD', () => {
      // 250,000 poisha = 2,500.00 BDT
      const bnMoney = formatLocalizedCurrency(250000n, 'bn-BD');
      expect(bnMoney).toContain('২,৫০০.০০');
      expect(bnMoney).toContain('৳');
    });

    it('formats BDT currency in standard ASCII numbers for en-BD', () => {
      const enMoney = formatLocalizedCurrency(250000n, 'en-BD');
      expect(enMoney).toBe('BDT 2,500.00');
    });

    it('converts ASCII digits to Bengali numerals and vice-versa', () => {
      expect(toBengaliNumerals('01700112233')).toBe('০১৭০০১১২২৩৩');
      expect(parseBengaliNumerals('০১৭০০১১২২৩৩')).toBe('01700112233');
      expect(formatLocalizedNumber(450, 'bn-BD')).toBe('৪৫০');
      expect(formatLocalizedNumber(450, 'en-BD')).toBe('450');
    });

    it('formats dates in Asia/Dhaka timezone', () => {
      const date = new Date('2026-09-23T06:00:00Z'); // 12:00 PM Dhaka (UTC+6)
      const formatted = formatLocalizedDateTime(date, 'en-BD');
      expect(formatted).toContain('2026');
      expect(formatted).toContain('September');
      expect(formatted).toContain('12:00');
    });
  });
});
