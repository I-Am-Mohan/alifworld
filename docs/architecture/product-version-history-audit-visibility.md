# Product Version History and Audit Visibility

Milestone 089 adds immutable, redaction-safe catalog snapshots for every product version.

## Persistence

`ProductVersionHistory` stores one append-only snapshot per `(productId, version)`. It records the product action, actor, actor role, request ID, IP address, user agent, and creation time. A composite uniqueness constraint makes retries idempotent.

Snapshots include catalog fields, BDT poisha price values as strings, Product Point, shipping attributes, active variant summaries, media metadata, and option-set summaries. Private storage keys and signed URLs are intentionally excluded. Snapshots are passed through the shared audit redactor before persistence.

## Recording rules

- Product creation records `PRODUCT_CREATED` at version 1.
- Product edits record `PRODUCT_UPDATED` after optimistic-concurrency success.
- Approval workflow transitions record a snapshot in the same Prisma transaction as the status/version change.
- Existing `ProductStatusHistory` remains the lifecycle transition history; version history is the complete product-state history.

## API

Authenticated seller owners/staff can read history only for products in their seller tenant:

- `GET /api/v1/seller/catalog/products/{id}/versions`
- `GET /api/v1/seller/catalog/products/{id}/versions/{version}`

Admin and Super Admin operators can read any product history:

- `GET /api/v1/admin/catalog/products/{id}/versions`
- `GET /api/v1/admin/catalog/products/{id}/versions/{version}`

Responses use the standard `{ success, data }` envelope. Invalid versions return validation errors; missing snapshots return not-found errors.

## Admin UI

The Admin Products table exposes a History link to `/admin/products/{id}/versions`. The page includes loading, empty, error/retry, actor, action, timestamp, request ID, and formatted redacted snapshot states.

## Migration and operations

Apply `prisma/migrations/20260923120000_product_version_history/migration.sql` through the normal Prisma deployment process. No new credentials or external providers are required.
