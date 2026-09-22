import React from 'react';
import { RotateCcw } from 'lucide-react';
import { AdminPlaceholderPage } from '@/components/admin/admin-placeholder-page';

export default function AdminReturnsPage() {
  return (
    <AdminPlaceholderPage
      category="Overview"
      title="Returns"
      description="Manage customer parcel returns, dispute reviews, merchant claims, and refund ledger allocations."
      icon={RotateCcw}
      features={[
        '7-day return request queue and merchant dispute mediation',
        'Reverse logistics courier pickup tracking with Pathao / RedX',
        'Automatic minor poisha refund posting to Customer Main Wallet',
      ]}
    />
  );
}
