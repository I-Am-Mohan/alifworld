#!/usr/bin/env bash
set -euo pipefail

# AlifWorld Milestone 023 Git Commit Script
cd "$(dirname "$0")/.."

echo "📦 Staging changes for Milestone 023..."
git add prisma/schema.prisma \
        prisma/seed.ts \
        src/shared/utils/id.ts \
        src/shared/utils/phone.ts \
        src/shared/database/lifecycle.ts \
        src/features/identity/ \
        src/app/admin/ \
        tests/unit/phone-normalization.test.ts \
        tests/unit/user-role-permission.test.ts \
        tests/unit/rbac-service.test.ts \
        docs/architecture/user-roles-permissions-and-role-assignments.md \
        docs/decisions/0023-model-users-roles-permissions-and-role-assignments.md \
        docs/decisions/decision-log.md \
        README.md \
        AlifWorld-300-Milestones/023-model-users-roles-permissions-and-role-assignments.md \
        scripts/commit-milestone-023.sh

echo "📝 Committing Milestone 023..."
git commit -m "ft: model-users-roles-permissions-and-role-assignments"

echo "✅ Milestone 023 committed successfully!"
