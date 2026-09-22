#!/usr/bin/env bash
set -euo pipefail

# AlifWorld Design System & UI Overhaul Commit Script
# Transforms all pages and components to Pure Light Theme (no dark mode),
# with AlifWorld brand colors, white/cream foundation, orange primary buttons,
# black secondary buttons, and globe blue/cyan accents.

cd "$(dirname "$0")/.."

echo "📦 Staging Light Theme UI & Component changes for AlifWorld..."
git add next.config.mjs \
        tailwind.config.ts \
        src/styles/tokens.css \
        src/app/globals.css \
        src/app/layout.tsx \
        src/components/brand/logo.tsx \
        src/components/ui/button.tsx \
        src/components/ui/card.tsx \
        src/components/ui/badge.tsx \
        src/components/ui/input.tsx \
        src/components/ui/table.tsx \
        src/app/page.tsx \
        src/app/products/page.tsx \
        src/app/products/\[slug\]/page.tsx \
        src/app/seller/page.tsx \
        src/app/seller/products/page.tsx \
        src/app/seller/inventory/page.tsx \
        src/app/seller/settings/page.tsx \
        src/app/seller/kyc/page.tsx \
        src/app/seller/staff/page.tsx \
        src/app/admin/page.tsx \
        src/app/admin/users/page.tsx \
        src/app/admin/roles/page.tsx \
        src/app/admin/sellers/page.tsx \
        src/app/admin/categories/page.tsx \
        src/app/admin/warehouses/page.tsx \
        scripts/commit-ui-light-theme.sh

echo "📝 Committing Light Theme UI Overhaul..."
git commit -m "feat(ui): overhaul all pages and components to real light theme with AlifWorld brand identity"

echo "✅ AlifWorld Light Theme UI Overhaul committed successfully!"
