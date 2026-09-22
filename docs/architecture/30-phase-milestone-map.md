# AlifWorld 30-Phase Milestone Delivery Roadmap (300 Milestones)

**Document Type**: Architectural Roadmap & Execution Map  
**Milestone Reference**: [Milestone 001](../../AlifWorld-300-Milestones/001-project-charter-source-authority-and-ai-execution-protocol.md)  
**Total Milestones**: 300  
**Total Phases**: 30  
**Status**: Active Execution (Phase 01 Active, Milestone 001 Completed)  

---

## Roadmap Overview

The AlifWorld platform is engineered through 30 disciplined, sequential phases. Each phase delivers a complete, cohesive capability that is tested, validated, and documented before proceeding to the next.

```
Phase 01-05: Foundation, Tooling, Data, Auth, and Security
Phase 06-10: Localization, Seller Onboarding, Catalog, Media, and Pricing
Phase 11-15: Warehousing, Storefront Search, Customer Experience, Checkout, and Orders
Phase 16-20: Payments, Wallet Ledger, Point Engine, Customer Rewards, and Seller Clubs
Phase 21-25: Commissions, Lottery/Ads, Delivery Logistics, Operations Console, and Realtime Events
Phase 26-30: Mobile REST APIs, Scale/Resilience, Comprehensive QA, DevOps/CI, and Production Handover
```

---

## Complete Phase & Milestone Index

### Phase 01: Governance and Architecture (Milestones 001–010) — *(Completed)*
*Phase Objective: Turn all supplied documents into a controlled, testable source of truth before code implementation.*

- **001**: Project charter, source authority, and AI execution protocol *(Completed)*
- **002**: Source-document reconciliation and decision log *(Completed)*
- **003**: Scope boundaries and modular domain map *(Completed)*
- **004**: Non-functional requirements, capacity assumptions, and SLOs *(Completed)*
- **005**: Domain glossary and ubiquitous language *(Completed)*
- **006**: Single-application modular-monolith architecture decisions *(Completed)*
- **007**: Milestone dependency graph and incremental delivery workflow *(Completed)*
- **008**: Risk register and compliance approval gates *(Completed)*
- **009**: Environment, branching, and release strategy *(Completed)*
- **010**: Definition-of-done and requirements traceability matrix *(Completed)*

### Phase 02: Repository and Tooling (Milestones 011–020) — *(Completed)*
*Phase Objective: Build a deterministic, reproducible local developer experience and baseline CI pipeline.*

- **011**: Inspect the existing repository and preserve useful work *(Completed)*
- **012**: Initialize the Next.js TypeScript application with Bun *(Completed)*
- **013**: Establish directory structure and module boundaries *(Completed)*
- **014**: Create the AlifWorld design system and brand tokens (incorporating `colors.md` and `logo.png`) *(Completed)*
- **015**: Configure linting, formatting, type checking, and commit quality *(Completed)*
- **016**: Implement typed environment validation and secret boundaries *(Completed)*
- **017**: Implement the required Bun command contract *(Completed)*
- **018**: Establish unit, integration, and end-to-end test frameworks *(Completed)*
- **019**: Create local development infrastructure profiles (Postgres, Redis, Meilisearch) *(Completed)*
- **020**: Build the baseline continuous-integration quality gate *(Completed)*

### Phase 03: Data Architecture (Milestones 021–030)
*Phase Objective: Establish normalized PostgreSQL schemas, constraints, indexes, and migrations via Prisma.*

- **021**: Configure PostgreSQL and Prisma foundations *(Completed)*
- **022**: Standardize identifiers, timestamps, lifecycle fields, and deletion policy *(Completed)*
- **023**: Model users, roles, permissions, and role assignments
- **024**: Model sellers, seller staff, KYC documents, and store settings
- **025**: Model catalog taxonomy, products, variants, and media
- **026**: Model warehouses, inventory balances, and stock movements
- **027**: Model carts, orders, seller fulfillment groups, and shipments
- **028**: Model payments, refunds, commissions, settlements, and payouts
- **029**: Model wallets, points, rewards, ranks, and immutable ledgers
- **030**: Create migration, seed, and database-dictionary workflows

### Phase 04: Identity and Authentication (Milestones 031–040)
*Phase Objective: Secure, breach-resilient user identity, sessions, OTP, and token lifecycle.*

