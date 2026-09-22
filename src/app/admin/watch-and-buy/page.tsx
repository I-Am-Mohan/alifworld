import React from 'react';
import { Video } from 'lucide-react';
import { AdminPlaceholderPage } from '@/components/admin/admin-placeholder-page';

export default function WatchAndBuyAdminPage() {
  return (
    <AdminPlaceholderPage
      category="Catalog"
      title="Watch & Buy"
      description="Video shopping feeds, shoppable short clips, live product demonstration streams, and instant checkout overlays."
      icon={Video}
      features={[
        'Shoppable video feed management and merchant video moderation',
        'Direct in-video product tagging and instant cart addition',
        'Video engagement analytics, views, and click-through metrics',
      ]}
    />
  );
}
