# ADR-0034: Implement Login and Access Token Issuance

**Status**: Accepted  
**Date**: 2026-09-22  
**Deciders**: Security Architecture, Identity Engineering, Storefront UX, Mobile Engineering  
**Milestone Reference**: [Milestone 034](../../AlifWorld-300-Milestones/034-implement-login-and-access-token-issuance.md)  
**Phase**: Phase 04: Identity and Authentication  
**Supporting Specification**: [Login and Access Token Issuance Architecture](../architecture/login-and-access-token-issuance.md)  

---

## Context and Problem Statement

Authentication is the primary gateway through which customers, merchants, logistics riders, operations staff, and administrators access AlifWorld. A production-grade login and token issuance pipeline must address several foundational security, reliability, and UX requirements:
1. **Multi-Identifier Credentials**: Support seamless authentication using either primary email or Bangladesh mobile phone number (`+8801XXXXXXXXX` or `01XXXXXXXXX`).
2. **Resilience to Offline Brute Force & Timing Attacks**: Passwords must be verified using constant-time comparisons against salted PBKDF2-HMAC-SHA512 hashes.
3. **Anti-Reconnaissance & Anti-Enumeration Defense**: Authentication failures must return generic, uniform error envelopes (`"Invalid email/phone or password"`) to prevent threat actors from enumerating registered users.
4. **Dual-Client Delivery Architecture**:
   - **Web Browsers**: Receive credentials through secure, tamper-resistant `HttpOnly`, `SameSite=Lax` cookies (`aw_access_token` and `aw_refresh_token`).
   - **Mobile Flutter Clients**: Receive standard RFC 6749 OAuth 2.0 Bearer tokens in JSON response bodies with extended 30-day refresh lifecycles suitable for native secure storage.
5. **Multi-Tenant Seller Scoping**: Automatically resolve active `sellerId` bindings for merchant owners and staff to enforce tenant isolation.
6. **Concurrent Session Control**: Automatically cap active concurrent sessions per user to 5, terminating surplus sessions to restrict account sharing and unattended terminal exposure.

---

## Decision Drivers

- **NIST SP 800-63B & OWASP ASVS Authentication Guidelines**: Enforcing secure password verification, credential confidentiality, and session limits.
- **Client Flexibility**: Unifying browser and mobile Flutter authentication contracts within a single Next.js application without separate microservices.
- **Instant Revocation Capability**: Binding tokens to `tokenVersion` and persisted `user_sessions` for instant kill-switch capabilities upon password change or compromise.
- **Auditing & Observability**: Recording structured, redacted `USER_LOGIN` audit logs capturing client type, IP address, and user agent.
- **Bilingual & Responsive Storefront UX**: Providing a clean, accessible login interface with English and Bengali localization (`en-BD` / `bn-BD`).

---

## Considered Options

1. **Email-Only Login**:
   - *Pros*: Simple single-field database query.
   - *Cons*: Ignores Bangladesh e-commerce consumer behavior, where millions of mobile-first consumers prefer logging in with their phone number.
2. **Pure Stateless JWT Login without Database Session Records**:
   - *Pros*: Zero database writes on login.
   - *Cons*: Cannot track active devices, enforce concurrent session limits, or detect refresh token reuse attacks.
3. **Hybrid Multi-Identifier Login + Ephemeral Session Persistence + Dual-Client Delivery (Selected)**:
   - *Pros*: Accommodates both email and Bangladesh mobile users, guarantees session auditability, enforces concurrent session caps, and delivers tailored tokens/cookies for web and Flutter clients.

---

## Decision Outcome & Detailed Rationale

### 1. Multi-Identifier Resolution (`UserRepository.findUserByIdentifier`)
The repository normalizes input identifiers:
- Contains `@`: lowercased and matched against `email`.
- Bangladesh phone: normalized to E.164 (`+8801XXXXXXXXX` and `01XXXXXXXXX`) and matched against `phone`.
- Resolves assigned roles, permissions, and seller scoping (`ownedSellers` and `sellerStaff`).

