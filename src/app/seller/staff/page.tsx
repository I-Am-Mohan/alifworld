import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

export const dynamic = 'force-dynamic';

export default function SellerStaffPage() {
  const staffMembers = [
    {
      id: 'stf_01_owner',
      userId: 'usr_seller_zubair_01',
      name: 'Zubair Ahmed',
      email: 'zubair.ahmed@example.com',
      phone: '+8801712345678',
      role: 'SELLER_OWNER',
      title: 'Store Owner / Founder',
      isOwner: true,
      status: 'ACTIVE',
      permissions: ['ALL_PERMISSIONS', 'FINANCIAL_WITHDRAWAL', 'KYC_MANAGEMENT', 'STAFF_INVITE'],
      joinedAt: '2026-09-01',
    },
    {
      id: 'stf_02_rahim',
      userId: 'usr_seller_staff_01',
      name: 'Rahim Operations',
      email: 'staff.seller@alifworld.com',
      phone: '+8801700000002',
      role: 'SELLER_STAFF',
      title: 'Fulfillment & Inventory Lead',
      isOwner: false,
      status: 'ACTIVE',
      permissions: ['ORDERS_READ', 'ORDERS_UPDATE', 'PRODUCTS_CREATE', 'PRODUCTS_UPDATE', 'COURIER_DISPATCH'],
      joinedAt: '2026-09-15',
    },
    {
      id: 'stf_03_karim',
      userId: 'usr_seller_staff_02',
      name: 'Karim Support',
      email: 'karim.support@example.com',
      phone: '+8801811223344',
      role: 'SELLER_STAFF',
      title: 'Customer Service Representative',
      isOwner: false,
      status: 'INVITED',
      permissions: ['ORDERS_READ', 'CUSTOMER_MESSAGES_REPLY', 'RETURNS_INSPECT'],
      joinedAt: '2026-09-22',
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white p-8">
      {/* Header */}
      <header className="border-b border-neutral-800 pb-6 mb-8 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs uppercase tracking-widest text-brand-orange font-bold mb-1">
            <Link href="/seller" className="hover:underline">
              Merchant Network
            </Link>
            <span>/</span>
            <span>Delegated Access</span>
          </div>
          <h1 className="text-3xl font-black">Staff & Team Delegation</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Manage authorized store staff, order dispatch agents, and customer support representatives scoped to your store.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            href="/seller"
            className="px-4 py-2 rounded-lg border border-neutral-800 bg-neutral-900 text-sm hover:bg-neutral-800 transition-colors"
          >
            ← Back to Storefront
          </Link>
          <Button className="bg-brand-orange hover:bg-brand-orange/90 text-white font-bold text-sm px-4 py-2 rounded-lg shadow-lg">
            + Invite New Staff
          </Button>
        </div>
      </header>

      {/* Tenant Scope Warning */}
      <div className="mb-8 p-4 rounded-xl border border-brand-orange/30 bg-brand-orange/10 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="p-2 rounded-lg bg-brand-orange/20 text-brand-orange font-bold text-xs font-mono">
            TENANT SCOPED
          </span>
          <div>
            <h4 className="text-sm font-bold text-white">Multi-Tenant RBAC Isolation Enforced</h4>
            <p className="text-xs text-neutral-400">
              Staff members invited here only have access to store ID <span className="font-mono text-brand-orange">sel_dhaka_tech_01</span>. They cannot view platform admin data or other stores.
            </p>
          </div>
        </div>
        <Badge variant="outline" className="border-brand-orange text-brand-orange text-xs hidden sm:inline-flex">
          Role Assignment Scope
        </Badge>
      </div>

      {/* Staff Delegation Table */}
      <Card className="border-neutral-800 bg-neutral-900/40 backdrop-blur">
        <CardHeader className="pb-3 border-b border-neutral-800">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-lg font-bold text-white">Active Store Staff ({staffMembers.length})</CardTitle>
              <p className="text-xs text-neutral-400 mt-0.5">
                Role-based authorization mapped via UserRoleAssignment scoped to this merchant tenant.
              </p>
            </div>
            <span className="text-xs font-mono text-neutral-500">Max seats: 5 included</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-neutral-900/60">
              <TableRow className="border-neutral-800 hover:bg-transparent">
                <TableHead className="text-neutral-400 font-bold text-xs">Team Member</TableHead>
                <TableHead className="text-neutral-400 font-bold text-xs">Store Role</TableHead>
                <TableHead className="text-neutral-400 font-bold text-xs">Assigned Permissions</TableHead>
                <TableHead className="text-neutral-400 font-bold text-xs">Status</TableHead>
                <TableHead className="text-neutral-400 font-bold text-xs">Joined</TableHead>
                <TableHead className="text-neutral-400 font-bold text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffMembers.map((member) => (
                <TableRow key={member.id} className="border-neutral-800 hover:bg-neutral-800/30">
                  <TableCell className="py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center font-bold text-xs text-brand-orange">
                        {member.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-white text-sm flex items-center gap-1.5">
                          {member.name}
                          {member.isOwner && (
                            <span className="text-[10px] bg-brand-orange/20 text-brand-orange px-1.5 py-0.5 rounded font-bold">
                              Owner
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-neutral-400 font-mono">{member.email}</div>
                        <div className="text-[11px] text-neutral-500 font-mono">{member.phone}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs font-semibold text-neutral-200">{member.title}</div>
                    <div className="text-[10px] font-mono text-neutral-500">{member.role}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {member.permissions.slice(0, 3).map((perm) => (
                        <span
                          key={perm}
                          className="text-[10px] font-mono bg-neutral-800 border border-neutral-700 text-neutral-300 px-1.5 py-0.5 rounded"
                        >
                          {perm}
                        </span>
                      ))}
                      {member.permissions.length > 3 && (
                        <span className="text-[10px] font-mono text-brand-orange self-center">
                          +{member.permissions.length - 3} more
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {member.status === 'ACTIVE' ? (
                      <Badge className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px]">
                        ACTIVE
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-950 text-amber-400 border border-amber-800 text-[10px]">
                        INVITED
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-neutral-400 font-mono">
                    {member.joinedAt}
                  </TableCell>
                  <TableCell className="text-right">
                    {member.isOwner ? (
                      <span className="text-xs text-neutral-500 italic">Primary Account</span>
                    ) : (
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-neutral-700 bg-neutral-800 text-neutral-300 hover:text-white text-xs h-7 px-2.5"
                        >
                          Permissions
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300 hover:bg-red-950/40 text-xs h-7 px-2.5"
                        >
                          Revoke
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Preset Role Descriptions */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-neutral-800 bg-neutral-900/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-white flex items-center justify-between">
              <span>Order Dispatch & Packing</span>
              <span className="text-[10px] font-mono text-neutral-500">Preset A</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-neutral-400 space-y-1">
            <p>Can print packaging slips, manifest shipments to Steadfast / Pathao, and update parcel tracking IDs.</p>
            <p className="text-[11px] text-brand-orange font-semibold pt-1">No access to store revenue or payouts.</p>
          </CardContent>
        </Card>

        <Card className="border-neutral-800 bg-neutral-900/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-white flex items-center justify-between">
              <span>Catalog & Inventory Manager</span>
              <span className="text-[10px] font-mono text-neutral-500">Preset B</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-neutral-400 space-y-1">
            <p>Can create product listings, modify prices, update stock SKU counts, and manage seasonal campaigns.</p>
            <p className="text-[11px] text-brand-orange font-semibold pt-1">Cannot alter store bank payout accounts.</p>
          </CardContent>
        </Card>

        <Card className="border-neutral-800 bg-neutral-900/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-white flex items-center justify-between">
              <span>Customer Care Specialist</span>
              <span className="text-[10px] font-mono text-neutral-500">Preset C</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-neutral-400 space-y-1">
            <p>Can communicate with buyers in real-time chat, review return claims, and issue customer vouchers.</p>
            <p className="text-[11px] text-brand-orange font-semibold pt-1">Masked customer phone numbers enforced.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
