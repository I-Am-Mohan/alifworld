# Seller Admin review workflow

## State contract

Seller applications use an explicit transition matrix:

- `SUBMITTED` → `UNDER_REVIEW`
- `UNDER_REVIEW` → `CHANGES_REQUESTED`, `APPROVED`, or `REJECTED`
- `CHANGES_REQUESTED` → `SUBMITTED` through applicant resubmission
- `DRAFT` → `SUBMITTED` through applicant submission
- `APPROVED`, `REJECTED`, and `WITHDRAWN` are terminal in this milestone.

Admin approval, rejection, and change requests require a reviewer reason of at least five characters. `UNDER_REVIEW` is the reservation/inspection transition and does not require a decision reason.

## Authorization and idempotency

Only platform reviewers with `sellers:verify` may review. Seller owners, seller staff, and customers are explicitly denied. Review mutations accept an optional `Idempotency-Key`, persist it with the immutable review record, and return the already-applied application for a matching reviewer/application retry. Optimistic application versions remain mandatory.

KYC review uses the same platform reviewer permission, rejects stale or already-reviewed documents atomically, clears verification metadata on rejection, and emits standardized audit and outbox events.

## Admin workspace

`/admin/sellers` now exposes both application and pending-KYC review surfaces. Application reviewers must move a submitted application to `UNDER_REVIEW` before a decision. Decision buttons are disabled for invalid states, and rejection/change requests require visible reason input. KYC reviewers can open a short-lived signed view URL, verify, or reject a pending document.

## APIs

- `GET /api/v1/admin/seller-applications`
- `GET /api/v1/admin/seller-applications/{id}`
- `POST /api/v1/admin/seller-applications/{id}/review`
- `GET /api/v1/admin/seller/kyc`
- `POST /api/v1/admin/seller/kyc/{documentId}/review`

All mutations authenticate, authorize, validate state/version, write audit data, and emit outbox events. No financial, commission, payout, reward, or Product Point behavior is introduced.
