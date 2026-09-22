import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const dynamic = 'force-dynamic';

export default function SellerSettingsPage() {
  const currentSettings = {
    businessName: 'Dhaka Tech Electronics',
    slug: 'dhaka-tech',
    supportEmail: 'support@dhakatech.com',
    supportPhone: '01711-223344',
    pickupAddress: {
      division: 'Dhaka',
      district: 'Dhaka',
      upazila: 'Dhanmondi',
      streetAddress: 'House 12, Road 4, Dhanmondi R/A',
      postalCode: '1205',
    },
    defaultCourier: 'PATHAO',
    vacationMode: false,
    version: 1,
  };

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
            <span>Store Configuration</span>
          </div>
          <h1 className="text-3xl font-black">Store Logistics & Profile Settings</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Configure merchant branding, customer support contacts, logistics pickup warehouses, and courier integrations.
          </p>
        </div>
        <Link
          href="/seller"
          className="px-4 py-2 rounded-lg border border-neutral-800 bg-neutral-900 text-sm hover:bg-neutral-800"
        >
          ← Back to Dashboard
        </Link>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl">
        {/* Left 2 Columns: Settings Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Brand & Support Contacts */}
          <Card className="p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-orange mr-2 inline-block" />
              Merchant Contacts & Identity
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Store Display Name"
                defaultValue={currentSettings.businessName}
                disabled
              />
              <Input
                label="Storefront URL Slug"
                defaultValue={currentSettings.slug}
                disabled
              />
              <Input
                label="Customer Support Email"
                type="email"
                defaultValue={currentSettings.supportEmail}
              />
              <Input
                label="Customer Support Mobile (+880)"
                defaultValue={currentSettings.supportPhone}
                helperText="E.164 normalized: +8801711223344"
              />
            </div>
          </Card>

          {/* Pickup Warehouse Address */}
          <Card className="p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-globeLightBlue mr-2 inline-block" />
              Warehouse Pickup Address (Courier Handover)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <Input
                label="Administrative Division"
                defaultValue={currentSettings.pickupAddress.division}
              />
              <Input
                label="District (Zila)"
                defaultValue={currentSettings.pickupAddress.district}
              />
              <Input
                label="Upazila / Thana"
                defaultValue={currentSettings.pickupAddress.upazila}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Input
                  label="Street Address & Building / Road Details"
                  defaultValue={currentSettings.pickupAddress.streetAddress}
                />
              </div>
              <Input
                label="Postal Code"
                defaultValue={currentSettings.pickupAddress.postalCode}
              />
            </div>
          </Card>

          {/* Courier & Shipping Logistics */}
          <Card className="p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 mr-2 inline-block" />
              Default Courier Integration
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['PATHAO', 'STEADFAST', 'REDX'].map((courier) => (
                <div
                  key={courier}
                  className={`p-4 rounded-xl border text-center cursor-pointer transition-all ${
                    currentSettings.defaultCourier === courier
                      ? 'border-brand-orange bg-orange-950/20 text-white'
                      : 'border-neutral-800 bg-neutral-900/40 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  <div className="text-sm font-bold">{courier}</div>
                  <div className="text-[10px] text-neutral-500 mt-1">
                    {courier === 'PATHAO' ? 'Direct API Connected' : 'Available'}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right 1 Column: Vacation Mode & Action Controls */}
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-base font-bold text-white mb-3">Vacation Mode</h2>
            <p className="text-xs text-neutral-400 leading-relaxed mb-4">
              Temporarily hide your product listings from checkout while keeping existing orders in processing.
            </p>
            <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800 flex justify-between items-center mb-4">
              <div>
                <span className="text-xs font-bold text-white">Store Status</span>
                <p className="text-[10px] text-emerald-400">Accepting Orders</p>
              </div>
              <Badge variant="success" size="sm">
                ACTIVE
              </Badge>
            </div>
            <Button variant="outline" size="sm" className="w-full">
              Enable Vacation Mode
            </Button>
          </Card>

          <Card className="p-6">
            <h2 className="text-base font-bold text-white mb-3">Save Modifications</h2>
            <p className="text-xs text-neutral-500 mb-4">
              All settings changes update OCC version and are recorded in the security audit ledger.
            </p>
            <Button variant="primary" size="md" className="w-full">
              Save Store Settings
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
