'use client';

import { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  ShoppingBag,
  Package,
  Eye,
  ArrowRight,
  Calendar,
  Download,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function AdminAnalyticsPage() {
  const [dateRange, setDateRange] = useState('30d');

  // Demo data
  const metrics = {
    revenue: { value: 125430, change: 12.5, target: 150000 },
    orders: { value: 1284, change: 8.2, target: 1500 },
    customers: { value: 5420, change: 15.3, target: 6000 },
    avgOrderValue: { value: 97.69, change: 4.1, target: 100 },
  };

  const revenueByCategory = [
    { category: 'Electronics', revenue: 45200, percentage: 36 },
    { category: 'Clothing', revenue: 32100, percentage: 26 },
    { category: 'Home & Garden', revenue: 18900, percentage: 15 },
    { category: 'Sports', revenue: 15600, percentage: 12 },
    { category: 'Beauty', revenue: 13630, percentage: 11 },
  ];

  const topProducts = [
    { name: 'Wireless Headphones', sales: 1250, revenue: 99875 },
    { name: 'Smart Watch Pro', sales: 890, revenue: 133350 },
    { name: 'Premium T-Shirt', sales: 2100, revenue: 62979 },
    { name: 'Fitness Tracker', sales: 756, revenue: 113343 },
    { name: 'Leather Wallet', sales: 645, revenue: 32225 },
  ];

  const trafficSources = [
    { source: 'Organic Search', visits: 45200, conversion: 3.2 },
    { source: 'Direct', visits: 28100, conversion: 4.5 },
    { source: 'Social Media', visits: 18900, conversion: 2.1 },
    { source: 'Email', visits: 12600, conversion: 5.8 },
    { source: 'Paid Ads', visits: 8930, conversion: 2.8 },
  ];

  const dailyStats = [
    { day: 'Mon', orders: 185, revenue: 14280 },
    { day: 'Tue', orders: 210, revenue: 16520 },
    { day: 'Wed', orders: 195, revenue: 15340 },
    { day: 'Thu', orders: 220, revenue: 17890 },
    { day: 'Fri', orders: 245, revenue: 19650 },
    { day: 'Sat', orders: 280, revenue: 22480 },
    { day: 'Sun', orders: 195, revenue: 15270 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-muted-foreground">
            Track your store's performance and growth
          </p>
        </div>
        <div className="flex gap-2">
          <select
            className="rounded-md border px-3 py-2 text-sm"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="12m">Last 12 months</option>
          </select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <Badge
                className={
                  metrics.revenue.change >= 0
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }
              >
                {metrics.revenue.change >= 0 ? '+' : ''}
                {metrics.revenue.change}%
              </Badge>
            </div>
            <p className="text-2xl font-bold">${metrics.revenue.value.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Total Revenue</p>
            <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full"
                style={{ width: `${(metrics.revenue.value / metrics.revenue.target) * 100}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {((metrics.revenue.value / metrics.revenue.target) * 100).toFixed(0)}% of target
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <ShoppingBag className="h-5 w-5 text-blue-600" />
              </div>
              <Badge className="bg-green-100 text-green-800">
                +{metrics.orders.change}%
              </Badge>
            </div>
            <p className="text-2xl font-bold">{metrics.orders.value.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Total Orders</p>
            <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${(metrics.orders.value / metrics.orders.target) * 100}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {((metrics.orders.value / metrics.orders.target) * 100).toFixed(0)}% of target
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <Badge className="bg-green-100 text-green-800">
                +{metrics.customers.change}%
              </Badge>
            </div>
            <p className="text-2xl font-bold">{metrics.customers.value.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Total Customers</p>
            <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full"
                style={{ width: `${(metrics.customers.value / metrics.customers.target) * 100}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {((metrics.customers.value / metrics.customers.target) * 100).toFixed(0)}% of target
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                <Package className="h-5 w-5 text-orange-600" />
              </div>
              <Badge className="bg-green-100 text-green-800">
                +{metrics.avgOrderValue.change}%
              </Badge>
            </div>
            <p className="text-2xl font-bold">${metrics.avgOrderValue.value.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground">Avg. Order Value</p>
            <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-500 rounded-full"
                style={{
                  width: `${(metrics.avgOrderValue.value / metrics.avgOrderValue.target) * 100}%`,
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {((metrics.avgOrderValue.value / metrics.avgOrderValue.target) * 100).toFixed(0)}% of
              target
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Daily Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Performance</CardTitle>
            <CardDescription>Orders and revenue over the past week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dailyStats.map((day, i) => (
                <div key={day.day} className="flex items-center gap-4">
                  <span className="w-8 text-sm font-medium">{day.day}</span>
                  <div className="flex-1">
                    <div className="flex gap-2 mb-1">
                      <div
                        className="h-6 bg-blue-500 rounded"
                        style={{ width: `${(day.orders / 300) * 100}%` }}
                      />
                      <span className="text-sm">{day.orders} orders</span>
                    </div>
                    <div className="flex gap-2">
                      <div
                        className="h-6 bg-green-500 rounded"
                        style={{ width: `${(day.revenue / 25000) * 100}%` }}
                      />
                      <span className="text-sm">${day.revenue.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Revenue by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Category</CardTitle>
            <CardDescription>Top performing product categories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {revenueByCategory.map((cat) => (
                <div key={cat.category}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{cat.category}</span>
                    <span className="text-sm">
                      ${cat.revenue.toLocaleString()} ({cat.percentage}%)
                    </span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${cat.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Top Selling Products</CardTitle>
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProducts.map((product, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center font-bold text-muted-foreground">
                      #{i + 1}
                    </div>
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {product.sales.toLocaleString()} sales
                      </p>
                    </div>
                  </div>
                  <p className="font-medium text-green-600">
                    ${product.revenue.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Traffic Sources */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Traffic Sources</CardTitle>
              <Button variant="ghost" size="sm">
                View Details
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {trafficSources.map((source) => (
                <div
                  key={source.source}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Eye className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">{source.source}</p>
                      <p className="text-sm text-muted-foreground">
                        {source.visits.toLocaleString()} visits
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{source.conversion}%</p>
                    <p className="text-xs text-muted-foreground">Conversion</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
