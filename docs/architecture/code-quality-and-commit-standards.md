# AlifWorld Code Quality, Formatting, Type Checking, and Commit Standards

**Document Type**: Architectural Standard & Developer Guide  
**Milestone Reference**: [Milestone 015](../../AlifWorld-300-Milestones/015-configure-linting-formatting-type-checking-and-commit-quality.md)  
**Status**: Active / Approved  
**Related Decision**: [ADR-0015](../decisions/0015-linting-formatting-and-commit-quality.md)  

---

## 1. Overview and Purpose

The AlifWorld platform is developed as a single-application modular monolith. To maintain high code quality, consistency, and traceability across customer storefront, seller portal, admin backoffice, worker jobs, and REST APIs, strict automated verification standards are enforced across the repository.

This standard establishes:
1. **ESLint**: Automated static analysis enforcing Next.js Core Web Vitals, React best practices, and clean TypeScript syntax.
2. **Prettier**: Deterministic code formatting with zero style debate.
3. **TypeScript**: Strict type checking with zero tolerated errors and forbidden untyped escapes.
4. **Commitlint & Conventional Commits**: Structured git commit history enabling automated changelogs and auditability.
5. **Asset Protection Policy**: Explicit protection of visual design reference materials (including `UI References/` and brand icons) against automated corruption or reformatting.

---

## 2. ESLint Static Analysis Standard

The repository uses ESLint (`.eslintrc.json`) extending `next/core-web-vitals` with strict JavaScript and React rules:

```json
{
  "extends": [
    "next/core-web-vitals"
  ],
  "rules": {
    "prefer-const": "error",
    "no-var": "error",
    "no-console": [
      "warn",
      {
        "allow": ["warn", "error", "info"]
      }
    ],
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn"
  },
  "ignorePatterns": [
    "node_modules/",
    ".next/",
    "dist/",
    "out/",
    "build/",
    "coverage/",
    "UI References/"
  ]
}
```

### Key Rules
- **No `var` (`no-var: error`)**: All variables must be declared with `const` or `let`.
- **Prefer `const` (`prefer-const: error`)**: Unreassigned variables must be declared with `const`.
- **React Hooks Rules**: Full compliance with React hook execution lifecycle and exhaustive dependency arrays.
- **Console Hygiene**: Arbitrary `console.log` statements are flagged; structured logging or explicit `console.info/warn/error` is permitted for lifecycle operations.

---

## 3. Prettier Formatting Standard

Formatting is enforced uniformly using Prettier (`.prettierrc.json`):

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

### File Exclusions (`.prettierignore`)
Automated formatting is strictly excluded from:
- Build artifacts and caches (`node_modules/`, `.next/`, `dist/`, `out/`, `build/`, `coverage/`).
- Package lockfiles (`bun.lockb`, `package-lock.json`, etc.).
- Design references (`UI References/`).
- Brand binary assets (`public/brand/`, `logo.png`).

---

## 4. Strict TypeScript Verification

TypeScript configuration (`tsconfig.json`) enforces maximum compiler strictness:
- `"strict": true`
- `"noImplicitAny": true`
- `"strictNullChecks": true`
- `"strictFunctionTypes": true`
- `"strictBindCallApply": true`
- `"strictPropertyInitialization": true`
- `"noImplicitThis": true`
- `"alwaysStrict": true`
- `"noEmit": true` (used during `bun run typecheck`)

### Strict Guidelines:
- **Zero Placeholder Policy**: Never use `any` as an escape hatch; create well-defined Zod schemas and TypeScript interfaces.
- **No `@ts-ignore` or `@ts-nocheck`**: Forbidden in production source code. If third-party types are incomplete, supply declaration files under `src/types/`.

---

## 5. Conventional Commits and Git Standards

AlifWorld follows the [Conventional Commits](https://www.conventionalcommits.org/) specification enforced via Commitlint (`commitlint.config.js`).

### Format
```
<type>(<scope>): <subject>
```

### Types
- `feat`: A new user-facing feature or domain capability.
- `ft`: Feature milestone commit shorthand.
- `fix`: A bug fix or defect correction.
- `docs`: Documentation updates only.
- `style`: Changes that do not affect the meaning of the code (formatting, missing semi-colons, etc.).
- `refactor`: A code change that neither fixes a bug nor adds a feature.
- `perf`: A code change that improves performance.
- `test`: Adding missing tests or correcting existing tests.
- `build`: Changes that affect the build system or external dependencies (e.g. Bun, Tailwind).
- `ci`: Changes to CI configuration files and scripts.
- `chore`: Maintenance tasks, repo house-keeping.
- `revert`: Reverting a previous commit.

### Approved Scopes
- `auth` / `identity`: User authentication, session management, roles, and permissions.
- `seller`: Seller onboarding, seller portal, store management.
- `admin`: Backoffice management, configuration, audits, compliance.
- `catalog`: Categories, brands, products, variants, inventory.
- `pricing`: Product pricing, tier pricing, promotional pricing.
- `wallet`: Double-entry ledger, balance tracking, deposits, withdrawals.
- `points`: Product points snapshotting, point accumulation, redemption.
- `order`: Cart, checkout, order placement, order item snapshots.
- `payment`: Gateway integrations (bKash, Nagad, SSLCommerz, COD).
- `ui`: Reusable design system tokens and atomic components.
- `core`: Shared utilities, currency converters, date formatters, error models.
- `config`: Environment configuration and validation.
- `deps`: Dependency updates.
- `milestone`: Phase and milestone deliverables.
- `release`: Version tagging and production releases.

---

## 6. Execution Command Contract

The following quality commands are registered in `package.json`:

| Command | Purpose |
| :--- | :--- |
| `bun run lint` | Runs ESLint across all source files with zero-warning tolerance (`--max-warnings 0`). |
| `bun run lint:fix` | Runs ESLint with automated fixes for lint violations. |
| `bun run format` | Runs Prettier write mode to format the codebase. |
| `bun run format:check` | Verifies that all files conform to Prettier formatting rules without modifying them. |
| `bun run typecheck` | Compiles TypeScript with `tsc --noEmit` to verify type safety. |
| `bun run quality` | Runs both linting and type checking in a single command. |
| `bun run test` | Executes the Bun test runner suite. |
| `bun run build:local` | Generates Next.js production build output. |

---

## 7. Protection of Reference Assets

Visual reference materials located in `UI References/` are user-provided design artifacts containing layouts, screenshots, and visual specifications. 

### Operational Rules:
1. **Never Reformat**: `UI References/` is excluded from Prettier and ESLint.
2. **Never Overwrite**: Files within `UI References/` must not be renamed, moved, or deleted by automated scripts.
3. **Traceability**: UI components created in `src/components/` must cite corresponding references in `UI References/` when implementing screen designs.
