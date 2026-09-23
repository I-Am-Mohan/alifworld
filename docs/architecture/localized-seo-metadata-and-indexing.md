# Milestone 059 SEO contract

## URL strategy

- `bn-BD` is the default locale and uses the unprefixed public URL (`/products`).
- `en-BD` uses an explicit locale prefix (`/en-BD/products`).
- Every indexable public page emits a locale-specific canonical URL, reciprocal `hreflang` alternates, and `x-default` pointing to the Bengali default URL.
- `APP_URL`/`NEXT_PUBLIC_APP_URL` is the source of truth for absolute metadata URLs.

## Indexing policy

- Storefront home and product listing/detail surfaces are indexable.
- Admin, Seller, account, authentication, cart, wallet, checkout, order, verification, and API paths are excluded with `noindex,nofollow` metadata where applicable and `robots.txt` disallow rules.
- The sitemap includes only public home and product-listing locale variants. Private or operational paths are not listed.

## Structured data

- Storefront emits Organization JSON-LD.
- Product pages emit BreadcrumbList JSON-LD with locale-aware absolute URLs.
- Product schema fields should be added only when product data is server-backed and authoritative; demo client-only data is not emitted as fabricated structured data.

## Operational notes

- This milestone does not add a database migration or external SEO provider dependency.
- Product detail metadata currently uses the route slug for safe server-rendered title/description generation; authoritative product schema and server-backed product metadata remain follow-up work when the product page is migrated to server data.
