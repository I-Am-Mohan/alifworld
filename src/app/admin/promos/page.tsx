'use client';
import React from 'react';
import { Tag } from 'lucide-react';
import { AdminPlaceholderPage } from '@/components/admin/admin-placeholder-page';

export default function AdminPromosPage() {
  return (
    <AdminPlaceholderPage
      category="Marketing"
      title="Promos"
      description="Coupon campaigns, discount vouchers, sitewide free delivery coupons, and Product Point multiplier promotions."
      icon={Tag}
      features={[
        'Discount code generator with minimum order and usage caps',
        'Category and seller-scoped promotional voucher rules',
        'Real-time discount redemption and marketing spend tracking',
      ]}
    />
  );
}
