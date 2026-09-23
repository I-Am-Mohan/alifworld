# Seller Catalog Onboarding Templates and Guidance

Milestone 077 adds configurable, localized onboarding guidance for seller catalog work.

## Contract

- Administrators manage active onboarding templates scoped to a category or global catalog scope.
- Templates are localized for `bn-BD` and `en-BD` and contain required fields, recommended fields, attribute guidance, media guidance, examples, and validation hints.
- Seller owners and seller staff can read and update progress only for their own seller tenant. Admins may inspect progress through the service boundary.
- Progress is stored by seller and template, is idempotent through an upsert, and includes a calculated required-field completion percentage.
- Guidance is informational and does not grant product mutation, approval, publication, commission, payout, or other protected permissions.

## Persistence

Migration `20260923160000_seller_catalog_onboarding` adds `CatalogOnboardingTemplate` and `SellerCatalogOnboardingProgress`. Template versions are copied into progress records so changes remain observable.

## API and UI

Public category guidance is available through `/api/v1/catalog/categories/{id}/onboarding-template`. Seller progress is available through `/api/v1/seller/catalog/onboarding` and its progress mutation route. Admins can create and update templates. The Seller Catalog page links to a responsive onboarding guidance screen with loading, empty, error, retry, and completion states.

## Security

Seller IDs are resolved from the authenticated actor scope and checked inside the service against the seller owner/staff relationship. The API never accepts an arbitrary seller ID for normal seller progress operations.
