# Immutable Security & Business Audit Logging Architecture

**Phase**: 05 — Authorization, Security, and Tenancy  
**Milestone**: 049 — Implement immutable security and business audit logs  
**Invariants**: ADR-0003 (Single Modular Monolith), ADR-0006 (Multi-Tenant Isolation), ADR-0022 (Audit & Lifecycle Invariants), ADR-0031 (Forensic Traceability), NIST SP 800-63B, OWASP Logging Cheat Sheet  
**Status**: Accepted & Implemented  

---

## 1. Executive Summary

AlifWorld maintains an authoritative, immutable, append-only audit trail capturing security perimeter events, identity state transitions, and high-value business operations across all subsystems.

Key architectural pillars:
1. **Append-Only Immutability**: The `AuditLog` model is classified as `IMMUTABLE` under project lifecycle standards. Deletions, modifications, and truncations are strictly prohibited at both the database and API layers.
2. **Deterministic Redaction**: A recursive redaction engine strips credentials, passwords, tokens, OTPs, PINs, card numbers, and authorization headers before audit records are serialized or persisted.
3. **Redaction-Safe State Diffs**: Mutations automatically record granular `before` and `after` field comparisons (`computeAuditDiff`), ensuring forensic traceability without storing sensitive values.
4. **End-to-End Correlation**: Every audit record links to an `x-request-id` tracing header, client IP address, user-agent, actor ID, and actor role.
5. **Non-Blocking Resilience**: Audit log persistence errors never abort primary business transactions; failures degrade gracefully with structured stderr diagnostics.
6. **Governed Exploration**: The administrative API (`/api/v1/admin/audit`) enables multi-parameter filtering for authorized compliance officers (`SUPER_ADMIN` or `system:audit_read`).

---

## 2. Event Taxonomy

Audit events are partitioned into two categories: **Security Perimeter Events** and **Business Lifecycle Events**.

### 2.1 Security Perimeter & Identity Events

| Action Constant | Resource | Trigger Description | Logged Metadata |
| :--- | :--- | :--- | :--- |
| `AUTH_LOGIN_SUCCESS` | `AUTH_SESSION` | User successfully authenticated via password, OTP, or OAuth | `userId`, `clientType`, `ipAddress` |
| `AUTH_LOGIN_FAILED` | `AUTH_SESSION` | Authentication attempt rejected due to invalid credentials | `identifier`, `attemptCount`, `ipAddress` |
| `AUTH_LOGOUT` | `AUTH_SESSION` | User explicitly terminated a session | `sessionId`, `reason` |
| `AUTH_TOKEN_ROTATED` | `AUTH_SESSION` | Refresh token family successfully rotated | `sessionId`, `tokenFamily` |
| `AUTH_BREACH_DETECTED` | `AUTH_SESSION` | Refresh token reuse detected; entire token family revoked | `sessionId`, `compromisedTokenHash` |
| `CSRF_VIOLATION_DETECTED` | `PERIMETER` | State-modifying request blocked due to missing/mismatched anti-CSRF token | `code`, `reason`, `pathname`, `method` |
| `CORS_VIOLATION_DETECTED` | `PERIMETER` | Cross-origin preflight blocked due to unlisted origin | `origin`, `method` |
| `AUTHZ_DENIED` | Variable | Authorization engine denied access to a protected resource | `action`, `resource`, `diagnostics` |
| `AUTHZ_TENANT_VIOLATION` | Variable | Merchant attempted cross-tenant access to foreign store data | `actorSellerId`, `targetSellerId` |
| `AUTHZ_OWNERSHIP_VIOLATION` | Variable | Customer attempted to access another customer's private entity | `actorId`, `targetOwnerId` |
| `AUTHZ_MAKER_CHECKER_REQUIRED` | `WALLET` | High-value financial adjustment lacked secondary checker | `amountPoisha`, `thresholdPoisha` |
| `PRIVILEGE_ESCALATION_PREVENTED` | Variable | Actor attempted to tamper with protected security fields | `illegalAttempts`, `targetRoles` |

### 2.2 Business Lifecycle Events

