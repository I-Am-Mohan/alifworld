import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

export const dynamic = 'force-dynamic';

export default function SellerKycPage() {
  const documents = [
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
      title: 'Owner National Identity Card (Front)',
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
      number: 'A/C: 11029384756',
      status: 'PENDING',
      verifiedAt: null,
      fileSize: '1.8 MB',
      required: false,
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white p-8">
      {/* Header */}
      <header className="border-b border-neutral-800 pb-6 mb-8 flex justify-between items-center">
        <div>
          <div className="flex items-center space-x-2 text-xs uppercase tracking-widest text-brand-orange font-bold mb-1">
            <Link href="/seller" className="hover:underline">
              Merchant Network
            </Link>
            <span>/</span>
            <span>Compliance & Identity</span>
          </div>
          <h1 className="text-3xl font-black">KYC Document Verification</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Government regulatory documents required under Bangladesh e-commerce laws (NBR BIN, Trade License).
          </p>
        </div>
        <Link
          href="/seller"
          className="px-4 py-2 rounded-lg border border-neutral-800 bg-neutral-900 text-sm hover:bg-neutral-800"
        >
          ← Back to Dashboard
        </Link>
      </header>

      {/* Compliance Overview Banner */}
      <Card className="p-6 mb-8 border-emerald-800/40 bg-emerald-950/20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
              <h2 className="text-base font-bold text-white">
                Regulatory Status: Verified Merchant
              </h2>
            </div>
            <p className="text-xs text-neutral-300">
              Your business is certified compliant. Customer orders and catalog publishing are fully active.
            </p>
          </div>
          <Badge variant="success" size="md">
            COMPLIANT (NBR & DNCC)
          </Badge>
        </div>
      </Card>

      {/* Document List Table */}
      <Card className="p-0 overflow-hidden mb-8">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Document Type</TableHead>
              <TableHead>Registration / ID Number</TableHead>
              <TableHead>Verification Status</TableHead>
              <TableHead>File Details</TableHead>
              <TableHead className="text-right">Access Controls</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell>
                  <div>
                    <div className="font-bold text-white text-sm">{doc.title}</div>
                    <div className="text-xs font-mono text-neutral-500">
                      {doc.type} {doc.required && <span className="text-brand-orange">*Mandatory</span>}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-xs text-neutral-300">{doc.number}</span>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      doc.status === 'VERIFIED'
                        ? 'success'
                        : doc.status === 'PENDING'
                        ? 'warning'
                        : 'danger'
                    }
                    size="sm"
                  >
                    {doc.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-xs text-neutral-400 font-mono">
                    <span>{doc.fileSize}</span> • <span>PDF</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <button
                    type="button"
                    className="text-xs px-3 py-1 rounded bg-neutral-900 border border-neutral-700 text-neutral-300 hover:text-white hover:border-neutral-500 font-semibold"
                  >
                    View Signed URL 🔒
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Security Disclosure Notice */}
      <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/30 text-xs text-neutral-500 flex items-center justify-between">
        <span>
          🔒 All KYC documents are stored in encrypted private S3 storage with short-lived presigned URLs. Every access is logged in the compliance audit trail.
        </span>
        <span className="font-mono text-[10px] text-neutral-600">AUDIT_LOG_ENABLED</span>
      </div>
    </div>
  );
}
