import React from 'react';
import { UserCheck } from 'lucide-react';
import { AdminPlaceholderPage } from '@/components/admin/admin-placeholder-page';

export default function AdminCustomersPage() {
  return (
    <AdminPlaceholderPage
      category="People"
      title="Customers"
      description="Inspect consumer user profiles, Bangladesh E.164 phone numbers, delivery addresses, wallet balances, and reward club ranks."
      icon={UserCheck}
      features={[
        'Customer directory with phone/email verification indicators',
        'Customer wallet balances and Product Point audit history',
        'Customer Club rank qualifications and activity timeline',
      ]}
    />
  );
}
