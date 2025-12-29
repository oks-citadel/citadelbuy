'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  Mail,
  Send,
  Clock,
  Pause,
  Play,
  MoreVertical,
  Eye,
  MousePointer,
  DollarSign,
  Trash2,
  Copy,
  BarChart3,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn, formatCurrency } from '@/lib/utils';
import { useEmailCampaigns, useDeleteEmailCampaign } from '@/hooks/use-vendor';
import { EmailCampaign } from '@/types/vendor';

// Mock data
const mockCampaigns: EmailCampaign[] = [
  {
    id: '1',
    name: 'Welcome Series - New Subscribers',
    type: 'WELCOME',
    status: 'ACTIVE',
    trigger: {
      type: 'SIGNUP',
      conditions: [],
      delay: 0,
    },
    audience: {
      type: 'SEGMENT',
      segmentIds: ['new-customers'],
      estimatedSize: 1245,
    },
    content: {
      subject: 'Welcome to Our Store! 🎉',
      fromName: 'Broxiva',
      fromEmail: 'hello@broxiva.com',
      htmlContent: '',
    },
    metrics: {
      sent: 4521,
      delivered: 4489,
      deliveryRate: 99.3,
      opens: 2156,
      openRate: 48.0,
      uniqueOpens: 2012,
      clicks: 892,
      clickRate: 19.9,
      uniqueClicks: 756,
      unsubscribes: 23,
      unsubscribeRate: 0.5,
      bounces: 32,
      bounceRate: 0.7,
      complaints: 2,
      conversions: 156,
      conversionRate: 3.5,
      revenue: 12450,
    },
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-01-20T00:00:00Z',
  },
  {
    id: '2',
    name: 'Abandoned Cart Recovery',
    type: 'ABANDONED_CART',
    status: 'ACTIVE',
    trigger: {
      type: 'CART_ABANDON',
      conditions: [],
      delay: 60,
    },
    audience: {
      type: 'SEGMENT',
      segmentIds: ['cart-abandoners'],
      estimatedSize: 2156,
    },
    content: {
      subject: 'You left something behind! 🛒',
      fromName: 'Broxiva',
      fromEmail: 'hello@broxiva.com',
      htmlContent: '',
    },
    metrics: {
      sent: 8923,
      delivered: 8845,
      deliveryRate: 99.1,
      opens: 3567,
      openRate: 40.3,
      uniqueOpens: 3234,
      clicks: 1456,
      clickRate: 16.5,
      uniqueClicks: 1289,
      unsubscribes: 45,
      unsubscribeRate: 0.5,
      bounces: 78,
      bounceRate: 0.9,
      complaints: 5,
      conversions: 423,
      conversionRate: 4.8,
      revenue: 34560,
    },
    createdAt: '2024-01-05T00:00:00Z',
    updatedAt: '2024-01-20T00:00:00Z',
  },
  {
    id: '3',
    name: 'January Flash Sale',
    type: 'PROMOTIONAL',
    status: 'COMPLETED',
    audience: {
      type: 'ALL',
      estimatedSize: 15420,
    },
    content: {
      subject: '🔥 FLASH SALE: 50% OFF Everything!',
      fromName: 'Broxiva',
      fromEmail: 'deals@broxiva.com',
      htmlContent: '',
    },
    schedule: {
      type: 'SCHEDULED',
      scheduledAt: '2024-01-15T10:00:00Z',
    },
    metrics: {
      sent: 15234,
      delivered: 14987,
      deliveryRate: 98.4,
      opens: 6789,
      openRate: 45.3,
      uniqueOpens: 6234,
      clicks: 2345,
      clickRate: 15.7,
      uniqueClicks: 2123,
      unsubscribes: 156,
      unsubscribeRate: 1.0,
      bounces: 247,
      bounceRate: 1.6,
      complaints: 12,
      conversions: 567,
      conversionRate: 3.8,
      revenue: 45680,
    },
    createdAt: '2024-01-12T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
  },
  {
    id: '4',
    name: 'Win-Back Inactive Customers',
    type: 'WIN_BACK',
    status: 'PAUSED',
    trigger: {
      type: 'INACTIVITY',
      conditions: [],
      delay: 30 * 24 * 60, // 30 days
    },
    audience: {
      type: 'SEGMENT',
      segmentIds: ['inactive-30'],
      estimatedSize: 3421,
    },
    content: {
      subject: 'We miss you! Come back for 20% off 💝',
      fromName: 'Broxiva',
      fromEmail: 'hello@broxiva.com',
      htmlContent: '',
    },
    metrics: {
      sent: 2345,
      delivered: 2298,
      deliveryRate: 98.0,
      opens: 678,
      openRate: 29.5,
      uniqueOpens: 612,
      clicks: 234,
      clickRate: 10.2,
      uniqueClicks: 198,
      unsubscribes: 89,
      unsubscribeRate: 3.9,
      bounces: 47,
      bounceRate: 2.0,
      complaints: 3,
      conversions: 45,
      conversionRate: 2.0,
      revenue: 3450,
    },
    createdAt: '2024-01-08T00:00:00Z',
    updatedAt: '2024-01-18T00:00:00Z',
  },
];