- **031**: Define authentication architecture and token policy
- **032**: Implement customer email and password registration
- **033**: Implement email verification and resend controls
- **034**: Implement login and access-token issuance
- **035**: Implement rotating refresh-token families and reuse detection
- **036**: Implement logout, revocation, session, and device management
- **037**: Implement password reset, password change, and breach-safe controls
- **038**: Design Bangladesh phone normalization and OTP authentication
- **039**: Add Google and Apple authentication provider architecture
- **040**: Complete authentication audits, rate limits, and integration tests

### Phase 05: Authorization, Security, and Tenancy (Milestones 041–050)
*Phase Objective: Server-side RBAC, seller tenant isolation, CSRF/CORS, and audit logging.*

- **041**: Seed roles and granular permissions
- **042**: Build the server-side authorization policy engine
- **043**: Enforce seller tenant isolation in every data path
- **044**: Separate Admin and Super Admin capabilities
- **045**: Implement seller staff roles, invitations, and scoped access
- **046**: Implement customer, rider, support, and system-service policies
- **047**: Add object-level authorization and ownership checks
- **048**: Configure CSRF, CORS, cookies, and security headers
- **049**: Implement immutable security and business audit logs
- **050**: Complete the authorization and tenancy security test matrix

### Phase 06: Bangladesh Localization (Milestones 051–060)
*Phase Objective: Full dual-language (`en-BD` and `bn-BD`), BDT formatting, and Asia/Dhaka time handling.*

- **051**: Establish locale routing and internationalization architecture
- **052**: Create English and Bangla translation catalogs
- **053**: Model localizable catalog and CMS content
- **054**: Implement BDT and multi-currency-safe monetary primitives
- **055**: Standardize Asia/Dhaka time and business-period boundaries
- **056**: Model Bangladesh phone, address, and geographic hierarchy data
- **057**: Implement locale-aware date, number, currency, and text formatting
- **058**: Localize validation, errors, notifications, and transactional content
- **059**: Implement localized SEO metadata, hreflang, and canonical strategy
- **060**: Complete localization fallback, translation-admin, and QA tooling

### Phase 07: Seller Lifecycle (Milestones 061–070)
*Phase Objective: Seller onboarding, KYC verification, store branding, and staff management.*

- **061**: Build the seller application workflow
- **062**: Implement secure seller KYC and document uploads
- **063**: Build Admin review, approval, rejection, and resubmission flows
- **064**: Create seller accounts, profiles, and public store identities
- **065**: Build seller storefront branding, policies, and contact controls
- **066**: Implement seller banking and payout profiles
- **067**: Implement seller tax, shipping, order, and notification defaults
- **068**: Implement seller suspension, restriction, and reactivation
- **069**: Build seller staff administration and activity visibility
- **070**: Complete seller lifecycle audits and acceptance tests

### Phase 08: Catalog Foundations (Milestones 071–080)
*Phase Objective: Hierarchical categories, approved brands, attributes, and catalog moderation.*

- **071**: Implement hierarchical categories
- **072**: Implement brands and brand approval
- **073**: Implement curated and rule-based collections
- **074**: Implement attributes, values, and variant option sets
- **075**: Add taxonomy translation and SEO controls
- **076**: Implement catalog permissions and product approval workflow
- **077**: Create seller catalog onboarding templates and guidance
- **078**: Implement safe bulk catalog import and export
- **079**: Implement catalog moderation and duplicate detection
- **080**: Complete catalog APIs, Admin UI, Seller UI, and tests

### Phase 09: Products and Media (Milestones 081–090)
*Phase Objective: Product creation, variant matrices, mandatory Product Points, and S3 media.*

- **081**: Implement product draft creation and editing
- **082**: Implement variant combination generation and validation
- **083**: Implement SKU, barcode, and uniqueness policies
- **084**: Make BDT price and seller-defined Product Point mandatory
- **085**: Implement S3-compatible product image and video handling
- **086**: Implement localized descriptions, specifications, and rich content
- **087**: Implement product weight, dimensions, tax, and shipping attributes
- **088**: Implement product submission, approval, publication, and archival
- **089**: Implement product version history and audit visibility
- **090**: Complete product CRUD across API, Seller UI, Admin UI, and tests

