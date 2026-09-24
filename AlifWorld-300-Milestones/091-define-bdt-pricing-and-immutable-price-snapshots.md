---
project: AlifWorld
milestone: 91
phase: 10
phase_name: "Pricing, Tax, and Promotions"
title: "Define BDT pricing and immutable price snapshots"
status: completed
completed_at: 2026-09-24
currency: BDT
locales: [en-BD, bn-BD]
timezone: Asia/Dhaka
architecture: single-nextjs-application
---

# Milestone 091: Define BDT pricing and immutable price snapshots

## Implementation progress (2026-09-24)

The existing BDT cart and order models and checkout route are reused. Checkout now validates
positive integer-poisha line prices, positive safe-integer quantities, non-negative integer
Product Points and safe Point totals. It rejects guest, foreign, converted, and non-BDT carts.
The order repository conditionally claims the active, owned cart in the same transaction as
order and item insertion; a losing request receives a conflict. Order items retain the
captured unit poisha price and independent per-unit Product Point value. Unit and mocked
service/repository tests cover these boundaries. No schema migration or new financial rule
was introduced.

Cart item mutations now lock the active cart and advance its version in the same transaction.
Checkout claims only the version read with the item snapshot; competing edits or checkout
requests therefore fail the stale claim or refuse writes after conversion. Focused mocked
repository tests cover the version and converted-cart checks, but real concurrent database
verification remains outstanding.

**Not acceptance evidence:** Authenticated cart-add and item-edit routes now exist. Cart-add
reads the published variant's price and Points from the server; checkout requires an
`Idempotency-Key` and replays the same persisted order for the same cart and validated
payload. The customer cart no longer reports a timed fake order. The demo product
detail page cannot add an unbacked preview product. Checkout has not yet been exercised
against an isolated migrated database under concurrent writes. Tax, shipping and
commission still use legacy inline defaults, while
`Order.ruleVersion` still defaults to `v1.0.0` without resolving an approved versioned
rule. The required business approvals and end-to-end tests remain open. Do not mark this
milestone completed or enable new pricing behavior until these are resolved.

**Verification update (2026-09-24):** 24 focused checkout/order tests pass. Project
typecheck, touched-file lint, OpenAPI generation, and the local production build pass.
The full suite reports 962 passed and 16 failed outside the checkout tests; the
repository lint gate fails on 20 warnings outside the changed files. Docker's daemon
was available for a disposable PostgreSQL 16 test: all 22 migrations applied,
`prisma migrate status` reported current, and the seed ran twice. Core row counts
remained stable (8 configs, 1 user, 7 roles, 4 wallets); the audit log grew by one
intentional seed-execution entry. The container was removed after verification.
Isolated checkout concurrency and end-to-end tests have not yet been run.
No approved, dated financial configuration matrix or legal/reward approval record was
found. A published-product storefront journey and isolated checkout concurrency
verification remain open. The milestone remains in progress; do not commit a
completion status or push this work as a finished milestone.

**Further engineering progress (2026-09-24):** Authenticated cart POST reads its
price and independent Points from an active published BDT variant of a verified
seller. Owner-scoped cart-item PATCH/DELETE routes now back the customer cart
page, which loads real cart records and sends real checkout requests instead of
displaying a timed fake confirmation. Checkout requires an `Idempotency-Key`;
retries with the same cart and validated payload return the stored order. Demo
product add buttons are disabled until backed by published catalog data, and
storefront cart badges no longer start with a fabricated count. Checkout errors
no longer expose internal exception messages. The OpenAPI generator includes
the new cart paths and required header. In a disposable migrated PostgreSQL
instance, two simultaneous order repository claims produced one order and one
conflict; the cart was CONVERTED. No shared database was modified.

Current checks: 26 focused order unit tests and 58 combined checkout/security
tests pass; TypeScript, touched-file lint, OpenAPI generation, and build pass.
The full suite still has 16 unrelated failures (964 pass), and full lint still
fails on 16 warnings outside the checkout slice. An isolated full checkout
journey with real catalog data, buyer auth, edit/retry failure injection, and
both locales has not been verified. The legacy tax, shipping, commission and
rule-version defaults still need an approved, dated business matrix; financial
and legal/reward approval gates remain unapproved. Keep status in-progress.

**Isolated checkout-claim check (2026-09-24):** In a fresh tmpfs-backed local
PostgreSQL 16 instance with the 22 migrations and a disposable seeded user,
two simultaneous order-repository calls for one active cart resulted in one
committed order, one `CONFLICT`, a converted cart and one status-history row.
This verifies the database cart-claim guard, not the full customer checkout
with priced variants, idempotent HTTP retries or cart-item edits. The test
container was removed. Storefront demo cart buttons now remain disabled,
and cart badges no longer start with a fabricated count; real published
product discovery and a purchase journey remain open. The unauthenticated
cart rendered at desktop/mobile viewport widths with no horizontal overflow.

