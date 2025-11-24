'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CampaignList } from './campaign-list';
import { CampaignForm } from './campaign-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCampaigns, useAdvertisements } from '@/hooks/useAdvertisements';
import { DollarSign, Eye, MousePointer, TrendingUp } from 'lucide-react';
import type { Campaign } from '@/lib/api/advertisements';

export function AdsDashboard() {
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const { data: campaigns } = useCampaigns();
  const { data: advertisements } = useAdvertisements();

  // Calculate overall metrics
  const totalSpent = campaigns?.reduce((sum: number, c: Campaign) => sum + c.spentAmount, 0) || 0;
  const totalImpressions = campaigns?.reduce((sum: number, c: Campaign) => sum + c.impressions, 0) || 0;
  const totalClicks = campaigns?.reduce((sum: number, c: Campaign) => sum + c.clicks, 0) || 0;
  const totalConversions = campaigns?.reduce((sum: number, c: Campaign) => sum + c.conversions, 0) || 0;
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

  if (showCampaignForm) {
    return (
      <CampaignForm
        onSuccess={() => setShowCampaignForm(false)}
        onCancel={() => setShowCampaignForm(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Advertising Dashboard</h1>
        <p className="text-gray-600">Manage your ad campaigns and track performance</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalSpent.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Across {campaigns?.length || 0} campaigns
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Impressions</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalImpressions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total ad views</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clicks</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClicks.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">CTR: {ctr.toFixed(2)}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalConversions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Conv. Rate:{' '}
              {totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(2) : 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Campaigns and Ads */}
      <Tabs defaultValue="campaigns" className="space-y-4">
        <TabsList>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="advertisements">Advertisements</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-4">
          <CampaignList onCreateClick={() => setShowCampaignForm(true)} />
        </TabsContent>

        <TabsContent value="advertisements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Advertisements</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">
                You have {advertisements?.length || 0} advertisement(s) across all campaigns.
              </p>
              {/* Add advertisement list component here if needed */}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
