'use client';
import React from 'react';
import { Building2 } from 'lucide-react';
import { AdminPlaceholderPage } from '@/components/admin/admin-placeholder-page';

export default function AdminSellersPage() {
  return (
    <AdminPlaceholderPage
      category="People"
      title="Seller Management"
      description="Merchant onboarding verification, NBR BIN/TIN compliance audit, business documentation review, and seller store approvals."
      icon={Building2}
    />
  );
}
