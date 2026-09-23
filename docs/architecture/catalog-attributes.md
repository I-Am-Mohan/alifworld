# Catalog Attributes and Variant Option Sets

Milestone 074 adds governed, normalized catalog attributes without removing the legacy flattened variant option columns.

## Contract

- Administrators create and maintain globally governed attributes and values.
- Administrators assign active attributes to categories, including required and variant-defining flags.
- Seller owners and seller staff manage option sets and normalized variant options only within their seller product scope.
- Public category and attribute-value reads expose active governed records only.
- Values must belong to the referenced attribute and must be active for new option-set or variant-option assignments.
- A product option set has one record per attribute and one or more allowed values.
- A variant has at most one option per attribute. Existing `option1`–`option3` fields remain as a compatibility layer.
- Product and variant updates use optimistic version checks.

## Persistence and migration

Migration `20260923130000_catalog_attributes` adds attributes, values, category assignments, product attribute values, product option sets, option-set values, and normalized variant options. The migration is additive and preserves existing product variant fields and relations.

## API

Admin routes manage global attributes, values, and category assignments. Public routes read active category contracts and values. Seller routes replace product option sets and normalized variant options with seller-scope checks.

## Deferred work

Variant matrix completeness and product publication readiness integration will be completed with the product approval workflow. No financial, tax, Product Point, or reward behavior is introduced by this milestone.