| Action Constant | Resource | Trigger Description | State Diff & Metadata |
| :--- | :--- | :--- | :--- |
| `ORDER_CREATED` | `ORDER` | Customer completed checkout transaction | `orderNumber`, `totalPoisha`, `totalProductPoints` |
| `ORDER_CANCELLED` | `ORDER` | Customer cancelled pending order | `from: 'PENDING' -> to: 'CANCELLED'`, `reason` |
| `FULFILLMENT_GROUP_STATUS_CHANGED` | `SELLER_FULFILLMENT_GROUP` | Merchant updated order fulfillment status | `from: sfg.status -> to: nextStatus`, `sellerId` |
| `SHIPMENT_DISPATCHED` | `SHIPMENT` | Merchant created shipment with courier consignment | `shipmentNumber`, `courierProvider`, `trackingNumber` |
| `SELLER_REGISTERED` | `SELLER` | New merchant store application submitted | `businessName`, `tradeLicense` |
| `SELLER_KYC_VERIFIED` | `SELLER_KYC_DOCUMENT` | Compliance operator approved merchant regulatory KYC dossier | `verifiedBy`, `documentType` |
| `PRODUCT_PUBLISHED` | `PRODUCT` | Merchant published draft product to storefront | `productId`, `sellerId`, `status: PUBLISHED` |
| `STOCK_RESERVED` | `STOCK_RESERVATION` | Stock reserved atomically for checkout session | `variantId`, `warehouseId`, `quantity` |
| `PAYOUT_APPROVED` | `SELLER_PAYOUT` | Secondary checker approved high-value merchant payout | `payoutId`, `makerId`, `checkerId`, `amountPoisha` |
| `SUPPORT_TICKET_CREATED` | `SUPPORT_TICKET` | Customer opened support inquiry or dispute | `ticketNumber`, `category`, `priority` |

---

## 3. Sensitive Data Redaction Engine

All audit entries pass through the centralized `redactSensitiveData` utility before serialization.

### 3.1 Redaction Patterns
Any property whose key matches the following regular expressions has its value substituted with `'[REDACTED]'`:

```typescript
const SENSITIVE_KEY_PATTERNS = [
  /password/i, /passcode/i, /token/i, /secret/i, /salt/i, /hash/i,
  /credential/i, /otp/i, /pin/i, /authorization/i, /cookie/i,
  /session_?id/i, /refresh/i, /bearer/i, /cvv/i, /cvc/i, /pan/i,
  /card_?number/i, /private_?key/i, /api_?key/i
];
```

### 3.2 Immutability Guarantees
1. **No Hard or Soft Deletes**: In `MODEL_DELETION_POLICIES`, `AuditLog` is marked `IMMUTABLE`. `assertCanDelete('AuditLog')` throws `ValidationError`.
2. **API Mutation Prohibition**: `DELETE`, `PUT`, and `PATCH` requests on `/api/v1/admin/audit/[id]` return HTTP 405 Method Not Allowed with code `IMMUTABLE_RECORD`.
3. **Corrections via Linked Events**: Audit errors are never overwritten. Discrepancies are addressed by appending subsequent corrective audit entries.

---

## 4. Administrative Exploration API

Authorized compliance operators can query historical audit logs via REST:

- **Endpoint**: `GET /api/v1/admin/audit`
- **Authorization**: `Bearer <token>` holding `SUPER_ADMIN` or `system:audit_read` permission.
- **Supported Query Parameters**:
  - `actorId`: string (filter by specific user)
  - `actorRole`: string (e.g. `CUSTOMER`, `SELLER_OWNER`, `ADMIN`)
  - `action`: string (e.g. `ORDER_CREATED`, `CSRF_VIOLATION_DETECTED`)
  - `resource`: string (e.g. `ORDER`, `PERIMETER`, `WALLET`)
  - `resourceId`: string (primary ID of target object)
  - `requestId`: string (request correlation ID)
  - `startDate` / `endDate`: ISO 8601 date boundaries
  - `page`: integer (default 1)
  - `limit`: integer (default 20, max 100)

---

## 5. Storage & Retention Policy

1. **PostgreSQL Hot Tier**: Recent audit logs reside in the `audit_logs` table indexed on `(actor_id, created_at)` and `(resource, resource_id)`.
2. **Cold Tier Archiving**: Periodic background jobs export logs older than 90 days to encrypted S3-compatible immutable object storage with SHA-256 hash manifests.
3. **Integrity Verification**: Audit records store UTC timestamps and unique UUIDs (`aud_...`), ensuring zero modification without cryptographic drift detection.