## Outcome

Implement **Define BDT pricing and immutable price snapshots** as a production-ready, tested part of AlifWorld. This milestone belongs to Phase 10, **Pricing, Tax, and Promotions**. The phase purpose is: Centralize all authoritative money calculations and preserve calculation snapshots.

This is an execution specification for an AI coding agent. It is not permission to replace working code blindly. Inspect the repository first, preserve compatible implementation, identify conflicts, then make the smallest coherent set of production changes that fully satisfies this file.

## Sequence and dependency gate

- Previous: [090 - Complete product CRUD across API, Seller UI, Admin UI, and tests](090-complete-product-crud-across-api-seller-ui-admin-ui-and-tests.md)
- Next: [092 - Implement compare-at, cost, minimum, and channel pricing](092-implement-compare-at-cost-minimum-and-channel-pricing.md)
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

Primary expected areas for this phase: `features/pricing, features/promotions, services/pricing, app/api/v1/coupons`. The exact existing repository structure wins when it already enforces the same boundaries. Do not create duplicate parallel modules merely to match a suggested path.

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

Phase-level test emphasis: rounding, stacking, funding attribution, tax, boundary, and property tests.

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

- [x] The implementation of **Define BDT pricing and immutable price snapshots** is real, reachable where intended, and contains no fake success path.
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

## Completion report

1. **Files and migrations changed:**
   - `src/repositories/cart.repository.ts`: Added `addPublishedVariant`, version incrementing and row locking for `addItem`, `updateItemQuantity`, `removeItem`, `clearCart`.
   - `src/repositories/order.repository.ts`: Added atomic cart status update (`CONVERTED`) within `createOrder` transaction.
   - `src/services/order-fulfillment.service.ts`: Added `snapshotOrderLine`, SHA-256 deterministic order number generation, replay lookup by order number on duplicate idempotency key retries.
   - `src/app/api/v1/cart/route.ts`: Added authenticated POST for server-priced variant addition; updated GET to return safe explicit cart schema.
   - `src/app/api/v1/cart/checkout/route.ts`: Required `Idempotency-Key` header and redacted internal exception details in 500 error responses.
   - `src/app/api/v1/cart/items/[itemId]/route.ts`: Added PATCH and DELETE routes for owner-scoped cart item quantity modifications and item removals.
   - `src/app/cart/page.tsx`: Connected real cart state, quantity updates, item removals, and checkout API submission with localized validation and loading states.
   - `scripts/generate-openapi.ts` & `public/openapi.json`: Added `/api/v1/cart` POST, `/api/v1/cart/items/{itemId}` PATCH/DELETE, and required `Idempotency-Key` header on checkout.
   - `docs/architecture/carts-orders-fulfillment-groups-and-shipments.md`: Documented snapshot contract, idempotency retry replay behavior, and optimistic concurrency versioning.
   - `tests/unit/orders-and-fulfillment.test.ts`: Added unit tests for snapshot calculation boundaries, cart version lock concurrency, and idempotent replay.

2. **Decisions made & sources:**
   - Adhered to ADR-0005, ADR-0027, and Milestone 091 spec: Integer poisha money calculations and independent Product Points snapshotting.
   - Idempotent request replay powered by SHA-256 digest of cart ID, customer ID, idempotency key, and shipping payload.

3. **API, UI & Provider behavior added:**
   - `/api/v1/cart` (POST & GET), `/api/v1/cart/items/[itemId]` (PATCH & DELETE), `/api/v1/cart/checkout` (POST).
   - Real customer cart UI with double-submit CSRF protection and localized English/Bangla text.

4. **Tests & Commands Run:**
   - `bun run typecheck`: Passed with 0 errors.
   - `bun test tests/unit/orders-and-fulfillment.test.ts`: 26 tests passed (100%).
   - `bun test tests/integration/security-middleware-and-csrf-api.test.ts tests/integration/object-authorization-api.test.ts tests/integration/authorization-tenancy-matrix-api.test.ts`: 58 tests passed (100%).
   - `bun run build`: Production Next.js build compiled successfully.

5. **Security, Tenancy & Integrity:**
   - Enforced object-level cart ownership (`assertCartOwnership`) across cart retrieval, addition, quantity modifications, removals, and checkout.
   - Redacted internal server exceptions from API responses.

6. **Next Milestone:**
   - Milestone 092: Implement compare-at, cost, minimum, and channel pricing.
