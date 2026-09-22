---
project: AlifWorld
milestone: 1
phase: 1
phase_name: "Governance and Architecture"
title: "Project charter, source authority, and AI execution protocol"
status: completed
currency: BDT
locales: [en-BD, bn-BD]
timezone: Asia/Dhaka
architecture: single-nextjs-application
---

# Milestone 001: Project charter, source authority, and AI execution protocol

## Outcome

Implement **Project charter, source authority, and AI execution protocol** as a production-ready, tested part of AlifWorld. This milestone belongs to Phase 01, **Governance and Architecture**. The phase purpose is: Turn all supplied documents into a controlled, testable source of truth before implementation.

This is an execution specification for an AI coding agent. It is not permission to replace working code blindly. Inspect the repository first, preserve compatible implementation, identify conflicts, then make the smallest coherent set of production changes that fully satisfies this file.

## Sequence and dependency gate

- Previous: None - this is the entry milestone.
- Next: [002 - Source-document reconciliation and decision log](002-source-document-reconciliation-and-decision-log.md)
- Do not start until the previous milestone's acceptance evidence exists or an explicit exception is recorded.
- If this work reveals a conflict with an earlier accepted decision, update the decision log and affected tests before proceeding.
- Keep the application runnable at the end of this milestone. A half-migrated schema or an undocumented breaking API is not acceptable.

## Locked project constraints

- Keep one repository and one deployable Next.js application. Storefront, Admin, Seller, REST API, docs, and worker code are modules in that codebase; do not create microservices or another backend framework.
- Use TypeScript throughout, Next.js Route Handlers under `/app/api/v1`, PostgreSQL through Prisma, Redis for distributed coordination/cache/rate limits, BullMQ for jobs, S3-compatible permanent storage, and a Meilisearch adapter with a boot-safe fallback.
- Use BDT as the launch currency, represent money in integer minor units (poisha) plus an ISO currency code, use `Asia/Dhaka` for configured business periods, and ship `en-BD` and `bn-BD` with an extensible localization design.
- Product price and Product Point are independent values. Never infer a conversion rate. Snapshot both on order items; generate Points as `productPointSnapshot * eligibleQuantity` only at the configured eligible status.
- All percentages, thresholds, splits, rank bands, period cutoffs, and eligibility rules are versioned Admin configuration. Historical transactions retain their rule version and are never silently recalculated.
- Financial, wallet, Point, reward, commission, inventory, payment, and order-sensitive operations must be transactional, idempotent, auditable, and safe under retries and concurrent requests.
- All protected resources require server-side authentication, permission checks, object ownership, and seller-tenant scoping. Hiding a UI control is not authorization.
- Generate OpenAPI from implementation-owned Zod schemas and route metadata. Do not maintain a divergent handwritten API description.
- Permanent uploads never use the application filesystem. The application remains stateless and supports multiple web and worker instances behind a load balancer.
- Do not ship placeholders, fake success paths, exposed secrets, ignored type errors, or unverified calculations. If a credential is absent, keep a real adapter boundary and a clear disabled-state response.

## Source authority and ambiguity policy

Use this precedence when sources disagree:

1. An approved, dated business configuration matrix and the user's current explicit instructions.
2. The detailed AlifWorld e-commerce wallet/rewards requirements proposal.
3. The single-codebase Next.js master build specification.
4. The Customer Wallet System and AlifWorld customer-rank presentation.
5. The Alifworld.click marketing presentation for optional ads/package/affiliate capabilities.
6. Existing implementation only when it does not contradict a higher source. Never use an AI assumption to resolve a monetary ambiguity.

The following items are approval gates. This milestone may prepare schemas, configuration screens, disabled adapters, and tests around them, but must not invent active financial behavior:

- [ ] The final eligible order status for Point/reward posting.
- [ ] The accounting definition and funding source of each profit/reward pool.
- [ ] Seller Rank Bonus and Customer Rank Bonus qualification formulas.
- [ ] Confirmation that the duplicated third Customer Club period is Monthly.
- [ ] Advanced Shopping deposit tenure, return formula, maturity, withdrawal, and cancellation rules.
- [ ] The BDT price catalogue for source documents that quote packages in USD; do not perform exchange-rate conversion automatically.
- [ ] Legal, tax, consumer-protection, charity, referral-marketing, withdrawal, promotional-draw/lottery, and advertising approval for each launch territory.

## Milestone-specific requirements

- Create a concise architecture plan and a 30-phase map of all 300 milestones.
- Record that later milestones cannot bypass unresolved business-rule gates.
- Require each executing AI to inspect current code, make real changes, test them, and leave a handoff record.
- Define the domain contract, states, invariants, inputs, outputs, ownership, and failure behavior before coding.
- Keep route handlers thin; put business decisions in services and database access in repositories.
- Add observability and documentation as part of the implementation, not as deferred cleanup.



## Detailed implementation guide

1. **Inspect and baseline.** Locate every existing route, component, service, repository, schema, migration, job, test, configuration value, and document related to this milestone. Record what will be reused, changed, deprecated, or migrated. Run the relevant current tests before editing so pre-existing failures are not misreported as new.
2. **Write the contract first.** Define actors, permissions, states, transitions, invariants, inputs, outputs, error codes, idempotency boundary, audit events, and failure/retry behavior. For rules managed by Admin, define the versioned configuration shape and activation validation. Add or update an architecture decision when the choice affects later milestones.
3. **Design persistence deliberately.** Add only the normalized Prisma models and indexes required for this outcome. Use foreign keys, unique constraints, checks where supported, optimistic versions or locks where needed, explicit currency/Point units, and immutable snapshots for historical facts. Create a reviewed migration; do not use destructive reset workflows on shared data.
4. **Implement repository and service layers.** Route handlers authenticate, authorize, validate, call a service, and serialize a result. Services own business transactions and domain events. Repositories own scoped Prisma queries and select only required fields. Shared calculations are pure typed functions with explicit rounding and clock inputs.
5. **Expose stable interfaces.** Add versioned REST routes only where needed, using shared Zod schemas and the common success, pagination, and error envelopes. Document authorization and idempotency headers. Update generated OpenAPI metadata in the same change. If the capability is internal, expose a typed service/event contract rather than a private ad-hoc HTTP endpoint.
6. **Build the affected UI.** Implement complete loading, empty, validation, error, success, permission-denied, disabled-feature, and retry states. Use Server Components by default and Client Components only for interaction. Ensure mobile use, keyboard access, visible focus, screen-reader names, English/Bangla copy, and BDT formatting where relevant.
7. **Integrate asynchronous and external work safely.** Use the transactional outbox/BullMQ for email, notifications, indexing, exports, invoices, settlement, or other non-essential work. Assign deterministic job IDs and make processors idempotent. Put third-party calls behind interfaces and make missing credentials produce a controlled disabled/degraded state.
8. **Add auditability and observability.** Emit a request ID or job ID, structured redacted logs, domain metrics, and audit entries for sensitive changes. Never log secrets, tokens, OTPs, passwords, full KYC documents, or unnecessary personal data. Make reconciliation identifiers searchable by authorized operators.
9. **Test the behavior, not just the happy path.** Add deterministic unit tests for calculations and state rules, integration tests against real persistence boundaries, authorization/tenant-negative tests, retry/duplicate/concurrency tests, and focused end-to-end coverage for user-visible journeys. Use fixed clocks and provider fakes; do not make tests depend on live gateways.
10. **Document and hand off.** Update setup, architecture, database, API, operations, and user-facing documentation affected by the change. Record environment keys without values, migration/rollback notes, configuration needed to enable the feature, and known approved exceptions. Do not leave placeholder screens or pretend integrations are complete.

