# Seller application workflow

## State contract

Seller applications use the following states:

- `DRAFT`: owned by the applicant and editable.
- `SUBMITTED`: submitted by the applicant and awaiting platform review.
- `UNDER_REVIEW`: reserved by a platform reviewer for active review.
- `CHANGES_REQUESTED`: returned to the applicant with a required reason; the applicant may edit and resubmit.
- `APPROVED`: approved by a platform reviewer; the transaction creates the seller tenant, default settings, owner staff membership, scoped role assignment, audit record, and outbox event.
- `REJECTED`: permanently rejected for this application revision with a required reason.
- `WITHDRAWN`: reserved for a future explicit applicant withdrawal flow.

## Authorization and tenancy

Applicant reads and mutations are authorized against the authenticated user ID. Seller tenant reads use a seller ID inside the repository query. Platform review requires `sellers:verify`; seller owners, seller staff, and customers cannot approve, reject, or request changes.

## Concurrency and auditability

Draft updates, submission, and review use the application `version` as an optimistic concurrency token. Submission and review decisions execute in a Prisma transaction with the application update, immutable review history, audit row, and outbox event. Approval also creates the seller operational records in that same transaction.

## KYC boundary

Milestone 061 captures and validates business identity fields but does not accept private document uploads or invent a KYC approval gate. Secure KYC storage, document review, and application-to-KYC integration are delivered by Milestone 062.

## API surface

- `GET/POST /api/v1/seller/application`
- `GET/PATCH /api/v1/seller/application/{id}`
- `POST /api/v1/seller/application/{id}/submit`
- `GET /api/v1/admin/seller-applications`
- `POST /api/v1/admin/seller-applications/{id}/review`
