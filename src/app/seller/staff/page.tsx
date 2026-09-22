'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AlifLogo } from '@/components/brand/logo';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

export default function SellerStaffPage() {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteRole, setInviteRole] = useState('SELLER_STAFF');
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  const [staffMembers, setStaffMembers] = useState([
    {
      id: 'stf_01_owner',
      userId: 'usr_seller_zubair_01',
      name: 'Rahim Chowdhury',
      email: 'rahim.chowdhury@dhakatech.com',
      phone: '+8801712345678',
      role: 'SELLER_OWNER',
      title: 'Store Owner & Managing Director',
      isOwner: true,
      status: 'ACTIVE',
      permissions: ['ALL_PERMISSIONS', 'FINANCIAL_WITHDRAWAL', 'KYC_MANAGEMENT', 'STAFF_INVITE'],
      joinedAt: '2026-09-01',
    },
    {
      id: 'stf_02_rahim',
      userId: 'usr_seller_staff_01',
      name: 'Tanvir Hossain',
      email: 'tanvir.operations@dhakatech.com',
      phone: '+8801700000002',
      role: 'SELLER_STAFF',
      title: 'Fulfillment & Warehouse Depot Lead',
      isOwner: false,
      status: 'ACTIVE',
      permissions: ['ORDERS_READ', 'ORDERS_UPDATE', 'PRODUCTS_CREATE', 'PRODUCTS_UPDATE', 'COURIER_DISPATCH'],
      joinedAt: '2026-09-15',
    },
  ]);

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteName) return;

    const newStaff = {
      id: `stf_${Date.now()}`,
      userId: `usr_invited_${Date.now().toString().slice(-4)}`,
      name: inviteName,
      email: inviteEmail,
      phone: invitePhone || '+8801700000000',
      role: inviteRole,
      title: inviteRole === 'SELLER_MANAGER' ? 'Store Operations Manager' : 'Store Assistant',
      isOwner: false,
      status: 'INVITED',
      permissions: ['ORDERS_READ', 'PRODUCTS_CREATE'],
      joinedAt: new Date().toISOString().split('T')[0],
    };

    setStaffMembers([...staffMembers, newStaff]);
    setShowInviteModal(false);
    setInviteName('');
    setInviteEmail('');
    setInvitePhone('');
    setInviteSuccess(`Invitation successfully sent to ${inviteEmail}.`);
    setTimeout(() => setInviteSuccess(null), 4000);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-900 flex flex-col justify-between">
      {/* Header */}
      <header className="bg-white border-b border-slate-200/90 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-6">
            <AlifLogo size="sm" href="/" />
            <div className="h-6 w-px bg-slate-200 hidden sm:block" />
            <div className="hidden sm:block">
              <span className="text-xs uppercase tracking-widest text-[#FF6A00] font-bold">
                Seller Center
              </span>
              <h1 className="text-sm font-black text-slate-900 leading-tight">
                Store Staff Delegation &amp; Access Control
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              onClick={() => setShowInviteModal(true)}
              className="bg-[#FF6A00] hover:bg-[#E55F00] text-white font-bold text-xs shadow-sm shadow-orange-500/25"
            >
              + Invite Staff Member
            </Button>
            <Link
              href="/seller"
              className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-all"
            >
              ← Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-6">
        {inviteSuccess && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center space-x-2">
            <span>✓</span>
            <span>{inviteSuccess}</span>
          </div>
        )}

        {/* Info Banner */}
        <div className="p-4 rounded-xl border border-orange-200 bg-orange-50/70 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Multi-Tenant Scoped Staff Delegation</h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Staff members inherit operational capabilities (product drafting, order packing, courier handoff) scoped exclusively to your merchant store.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-[#EA580C] bg-white border border-orange-200 px-3 py-1 rounded-full">
            ADR-0024 RBAC
          </span>
        </div>

        {/* Staff Table */}
        <Card className="border-slate-200 bg-white p-0 overflow-hidden shadow-sm">
          <CardHeader className="border-b border-slate-200 py-4 px-6 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">Authorized Store Staff ({staffMembers.length})</CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage access delegations and assigned operational roles
              </p>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 border-b border-slate-200">
                <TableRow>
                  <TableHead className="text-[11px] text-slate-600 uppercase">Staff Member &amp; Contact</TableHead>
                  <TableHead className="text-[11px] text-slate-600 uppercase">Store Role</TableHead>
                  <TableHead className="text-[11px] text-slate-600 uppercase">Assigned Permissions</TableHead>
                  <TableHead className="text-[11px] text-slate-600 uppercase text-center">Status</TableHead>
                  <TableHead className="text-[11px] text-slate-600 uppercase text-right">Joined Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffMembers.map((member) => (
                  <TableRow key={member.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                    <TableCell>
                      <div className="font-bold text-xs text-slate-900">{member.name}</div>
                      <div className="text-[11px] text-slate-500">{member.email}</div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">{member.phone}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs font-semibold text-slate-800">{member.title}</div>
                      <Badge variant={member.isOwner ? 'orange' : 'blue'} size="sm" className="mt-1">
                        {member.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {member.permissions.slice(0, 3).map((perm) => (
                          <span
                            key={perm}
                            className="text-[10px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200"
                          >
                            {perm}
                          </span>
                        ))}
                        {member.permissions.length > 3 && (
                          <span className="text-[10px] font-mono text-slate-500 px-1 py-0.5">
                            +{member.permissions.length - 3} more
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={member.status === 'ACTIVE' ? 'success' : 'warning'}
                        size="sm"
                      >
                        {member.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs text-slate-500 font-mono">
                      {member.joinedAt}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </main>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-black text-slate-900 mb-1">Invite Store Staff Member</h3>
            <p className="text-xs text-slate-500 mb-4">
              Delegate order packing and product catalog access to an authorized employee.
            </p>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Asif Mahmud"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:border-[#FF6A00] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="asif@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:border-[#FF6A00] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bangladesh Phone (+880)
                </label>
                <input
                  type="text"
                  placeholder="+8801700000000"
                  value={invitePhone}
                  onChange={(e) => setInvitePhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:border-[#FF6A00] focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Role Delegation
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:border-[#FF6A00] focus:outline-none"
                >
                  <option value="SELLER_STAFF">Store Staff (Drafting &amp; Order Packing)</option>
                  <option value="SELLER_MANAGER">Store Manager (Full Catalog &amp; Courier Management)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowInviteModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-[#FF6A00] hover:bg-[#E55F00] text-white font-bold"
                >
                  Send Invitation
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
