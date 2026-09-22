# AlifWorld Brand Identity & Design Tokens

**Document Type**: Visual Brand Authority & Token Specification  
**Source Assets**: `colors.md`, `logo.png`  
**Milestone Reference**: [Milestone 001](../../AlifWorld-300-Milestones/001-project-charter-source-authority-and-ai-execution-protocol.md)  
**Status**: Authoritative & Mandatory  

---

## 1. Brand Essence & Visual Language

AlifWorld’s visual language communicates bold confidence, global reach, and seamless commercial reliability. Rooted in four core visual ideas:

1. **Deep Black (`#000000`)**: Strong, modern, high-contrast foundation for main backgrounds, navigation bars, footers, and dark mode surfaces.
2. **Pure White (`#FFFFFF`)**: Clean typography, high contrast, inverted cards, icons, and crisp readability.
3. **Brand Orange (`#FF6A00`)**: High-energy accent driving all calls-to-action (CTAs), primary buttons, active highlights, notification badges, and the signature Alif smile.
4. **World Blues (`#4F8FD9`, `#69B7E8`, `#3456A3`)**: International identity, globe elements, geographic hierarchy, and subtle secondary accents.

---

## 2. Master Color Palette

| Token Name | Hex Code | RGB | HSL | Semantic Role |
|:---|:---:|:---:|:---:|:---|
| `--alif-black` | `#000000` | `rgb(0, 0, 0)` | `hsl(0, 0%, 0%)` | Main background, header/footer, dark containers |
| `--alif-white` | `#FFFFFF` | `rgb(255, 255, 255)` | `hsl(0, 0%, 100%)` | Primary typography, light containers, inverted elements |
| `--alif-orange` | `#FF6A00` | `rgb(255, 106, 0)` | `hsl(25, 100%, 50%)` | Primary CTA, links, active tab indicator, brand accent |
| `--alif-globe-blue` | `#4F8FD9` | `rgb(79, 143, 217)` | `hsl(212, 65%, 58%)` | Globe oceans, secondary badges, regional indicators |
| `--alif-globe-light` | `#69B7E8` | `rgb(105, 183, 232)` | `hsl(203, 75%, 66%)` | Globe landmass highlights, soft badges, hover tints |
| `--alif-globe-dark` | `#3456A3` | `rgb(52, 86, 163)` | `hsl(222, 52%, 42%)` | Globe shadows, deep accents, borders |

---

## 3. Standard Token Implementation

### 3.1 CSS Variables (`styles/tokens.css` / `globals.css`)
```css
:root {
  /* Primitive Brand Colors */
  --alif-black: #000000;
  --alif-white: #FFFFFF;
  --alif-orange: #FF6A00;
  --alif-globe-blue: #4F8FD9;
  --alif-globe-light: #69B7E8;
  --alif-globe-dark: #3456A3;

  /* Semantic UI Tokens - Dark Theme Foundation (Default) */
  --alif-bg-app: var(--alif-black);
  --alif-bg-surface: #111111;
  --alif-bg-card: #181818;
  --alif-bg-elevated: #222222;

  --alif-text-primary: var(--alif-white);
  --alif-text-secondary: #A0A0A0;
  --alif-text-muted: #707070;

  --alif-border-subtle: #2A2A2A;
  --alif-border-strong: #404040;

  /* Interactive Elements */
  --alif-btn-primary-bg: var(--alif-orange);
  --alif-btn-primary-text: var(--alif-black);
  --alif-btn-primary-hover: #E55F00;
  --alif-btn-primary-focus: #FF8533;

  /* Global Accent */
  --alif-accent-globe: var(--alif-globe-blue);
  --alif-accent-globe-hover: var(--alif-globe-light);
}
```

### 3.2 TypeScript Token Definitions (`shared/constants/colors.ts`)
```typescript
export const ALIF_COLORS = {
  black: '#000000',
  white: '#FFFFFF',
  orange: '#FF6A00',
  globeBlue: '#4F8FD9',
  globeLight: '#69B7E8',
  globeDark: '#3456A3',
} as const;

export type AlifColorToken = keyof typeof ALIF_COLORS;
```

---

## 4. Logo & Iconography Governance

Derived from `logo.png`:

```
           A L I F  ( ) <-- Globe Icon (#4F8FD9 / #69B7E8)
            \______/ ->  <-- Orange Smile Curve (#FF6A00)
```

1. **Typographic Wordmark ("ALIF")**: Rendered in high-contrast solid white (`#FFFFFF`) against black surfaces, or solid black (`#000000`) against pure white surfaces.
2. **The Globe Icon**: 
   - Placed immediately to the right of the wordmark "ALIF".
   - Rendered with ocean blue (`#4F8FD9`), light blue land masses (`#69B7E8`), and dark blue shadow contours (`#3456A3`).
   - **Critical Invariant**: The globe is a distinct emblem and brand icon. **Never substitute the globe as the letter 'O' in spelling words.**
3. **The Alif Smile**:
   - An energetic curved swoosh in Brand Orange (`#FF6A00`) starting beneath the 'A' and sweeping gently upward under the wordmark, culminating in an arrow pointing up toward the globe.
   - Symbolizes forward momentum, delivery speed, and customer delight.
4. **Forbidden Brand Distortions**:
   - Do not alter the orange hue to red, yellow, or pink.
   - Do not apply artificial gradients or drop shadows to the wordmark "ALIF".
   - Do not separate the smile curve from the logo mark without approval.
   - Maintain a minimum clear space equal to 50% of the globe diameter around the entire mark.

---

## 5. Accessibility & Contrast Ratios

All UI components built in AlifWorld must satisfy **WCAG 2.1 Level AA** (and Level AAA for primary reading copy):

| Element Combination | Contrast Ratio | WCAG Compliance | Usage Context |
|:---|:---:|:---:|:---|
| Pure White (`#FFFFFF`) on Deep Black (`#000000`) | **21.0:1** | AAA Pass | Primary body text, headings, icons |
| Deep Black (`#000000`) on Brand Orange (`#FF6A00`) | **7.4:1** | AAA Pass | Primary CTA button text (`bg-orange text-black font-bold`) |
| Pure White (`#FFFFFF`) on Brand Orange (`#FF6A00`) | **2.8:1** | *Fail for Body Text* | **Prohibited**: Never place white text on brand orange buttons. Always use black text. |
| Globe Light Blue (`#69B7E8`) on Deep Black (`#000000`) | **8.1:1** | AAA Pass | Geographic tags, secondary badges |
| Globe Blue (`#4F8FD9`) on Deep Black (`#000000`) | **5.3:1** | AA Pass | Secondary icons, links |
