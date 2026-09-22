'use client';
import React from 'react';
import { Smartphone } from 'lucide-react';
import { AdminPlaceholderPage } from '@/components/admin/admin-placeholder-page';

export default function AdminAppNotificationsPage() {
  return (
    <AdminPlaceholderPage
      category="Communication"
      title="App Notifications"
      description="Push notifications targeted to mobile Flutter clients, deep links to products or orders, and scheduled delivery campaigns."
      icon={Smartphone}
      features={[
        'FCM Push notification composer with deep link routing',
        'Segmented customer targeting by division and activity',
        'Click-through rate and conversion tracking analytics',
      ]}
    />
  );
}
