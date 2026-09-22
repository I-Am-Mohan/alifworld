# ADR-0037: Password Reset, Change, and Breach-Safe Controls

**Status:** Accepted
**Date:** 2026-09-22
**Milestone:** 037

## Context

AlifWorld needs one password lifecycle for storefront browsers and Flutter-compatible REST clients. The design must prevent account enumeration, token replay, weak or commonly breached replacement passwords, and continued access through sessions created before a password mutation. The repository already provides PBKDF2 password hashing, `OtpToken`, token-version revocation, session persistence, audit logs, and the transactional outbox.

## Decision

Reuse `OtpToken` with purpose `PASSWORD_RESET`; do not add a parallel reset-token table. Store only a SHA-256 digest of a cryptographically random 256-bit token, expire it after 15 minutes, limit failed attempts, and conditionally consume it inside the password-update transaction.

Reset-request responses remain neutral for unknown, deleted, passwordless, throttled, and eligible accounts. Eligible requests write the token, audit record, and delivery event through the existing database/outbox boundary. Password reset and authenticated password change both increment `tokenVersion` and revoke all sessions. This requires fresh sign-in everywhere after a credential mutation.

Keep breach screening local and deterministic. The server enforces the existing composition policy, rejects a reviewed local denylist of common breached passwords, and rejects reuse of the current password. Passwords are never sent to a remote breach-checking service.

Expose the flows through three `/api/v1/auth/password/*` routes and the existing storefront account surfaces. Use the brand token system and bundled `en-BD`/`bn-BD` localization.

## Consequences

- Existing schema and password hashes remain compatible; no migration is required.
- Reset completion and password change are concurrency-safe and fully audited.
- Every credential mutation terminates the current browser session as well as other devices.
- The asynchronous notification consumer and provider configuration remain operational dependencies. Production responses do not expose reset tokens; local development can expose the token for end-to-end testing, consistent with existing OTP flows.
- The bundled breach list requires reviewed maintenance. A future offline corpus can replace it behind the same service contract.

## Sources

- Milestone 037 execution and acceptance requirements.
- ADR-0031 authentication architecture and token policy.
- ADR-0033 email verification and resend controls.
- `docs/architecture/design-system-and-brand-tokens.md` and `docs/product/brand-identity-and-design-tokens.md`.
