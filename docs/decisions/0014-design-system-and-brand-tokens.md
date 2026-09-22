# ADR 0014: AlifWorld Design System and Brand Tokens Architecture

**Status**: Accepted  
**Date**: 2026-09-22  
**Deciders**: AlifWorld Architecture, Design & Front-End Engineering Team  
**Milestone Reference**: [Milestone 014](../../AlifWorld-300-Milestones/014-create-the-alifworld-design-system-and-brand-tokens.md)  
**Supporting Specification**: [Design System & Brand Tokens Specification](../architecture/design-system-and-brand-tokens.md)  

---

## Context and Problem Statement

AlifWorld requires a unified visual identity and component design system spanning its Storefront, Seller Center, Admin Portal, and future Flutter mobile applications.

Historical marketing decks and presentation slides exhibited inconsistent colors, low-contrast button states, and occasional misuse of the globe mark (e.g. attempting to replace the letter "O" in "ALIFWORLD").

To guarantee high visual quality, enterprise trust, and accessibility:
1. Brand colors must strictly adhere to the locked palette defined in [`colors.md`](../../colors.md) and [`logo.png`](../../logo.png).
2. The globe mark must remain a standalone icon and never replace typography letters.
3. Contrast ratios must meet WCAG 2.1 AA/AAA requirements across the dark theme foundation.
4. UI components must be reusable, accessible Server and Client components.

A formal Architecture Decision Record is required to lock the design system architecture and brand token implementation.

---

## Decision Drivers

- **Brand Authority**: Absolute fidelity to approved brand assets (`colors.md`, `logo.png`).
- **WCAG 2.1 AA/AAA Accessibility**: Ensuring readable contrast ratios for Bangladesh e-commerce users.
- **Bilingual Font Rendering**: Native support for Bengali (`bn-BD`) and English (`en-BD`) typographic glyphs.
- **Token Portability**: Cross-platform token alignment between Next.js Tailwind CSS and Flutter mobile clients.

---

## Decision Outcome

The AlifWorld engineering architecture formally adopts the **Design System and Brand Tokens Architecture**:

### 1. Locked Brand Palette & Token Hierarchy
- Primitive tokens: Deep Black (`#000000`), Pure White (`#FFFFFF`), Brand Orange (`#FF6A00`), Globe Blues (`#4F8FD9`, `#69B7E8`, `#3456A3`).
- 3-tier hierarchy: Primitives -> Semantic Tokens (`src/styles/tokens.css`) -> Component Tokens (`src/components/ui/`).

### 2. Standalone Globe Mark Governance
- The globe mark is rendered via `AlifGlobeIcon` and `AlifLogo` in [`src/components/brand/logo.tsx`](../../src/components/brand/logo.tsx) with a 3D spherical radial gradient.
- The wordmark is strictly rendered as "ALIFWORLD" (ALIF in pure white, WORLD in brand orange). The globe mark is never substituted for the letter "O".

### 3. Atomic Design System Components
- Standardized atomic components implemented in `src/components/ui/`:
  - `Button`: Primary (orange), Secondary, Outline, Danger variants with visible focus rings.
  - `Badge`: Status badges (`default`, `orange`, `blue`, `success`, `warning`, `danger`).
  - `Card`: Translucent and elevated dark-surface cards.
  - `Input`: Accessible form inputs with brand orange focus rings and validation errors.
  - `Table`: Responsive dark-surface data tables.

### 4. Accessibility & Bilingual Typography
- All core text and action states validated against WCAG 2.1 AAA (8.5:1 for orange/black, 21:1 for white/black).
- Bilingual typography stack prioritizing native Bengali script rendering (`Tiro Bangla`, `SolaimanLipi`, `Kalpurush`).

---

## Consequences

### Positive:
- Delivers an authoritative, accessible, and high-fidelity visual experience across all web surfaces.
- Eliminates ad-hoc color styling and prevents brand degradation.
- Ensures atomic components are reusable, accessible, and keyboard-navigable.

### Negative:
- Developers must use design system primitives (`Button`, `Card`, `Badge`, `Input`) rather than composing raw HTML elements with ad-hoc classes.
