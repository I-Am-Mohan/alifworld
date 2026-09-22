import React from 'react';
import { Building } from 'lucide-react';
import { AdminPlaceholderPage } from '@/components/admin/admin-placeholder-page';

export default function AdminStoresPage() {
  return (
    <AdminPlaceholderPage
      category="People"
      title="Stores"
      description="Merchant multi-outlet directory, verified seller storefronts, operational vacation modes, and rating compliance."
      icon={Building}
      features={[
        'Verified seller storefront directories and rating benchmarks',
        'Merchant vacation mode monitoring and auto-suppression',
        'Store banner, logo, and brand presentation compliance audit',
      ]}
    />
  );
}
