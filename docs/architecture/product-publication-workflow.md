# Product Submission, Approval, Publication, and Archival

Milestone 088 completes the governed product lifecycle built in milestone 076.

## Lifecycle

`DRAFT → PENDING_APPROVAL → APPROVED → PUBLISHED → ARCHIVED`

Rejected products may return to `DRAFT` through seller editing and resubmission. Sellers can submit owned drafts but cannot approve, publish, or archive. Administrators with the appropriate catalog permissions perform review transitions.

## Publication readiness

The approval service validates title, canonical slug, description, active category, approved brand, verified operational seller, BDT currency, positive integer poisha price, non-negative Product Point, image media, required category attributes, and required variant options. Stock policy remains delegated to the inventory foundation; no artificial stock quantity is invented.

## API and auditability

Existing seller submission, readiness, and Admin approve/reject/publish/archive routes are the canonical API. Transitions use optimistic versions, immutable status history, transactional audit records, outbox events, and idempotency for seller submission.

SEO slug history is preserved by the ProductService whenever a draft slug changes.
