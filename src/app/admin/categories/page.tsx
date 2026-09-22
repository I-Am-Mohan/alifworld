'use client';
import React from 'react';
import { Layers } from 'lucide-react';
import { AdminPlaceholderPage } from '@/components/admin/admin-placeholder-page';

export default function AdminCategoriesPage() {
  return (
    <AdminPlaceholderPage
      category="Catalog"
      title="Categories"
      description="Category taxonomy management, parent-child category tree hierarchies, and NBR VAT rules."
      icon={Layers}
    />
  );
}
