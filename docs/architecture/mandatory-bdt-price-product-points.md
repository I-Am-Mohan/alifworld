# Mandatory BDT Price and Seller-Defined Product Points

Milestone 084 makes product and variant commercial fields explicit at validation and service boundaries.

## Contract

- Product creation requires `currency: BDT`, a positive integer `basePricePoisha`, and a non-negative seller-defined `productPoint`.
- Variant creation requires positive integer `pricePoisha` and a non-negative `productPoint`.
- Product price and Product Point remain independent values; no conversion or derived formula is introduced.
- Publication readiness rejects non-BDT currency, non-positive price, or invalid Product Point values.
- Existing order-item `productPointSnapshot` and `totalProductPoints` fields remain the historical snapshot boundary.

## Compatibility and integrity

The change is validation/service focused and does not rewrite historical orders or snapshots. Bulk imports already require `basePricePoisha` and `productPoint`; draft editor requests send explicit BDT and Product Point values. Admin moderation cannot silently alter Product Points.
