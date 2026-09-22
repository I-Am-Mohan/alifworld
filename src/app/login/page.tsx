'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/?auth=login');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center gap-3">
      <div className="w-9 h-9 border-4 border-[#F59E0B] border-t-transparent rounded-full animate-spin" />
      <span className="text-xs font-bold text-slate-500">Opening AlifWorld Login...</span>
    </div>
  );
}
