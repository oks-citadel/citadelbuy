'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  Percent,
  Target,
  DollarSign,
  Users,
  Tag,
  Gift,
  Megaphone,
  ArrowRight,
  Calendar,
  Activity,
  BarChart3,
  Plus,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function AdminMarketingPage() {
  const stats = {
    activeCoupons: { value: 18, change: 3, period: 'vs last month' },
    activeCampaigns: { value: 7, change: 2, period: 'vs last month' },
    activeDeals: { value: 12, change: -1, period: 'vs last month' },
    conversionRate: { value: 4.2, change: 0.8, period: 'vs last month' },
  };

  const recentCoupons = [
    { id: 'COUP-001', code: 'SAVE20', discount: '20%', used: 145, limit: 500, status: 'ACTIVE', expires: '2024-04-15' },
    { id: 'COUP-002', code: 'FIRSTBUY', discount: '$10', used: 89, limit: 200, status: 'ACTIVE', expires: '2024-04-30' },
    { id: 'COUP-003', code: 'WELCOME', discount: '15%', used: 234, limit: 1000, status: 'ACTIVE', expires: '2024-05-01' },
    { id: 'COUP-004', code: 'FLASH50', discount: '50%', used: 500, limit: 500, status: 'EXPIRED', expires: '2024-03-10' },
  ];

  const campaignPerformance = [
    { name: 'Spring Sale 2024', type: 'Email', sent: 12450, opened: 6225, clicked: 1245, revenue: 45600, roi: 380 },
    { name: 'New Arrivals', type: 'Social Media', impressions: 89000, clicks: 4450, conversions: 445, revenue: 22250, roi: 320 },
    { name: 'Flash Weekend', type: 'Push Notification', sent: 8900, opened: 5340, clicked: 1068, revenue: 15600, roi: 295 },
  ];

  const upcomingDeals = [
    { id: 'DEAL-001', name: 'Summer Collection Sale', discount: '30% OFF', startDate: '2024-04-01', endDate: '2024-04-07', status: 'SCHEDULED' },
    { id: 'DEAL-002', name: 'Electronics Flash Deal', discount: 'Up to 50% OFF', startDate: '2024-03-25', endDate: '2024-03-25', status: 'SCHEDULED' },
    { id: 'DEAL-003', name: 'Buy 2 Get 1 Free', discount: 'BOGO', startDate: '2024-03-20', endDate: '2024-03-31', status: 'ACTIVE' },
  ];

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-800',
      EXPIRED: 'bg-gray-100 text-gray-800',
      SCHEDULED: 'bg-blue-100 text-blue-800',
      PAUSED: 'bg-yellow-100 text-yellow-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marketing Dashboard</h1>
          <p className="text-muted-foreground">
            Manage coupons, campaigns, and promotional deals
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <BarChart3 className="h-4 w-4 mr-2" />
            View Reports
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Campaign
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Coupons</p>
                <p className="text-2xl font-bold">{stats.activeCoupons.value}</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600">+{stats.activeCoupons.change}</span>
                  <span className="text-xs text-muted-foreground">{stats.activeCoupons.period}</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Tag className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Campaigns</p>
                <p className="text-2xl font-bold">{stats.activeCampaigns.value}</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600">+{stats.activeCampaigns.change}</span>
                  <span className="text-xs text-muted-foreground">{stats.activeCampaigns.period}</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Megaphone className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Deals</p>
                <p className="text-2xl font-bold">{stats.activeDeals.value}</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-red-600">{stats.activeDeals.change}</span>
                  <span className="text-xs text-muted-foreground">{stats.activeDeals.period}</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                <Gift className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
                <p className="text-2xl font-bold">{stats.conversionRate.value}%</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600">+{stats.conversionRate.change}%</span>
                  <span className="text-xs text-muted-foreground">{stats.conversionRate.period}</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <Target className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Coupons */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Coupons</CardTitle>
              <Link href="/admin/marketing/coupons">
                <Button variant="ghost" size="sm">
                  View All
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentCoupons.map((coupon) => (
                <div
                  key={coupon.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Percent className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">{coupon.code}</p>
                      <p className="text-sm text-muted-foreground">
                        {coupon.used} / {coupon.limit} used
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-green-600">{coupon.discount}</p>
                    <Badge className={getStatusBadge(coupon.status)} variant="outline">
                      {coupon.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Campaign Performance */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Campaign Performance</CardTitle>
              <Link href="/admin/marketing/campaigns">
                <Button variant="ghost" size="sm">
                  View All
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {campaignPerformance.map((campaign, i) => (
                <div
                  key={i}
                  className="p-3 border rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium">{campaign.name}</p>
                      <p className="text-xs text-muted-foreground">{campaign.type}</p>
                    </div>
                    <Badge className="bg-purple-100 text-purple-800">
                      ROI: {campaign.roi}%
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Revenue</p>
                      <p className="font-medium">${(campaign.revenue / 1000).toFixed(1)}k</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">
                        {campaign.type === 'Email' ? 'Opened' : campaign.type === 'Social Media' ? 'Clicks' : 'Clicked'}
                      </p>
                      <p className="font-medium">
                        {campaign.type === 'Email' ? campaign.opened : campaign.type === 'Social Media' ? campaign.clicks : campaign.clicked}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">
                        {campaign.type === 'Social Media' ? 'Conversions' : 'Click Rate'}
                      </p>
                      <p className="font-medium">
                        {campaign.type === 'Social Media'
                          ? campaign.conversions
                          : campaign.type === 'Email'
                          ? `${((campaign.clicked / campaign.opened) * 100).toFixed(1)}%`
                          : `${((campaign.clicked / campaign.opened) * 100).toFixed(1)}%`
                        }
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Deals */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Upcoming & Active Deals</CardTitle>
            <Link href="/admin/marketing/deals">
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {upcomingDeals.map((deal) => (
              <div
                key={deal.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-orange-100 flex items-center justify-center">
                    <Gift className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-medium">{deal.name}</p>
                    <p className="text-sm text-green-600 font-medium">{deal.discount}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(deal.startDate).toLocaleDateString()} - {new Date(deal.endDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <Badge className={getStatusBadge(deal.status)}>
                  {deal.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common marketing tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: Tag, label: 'Create Coupon', href: '/admin/marketing/coupons/new', color: 'bg-blue-100 text-blue-600' },
              { icon: Megaphone, label: 'New Campaign', href: '/admin/marketing/campaigns/new', color: 'bg-purple-100 text-purple-600' },
              { icon: Gift, label: 'Add Deal', href: '/admin/marketing/deals/new', color: 'bg-orange-100 text-orange-600' },
              { icon: BarChart3, label: 'View Analytics', href: '/admin/analytics', color: 'bg-green-100 text-green-600' },
            ].map((action, i) => (
              <Link key={i} href={action.href}>
                <div className="p-4 border rounded-lg text-center hover:border-primary/50 transition-colors cursor-pointer">
                  <div className={`h-12 w-12 rounded-full ${action.color} flex items-center justify-center mx-auto mb-3`}>
                    <action.icon className="h-6 w-6" />
                  </div>
                  <p className="font-medium text-sm">{action.label}</p>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
