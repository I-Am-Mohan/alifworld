'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AlifLogo } from '@/components/brand/logo';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

export default function SellerKycPage() {
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const [documents, setDocuments] = useState([
    {
      id: 'kyc_trade_license_01',
      type: 'TRADE_LICENSE',
      title: 'City Corporation Trade License',
      number: 'TRAD/DNCC/042189/2024',
      status: 'VERIFIED',
      verifiedAt: '2026-09-22',
      fileSize: '1.2 MB',
      required: true,
    },
    {
      id: 'kyc_bin_certificate_01',
      type: 'BIN_CERTIFICATE',
      title: 'NBR VAT / BIN Registration Certificate',
      number: '0012345678901',
      status: 'VERIFIED',
      verifiedAt: '2026-09-22',
      fileSize: '850 KB',
      required: true,
    },
    {
      id: 'kyc_nid_front_01',
      type: 'NID_FRONT',
      title: 'Owner National Identity Card (Smart NID)',
      number: '5912345678',
      status: 'VERIFIED',
      verifiedAt: '2026-09-22',
      fileSize: '2.1 MB',
      required: true,
    },
    {
      id: 'kyc_bank_cheque_01',
      type: 'BANK_CHEQUE_LEAF',
      title: 'Cancelled Bank Cheque Leaf (Settlement Account)',
      number: 'A/C: 11029384756 (BRAC Bank Ltd)',
      status: 'VERIFIED',
      verifiedAt: '2026-09-22',
      fileSize: '1.8 MB',
      required: false,
    },
  ]);

  const handleSimulateUpload = () => {
    setUploadSuccess('Document successfully uploaded to private S3 bucket. Compliance audit entry created.');
    setTimeout(() => setUploadSuccess(null), 4000);
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
                KYC &amp; Legal Compliance Dossier
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              onClick={handleSimulateUpload}
              className="bg-[#FF6A00] hover:bg-[#E55F00] text-white font-bold text-xs shadow-sm shadow-orange-500/25"
            >
              + Upload Document
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
        {uploadSuccess && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center space-x-2">
            <span>✓</span>
            <span>{uploadSuccess}</span>
          </div>
        )}

        {/* Security & Access Policy Notice */}
        <div className="p-4 rounded-xl border border-sky-200 bg-sky-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-[#0284C7] text-white font-bold flex items-center justify-center text-sm shrink-0">
              🔒
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Encrypted Private Storage Boundary</h2>
              <p className="text-xs text-slate-600 mt-0.5">
                KYC dossiers are stored in private S3 buckets and accessed only via short-lived pre-signed URLs. Direct public URL access is prohibited.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-[#0284C7] bg-white border border-sky-200 px-3 py-1 rounded-full">
            ADR-0024 ENFORCED
          </span>
        </div>

        {/* Documents Table */}
        <Card className="border-slate-200 bg-white p-0 overflow-hidden shadow-sm">
          <CardHeader className="border-b border-slate-200 py-4 px-6 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">Submitted Legal Documents</CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Verified records for Dhaka Tech Electronics (sel_dhaka_tech_01)
              </p>
            </div>
            <Badge variant="success" size="sm">ALL REQUIRED VERIFIED</Badge>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 border-b border-slate-200">
                <TableRow>
                  <TableHead className="text-[11px] text-slate-600 uppercase">Document Type &amp; Title</TableHead>
                  <TableHead className="text-[11px] text-slate-600 uppercase">Government Identifier</TableHead>
                  <TableHead className="text-[11px] text-slate-600 uppercase">File Metadata</TableHead>
                  <TableHead className="text-[11px] text-slate-600 uppercase text-center">Status</TableHead>
                  <TableHead className="text-[11px] text-slate-600 uppercase text-right">Verification Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                    <TableCell>
                      <div className="font-bold text-xs text-slate-900">{doc.title}</div>
                      <div className="text-[10px] font-mono text-[#0284C7]">{doc.type}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-700 font-bold">
                      {doc.number}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      PDF • {doc.fileSize}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="success" size="sm">✓ {doc.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs text-slate-500 font-mono">
                      {doc.verifiedAt}
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
