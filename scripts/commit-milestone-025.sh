#!/usr/bin/env bash
set -euo pipefail

# AlifWorld Milestone 025 Git Commit Script
cd "$(dirname "$0")/.."

echo "📦 Staging changes for Milestone 025..."
git add prisma/schema.prisma \
        prisma/seed.ts \
        src/shared/utils/id.ts \
        src/shared/database/lifecycle.ts \
        src/features/catalog/ \
        src/app/seller/ \
        src/app/admin/ \
        src/app/products/ \
        tests/unit/catalog-domain.test.ts \
        tests/unit/catalog-product-service.test.ts \
        tests/unit/catalog-tax-service.test.ts \
        docs/architecture/catalog-taxonomy-products-and-media.md \
        docs/decisions/0025-model-catalog-taxonomy-products-variants-and-media.md \
        docs/decisions/decision-log.md \
        README.md \
        AlifWorld-300-Milestones/025-model-catalog-taxonomy-products-variants-and-media.md \
        scripts/commit-milestone-025.sh

echo "📝 Committing Milestone 025..."
git commit -m "ft: model-catalog-taxonomy-products-variants-and-media"

echo "✅ Milestone 025 committed successfully!"