### 2. Password Verification & Anti-Enumeration
- Hashes are verified via `verifyPassword(input.password, user.passwordHash)` using `pbkdf2Sync` with constant-time buffer comparison (`crypto.timingSafeEqual`).
- If user does not exist, password hash is missing, or password mismatch occurs, the service throws `UnauthorizedError('Invalid email/phone or password')` (HTTP 401).
- If account is `SUSPENDED`, returns explicit notice: `'Your account has been suspended. Please contact customer support for assistance.'`

### 3. Dual-Client Token Issuance (`AuthTokenService.issueTokenPair`)
- **Access Token**: HS256 JWT, 15-minute TTL (900s), containing `sub`, `email`, `phone`, `roles`, `permissions`, `sellerId`, `tokenVersion`, `sessionId`, `clientType`.
- **Refresh Token**: HS256 JWT, single-use, 7-day TTL for Web (604,800s) and 30-day TTL for Flutter (2,592,000s).
- **Session Tracking**: Persists `UserSession` with hashed refresh token (`hashToken(refreshToken)`), user agent, IP address, and client type.
- **Session Limits**: Enforces `MAX_ACTIVE_SESSIONS_PER_USER = 5`, marking older surplus sessions `isRevoked = true`.

### 4. Dual Endpoints Added
1. `POST /api/v1/auth/login`:
   - Validates `LoginInput` (`identifier`, `password`, `clientType`, `deviceInfo`).
   - Issues tokens and sets `HttpOnly`, `SameSite=Lax` cookies for `clientType === 'WEB'`.
   - Returns tokens in JSON body for Flutter clients.
2. `GET /api/v1/auth/me`:
   - Validates bearer token or cookie.
   - Checks `user.tokenVersion === claims.tokenVersion` for immediate revocation defense.
   - Returns user profile, roles, permissions, multi-wallets, and loyalty points.

### 5. Storefront Login & Phone-First Overlay Experience
- In addition to standard email/password authentication, AlifWorld provides a luxury **Overlay Modal** (`AuthModal`) directly above the storefront, avoiding intrusive full-page navigations.
- **Phone-First Login**:
  - Validates phone number via `POST /api/v1/auth/phone/check`.
  - If unregistered: cleanly displays a prompt (*"This number is not registered. Do you want to continue to register, or login with another number?"*) allowing one-click transition to registration without losing their entered phone number.
  - If registered: dispatches 6-digit OTP with 60-second cooldown timer, verifies, and logs in instantly.
- **Registration Wizard Flow**:
  - Step 1: Mobile number entry.
  - Step 2: 6-digit OTP verification issuing cryptographic ticket.
  - Step 3: First name and last name.
  - Step 4: Password and confirm password (with explicit notice: *"Use this password for your next logins"*).
  - Step 5: Optional address, birthday, and gender with a prominent *"Skip for Now"* button.
  - Provisions 4 segregated wallets (`MAIN`, `SHOPPING`, `GOOD_LUCK`, `CHARITY`), assigns `CUSTOMER` role, establishes session, and triggers celebratory confetti welcome.

---

## Consequences

### Positive
- Fully unified login architecture for web storefront, merchant portal, and mobile Flutter apps.
- Frictionless phone-first onboarding tailored to the Bangladesh e-commerce consumer profile.
- Luxury overlay modal preserving shopping context without full page navigation.
- Robust defense against brute force, credential stuffing, and user enumeration.
- Transparent session limit enforcement preventing unauthorized credential sharing.
- Immediate global revocation capability via user `tokenVersion` checks.

### Negative & Mitigations
- Session persistence adds one database insert on login (mitigated by lightweight indexed schema and async audit logging).
- Phone check allows detecting registration status for phone numbers (mitigated by OTP verification requirement and rate limiting).