### Phase 10: Pricing, Tax, and Promotions (Milestones 091–100)
*Phase Objective: Authoritative server-side pricing engine, VAT, discounts, coupons, and promotions.*

- **091**: Define BDT pricing and immutable price snapshots
- **092**: Implement compare-at, cost, minimum, and channel pricing
- **093**: Implement configurable tax and VAT calculation architecture
- **094**: Build the discount rule engine
- **095**: Build coupon lifecycle, eligibility, and redemption controls
- **096**: Track seller-funded and platform-funded promotion attribution
- **097**: Implement promotion stacking, exclusion, and priority rules
- **098**: Build the authoritative server-side pricing service
- **099**: Implement scheduled prices and price-history visibility
- **100**: Complete pricing, rounding, boundary, and property-based tests

### Phase 11: Inventory and Warehousing (Milestones 101–110)
*Phase Objective: Multi-warehouse stock tracking, concurrency-safe reservations, and audit ledger.*

- **101**: Implement warehouses and fulfillment locations
- **102**: Implement on-hand, reserved, available, damaged, and quarantine balances
- **103**: Implement the immutable stock-movement ledger
- **104**: Build atomic stock reservation with concurrency protection
- **105**: Implement reservation release, commit, expiry, and compensation
- **106**: Implement low-stock thresholds, alerts, and reorder views
- **107**: Implement transfers, counts, corrections, and approval controls
- **108**: Implement return restocking, inspection, and quarantine flows
- **109**: Build Seller and Admin inventory workspaces
- **110**: Complete overselling, race-condition, and inventory reconciliation tests

### Phase 12: Search, Discovery, SEO, and Storefront (Milestones 111–120)
*Phase Objective: Meilisearch integration with PostgreSQL fallback, CMS homepage, and SEO.*

- **111**: Create the Meilisearch-independent search abstraction
- **112**: Build initial indexing and incremental search-index jobs
- **113**: Implement filters, facets, sorting, pagination, and typo tolerance
- **114**: Implement PostgreSQL search fallback and graceful degradation
- **115**: Build CMS-driven storefront home sections and banners
- **116**: Build category, brand, and collection landing pages
- **117**: Build the localized product detail and variant-selection experience
- **118**: Build public seller storefronts
- **119**: Implement dynamic metadata, JSON-LD, canonical URLs, and social cards
- **120**: Complete sitemaps, robots, accessibility, and storefront performance

### Phase 13: Customer Experience (Milestones 121–130)
*Phase Objective: Customer accounts, address books, wishlists, reviews, Q&A, and shopping carts.*

- **121**: Build customer profiles, preferences, consent, and account security
- **122**: Build the customer address book
- **123**: Implement wishlists and share-safe wishlist links
- **124**: Implement B2B buyer organizations, RFQs, and negotiated commerce
- **125**: Implement verified-purchase reviews, ratings, and review media
- **126**: Implement product questions, seller answers, and moderation
- **127**: Build guest and authenticated carts with safe merge behavior
- **128**: Group cart contents by seller and fulfillment constraints
- **129**: Revalidate stock, price, points, coupons, and seller eligibility in cart
- **130**: Build customer dashboards, order shortcuts, and notification preferences

### Phase 14: Checkout and Shipping (Milestones 131–140)
*Phase Objective: Multi-seller checkout orchestration, Bangladesh courier adapters, and COD controls.*

- **131**: Build idempotent checkout orchestration
- **132**: Implement address validation and delivery serviceability
- **133**: Create the shipping-rate and promise abstraction
- **134**: Create Bangladesh courier adapters and in-house delivery support
- **135**: Build seller-level shipment groups for multi-vendor checkout
- **136**: Calculate tax, discount, coupon, shipping, and points on the server
- **137**: Implement COD eligibility, limits, and fraud-risk controls
- **138**: Build payment-method discovery and selection
- **139**: Build final order review, consent, and place-order transaction
- **140**: Implement abandoned-checkout recovery and checkout acceptance tests

### Phase 15: Orders, Fulfillment, Returns, and Refunds (Milestones 141–150)
*Phase Objective: Order state machines, seller fulfillment, tracking, returns, RMA, and refunds.*

