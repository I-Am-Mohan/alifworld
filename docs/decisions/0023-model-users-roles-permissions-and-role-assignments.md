# ADR-0023: Model Users, Roles, Permissions, and Role Assignments Architecture

**Status**: Accepted  
**Date**: 2026-09-22  
**Deciders**: Architecture Team, Security & IAM, Data Engineering  
**Milestone Reference**: [Milestone 023](../../AlifWorld-300-Milestones/023-model-users-roles-permissions-and-role-assignments.md)  
**Phase**: Phase 03: Data Architecture  
**Supporting Specification**: [User, Role, Permission, and Role Assignment Data Architecture](../architecture/user-roles-permissions-and-role-assignments.md)  

---

## Context and Problem Statement

AlifWorld requires a robust Identity & Access Management (IAM) data model capable of supporting multiple distinct user personas:
1. Public customers shopping and accumulating Product Points across Bangladesh.
2. Multi-tenant merchant store owners and delegated store staff managing products and orders.
3. Administrative operators overseeing KYC approvals, category taxonomies, and compliance gates.
4. Financial officers executing double-entry ledger audits and payout approvals.
5. Delivery riders fulfilling orders with OTP handovers.

Without a normalized, tenant-aware RBAC persistence structure:
- Permissions could be hard-coded into UI components, leaving API route handlers vulnerable.
- Seller staff could accidentally access or tamper with data belonging to other merchant tenants.
- Phone numbers could be entered in disparate national and international formats, causing duplicate accounts and broken SMS delivery.
- Historical role assignments could be deleted without audit traces.

---

## Decision Drivers

- **Tenant Isolation**: Rigid separation between merchant stores (`sellerId` scoping) to eliminate cross-tenant data access.
- **Granular Least Privilege**: Decoupling functional capabilities into atomic permissions (`module:action`) mapped to versioned roles.
- **Bangladeshi Mobile Identity**: Normalized E.164 phone numbers (`+8801[3-9]XXXXXXXX`) as primary login identifiers alongside emails.
- **Traceability & Auditability**: Standardized k-sortable IDs (`usr_`, `rol_`, `prm_`, `rpm_`, `ura_`), OCC integer versioning, and immutable audit logging for all privilege mutations.
- **Zero Placeholder Discipline**: Full TypeScript and Prisma typing with zero unvalidated objects.

---

## Considered Options

1. **Flat User Role Column (Enum on User Table)**:
   - *Pros*: Simple schema (`role: 'CUSTOMER' | 'ADMIN' | 'SELLER'`).
   - *Cons*: Cannot support multiple roles per user; cannot support granular permissions; cannot scope a user's role to a specific seller tenant.
2. **External Identity Provider (Auth0 / Firebase / Clerk)**:
   - *Pros*: Out-of-the-box UI widgets.
   - *Cons*: Violates single Next.js monolith architecture constraint; introduces recurring per-MAU subscription costs; limits double-entry ledger integration and custom Bangladesh MFS/SMS flows.
3. **Normalized In-Database RBAC with Tenant Scoping (Selected)**:
   - *Pros*: Normalized PostgreSQL models (`User`, `Role`, `Permission`, `RolePermission`, `UserRoleAssignment`); full multi-tenant `sellerId` scoping on assignments; local database transactions; zero external vendor lock-in.

---

## Decision Outcome & Detailed Rationale

### 1. Normalized Persistence Schema
Models added to `prisma/schema.prisma`:
- `User`: Normalized lowercase `email`, E.164 `phone`, `status`, verification booleans, `version`, and soft-delete fields.
- `Role`: Unique `code`, `name`, `isSystem` guard protecting default roles from deletion.
- `Permission`: Unique `code` (`module:action`), `module` category, and description.
- `RolePermission`: Many-to-many junction mapping roles to granular permissions.
- `UserRoleAssignment`: Associates a user with a role, featuring an optional `sellerId` for merchant staff scoping and `assignedBy` audit linkage.

### 2. Standardized Identifiers & Lifecycle
- Entity prefixes added to `ID_PREFIXES`: `ROLE: 'rol'`, `PERMISSION: 'prm'`, `ROLE_PERMISSION: 'rpm'`, `ROLE_ASSIGNMENT: 'ura'`.
- Deletion policy: `Role`, `Permission`, and `UserRoleAssignment` classified as `SOFT_DELETE`. System roles (`isSystem: true`) are protected from deletion.

### 3. Bangladesh Phone Normalization
- Mandatory utility `src/shared/utils/phone.ts` normalizes all mobile inputs to `+8801[3-9]XXXXXXXX`.
- Disallows invalid operators (`010`, `011`, `012`) and lengths outside 11 digits.

### 4. Domain Service & Multi-Tenant Enforcement
- `UserService`: User registration, outbox event generation (`USER_REGISTERED`), and audit log entries.
- `RbacService`: Dynamic permission resolution and tenant isolation enforcement (`assertSellerTenantAccess`). Rejects non-superadmin attempts to assign platform roles or cross into other seller stores.

---

## Consequences

### Positive:
- Provides a rock-solid, production-grade security and authorization foundation for all subsequent Phase 03–05 milestones.
- Enables multi-tenant seller staff delegation with zero risk of cross-merchant leakage.
- Ensures telephone numbers are consistent across OTP, notifications, and courier handovers.
- Full compatibility with Next.js App Router and future Flutter mobile REST contracts.

### Negative / Trade-offs:
- Permission resolution requires joining role assignments and role permissions; however, query optimization and session caching in subsequent milestones will maintain sub-10ms evaluation.

---

## Compliance & Verification Rules

1. **Tenant Check Mandatory**: Any domain service handling seller-specific resources must invoke `assertSellerTenantAccess(userId, sellerId)`.
2. **No Deletion of System Roles**: Any attempt to soft-delete or mutate `isSystem: true` roles must be rejected with a `ValidationError`.
3. **Automated Test Coverage**: All phone normalization, Zod schemas, role assignments, and tenant boundaries must pass automated tests in `tests/unit/phone-normalization.test.ts`, `tests/unit/user-role-permission.test.ts`, and `tests/unit/rbac-service.test.ts`.
