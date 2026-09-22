import React from 'react';
import { Headphones } from 'lucide-react';
import { AdminPlaceholderPage } from '@/components/admin/admin-placeholder-page';

export default function AdminSupportPage() {
  return (
    <AdminPlaceholderPage
      category="Overview"
      title="Customer Support"
      description="Omnichannel customer assistance console, live support chats, order incident tickets, and WhatsApp support bridge."
      icon={Headphones}
      features={[
        'Live customer inquiries and order incident ticket pipeline',
        'Official WhatsApp support click-to-chat routing',
        'Operator assignment and issue resolution SLA tracking',
      ]}
    />
  );
}
