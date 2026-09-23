# Seller storefront branding, policies, and contact controls

## Contract

Seller settings now include bounded plain-text store description and policies, server-owned public branding object keys, and opt-in visibility controls for support email, support phone, and pickup address. Public seller projections expose policy text and branding only for verified, non-deleted sellers.

Branding uploads accept JPEG, PNG, and WebP files. Logos are limited to 2 MB and banners to 5 MB. The server validates magic bytes, generates the object key under `public/store-branding/{sellerId}/`, writes the object through the S3-compatible adapter, updates settings with optimistic concurrency, audits the change, and removes the replaced object after the database update succeeds. Client-supplied object keys and arbitrary public URLs are not accepted by the branding endpoint.

## Public controls

Public email, phone, and pickup address visibility default to disabled. Pickup address is returned only when explicitly enabled. Public policy text is rendered as escaped text and is never interpreted as HTML. Vacation mode and message remain visible when enabled, but checkout enforcement is outside this milestone.

## APIs and UI

- `PUT /api/v1/seller/settings` updates policies, vacation messaging, contact visibility, and logistics settings.
- `POST /api/v1/seller/settings/branding` uploads a logo or banner for the authenticated seller tenant.
- `/seller/settings` provides persisted settings, policy editing, branding upload, and visibility controls.
- `/stores/{slug}` renders verified seller branding, policies, vacation state, and enabled contact methods.
