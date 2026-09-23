# Seller banking and payout profiles

## Contract

Seller payout profiles are separate from seller store settings and settlement rows. A profile stores only encrypted account, routing, and account-title references plus safe metadata: provider name, last four digits, fingerprint, verification status, version, and audit ownership. Raw account/routing values are never returned, logged, or persisted in plaintext.

Profiles are seller-scoped at every repository query. Seller owners may replace or deactivate their own primary profile. Seller staff are denied mutation by default. Payout execution, settlement approval, provider calls, and financial formulas are intentionally outside this milestone; the existing mock finance disbursement action is disabled rather than treated as a real payout path.

## Security

Sensitive fields use AES-256-GCM with a server-only `PAYOUT_PROFILE_ENCRYPTION_KEY`, random nonce, authentication tag, and versioned ciphertext. Account fingerprints support duplicate detection and last-four values support safe display. Production must provide a managed secret rather than the local development default.

## APIs

- `GET /api/v1/seller/payout-profile`
- `PUT /api/v1/seller/payout-profile`

The update operation uses seller ownership, optimistic versioning, primary-profile replacement, duplicate detection, audit logging, and safe response serialization.
