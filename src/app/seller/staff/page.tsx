'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlifLogo } from '@/components/brand/logo';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { csrfFetch } from '@/shared/security/csrf-client';

export default function SellerStaffPage() {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteRole, setInviteRole] = useState('SELLER_STAFF');
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);

  const loadStaff = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/seller/staff');
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success) throw new Error(json?.error?.message || 'Unable to load staff.');
      setStaffMembers((json.data || []).map((record: any) => ({ ...record, name: record.user?.name || record.userId, email: record.user?.email || '—', phone: record.user?.phone || '—', role: record.roleCode, title: record.roleCode, isOwner: record.roleCode === 'SELLER_OWNER', status: record.deletedAt ? 'REMOVED' : 'ACTIVE', permissions: record.permissions || [], joinedAt: record.createdAt }))); 
      const activityResponse = await fetch('/api/v1/seller/staff/activity');
      const activityJson = await activityResponse.json().catch(() => null);
      if (activityResponse.ok && activityJson?.success) setActivity(activityJson.data.items || []);
    } catch (err: any) {
      setError(err.message || 'Unable to load staff.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadStaff(); }, [loadStaff]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await csrfFetch('/api/v1/seller/staff', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: inviteEmail, name: inviteName, phone: invitePhone || undefined, roleCode: inviteRole, permissions: [] }) });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success) throw new Error(json?.error?.message || 'Unable to invite staff.');
      setShowInviteModal(false); setInviteName(''); setInviteEmail(''); setInvitePhone(''); setInviteSuccess('Invitation successfully created.'); await loadStaff();
    } catch (err: any) { setError(err.message || 'Unable to invite staff.'); }
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
        {error && <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">{error}</div>}
        {loading && <div className="p-4 rounded-xl border border-slate-200 bg-white text-xs text-slate-500">Loading staff and activity…</div>}

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
                        {member.permissions.slice(0, 3).map((perm: string) => (
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

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader><CardTitle className="text-sm font-bold text-slate-900">Recent staff activity</CardTitle></CardHeader>
          <div className="divide-y divide-slate-100">{activity.length === 0 ? <p className="p-5 text-xs text-slate-500">No staff activity recorded.</p> : activity.map((entry) => <div key={entry.id} className="flex items-center justify-between gap-3 px-5 py-3 text-xs"><span className="font-semibold text-slate-700">{entry.action}</span><span className="text-slate-500">{new Date(entry.createdAt).toLocaleString()}</span></div>)}</div>
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
