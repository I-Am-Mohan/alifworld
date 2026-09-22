import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

export const dynamic = 'force-dynamic';

export default function AdminSellersPage() {
  const stats = [
    { label: 'Total Registered Merchants', count: '1,420', change: '+18 this week' },
    { label: 'Verified & Active Stores', count: '1,280', status: 'Compliant' },
    { label: 'Pending KYC Dossier Reviews', count: '14', alert: true },
    { label: 'Suspended / Regulatory Hold', count: '3', flag: true },
  ];

  const sellers = [
    {
      id: 'sel_dhaka_tech_01',
      name: 'Dhaka Tech Electronics',
      slug: 'dhaka-tech-electronics',
      ownerName: 'Zubair Ahmed',
      ownerEmail: 'zubair.ahmed@example.com',
      ownerPhone: '+8801712345678',
      binNumber: '0012345678901',
      tinNumber: '123456789012',
      status: 'ACTIVE',
      isVerified: true,
      kycStatus: 'VERIFIED',
      kycDocsCount: '3/3 Approved',
      commissionRate: '5.0%',
      payoutBalance: '৳128,450.00',
      registeredAt: '2026-09-01',
    },
    {
      id: 'sel_chittagong_crafts_02',
      name: 'Chittagong Artisans & Crafts',
      slug: 'chittagong-artisans',
      ownerName: 'Nasrin Sultana',
      ownerEmail: 'nasrin.crafts@example.com',
      ownerPhone: '+8801823456789',
      binNumber: '0098765432101',
      tinNumber: '987654321098',
      status: 'PENDING_VERIFICATION',
      isVerified: false,
      kycStatus: 'UNDER_REVIEW',
      kycDocsCount: '2/3 Submitted',
      commissionRate: '7.5%',
      payoutBalance: '৳0.00',
      registeredAt: '2026-09-20',
    },
    {
      id: 'sel_sylhet_tea_co_03',
      name: 'Sylhet Valley Organic Tea',
      slug: 'sylhet-valley-tea',
      ownerName: 'Tanvir Hossain',
      ownerEmail: 'tanvir.tea@example.com',
      ownerPhone: '+8801912345678',
      binNumber: '0044556677889',
      tinNumber: '445566778899',
      status: 'ACTIVE',
      isVerified: true,
      kycStatus: 'VERIFIED',
      kycDocsCount: '3/3 Approved',
      commissionRate: '6.0%',
      payoutBalance: '৳45,200.00',
      registeredAt: '2026-08-14',
    },
    {
      id: 'sel_apex_shoes_outlet_04',
      name: 'Apex Footwear Authorized',
      slug: 'apex-outlet-dhk',
      ownerName: 'Mahmudur Rahman',
      ownerEmail: 'mahmud.apex@example.com',
      ownerPhone: '+8801733445566',
      binNumber: '0055667788112',
      tinNumber: '556677881122',
      status: 'SUSPENDED',
      isVerified: false,
      kycStatus: 'REJECTED',
      kycDocsCount: 'Expired Trade License',
      commissionRate: '8.0%',
      payoutBalance: '৳12,000.00 (Frozen)',
      registeredAt: '2026-07-29',
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white p-8">
      {/* Header */}
      <header className="border-b border-neutral-800 pb-6 mb-8 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs uppercase tracking-widest text-brand-orange font-bold mb-1">
            <Link href="/admin" className="hover:underline">
              Operations Console
            </Link>
            <span>/</span>
            <span>Merchant Governance</span>
          </div>
          <h1 className="text-3xl font-black">Merchant Verification & KYC Dossiers</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Audit seller registrations, verify government regulatory credentials (NBR BIN/TIN, City Corporation Trade Licenses), and manage platform commission tiers.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            href="/admin"
            className="px-4 py-2 rounded-lg border border-neutral-800 bg-neutral-900 text-sm hover:bg-neutral-800 transition-colors"
          >
            ← Back to Admin
          </Link>
          <Button className="bg-brand-orange hover:bg-brand-orange/90 text-white font-bold text-sm px-4 py-2 rounded-lg shadow-lg">
            Export NBR Audit CSV
          </Button>
        </div>
      </header>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-neutral-800 bg-neutral-900/40">
            <CardContent className="p-5">
              <div className="text-xs text-neutral-400 font-semibold">{stat.label}</div>
              <div className="text-2xl font-black text-white mt-1">{stat.count}</div>
              {stat.change && <div className="text-xs text-brand-orange mt-1">{stat.change}</div>}
              {stat.status && <div className="text-xs text-emerald-400 mt-1">{stat.status}</div>}
              {stat.alert && <div className="text-xs text-amber-400 font-bold mt-1">Requires Compliance Action</div>}
              {stat.flag && <div className="text-xs text-red-400 font-bold mt-1">Settlement Payouts Locked</div>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Merchant Dossier Directory */}
      <Card className="border-neutral-800 bg-neutral-900/40 backdrop-blur">
        <CardHeader className="pb-3 border-b border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-lg font-bold text-white">Merchant Directory & Compliance Status</CardTitle>
            <p className="text-xs text-neutral-400 mt-0.5">
              All multi-tenant merchant accounts with verified trade identities under e-commerce guidelines.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="search"
              placeholder="Search store name, BIN or phone..."
              className="px-3 py-1.5 rounded-lg border border-neutral-700 bg-neutral-800 text-xs text-white placeholder-neutral-500 w-64 focus:outline-none focus:border-brand-orange"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-neutral-900/60">
              <TableRow className="border-neutral-800 hover:bg-transparent">
                <TableHead className="text-neutral-400 font-bold text-xs">Merchant & Store</TableHead>
                <TableHead className="text-neutral-400 font-bold text-xs">Owner & Contact</TableHead>
                <TableHead className="text-neutral-400 font-bold text-xs">NBR BIN / TIN</TableHead>
                <TableHead className="text-neutral-400 font-bold text-xs">KYC Dossier</TableHead>
                <TableHead className="text-neutral-400 font-bold text-xs">Store Status</TableHead>
                <TableHead className="text-neutral-400 font-bold text-xs">Commission / Balance</TableHead>
                <TableHead className="text-neutral-400 font-bold text-xs text-right">Review Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sellers.map((seller) => (
                <TableRow key={seller.id} className="border-neutral-800 hover:bg-neutral-800/30">
                  <TableCell className="py-4">
                    <div>
                      <div className="font-bold text-white text-sm hover:text-brand-orange transition-colors cursor-pointer">
                        {seller.name}
                      </div>
                      <div className="text-[11px] text-neutral-400 font-mono">slug: {seller.slug}</div>
                      <div className="text-[10px] text-neutral-500 font-mono">{seller.id}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs font-semibold text-neutral-200">{seller.ownerName}</div>
                    <div className="text-xs text-neutral-400 font-mono">{seller.ownerEmail}</div>
                    <div className="text-[11px] text-neutral-500 font-mono">{seller.ownerPhone}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs font-mono text-neutral-300">BIN: {seller.binNumber}</div>
                    <div className="text-[11px] font-mono text-neutral-500">TIN: {seller.tinNumber}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs font-semibold text-white">{seller.kycDocsCount}</div>
                    {seller.kycStatus === 'VERIFIED' && (
                      <Badge className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] mt-0.5">
                        KYC VERIFIED
                      </Badge>
                    )}
                    {seller.kycStatus === 'UNDER_REVIEW' && (
                      <Badge className="bg-amber-950 text-amber-400 border border-amber-800 text-[10px] mt-0.5">
                        AUDIT PENDING
                      </Badge>
                    )}
                    {seller.kycStatus === 'REJECTED' && (
                      <Badge className="bg-red-950 text-red-400 border border-red-800 text-[10px] mt-0.5">
                        REJECTED
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {seller.status === 'ACTIVE' && (
                      <span className="flex items-center text-xs text-emerald-400 font-semibold gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                        ACTIVE
                      </span>
                    )}
                    {seller.status === 'PENDING_VERIFICATION' && (
                      <span className="flex items-center text-xs text-amber-400 font-semibold gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                        PENDING
                      </span>
                    )}
                    {seller.status === 'SUSPENDED' && (
                      <span className="flex items-center text-xs text-red-400 font-semibold gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                        SUSPENDED
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-xs font-mono font-bold text-white">{seller.payoutBalance}</div>
                    <div className="text-[11px] text-neutral-400">Rate: {seller.commissionRate}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-neutral-700 bg-neutral-800 text-neutral-300 hover:text-white text-xs h-7 px-2.5"
                      >
                        Inspect Dossier
                      </Button>
                      {seller.status === 'PENDING_VERIFICATION' && (
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-7 px-2.5"
                        >
                          Approve
                        </Button>
                      )}
                      {seller.status === 'ACTIVE' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300 hover:bg-red-950/40 text-xs h-7 px-2"
                        >
                          Hold
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
