# Milestone 053 — Localizable Catalog and CMS Content

## Delivered

- Added normalized locale-keyed translations for products, categories, and brands.
- Preserved existing `nameBn`, `titleBn`, `descriptionBn`, and `altTextBn` fields for compatibility; new code can adopt normalized translations incrementally.
- Added locale normalization and fallback order: exact locale, language-only locale, `bn-BD`, then `bn`.
- Added versioned CMS content records with draft/review/published/archived lifecycle, soft deletion fields, administrator ownership, and locale-specific JSON content bodies.
- Added protected administrator CMS create/update endpoints and a public published-content read endpoint.
- Added optimistic concurrency validation for CMS updates, audit logging, and unique slug/locale constraints.
- Added unit coverage for locale fallback and CMS payload validation.
- Updated the generated OpenAPI contract for the CMS endpoints.

## Compatibility and boundaries

- Existing catalog services remain unchanged and continue to use the paired Bangla columns.
- CMS mutation endpoints require a valid authenticated `ADMIN` or `SUPER_ADMIN` role.
- Public CMS reads expose only published, non-deleted content.
- Financial values and product publication rules were not changed.

## Migration

Migration: `20260922010000_model_localized_catalog_and_cms_content`.

The configured remote development database rejected non-interactive `prisma migrate dev`; the migration SQL was generated as a checked-in migration artifact and should be applied with the normal deployment migration workflow.
