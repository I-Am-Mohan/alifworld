'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AlifLogo } from '@/components/brand/logo';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

export default function AdminUsersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('ALL');

  const [users, setUsers] = useState([
    {
      id: 'usr_superadmin',
      name: 'Platform Super Administrator',
      email: 'admin@mail.com',
      phone: '+8801700000000',
      status: 'ACTIVE',
      roles: ['SUPER_ADMIN'],
      isEmailVerified: true,
      isPhoneVerified: true,
      createdAt: '2026-09-22',
    },
    {
      id: 'usr_sellerown1',
      name: 'Rahim Chowdhury',
      email: 'rahim@dhakatech.com',
      phone: '+8801711223344',
      status: 'ACTIVE',
      roles: ['SELLER_OWNER'],
      sellerId: 'sel_dhaka_tech_01',
      isEmailVerified: true,
      isPhoneVerified: true,
      createdAt: '2026-09-22',
    },
    {
      id: 'usr_customer01',
      name: 'Tasnim Ahmed',
      email: 'tasnim@example.com',
      phone: '+8801819556677',
      status: 'ACTIVE',
      roles: ['CUSTOMER'],
      isEmailVerified: true,
      isPhoneVerified: true,
      createdAt: '2026-09-22',
    },
    {
      id: 'usr_rider0001',
      name: 'Kamrul Hasan (Pathao Courier)',
      email: 'kamrul@courier.mail.com',
      phone: '+8801912998877',
      status: 'ACTIVE',
      roles: ['RIDER'],
      isEmailVerified: false,
      isPhoneVerified: true,
      createdAt: '2026-09-22',
    },
    {
      id: 'usr_finance01',
      name: 'Farhana Sultana',
      email: 'finance@mail.com',
      phone: '+8801555112233',
      status: 'ACTIVE',
      roles: ['FINANCE'],
      isEmailVerified: true,
      isPhoneVerified: true,
      createdAt: '2026-09-22',
    },
  ]);

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone.includes(searchQuery);

    const matchesRole = selectedRole === 'ALL' || u.roles.includes(selectedRole);

    return matchesSearch && matchesRole;
  });

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
                Platform Operations
              </span>
              <h1 className="text-sm font-black text-slate-900 leading-tight">
                User Management Directory
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/admin"
              className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-all"
            >
              ← Admin Portal
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-6">
        {/* Top Controls */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-950">Identity &amp; Role Directory</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Inspect user identities, Bangladesh E.164 phone numbers, and tenant-scoped role delegations.
            </p>
          </div>
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, phone..."
              className="w-full sm:w-64 bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#FF6A00]"
            />
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#FF6A00]"
            >
              <option value="ALL">All Roles</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="SELLER_OWNER">Seller Owner</option>
              <option value="CUSTOMER">Customer</option>
              <option value="RIDER">Rider</option>
              <option value="FINANCE">Finance</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <Card className="border-slate-200 bg-white p-0 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 border-b border-slate-200">
                <TableRow>
                  <TableHead className="text-[11px] text-slate-600 uppercase">User Name &amp; ID</TableHead>
                  <TableHead className="text-[11px] text-slate-600 uppercase">Contact Details</TableHead>
                  <TableHead className="text-[11px] text-slate-600 uppercase">Assigned Roles</TableHead>
                  <TableHead className="text-[11px] text-slate-600 uppercase text-center">Verifications</TableHead>
                  <TableHead className="text-[11px] text-slate-600 uppercase text-center">Status</TableHead>
                  <TableHead className="text-[11px] text-slate-600 uppercase text-right">Created Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u) => (
                  <TableRow key={u.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                    <TableCell>
                      <div className="font-bold text-xs text-slate-900">{u.name}</div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">{u.id}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-slate-700">{u.email}</div>
                      <div className="text-[11px] font-mono text-[#0284C7] mt-0.5">{u.phone}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {u.roles.map((role) => (
                          <Badge
                            key={role}
                            variant={role === 'SUPER_ADMIN' ? 'orange' : role === 'SELLER_OWNER' ? 'blue' : 'default'}
                            size="sm"
                          >
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="inline-flex space-x-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                          u.isEmailVerified ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                        }`}>
                          EMAIL
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                          u.isPhoneVerified ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                        }`}>
                          PHONE
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="success" size="sm">{u.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs text-slate-500 font-mono">
                      {u.createdAt}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </main>
    </div>
  );
}
