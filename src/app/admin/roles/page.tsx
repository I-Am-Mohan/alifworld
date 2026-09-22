import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { AdminPlaceholderPage } from '@/components/admin/admin-placeholder-page';

export default function AdminRolesPage() {
  return (
    <AdminPlaceholderPage
      category="System"
      title="Roles & Permissions"
      description="Role-based access control (RBAC), permission matrices, and security policies across platform bounded contexts."
      icon={ShieldCheck}
    />
  );
}
