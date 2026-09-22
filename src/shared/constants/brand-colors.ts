/**
 * Authoritative Brand Color Tokens for AlifWorld
 * Derived from colors.md and logo.png
 */

export const ALIF_BRAND_COLORS = {
  /** Main background, navbar, footer, dark sections */
  black: '#000000',
  /** Main text, logos, cards, icons */
  white: '#FFFFFF',
  /** CTA buttons, links, highlights, active states */
  orange: '#FF6A00',
  /** Globe elements, secondary accents */
  globeBlue: '#4F8FD9',
  /** Globe highlights and subtle accents */
  globeLightBlue: '#69B7E8',
  /** Globe shadows and depth */
  globeDarkBlue: '#3456A3',
} as const;

export type AlifBrandColorKey = keyof typeof ALIF_BRAND_COLORS;

/**
 * Functional Semantic Color Mappings
 */
export const ALIF_SEMANTIC_THEME = {
  background: {
    app: ALIF_BRAND_COLORS.black,
    surface: '#111111',
    card: '#181818',
    elevated: '#222222',
  },
  text: {
    primary: ALIF_BRAND_COLORS.white,
    secondary: '#A0A0A0',
    muted: '#707070',
    inverse: ALIF_BRAND_COLORS.black,
  },
  interactive: {
    primary: ALIF_BRAND_COLORS.orange,
    primaryHover: '#E55F00',
    primaryFocus: '#FF8533',
    disabled: '#333333',
  },
  accent: {
    globe: ALIF_BRAND_COLORS.globeBlue,
    globeHighlight: ALIF_BRAND_COLORS.globeLightBlue,
    globeShadow: ALIF_BRAND_COLORS.globeDarkBlue,
  },
} as const;
