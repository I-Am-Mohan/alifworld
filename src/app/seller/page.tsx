'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SellerCenterPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkSellerAuth() {
      try {
        const res = await fetch('/api/v1/auth/me');
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            const roles: string[] = json.data.roles || [];
            const isSellerOrAdmin =
              json.data.sellerId ||
              roles.includes('SELLER_OWNER') ||
              roles.includes('SELLER_STAFF') ||
              roles.includes('SUPER_ADMIN') ||
              roles.includes('ADMIN');

            if (isSellerOrAdmin) {
              router.replace('/seller/products');
              return;
            }
          }
        }
        router.replace('/login?redirect=/seller/products');
      } catch {
        router.replace('/login?redirect=/seller/products');
      } finally {
        setChecking(false);
      }
    }

    checkSellerAuth();
  }, [router]);

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center gap-3">
      <div className="w-9 h-9 border-4 border-[#FF6A00] border-t-transparent rounded-full animate-spin" />
      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
        Loading Seller Center...
      </span>
    </div>
  );
}
