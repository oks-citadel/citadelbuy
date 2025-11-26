'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Play,
  Pause,
  Copy,
  Trash2,
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Eye,
  MousePointer,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn, formatCurrency } from '@/lib/utils';
import {
  useAdCampaigns,
  useUpdateCampaignStatus,
  useDeleteCampaign,
} from '@/hooks/use-vendor';
import { AdCampaign, AdCampaignStatus } from '@/types/vendor';

// Mock data for demo
const mockCampaigns: AdCampaign[] = [
  {
    id: '1',
    name: 'Summer Sale - Electronics',
    type: 'SPONSORED_PRODUCT',
    status: 'ACTIVE',
    budget: {
      type: 'DAILY',
      amount: 100,
      spent: 847.50,
      currency: 'USD',
      bidStrategy: 'AUTO_OPTIMIZE',
    },
    targeting: {
      demographics: { genders: ['MALE', 'FEMALE', 'OTHER'] },
      interests: ['Electronics', 'Technology'],
      behaviors: { purchaseHistory: [], browsingBehavior: [] },
      locations: [{ type: 'COUNTRY', value: 'US' }],
      devices: { types: ['MOBILE', 'DESKTOP'] },
      customAudiences: [],
      lookalikes: [],
      excludedAudiences: [],
    },
    schedule: {
      startDate: '2024-01-15',
      endDate: '2024-02-15',
      timezone: 'America/New_York',
    },
    creatives: [],
    products: ['prod-1', 'prod-2', 'prod-3'],
    metrics: {
      impressions: 45230,
      clicks: 1892,
      ctr: 4.18,
      conversions: 156,
      conversionRate: 8.24,
      spend: 847.50,
      revenue: 4235.00,
      roas: 5.0,
      cpc: 0.45,
      cpa: 5.43,
      addToCart: 312,
      purchases: 156,
      dailyBreakdown: [],
    },
    aiOptimization: {
      enabled: true,
      autoAdjustBids: true,
      autoAdjustBudget: false,
      autoOptimizeCreatives: true,
      targetMetric: 'ROAS',
      recommendations: [],
    },
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-01-20T00:00:00Z',
  },
  {
    id: '2',
    name: 'Retargeting - Cart Abandoners',
    type: 'RETARGETING',
    status: 'ACTIVE',
    budget: {
      type: 'DAILY',
      amount: 50,
      spent: 423.25,
      currency: 'USD',
      bidStrategy: 'TARGET_ROAS',
    },
    targeting: {
      demographics: { genders: ['MALE', 'FEMALE', 'OTHER'] },
      interests: [],
      behaviors: { purchaseHistory: [], browsingBehavior: [], cartAbandoners: true },
      locations: [{ type: 'COUNTRY', value: 'US' }],
      devices: { types: ['MOBILE', 'DESKTOP', 'TABLET'] },
      customAudiences: [],
      lookalikes: [],
      excludedAudiences: [],
    },
    schedule: {
      startDate: '2024-01-10',
      timezone: 'America/New_York',
    },
    creatives: [],
    products: [],
    metrics: {
      impressions: 12840,
      clicks: 892,
      ctr: 6.95,
      conversions: 89,
      conversionRate: 9.98,
      spend: 423.25,
      revenue: 3156.00,
      roas: 7.46,
      cpc: 0.47,
      cpa: 4.76,
      addToCart: 178,
      purchases: 89,
      dailyBreakdown: [],
    },
    aiOptimization: {
      enabled: true,
      autoAdjustBids: true,
      autoAdjustBudget: true,
      autoOptimizeCreatives: false,
      targetMetric: 'CONVERSIONS',
      recommendations: [
        {
          id: 'rec-1',
          type: 'BID',
          title: 'Increase bid by 15%',
          description: 'Higher bids could capture more high-intent users',
          impact: 'HIGH',
          estimatedImprovement: 12,
          applied: false,
          createdAt: new Date().toISOString(),
        },
      ],
    },
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-01-20T00:00:00Z',
  },
  {
    id: '3',
    name: 'Brand Awareness - New Collection',
    type: 'DISPLAY_AD',
    status: 'PAUSED',
    budget: {
      type: 'LIFETIME',
      amount: 2000,
      spent: 1245.80,
      currency: 'USD',
      bidStrategy: 'MAXIMIZE_CLICKS',
    },
    targeting: {
      demographics: { ageMin: 25, ageMax: 45, genders: ['FEMALE'] },
      interests: ['Fashion', 'Beauty'],
      behaviors: { purchaseHistory: [], browsingBehavior: [] },
      locations: [{ type: 'COUNTRY', value: 'US' }, { type: 'COUNTRY', value: 'CA' }],
      devices: { types: ['MOBILE'] },
      customAudiences: [],
      lookalikes: [],
      excludedAudiences: [],
    },
    schedule: {
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      timezone: 'America/New_York',
    },
    creatives: [],
    products: ['prod-10', 'prod-11'],
    metrics: {
      impressions: 89450,
      clicks: 2156,
      ctr: 2.41,
      conversions: 78,
      conversionRate: 3.62,
      spend: 1245.80,
      revenue: 2847.00,
      roas: 2.28,
      cpc: 0.58,
      cpa: 15.97,
      addToCart: 234,
      purchases: 78,
      dailyBreakdown: [],
    },
    aiOptimization: {
      enabled: false,
      autoAdjustBids: false,
      autoAdjustBudget: false,
      autoOptimizeCreatives: false,
      targetMetric: 'CTR',
      recommendations: [],
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-18T00:00:00Z',
  },
];

const statusColors: Record<AdCampaignStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PENDING_REVIEW: 'bg-yellow-100 text-yellow-700',
  ACTIVE: 'bg-green-100 text-green-700',
  PAUSED: 'bg-orange-100 text-orange-700',
  COMPLETED: 'bg-blue-100 text-blue-700',
  REJECTED: 'bg-red-100 text-red-700',
};

