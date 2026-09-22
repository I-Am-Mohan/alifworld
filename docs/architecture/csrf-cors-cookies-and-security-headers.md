# Web Security Architecture: CSRF, CORS, Cookies, and Security Headers

**Phase**: 05 — Authorization, Security, and Tenancy  
**Milestone**: 048 — Configure CSRF, CORS, cookies, and security headers  
**Invariants**: ADR-0003 (Single Modular Monolith), ADR-0006 (Multi-Tenant Isolation), ADR-0022 (Audit & Security Lifecycle), W3C CORS, OWASP ASVS v4.0  
**Status**: Accepted & Implemented  

---

## 1. Executive Summary

AlifWorld implements an end-to-end defense-in-depth web security boundary deployed directly inside the single Next.js modular monolith via `src/middleware.ts`, `src/shared/security/`, and standard Route Handlers.

Security protections govern:
1. **CSRF Protection**: Cryptographic HMAC-SHA256 signed Double-Submit Cookie pattern paired with strict Origin and Referer validation for all state-modifying requests.
2. **CORS Governance**: Strict origin whitelisting with credential separation (`Access-Control-Allow-Credentials: true` is never combined with wildcard `*`), automated preflight handling, and controlled header exposure.
3. **Cookie Hardening**: Explicit `HttpOnly`, `Secure` (HTTPS), `SameSite=Lax/Strict`, and path-isolated configurations across authentication tokens, CSRF tokens, sessions, and preferences.
4. **Security Headers**: Production-grade Content-Security-Policy (CSP), Strict-Transport-Security (HSTS 2-year preload), anti-clickjacking `X-Frame-Options: DENY` on operational portals, `X-Content-Type-Options: nosniff`, and restrictive `Permissions-Policy`.
5. **Request Correlation**: Deterministic injection and propagation of `x-request-id` headers across all incoming requests and outgoing responses.

---

## 2. Protected Assets & Value Classification

| Asset Category | Target Resources | Confidentiality | Integrity | Availability | Primary Risk |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Authentication Secrets** | JWT Access Tokens, Refresh Tokens, Session Identifiers | Critical | Critical | High | Account Takeover, Session Hijacking |
| **Financial Ledgers** | Poisha Double-Entry Balances, Settlements, Payouts, Gate-05 Approvals | Critical | Critical | High | Unauthorized Payouts, Balance Tampering |
| **Customer Data & PII** | Profiles, Delivery Addresses, Phone Numbers, Order History | High | High | High | Data Harvesting, Identity Theft |
| **Merchant Storefronts** | Settings, KYC Dossiers, Inventory, Fulfillment Groups | High | High | High | Tenant Escalation, Impersonation |
| **Operational Backoffice** | Admin Permissions, Super Admin Capabilities, System Config | Critical | Critical | Critical | Total Platform Compromise |

---

## 3. Actors & Trust Boundaries

```
+-----------------------------------------------------------------------------------------+
|                                    UNTRUSTED INTERNET                                   |
|   [ Malicious Third-Party Sites ]   [ Phishing Sites ]   [ Untrusted Cross-Origin Apps ] |
+-----------------------------------------------------------------------------------------+
                                             │
                       [ Boundary 1: CORS & Origin Validation ]
                                             ▼
+------------------------------------+               +------------------------------------+
|       MOBILE CLIENTS (FLUTTER)     |               |      WEB BROWSERS (STORE/PORTAL)   |
|  - Bearer Token Auth (No Cookies)  |               |  - Ambient HttpOnly Cookies        |
|  - Custom App Request Headers      |               |  - JavaScript Document Context     |
|  - Not Subject to Browser CSRF     |               |  - Subject to CSRF & Clickjacking  |
+------------------------------------+               +------------------------------------+
                   │                                                   │
                   │ [ Boundary 2: Bearer Bypass ]                     │ [ Boundary 3: CSRF Double-Submit ]
                   └─────────────────────────┬─────────────────────────┘
                                             ▼
+-----------------------------------------------------------------------------------------+
|                               NEXT.JS GLOBAL MIDDLEWARE                                 |
|  1. Injects x-request-id Correlation Header                                             |
|  2. Evaluates CORS (Rejects unlisted cross-origins; handles OPTIONS preflight)          |
|  3. Enforces CSRF (Origin match + aw_csrf cookie equals x-csrf-token header)            |
|  4. Provisions fresh aw_csrf cookie if absent                                           |
|  5. Injects Security Headers (CSP, HSTS, X-Frame-Options, Permissions-Policy)            |
+-----------------------------------------------------------------------------------------+
                                             │
                        [ Boundary 4: Server-Side Authorization ]
                                             ▼
+-----------------------------------------------------------------------------------------+
|                               APPLICATION CORE & SERVICES                               |
|   - PolicyEngine (ABAC/RBAC)                                                            |
|   - ObjectAuthorizationService (Ownership & Tenant Scoping)                             |
|   - Immutable Audit Logs (Redacted, Correlation-Tagged)                                 |
+-----------------------------------------------------------------------------------------+
```

