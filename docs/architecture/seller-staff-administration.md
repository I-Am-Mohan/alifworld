# Seller staff administration and activity visibility

## Scope and authorization

Seller staff is always queried with `sellerId` in the database predicate. Seller owners may invite, assign store-level roles, and remove staff within their own tenant. Seller staff cannot manage staff, approve sellers, modify payout profiles, or update protected operational defaults unless a later approved permission explicitly grants that capability. Platform Super Admin retains the existing bypass.

Staff roles remain store-scoped (`SELLER_STAFF`, `SELLER_MANAGER`, `STORE_MANAGER`). The owner cannot be re-added or removed as subordinate staff. Cross-tenant reads and mutations fail closed.

## Activity visibility

Staff administration actions write audit records with the seller ID in redacted metadata. `GET /api/v1/seller/staff/activity` returns only staff-resource audit entries for the active seller tenant, with bounded pagination and safe fields: action, actor ID, resource ID, metadata, and timestamp. Sensitive credentials and unrelated platform audit records are not returned.

## APIs

- `GET/POST/DELETE /api/v1/seller/staff`
- `POST /api/v1/seller/staff/invite`
- `GET /api/v1/seller/staff/activity`

The seller staff UI loads persisted members and activity, sends invitations to the real API, and displays loading/error/empty states. No fake local invitation success or fabricated staff records remain.
