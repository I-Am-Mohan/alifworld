'use client';
import React from 'react';
import { LayoutTemplate } from 'lucide-react';
import { AdminPlaceholderPage } from '@/components/admin/admin-placeholder-page';

export default function PageBuilderPage() {
  return (
    <AdminPlaceholderPage
      category="Overview"
      title="Home Page Builder"
      description="Visual grid composer for storefront banner carousels, featured collections, flash sale sections, and brand showcase widgets."
      icon={LayoutTemplate}
      features={[
        'Hero Carousel slide ordering and responsive asset placement',
        'Featured dynamic category pills and highlight ribbon layout',
        'Promotional badge overlays and seasonal campaign blocks',
      ]}
    />
  );
}
