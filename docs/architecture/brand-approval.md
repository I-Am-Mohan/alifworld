# Brand registry and approval

Brands are governed catalog entities. New brands enter `PENDING` approval and are not returned by the public brand endpoint until an authorized Admin sets `APPROVED`. Rejected brands retain a bounded rejection reason and may be reviewed again through an optimistic versioned action.

## APIs

- `GET /api/v1/brands` returns active approved brands for public catalog use.
- `GET/POST /api/v1/admin/brands` lists and creates Admin brand records.
- `POST /api/v1/admin/brands/{id}/review` approves or rejects a brand with the current version and optional rejection reason.

Brand approval does not grant seller distribution authorization; that policy remains a later catalog capability. No financial or reward behavior is changed.
