'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AdCampaignBuilder } from '@/components/vendor/ad-campaign-builder';

export default function CreateCampaignPage() {
  const router = useRouter();

  const handleSuccess = () => {
    router.push('/vendor/campaigns');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/vendor/campaigns">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Create Campaign</h1>
          <p className="text-muted-foreground">
            Launch a new advertising campaign to promote your products
          </p>
        </div>
      </div>

      {/* Campaign Builder */}
      <AdCampaignBuilder onSuccess={handleSuccess} />
    </div>
  );
}
