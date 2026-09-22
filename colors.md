# Alif World --- Theme Colors

The design language uses four core visual ideas:

-   **Black** --- strong, modern foundation
-   **White** --- clean typography and contrast
-   **Orange** --- energy, action, and brand highlights
-   **World Blues** --- globe, international/global identity

## Color Palette

  -----------------------------------------------------------------------
  Color                   Hex                     Usage
  ----------------------- ----------------------- -----------------------
  Black                   `#000000`               Main background,
                                                  navbar, footer, dark
                                                  sections

  White                   `#FFFFFF`               Main text, logos,
                                                  cards, icons

  Brand Orange            `#FF6A00`               CTA buttons, links,
                                                  highlights, active
                                                  states

  Globe Blue              `#4F8FD9`               Globe elements,
                                                  secondary accents

  Globe Light Blue        `#69B7E8`               Globe highlights and
                                                  subtle accents

  Globe Dark Blue         `#3456A3`               Globe shadows and depth
  -----------------------------------------------------------------------

## UI Direction

-   Use **black + white** as the primary foundation.
-   Use **orange** as the main interactive/brand accent.
-   Use **blue shades** primarily for global/world-related elements.
-   Keep the interface clean, bold, and high-contrast.
-   The **globe should be treated as a logo/icon**, not as the letter
    `O`.
-   Avoid introducing many additional colors so the Alif World identity
    stays consistent.

## CSS Variables

``` css
:root {
  --alif-black: #000000;
  --alif-white: #FFFFFF;
  --alif-orange: #FF6A00;

  --alif-globe-blue: #4F8FD9;
  --alif-globe-light: #69B7E8;
  --alif-globe-dark: #3456A3;
}
```
