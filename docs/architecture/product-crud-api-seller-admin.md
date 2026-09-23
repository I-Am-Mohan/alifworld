# Product CRUD contract (Milestone 090)

Milestone 090 completes product and variant CRUD around the existing catalog workflow.

## Product ownership and lifecycle

Seller collection and item queries derive the seller tenant from the authenticated actor and pass `sellerId` into repository queries. Cross-tenant item access returns a not-found response. Seller mutation access still verifies seller ownership/staff assignment server-side.

Product deletion is a soft delete protected by optimistic version checks. Draft, rejected, and archived products may be deleted; approved, pending-approval, and published products must use the existing lifecycle workflow instead. Deletion emits an audit record and outbox event.

Admin users with catalog read/write authorization can inspect, update, and soft-delete product metadata through the Admin item API and edit page. Approval and publication remain separate lifecycle operations.

## Variant CRUD

Seller product variant endpoints provide list, create, read, update, and soft-delete operations:

- `GET/POST /api/v1/seller/catalog/products/{id}/variants`
- `GET/PATCH/DELETE /api/v1/seller/catalog/products/{id}/variants/{variantId}`

Variant identifiers are checked against the global product/variant SKU and barcode policy. Updates and deletes require the current variant version. Repository reads and mutation preconditions include product and seller scope.

## Validation and compatibility

Product list queries validate lifecycle status, pagination bounds, and search length at the route boundary. Product input validates safe integer BDT poisha values, canonical SKU/barcode formats, and compare-at price ordering. Existing media, option-set, translation, approval, and version-history APIs remain the owners of those subresources; product PATCH rejects nested variant/media data rather than silently ignoring it.

## UI

Seller catalog rows now expose API-backed edit and eligible delete actions. Admin products expose an edit page and version-history link. Both retain explicit loading/error/retry behavior from the existing API-backed pages.

## Migration and configuration

No schema migration or new credentials are required. Apply the existing product/version-history migrations through the normal Prisma deployment process.
