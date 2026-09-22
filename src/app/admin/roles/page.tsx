import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

export const dynamic = 'force-dynamic';

export default function AdminRolesPage() {
  const roles = [
    {
      code: 'SUPER_ADMIN',
      name: 'Super Administrator',
      description: 'Platform owner with unrestricted access across all contexts',
      isSystem: true,
      permissionCount: 26,
      assignedUserCount: 1,
    },
    {
      code: 'ADMIN',
      name: 'Platform Administrator',
      description: 'Administrative operator managing sellers, catalog, and compliance',
      isSystem: true,
      permissionCount: 17,
      assignedUserCount: 4,
    },
    {
      code: 'OPERATIONS',
      name: 'Operations & Logistics Manager',
      description: 'Fulfillment, warehouse, and courier tracking coordinator',
      isSystem: true,
      permissionCount: 5,
      assignedUserCount: 8,
    },
    {
      code: 'SUPPORT',
      name: 'Customer Support Agent',
      description: 'First-tier customer and merchant support representative',
      isSystem: true,
      permissionCount: 4,
      assignedUserCount: 15,
    },
    {
      code: 'FINANCE',
      name: 'Financial Officer',
      description: 'Treasury, double-entry ledger, and seller payout officer',
      isSystem: true,
      permissionCount: 8,
      assignedUserCount: 3,
    },
    {
      code: 'SELLER_OWNER',
      name: 'Store Merchant Owner',
      description: 'Primary owner of a verified multi-vendor storefront',
      isSystem: true,
      permissionCount: 9,
      assignedUserCount: 42,
    },
    {
      code: 'SELLER_STAFF',
      name: 'Store Staff Member',
      description: 'Delegated staff handling order packing and product drafts',
      isSystem: true,
      permissionCount: 4,
      assignedUserCount: 89,
    },
    {
      code: 'CUSTOMER',
      name: 'Verified Shopper',
      description: 'Public registered shopper on the storefront',
      isSystem: true,
      permissionCount: 2,
      assignedUserCount: 1420,
    },
    {
      code: 'RIDER',
      name: 'Delivery Rider',
      description: 'Last-mile logistics and dispatch rider',
      isSystem: true,
      permissionCount: 2,
      assignedUserCount: 35,
    },
  ];

  const modules = [
    {
      name: 'IAM & Security',
      permissions: ['users:read', 'users:write', 'users:delete', 'users:suspend', 'roles:read', 'roles:manage', 'roles:assign', 'permissions:read'],
    },
    {
      name: 'Seller Management',
      permissions: ['sellers:read', 'sellers:verify', 'sellers:suspend', 'seller:profile:manage', 'seller:staff:manage'],
    },
    {
      name: 'Catalog & Taxonomy',
      permissions: ['catalog:read', 'catalog:write', 'catalog:publish', 'catalog:archive'],
    },
    {
      name: 'Orders & RMA',
      permissions: ['orders:read', 'orders:manage', 'orders:cancel', 'orders:refund'],
    },
    {
      name: 'Finance & Ledger',
      permissions: ['finance:read', 'finance:ledger', 'finance:adjust', 'finance:payout'],
    },
    {
      name: 'System & Governance',
      permissions: ['system:config', 'system:audit_read'],
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white p-8">
      {/* Header */}
      <header className="border-b border-neutral-800 pb-6 mb-8 flex justify-between items-center">
        <div>
          <div className="flex items-center space-x-2 text-xs uppercase tracking-widest text-brand-orange font-bold mb-1">
            <Link href="/admin" className="hover:underline">
              Platform Operations
            </Link>
            <span>/</span>
            <Link href="/admin/users" className="hover:underline">
              Identity
            </Link>
            <span>/</span>
            <span>RBAC Matrix</span>
          </div>
          <h1 className="text-3xl font-black">Roles & Permission Matrix</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Standard system roles, granular domain permissions, and tenant isolation policies.
          </p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/admin/users"
            className="px-4 py-2 rounded-lg border border-neutral-700 bg-neutral-900 text-sm hover:bg-neutral-800 font-semibold"
          >
            ← User Directory
          </Link>
          <Link
            href="/admin"
            className="px-4 py-2 rounded-lg border border-neutral-800 bg-neutral-900 text-sm hover:bg-neutral-800"
          >
            Console Home
          </Link>
        </div>
      </header>

      {/* Role Summary Grid */}
      <section className="mb-10">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold flex items-center">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-orange mr-2 inline-block" />
            Standard System Roles
          </h2>
          <span className="text-xs text-neutral-500 font-mono">
            {roles.length} Active System Roles
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role) => (
            <Card key={role.code} className="p-5 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className="font-mono text-xs font-bold text-brand-orange">
                    {role.code}
                  </span>
                  <Badge variant={role.isSystem ? 'blue' : 'default'} size="sm">
                    {role.isSystem ? 'PROTECTED' : 'CUSTOM'}
                  </Badge>
                </div>
                <h3 className="text-sm font-bold text-white mb-1">{role.name}</h3>
                <p className="text-xs text-neutral-400 mb-4 leading-relaxed">
                  {role.description}
                </p>
              </div>
              <div className="border-t border-neutral-800/80 pt-3 flex justify-between items-center text-xs text-neutral-400 font-mono">
                <span>{role.permissionCount} Permissions</span>
                <span className="text-neutral-500">{role.assignedUserCount} Users</span>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Permission Modules Breakdown */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold flex items-center">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 mr-2 inline-block" />
            Granular Permissions Catalogue
          </h2>
          <span className="text-xs text-neutral-500 font-mono">
            6 Functional Bounded Contexts
          </span>
        </div>

        <div className="space-y-4">
          {modules.map((mod) => (
            <Card key={mod.name} className="p-5">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-white">{mod.name}</h3>
                <span className="text-xs font-mono text-neutral-500">
                  {mod.permissions.length} actions
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {mod.permissions.map((perm) => (
                  <span
                    key={perm}
                    className="px-2.5 py-1 rounded bg-neutral-950 border border-neutral-800 font-mono text-xs text-neutral-300 hover:border-neutral-700"
                  >
                    {perm}
                  </span>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
