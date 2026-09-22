# ADR-0031: Define Authentication Architecture and Token Policy

**Status**: Accepted  
**Date**: 2026-09-22  
**Deciders**: Security Architecture, Identity Engineering, Platform Engineering, Mobile Client Engineering  
**Milestone Reference**: [Milestone 031](../../AlifWorld-300-Milestones/031-define-authentication-architecture-and-token-policy.md)  
**Phase**: Phase 04: Identity and Authentication  
**Supporting Specification**: [Authentication Architecture and Token Policy Architecture](../architecture/authentication-architecture-and-token-policy.md)  

---

## Context and Problem Statement

AlifWorld requires an enterprise-grade, secure authentication and identity architecture capable of serving two distinct client ecosystems:
1. **Web Browsers**: Storefront, Customer Account Center, Merchant Portal, and SuperAdmin Console running inside Next.js 14.
2. **Native Mobile Applications**: Flutter clients targeting Android and iOS with native offline caching and secure keystore capabilities.

The solution must satisfy stringent security requirements:
- Prevent credential and token theft (XSS, CSRF, MITM).
- Support stateless high-throughput API verification while enabling immediate revocation when security incidents occur.
- Enforce strict single-use refresh token rotation with automated breach detection.
- Provide strong password hashing resistant to offline GPU dictionary attacks.
- Enforce multi-role RBAC authorization and multi-tenant seller boundary isolation.

---

## Decision Drivers

- **Client Flexibility**: Seamless operation for both browser cookie storage and native mobile Bearer header storage.
- **Immediate Revocation**: The ability to instantly invalidate outstanding tokens without waiting for TTL expiry upon password change or account compromise.
- **Resilience Against Token Theft**: Automated revocation of entire session families if a stolen refresh token is presented.
- **Zero Heavy Native Dependencies**: Using secure, standardized cryptographic primitives (HMAC-SHA256, PBKDF2-HMAC-SHA512) natively available in modern runtimes to ensure cross-platform compatibility and zero build drift.

---

## Considered Options

1. **Stateful Database Sessions Only (Traditional Cookies)**:
   - *Pros*: Simple invalidation.
   - *Cons*: Every API request requires a database lookup; difficult to integrate cleanly with native mobile Flutter clients and background worker authentication.
2. **Pure Stateless JWTs without Session Tracking**:
   - *Pros*: Maximum performance; zero database reads for auth.
   - *Cons*: Cannot revoke stolen tokens prior to TTL expiration; no defense against refresh token replay attacks.
3. **Hybrid Architecture: Short-Lived Stateless Access Tokens + Rotating Tracked Refresh Tokens + Global Token Version Invalidation (Selected)**:
   - *Pros*: Fast stateless verification for 99% of requests; complete auditability and immediate revocation via `user_sessions` and `token_version`; automated breach detection on token reuse; dual-client delivery (HttpOnly cookies for web, Bearer tokens for mobile).

---

## Decision Outcome & Detailed Rationale

### 1. Dual-Client Delivery & Cookie Policy
- **Web Browsers**: Refresh tokens and access tokens are delivered via `HttpOnly`, `SameSite=Lax`, `Secure` cookies (`aw_access_token` and `aw_refresh_token`). Refresh cookies are scoped exclusively to the `/api/v1/auth` path.
- **Mobile Clients (Flutter)**: Authenticated endpoints return standard OAuth 2.0 / RFC 6749 JSON envelopes containing `accessToken`, `refreshToken`, and `expiresIn`. Mobile clients pass access tokens via `Authorization: Bearer <token>`.

### 2. Token Lifecycles & TTLs
- **Access Token**: 15 minutes (900 seconds).
- **Web Refresh Token**: 7 days (604,800 seconds).
- **Mobile Refresh Token**: 30 days (2,592,000 seconds).
- **Session Inactivity**: 48 hours (172,800 seconds).
- **OTP Verification Token**: 5 minutes (300 seconds, max 3 attempts).

### 3. Single-Use Refresh Token Rotation & Breach Detection
- Every refresh operation burns the incoming token and issues a fresh token pair.
- The cryptographic SHA-256 hash of the currently valid refresh token is stored on `UserSession`.
- If an old/burned refresh token is presented, the system detects a token reuse attack:
  - All active sessions for the user are immediately marked `is_revoked = true`.
  - The user's `tokenVersion` is incremented.
  - The request is rejected with HTTP 401 Unauthorized.

### 4. Password Hashing & Complexity
- **Algorithm**: PBKDF2-HMAC-SHA512 with 100,000 iterations, 32-byte salt, and 64-byte key length.
- **Policy**: Minimum 8 characters, maximum 128 characters, requiring uppercase, lowercase, numbers, and special characters.

### 5. Schema & Persistence Additions
- `User`: Added `passwordHash String?` and `tokenVersion Int @default(1)`.
- `UserSession`: Ephemeral session entity tracking `sessionToken`, `refreshTokenHash`, `deviceInfo`, `expiresAt`, `isRevoked`.
- `OtpToken`: Ephemeral one-time token tracking `identifier`, `purpose`, `tokenHash`, `attempts`, `expiresAt`.

---

## Consequences

### Positive
- High performance stateless verification with instant revocation fallback.
- OWASP and NIST compliant session management for web and mobile.
- Zero external package bloat by leveraging Node/Bun native crypto primitives.
- Foundation established for Milestones 032 (Registration), 033 (Verification), 034 (Login), 035 (Rotation), and 036 (Logout).

### Negative & Mitigations
- Session rotation requires one lightweight database write per refresh request (mitigated by indexed lookups on `session_token`).
