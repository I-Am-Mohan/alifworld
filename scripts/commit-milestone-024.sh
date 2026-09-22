#!/usr/bin/env bash
set -euo pipefail

# AlifWorld Milestone 024 Git Commit Script
cd "$(dirname "$0")/.."

echo "📦 Staging changes for Milestone 024..."
git add prisma/schema.prisma \
        prisma/seed.ts \
        src/shared/utils/id.ts \
        src/shared/database/lifecycle.ts \
        src/features/seller/ \
        src/app/seller/ \
        src/app/admin/ \
        tests/unit/seller-domain.test.ts \
        tests/unit/seller-kyc-service.test.ts \
        tests/unit/seller-tenant-isolation.test.ts \
        docs/architecture/seller-staff-kyc-and-store-settings.md \
        docs/decisions/0024-model-sellers-seller-staff-kyc-documents-and-store-settings.md \
        docs/decisions/decision-log.md \
        README.md \
        AlifWorld-300-Milestones/024-model-sellers-seller-staff-kyc-documents-and-store-settings.md \
        scripts/commit-milestone-024.sh

echo "📝 Committing Milestone 024..."
git commit -m "ft: model-sellers-seller-staff-kyc-documents-and-store-settings"

echo "✅ Milestone 024 committed successfully!"