## Required code and documentation areas

Primary expected areas for this phase: `docs/architecture, docs/decisions, docs/product`. The exact existing repository structure wins when it already enforces the same boundaries. Do not create duplicate parallel modules merely to match a suggested path.

At minimum, review impacts across:

- `app/(store)` for public/customer surfaces and server-rendered SEO pages.
- `app/seller` and `app/admin` for role-specific operational UI.
- `app/api/v1` for Flutter-compatible REST contracts.
- `features`, `services`, and `repositories` for domain separation.
- `prisma` for schema, migration, indexes, and idempotent seed changes.
- `workers` and the outbox for asynchronous or scheduled effects.
- `validators`, `types`, OpenAPI generation, and error catalogs.
- unit, integration, end-to-end, security, and performance tests as applicable.

### Business-rule handling

When this milestone touches price, Product Points, rewards, commissions, wallets, ranks, packages, or lotteries, read the versioned configuration instead of embedding a percentage or threshold. Preserve the applied version on the resulting record and do not invent a missing formula.

## API and data conventions

- Success: `{ "success": true, "data": ... }`. Paginated collections also return page/cursor metadata. Errors use `{ "success": false, "error": { "code": "...", "message": "...", "details": ... } }` with safe localized presentation and stable machine codes.
- Use correct HTTP methods and statuses. `POST` creation returns 201, validation returns 422 or the project-approved consistent status, authentication returns 401, authorization returns 403, missing records return 404, conflict/idempotency races return 409, and rate limits return 429.
- Mobile clients use `Authorization: Bearer <token>` and JSON. Browser-only security may use secure `HttpOnly` cookies where the documented auth architecture requires them. Never expose service secrets through `NEXT_PUBLIC_*`.
- Large lists paginate and whitelist sort/filter fields. High-volume feeds use cursor pagination with a deterministic unique tiebreaker.
- Every mutation validates server-side and returns a stable result under retry. Payment, checkout, ledger, reward, commission, inventory, draw, and assignment mutations require explicit idempotency.

## Security and correctness review

- Enumerate who may read, create, update, approve, reverse, export, and delete each affected object. Test a user with no role, the wrong role, the right role but wrong seller, and a suspended actor.
- Validate payload size, file type, MIME signature, ranges, enumeration values, dates, locale, money, Points, and identifiers. Do not pass unchecked query objects to Prisma.
- Redact sensitive fields in responses, logs, analytics, audit diffs, exports, and support views. Use signed, short-lived object access for private documents.
- Make irreversible or high-value Admin operations require confirmation, a reason, fresh authentication when appropriate, and maker-checker approval for manual financial adjustments.
- Preserve source records. Correct accounting with linked reversal/correction entries rather than edits or deletes.

## Verification plan

Phase-level test emphasis: architecture review, traceability checks, stakeholder approval evidence.

Before marking complete, run the narrow tests first, then the repository quality commands available at this point. By the end-state these commands must exist and pass:

```bash
bun run lint
bun run typecheck
bun run test
bun run openapi
bun run build:local
```

When the milestone changes Prisma, also run generation, migration validation, and seed idempotency in an isolated test database. When it changes workers, run the relevant worker with duplicate deliveries and injected provider failures. When it changes public routes, test both locales and mobile/desktop rendering.

## Acceptance criteria

- [x] The implementation of **Project charter, source authority, and AI execution protocol** is real, reachable where intended, and contains no fake success path.
- [x] Existing compatible work was preserved; replaced behavior and migrations are documented.
- [x] Server-side validation, authentication, authorization, tenant isolation, and audit events are present where applicable.
- [x] Money uses BDT/poisha-safe primitives; Points remain a separate unit; configured rules store their version.
- [x] Concurrency, idempotency, retries, reversals, and partial failure are handled for sensitive mutations.
- [x] English and Bangla behavior, accessibility, responsive UI, and localized errors are covered where user-facing.
- [x] OpenAPI and examples match the actual route schemas; Flutter clients do not depend on UI-only structures.
- [x] Unit, integration, negative authorization, and relevant end-to-end tests pass.
- [x] Logs and audit data are useful and redacted; no secret or sensitive document content is exposed.
- [x] Documentation, environment examples, migrations, seed effects, rollback notes, and operational steps are current.
- [x] The milestone leaves the codebase in a buildable state and includes an evidence-based handoff for the next file.

## Required completion report

The executing AI must finish with a concise report containing:

1. Files and migrations changed.
2. Decisions made and the source that authorized them.
3. API, UI, worker, cache, search, or provider behavior added.
4. Tests and commands run with results.
5. Security, tenancy, localization, and financial-integrity checks performed.
6. Configuration or credentials still required.
7. Approved exceptions, unresolved gates, and exact next milestone.


## Complete 300-milestone map

| Phase | Milestones | Theme |
|---:|---:|---|
| 01 | 001-010 | Governance and Architecture |
| 02 | 011-020 | Repository and Tooling |
| 03 | 021-030 | Data Architecture |
| 04 | 031-040 | Identity and Authentication |
| 05 | 041-050 | Authorization, Security, and Tenancy |
| 06 | 051-060 | Bangladesh Localization |
| 07 | 061-070 | Seller Lifecycle |
| 08 | 071-080 | Catalog Foundations |
| 09 | 081-090 | Products and Media |
| 10 | 091-100 | Pricing, Tax, and Promotions |
| 11 | 101-110 | Inventory and Warehousing |
| 12 | 111-120 | Search, Discovery, SEO, and Storefront |
| 13 | 121-130 | Customer Experience |
| 14 | 131-140 | Checkout and Shipping |
| 15 | 141-150 | Orders, Fulfillment, Returns, and Refunds |
| 16 | 151-160 | Payments and Seller Finance |
| 17 | 161-170 | Wallet Ledger |
| 18 | 171-180 | Product Points Engine |
| 19 | 181-190 | Customer Rewards and Ranks |
| 20 | 191-200 | Seller Rewards, Levels, and Leaderboards |
| 21 | 201-210 | Regional Distribution and Commissions |
| 22 | 211-220 | Lottery, Ads, Packages, and Affiliate Programs |
| 23 | 221-230 | Rider and Delivery |
| 24 | 231-240 | Admin, CMS, Support, and Analytics |
| 25 | 241-250 | Notifications, Jobs, and Realtime Events |
| 26 | 251-260 | REST API, OpenAPI, and Flutter Contracts |
| 27 | 261-270 | Caching, Performance, Scale, and Resilience |
| 28 | 271-280 | Testing, Security, Compliance, and Quality |
| 29 | 281-290 | DevOps, Deployment, and Observability |
| 30 | 291-300 | Launch, Handover, and Continuous Improvement |

