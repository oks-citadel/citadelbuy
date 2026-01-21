'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function VendorRegisterPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to main auth register with vendor context
    router.replace('/auth/register?redirect=/vendor');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="text-white">Redirecting to registration...</div>
    </div>
  );
}
