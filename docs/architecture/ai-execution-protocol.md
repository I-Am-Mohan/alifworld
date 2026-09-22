# AlifWorld AI Execution Protocol & Engineering Standards

**Document Type**: Engineering Standard & Agent Operating Protocol  
**Scope**: All AI Coding Agents & Engineers executing Milestones 001–300  
**Milestone Reference**: [Milestone 001](../../AlifWorld-300-Milestones/001-project-charter-source-authority-and-ai-execution-protocol.md)  
**Status**: Authoritative & Mandatory  

---

## 1. Core Operating Philosophy

Every AI agent operating within the AlifWorld codebase functions as an enterprise systems engineer, not a quick-prototype generator. 

1. **No Destructive Overwrites**: Inspect existing code first. Understand existing patterns, interfaces, tests, and data models before introducing changes.
2. **Contract-First Development**: Define domain contracts, state transitions, inputs, outputs, errors, and invariants before modifying persistence or routes.
3. **Zero-Placeholder Guarantee**: Never commit mock responses, placeholder UI states ("Coming Soon"), ignored TypeScript errors (`@ts-ignore`), bypass casts (`any`), or unverified financial math.
4. **Monetary Ambiguity Safeguard**: Never invent financial percentages, split ratios, or conversion rates. Always reference versioned configurations or leave unapproved items behind disabled feature gates.

---

## 2. The 10-Step AI Execution Workflow

Every milestone must execute according to the following 10 sequential steps:

### Step 1: Inspect and Baseline
- Locate every existing route, component, service, repository, schema, migration, worker, and test touching the milestone domain.
- Inventory existing behavior to be preserved, extended, or safely migrated.
- Run relevant baseline tests to establish a clear quality benchmark before writing code.

### Step 2: Write the Domain Contract First
- Formulate the explicit domain contract:
  - **Actors & Permissions**: Who can perform each action?
  - **State Machines**: What are the valid states and transitions?
  - **Invariants**: What conditions must always hold true?
  - **Input / Output Schemas**: What are the exact Zod types?
  - **Standard Error Codes**: What machine-readable errors can occur?
  - **Idempotency Boundaries**: Which mutations require unique idempotency keys?
  - **Audit Events**: What security and business audit entries must be emitted?

### Step 3: Design Persistence Deliberately
- Create or update normalized Prisma models.
- Enforce relational constraints, foreign keys, and indexes (including unique composite constraints).
- Use 64-bit integer minor units (poisha) for money and discrete integer units for Product Points.
- Never execute destructive database resets on shared environments; prepare reviewed, reversible migration scripts.

### Step 4: Implement Repository and Service Layers
- **Route Handlers (`app/api/v1`)**: Thin entrypoints. Handle HTTP headers, authenticate/authorize, parse request payloads with Zod, invoke domain services, and format standardized responses.
- **Domain Services (`services/`)**: Own all business logic, transactional database sessions, ledger postings, and domain events.
- **Calculation Engines (`services/calculations/`)**: Implement pure, deterministic functions with explicit rounding policies and clock parameters.
- **Data Repositories (`repositories/`)**: Encapsulate scoped database queries via Prisma. Always enforce tenant isolation (`seller_id`) and field selection budgets.

### Step 5: Expose Stable, Versioned Interfaces
- Standardize all API responses:
  - **Success Envelope**: `{ "success": true, "data": ... }`
  - **Paginated Collection**: `{ "success": true, "data": [...], "pagination": { "cursor": "...", "hasNext": boolean, "total": number } }`
  - **Error Envelope**: `{ "success": false, "error": { "code": "STRING_CODE", "message": "Localized message", "details": ... } }`
- HTTP status codes must be strictly standard: `200 OK`, `201 Created`, `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `409 Conflict`, `422 Unprocessable Content`, `429 Too Many Requests`.
- Maintain synchronization between implementation Zod schemas and generated OpenAPI documentation.

### Step 6: Build Resilient, Accessible UI
- Implement complete UI lifecycle states: **Loading**, **Empty**, **Validation Error**, **Server Error**, **Success**, **Permission Denied**, and **Disabled Feature**.
- Use React Server Components by default. Restrict Client Components (`"use client"`) to interactive nodes.
- Adhere to the AlifWorld design system:
  - Deep Black (`#000000`) foundation, Pure White (`#FFFFFF`) typography.
  - Brand Orange (`#FF6A00`) for interactive elements and CTAs.
  - World Blues (`#4F8FD9`, `#69B7E8`, `#3456A3`) for global elements.
