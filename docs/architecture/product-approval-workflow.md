# Catalog Permissions and Product Approval Workflow

Milestone 076 introduces a governed product lifecycle:

`DRAFT → PENDING_APPROVAL → APPROVED → PUBLISHED`

Rejected submissions return to `REJECTED` and may be revised and resubmitted. Approved or published products may be archived by authorized catalog administrators.

## Roles

- Seller owners and seller staff may manage products within their seller tenant and submit drafts for review.
- Sellers cannot approve, publish, or archive products through the approval workflow.
- Administrators with catalog approval/publication permissions review, approve, reject, publish, and archive products.

## Readiness checks

Approval readiness validates the active category, approved brand when present, verified operational seller, BDT currency, positive integer poisha price, non-negative Product Points, image media, required category attributes, and required variant-defining options.

## Persistence

Migration `20260923150000_product_approval_workflow` adds `ProductApprovalRequest` and immutable `ProductStatusHistory` records. Each transition updates the product version, records audit and outbox events transactionally, and supports idempotent seller submission through an optional idempotency key.

## API

Seller routes support readiness validation and submission. Admin routes support the pending queue, approve/reject/publish/archive actions, and review history. All mutations use server-side authentication, catalog policy checks, validation, and optimistic versions.

## Compatibility

Existing flattened variant option fields and legacy `ProductService.publishProduct()` remain available for compatibility with earlier tests and callers. New workflow routes use `ProductApprovalService` and prohibit seller publication through `CatalogPolicy`.
