# ADR-0025: Model Catalog Taxonomy, Products, Variants, and Media

**Status**: Accepted  
**Date**: 2026-09-22  
**Deciders**: Architecture Team, Product Management, Compliance & Tax, Search & Discovery  
**Milestone Reference**: [Milestone 025](../../AlifWorld-300-Milestones/025-model-catalog-taxonomy-products-variants-and-media.md)  
**Phase**: Phase 03: Data Architecture  
**Supporting Specification**: [Catalog Taxonomy, Products, Variants, and Media Architecture](../architecture/catalog-taxonomy-products-and-media.md)  

---

## Context and Problem Statement

A high-availability e-commerce platform operating in Bangladesh requires a structured, multi-tenant catalog model that:
1. Organizes products into a hierarchical taxonomy (`Category`) and maintains an approved trademark registry (`Brand`).
2. Expresses monetary values in exact integer minor units (poisha) to prevent floating-point rounding errors across checkout, commissions, and refunds.
3. Enforces the strict invariant that **Product price and Product Points are independent values** and never infers a conversion rate between them.
4. Supports multi-SKU variants (e.g., Color, Storage, Size) with optional price overrides.
5. Manages permanent media gallery assets with primary image designations.
6. Preserves public SEO URLs and customer bookmarks when product slugs are modified.
7. Incorporates Bangladesh National Board of Revenue (NBR Mushak 6.3) VAT rates into invoice line items.

---

## Decision Drivers

- **Financial & Monetary Integrity**: All prices in integer poisha (`1 BDT = 100 poisha`). Zero floating point values in persistent storage.
- **Independent Product Points**: Discrete integer point allocations chosen by merchants without conversion formulas.
- **Multi-Tenant Isolation**: Products are strictly scoped to `sellerId`. Only the owning merchant or platform administrators can modify listings.
- **SEO & Permalinks Preservation**: Renaming a product slug must not break existing search engine indexing or customer links.
- **Publication Readiness Gate**: Strict 5-point verification preventing incomplete drafts from reaching the storefront.
- **Auditability & Outbox Sync**: Asynchronous notification of search indexers (Meilisearch) via transactional outbox events.

---

## Considered Options

1. **Denormalized Single Product Document with Embedded JSON Variants and Media**:
   - *Pros*: Simple single-table read.
   - *Cons*: Cannot enforce database-level SKU uniqueness; makes inventory balance tracking and warehouse bin allocations error-prone; prevents atomic variant reservations.
2. **Third-Party Headless Commerce Catalog (e.g., Medusa, Shopify Buy Button)**:
   - *Pros*: Off-the-shelf admin screens.
   - *Cons*: Violates single Next.js modular monolith constraint; cannot enforce AlifWorld double-entry ledger integration and custom independent Product Points model.
3. **Normalized Relational Models in PostgreSQL/Prisma (Selected)**:
   - *Pros*: Enforces foreign key constraints across `Seller`, `Category`, `Brand`, `Product`, `ProductVariant`, `ProductMedia`, and `ProductSlugHistory`; guarantees SKU uniqueness; enables OCC concurrency.

---

## Decision Outcome & Detailed Rationale

### 1. Persistence Schema
Added to `prisma/schema.prisma`:
- `Category`: Self-referencing hierarchical model with Bangla localization (`nameBn`) and NBR default tax rates (`taxRatePercent`).
- `Brand`: Trademark authority registry with verification badges.
- `Product`: Root listing entity scoped to `sellerId` with `basePricePoisha` (BigInt), `productPoint` (Int), and `status` (`DRAFT`, `PUBLISHED`, `ARCHIVED`).
- `ProductVariant`: Sellable child items with unique uppercase `sku` strings, option attributes, and pricing.
- `ProductMedia`: Image and video assets with S3 storage keys and primary image ranking.
- `ProductSlugHistory`: Historical permalink registry enabling 301 redirects when titles and slugs change.

### 2. Standardized Identifiers & Lifecycle Policies
- Registered prefixes in `src/shared/utils/id.ts`: `CATEGORY: 'cat'`, `BRAND: 'brd'`, `PRODUCT: 'prd'`, `VARIANT: 'var'`, `MEDIA: 'med'`.
- Deletion lifecycle in `src/shared/database/lifecycle.ts`: `Category`, `Brand`, `Product`, `ProductVariant`, and `ProductMedia` classified under `SOFT_DELETE`. `ProductSlugHistory` classified as `IMMUTABLE`.

### 3. Tax Service & NBR Mushak-6.3 Calculations
- Implemented `TaxService` calculating 15% standard VAT, 5% ICT/electronics concession, and 0% essential goods exemption.
- Produces immutable `TaxSnapshot` breakdowns for order fulfillment invoices and returns.

### 4. UI Surfaces
- Seller Center (`/seller/products`, `/seller/products/new`): Product inventory table and multi-step listing creation wizard.
- Admin Console (`/admin/categories`): Taxonomy hierarchy editor and brand approval registry.
- Customer Storefront (`/products/[slug]`): Responsive product detail page featuring BDT poisha formatting, independent Product Points earnable badges, and variant selectors.

---

## Consequences & Security Impacts

### Positive
- Strict isolation ensures sellers cannot edit competing products.
- Independent Product Points and integer poisha prices preserve financial integrity.
- Historical slugs eliminate dead 404 links for indexed web pages.
- Outbox events provide seamless decoupled hooks for BullMQ search indexing workers.

### Negative / Trade-offs
- Creating complex products with multiple variants and media requires multi-table relational inserts (mitigated via transactional Prisma orchestration).
