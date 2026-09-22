#!/usr/bin/env bash
set -euo pipefail

# AlifWorld Milestone 026 Git Commit Script
cd "$(dirname "$0")/.."

echo "📦 Staging changes for Milestone 026..."
git add prisma/schema.prisma \
        prisma/seed.ts \
        src/shared/utils/id.ts \
        src/shared/database/lifecycle.ts \
        src/features/inventory/ \
        src/app/seller/inventory/ \
        src/app/seller/page.tsx \
        src/app/admin/warehouses/ \
        src/app/admin/page.tsx \
        tests/unit/inventory-domain.test.ts \
        tests/unit/inventory-reservation.test.ts \
        tests/unit/inventory-concurrency.test.ts \
        docs/architecture/warehouse-inventory-and-stock-movements.md \
        docs/decisions/0026-model-warehouses-inventory-balances-and-stock-movements.md \
        docs/decisions/decision-log.md \
        README.md \
        AlifWorld-300-Milestones/026-model-warehouses-inventory-balances-and-stock-movements.md \
        scripts/commit-milestone-026.sh

echo "📝 Committing Milestone 026..."
git commit -m "ft: model-warehouses-inventory-balances-and-stock-movements"

echo "✅ Milestone 026 committed successfully!"
