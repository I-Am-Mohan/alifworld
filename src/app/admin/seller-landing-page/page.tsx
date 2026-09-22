'use client';
import React from 'react';
import { Store } from 'lucide-react';
import { AdminPlaceholderPage } from '@/components/admin/admin-placeholder-page';

export default function SellerLandingPageAdmin() {
  return (
    <AdminPlaceholderPage
      category="Overview"
      title="Seller Landing Page"
      description="Configure public merchant onboarding presentation, commission tiers, benefits, and registration call-to-actions."
      icon={Store}
      features={[
        'Merchant commission tier cards and benefit highlights',
        'Direct registration onboarding funnel and verification criteria',
        'Frequently Asked Questions for prospective Bangladesh sellers',
      ]}
    />
  );
}