- **141**: Create parent customer orders and seller fulfillment orders
- **142**: Implement explicit order and fulfillment state machines
- **143**: Build seller accept, reject, pack, and handover workflows
- **144**: Implement shipments, tracking numbers, and delivery events
- **145**: Generate invoices, credit notes, and packing slips asynchronously
- **146**: Implement item- and order-level cancellation policies
- **147**: Build return requests, RMA authorization, and return shipping
- **148**: Build return inspection, disposition, and inventory decisions
- **149**: Orchestrate full and partial refunds
- **150**: Build disputes, support linkage, and order reporting

### Phase 16: Payments and Seller Finance (Milestones 151–160)
*Phase Objective: Bangladesh gateways (bKash/Nagad/Upay), COD, webhooks, and seller settlement.*

- **151**: Define the payment-provider interface and capability matrix
- **152**: Implement the Cash on Delivery provider
- **153**: Create Bangladesh payment adapters for approved local gateways
- **154**: Create optional Stripe and Razorpay adapters
- **155**: Implement payment intents, attempts, and idempotency
- **156**: Implement signed webhooks and replay protection
- **157**: Implement capture, failure recovery, and gateway reconciliation
- **158**: Implement full, partial, and multi-item refunds
- **159**: Build seller settlements, reserves, holds, and payouts
- **160**: Complete financial reconciliation and payment integration tests

### Phase 17: Wallet Ledger (Milestones 161–170)
*Phase Objective: Double-entry immutable financial ledger, typed wallet accounts, and transfers.*

- **161**: Design the immutable double-entry wallet ledger
- **162**: Create wallet accounts and typed wallet purposes
- **163**: Implement balanced transactions and immutable postings
- **164**: Implement balance projections, holds, and available-balance rules
- **165**: Implement Customer wallet permissions and transfer restrictions
- **166**: Implement Seller wallet permissions and settlement restrictions
- **167**: Build deposit and withdrawal request workflows
- **168**: Implement versioned wallet-split templates totaling 100 percent
- **169**: Implement controlled Admin adjustments with maker-checker approval
- **170**: Complete wallet reconciliation, invariants, and audit tests

### Phase 18: Product Points Engine (Milestones 171–180)
*Phase Objective: Mandatory seller-defined points, order snapshotting, and point event ledger.*

- **171**: Define Product Point terminology, units, and invariants
- **172**: Enforce mandatory seller-defined Product Points on sellable products
- **173**: Snapshot Product Points on every order item
- **174**: Generate Points only at the configured eligible order status
- **175**: Reverse Points safely for cancellation, return, and quantity changes
- **176**: Implement an idempotent Point event ledger
- **177**: Version Point and reward rules without rewriting history
- **178**: Build order-to-Point traceability and reporting
- **179**: Test the BDT 10,000 price and 1,000 Product Point scenario
- **180**: Build Point reconciliation, replay, and integrity diagnostics

### Phase 19: Customer Rewards and Ranks (Milestones 181–190)
*Phase Objective: Customer cashback, referrals, 50-20-15-5-10 split, Star clubs, and rank bonuses.*

- **181**: Implement configurable Customer cashback with a 10 percent reference rate
- **182**: Implement referrals and the configurable 5 percent reference bonus
- **183**: Implement the Customer 50-20-15-5-10 reward split
- **184**: Configure Customer Club periods, tiers, and reference thresholds
- **185**: Implement equal-share Customer Club settlement
- **186**: Implement Customer Daily, Weekly, Monthly, and Yearly Star leaderboards
- **187**: Implement the configurable 3 percent Customer Rank Bonus
- **188**: Model legacy Customer career ranks and non-cash incentives separately
- **189**: Implement Advanced Shopping Wallet behind an approved-rule gate
- **190**: Build Customer reward dashboards, statements, reversals, and tests

### Phase 20: Seller Rewards, Levels, and Leaderboards (Milestones 191–200)
*Phase Objective: Seller sales/point ledgers, Seller Clubs, 70-15-5-10 split, and seller badges.*

- **191**: Implement Seller Total Sales and Total Point ledgers
- **192**: Configure Seller Club periods, tiers, and reference thresholds
- **193**: Implement equal-share Seller Club settlement
- **194**: Implement Seller Daily, Weekly, Monthly, and Yearly Star leaderboards
- **195**: Implement Seller Star reward-pool settlement
- **196**: Implement configurable Seller Rank Bonus and rank qualification
- **197**: Implement the Seller 70-15-5-10 reward split
- **198**: Build Seller levels, badges, leaderboards, and progress UX
- **199**: Integrate Seller reward settlement, payout, hold, and reversal lifecycle
- **200**: Build Seller reward reports, reconciliation, and acceptance tests

