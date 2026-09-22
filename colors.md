# AlifWorld Design System — Theme Colors & Visual Identity

The AlifWorld customer store and digital ecosystem uses an authoritative, modern, and accessible color palette derived from the approved customer storefront design:

- **Golden Amber / Brand Orange** (`#F59E0B` / `#FF6A00`) — Primary interactive CTAs (`Add to cart`), highlights, active indicators, and brand energy.
- **Deep Charcoal / Black** (`#161614` / `#000000`) — Luxury footer foundation, floating cart button, primary typography, high-contrast text.
- **Pure White & Soft Cream** (`#FFFFFF` / `#FAF9F6` / `#F8FAFC`) — Crisp card surfaces, clean canvas backgrounds, and high-readability containers.
- **Sky & Ocean Blues** (`#0A4B8C` / `#0284C7` / `#BAE6FD` / `#E0F2FE`) — Hero header atmosphere, primary hero CTA buttons, and international world elements.
- **In-Stock & WhatsApp Greens** (`#16A34A` / `#25D366`) — Verified in-stock indicators, discount tags, and direct customer support float.
- **Pastel Category Accents** — Soft-tinted backgrounds for trending category pills and promotional cards.

---

## 1. Master Color Palette

| Color Name | Hex Code | RGB | HSL | Usage Context |
|:---|:---:|:---:|:---:|:---|
| **Golden Amber (Primary CTA)** | `#F59E0B` | `rgb(245, 158, 11)` | `hsl(38, 92%, 50%)` | `Add to cart` buttons, "See All →" links, scroll-to-top button |
| **Brand Orange** | `#FF6A00` | `rgb(255, 106, 0)` | `hsl(25, 100%, 50%)` | Brand logo smile curve, active category underline, notification pills |
| **Deep Charcoal (Luxury Dark)** | `#161614` | `rgb(22, 22, 20)` | `hsl(60, 5%, 8%)` | Master footer background, dark containers |
| **Pure Black** | `#000000` | `rgb(0, 0, 0)` | `hsl(0, 0%, 0%)` | Button typography on Amber, brand wordmarks |
| **Dark Neutral** | `#18181B` | `rgb(24, 24, 27)` | `hsl(240, 6%, 10%)` | Floating cart action button, primary card headings |
| **Pure White** | `#FFFFFF` | `rgb(255, 255, 255)` | `hsl(0, 0%, 100%)` | Product cards, search input, hero highlights |
| **Canvas Off-White** | `#FAF9F6` | `rgb(250, 249, 246)` | `hsl(45, 23%, 97%)` | App background, subtle card borders |
| **Hero Deep Navy** | `#0A4B8C` | `rgb(10, 75, 140)` | `hsl(210, 87%, 29%)` | "Explore Now >" hero CTA button, smart picks badge |
| **Sky Tint (Header Wash)** | `#E0F2FE` | `rgb(224, 242, 254)` | `hsl(204, 94%, 94%)` | Top bar atmosphere, atmospheric header tint |
| **In-Stock Green** | `#16A34A` | `rgb(22, 163, 74)` | `hsl(142, 76%, 36%)` | `● In Stock` indicator, discount percentages |
| **WhatsApp Green** | `#25D366` | `rgb(37, 211, 102)` | `hsl(142, 70%, 49%)` | Floating WhatsApp customer service button |
| **Star Rating Gold** | `#F59E0B` | `rgb(245, 158, 11)` | `hsl(38, 92%, 50%)` | Review star ratings (`★ 5.0`) |

---

## 2. Pastel Category & Promotional Accents

Used across Trending Categories pills and promotional feature cards:

| Category Accent | Background Tint | Border / Icon Tint | Usage Context |
|:---|:---:|:---:|:---|
| **Peach / Coral** | `#FFEDD5` | `#FED7AA` / `#EA580C` | Luggage & Travel Gear, Fashion promos |
| **Lavender / Indigo** | `#EEF2FF` | `#E0E7FF` / `#6366F1` | Drugstore & Health, Electronics |
| **Warm Sand / Cream** | `#FEF3C7` | `#FDE68A` / `#D97706` | Shoe Collection Showcase, Lifestyle |
| **Soft Rose / Pink** | `#FCE7F3` | `#FBCFE8` / `#DB2777` | Clothing, Cosmetics, Beauty |
| **Mint Seafoam** | `#CCFBF1` | `#99F6E4` / `#0D9488` | Shoes, Wellness, Eco products |
| **Light Jade** | `#DCFCE7` | `#BBF7D0` / `#16A34A` | Skin & Hair Care, Organic |

---

## 3. UI Guidelines & Design Rules

1. **Customer-First Commerce Aesthetic**:
   - Clear, clean, and bright light-mode foundation with high-contrast cards and imagery.
   - Primary `Add to cart` action buttons use **Golden Amber (`#F59E0B`)** with bold black text (`#000000`) for maximum visual pop and 8.5:1 WCAG AAA contrast.
   - Hero buttons use **Deep Navy Blue (`#0A4B8C`)** with pure white text.
2. **Luxury Footer Aesthetic**:
   - Dark luxury footer in `#161614` with soft gray text (`#9CA3AF`), amber link accents, and rounded social circle badges.
3. **Floating Action Controls**:
   - Bottom-left: Floating Cart (`#18181B`) with orange count badge, and Floating WhatsApp (`#25D366`).
   - Bottom-right: Scroll to top floating button (`#F59E0B`).
4. **Mobile Navigation Bar**:
   - Fixed white glassmorphic bottom bar on mobile viewports with 5 core navigation destinations: Home, Categories, Watch, Bag, Account.

---

## 4. CSS Custom Properties

```css
:root {
  /* Primary Brand & CTA */
  --alif-amber: #F59E0B;
  --alif-amber-hover: #D97706;
  --alif-orange: #FF6A00;
  --alif-orange-hover: #E55F00;

  /* Surfaces & Foundation */
  --alif-white: #FFFFFF;
  --alif-cream: #FAF9F6;
  --alif-black: #000000;
  --alif-charcoal: #18181B;
  --alif-footer-bg: #161614;

  /* Sky & Ocean Accents */
  --alif-hero-navy: #0A4B8C;
  --alif-sky-tint: #E0F2FE;
  --alif-globe-blue: #0284C7;
  --alif-globe-light: #38BDF8;

  /* Semantic Feedback & Direct Support */
  --alif-stock-green: #16A34A;
  --alif-whatsapp: #25D366;
  --alif-rating-gold: #F59E0B;

  /* Pastel Category Backgrounds */
  --alif-pastel-peach: #FFEDD5;
  --alif-pastel-lavender: #EEF2FF;
  --alif-pastel-sand: #FEF3C7;
  --alif-pastel-rose: #FCE7F3;
  --alif-pastel-mint: #CCFBF1;
  --alif-pastel-jade: #DCFCE7;
}
```
