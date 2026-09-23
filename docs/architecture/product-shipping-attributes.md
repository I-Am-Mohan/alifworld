# Product Weight, Dimensions, Tax, and Shipping Attributes

Milestone 087 adds explicit physical and shipping attributes to products while preserving the effective-date tax foundation from milestone 075.

## Product attributes

Products now support:

- Weight in grams
- Length, width, and height in millimetres
- Shipping class
- `requiresShipping` flag
- Existing product/category tax overrides and effective-date tax rule resolution

Values are validated as non-negative physical measurements. Shipping classification is descriptive configuration; no courier rate or fee is invented here.

## Persistence

Migration `20260923200000_product_shipping_attributes` adds product dimensions, shipping class, and shipping-required fields. Existing `weightGrams` and tax fields remain compatible.

## Integrity

The product draft and update APIs carry these fields through the seller-scoped service/repository path. Publication readiness and tax services continue to validate BDT pricing, Product Points, active taxonomy, and effective-date tax rules. Order-item tax and Product Point snapshots remain historical and immutable.
