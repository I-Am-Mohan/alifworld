# Catalog Moderation and Duplicate Detection

Milestone 079 adds deterministic, advisory catalog moderation for duplicate candidates.

## Detection contract

- Product titles are normalized with Unicode normalization, locale-aware lowercasing, punctuation removal, and whitespace folding.
- Fingerprints include normalized title hash, brand/category key, optional SKU and barcode fingerprints, and a sorted variant option signature.
- Matching is deterministic and versioned as algorithm `v1`.
- Exact SKU/barcode matches are high severity; title/brand/category matches are medium severity; no match is clear.
- Automated matches are advisory. They do not silently block publication or delete products.

## Persistence and workflow

`CatalogModerationReview` stores moderation status, duplicate status, severity, explanation, matched product IDs, source, reviewer, and resolution time. `ProductDuplicateFingerprint` stores the reproducible fingerprint for rechecks.

Administrators can list the queue, inspect a review, resolve it as approved/rejected/request-changes/dismissed, and recheck a product. Every manual resolution is audited. Sellers cannot access moderation administration or resolve reviews.

## API and UI

Admin moderation routes expose queue, detail, resolution, and duplicate recheck operations. The `/admin/moderation` page provides loading, empty, error, retry, candidate explanation, and resolution actions.

## Deferred work

No automated merge or destructive duplicate deletion is performed. External ML/search integration and asynchronous reanalysis jobs remain future enhancements; correctness does not depend on Meilisearch availability.
