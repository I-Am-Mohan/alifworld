# Seller suspension, restriction, and reactivation

## State contract

The lifecycle states are `VERIFIED`, `RESTRICTED`, and `SUSPENDED` for operational enforcement. Valid transitions are:

- `VERIFIED → RESTRICTED`
- `VERIFIED → SUSPENDED`
- `RESTRICTED → SUSPENDED`
- `RESTRICTED → VERIFIED`
- `SUSPENDED → RESTRICTED`
- `SUSPENDED → VERIFIED`

Every administrative transition requires a reason of at least five characters and the seller's current optimistic version. Invalid states and stale versions return a conflict. Each transition creates an append-only `SellerLifecycleEvent`, canonical audit record, and outbox event.

`RESTRICTED` and `SUSPENDED` sellers are not publicly resolvable because public storefront lookup requires `VERIFIED`. Existing product/order paths remain unchanged in this milestone; later enforcement work should use the lifecycle status before accepting seller operations. No financial, payout, commission, reward, or inventory calculation is modified.

## API

`POST /api/v1/admin/sellers/{id}/lifecycle` accepts `{ action, version, reason }`, where action is `RESTRICT`, `SUSPEND`, or `REACTIVATE`. The route requires the existing seller administration permissions and never accepts seller-side lifecycle mutations.
