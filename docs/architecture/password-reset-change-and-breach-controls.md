# Password Reset, Change, and Breach-Safe Controls

**Milestone:** 037
**Status:** Implemented
**Applies to:** browser storefront and versioned REST clients

## Contract

The password domain supports three operations:

| Actor | Operation | Authorization | Success result |
|---|---|---|---|
| Anonymous account owner | Request reset | Valid email-shaped input; account existence is never disclosed | A neutral acknowledgement and an asynchronous notification outbox record when the account is eligible |
| Reset-token holder | Complete reset | Matching, unused, unexpired one-time token | Password updated, token consumed, `tokenVersion` incremented, all sessions revoked |
| Authenticated account owner | Change password | Active session plus correct current password | Password updated, `tokenVersion` incremented, all sessions revoked |

No Admin, seller, support, or cross-tenant operation is introduced. A user can mutate only the credential resolved from their authenticated user ID or one-time token. Deleted accounts and passwordless accounts receive the same public reset-request response as unknown accounts.

## States and invariants

Password reset uses the existing `OtpToken` model with purpose `PASSWORD_RESET`: `issued -> consumed` or `issued -> expired`.

- The raw token contains 256 bits from `crypto.randomBytes` and is never persisted in the token table, audit metadata, logs, or API documentation examples. Its SHA-256 digest is persisted.
- A token expires after 15 minutes, permits at most five failed comparisons, and is single-use.
- Issuing a new reset token invalidates earlier active reset tokens for the same account.
- Requests are limited to one per 60 seconds and three per hour per account. Throttled, unknown, deleted, and passwordless accounts return the same HTTP 200 neutral acknowledgement.
- Token consumption is guarded by a conditional database update inside the password transaction. Concurrent reuse cannot update the password twice.
- Password change uses the stored password hash as an optimistic compare condition. Concurrent changes allow one winner.
- Successful reset or change increments `User.tokenVersion`, revokes every `UserSession`, clears browser cookies, invalidates outstanding reset tokens, appends an audit event, and writes a notification event to the transactional outbox.

## Password safety

The existing PBKDF2-HMAC-SHA512 password storage format remains compatible. New passwords must contain 8–128 characters, uppercase and lowercase English letters, a digit, and a symbol. The server additionally rejects a bundled denylist of commonly breached, composition-compliant passwords and rejects the current password as the replacement.

The denylist is local so passwords are never sent to a third party during a customer request. Operations should update it through reviewed releases as threat intelligence changes. A future offline breached-password corpus can implement the same server-side boundary without changing the API.

## API and failure behavior

- `POST /api/v1/auth/password/request-reset`
- `POST /api/v1/auth/password/reset`
- `POST /api/v1/auth/password/change`

All routes use the common success/error envelope and implementation-owned Zod schemas. Validation and invalid reset tokens return 422, authentication failures return 401, a concurrent one-time-token race returns 409, and failure to queue reset delivery returns 503. Password and token values are never returned in production. Development mode may return `devResetToken`, matching the existing local OTP convention, so the complete journey can be tested without a configured mail provider.

## Notification and operations

`auth.password_reset_requested`, `auth.password_reset_completed`, and `auth.password_changed` outbox events are transactionally persisted. The notification worker must build the reset URL with the token in the URL fragment (`/reset-password?email=...#token=...`) so the secret does not reach HTTP access logs, deliver it through the configured email provider, and treat the event ID as the idempotent job ID. Until that consumer and provider are configured, requests are accurately reported as queued rather than delivered; local development exposes a direct reset link.

No schema migration is required because `User`, `UserSession`, `OtpToken`, `AuditLog`, and `OutboxEvent` already represent the contract. Rollback consists of reverting the routes, service, UI, OpenAPI entries, and documentation. Existing password hashes, tokens, and sessions remain compatible.

## User interface

The storefront sign-in modal exposes the reset-request flow, `/reset-password` completes the one-time-token flow, and Account & Security exposes authenticated password change. The screens use the authoritative cream canvas, amber/orange actions, white surfaces, charcoal text, focus rings, English/Bangla translations, and a bottom-sheet-friendly mobile layout from the existing storefront design system.

## Observability and redaction

Audit actions are `PASSWORD_RESET_REQUESTED`, `PASSWORD_RESET_COMPLETED`, and `PASSWORD_CHANGED`. They contain actor/resource IDs, request IP/user agent, expiry or session-revocation state, and no password or reset token. The outbox is the only durable record that temporarily contains the raw reset token needed by the delivery consumer; notification tooling must redact its payload from logs and operational error messages.
