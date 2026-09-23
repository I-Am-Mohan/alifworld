# Safe Bulk Catalog Import and Export

Milestone 078 adds seller-scoped durable catalog bulk operations without writing files to the application filesystem.

## Import contract

- Supported formats are CSV and JSON.
- Payloads are limited to 5 MB and 5,000 rows.
- Imports are staged in private S3-compatible object storage and persisted as `CatalogImportJob` records.
- Validation checks required fields, active categories, approved brands, positive integer poisha prices, non-negative Product Points, duplicate slugs, and seller scope.
- Dry-run validation never creates products. Commit creates seller-owned `DRAFT` products transactionally, then records audit and outbox events.
- Optional idempotency keys return the existing import job for repeated requests.
- Row-level errors are persisted in `CatalogImportRowError`.

## Export contract

- Seller exports are generated as CSV from seller-scoped products only.
- Export files are written to private object storage and returned through short-lived signed URLs.
- Export jobs persist status, row count, object key, and expiration metadata.
- Download access checks seller ownership/staff scope and rejects expired jobs.

## Security and operations

Seller IDs are resolved from the authenticated actor scope by the API. Services repeat ownership/staff checks and query products with `sellerId` directly. No private object key is returned to clients. The worker registry includes a catalog import/export queue for later asynchronous processing; current bounded CSV/JSON operations are safe to run synchronously for the configured limits.
