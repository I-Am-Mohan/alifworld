# Object-Level Authorization and Ownership Verification Architecture

**Phase**: 05 — Authorization, Security, and Tenancy  
**Milestone**: 047 — Add object-level authorization and ownership checks  
**Invariants**: ADR-0003 (Single Modular Monolith), ADR-0006 (Multi-Tenant Seller Isolation), ADR-0022 (Audit & Lifecycle), ADR-0023 (Granular ABAC/RBAC Policy Engine), Gate-05 (Maker-Checker Financial Controls)  
**Status**: Accepted & Implemented  

---

## 1. Executive Summary

AlifWorld enforces server-side authorization at three synchronized architectural layers:
1. **HTTP Route Layer**: Route guards (`authorizeObjectRequest`, `withObjectAuthorization`) extract actor context from cryptographically verified access tokens and evaluate object permissions before handler execution.
2. **Domain Service Layer**: The centralized `ObjectAuthorizationService` classifies the relationship between the actor and the target entity instance (`OwnershipRelation`), executes policy rules via `PolicyEngine`, verifies lifecycle status invariants, and prevents privilege escalation.
3. **Data Access Repository Layer**: The `BaseRepository` and domain repositories apply scoped database queries (`whereOwnerScope`, `whereSellerScope`, `buildActorScopedWhere`) and assertion methods (`assertOwnership`, `assertSellerScope`, `assertOrderAccess`, `assertCartOwnership`) directly at query boundaries.

Hiding UI elements or client-side checks is explicitly rejected as authorization. Every mutation and query is evaluated on the server.

---

## 2. Ownership Classifications

For every target resource instance, `ObjectAuthorizationService` classifies the caller's relation into one of eight mutually exclusive categories:

| Ownership Relation | Definition | Typical Actor | Authorized Access Scope |
| :--- | :--- | :--- | :--- |
| `DIRECT_OWNER` | Actor matches `ownerId` or `userId` of the entity | Customer / User | Read, self-service updates, cancellations within allowed states |
| `TENANT_OWNER` | Actor is `SELLER_OWNER` matching the object's `sellerId` | Merchant Owner | Storefront configuration, fulfillment groups, products, staff |
| `TENANT_STAFF` | Actor is `SELLER_STAFF` matching the object's `sellerId` | Merchant Employee | Order packing, inventory updates, subject to delegated permissions |
| `ASSIGNED_ACTOR` | Actor matches `assignedActorId` (e.g. rider or support agent) | Rider / Support | Delivery status updates, route telematics, ticket thread replies |
| `PLATFORM_SUPER_ADMIN` | Actor holds `SUPER_ADMIN` system role | Super Administrator | Global bypass for platform governance and disaster recovery |
| `PLATFORM_ADMIN` | Actor holds `ADMIN` system role | Platform Administrator | Governed by explicit granular permissions (`orders:read`, `users:write`) |
| `PUBLIC` | Object is explicitly flagged for public discovery | Guest / Any | Browsing published products, approved store directories |
| `NONE` | Actor holds no authorized link to the target entity | Foreign Customer/Seller | Strictly rejected with `OWNERSHIP_VIOLATION` or `TENANT_VIOLATION` |

---

## 3. Domain Policy Invariants

### 3.1 Customer Profiles & Addresses
- **Self-Ownership (`DIRECT_OWNER`)**: A customer can view and update their own profile and address book.
- **Anti-Tampering & Privilege Escalation Barrier**: Self-service profile updates are prohibited from modifying protected security and financial attributes (`status`, `roles`, `isEmailVerified`, `isPhoneVerified`, `walletBalance`, `points`). Any attempt is rejected with `403 PRIVILEGE_ESCALATION`.
- **Cross-Customer Denial**: A customer attempting to inspect or modify another customer's profile or address is rejected with `403 OWNERSHIP_VIOLATION`.

### 3.2 Shopping Carts & Checkout
- **Cart Self-Ownership**: Carts are scoped to the creating customer (`userId`).
- **Checkout Guard**: During checkout (`processCheckout`), the service verifies that `cart.userId === customerId`. Attempting to check out another customer's cart is rejected with `403 OWNERSHIP_VIOLATION`.

### 3.3 Orders & Fulfillment Groups
- **Customer View**: Customer can view an order only if `order.customerId === actor.userId`. Cross-customer views are rejected with `403 OWNERSHIP_VIOLATION`.
- **Customer Cancellation**: Customer can cancel their own order only while the order is in an eligible pending status (`PENDING`, `PLACED`, `PAYMENT_PENDING`). Once an order transitions to `PACKING`, `SHIPPED`, or `DELIVERED`, self-service cancellation is rejected with `403 FORBIDDEN`.
- **Seller Fulfillment Isolation**: A merchant can only view and transition fulfillment groups where `group.sellerId === actor.sellerId`. Viewing or modifying foreign groups is rejected with `403 TENANT_VIOLATION`.
- **Rider Scoping**: Assigned delivery riders can view only orders/shipments assigned to their delivery tasks (`assignedActorId === actor.userId`).

### 3.4 Product Catalog & Media
- **Storefront Browse**: Published products (`status: PUBLISHED` or `ACTIVE`) are publicly accessible (`PUBLIC`).
- **Merchant Authoring**: Unpublished, draft, or archived products are visible only to the owning merchant (`product.sellerId === actor.sellerId`) or platform administrators. Cross-store updates are rejected with `403 TENANT_VIOLATION`.

### 3.5 Wallets & Ledgers
- **Segregated Balances**: Customer can read only their own wallet (`wallet.userId === actor.userId`). Merchant can read only their store settlement wallet (`wallet.sellerId === actor.sellerId`).
- **Gate-05 Maker-Checker**: High-value adjustments or payouts exceeding the configured threshold (50,000 BDT = 5,000,000 poisha) require separate maker and checker actors. Operations without a distinct checker are rejected with `403 MAKER_CHECKER_REQUIRED`.

### 3.6 Customer Support Tickets
- **Ticket Privacy**: Customers view and reply to only their own support tickets (`ticket.ownerId === actor.userId`).
- **Staff Resolution**: Support operators can reply and resolve assigned tickets (`support:manage` or `assignedAgentId === actor.userId`).

---

## 4. Repository Scoping Patterns

`BaseRepository` provides typed database helpers to ensure isolation is enforced inside queries rather than after loading data into memory:

```typescript
// Strict ownership assertion
assertOwnership(entity.userId, actor.userId);

// Scoped where clauses
const where = this.whereOwnerScope(actor.userId, { status: 'ACTIVE' }, 'userId');

// Dynamic role-based query scoping
const scopedWhere = this.buildActorScopedWhere(actor, {
  ownerField: 'customerId',
  sellerField: 'sellerId',
  allowAdminBypass: true,
});
```

---

## 5. Security Audit Logging

All object-level authorization denials and sensitive mutations emit immutable audit log entries:
- `AUTHZ_DENIED`: Generic permission failure.
- `AUTHZ_OWNERSHIP_VIOLATION`: Customer attempting to access another user's private object.
- `AUTHZ_TENANT_VIOLATION`: Merchant attempting cross-tenant access.
- `AUTHZ_MAKER_CHECKER_REQUIRED`: Financial operations lacking secondary approval.
- `AUTHZ_GRANTED`: Sensitive mutations (cancellation, refunds, suspensions, payouts).

All audit logs strictly redact passwords, tokens, full national IDs, payment credentials, and unnecessary PII.
