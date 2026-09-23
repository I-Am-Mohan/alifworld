# Variant Combination Generation and Validation

Milestone 082 adds deterministic variant matrix support on top of governed product option sets.

## Contract

- Variant combinations are the Cartesian product of variant-defining option-set values.
- Duplicate value IDs within an option set are removed before generation.
- Generation is bounded by a caller-provided maximum, capped at 1,000 combinations.
- Validation detects missing required variant-defining attributes, duplicate attributes, and duplicate option signatures.
- Existing normalized `ProductVariantOption` records and legacy flattened option fields remain compatible.

## API

- `GET /api/v1/seller/catalog/products/{id}/variant-combinations` generates titled combinations from the product's governed option sets.
- `GET /api/v1/seller/catalog/products/{id}/variant-validation` returns a deterministic validation report for existing variants.
- Existing variant option replacement remains available through the normalized options endpoint and retains optimistic version protection.

## Integrity

Variant generation does not invent price, Product Point, SKU, inventory, or financial behavior. Those values remain explicit variant/product fields and are handled by later catalog workflows.
