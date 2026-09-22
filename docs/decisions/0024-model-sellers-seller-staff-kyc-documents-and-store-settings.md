# ADR-0024: Model Sellers, Seller Staff, KYC Documents, and Store Settings

**Status**: Accepted  
**Date**: 2026-09-22  
**Deciders**: Architecture Team, Merchant Operations, Compliance & Legal, Security & IAM  
**Milestone Reference**: [Milestone 024](../../AlifWorld-300-Milestones/024-model-sellers-seller-staff-kyc-documents-and-store-settings.md)  
**Phase**: Phase 03: Data Architecture  
**Supporting Specification**: [Seller, Staff, KYC, and Store Settings Architecture](../architecture/seller-staff-kyc-and-store-settings.md)  

---

## Context and Problem Statement

AlifWorld functions as a multi-merchant e-commerce ecosystem operating under the legal frameworks of the People's Republic of Bangladesh (Digital Commerce Operation Guidelines, Ministry of Commerce, National Board of Revenue VAT Mushak regulations, and Bangladesh Bank escrow guidelines).

Merchants registering on AlifWorld require:
1. Multi-tenant isolation ensuring store owners and staff members only access their own tenant's inventory, orders, settings, and settlement payouts.
2. Comprehensive regulatory KYC documentation (City Corporation / Pourashava Trade Licenses, NBR 13-digit VAT/BIN certificates, 12-digit e-TINs, owner National Identity cards, and cancelled bank cheque leaves).
3. Private storage security for sensitive KYC files ensuring documents are never publicly exposed via open URLs and access is strictly audited with short-lived presigned URLs.
4. Delegated store staff roles (`SELLER_OWNER`, `SELLER_STAFF`) enabling multi-seat operations with granular permission assignments.
5. Flexible store settings managing Bangladeshi logistics defaults (Steadfast, Pathao, eCourier, RedX), warehouse pickup hubs across Bangladesh's 8 administrative divisions, and vacation mode toggles.

---

## Decision Drivers

- **Multi-Tenant Boundary Isolation**: Cross-store data leaks must be impossible at both the database query layer and the domain service layer.
- **Bangladeshi Regulatory Compliance**: Validation of official government business credentials (13-digit BIN, 12-digit TIN, Trade License registration strings).
- **KYC Document Privacy & Security**: Mandatory private S3 object keys; inspection requires signed, short-lived URLs and writes immutable entries to `audit_logs`.
- **Zero Placeholder Discipline**: Complete domain types, Zod schema validations, type-safe repositories, and domain services.
- **Optimistic Concurrency Control (OCC)**: Integer `version` counters on all seller entities to eliminate race conditions during concurrent modifications.
- **Audited State Transitions**: Outbox event emission (`SELLER_REGISTERED`, `SELLER_KYC_SUBMITTED`, `SELLER_VERIFIED`) for downstream event consumers.

---

## Considered Options

1. **Monolithic Single Table for Sellers and Settings**:
   - *Pros*: Fewer joins.
   - *Cons*: Clutters core merchant entity with store presentation parameters, courier configs, and vacation states; violates separation of concerns; complicates KYC verification lifecycle.
2. **Third-Party Merchant Identity & KYC SaaS (e.g., Stripe Identity, Persona)**:
   - *Pros*: Ready-made identity verification pipelines.
   - *Cons*: Very poor support for Bangladeshi documents (Bengali Trade Licenses, NBR Mushak BIN certificates); per-check foreign currency fees; violates sovereign data hosting regulations.
3. **Dedicated In-Database Multi-Tenant Seller Subsystem with Encapsulated KYC (Selected)**:
   - *Pros*: Complete relational modeling (`Seller`, `SellerStaff`, `SellerKycDocument`, `SellerStoreSettings`); native PostgreSQL foreign keys; strict repository tenant scoping; zero third-party subscription dependencies.

---

## Decision Outcome & Detailed Rationale

### 1. Persistence Models in Prisma
Added to `prisma/schema.prisma`:
- `Seller`: Tenant root entity holding `ownerUserId`, business name, unique URL slug, NBR credentials (`tradeLicenseNumber`, `binNumber`, `tinNumber`), `status` (`DRAFT`, `PENDING_VERIFICATION`, `ACTIVE`, `SUSPENDED`, `INACTIVE`), `isVerified`, `defaultCommissionRate`, OCC `version`, and soft deletion lifecycle.
- `SellerStaff`: Associates users with merchant stores, tracking role (`SELLER_OWNER`, `SELLER_STAFF`), granular permissions array, and employment status.
- `SellerKycDocument`: Holds regulatory files with private `fileUrl`, `documentType` (`TRADE_LICENSE`, `TIN_CERTIFICATE`, `BIN_CERTIFICATE`, `NID_FRONT`, `NID_BACK`, `BANK_CHEQUE_LEAF`, `UTILITY_BILL`), review status (`PENDING`, `UNDER_REVIEW`, `VERIFIED`, `REJECTED`), reviewer admin ID, and rejection reason.
- `SellerStoreSettings`: Stores warehouse pickup addresses (Bangladeshi division, district, thana), courier defaults (`STEADFAST`, `PATHAO`, `ECOURIER`, `REDX`), auto-order acceptance, and vacation mode configuration.

### 2. ID Prefixes & Soft Delete Policies
- Registered prefixes in `src/shared/utils/id.ts`: `STAFF: 'stf'`, `KYC_DOCUMENT: 'kyc'`, `STORE_SETTINGS: 'set'`.
- Deletion lifecycle in `src/shared/database/lifecycle.ts`: `SellerStaff`, `SellerKycDocument`, and `SellerStoreSettings` configured under `SOFT_DELETE`.

### 3. Tenant Boundary Enforcement & Domain Services
- `SellerService`: Orchestrates merchant onboarding, assigns `SELLER_OWNER` IAM role scoped to `seller.id`, verifies store slug uniqueness, and publishes outbox events.
- `SellerKycService`: Manages document submissions, requires store ownership or tenant staff permission, generates 15-minute signed view URLs, and logs access to `audit_logs`.
- `SellerSettingsService`: Enforces multi-tenant ownership checks before updating warehouse logistics or vacation mode configurations.

### 4. UI Presentation Surfaces
- `/seller`: Store overview dashboard displaying store verification badge, commission tier, and quick navigation.
- `/seller/settings`: Store configuration console for warehouse addresses, default courier preference, and vacation mode.
- `/seller/kyc`: Government compliance portal detailing required documents and inspection status.
- `/seller/staff`: Delegated access management table listing store staff with assigned operational capabilities.
- `/admin/sellers`: Administrative governance console for auditing merchant registrations, reviewing KYC dossiers, and managing commission rates.

---

## Consequences & Security Impacts

### Positive
- Strict multi-tenant isolation ensures store staff can never access or modify data belonging to competing stores.
- Private storage keys protect sensitive merchant tax and identity documents from public web crawlers and data leaks.
- Administrative maker-checker actions for store approval and suspension are immutably audited.
- Supports local Bangladeshi delivery providers out of the box with division/district/thana address hierarchies.

### Negative / Trade-offs
- Additional joins required when querying full store profile with staff and settings (mitigated via indexed Prisma relations).
- KYC review requires manual back-office compliance audit until automated NBR API integration (GATE-04) is activated.