### Phase 21: Regional Distribution and Commissions (Milestones 201–210)
*Phase Objective: Bangladesh geographic hierarchy, division/district/upazila commissions, and charity ledger.*

- **201**: Define the eligible profit and reward-pool configuration contract
- **202**: Implement period schedules, cutoffs, closing, and late-event handling
- **203**: Implement versioned settlements, reruns, locks, and correction runs
- **204**: Import and maintain Bangladesh geographic hierarchy
- **205**: Map merchants, customers, partners, and service points to beneficiaries
- **206**: Implement Alif Point Division, District, and Upazila commission rules
- **207**: Implement Alif Pay regional and Service Point commission rules
- **208**: Implement commission rounding, caps, reversals, and ledger posting
- **209**: Implement Charity Fund and Service Charge ledgers
- **210**: Build the Distribution Admin dashboard and end-to-end reconciliation

### Phase 22: Lottery, Ads, Packages, and Affiliate Programs (Milestones 211–220)
*Phase Objective: Good-Luck lottery behind legal gate, ad campaigns, packages, and affiliate commissions.*

- **211**: Design the Good-Luck lottery with a legal feature gate
- **212**: Build lottery campaigns, ticket sales, and Good-Luck Wallet debits
- **213**: Implement auditable secure draws and winner publication
- **214**: Implement prize fulfillment and completed-lottery history
- **215**: Implement package-value coupons and the weekly draw variant
- **216**: Build the Alifworld.click advertisement library and campaign management
- **217**: Implement verified ad-view completion and anti-fraud controls
- **218**: Implement configurable subscription packages, caps, and validity
- **219**: Implement affiliate and package-referral commission levels
- **220**: Model marketing ranks and cash rewards behind compliance controls

### Phase 23: Rider and Delivery (Milestones 221–230)
*Phase Objective: Rider onboarding, task dispatch, OTP proof-of-delivery, and rider earnings.*

- **221**: Build Rider application, KYC, and approval
- **222**: Implement Rider authentication, profile, and availability status
- **223**: Model delivery jobs and assignment strategies
- **224**: Build available-delivery discovery and atomic acceptance
- **225**: Implement pickup confirmation and proof of pickup
- **226**: Implement rate-controlled GPS updates through Redis
- **227**: Implement customer OTP and proof-of-delivery completion
- **228**: Implement delivery failure, cancellation, return, and cash collection
- **229**: Build Rider earnings, history, and reconciliation
- **230**: Complete Rider Flutter APIs, notifications, and end-to-end tests

### Phase 24: Admin, CMS, Support, and Analytics (Milestones 231–240)
*Phase Objective: High-contrast professional admin shell, moderation, CMS, tickets, and KPI analytics.*

- **231**: Build the professional Admin shell and dashboard navigation
- **232**: Build reusable tables, filters, sorting, bulk actions, and exports
- **233**: Build user, seller, KYC, and moderation consoles
- **234**: Build catalog, order, inventory, and delivery consoles
- **235**: Build payment, wallet, rewards, commission, and payout consoles
- **236**: Build CMS pages, banners, navigation, and homepage management
- **237**: Build support tickets, disputes, notes, and service-level tracking
- **238**: Build scheduled and on-demand reports and safe exports
- **239**: Implement analytics events, KPIs, funnels, and role-aware dashboards
- **240**: Build settings, feature flags, maintenance mode, and configuration history

### Phase 25: Notifications, Jobs, and Realtime Events (Milestones 241–250)
*Phase Objective: BullMQ queue architecture, multi-channel notifications (Email, SMS, Push), and outbox.*

- **241**: Define notification events, templates, preferences, and localization
- **242**: Implement queued transactional email delivery
- **243**: Implement SMS and OTP provider abstraction
- **244**: Implement Firebase-compatible push notifications
- **245**: Implement a consent-aware WhatsApp provider abstraction
- **246**: Build in-app notification inbox, read state, and pagination
- **247**: Build BullMQ queue topology and separately scalable workers
- **248**: Implement recurring jobs and platform-timezone schedules
- **249**: Implement retries, deduplication, dead-letter handling, and job observability
- **250**: Implement transactional outbox, realtime events, and outbound webhooks

