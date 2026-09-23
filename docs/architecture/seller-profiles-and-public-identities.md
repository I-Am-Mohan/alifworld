# Seller profiles and public store identities

## Identity contract

A seller's public identity is the verified `Seller` record plus an allowlisted subset of `SellerStoreSettings`. Seller slugs are lowercase, globally unique, and immutable in this milestone. Public lookup uses `findVerifiedPublicBySlug()` and only returns sellers with `status = VERIFIED`; suspended, rejected, pending, draft, deleted, and unknown slugs are not public.

The public projection includes business name, slug, verification timestamp, logo/banner URLs, support contact fields, pickup address, and vacation status/message. It never includes owner IDs, tax credentials, KYC documents, staff, financial data, internal versions, or private object keys.

## Seller administration

Authenticated seller profile reads use the active `actor.sellerId`; an optional `sellerId` query must match it for seller users. Super Admin may select another seller. Store settings continue to use optimistic concurrency through `version` and database-level seller scoping. The seller settings page now loads persisted values and sends updates to the protected API instead of displaying a fake local success state.

## Public routes

- `GET /api/v1/seller/profile`
- `GET /api/v1/seller/settings`
- `PUT /api/v1/seller/settings`
- `GET /api/v1/stores/{slug}`
- `/stores/{slug}` public verified seller storefront with localized SEO metadata and breadcrumb JSON-LD.

Public storefront identity is intentionally separate from future product catalog, branding/policy, and seller public content milestones. No financial or commission behavior is introduced.
