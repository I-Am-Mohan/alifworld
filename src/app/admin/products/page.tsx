import React from 'react';
import { Package } from 'lucide-react';
import { AdminPlaceholderPage } from '@/components/admin/admin-placeholder-page';

export default function AdminProductsPage() {
  return (
    <AdminPlaceholderPage
      category="Catalog"
      title="Products"
      description="Manage marketplace product listings, SKU variants, media galleries, pricing in integer poisha, and Product Points."
      icon={Package}
      features={[
        'Full catalog SKU search and inventory status monitoring',
        'Independent BDT price and Product Point governance',
        'Multi-image S3 media uploads and variant option matrices',
      ]}
    />
  );
}
