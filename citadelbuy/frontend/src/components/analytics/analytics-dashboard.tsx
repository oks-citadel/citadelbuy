'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DollarSign,
  ShoppingCart,
  Eye,
  TrendingUp,
  TrendingDown,
  Package,
  AlertTriangle
} from 'lucide-react';

interface AnalyticsDashboardProps {
  vendorId?: string;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  format?: 'currency' | 'number' | 'percentage';
}

function MetricCard({ title, value, change, icon, format = 'number' }: MetricCardProps) {
  const formatValue = (val: string | number) => {
    if (format === 'currency') {
      return `$${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else if (format === 'percentage') {
      return `${Number(val).toFixed(1)}%`;
    }
    return val.toLocaleString();
  };

  const isPositiveChange = change !== undefined && change >= 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="h-4 w-4 text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatValue(value)}</div>
        {change !== undefined && (
          <p className={`text-xs flex items-center gap-1 mt-1 ${
            isPositiveChange ? 'text-green-600' : 'text-red-600'
          }`}>
            {isPositiveChange ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(change).toFixed(1)}% from last period
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function AnalyticsDashboard({ vendorId }: AnalyticsDashboardProps) {
  const [overview, setOverview] = useState<any>(null);
  const [comparison, setComparison] = useState<any>(null);
  const [realtime, setRealtime] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchAnalytics();
    fetchRealtime();

    // Refresh realtime data every 30 seconds
    const interval = setInterval(fetchRealtime, 30000);
    return () => clearInterval(interval);
  }, [dateRange, vendorId]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });

      const [overviewRes, comparisonRes] = await Promise.all([
        fetch(`/api/analytics-dashboard/vendor/overview?${params}`),
        fetch(`/api/analytics-dashboard/vendor/comparison?${params}`),
      ]);

      const [overviewData, comparisonData] = await Promise.all([
        overviewRes.json(),
        comparisonRes.json(),
      ]);

      setOverview(overviewData);
      setComparison(comparisonData);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRealtime = async () => {
    try {
      const res = await fetch('/api/analytics-dashboard/realtime');
      const data = await res.json();
      setRealtime(data);
    } catch (error) {
      console.error('Failed to fetch realtime data:', error);
    }
  };

  if (loading || !overview || !comparison) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Date Range Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Date Range</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div>
              <label className="text-sm font-medium">Start Date</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                className="w-full mt-1 p-2 border rounded"
              />
            </div>
            <div>
              <label className="text-sm font-medium">End Date</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                className="w-full mt-1 p-2 border rounded"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Real-time Metrics */}
      {realtime && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Today's Activity</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Orders Today"
              value={realtime.todayOrders}
              icon={<ShoppingCart className="h-4 w-4" />}
            />
            <MetricCard
              title="Revenue Today"
              value={realtime.todayRevenue}
              icon={<DollarSign className="h-4 w-4" />}
              format="currency"
            />
            <MetricCard
              title="Pending Orders"
              value={realtime.pendingOrders}
              icon={<Package className="h-4 w-4" />}
            />
            <MetricCard
              title="Low Stock Items"
              value={realtime.lowStockProducts}
              icon={<AlertTriangle className="h-4 w-4 text-yellow-500" />}
            />
          </div>
        </div>
      )}

      {/* Main Metrics */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Performance Overview</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Revenue"
            value={overview.totalRevenue}
            change={comparison.changes.revenue}
            icon={<DollarSign className="h-4 w-4" />}
            format="currency"
          />
          <MetricCard
            title="Total Orders"
            value={overview.totalOrders}
            change={comparison.changes.orders}
            icon={<ShoppingCart className="h-4 w-4" />}
          />
          <MetricCard
            title="Total Views"
            value={overview.totalViews}
            change={comparison.changes.views}
            icon={<Eye className="h-4 w-4" />}
          />
          <MetricCard
            title="Conversion Rate"
            value={overview.averageConversionRate}
            change={comparison.changes.conversionRate}
            icon={<TrendingUp className="h-4 w-4" />}
            format="percentage"
          />
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Average Order Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              ${overview.averageOrderValue.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Units Sold</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {overview.totalUnits.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ad Spend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              ${overview.adSpend.toFixed(2)}
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {overview.adConversions} conversions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {realtime && realtime.outOfStock > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <p className="font-semibold">
                {realtime.outOfStock} products are out of stock
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
