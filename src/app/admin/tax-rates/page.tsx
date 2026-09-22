import React from 'react';
import { Percent } from 'lucide-react';
import { AdminPlaceholderPage } from '@/components/admin/admin-placeholder-page';

export default function TaxRatesAdminPage() {
  return (
    <AdminPlaceholderPage
      category="Catalog"
      title="Tax Rates"
      description="National Board of Revenue (NBR) Bangladesh VAT schedules, category tax exemptions, and merchant withholding rules."
      icon={Percent}
      features={[
        'NBR standard 15% VAT, reduced rate, and zero-rated schedule matrix',
        'Category-specific VAT snapshots stored immutably on order items',
        'Advance Income Tax (AIT) and Tax Deducted at Source (TDS) reporting',
      ]}
    />
  );
}
