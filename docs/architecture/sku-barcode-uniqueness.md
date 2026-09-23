# SKU, Barcode, and Uniqueness Policies

Milestone 083 adds shared identifier normalization and collision checks for products and variants.

## Contract

- SKUs are normalized to uppercase and may contain only letters, numbers, dashes, and underscores.
- Barcodes are normalized by removing whitespace and must contain 8–14 digits.
- EAN-13 values can be checksum validated with the shared helper.
- Product and variant identifiers share one collision domain: a SKU or barcode cannot be reused by another product or variant.
- Existing records can be excluded from checks during edits.
- Conflicts return machine-readable conflict details through `ConflictError`.

## API

`GET /api/v1/seller/catalog/identifiers/check` validates and checks SKU/barcode availability for seller draft forms. Product creation and updates enforce the same policy server-side, so the check endpoint is advisory only.

## Compatibility

The existing database unique constraints remain authoritative for product and variant SKUs. The service-level policy adds cross-entity checks and normalized input handling before writes. Barcode uniqueness is enforced at the service policy layer pending a future database migration that introduces cross-table identifier constraints.
