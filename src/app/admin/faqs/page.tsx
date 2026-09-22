import React from 'react';
import { HelpCircle } from 'lucide-react';
import { AdminPlaceholderPage } from '@/components/admin/admin-placeholder-page';

export default function AdminFaqsPage() {
  return (
    <AdminPlaceholderPage
      category="Communication"
      title="FAQs"
      description="Help center articles, customer ordering guidelines, returns policies, seller guidelines, and localized Q&A repository."
      icon={HelpCircle}
      features={[
        'Categorized Help Center Q&A entries in English and Bangla',
        'Customer ordering, payment, and refund policy guides',
        'Merchant onboarding and inventory guidelines library',
      ]}
    />
  );
}
