# Locale Routing and Internationalization (i18n) Architecture

**Phase**: 06 — Bangladesh Localization  
**Milestone**: 051 — Establish locale routing and internationalization architecture  
**Invariants**: ADR-0003 (Single Modular Monolith), ADR-0022 (Lifecycle & Audit Invariants), BCP 47, RFC 7231  
**Locales**: `bn-BD` (Bangla - Bangladesh, Default), `en-BD` (English - Bangladesh)  
**Timezone**: `Asia/Dhaka` (UTC+6)  
**Currency**: BDT (Integer Poisha, Minor Units)  
**Status**: Accepted & Implemented  

---

## 1. Executive Summary

Milestone 051 establishes the core internationalization and locale routing architecture for AlifWorld, designating Bangladesh as the primary operational market while building an extensible, multi-language foundation capable of supporting future regional expansions.

The architecture delivers:
1. **BCP 47 Regional Tagging**: Canonical support for `bn-BD` and `en-BD`, with bidirectional normalization from legacy short codes (`bn`, `en`).
2. **Deterministic Precedence Hierarchy**: Strict 6-tier negotiation algorithm resolving the user's preferred language across URL prefixes, query parameters, custom headers, persistent cookies, and browser `Accept-Language` headers.
3. **Middleware Routing & Rewriting**: Next.js global middleware (`src/middleware.ts`) detects the requested locale, injects `x-locale` correlation headers, synchronizes the `aw_locale` cookie, and rewrites path-prefixed routes internally without breaking URL structure.
4. **Dual Server/Client Translation Architecture**: Server Components and Route Handlers resolve translations via `src/i18n/server.ts`, while interactive Client Components leverage `src/i18n/context.tsx` and the smart UX language switcher.
5. **Localization Primitives**: High-precision integer poisha currency formatting, Bengali numeral conversion (`০-৯`), and `Asia/Dhaka` timezone date calculations.

---

## 2. Canonical Locales & Normalization

AlifWorld utilizes standard BCP 47 language and country subtags:

| Canonical Locale | Short Alias | Display Name | Native Name | Direction | Launch Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`bn-BD`** | `bn` | বাংলা (বাংলাদেশ) | বাংলা | LTR | **Default Launch Locale** |
| **`en-BD`** | `en` | English (Bangladesh) | English | LTR | Supported Launch Locale |

### Normalization Guarantees
- The `normalizeToCanonicalLocale()` utility maps variations (`'bn'`, `'bn-bd'`, `'bn_BD'`, `'bangla'`) to `'bn-BD'`.
- Variations of English (`'en'`, `'en-bd'`, `'en_BD'`, `'en-us'`, `'english'`) normalize to `'en-BD'`.
- Unrecognized or unsupported inputs fall back to `'bn-BD'`.
- The `normalizeToShortLocale()` utility maps canonical tags back to 2-letter ISO 639-1 codes (`'bn'`, `'en'`) for legacy API compatibility.

---

## 3. Locale Resolution Precedence Hierarchy

The server resolves the request locale using the following strict priority chain:

```
[ Incoming HTTP Request ]
          │
          ▼
   1. Path Prefix? ─── YES ───► Extract (/bn-BD/..., /en-BD/..., /bn/..., /en/...)
          │ NO
          ▼
   2. Query Param? ─── YES ───► Extract (?locale=... or ?lang=...)
          │ NO
          ▼
   3. Header x-locale? ─ YES ─► Extract (e.g. Flutter mobile client)
          │ NO
          ▼
   4. Cookie aw_locale? ─ YES ─► Extract (Client browser session)
          │ NO
          ▼
   5. Accept-Language? ── YES ─► RFC 7231 Quality-Weighted Parse & Match
          │ NO
          ▼
   6. Fallback ───────────────► DEFAULT_LOCALE ('bn-BD')
```

---

## 4. Next.js Middleware Integration

The global middleware (`src/middleware.ts`) governs locale routing:

1. **Header Propagation**:
   - `x-locale`: Canonical BCP 47 tag (e.g. `'bn-BD'`).
   - `x-locale-short`: 2-letter language code (e.g. `'bn'`).
   - `x-locale-source`: Resolution source (`'path'`, `'query'`, `'header'`, `'cookie'`, `'accept-language'`, `'default'`).
   - `Content-Language`: Set on every HTTP response for browser and SEO compliance.
2. **Cookie Synchronization**:
   - Updates `aw_locale` cookie (`SameSite=Lax`, `Path=/`, `MaxAge=1 year`) when the resolved locale differs from the stored cookie.
3. **URL Rewriting**:
   - When a user accesses `/bn-BD/products` or `/en-BD/products`, the middleware rewrites the request internally to `/products` with `x-locale` set in the request headers, allowing single Next.js page components to render localized content without route file duplication.
   - REST API routes (`/api/v1/*`) are never path-rewritten.

---

## 5. Server-Side vs Client-Side Internationalization

### 5.1 Server-Side Rendering (Server Components & Route Handlers)
```typescript
import { getServerLocale, getServerTranslations, formatServerMessage } from '@/i18n/server';

// In a Server Component:
export default async function ProductPage() {
  const locale = getServerLocale(); // 'bn-BD'
  const t = createTranslator(locale);
  return <h1>{t('store.hero.title')}</h1>;
}
```

### 5.2 Client-Side Rendering (Interactive Components)
```typescript
'use client';
import { useI18n } from '@/i18n/context';

export function CartSummary() {
  const { t, locale, setLocale } = useI18n();
  return <button onClick={() => setLocale('en-BD')}>{t('common.save')}</button>;
}
```

---

## 6. Formatting Primitives & Invariants

1. **Currency (BDT / Poisha)**:
   - Minor integer poisha units strictly preserved ($1\text{ BDT} = 100\text{ poisha}$).
   - `formatLocalizedCurrency(250000n, 'bn-BD')` -> `৳২,৫০০.০০`.
   - `formatLocalizedCurrency(250000n, 'en-BD')` -> `BDT 2,500.00`.
2. **Numerals**:
   - `toBengaliNumerals(12345)` -> `১২৩৪৫`.
   - `parseBengaliNumerals('১২৩৪৫')` -> `12345`.
3. **Timezone**:
   - All business period boundaries, timestamps, and order histories are evaluated in `Asia/Dhaka` (UTC+6).
   - `formatLocalizedDateTime(date, 'bn-BD')` renders date and time with localized Bengali month names.
