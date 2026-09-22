# ADR-0032: Implement Customer Email and Password Registration

**Status**: Accepted  
**Date**: 2026-09-22  
**Deciders**: Security Architecture, Identity Engineering, Storefront UX, Core Platform Team  
**Milestone Reference**: [Milestone 032](../../AlifWorld-300-Milestones/032-implement-customer-email-and-password-registration.md)  
**Phase**: Phase 04: Identity and Authentication  
**Supporting Specification**: [Customer Email and Password Registration Architecture](../architecture/customer-email-and-password-registration.md)  

---

## Context and Problem Statement

A secure, intuitive customer onboarding flow is foundational to AlifWorld's marketplace ecosystem in Bangladesh. The registration process must satisfy several critical functional and non-functional requirements:
1. **Self-Service Integrity**: Secure self-service account registration via email and password, with optional Bangladesh mobile phone number.
2. **Immediate Multi-Account Wallet Provisioning**: Every new customer requires segregated wallets (`MAIN`, `SHOPPING`, `GOOD_LUCK`, `CHARITY`) and a decoupled loyalty `PointAccount` to prevent concurrency races during checkout, deposits, and reward allocations.
3. **Password Security**: Enforce strong password complexity rules and store passwords using salted PBKDF2-HMAC-SHA512 key derivation.
4. **Verification Handshake**: Issue a 15-minute 6-digit numeric verification code stored securely in `otp_tokens` and dispatch an asynchronous notification event via `outbox_events`.
5. **Bilingual Experience**: Provide responsive, mobile-first registration UI supporting both Bengali (`bn-BD`) and English (`en-BD`) with real-time password strength guidance.

---

## Decision Drivers

- **Zero Race Conditions**: Guaranteeing wallets and point accounts exist before any financial or order mutation can occur.
- **NIST SP 800-63B Compliance**: Strict credential rules without arbitrary character restrictions or unverified storage.
- **Transactional Consistency**: If wallet creation, role binding, or user persistence fails, the entire transaction rolls back cleanly.
- **Reliable Notification Delivery**: Leveraging the Transactional Outbox pattern (`OutboxEvent`) to decouple user signup from external email service latency and outages.

---

## Considered Options

1. **Lazy Wallet Allocation on First Transaction**:
   - *Pros*: Slightly faster initial registration insert.
   - *Cons*: Introduces race conditions when multiple parallel operations occur (e.g. promotional reward allocation vs concurrent shopping cart checkout); violates double-entry integrity guarantees.
2. **Synchronous Email Dispatch during Registration**:
   - *Pros*: Immediate feedback.
   - *Cons*: Third-party SMTP/SES latency directly blocks the HTTP response; failures during email delivery can cause orphaned user accounts or confusing 500 errors.
3. **Atomic Transactional Registration + Outbox Notification + Immediate Wallet Provisioning (Selected)**:
   - *Pros*: Mathematically sound, transactional, resilient against external network drops, and ensures all customer wallets and roles are instantly available.

---

## Decision Outcome & Detailed Rationale

### 1. Atomic Transaction Flow (`UserRepository.registerCustomer`)
Within a single PostgreSQL transaction:
1. Validates uniqueness of `email` (and `phone` if supplied), throwing `ConflictError` (HTTP 409) if already present.
2. Creates `User` record with `id: generateId(ID_PREFIXES.USER)`, `status: 'ACTIVE'`, `isEmailVerified: false`, and `passwordHash`.
3. Ensures `CUSTOMER` role exists and creates `UserRoleAssignment`.
4. Provisions the four mandatory customer wallets (`MAIN`, `SHOPPING`, `GOOD_LUCK`, `CHARITY`) with zero minor-unit balances (`availablePoisha: 0`, `pendingPoisha: 0`).
5. Provisions customer `PointAccount` with initial zero balances (`availablePoints: 0`, `pendingPoints: 0`, `lifetimePoints: 0`).
6. Generates a 6-digit verification code, computes its SHA-256 hash, and inserts an `OtpToken` record with 15-minute TTL (`expiresAt = now() + 15m`).
7. Inserts `OutboxEvent` with `eventType: 'auth.customer_registered'` carrying payload for BullMQ background email processor.
8. Writes an `AuditLog` entry tracking `action: 'CUSTOMER_REGISTERED'`.

### 2. Password Derivation Standards
- Evaluated against `PASSWORD_POLICY`: min 8 chars, uppercase, lowercase, numbers, special symbol.
- Derived with PBKDF2-HMAC-SHA512 (100,000 iterations, 32-byte salt).

### 3. REST Contract & Error Envelopes
- Route: `POST /api/v1/auth/register`
- Success: HTTP 201 Created with `{ success: true, data: { userId, email, name, status, isEmailVerified, message } }`.
- Conflict: HTTP 409 Conflict with `{ success: false, error: { code: 'CONFLICT', message } }`.
- Validation: HTTP 422 Unprocessable Entity with `{ success: false, error: { code: 'VALIDATION_FAILED', details } }`.

### 4. Bilingual Storefront Interface
- Location: `src/app/register/page.tsx`.
- Features: Live password strength meter (5 security rules), English/Bengali locale toggle, accessible form fields, loading states, and success confirmation screen.

---

## Consequences

### Positive
- Robust customer onboarding with zero orphaned accounts or missing wallet records.
- Complete auditability and immediate event propagation for email/SMS workers.
- Mobile-first, accessible registration compliant with Bangladesh marketplace expectations.

### Negative & Mitigations
- Transaction touches multiple tables (mitigated by fast indexed primary-key operations and connection pooling).
