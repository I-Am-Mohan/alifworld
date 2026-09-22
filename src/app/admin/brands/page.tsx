'use client';
import React from 'react';
import { Award } from 'lucide-react';
import { AdminPlaceholderPage } from '@/components/admin/admin-placeholder-page';

export default function BrandsAdminPage() {
  return (
    <AdminPlaceholderPage
      category="Catalog"
      title="Brands"
      description="Official brand registry, authorized merchant distributor licenses, verified brand badges, and trademark rights management."
      icon={Award}
      features={[
        'Official brand directory with high-resolution vector logos',
        'Authorized seller brand distribution authorization management',
        'Verified Official Brand badge verification on storefront cards',
      ]}
    />
  );
}
