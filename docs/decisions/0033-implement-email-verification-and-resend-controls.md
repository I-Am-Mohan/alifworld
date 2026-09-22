# ADR-0033: Implement Email Verification and Resend Controls

**Status**: Accepted  
**Date**: 2026-09-22  
**Deciders**: Security Architecture, Identity Engineering, Storefront UX, Core Platform Team  
**Milestone Reference**: [Milestone 033](../../AlifWorld-300-Milestones/033-implement-email-verification-and-resend-controls.md)  
**Phase**: Phase 04: Identity and Authentication  
**Supporting Specification**: [Email Verification and Resend Controls Architecture](../architecture/email-verification-and-resend-controls.md)  

---

## Context and Problem Statement

Customer email verification is critical to guarantee identity authenticity, combat spam registrations, and establish a trusted contact vector for transaction receipts, OTPs, and dispute resolution. An insecure verification flow presents several platform risks:
1. **Brute-Force Vulnerability**: A 6-digit numeric code possesses only 1,000,000 permutations. Without strict attempt limits, high-throughput automated attacks can guess the code within the 15-minute TTL.
2. **Flooding and Denial of Service (Email Bombing)**: Uncapped resend requests can overwhelm email dispatch queues, inflate SMTP costs, and trigger blacklisting from email service providers (SES/SendGrid).
3. **User Account Enumeration**: Information disclosure during resend or verification requests can leak whether an email address is registered on AlifWorld.
4. **State Desynchronization**: If token consumption and user status updates are not atomic, partial failures can leave a token consumed while the user remains unverified.

---

## Decision Drivers

- **OWASP ASVS & NIST SP 800-63B Compliance**: Ephemeral verification tokens must be hashed at rest, time-bounded (15 minutes), and attempt-limited (max 3 failed attempts).
- **Abuse and Rate-Limiting Protection**: Strict 60-second cooldown between successive resends and an absolute ceiling of 3 resends per rolling hour per identifier.
- **Enumeration Defense**: Resend endpoints must return an identical neutral success envelope regardless of whether the email exists.
- **Transactional Atomicity**: State transition (`isEmailVerified = true`), token consumption (`isUsed = true`), audit log logging, and event outbox emission must occur inside a single ACID database transaction.
- **Accessible & Localized Customer Experience**: Mobile-first customer verification UI supporting auto-advancing 6-digit PIN inputs, clipboard paste handling, 60-second countdown timers, and dual Bengali (`bn-BD`) and English (`en-BD`) localization.

---

## Considered Options

1. **Magic Link Verification Only**:
   - *Pros*: Single click flow.
   - *Cons*: Poor experience across mobile web and native Flutter wrappers; anti-spam email scanners pre-fetch links, prematurely consuming one-time tokens and frustrating customers.
2. **Uncapped 6-Digit Verification with Generic Rate Limits**:
   - *Pros*: Simple to code.
   - *Cons*: Leaves the platform susceptible to SMS/email bombing, wallet fraud, and brute force; lacks explicit cooldown timers for UI synchronization.
3. **Ephemeral 6-Digit Numeric Token with Attempt Tracking, 60s Cooldown, 3/Hour Cap, and Atomic Transaction (Selected)**:
   - *Pros*: Highly secure, resilient against automated brute force, resists account enumeration, prevents email flooding, and delivers a frictionless mobile UX.

---

## Decision Outcome & Detailed Rationale

### 1. Ephemeral Token Lifecycle & Security Policy
- **Generation**: Cryptographically strong 6-digit numeric string (`100000` to `999999`).
- **Storage**: Raw codes are never stored in plaintext. The SHA-256 digest (`hashToken(code)`) is persisted in `otp_tokens` with `purpose = 'EMAIL_VERIFICATION'` and `expiresAt = now() + 15 minutes`.
- **Attempt Tracking & Lockout**:
  - Each invalid code attempt increments `attempts` by 1.
  - The API response explicitly returns `remainingAttempts` (`maxAttempts - attempts`).
  - Upon reaching 3 failed attempts, the token is permanently invalidated (`isUsed = true`), locking out further guesses and requiring the user to request a fresh code.

### 2. Resend Rate Limiting & Cooldown Controls
- **60-Second Cooldown**:
  - Evaluated against the creation timestamp of the latest OTP token (`createdAt`).
  - If `Date.now() - latestOtp.createdAt < 60s`, the request is rejected with HTTP 429 (`ValidationError`) carrying `cooldownRemainingSeconds`.
- **Hourly Ceiling**:
  - Queries `otp_tokens` for records created in the last 60 minutes (`createdAt >= now() - 1 hour`).
  - If count >= 3, rejects with HTTP 429 to prevent email spamming.
- **Old Token Invalidation**:
  - Issuing a fresh code automatically invalidates all existing active tokens for that identifier (`updateMany: isUsed = true`).
- **Account Enumeration Defense**:
  - If the requested email does not exist in the `users` table, the service returns a neutral HTTP 200 success response: `'If an account exists with this email, a verification code has been sent.'` with `cooldownSeconds: 60`.

### 3. Atomic Verification Transaction
Execution in `EmailVerificationService.verifyEmail` guarantees all-or-nothing completion:
```typescript
await prisma.$transaction(async (tx) => {
  // 1. Consume OTP token
  await tx.otpToken.update({ where: { id: activeOtp.id }, data: { isUsed: true } });
  // 2. Mark user verified
  await tx.user.update({ where: { id: user.id }, data: { isEmailVerified: true } });
  // 3. Write structured audit log
  await tx.auditLog.create({ data: { action: 'EMAIL_VERIFIED', actorId: user.id, ... } });
  // 4. Emit outbox event for downstream consumers
  await tx.outboxEvent.create({ data: { eventType: 'auth.email_verified', payload: { userId: user.id, email }, ... } });
});
```

### 4. REST Contracts
- `POST /api/v1/auth/email/verify`:
  - Request: `{ email: string, code: string (6 digits) }`
  - Responses: HTTP 200 (verified), HTTP 404 (user not found), HTTP 422 (invalid/expired code or attempt lockout).
- `POST /api/v1/auth/email/resend`:
  - Request: `{ email: string }`
  - Responses: HTTP 200 (sent or neutral notice with `cooldownSeconds`), HTTP 429 (cooldown or hourly limit breach), HTTP 422 (validation error).

### 5. Storefront Verification UI (`/verify-email`)
- Six single-character input cells with automated focus progression on input and reverse focus on backspace.
- Full clipboard paste listener parsing first 6 numeric digits and populating all cells instantly.
- Reactive 60-second countdown timer disabling the resend button until expiration.
- Seamless locale switching between English and Bangla (`en-BD` / `bn-BD`).

---

## Consequences

### Positive
- Strict defense against brute-force attacks via 3-attempt token invalidation.
- Reliable protection of outbound email infrastructure via 60-second cooldown and 3/hour hard cap.
- Prevention of user account reconnaissance through neutral responses.
- Complete auditability and event-driven decoupling via the Transactional Outbox pattern.

### Negative & Mitigations
- Network latency or clock drift between client and server could cause premature resend attempts (mitigated by server-enforced timestamps returning explicit remaining cooldown seconds).
