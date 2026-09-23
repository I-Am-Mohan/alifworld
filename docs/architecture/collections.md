# Curated and Rule-Based Collections

Collections provide admin-governed storefront groupings without bypassing catalog publication controls.

## Types

- `CURATED`: explicit product memberships managed by administrators.
- `RULE_BASED`: bounded rules translated by the catalog service; arbitrary Prisma filters are not accepted.
- `DRAFT`, `PUBLISHED`, and `ARCHIVED` lifecycle states.

Public endpoints expose only active, published collections. Curated collections require at least one membership before publication. Membership replacement is optimistic-version protected and rejects duplicate product IDs.

## Governance

Only platform administrators can create, update, publish, archive, or replace collection memberships. Product references must exist and must not be soft-deleted. Collection mutations write audit records and use version checks to prevent lost updates.

Rule criteria are intentionally bounded to publication status, category, brand, seller, integer poisha price ranges, and product tags. Financial behavior, tax, commission, reward, and search-ranking behavior are outside this milestone.