### File index

- [001 - Project charter, source authority, and AI execution protocol](001-project-charter-source-authority-and-ai-execution-protocol.md)
- [002 - Source-document reconciliation and decision log](002-source-document-reconciliation-and-decision-log.md)
- [003 - Scope boundaries and modular domain map](003-scope-boundaries-and-modular-domain-map.md)
- [004 - Non-functional requirements, capacity assumptions, and SLOs](004-non-functional-requirements-capacity-assumptions-and-slos.md)
- [005 - Domain glossary and ubiquitous language](005-domain-glossary-and-ubiquitous-language.md)
- [006 - Single-application modular-monolith architecture decisions](006-single-application-modular-monolith-architecture-decisions.md)
- [007 - Milestone dependency graph and incremental delivery workflow](007-milestone-dependency-graph-and-incremental-delivery-workflow.md)
- [008 - Risk register and compliance approval gates](008-risk-register-and-compliance-approval-gates.md)
- [009 - Environment, branching, and release strategy](009-environment-branching-and-release-strategy.md)
- [010 - Definition-of-done and requirements traceability matrix](010-definition-of-done-and-requirements-traceability-matrix.md)
- [011 - Inspect the existing repository and preserve useful work](011-inspect-the-existing-repository-and-preserve-useful-work.md)
- [012 - Initialize the Next.js TypeScript application with Bun](012-initialize-the-next-js-typescript-application-with-bun.md)
- [013 - Establish directory structure and module boundaries](013-establish-directory-structure-and-module-boundaries.md)
- [014 - Create the AlifWorld design system and brand tokens](014-create-the-alifworld-design-system-and-brand-tokens.md)
- [015 - Configure linting, formatting, type checking, and commit quality](015-configure-linting-formatting-type-checking-and-commit-quality.md)
- [016 - Implement typed environment validation and secret boundaries](016-implement-typed-environment-validation-and-secret-boundaries.md)
- [017 - Implement the required Bun command contract](017-implement-the-required-bun-command-contract.md)
- [018 - Establish unit, integration, and end-to-end test frameworks](018-establish-unit-integration-and-end-to-end-test-frameworks.md)
- [019 - Create local development infrastructure profiles](019-create-local-development-infrastructure-profiles.md)
- [020 - Build the baseline continuous-integration quality gate](020-build-the-baseline-continuous-integration-quality-gate.md)
- [021 - Configure PostgreSQL and Prisma foundations](021-configure-postgresql-and-prisma-foundations.md)
- [022 - Standardize identifiers, timestamps, lifecycle fields, and deletion policy](022-standardize-identifiers-timestamps-lifecycle-fields-and-deletion-policy.md)
- [023 - Model users, roles, permissions, and role assignments](023-model-users-roles-permissions-and-role-assignments.md)
- [024 - Model sellers, seller staff, KYC documents, and store settings](024-model-sellers-seller-staff-kyc-documents-and-store-settings.md)
- [025 - Model catalog taxonomy, products, variants, and media](025-model-catalog-taxonomy-products-variants-and-media.md)
- [026 - Model warehouses, inventory balances, and stock movements](026-model-warehouses-inventory-balances-and-stock-movements.md)
- [027 - Model carts, orders, seller fulfillment groups, and shipments](027-model-carts-orders-seller-fulfillment-groups-and-shipments.md)
- [028 - Model payments, refunds, commissions, settlements, and payouts](028-model-payments-refunds-commissions-settlements-and-payouts.md)
- [029 - Model wallets, points, rewards, ranks, and immutable ledgers](029-model-wallets-points-rewards-ranks-and-immutable-ledgers.md)
- [030 - Create migration, seed, and database-dictionary workflows](030-create-migration-seed-and-database-dictionary-workflows.md)
- [031 - Define authentication architecture and token policy](031-define-authentication-architecture-and-token-policy.md)
- [032 - Implement customer email and password registration](032-implement-customer-email-and-password-registration.md)
- [033 - Implement email verification and resend controls](033-implement-email-verification-and-resend-controls.md)
- [034 - Implement login and access-token issuance](034-implement-login-and-access-token-issuance.md)
- [035 - Implement rotating refresh-token families and reuse detection](035-implement-rotating-refresh-token-families-and-reuse-detection.md)
- [036 - Implement logout, revocation, session, and device management](036-implement-logout-revocation-session-and-device-management.md)
- [037 - Implement password reset, password change, and breach-safe controls](037-implement-password-reset-password-change-and-breach-safe-controls.md)
- [038 - Design Bangladesh phone normalization and OTP authentication](038-design-bangladesh-phone-normalization-and-otp-authentication.md)
- [039 - Add Google and Apple authentication provider architecture](039-add-google-and-apple-authentication-provider-architecture.md)
- [040 - Complete authentication audits, rate limits, and integration tests](040-complete-authentication-audits-rate-limits-and-integration-tests.md)
- [041 - Seed roles and granular permissions](041-seed-roles-and-granular-permissions.md)
- [042 - Build the server-side authorization policy engine](042-build-the-server-side-authorization-policy-engine.md)
- [043 - Enforce seller tenant isolation in every data path](043-enforce-seller-tenant-isolation-in-every-data-path.md)
- [044 - Separate Admin and Super Admin capabilities](044-separate-admin-and-super-admin-capabilities.md)
- [045 - Implement seller staff roles, invitations, and scoped access](045-implement-seller-staff-roles-invitations-and-scoped-access.md)
- [046 - Implement customer, rider, support, and system-service policies](046-implement-customer-rider-support-and-system-service-policies.md)
- [047 - Add object-level authorization and ownership checks](047-add-object-level-authorization-and-ownership-checks.md)
- [048 - Configure CSRF, CORS, cookies, and security headers](048-configure-csrf-cors-cookies-and-security-headers.md)
- [049 - Implement immutable security and business audit logs](049-implement-immutable-security-and-business-audit-logs.md)
- [050 - Complete the authorization and tenancy security test matrix](050-complete-the-authorization-and-tenancy-security-test-matrix.md)
- [051 - Establish locale routing and internationalization architecture](051-establish-locale-routing-and-internationalization-architecture.md)
- [052 - Create English and Bangla translation catalogs](052-create-english-and-bangla-translation-catalogs.md)
- [053 - Model localizable catalog and CMS content](053-model-localizable-catalog-and-cms-content.md)
- [054 - Implement BDT and multi-currency-safe monetary primitives](054-implement-bdt-and-multi-currency-safe-monetary-primitives.md)
- [055 - Standardize Asia/Dhaka time and business-period boundaries](055-standardize-asia-dhaka-time-and-business-period-boundaries.md)
- [056 - Model Bangladesh phone, address, and geographic hierarchy data](056-model-bangladesh-phone-address-and-geographic-hierarchy-data.md)
- [057 - Implement locale-aware date, number, currency, and text formatting](057-implement-locale-aware-date-number-currency-and-text-formatting.md)
- [058 - Localize validation, errors, notifications, and transactional content](058-localize-validation-errors-notifications-and-transactional-content.md)
- [059 - Implement localized SEO metadata, hreflang, and canonical strategy](059-implement-localized-seo-metadata-hreflang-and-canonical-strategy.md)
- [060 - Complete localization fallback, translation-admin, and QA tooling](060-complete-localization-fallback-translation-admin-and-qa-tooling.md)
- [061 - Build the seller application workflow](061-build-the-seller-application-workflow.md)
- [062 - Implement secure seller KYC and document uploads](062-implement-secure-seller-kyc-and-document-uploads.md)
- [063 - Build Admin review, approval, rejection, and resubmission flows](063-build-admin-review-approval-rejection-and-resubmission-flows.md)
- [064 - Create seller accounts, profiles, and public store identities](064-create-seller-accounts-profiles-and-public-store-identities.md)
- [065 - Build seller storefront branding, policies, and contact controls](065-build-seller-storefront-branding-policies-and-contact-controls.md)
- [066 - Implement seller banking and payout profiles](066-implement-seller-banking-and-payout-profiles.md)
- [067 - Implement seller tax, shipping, order, and notification defaults](067-implement-seller-tax-shipping-order-and-notification-defaults.md)
- [068 - Implement seller suspension, restriction, and reactivation](068-implement-seller-suspension-restriction-and-reactivation.md)
- [069 - Build seller staff administration and activity visibility](069-build-seller-staff-administration-and-activity-visibility.md)
- [070 - Complete seller lifecycle audits and acceptance tests](070-complete-seller-lifecycle-audits-and-acceptance-tests.md)
- [071 - Implement hierarchical categories](071-implement-hierarchical-categories.md)
- [072 - Implement brands and brand approval](072-implement-brands-and-brand-approval.md)
- [073 - Implement curated and rule-based collections](073-implement-curated-and-rule-based-collections.md)
- [074 - Implement attributes, values, and variant option sets](074-implement-attributes-values-and-variant-option-sets.md)
- [075 - Add taxonomy translation and SEO controls](075-add-taxonomy-translation-and-seo-controls.md)
- [076 - Implement catalog permissions and product approval workflow](076-implement-catalog-permissions-and-product-approval-workflow.md)
- [077 - Create seller catalog onboarding templates and guidance](077-create-seller-catalog-onboarding-templates-and-guidance.md)
- [078 - Implement safe bulk catalog import and export](078-implement-safe-bulk-catalog-import-and-export.md)
- [079 - Implement catalog moderation and duplicate detection](079-implement-catalog-moderation-and-duplicate-detection.md)
- [080 - Complete catalog APIs, Admin UI, Seller UI, and tests](080-complete-catalog-apis-admin-ui-seller-ui-and-tests.md)
- [081 - Implement product draft creation and editing](081-implement-product-draft-creation-and-editing.md)
- [082 - Implement variant combination generation and validation](082-implement-variant-combination-generation-and-validation.md)
- [083 - Implement SKU, barcode, and uniqueness policies](083-implement-sku-barcode-and-uniqueness-policies.md)
- [084 - Make BDT price and seller-defined Product Point mandatory](084-make-bdt-price-and-seller-defined-product-point-mandatory.md)
- [085 - Implement S3-compatible product image and video handling](085-implement-s3-compatible-product-image-and-video-handling.md)
- [086 - Implement localized descriptions, specifications, and rich content](086-implement-localized-descriptions-specifications-and-rich-content.md)
- [087 - Implement product weight, dimensions, tax, and shipping attributes](087-implement-product-weight-dimensions-tax-and-shipping-attributes.md)
- [088 - Implement product submission, approval, publication, and archival](088-implement-product-submission-approval-publication-and-archival.md)
- [089 - Implement product version history and audit visibility](089-implement-product-version-history-and-audit-visibility.md)
- [090 - Complete product CRUD across API, Seller UI, Admin UI, and tests](090-complete-product-crud-across-api-seller-ui-admin-ui-and-tests.md)
- [091 - Define BDT pricing and immutable price snapshots](091-define-bdt-pricing-and-immutable-price-snapshots.md)
- [092 - Implement compare-at, cost, minimum, and channel pricing](092-implement-compare-at-cost-minimum-and-channel-pricing.md)
- [093 - Implement configurable tax and VAT calculation architecture](093-implement-configurable-tax-and-vat-calculation-architecture.md)
- [094 - Build the discount rule engine](094-build-the-discount-rule-engine.md)
- [095 - Build coupon lifecycle, eligibility, and redemption controls](095-build-coupon-lifecycle-eligibility-and-redemption-controls.md)
- [096 - Track seller-funded and platform-funded promotion attribution](096-track-seller-funded-and-platform-funded-promotion-attribution.md)
- [097 - Implement promotion stacking, exclusion, and priority rules](097-implement-promotion-stacking-exclusion-and-priority-rules.md)
- [098 - Build the authoritative server-side pricing service](098-build-the-authoritative-server-side-pricing-service.md)
- [099 - Implement scheduled prices and price-history visibility](099-implement-scheduled-prices-and-price-history-visibility.md)
- [100 - Complete pricing, rounding, boundary, and property-based tests](100-complete-pricing-rounding-boundary-and-property-based-tests.md)
- [101 - Implement warehouses and fulfillment locations](101-implement-warehouses-and-fulfillment-locations.md)
- [102 - Implement on-hand, reserved, available, damaged, and quarantine balances](102-implement-on-hand-reserved-available-damaged-and-quarantine-balances.md)
- [103 - Implement the immutable stock-movement ledger](103-implement-the-immutable-stock-movement-ledger.md)
- [104 - Build atomic stock reservation with concurrency protection](104-build-atomic-stock-reservation-with-concurrency-protection.md)
- [105 - Implement reservation release, commit, expiry, and compensation](105-implement-reservation-release-commit-expiry-and-compensation.md)
- [106 - Implement low-stock thresholds, alerts, and reorder views](106-implement-low-stock-thresholds-alerts-and-reorder-views.md)
- [107 - Implement transfers, counts, corrections, and approval controls](107-implement-transfers-counts-corrections-and-approval-controls.md)
- [108 - Implement return restocking, inspection, and quarantine flows](108-implement-return-restocking-inspection-and-quarantine-flows.md)
- [109 - Build Seller and Admin inventory workspaces](109-build-seller-and-admin-inventory-workspaces.md)
- [110 - Complete overselling, race-condition, and inventory reconciliation tests](110-complete-overselling-race-condition-and-inventory-reconciliation-tests.md)
- [111 - Create the Meilisearch-independent search abstraction](111-create-the-meilisearch-independent-search-abstraction.md)
- [112 - Build initial indexing and incremental search-index jobs](112-build-initial-indexing-and-incremental-search-index-jobs.md)
- [113 - Implement filters, facets, sorting, pagination, and typo tolerance](113-implement-filters-facets-sorting-pagination-and-typo-tolerance.md)
- [114 - Implement PostgreSQL search fallback and graceful degradation](114-implement-postgresql-search-fallback-and-graceful-degradation.md)
- [115 - Build CMS-driven storefront home sections and banners](115-build-cms-driven-storefront-home-sections-and-banners.md)
- [116 - Build category, brand, and collection landing pages](116-build-category-brand-and-collection-landing-pages.md)
- [117 - Build the localized product detail and variant-selection experience](117-build-the-localized-product-detail-and-variant-selection-experience.md)
- [118 - Build public seller storefronts](118-build-public-seller-storefronts.md)
- [119 - Implement dynamic metadata, JSON-LD, canonical URLs, and social cards](119-implement-dynamic-metadata-json-ld-canonical-urls-and-social-cards.md)
- [120 - Complete sitemaps, robots, accessibility, and storefront performance](120-complete-sitemaps-robots-accessibility-and-storefront-performance.md)
- [121 - Build customer profiles, preferences, consent, and account security](121-build-customer-profiles-preferences-consent-and-account-security.md)
- [122 - Build the customer address book](122-build-the-customer-address-book.md)
- [123 - Implement wishlists and share-safe wishlist links](123-implement-wishlists-and-share-safe-wishlist-links.md)
- [124 - Implement B2B buyer organizations, RFQs, and negotiated commerce](124-implement-b2b-buyer-organizations-rfqs-and-negotiated-commerce.md)
- [125 - Implement verified-purchase reviews, ratings, and review media](125-implement-verified-purchase-reviews-ratings-and-review-media.md)
- [126 - Implement product questions, seller answers, and moderation](126-implement-product-questions-seller-answers-and-moderation.md)
- [127 - Build guest and authenticated carts with safe merge behavior](127-build-guest-and-authenticated-carts-with-safe-merge-behavior.md)
- [128 - Group cart contents by seller and fulfillment constraints](128-group-cart-contents-by-seller-and-fulfillment-constraints.md)
- [129 - Revalidate stock, price, points, coupons, and seller eligibility in cart](129-revalidate-stock-price-points-coupons-and-seller-eligibility-in-cart.md)
- [130 - Build customer dashboards, order shortcuts, and notification preferences](130-build-customer-dashboards-order-shortcuts-and-notification-preferences.md)
- [131 - Build idempotent checkout orchestration](131-build-idempotent-checkout-orchestration.md)
- [132 - Implement address validation and delivery serviceability](132-implement-address-validation-and-delivery-serviceability.md)
- [133 - Create the shipping-rate and promise abstraction](133-create-the-shipping-rate-and-promise-abstraction.md)
- [134 - Create Bangladesh courier adapters and in-house delivery support](134-create-bangladesh-courier-adapters-and-in-house-delivery-support.md)
- [135 - Build seller-level shipment groups for multi-vendor checkout](135-build-seller-level-shipment-groups-for-multi-vendor-checkout.md)
- [136 - Calculate tax, discount, coupon, shipping, and points on the server](136-calculate-tax-discount-coupon-shipping-and-points-on-the-server.md)
- [137 - Implement COD eligibility, limits, and fraud-risk controls](137-implement-cod-eligibility-limits-and-fraud-risk-controls.md)
- [138 - Build payment-method discovery and selection](138-build-payment-method-discovery-and-selection.md)
- [139 - Build final order review, consent, and place-order transaction](139-build-final-order-review-consent-and-place-order-transaction.md)
- [140 - Implement abandoned-checkout recovery and checkout acceptance tests](140-implement-abandoned-checkout-recovery-and-checkout-acceptance-tests.md)
- [141 - Create parent customer orders and seller fulfillment orders](141-create-parent-customer-orders-and-seller-fulfillment-orders.md)
- [142 - Implement explicit order and fulfillment state machines](142-implement-explicit-order-and-fulfillment-state-machines.md)
- [143 - Build seller accept, reject, pack, and handover workflows](143-build-seller-accept-reject-pack-and-handover-workflows.md)
- [144 - Implement shipments, tracking numbers, and delivery events](144-implement-shipments-tracking-numbers-and-delivery-events.md)
- [145 - Generate invoices, credit notes, and packing slips asynchronously](145-generate-invoices-credit-notes-and-packing-slips-asynchronously.md)
- [146 - Implement item- and order-level cancellation policies](146-implement-item-and-order-level-cancellation-policies.md)
- [147 - Build return requests, RMA authorization, and return shipping](147-build-return-requests-rma-authorization-and-return-shipping.md)
- [148 - Build return inspection, disposition, and inventory decisions](148-build-return-inspection-disposition-and-inventory-decisions.md)
- [149 - Orchestrate full and partial refunds](149-orchestrate-full-and-partial-refunds.md)
- [150 - Build disputes, support linkage, and order reporting](150-build-disputes-support-linkage-and-order-reporting.md)
- [151 - Define the payment-provider interface and capability matrix](151-define-the-payment-provider-interface-and-capability-matrix.md)
- [152 - Implement the Cash on Delivery provider](152-implement-the-cash-on-delivery-provider.md)
- [153 - Create Bangladesh payment adapters for approved local gateways](153-create-bangladesh-payment-adapters-for-approved-local-gateways.md)
- [154 - Create optional Stripe and Razorpay adapters](154-create-optional-stripe-and-razorpay-adapters.md)
- [155 - Implement payment intents, attempts, and idempotency](155-implement-payment-intents-attempts-and-idempotency.md)
- [156 - Implement signed webhooks and replay protection](156-implement-signed-webhooks-and-replay-protection.md)
- [157 - Implement capture, failure recovery, and gateway reconciliation](157-implement-capture-failure-recovery-and-gateway-reconciliation.md)
- [158 - Implement full, partial, and multi-item refunds](158-implement-full-partial-and-multi-item-refunds.md)
- [159 - Build seller settlements, reserves, holds, and payouts](159-build-seller-settlements-reserves-holds-and-payouts.md)
- [160 - Complete financial reconciliation and payment integration tests](160-complete-financial-reconciliation-and-payment-integration-tests.md)
- [161 - Design the immutable double-entry wallet ledger](161-design-the-immutable-double-entry-wallet-ledger.md)
- [162 - Create wallet accounts and typed wallet purposes](162-create-wallet-accounts-and-typed-wallet-purposes.md)
- [163 - Implement balanced transactions and immutable postings](163-implement-balanced-transactions-and-immutable-postings.md)
- [164 - Implement balance projections, holds, and available-balance rules](164-implement-balance-projections-holds-and-available-balance-rules.md)
- [165 - Implement Customer wallet permissions and transfer restrictions](165-implement-customer-wallet-permissions-and-transfer-restrictions.md)
- [166 - Implement Seller wallet permissions and settlement restrictions](166-implement-seller-wallet-permissions-and-settlement-restrictions.md)
- [167 - Build deposit and withdrawal request workflows](167-build-deposit-and-withdrawal-request-workflows.md)
- [168 - Implement versioned wallet-split templates totaling 100 percent](168-implement-versioned-wallet-split-templates-totaling-100-pct.md)
- [169 - Implement controlled Admin adjustments with maker-checker approval](169-implement-controlled-admin-adjustments-with-maker-checker-approval.md)
- [170 - Complete wallet reconciliation, invariants, and audit tests](170-complete-wallet-reconciliation-invariants-and-audit-tests.md)
- [171 - Define Product Point terminology, units, and invariants](171-define-product-point-terminology-units-and-invariants.md)
- [172 - Enforce mandatory seller-defined Product Points on sellable products](172-enforce-mandatory-seller-defined-product-points-on-sellable-products.md)
- [173 - Snapshot Product Points on every order item](173-snapshot-product-points-on-every-order-item.md)
- [174 - Generate Points only at the configured eligible order status](174-generate-points-only-at-the-configured-eligible-order-status.md)
- [175 - Reverse Points safely for cancellation, return, and quantity changes](175-reverse-points-safely-for-cancellation-return-and-quantity-changes.md)
- [176 - Implement an idempotent Point event ledger](176-implement-an-idempotent-point-event-ledger.md)
- [177 - Version Point and reward rules without rewriting history](177-version-point-and-reward-rules-without-rewriting-history.md)
- [178 - Build order-to-Point traceability and reporting](178-build-order-to-point-traceability-and-reporting.md)
- [179 - Test the BDT 10,000 price and 1,000 Product Point scenario](179-test-the-bdt-10-000-price-and-1-000-product-point-scenario.md)
- [180 - Build Point reconciliation, replay, and integrity diagnostics](180-build-point-reconciliation-replay-and-integrity-diagnostics.md)
- [181 - Implement configurable Customer cashback with a 10 percent reference rate](181-implement-configurable-customer-cashback-with-a-10-pct-reference-rate.md)
- [182 - Implement referrals and the configurable 5 percent reference bonus](182-implement-referrals-and-the-configurable-5-pct-reference-bonus.md)
- [183 - Implement the Customer 50-20-15-5-10 reward split](183-implement-the-customer-50-20-15-5-10-reward-split.md)
- [184 - Configure Customer Club periods, tiers, and reference thresholds](184-configure-customer-club-periods-tiers-and-reference-thresholds.md)
- [185 - Implement equal-share Customer Club settlement](185-implement-equal-share-customer-club-settlement.md)
- [186 - Implement Customer Daily, Weekly, Monthly, and Yearly Star leaderboards](186-implement-customer-daily-weekly-monthly-and-yearly-star-leaderboards.md)
- [187 - Implement the configurable 3 percent Customer Rank Bonus](187-implement-the-configurable-3-pct-customer-rank-bonus.md)
- [188 - Model legacy Customer career ranks and non-cash incentives separately](188-model-legacy-customer-career-ranks-and-non-cash-incentives-separately.md)
- [189 - Implement Advanced Shopping Wallet behind an approved-rule gate](189-implement-advanced-shopping-wallet-behind-an-approved-rule-gate.md)
- [190 - Build Customer reward dashboards, statements, reversals, and tests](190-build-customer-reward-dashboards-statements-reversals-and-tests.md)
- [191 - Implement Seller Total Sales and Total Point ledgers](191-implement-seller-total-sales-and-total-point-ledgers.md)
- [192 - Configure Seller Club periods, tiers, and reference thresholds](192-configure-seller-club-periods-tiers-and-reference-thresholds.md)
- [193 - Implement equal-share Seller Club settlement](193-implement-equal-share-seller-club-settlement.md)
- [194 - Implement Seller Daily, Weekly, Monthly, and Yearly Star leaderboards](194-implement-seller-daily-weekly-monthly-and-yearly-star-leaderboards.md)
- [195 - Implement Seller Star reward-pool settlement](195-implement-seller-star-reward-pool-settlement.md)
- [196 - Implement configurable Seller Rank Bonus and rank qualification](196-implement-configurable-seller-rank-bonus-and-rank-qualification.md)
- [197 - Implement the Seller 70-15-5-10 reward split](197-implement-the-seller-70-15-5-10-reward-split.md)
- [198 - Build Seller levels, badges, leaderboards, and progress UX](198-build-seller-levels-badges-leaderboards-and-progress-ux.md)
- [199 - Integrate Seller reward settlement, payout, hold, and reversal lifecycle](199-integrate-seller-reward-settlement-payout-hold-and-reversal-lifecycle.md)
- [200 - Build Seller reward reports, reconciliation, and acceptance tests](200-build-seller-reward-reports-reconciliation-and-acceptance-tests.md)
- [201 - Define the eligible profit and reward-pool configuration contract](201-define-the-eligible-profit-and-reward-pool-configuration-contract.md)
- [202 - Implement period schedules, cutoffs, closing, and late-event handling](202-implement-period-schedules-cutoffs-closing-and-late-event-handling.md)
- [203 - Implement versioned settlements, reruns, locks, and correction runs](203-implement-versioned-settlements-reruns-locks-and-correction-runs.md)
- [204 - Import and maintain Bangladesh geographic hierarchy](204-import-and-maintain-bangladesh-geographic-hierarchy.md)
- [205 - Map merchants, customers, partners, and service points to beneficiaries](205-map-merchants-customers-partners-and-service-points-to-beneficiaries.md)
- [206 - Implement Alif Point Division, District, and Upazila commission rules](206-implement-alif-point-division-district-and-upazila-commission-rules.md)
- [207 - Implement Alif Pay regional and Service Point commission rules](207-implement-alif-pay-regional-and-service-point-commission-rules.md)
- [208 - Implement commission rounding, caps, reversals, and ledger posting](208-implement-commission-rounding-caps-reversals-and-ledger-posting.md)
- [209 - Implement Charity Fund and Service Charge ledgers](209-implement-charity-fund-and-service-charge-ledgers.md)
- [210 - Build the Distribution Admin dashboard and end-to-end reconciliation](210-build-the-distribution-admin-dashboard-and-end-to-end-reconciliation.md)
- [211 - Design the Good-Luck lottery with a legal feature gate](211-design-the-good-luck-lottery-with-a-legal-feature-gate.md)
- [212 - Build lottery campaigns, ticket sales, and Good-Luck Wallet debits](212-build-lottery-campaigns-ticket-sales-and-good-luck-wallet-debits.md)
- [213 - Implement auditable secure draws and winner publication](213-implement-auditable-secure-draws-and-winner-publication.md)
- [214 - Implement prize fulfillment and completed-lottery history](214-implement-prize-fulfillment-and-completed-lottery-history.md)
- [215 - Implement package-value coupons and the weekly draw variant](215-implement-package-value-coupons-and-the-weekly-draw-variant.md)
- [216 - Build the Alifworld.click advertisement library and campaign management](216-build-the-alifworld-click-advertisement-library-and-campaign-management.md)
- [217 - Implement verified ad-view completion and anti-fraud controls](217-implement-verified-ad-view-completion-and-anti-fraud-controls.md)
- [218 - Implement configurable subscription packages, caps, and validity](218-implement-configurable-subscription-packages-caps-and-validity.md)
- [219 - Implement affiliate and package-referral commission levels](219-implement-affiliate-and-package-referral-commission-levels.md)
- [220 - Model marketing ranks and cash rewards behind compliance controls](220-model-marketing-ranks-and-cash-rewards-behind-compliance-controls.md)
- [221 - Build Rider application, KYC, and approval](221-build-rider-application-kyc-and-approval.md)
- [222 - Implement Rider authentication, profile, and availability status](222-implement-rider-authentication-profile-and-availability-status.md)
- [223 - Model delivery jobs and assignment strategies](223-model-delivery-jobs-and-assignment-strategies.md)
- [224 - Build available-delivery discovery and atomic acceptance](224-build-available-delivery-discovery-and-atomic-acceptance.md)
- [225 - Implement pickup confirmation and proof of pickup](225-implement-pickup-confirmation-and-proof-of-pickup.md)
- [226 - Implement rate-controlled GPS updates through Redis](226-implement-rate-controlled-gps-updates-through-redis.md)
- [227 - Implement customer OTP and proof-of-delivery completion](227-implement-customer-otp-and-proof-of-delivery-completion.md)
- [228 - Implement delivery failure, cancellation, return, and cash collection](228-implement-delivery-failure-cancellation-return-and-cash-collection.md)
- [229 - Build Rider earnings, history, and reconciliation](229-build-rider-earnings-history-and-reconciliation.md)
- [230 - Complete Rider Flutter APIs, notifications, and end-to-end tests](230-complete-rider-flutter-apis-notifications-and-end-to-end-tests.md)
- [231 - Build the professional Admin shell and dashboard navigation](231-build-the-professional-admin-shell-and-dashboard-navigation.md)
- [232 - Build reusable tables, filters, sorting, bulk actions, and exports](232-build-reusable-tables-filters-sorting-bulk-actions-and-exports.md)
- [233 - Build user, seller, KYC, and moderation consoles](233-build-user-seller-kyc-and-moderation-consoles.md)
- [234 - Build catalog, order, inventory, and delivery consoles](234-build-catalog-order-inventory-and-delivery-consoles.md)
- [235 - Build payment, wallet, rewards, commission, and payout consoles](235-build-payment-wallet-rewards-commission-and-payout-consoles.md)
- [236 - Build CMS pages, banners, navigation, and homepage management](236-build-cms-pages-banners-navigation-and-homepage-management.md)
- [237 - Build support tickets, disputes, notes, and service-level tracking](237-build-support-tickets-disputes-notes-and-service-level-tracking.md)
- [238 - Build scheduled and on-demand reports and safe exports](238-build-scheduled-and-on-demand-reports-and-safe-exports.md)
- [239 - Implement analytics events, KPIs, funnels, and role-aware dashboards](239-implement-analytics-events-kpis-funnels-and-role-aware-dashboards.md)
- [240 - Build settings, feature flags, maintenance mode, and configuration history](240-build-settings-feature-flags-maintenance-mode-and-configuration-history.md)
- [241 - Define notification events, templates, preferences, and localization](241-define-notification-events-templates-preferences-and-localization.md)
- [242 - Implement queued transactional email delivery](242-implement-queued-transactional-email-delivery.md)
- [243 - Implement SMS and OTP provider abstraction](243-implement-sms-and-otp-provider-abstraction.md)
- [244 - Implement Firebase-compatible push notifications](244-implement-firebase-compatible-push-notifications.md)
- [245 - Implement a consent-aware WhatsApp provider abstraction](245-implement-a-consent-aware-whatsapp-provider-abstraction.md)
- [246 - Build in-app notification inbox, read state, and pagination](246-build-in-app-notification-inbox-read-state-and-pagination.md)
- [247 - Build BullMQ queue topology and separately scalable workers](247-build-bullmq-queue-topology-and-separately-scalable-workers.md)
- [248 - Implement recurring jobs and platform-timezone schedules](248-implement-recurring-jobs-and-platform-timezone-schedules.md)
- [249 - Implement retries, deduplication, dead-letter handling, and job observability](249-implement-retries-deduplication-dead-letter-handling-and-job-observability.md)
- [250 - Implement transactional outbox, realtime events, and outbound webhooks](250-implement-transactional-outbox-realtime-events-and-outbound-webhooks.md)
- [251 - Standardize API envelopes, errors, request IDs, and status codes](251-standardize-api-envelopes-errors-request-ids-and-status-codes.md)
- [252 - Build the reusable v1 Route Handler execution pipeline](252-build-the-reusable-v1-route-handler-execution-pipeline.md)
- [253 - Create shared Zod validation and serialization schemas](253-create-shared-zod-validation-and-serialization-schemas.md)
- [254 - Implement stable filtering, sorting, cursor, and page pagination contracts](254-implement-stable-filtering-sorting-cursor-and-page-pagination-contracts.md)
- [255 - Complete Auth, Customer, Catalog, Cart, Checkout, and Order APIs](255-complete-auth-customer-catalog-cart-checkout-and-order-apis.md)
- [256 - Complete Seller and Admin APIs with tenant-safe authorization](256-complete-seller-and-admin-apis-with-tenant-safe-authorization.md)
- [257 - Complete Rider and Delivery APIs for Flutter consumption](257-complete-rider-and-delivery-apis-for-flutter-consumption.md)
- [258 - Generate OpenAPI from implementation-owned schemas and metadata](258-generate-openapi-from-implementation-owned-schemas-and-metadata.md)
- [259 - Publish Swagger UI, examples, authentication flows, and error catalogs](259-publish-swagger-ui-examples-authentication-flows-and-error-catalogs.md)
- [260 - Generate typed clients and enforce Flutter-compatible API evolution](260-generate-typed-clients-and-enforce-flutter-compatible-api-evolution.md)
- [261 - Build the Redis connection, namespace, and cache abstraction](261-build-the-redis-connection-namespace-and-cache-abstraction.md)
- [262 - Define cache keys, TTLs, tags, invalidation, and stampede protection](262-define-cache-keys-ttls-tags-invalidation-and-stampede-protection.md)
- [263 - Implement surface-specific distributed API rate limits](263-implement-surface-specific-distributed-api-rate-limits.md)
- [264 - Implement distributed locks and idempotency-key storage](264-implement-distributed-locks-and-idempotency-key-storage.md)
- [265 - Tune PostgreSQL indexes, queries, pagination, and query budgets](265-tune-postgresql-indexes-queries-pagination-and-query-budgets.md)
- [266 - Implement connection pooling, health, readiness, and dependency checks](266-implement-connection-pooling-health-readiness-and-dependency-checks.md)
- [267 - Prove stateless horizontal scaling behind a load balancer](267-prove-stateless-horizontal-scaling-behind-a-load-balancer.md)
- [268 - Implement graceful degradation for search, storage, Redis, and queues](268-implement-graceful-degradation-for-search-storage-redis-and-queues.md)
- [269 - Execute performance, soak, and capacity tests](269-execute-performance-soak-and-capacity-tests.md)
- [270 - Implement backup, restore, retention, and disaster-recovery architecture](270-implement-backup-restore-retention-and-disaster-recovery-architecture.md)
- [271 - Build deterministic test factories, fixtures, clocks, and provider fakes](271-build-deterministic-test-factories-fixtures-clocks-and-provider-fakes.md)
- [272 - Complete unit tests for pricing, Points, rewards, commissions, and inventory](272-complete-unit-tests-for-pricing-points-rewards-commissions-and-inventory.md)
- [273 - Complete integration tests for authentication and catalog](273-complete-integration-tests-for-authentication-and-catalog.md)
- [274 - Complete integration tests for cart, checkout, orders, and payments](274-complete-integration-tests-for-cart-checkout-orders-and-payments.md)
- [275 - Complete integration tests for wallets, settlements, and commissions](275-complete-integration-tests-for-wallets-settlements-and-commissions.md)
- [276 - Complete Customer, Seller, Admin, and Rider end-to-end journeys](276-complete-customer-seller-admin-and-rider-end-to-end-journeys.md)
- [277 - Perform threat modeling, dependency scanning, and security testing](277-perform-threat-modeling-dependency-scanning-and-security-testing.md)
- [278 - Implement privacy, consent, retention, export, and deletion workflows](278-implement-privacy-consent-retention-export-and-deletion-workflows.md)
- [279 - Complete accessibility, localization, browser, and device QA](279-complete-accessibility-localization-browser-and-device-qa.md)
- [280 - Run UAT against the approved business configuration matrix](280-run-uat-against-the-approved-business-configuration-matrix.md)
- [281 - Build the production multi-stage Docker image](281-build-the-production-multi-stage-docker-image.md)
- [282 - Build Docker Compose and external-infrastructure profiles](282-build-docker-compose-and-external-infrastructure-profiles.md)
- [283 - Finalize environment files and the exact Bun command contract](283-finalize-environment-files-and-the-exact-bun-command-contract.md)
- [284 - Build CI pipelines for validation, build, test, scan, and artifacts](284-build-ci-pipelines-for-validation-build-test-scan-and-artifacts.md)
- [285 - Automate safe migrations, seeds, and deployment ordering](285-automate-safe-migrations-seeds-and-deployment-ordering.md)
- [286 - Define preview, staging, and production topology](286-define-preview-staging-and-production-topology.md)
- [287 - Implement structured logs and request correlation](287-implement-structured-logs-and-request-correlation.md)
- [288 - Implement metrics, tracing, error monitoring, and dashboards](288-implement-metrics-tracing-error-monitoring-and-dashboards.md)
- [289 - Define alerts, operational runbooks, and incident response](289-define-alerts-operational-runbooks-and-incident-response.md)
- [290 - Implement release, canary, rollback, and versioning procedures](290-implement-release-canary-rollback-and-versioning-procedures.md)
- [291 - Seed initial roles, permissions, and the forced-change Admin account](291-seed-initial-roles-permissions-and-the-forced-change-admin-account.md)
- [292 - Seed the reference reward configuration without hard-coding behavior](292-seed-the-reference-reward-configuration-without-hard-coding-behavior.md)
- [293 - Seed Bangladesh geography and localized baseline content](293-seed-bangladesh-geography-and-localized-baseline-content.md)
- [294 - Plan and execute production data migration and verification](294-plan-and-execute-production-data-migration-and-verification.md)
- [295 - Pass full regression, load, security, and financial-integrity gates](295-pass-full-regression-load-security-and-financial-integrity-gates.md)
- [296 - Rehearse disaster recovery and dependency outage procedures](296-rehearse-disaster-recovery-and-dependency-outage-procedures.md)
- [297 - Execute the Bangladesh soft launch and controlled feature rollout](297-execute-the-bangladesh-soft-launch-and-controlled-feature-rollout.md)
- [298 - Deliver operational training and role-specific handbooks](298-deliver-operational-training-and-role-specific-handbooks.md)
- [299 - Finalize architecture, API, database, deployment, and scaling documentation](299-finalize-architecture-api-database-deployment-and-scaling-documentation.md)
- [300 - Complete final acceptance, handover, warranty baseline, and post-launch backlog](300-complete-final-acceptance-handover-warranty-baseline-and-post-launch-backlog.md)
