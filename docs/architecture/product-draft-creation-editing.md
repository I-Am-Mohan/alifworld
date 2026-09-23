# Product Draft Creation and Editing

Milestone 081 provides a real seller-scoped product draft editor on top of the existing ProductService and catalog foundations.

## Contract

- Seller owners and staff may create, read, and update products only within their seller tenant.
- New products are always created as `DRAFT` records.
- Sellers may edit only `DRAFT` and `REJECTED` products through the draft route.
- Sellers cannot change approval status, publish, approve, or archive through the draft editor.
- Prices are integer BDT poisha and Product Points are validated independently.
- Product slug changes create `ProductSlugHistory` records for public redirects.
- Updates require the current optimistic `version`.

## API and UI

- `POST /api/v1/seller/catalog/products` creates a draft using the authenticated seller scope.
- `GET/PATCH /api/v1/seller/catalog/products/{id}` reads and updates an owned draft.
- `/seller/products/new` now renders an API-backed editor that supports both create and edit flows using the optional `?id=` query parameter.
- The editor covers category/brand IDs, localized titles, slug, descriptions, BDT poisha pricing, Product Points, SKU, barcode, warranty, and tags.

Variant matrix authoring, media upload orchestration, and publication readiness remain governed by the existing option, media, onboarding, and approval workflows and continue in subsequent milestones.
