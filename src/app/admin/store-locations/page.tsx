import React from 'react';
import { MapPin } from 'lucide-react';
import { AdminPlaceholderPage } from '@/components/admin/admin-placeholder-page';

export default function AdminStoreLocationsPage() {
  return (
    <AdminPlaceholderPage
      category="People"
      title="Store Locations"
      description="Merchant warehouse hubs, pickup hubs across 8 Bangladesh administrative divisions, and courier dispatch stations."
      icon={MapPin}
      features={[
        'Geographic mapping across Dhaka, Chittagong, Sylhet, Rajshahi, etc.',
        'Registered pickup addresses and courier API hub code bindings',
        'Return warehouse routing and parcel consolidation points',
      ]}
    />
  );
}