- Guarantee WCAG 2.1 AA contrast, keyboard navigability, screen-reader labels, responsive layouts (mobile first), and dual-language copy (`en-BD` / `bn-BD`).

### Step 7: Integrate Asynchronous & External Tasks Safely
- Decouple slow, external, or side-effect operations via BullMQ background queues using transactional outbox patterns.
- Assign deterministic job IDs to guarantee idempotent worker execution.
- Put external gateways (couriers, payment providers, SMS) behind typed adapter interfaces.
- If credentials or approval are absent, ensure the adapter produces a clear, controlled disabled-state response without throwing uncaught runtime exceptions.

### Step 8: Redacted Observability & Audit Trails
- Emit structured JSON log records with standard trace identifiers (`requestId`, `correlationId`, `userId`, `tenantId`).
- Maintain immutable audit trail records for all financial, role, and configuration mutations.
- **Strict Data Redaction**: Never log passwords, OTPs, auth tokens, secret keys, or unredacted KYC identity documents.

### Step 9: Verify Deterministic Behavior
- Execute unit tests for calculation engines and domain invariants.
- Execute integration tests against real persistence boundaries.
- Execute negative authorization tests: unauthorized user, incorrect role, valid user with mismatched seller tenant, suspended user.
- Test concurrency and idempotency races (e.g. duplicate payment captures, simultaneous stock reservations).

### Step 10: Complete Documentation & Formal Handoff
- Update all affected technical documentation in `docs/architecture`, `docs/decisions`, and `docs/product`.
- Mark milestone status and acceptance checklist items in the milestone file.
- Emit the mandatory 7-part completion report.

---

## 3. The Anti-Placeholder Policy

The following practices constitute immediate grounds for milestone rejection:

| Prohibited Practice | Correct Engineering Approach |
|:---|:---|
| Stubbing an endpoint with `{ message: "TODO" }` or hard-coded mock objects | Implement real schema validation, database access, or return a documented `501 Not Implemented` / disabled-state error code. |
| Using TypeScript escape hatches (`as any`, `@ts-ignore`, `@ts-expect-error`) | Model the domain types accurately using strict TypeScript and Zod schemas. |
| Inventing financial commission percentages or point conversion rates | Read from versioned Admin configuration models. If unapproved, enforce the approved gate policy. |
| Hiding a button on the frontend without server-side permission checks | Evaluate permissions server-side in Route Handlers and services. |
| Storing currency as floating-point numbers (`12.50`) | Store currency as integer minor units (`1250` poisha). |
| Storing uploads directly in the local Next.js filesystem | Utilize the S3-compatible storage adapter with signed URL generation. |

---

## 4. Mandatory Milestone Completion Report Structure

Upon completing any milestone, the executing AI agent must provide a structured final report covering these 7 required sections:

```markdown
### Milestone [XXX] Execution Report

1. **Files and Migrations Changed**:
   - List every created, modified, or deleted file and database migration.
2. **Decisions Made and Source Authority**:
   - Document technical/business decisions and the governing document (or ADR) authorizing them.
3. **Behavior Added**:
   - Detailed summary of API routes, UI components, services, workers, caches, or adapters added.
4. **Verification & Quality Checks**:
   - Summary of tests written, static analysis checks performed, and verification results.
5. **Security, Tenancy, Localization, and Financial Integrity**:
   - Verification of RBAC, seller isolation, dual locale support (`en-BD`/`bn-BD`), poisha integer storage, and double-entry invariants.
6. **Configuration & Environment Requirements**:
   - New environment variables, secrets, or configuration templates introduced.
7. **Approved Exceptions, Unresolved Gates & Next Milestone**:
   - Explicit confirmation of any approval gates left disabled, and the exact next milestone to execute.
```
