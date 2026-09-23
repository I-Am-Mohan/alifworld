# Catalog API, Admin UI, Seller UI, and Test Completion

Milestone 080 consolidates the catalog foundations into reachable API and UI surfaces.

## API completion

- Seller-scoped product listing and draft creation are available at `/api/v1/seller/catalog/products`.
- Admin product listing with status, taxonomy, search, pagination, and limit controls is available at `/api/v1/admin/catalog/products`.
- Existing attribute, option-set, translation, SEO, approval, onboarding, import/export, and moderation routes are documented in generated OpenAPI.
- Seller APIs derive seller scope from the authenticated actor; clients cannot select an arbitrary seller tenant.

## UI completion

- Admin Products is a real API-backed catalog table with search, status filters, price, Product Points, taxonomy, and moderation links.
- Seller Products renders the API-backed catalog client with status/search filters and links to draft creation, onboarding guidance, and bulk operations.
- Admin moderation, Seller onboarding, and Seller bulk operation pages provide loading, empty, error, retry, and action states.

## Test and security contract

The catalog test matrix covers product validation, tenant isolation, seller publication denial, approval transitions, attribute contracts, onboarding progress, bulk validation, duplicate detection, localization, SEO, and tax behavior. Financial values remain BDT integer poisha and Product Points remain independent.
