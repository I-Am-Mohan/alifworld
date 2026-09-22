'use client';
import React from 'react';
import { Bell } from 'lucide-react';
import { AdminPlaceholderPage } from '@/components/admin/admin-placeholder-page';

export default function AdminNotificationsPage() {
  return (
    <AdminPlaceholderPage
      category="Communication"
      title="Notifications"
      description="Transactional notifications stream, transactional email templates, and outbox event delivery records."
      icon={Bell}
      features={[
        'System transactional notifications (orders, refunds, verification)',
        'Bilingual email notification template preview and test sender',
        'Transactional outbox worker logs and delivery telemetry',
      ]}
    />
  );
}
