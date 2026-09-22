# ADR-0027: Model Carts, Orders, Seller Fulfillment Groups, and Shipments

**Status**: Accepted  
**Date**: 2026-09-22  
**Deciders**: Architecture Team, Order Engineering, Multi-Vendor Operations, Compliance & Logistics  
**Milestone Reference**: [Milestone 027](../../AlifWorld-300-Milestones/027-model-carts-orders-seller-fulfillment-groups-and-shipments.md)  
**Phase**: Phase 03: Data Architecture  
**Supporting Specification**: [Carts, Orders, Fulfillment Groups & Shipments Architecture](../architecture/carts-orders-fulfillment-groups-and-shipments.md)  

---

## Context and Problem Statement

AlifWorld is a multi-vendor digital commerce marketplace operating in Bangladesh. Customers frequently purchase products from multiple independent merchants in a single checkout. This architectural requirement introduces critical domain challenges:
1. **Single Customer Parent View vs. Strict Merchant Tenant Scoping**: Customers expect a unified checkout, single payment, and combined receipt. Conversely, merchants must never see items, financials, customer details, or logistics of other merchants (`sellerId` query-level tenancy).
2. **Monetary Precision & Integer Poisha Accounting**: All monetary transactions across orders, line items, shipping fees, VAT, commissions, and payouts must be represented exclusively in integer minor units (poisha, where $1\text{ BDT} = 100\text{ poisha}$) to eliminate floating-point rounding errors.
3. **Independent Product Points (PP)**: Product price and Product Points are decoupled, independent values. A conversion rate between BDT and Product Points is never inferred. Points must be snapshotted per SKU on purchase and released only after the return inspection window closes at the configured eligible status.
4. **Append-Only Auditing & Lifecycle Governance**: Order status transitions and shipment tracking events must be strictly append-only (`OrderStatusHistory`, `ShipmentEvent`), classified as `IMMUTABLE`, and protected against modification or deletion.

---

## Decision Drivers

- **Multi-Vendor Partitioning**: Automatic splitting of customer parent orders into isolated `SellerFulfillmentGroup` entities at checkout time.
- **Strict Query-Level Tenant Scoping**: Seller queries must filter by `sellerId` inside the database query rather than post-retrieval in application memory.
- **Zero Floating-Point Representation**: `subtotalPoisha`, `discountPoisha`, `shippingFeePoisha`, `taxPoisha`, `totalPoisha`, `sellerCommissionPoisha`, and `sellerPayoutPoisha` are stored as `BigInt` minor units.
- **Decoupled Loyalty Rewards**: Product Points are stored as discrete integer quantities ($PP \in \mathbb{N}_0$) with no automated cash conversion formula.
- **Bangladesh Logistics Compatibility**: Native courier dispatch integration (Pathao, Steadfast, RedX, Paperfly) across all 8 administrative divisions.
- **Auditing & Immutability**: All status mutations record immutable transition events with actor identification (`CUSTOMER`, `SELLER`, `ADMIN`, `SYSTEM`).

---

## Considered Options

1. **Monolithic Flat Order Model (Single Table with Vendor ID on Line Items)**:
   - *Pros*: Simple single-table checkout write.
   - *Cons*: High risk of data leakage between merchants; complex row-level security; inability to represent independent courier tracking numbers, dispatch dates, or fulfillment statuses per merchant.
2. **Multiple Independent Customer Orders (Split at Cart Level)**:
   - *Pros*: Natural isolation per vendor.
   - *Cons*: Degrades customer checkout experience (multiple payments, multiple OTP authorizations, multiple gateway fees).
3. **Two-Tier Parent Order with Partitioned Seller Fulfillment Groups (Selected)**:
   - *Pros*: Preserves a seamless single-payment checkout for the customer while partitioning fulfillment into isolated `SellerFulfillmentGroup` entities scoped to each merchant. Fully aligns with Bangladesh courier logistics and financial commission structures.

---

## Decision Outcome & Detailed Rationale

### 1. Relational Persistence Schema
Added to `prisma/schema.prisma`:
- `Cart`: Active and abandoned customer shopping cart sessions.
- `CartItem`: Variant and pricing snapshots within active carts.
- `Order`: Unified customer parent order recording gross transaction totals in integer poisha and snapshotting aggregate Product Points.
- `SellerFulfillmentGroup`: Vendor-scoped fulfillment partition ensuring tenant isolation. Stores merchant subtotal, shipping fee, tax, 5% platform commission, net merchant payout, and courier tracking numbers.
- `OrderItem`: Line item snapshot freezing purchased title, variant, SKU, unit price in poisha, NBR VAT rate, and discrete Product Points snapshot.
- `OrderStatusHistory`: Append-only, immutable audit trail recording every state transition.
- `Shipment`: Physical parcel dispatched via third-party courier (Pathao, Steadfast).
- `ShipmentEvent`: Append-only chronological timeline of parcel transit events.

### 2. Standardized Identifiers & Lifecycle Policies
- Registered prefixes in `src/shared/utils/id.ts`:
  - `CART`: `crt`
  - `CART_ITEM`: `cit`
  - `ORDER`: `ord`
  - `ORDER_ITEM`: `itm`
  - `FULFILLMENT_GROUP`: `sfg`
  - `ORDER_STATUS_HISTORY`: `osh`
  - `SHIPMENT`: `shp`
  - `SHIPMENT_EVENT`: `she`
- Registered lifecycle classifications in `src/shared/database/lifecycle.ts`:
  - `OrderStatusHistory`, `ShipmentEvent`: `IMMUTABLE`
  - `Cart`, `CartItem`, `Order`, `OrderItem`, `SellerFulfillmentGroup`, `Shipment`: `SOFT_DELETE`

### 3. Order Fulfillment Service & Mathematical Guarantees
- Implemented `OrderFulfillmentService`:
  - Partitions cart line items by `sellerId`.
  - Calculates line subtotal: $\text{lineTotal} = \text{unitPricePoisha} \times \text{quantity}$.
  - Calculates VAT using integer arithmetic: $\text{lineTax} = \lfloor (\text{lineTotal} \times \text{taxRateBps}) / 10000 \rfloor$.
  - Assigns courier fees: 6,000 poisha (৳60) inside Dhaka, 12,000 poisha (৳120) outside Dhaka per seller group.
  - Snapshots discrete Product Points per line item: $\text{linePoints} = \text{productPointSnapshot} \times \text{quantity}$ with zero cash conversion.
  - Enforces state transition machine (`PENDING` $\rightarrow$ `ACCEPTED` $\rightarrow$ `PACKING` $\rightarrow$ `READY_FOR_PICKUP` $\rightarrow$ `HANDED_OVER_TO_COURIER` $\rightarrow$ `IN_TRANSIT` $\rightarrow$ `DELIVERED`).
  - Gated Point release: Product Points are released only after the parent order reaches `COMPLETED`.

---

## Consequences & Security Impact

### Positive
- Strict seller isolation prevents cross-tenant operational data leaks.
- Zero floating-point rounding errors across checkout, commissions, and merchant payouts.
- Full compliance with National Board of Revenue (NBR Mushak 6.3) VAT tracking per line item.
- Complete regulatory and operational auditability with append-only status histories.

### Negative / Trade-Offs
- Multi-item checkouts with multiple merchants create multiple relational records in an atomic transaction; mitigated via Prisma `$transaction` boundaries.
