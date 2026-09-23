# Taxonomy Translation, SEO, and Effective-Date Tax Rules

Milestone 075 extends the existing localized catalog foundation with governed SEO metadata and persisted tax-rule configuration.

## Contract

- Category and brand canonical slugs remain stable; localized metadata is stored by locale.
- Translation lookup prefers the requested full locale, requested language, and the same-language Bangladesh fallback. English does not silently fall back to Bengali.
- Administrators manage category/brand translation SEO fields and effective-date tax rules.
- Tax rules are scoped to Bangladesh, may be category-specific or global, and become eligible only when `status=ACTIVE` and the requested date falls within the effective range.
- Existing product/category tax overrides remain compatible until later approval and transaction snapshot workflows migrate authoritative tax selection.
- Private Admin, Seller, account, checkout, order, wallet, and API paths remain no-index/no-follow.

## Persistence

Migration `20260923140000_taxonomy_seo_and_tax_rules` adds SEO fields to category and brand translations and adds the versioned `tax_rules` table. Tax rules retain effective dates, jurisdiction, category scope, rate, inclusive/exclusive indicator, lifecycle status, and optimistic version fields.

## API

Admin taxonomy translation routes support category and brand translation/SEO reads and upserts. Admin tax-rule routes support list/create/update. All mutations authenticate, validate with Zod, apply Admin authorization through the service layer, and create audit records.

## SEO

Existing shared SEO utilities are reused for canonical locale URLs, alternate languages, OpenGraph, Twitter cards, and BreadcrumbList JSON-LD. A taxonomy metadata helper is available for future server-rendered category and brand pages.

## Deferred work

Direct data-backed category and brand page metadata wiring and immutable order/invoice tax snapshot storage remain future workflow concerns. No financial calculation behavior or reward behavior is introduced beyond persisted effective-date tax-rule resolution.
