'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function VendorLoginPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to main auth login with vendor context
    router.replace('/auth/login?redirect=/vendor');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="text-white">Redirecting to login...</div>
    </div>
  );
}
