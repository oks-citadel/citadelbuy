'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Megaphone,
  Search,
  Download,
  Eye,
  MoreVertical,
  Plus,
  Edit,
  Trash2,
  TrendingUp,
  Users,
  DollarSign,
  Mail,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Play,
  Pause,
  BarChart3,
  Target,
  MousePointerClick,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface Campaign {
  id: string;
  name: string;
  type: 'EMAIL' | 'SMS' | 'PUSH' | 'SOCIAL_MEDIA' | 'DISPLAY_ADS';
  status: 'ACTIVE' | 'COMPLETED' | 'SCHEDULED' | 'PAUSED' | 'DRAFT';
  targetAudience: string;
  startDate: string;
  endDate: string;
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  createdAt: string;
}

const demoCampaigns: Campaign[] = [
  {
    id: '1',
    name: 'Spring Sale 2024',
    type: 'EMAIL',
    status: 'ACTIVE',
    targetAudience: 'All Subscribers',
    startDate: '2024-03-15',
    endDate: '2024-04-15',
    budget: 5000,
    spent: 2340,
    impressions: 12450,
    clicks: 1245,
    conversions: 234,
    revenue: 45600,
    createdAt: '2024-03-10',
  },
  {
    id: '2',
    name: 'New Arrivals Promotion',
    type: 'SOCIAL_MEDIA',
    status: 'ACTIVE',
    targetAudience: 'Age 18-35',
    startDate: '2024-03-10',
    endDate: '2024-04-30',
    budget: 8000,
    spent: 4560,
    impressions: 89000,
    clicks: 4450,
    conversions: 445,
    revenue: 22250,
    createdAt: '2024-03-05',
  },
  {
    id: '3',
    name: 'Flash Weekend Sale',
    type: 'PUSH',
    status: 'COMPLETED',
    targetAudience: 'Mobile App Users',
    startDate: '2024-03-09',
    endDate: '2024-03-10',
    budget: 3000,
    spent: 2890,
    impressions: 8900,
    clicks: 1068,
    conversions: 156,
    revenue: 15600,
    createdAt: '2024-03-07',
  },
  {
    id: '4',
    name: 'Summer Collection Teaser',
    type: 'EMAIL',
    status: 'SCHEDULED',
    targetAudience: 'VIP Customers',
    startDate: '2024-05-01',
    endDate: '2024-05-31',
    budget: 6000,
    spent: 0,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    revenue: 0,
    createdAt: '2024-03-12',
  },
  {
    id: '5',
    name: 'Back to School Campaign',
    type: 'DISPLAY_ADS',
    status: 'DRAFT',
    targetAudience: 'Parents, Students',
    startDate: '2024-08-01',
    endDate: '2024-09-15',
    budget: 10000,
    spent: 0,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    revenue: 0,
    createdAt: '2024-03-14',
  },
  {
    id: '6',
    name: 'Customer Appreciation Week',
    type: 'SMS',
    status: 'ACTIVE',
    targetAudience: 'Loyal Customers',
    startDate: '2024-03-18',
    endDate: '2024-03-24',
    budget: 2000,
    spent: 890,
    impressions: 5600,
    clicks: 1120,
    conversions: 168,
    revenue: 8400,
    createdAt: '2024-03-15',
  },
];

