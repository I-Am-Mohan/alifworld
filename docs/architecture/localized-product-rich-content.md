# Localized Descriptions, Specifications, and Rich Content

Milestone 086 adds structured localized product content without introducing unsafe HTML rendering.

## Contract

- Product translations support `bn-BD` and `en-BD` with language-aware fallback.
- Each translation stores title, long description, warranty, a string specification map, and a bounded rich-content block list.
- Rich blocks are allowlisted: paragraphs, headings, lists, quotes, images, videos, and specification tables.
- Content is validated with Zod before persistence; arbitrary HTML/script blocks are not accepted.
- Seller owners/staff may update translations only for products in their seller tenant. Public reads use the existing locale fallback repository.

## Persistence and API

Migration `20260923190000_localized_product_rich_content` adds `specifications` and `rich_content` JSON fields to `ProductTranslation`.

- `GET /api/v1/catalog/products/{id}/translations`
- `PUT /api/v1/seller/catalog/products/{id}/translations`

All mutation responses use the standard envelope and audit the seller content update.

## Deferred work

Rich content rendering sanitization and server-rendered product page integration remain subsequent storefront/content work. The persisted contract deliberately stores structured blocks rather than executable HTML.