const statusConfig: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
  DRAFT: { color: 'bg-gray-100 text-gray-700', label: 'Draft', icon: <Mail className="h-3 w-3" /> },
  SCHEDULED: { color: 'bg-blue-100 text-blue-700', label: 'Scheduled', icon: <Clock className="h-3 w-3" /> },
  ACTIVE: { color: 'bg-green-100 text-green-700', label: 'Active', icon: <Play className="h-3 w-3" /> },
  PAUSED: { color: 'bg-yellow-100 text-yellow-700', label: 'Paused', icon: <Pause className="h-3 w-3" /> },
  COMPLETED: { color: 'bg-purple-100 text-purple-700', label: 'Completed', icon: <Send className="h-3 w-3" /> },
};

function CampaignCard({ campaign }: { campaign: EmailCampaign }) {
  const deleteCampaign = useDeleteEmailCampaign();
  const [showMenu, setShowMenu] = React.useState(false);
  const status = statusConfig[campaign.status];

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this campaign?')) {
      deleteCampaign.mutate(campaign.id);
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold">{campaign.name}</h3>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={cn('gap-1', status.color)}>
                {status.icon}
                {status.label}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {campaign.type.replace(/_/g, ' ')}
              </span>
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
                <Link href={`/vendor/email/${campaign.id}`}>
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
        {campaign.metrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Send className="h-3 w-3" /> Sent
              </p>
              <p className="text-lg font-semibold">
                {campaign.metrics.sent.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Eye className="h-3 w-3" /> Open Rate
              </p>
              <p className="text-lg font-semibold">{campaign.metrics.openRate}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <MousePointer className="h-3 w-3" /> Click Rate
              </p>
              <p className="text-lg font-semibold">{campaign.metrics.clickRate}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <DollarSign className="h-3 w-3" /> Revenue
              </p>
              <p className="text-lg font-semibold text-success">
                {formatCurrency(campaign.metrics.revenue)}
              </p>
            </div>
          </div>
        )}

        {/* Audience Info */}
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
          <span>
            {campaign.audience.estimatedSize?.toLocaleString()} recipients
          </span>
          {campaign.trigger && (
            <span>Trigger: {campaign.trigger.type.replace(/_/g, ' ')}</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Link href={`/vendor/email/${campaign.id}`} className="flex-1">
            <Button variant="outline" className="w-full">
              View Details
            </Button>
          </Link>
          <Link href={`/vendor/email/${campaign.id}/edit`}>
            <Button variant="outline">Edit</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function EmailCampaignsPage() {
  const [filter, setFilter] = React.useState<'ALL' | 'ACTIVE' | 'PAUSED' | 'COMPLETED'>('ALL');
  const [search, setSearch] = React.useState('');

  const { data, isLoading } = useEmailCampaigns(
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
    totalSent: campaigns.reduce((sum, c) => sum + (c.metrics?.sent || 0), 0),
    totalRevenue: campaigns.reduce((sum, c) => sum + (c.metrics?.revenue || 0), 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Email Campaigns</h1>
          <p className="text-muted-foreground">
            Create and manage automated email campaigns
          </p>
        </div>
        <Link href="/vendor/email/create">
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
            <p className="text-sm text-muted-foreground">Emails Sent</p>
            <p className="text-2xl font-bold">{stats.totalSent.toLocaleString()}</p>
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
          {(['ALL', 'ACTIVE', 'PAUSED', 'COMPLETED'] as const).map((status) => (
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
          <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-bold mb-2">No campaigns found</h2>
          <p className="text-muted-foreground mb-4">
            {search
              ? 'Try adjusting your search terms'
              : 'Get started by creating your first email campaign'}
          </p>
          <Link href="/vendor/email/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Campaign
            </Button>
          </Link>
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