export default function AdminCampaignsPage() {
  const [campaigns] = useState<Campaign[]>(demoCampaigns);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filteredCampaigns = campaigns.filter((campaign) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !campaign.name.toLowerCase().includes(query) &&
        !campaign.targetAudience.toLowerCase().includes(query)
      ) {
        return false;
      }
    }
    if (statusFilter !== 'all' && campaign.status !== statusFilter) {
      return false;
    }
    if (typeFilter !== 'all' && campaign.type !== typeFilter) {
      return false;
    }
    return true;
  });

  const getStatusBadge = (status: Campaign['status']) => {
    const styles: Record<Campaign['status'], { class: string; icon: React.ReactNode }> = {
      ACTIVE: { class: 'bg-green-100 text-green-800', icon: <Play className="h-3 w-3" /> },
      COMPLETED: { class: 'bg-blue-100 text-blue-800', icon: <CheckCircle className="h-3 w-3" /> },
      SCHEDULED: { class: 'bg-purple-100 text-purple-800', icon: <Clock className="h-3 w-3" /> },
      PAUSED: { class: 'bg-yellow-100 text-yellow-800', icon: <Pause className="h-3 w-3" /> },
      DRAFT: { class: 'bg-gray-100 text-gray-800', icon: <Edit className="h-3 w-3" /> },
    };
    return styles[status];
  };

  const getTypeIcon = (type: Campaign['type']) => {
    const icons: Record<Campaign['type'], React.ReactNode> = {
      EMAIL: <Mail className="h-4 w-4" />,
      SMS: <Mail className="h-4 w-4" />,
      PUSH: <Megaphone className="h-4 w-4" />,
      SOCIAL_MEDIA: <Users className="h-4 w-4" />,
      DISPLAY_ADS: <Target className="h-4 w-4" />,
    };
    return icons[type];
  };

  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter((c) => c.status === 'ACTIVE').length;
  const totalSpent = campaigns.reduce((acc, c) => acc + c.spent, 0);
  const totalRevenue = campaigns.reduce((acc, c) => acc + c.revenue, 0);
  const roi = totalSpent > 0 ? ((totalRevenue - totalSpent) / totalSpent) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/admin" className="hover:text-foreground">Admin</Link>
        <span>/</span>
        <Link href="/admin/marketing" className="hover:text-foreground">Marketing</Link>
        <span>/</span>
        <span className="text-foreground">Campaigns</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marketing Campaigns</h1>
          <p className="text-muted-foreground">
            Create and manage marketing campaigns across all channels
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Campaign
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Campaigns</p>
                <p className="text-2xl font-bold">{totalCampaigns}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Megaphone className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Campaigns</p>
                <p className="text-2xl font-bold">{activeCampaigns}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <Play className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Spent</p>
                <p className="text-2xl font-bold">${(totalSpent / 1000).toFixed(1)}k</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Average ROI</p>
                <p className="text-2xl font-bold">{roi.toFixed(0)}%</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by campaign name or audience..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              className="rounded-md border px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="COMPLETED">Completed</option>
              <option value="PAUSED">Paused</option>
              <option value="DRAFT">Draft</option>
            </select>
            <select
              className="rounded-md border px-3 py-2 text-sm"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="EMAIL">Email</option>
              <option value="SMS">SMS</option>
              <option value="PUSH">Push Notification</option>
              <option value="SOCIAL_MEDIA">Social Media</option>
              <option value="DISPLAY_ADS">Display Ads</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Campaigns Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">Campaign</th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">Type</th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">Status</th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">Performance</th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">Budget</th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">Revenue</th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">ROI</th>
                  <th className="p-4 text-right text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredCampaigns.map((campaign) => {
                  const statusInfo = getStatusBadge(campaign.status);
                  const budgetUsed = campaign.budget > 0 ? (campaign.spent / campaign.budget) * 100 : 0;
                  const ctr = campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 : 0;
                  const conversionRate = campaign.clicks > 0 ? (campaign.conversions / campaign.clicks) * 100 : 0;
                  const campaignRoi = campaign.spent > 0 ? ((campaign.revenue - campaign.spent) / campaign.spent) * 100 : 0;

                  return (
                    <tr key={campaign.id} className="hover:bg-muted/50">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                            {getTypeIcon(campaign.type)}
                          </div>
                          <div>
                            <p className="font-medium">{campaign.name}</p>
                            <p className="text-sm text-muted-foreground">{campaign.targetAudience}</p>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                              <Calendar className="h-3 w-3" />
                              <span>{new Date(campaign.startDate).toLocaleDateString()} - {new Date(campaign.endDate).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline">
                          {campaign.type.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Badge className={statusInfo.class}>
                          <span className="flex items-center gap-1">
                            {statusInfo.icon}
                            {campaign.status}
                          </span>
                        </Badge>
                      </td>
                      <td className="p-4">
                        {campaign.impressions > 0 ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <Eye className="h-3 w-3 text-muted-foreground" />
                              <span>{(campaign.impressions / 1000).toFixed(1)}k impressions</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <MousePointerClick className="h-3 w-3 text-muted-foreground" />
                              <span>{campaign.clicks} clicks ({ctr.toFixed(1)}%)</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Target className="h-3 w-3 text-muted-foreground" />
                              <span>{campaign.conversions} conv. ({conversionRate.toFixed(1)}%)</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-medium">
                            ${campaign.spent.toLocaleString()} / ${campaign.budget.toLocaleString()}
                          </p>
                          {campaign.budget > 0 && (
                            <>
                              <div className="w-24 h-2 bg-gray-200 rounded-full mt-1">
                                <div
                                  className={`h-full rounded-full ${
                                    budgetUsed >= 90 ? 'bg-red-500' : budgetUsed >= 70 ? 'bg-yellow-500' : 'bg-green-500'
                                  }`}
                                  style={{ width: `${Math.min(budgetUsed, 100)}%` }}
                                />
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {budgetUsed.toFixed(0)}% used
                              </p>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        {campaign.revenue > 0 ? (
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-4 w-4 text-green-500" />
                            <span className="font-medium">
                              ${campaign.revenue.toLocaleString()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        {campaign.spent > 0 ? (
                          <span className={`font-medium ${campaignRoi > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {campaignRoi > 0 ? '+' : ''}{campaignRoi.toFixed(0)}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-1">
                          <Link href={`/admin/marketing/campaigns/${campaign.id}`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <BarChart3 className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredCampaigns.length === 0 && (
            <div className="p-12 text-center">
              <Megaphone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium text-gray-900 mb-2">No campaigns found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search or filters
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