---

## 4. Abuse Cases & Mitigations

### Abuse Case 1: Cross-Site Request Forgery (CSRF)
- **Threat Vector**: An attacker lures an authenticated customer to visit a malicious website that triggers a silent background `POST /api/v1/cart/checkout` or `POST /api/v1/orders/[id]/cancel`.
- **Mitigation**:
  1. State-modifying requests (`POST`, `PUT`, `PATCH`, `DELETE`) require the Double Submit Cookie pattern: the `aw_csrf` cookie value must match the `x-csrf-token` request header.
  2. The CSRF token is cryptographically signed with HMAC-SHA256 (`<entropy>.<timestamp>.<signature>`) and verified in constant time (`timingSafeEqual`) to prevent forging.
  3. Strict Origin and Referer validation verifies that requests originate from authorized application domains.
  4. Authentication cookies utilize `SameSite=Lax` and `SameSite=Strict`.

### Abuse Case 2: Insecure CORS Wildcard Reflection
- **Threat Vector**: A malicious website makes credentialed XMLHttpRequests / fetch calls to `/api/v1/customer/profile` and reads the response containing customer PII.
- **Mitigation**:
  1. The API strictly uses origin whitelisting (`CORS_ALLOWED_ORIGINS`). Unlisted origins receive no `Access-Control-Allow-Origin` header and preflight requests receive `403 CORS_ORIGIN_DENIED`.
  2. `Access-Control-Allow-Credentials: true` is **never** paired with a wildcard `*`.
  3. Preflight caching (`Access-Control-Max-Age: 86400`) reduces latency for authorized mobile and web clients.

### Abuse Case 3: Clickjacking / UI Redressing
- **Threat Vector**: An attacker embeds the Admin or Seller dashboard inside an invisible `<iframe>` on an external domain and tricks an administrator into clicking sensitive buttons (e.g. KYC approval, payout trigger).
- **Mitigation**:
  1. Operational consoles (`/admin/*`, `/seller/*`, `/api/v1/iam/*`) serve `X-Frame-Options: DENY` and `Content-Security-Policy: frame-ancestors 'none'`.
  2. Public storefront pages serve `X-Frame-Options: SAMEORIGIN` and `frame-ancestors 'self'`.

### Abuse Case 4: Cross-Site Scripting (XSS) & Injection
- **Threat Vector**: Injection of malicious third-party scripts to steal session credentials or tamper with the DOM.
- **Mitigation**:
  1. Content-Security-Policy restricts script execution to `'self'`, and restricts object, base-uri, and form actions.
  2. `X-Content-Type-Options: nosniff` prevents MIME confusion attacks.
  3. `X-XSS-Protection: 1; mode=block` activates legacy browser XSS filters.

### Abuse Case 5: Session Hijacking via Insecure Cookies
- **Threat Vector**: Session tokens intercepted over unencrypted channels or accessed via client-side script vulnerabilities.
- **Mitigation**:
  1. Authentication tokens (`aw_access_token`, `aw_refresh_token`) and session identifiers (`aw_session_id`) enforce `HttpOnly: true` (inaccessible to JavaScript).
  2. In production, `Secure: true` ensures cookies are transmitted strictly over TLS/HTTPS.
  3. Refresh tokens are path-isolated (`path: '/api/v1/auth'`) and set to `SameSite=Strict`.

---

## 5. Cookie Specification

| Cookie Name | Purpose | HttpOnly | Secure (Prod) | SameSite | Scope Path | TTL |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `aw_access_token` | User authentication JWT | `true` | `true` | `Lax` | `/` | 15 minutes (900s) |
| `aw_refresh_token` | Rotating session refresh | `true` | `true` | `Strict` | `/api/v1/auth` | 30 days (2,592,000s) |
| `aw_session_id` | Server session identifier | `true` | `true` | `Lax` | `/` | 30 days |
| `aw_csrf` | Anti-CSRF double-submit | `false` | `true` | `Lax` | `/` | 24 hours (86,400s) |
| `aw_locale` | User language preference | `false` | `true` | `Lax` | `/` | 1 year (31,536,000s) |

---

## 6. HTTP Security Headers Specification

| Header | Production Directive | Purpose |
| :--- | :--- | :--- |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Enforce HTTPS and prevent SSL stripping |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME-type sniffing and confusion attacks |
| `X-Frame-Options` | `DENY` (Admin/Seller) / `SAMEORIGIN` (Store) | Prevent framing and UI clickjacking |
| `X-XSS-Protection` | `1; mode=block` | Activate browser-level reflective XSS protection |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Protect sensitive URL parameters across domains |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(self)...` | Disable unneeded privileged browser APIs |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' ...` | Restrict origin execution and script injection |
| `Cross-Origin-Opener-Policy` | `same-origin` | Isolate browsing context from cross-origin tabs |
| `Cross-Origin-Resource-Policy` | `cross-origin` (API) / `same-origin` (Pages) | Govern cross-origin resource embedding |