### Phase 26: REST API, OpenAPI, and Flutter Contracts (Milestones 251–260)
*Phase Objective: Standardized v1 API pipeline, Zod schemas, OpenAPI specs, and Flutter contracts.*

- **251**: Standardize API envelopes, errors, request IDs, and status codes
- **252**: Build the reusable v1 Route Handler execution pipeline
- **253**: Create shared Zod validation and serialization schemas
- **254**: Implement stable filtering, sorting, cursor, and page pagination contracts
- **255**: Complete Auth, Customer, Catalog, Cart, Checkout, and Order APIs
- **256**: Complete Seller and Admin APIs with tenant-safe authorization
- **257**: Complete Rider and Delivery APIs for Flutter consumption
- **258**: Generate OpenAPI from implementation-owned schemas and metadata
- **259**: Publish Swagger UI, examples, authentication flows, and error catalogs
- **260**: Generate typed clients and enforce Flutter-compatible API evolution

### Phase 27: Caching, Performance, Scale, and Resilience (Milestones 261–270)
*Phase Objective: Redis caching, rate limits, distributed locks, database query tuning, and DR.*

- **261**: Build the Redis connection, namespace, and cache abstraction
- **262**: Define cache keys, TTLs, tags, invalidation, and stampede protection
- **263**: Implement surface-specific distributed API rate limits
- **264**: Implement distributed locks and idempotency-key storage
- **265**: Tune PostgreSQL indexes, queries, pagination, and query budgets
- **266**: Implement connection pooling, health, readiness, and dependency checks
- **267**: Prove stateless horizontal scaling behind a load balancer
- **268**: Implement graceful degradation for search, storage, Redis, and queues
- **269**: Execute performance, soak, and capacity tests
- **270**: Implement backup, restore, retention, and disaster-recovery architecture

### Phase 28: Testing, Security, Compliance, and Quality (Milestones 271–280)
*Phase Objective: Unit/integration/E2E test suites, security auditing, privacy compliance, and UAT.*

- **271**: Build deterministic test factories, fixtures, clocks, and provider fakes
- **272**: Complete unit tests for pricing, Points, rewards, commissions, and inventory
- **273**: Complete integration tests for authentication and catalog
- **274**: Complete integration tests for cart, checkout, orders, and payments
- **275**: Complete integration tests for wallets, settlements, and commissions
- **276**: Complete Customer, Seller, Admin, and Rider end-to-end journeys
- **277**: Perform threat modeling, dependency scanning, and security testing
- **278**: Implement privacy, consent, retention, export, and deletion workflows
- **279**: Complete accessibility, localization, browser, and device QA
- **280**: Run UAT against the approved business configuration matrix

### Phase 29: DevOps, Deployment, and Observability (Milestones 281–290)
*Phase Objective: Production Docker containerization, CI/CD pipelines, structured logs, and monitoring.*

- **281**: Build the production multi-stage Docker image
- **282**: Build Docker Compose and external-infrastructure profiles
- **283**: Finalize environment files and the exact Bun command contract
- **284**: Build CI pipelines for validation, build, test, scan, and artifacts
- **285**: Automate safe migrations, seeds, and deployment ordering
- **286**: Define preview, staging, and production topology
- **287**: Implement structured logs and request correlation
- **288**: Implement metrics, tracing, error monitoring, and dashboards
- **289**: Define alerts, operational runbooks, and incident response
- **290**: Implement release, canary, rollback, and versioning procedures

### Phase 30: Launch, Handover, and Continuous Improvement (Milestones 291–300)
*Phase Objective: Initial data seeds, operational playbooks, soft launch in Bangladesh, and handover.*

- **291**: Seed initial roles, permissions, and the forced-change Admin account
- **292**: Seed the reference reward configuration without hard-coding behavior
- **293**: Seed Bangladesh geography and localized baseline content
- **294**: Plan and execute production data migration and verification
- **295**: Pass full regression, load, security, and financial-integrity gates
- **296**: Rehearse disaster recovery and dependency outage procedures
- **297**: Execute the Bangladesh soft launch and controlled feature rollout
- **298**: Deliver operational training and role-specific handbooks
- **299**: Finalize architecture, API, database, deployment, and scaling documentation
- **300**: Complete final acceptance, handover, warranty baseline, and post-launch backlog
