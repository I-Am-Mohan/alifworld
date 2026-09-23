# Hierarchical category taxonomy

## Contract

Categories are self-referencing taxonomy nodes with lowercase unique slugs, optional parent IDs, display order, active state, and optimistic versions. Public consumers receive only active nodes. Admin catalog operators can create and update nodes; seller users cannot mutate taxonomy.

The hierarchy builder loads active records and assembles all descendants recursively. Updates reject self-parenting and descendant-parenting cycles by walking the proposed ancestor chain before persistence. Parent absence and duplicate slugs return stable not-found/conflict errors.

## APIs

- `GET /api/v1/categories` — public active recursive tree.
- `GET/POST /api/v1/admin/categories` — authorized category administration tree/create.
- `PATCH /api/v1/admin/categories/{id}` — authorized optimistic category update.

Tax rate fields remain category configuration metadata. No new tax calculation, financial, reward, or commission behavior is introduced.
