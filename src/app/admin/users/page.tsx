import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

export const dynamic = 'force-dynamic';

export default function AdminUsersPage() {
  // Demonstration baseline seed users reflecting AlifWorld actors
  const sampleUsers = [
    {
      id: 'usr_1j7x000000000000superadmin',
      name: 'Platform Super Administrator',
      email: 'admin@alifworld.com',
      phone: '+880 1700-000000',
      status: 'ACTIVE',
      roles: ['SUPER_ADMIN'],
      isEmailVerified: true,
      isPhoneVerified: true,
      createdAt: '2026-09-22',
    },
    {
      id: 'usr_1j7x000000000000sellerown1',
      name: 'Rahim Chowdhury (Dhaka Tech)',
      email: 'rahim@dhakatech.com',
      phone: '+880 1711-223344',
      status: 'ACTIVE',
      roles: ['SELLER_OWNER'],
      sellerId: 'sel_dhaka_tech_01',
      isEmailVerified: true,
      isPhoneVerified: true,
      createdAt: '2026-09-22',
    },
    {
      id: 'usr_1j7x000000000000customer01',
      name: 'Tasnim Ahmed',
      email: 'tasnim@example.com',
      phone: '+880 1819-556677',
      status: 'ACTIVE',
      roles: ['CUSTOMER'],
      isEmailVerified: true,
      isPhoneVerified: true,
      createdAt: '2026-09-22',
    },
    {
      id: 'usr_1j7x000000000000rider0001',
      name: 'Kamrul Hasan (Pathao Courier)',
      email: 'kamrul@courier.alifworld.com',
      phone: '+880 1912-998877',
      status: 'ACTIVE',
      roles: ['RIDER'],
      isEmailVerified: false,
      isPhoneVerified: true,
      createdAt: '2026-09-22',
    },
    {
      id: 'usr_1j7x000000000000finance01',
      name: 'Farhana Sultana',
      email: 'farhana.finance@alifworld.com',
      phone: '+880 1755-443322',
      status: 'ACTIVE',
      roles: ['FINANCE'],
      isEmailVerified: true,
      isPhoneVerified: true,
      createdAt: '2026-09-22',
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
            <span>Identity & Access</span>
          </div>
          <h1 className="text-3xl font-black">User Management</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Browse users, inspect verification states, manage E.164 phone identities, and assign RBAC roles.
          </p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/admin/roles"
            className="px-4 py-2 rounded-lg border border-neutral-700 bg-neutral-900 text-sm hover:bg-neutral-800 font-semibold"
          >
            Role Matrix & Permissions →
          </Link>
          <Link
            href="/admin"
            className="px-4 py-2 rounded-lg border border-neutral-800 bg-neutral-900 text-sm hover:bg-neutral-800"
          >
            ← Back to Console
          </Link>
        </div>
      </header>

      {/* Control Bar: Search & Filters */}
      <Card className="mb-6 p-4">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="w-full md:w-96">
            <Input
              placeholder="Search by name, email, or +880 phone..."
              defaultValue=""
            />
          </div>
          <div className="flex space-x-2 w-full md:w-auto overflow-x-auto">
            <Button variant="primary" size="sm">
              All Users (5)
            </Button>
            <Button variant="outline" size="sm">
              Customers
            </Button>
            <Button variant="outline" size="sm">
              Sellers
            </Button>
            <Button variant="outline" size="sm">
              Staff / Admins
            </Button>
            <Button variant="outline" size="sm">
              Riders
            </Button>
          </div>
        </div>
      </Card>

      {/* Users Table */}
      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User / Identity</TableHead>
              <TableHead>Contact & Verification</TableHead>
              <TableHead>Role Assignments</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tenant Scope</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sampleUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div>
                    <div className="font-bold text-white text-sm">{user.name}</div>
                    <div className="text-xs font-mono text-neutral-500">{user.id}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-xs space-y-1">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-neutral-300">{user.email}</span>
                      {user.isEmailVerified && (
                        <span className="text-[10px] text-emerald-400" title="Email Verified">
                          ✓
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-1.5 font-mono text-neutral-400">
                      <span>{user.phone}</span>
                      {user.isPhoneVerified && (
                        <span className="text-[10px] text-emerald-400" title="Phone Verified">
                          ✓
                        </span>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {user.roles.map((role) => (
                      <Badge
                        key={role}
                        variant={
                          role === 'SUPER_ADMIN'
                            ? 'orange'
                            : role === 'SELLER_OWNER'
                            ? 'blue'
                            : role === 'FINANCE'
                            ? 'warning'
                            : 'default'
                        }
                        size="sm"
                      >
                        {role}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="success" size="sm">
                    {user.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {user.sellerId ? (
                    <span className="font-mono text-xs text-brand-globeLightBlue">
                      {user.sellerId}
                    </span>
                  ) : (
                    <span className="text-xs text-neutral-500">Global Platform</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      className="text-xs px-2.5 py-1 rounded bg-neutral-800 text-neutral-200 hover:bg-neutral-700"
                    >
                      Assign Role
                    </button>
                    <button
                      type="button"
                      className="text-xs px-2.5 py-1 rounded bg-neutral-900 border border-neutral-700 text-neutral-400 hover:text-white"
                    >
                      Audit Trail
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
