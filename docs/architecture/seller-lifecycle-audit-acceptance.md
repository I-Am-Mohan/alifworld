# Seller lifecycle audit and acceptance coverage

## Audit contract

Seller lifecycle operations use append-only `AuditLog` records and outbox events. Audit metadata is passed through the centralized redactor before persistence. The redaction contract now covers passwords, tokens, authorization material, payout account/routing/title values, encrypted references, private object keys, and KYC file URLs. Before/after diffs are redaction-safe.

Lifecycle audit records should contain actor, action, resource, resource ID, reason/status metadata, and request telemetry when a route-level audit helper is used. Seller staff activity is filtered by `resource = SellerStaff` and seller ID in the JSON metadata predicate. Unrelated audit records are not exposed to sellers.

## Acceptance matrix

- Verified sellers can be restricted or suspended.
- Restricted and suspended sellers can be reactivated through the Admin lifecycle route.
- Invalid transitions and stale versions fail with conflicts.
- Seller owners may administer staff within their tenant.
- Seller staff cannot administer staff by default.
- Cross-tenant seller operations fail closed.
- Payout/KYC credentials and private object keys never appear in audit diffs or seller activity responses.
- Security and transactional notification behavior remains mandatory.
- Financial, payout, commission, reward, and order calculations remain unchanged.

## Deferred validation

Full database-backed lifecycle replay, multi-request concurrency testing, and end-to-end Admin journeys require the isolated integration database and are covered by the repository acceptance pipeline. This milestone adds deterministic unit and policy-negative coverage without inventing external provider behavior.
