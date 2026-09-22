'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AlifLogo } from '@/components/brand/logo';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

export default function AdminRolesPage() {
  const [selectedRoleCode, setSelectedRoleCode] = useState<string>('SUPER_ADMIN');

  const roles = [
    {
      code: 'SUPER_ADMIN',
      name: 'Super Administrator',
      description: 'Platform owner with unrestricted access across all contexts',
      isSystem: true,
      permissionCount: 29,
      assignedUserCount: 1,
    },
    {
      code: 'ADMIN',
      name: 'Platform Administrator',
      description: 'Administrative operator managing sellers, catalog, compliance, and warehouses',
      isSystem: true,
      permissionCount: 20,
      assignedUserCount: 4,
    },
    {
      code: 'OPERATIONS',
      name: 'Operations & Logistics Manager',
      description: 'Fulfillment, warehouse, and courier tracking coordinator',
      isSystem: true,
      permissionCount: 8,
      assignedUserCount: 8,
    },
    {
      code: 'SUPPORT',
      name: 'Customer Support Agent',
      description: 'First-tier customer and merchant support representative',
      isSystem: true,
      permissionCount: 5,
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
      permissionCount: 12,
      assignedUserCount: 42,
    },
    {
      code: 'SELLER_STAFF',
      name: 'Store Staff Member',
      description: 'Delegated staff handling order packing and product drafts',
      isSystem: true,
      permissionCount: 6,
      assignedUserCount: 68,
    },
    {
      code: 'CUSTOMER',
      name: 'Verified Shopper',
      description: 'Public registered shopper on the storefront',
      isSystem: true,
      permissionCount: 2,
      assignedUserCount: 1420,
    },
  ];

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
                Role-Based Access Control (RBAC) Matrix
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/admin/users"
              className="px-4 py-2 rounded-lg bg-black text-white hover:bg-neutral-800 text-xs font-bold transition-all shadow-sm"
            >
              User Directory
            </Link>
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
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">System Roles &amp; Authority Architecture</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Hierarchical system roles enforced by Server-Side Access Control (ADR-0023). Tenant separation prevents horizontal privilege escalation.
          </p>
        </div>

        {/* Roles Table */}
        <Card className="border-slate-200 bg-white p-0 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 border-b border-slate-200">
                <TableRow>
                  <TableHead className="text-[11px] text-slate-600 uppercase">Role Name &amp; Code</TableHead>
                  <TableHead className="text-[11px] text-slate-600 uppercase">Scope &amp; Purpose</TableHead>
                  <TableHead className="text-[11px] text-slate-600 uppercase text-center">Permissions</TableHead>
                  <TableHead className="text-[11px] text-slate-600 uppercase text-center">Assigned Users</TableHead>
                  <TableHead className="text-[11px] text-slate-600 uppercase text-center">Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((r) => (
                  <TableRow
                    key={r.code}
                    className={`border-b border-slate-100 hover:bg-slate-50/80 cursor-pointer ${
                      selectedRoleCode === r.code ? 'bg-orange-50/40' : ''
                    }`}
                    onClick={() => setSelectedRoleCode(r.code)}
                  >
                    <TableCell>
                      <div className="font-bold text-xs text-slate-900">{r.name}</div>
                      <div className="text-[10px] font-mono text-[#0284C7] font-semibold mt-0.5">{r.code}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-slate-600">{r.description}</div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {r.permissionCount} perms
                      </span>
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs text-slate-700 font-semibold">
                      {r.assignedUserCount}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={r.isSystem ? 'orange' : 'default'} size="sm">
                        {r.isSystem ? 'SYSTEM' : 'CUSTOM'}
                      </Badge>
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