function CampaignCard({ campaign }: { campaign: AdCampaign }) {
  const updateStatus = useUpdateCampaignStatus();
  const deleteCampaign = useDeleteCampaign();
  const [showMenu, setShowMenu] = React.useState(false);

  const handleToggleStatus = () => {
    const newStatus = campaign.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    updateStatus.mutate({ id: campaign.id, status: newStatus });
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this campaign?')) {
      deleteCampaign.mutate(campaign.id);
    }
  };

  const isPositiveRoas = campaign.metrics.roas >= 1;

  return (
    <Card className="relative">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold">{campaign.name}</h3>
              {campaign.aiOptimization.enabled && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Sparkles className="h-3 w-3" />
                  AI
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge className={statusColors[campaign.status]}>
                {campaign.status.replace('_', ' ')}
              </Badge>
              <span className="text-sm text-muted-foreground">{campaign.type.replace('_', ' ')}</span>
            </div>
          </div>
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowMenu(!showMenu)}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-background border rounded-lg shadow-lg z-10">
                <button
                  onClick={handleToggleStatus}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-muted"
                >
                  {campaign.status === 'ACTIVE' ? (
                    <>
                      <Pause className="h-4 w-4" /> Pause Campaign
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" /> Activate Campaign
                    </>
                  )}
                </button>
                <Link href={`/vendor/campaigns/${campaign.id}`}>
                  <button className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-muted">
                    <BarChart3 className="h-4 w-4" /> View Details
                  </button>
                </Link>
                <button className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-muted">
                  <Copy className="h-4 w-4" /> Duplicate
                </button>
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-destructive hover:bg-muted"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Eye className="h-3 w-3" /> Impressions
            </p>
            <p className="text-lg font-semibold">
              {campaign.metrics.impressions.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <MousePointer className="h-3 w-3" /> Clicks
            </p>
            <p className="text-lg font-semibold">
              {campaign.metrics.clicks.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <DollarSign className="h-3 w-3" /> Spend
            </p>
            <p className="text-lg font-semibold">
              {formatCurrency(campaign.metrics.spend)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              {isPositiveRoas ? (
                <TrendingUp className="h-3 w-3 text-success" />
              ) : (
                <TrendingDown className="h-3 w-3 text-destructive" />
              )}
              ROAS
            </p>
            <p
              className={cn(
                'text-lg font-semibold',
                isPositiveRoas ? 'text-success' : 'text-destructive'
              )}
            >
              {campaign.metrics.roas.toFixed(2)}x
            </p>
          </div>
        </div>

        {/* Budget Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Budget Used</span>
            <span>
              {formatCurrency(campaign.budget.spent)} / {formatCurrency(campaign.budget.amount)}
              {campaign.budget.type === 'DAILY' && '/day'}
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{
                width: `${Math.min(
                  (campaign.budget.spent / campaign.budget.amount) * 100,
                  100
                )}%`,
              }}
            />
          </div>
        </div>

        {/* AI Recommendations */}
        {campaign.aiOptimization.recommendations.length > 0 && (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">AI Recommendation</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {campaign.aiOptimization.recommendations[0].title}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <Link href={`/vendor/campaigns/${campaign.id}`} className="flex-1">
            <Button variant="outline" className="w-full">
              View Details
            </Button>
          </Link>
          <Link href={`/vendor/campaigns/${campaign.id}/edit`}>
            <Button variant="outline">Edit</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CampaignsPage() {
  const [filter, setFilter] = React.useState<AdCampaignStatus | 'ALL'>('ALL');
  const [search, setSearch] = React.useState('');

  const { data, isLoading } = useAdCampaigns(
    filter !== 'ALL' ? { status: filter } : undefined
  );

  const campaigns = data?.campaigns || mockCampaigns;

  const filteredCampaigns = campaigns.filter((campaign) => {
    const matchesSearch = campaign.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'ALL' || campaign.status === filter;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: campaigns.length,
    active: campaigns.filter((c) => c.status === 'ACTIVE').length,
    totalSpend: campaigns.reduce((sum, c) => sum + c.metrics.spend, 0),
    totalRevenue: campaigns.reduce((sum, c) => sum + c.metrics.revenue, 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Ad Campaigns</h1>
          <p className="text-muted-foreground">
            Manage and optimize your advertising campaigns
          </p>
        </div>
        <Link href="/vendor/campaigns/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Campaign
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Campaigns</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Active</p>
            <p className="text-2xl font-bold text-success">{stats.active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Spend</p>
            <p className="text-2xl font-bold">{formatCurrency(stats.totalSpend)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Revenue</p>
            <p className="text-2xl font-bold text-success">
              {formatCurrency(stats.totalRevenue)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search campaigns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {(['ALL', 'ACTIVE', 'PAUSED', 'DRAFT'] as const).map((status) => (
            <Button
              key={status}
              variant={filter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(status)}
            >
              {status}
            </Button>
          ))}
        </div>
      </div>

      {/* Campaign List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="max-w-md mx-auto">
            <h2 className="text-xl font-bold mb-2">No campaigns found</h2>
            <p className="text-muted-foreground mb-4">
              {search
                ? 'Try adjusting your search terms'
                : 'Get started by creating your first ad campaign'}
            </p>
            <Link href="/vendor/campaigns/create">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Campaign
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredCampaigns.map((campaign, index) => (
            <motion.div
              key={campaign.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <CampaignCard campaign={campaign} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
