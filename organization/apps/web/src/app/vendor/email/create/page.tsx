'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { EmailAutomationBuilder } from '@/components/vendor/email-automation-builder';

export default function CreateEmailCampaignPage() {
  const router = useRouter();

  const handleSuccess = () => {
    router.push('/vendor/email');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/vendor/email">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Create Email Campaign</h1>
          <p className="text-muted-foreground">
            Build an automated email campaign to engage your customers
          </p>
        </div>
      </div>

      {/* Campaign Builder */}
      <EmailAutomationBuilder onSuccess={handleSuccess} />
    </div>
  );
}
