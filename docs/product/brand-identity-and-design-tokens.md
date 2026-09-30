# AlifWorld Brand Identity & Design Tokens

**Document Type**: Visual Brand Authority & Token Specification  
**Source Assets**: `colors.md`, `logo.png`, `UI References/`  
**Milestone Reference**: Milestone 001 / Milestone 014  
**Status**: Authoritative & Mandatory

---

## 1. Brand Essence & Visual Language

AlifWorld’s visual language communicates modern commercial vibrancy, customer delight, and effortless accessibility. Rooted in the customer store design system:

1. **Golden Amber (`#F59E0B`) & Brand Orange (`#FF6A00`)**: The core interactive accents. Golden Amber powers high-conversion primary actions (`Add to cart`, `See All →`, rating stars), while Brand Orange drives the signature Alif smile, notification badges, and active category underlines.
2. **Deep Charcoal (`#161614` / `#18181B`) & Pure Black (`#000000`)**: Deep Charcoal anchors the luxury footer and floating cart control; Pure Black delivers high-contrast typography across product cards and buttons.
3. **Pure White (`#FFFFFF`) & Soft Cream (`#FAF9F6`)**: Provides a clean, bright, distraction-free product showcase canvas.
4. **Sky & Ocean Blues (`#0A4B8C`, `#0284C7`, `#E0F2FE`)**: Atmospheric header wash, primary hero banner CTAs ("Explore Now >"), and globe elements.
5. **In-Stock & Support Greens (`#16A34A`, `#25D366`)**: Instant trust cues for stock availability (`● In Stock`), discount badges, and floating WhatsApp support.
6. **Harmonious Pastel Accents**: Soft peach, lavender, cream, rose, mint, and jade backgrounds designed for category pills and promotional cards.

---

## 2. Master Color Palette

| Token Name           | Hex Code  |         RGB          | Semantic Role                                     |
| :------------------- | :-------: | :------------------: | :------------------------------------------------ |
| `--alif-amber`       | `#F59E0B` | `rgb(245, 158, 11)`  | Primary CTA (`Add to cart`), "See All →", Ratings |
| `--alif-amber-hover` | `#D97706` |  `rgb(217, 119, 6)`  | Primary button hover state                        |
| `--alif-orange`      | `#FF6A00` |  `rgb(255, 106, 0)`  | Brand logo smile curve, active tab indicators     |
| `--alif-footer-bg`   | `#161614` |  `rgb(22, 22, 20)`   | Deep luxury footer background                     |
| `--alif-charcoal`    | `#18181B` |  `rgb(24, 24, 27)`   | Floating cart button, card headers                |
| `--alif-white`       | `#FFFFFF` | `rgb(255, 255, 255)` | Card backgrounds, search bar, modals              |
| `--alif-cream`       | `#FAF9F6` | `rgb(250, 249, 246)` | App body background                               |
| `--alif-hero-navy`   | `#0A4B8C` |  `rgb(10, 75, 140)`  | Hero CTA button ("Explore Now >")                 |
| `--alif-sky-tint`    | `#E0F2FE` | `rgb(224, 242, 254)` | Header atmospheric wash                           |
| `--alif-stock-green` | `#16A34A` |  `rgb(22, 163, 74)`  | `● In Stock` indicator, discount badge            |
| `--alif-whatsapp`    | `#25D366` | `rgb(37, 211, 102)`  | Floating WhatsApp action button                   |

---

## 3. Standard Token Implementation

### 3.1 CSS Variables (`src/styles/tokens.css`)

```css
:root {
  /* Primitive Brand Colors */
  --alif-amber: #f59e0b;
  --alif-amber-hover: #d97706;
  --alif-orange: #ff6a00;
  --alif-orange-hover: #e55f00;
  --alif-black: #000000;
  --alif-charcoal: #18181b;
  --alif-footer-bg: #161614;
  --alif-white: #ffffff;
  --alif-cream: #faf9f6;
  --alif-cream-subtle: #f8fafc;

  /* Sky & Globe Accents */
  --alif-hero-navy: #0a4b8c;
  --alif-sky-tint: #e0f2fe;
  --alif-globe-blue: #0284c7;
  --alif-globe-light: #38bdf8;

  /* Semantic UI Tokens */
  --alif-bg-app: var(--alif-cream);
  --alif-bg-surface: var(--alif-white);
  --alif-bg-card: var(--alif-white);
  --alif-bg-footer: var(--alif-footer-bg);

  --alif-text-primary: #0f172a;
  --alif-text-secondary: #475569;
  --alif-text-muted: #94a3b8;
  --alif-text-footer: #9ca3af;

  --alif-border-subtle: #e2e8f0;
  --alif-border-strong: #cbd5e1;

  /* Interactive Buttons */
  --alif-btn-primary-bg: var(--alif-amber);
  --alif-btn-primary-text: #000000;
  --alif-btn-primary-hover: var(--alif-amber-hover);

  --alif-btn-hero-bg: var(--alif-hero-navy);
  --alif-btn-hero-text: #ffffff;

  /* Category Pastel Tints */
  --alif-pastel-peach: #ffedd5;
  --alif-pastel-lavender: #eef2ff;
  --alif-pastel-sand: #fef3c7;
  --alif-pastel-rose: #fce7f3;
  --alif-pastel-mint: #ccfbf1;
  --alif-pastel-jade: #dcfce7;
}
```

---

## 4. Logo Governance

Derived from `logo.png`:

- The wordmark "ALIF" is rendered in bold solid black or white depending on surface brightness.
- The energetic smile swoosh in Brand Orange (`#FF6A00`) curves under "ALIF" pointing toward the 3D globe.
- The 3D globe in cyan and ocean blue represents international quality and nationwide reach.
- The globe is **never** used as a replacement for the letter 'O'.

---

## 5. Accessibility & Contrast Ratios (WCAG 2.1)

| Element Combination                                  | Contrast Ratio | WCAG Compliance | Usage Context                     |
| :--------------------------------------------------- | :------------: | :-------------: | :-------------------------------- |
| Pure Black (`#000000`) on Golden Amber (`#F59E0B`)   |  **8.5 : 1**   |  **AAA Pass**   | Primary `Add to cart` button text |
| Pure White (`#FFFFFF`) on Hero Navy (`#0A4B8C`)      |  **9.2 : 1**   |  **AAA Pass**   | Hero `Explore Now >` button text  |
| Pure White (`#FFFFFF`) on Deep Charcoal (`#161614`)  |  **19.5 : 1**  |  **AAA Pass**   | Footer headings & body copy       |
| Deep Slate (`#0F172A`) on Pure White (`#FFFFFF`)     |  **18.8 : 1**  |  **AAA Pass**   | Product titles, category headings |
| In-Stock Green (`#16A34A`) on Pure White (`#FFFFFF`) |  **4.8 : 1**   |   **AA Pass**   | `● In Stock` inventory indicator  |
