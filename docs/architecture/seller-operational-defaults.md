# Seller tax, shipping, order, and notification defaults

## Scope

This milestone adds seller-scoped configuration only. It does not alter checkout totals, commission formulas, order state transitions, payout execution, or reward behavior. Operational defaults are persisted with optimistic versions and audited.

## Defaults contract

`SellerOperationalDefaults` stores:

- Tax jurisdiction and optional approved tax rule version/effective date.
- Shipping mode selection without inventing shipping rates.
- Default handling days and local cutoff time.
- Auto-accept preference, with default order status locked to `PENDING`.

Tax resolution now respects the effective date of the existing jurisdiction rule set, but no new rate is activated by this milestone. Existing product/category tax behavior remains the authoritative calculation path until a later approved tax-rule integration.

`SellerNotificationDefault` stores seller-level channel/event preferences for `EMAIL`, `SMS`, `PUSH`, and `IN_APP` across `SECURITY`, `TRANSACTIONAL`, and `MARKETING`. Mandatory security and transactional delivery rules remain enforced by the notification contract; seller defaults do not disable them.

## APIs

- `GET/PUT /api/v1/seller/operational-defaults`
- `GET/PUT /api/v1/seller/notification-defaults`

All routes require authentication and active seller tenant matching. Seller staff cannot mutate these defaults by default; seller owners and authorized platform bypass actors may do so.
