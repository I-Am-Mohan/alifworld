# Translation Catalog Contract

**Phase:** 06 — Bangladesh Localization  
**Milestone:** 052 — Create English and Bangla translation catalogs  
**Canonical launch locales:** `en-BD`, `bn-BD`  
**Default locale:** `bn-BD`

## Catalog ownership

- English source catalog: `src/i18n/translations/en.ts`
- Bangla catalog: `src/i18n/translations/bn.ts`
- Registry and locale aliases: `src/i18n/translations/index.ts`
- Contract validation: `src/i18n/translations/catalog-validation.ts`
- Catalog tests: `tests/unit/translation-catalogs.test.ts`

The catalogs use the same nested key structure. English is the reference contract; Bangla must provide the same leaf keys and interpolation variables. Catalog values are user-facing messages only—currency, dates, and Bengali numeral formatting remain in the localization formatting primitives from milestone 051.

## Lookup and fallback

`getDictionary()` supports canonical regional tags and short aliases:

- `en-BD` and `en` resolve to the English catalog.
- `bn-BD` and `bn` resolve to the Bangla catalog.
- Unknown regional variants first try their short language code, then fall back to the default Bangla catalog.

Missing individual messages are handled by the caller’s default-locale and English fallback behavior. A missing key must not produce a fake success message; unresolved keys remain visible as their key path for diagnosis.

## Interpolation contract

Placeholders use named braces such as `{name}`, `{count}`, and `{percent}`. Every placeholder present in the English reference value must appear exactly once with the same name in the Bangla value. Values are escaped through the existing interpolation helper and are not treated as executable markup.

## Verification

`validateLaunchCatalogs()` reports missing keys, unexpected keys, empty values, and placeholder mismatches. The catalog test suite also verifies canonical registry aliases and intentionally exercises each validation failure class.

When adding a message:

1. Add the same leaf key to `en.ts` and `bn.ts`.
2. Preserve placeholder names and count.
3. Use the catalog through `useI18n()`, `useTranslation()`, `createTranslator()`, or `formatServerMessage()` rather than hardcoding the user-facing string.
4. Add or update a focused test when the message has formatting or fallback behavior.
