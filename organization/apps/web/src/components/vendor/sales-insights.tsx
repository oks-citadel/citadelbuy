'use client';

import * as React from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  Download,
  Calendar,
  ChevronDown,
  ArrowUpRight,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn, formatCurrency } from '@/lib/utils';
import { useSalesAnalytics, useSalesPredictions, useExportAnalytics } from '@/hooks/use-vendor';
import { useVendorStore } from '@/stores/vendor-store';
import { SalesAnalytics, TopProduct, SalesTrend } from '@/types/vendor';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// Mock data
const mockAnalytics: SalesAnalytics = {
  summary: {
    totalRevenue: 48392.50,
    revenueChange: 12.5,
    totalOrders: 324,
    ordersChange: 8.2,
    avgOrderValue: 149.35,
    aovChange: 4.1,
    unitsSold: 892,
    unitsSoldChange: 15.3,
    grossMargin: 34.2,
    marginChange: 2.1,
    period: 'MONTH',
  },
  trends: [
    { date: '2024-01-01', revenue: 1250, orders: 12, unitsSold: 28, avgOrderValue: 104.17 },
    { date: '2024-01-02', revenue: 1890, orders: 15, unitsSold: 35, avgOrderValue: 126.00 },
    { date: '2024-01-03', revenue: 2150, orders: 18, unitsSold: 42, avgOrderValue: 119.44 },
    { date: '2024-01-04', revenue: 1780, orders: 14, unitsSold: 31, avgOrderValue: 127.14 },
    { date: '2024-01-05', revenue: 2340, orders: 19, unitsSold: 45, avgOrderValue: 123.16 },
    { date: '2024-01-06', revenue: 2890, orders: 22, unitsSold: 52, avgOrderValue: 131.36 },
    { date: '2024-01-07', revenue: 3120, orders: 25, unitsSold: 58, avgOrderValue: 124.80 },
  ],
  topProducts: [
    { productId: '1', productName: 'Wireless Headphones Pro', productImage: '', revenue: 8450, unitsSold: 85, growth: 23.5, margin: 42, stockLevel: 156 },
    { productId: '2', productName: 'Smart Watch Elite', productImage: '', revenue: 6780, unitsSold: 45, growth: 18.2, margin: 38, stockLevel: 89 },
    { productId: '3', productName: 'Portable Charger 20000mAh', productImage: '', revenue: 4560, unitsSold: 152, growth: 31.8, margin: 35, stockLevel: 234 },
    { productId: '4', productName: 'Bluetooth Speaker Mini', productImage: '', revenue: 3890, unitsSold: 97, growth: -5.2, margin: 40, stockLevel: 67 },
    { productId: '5', productName: 'USB-C Hub 7-in-1', productImage: '', revenue: 3210, unitsSold: 64, growth: 12.4, margin: 45, stockLevel: 112 },
  ],
  categoryBreakdown: [
    { categoryId: '1', categoryName: 'Electronics', revenue: 24500, revenueShare: 50.6, unitsSold: 245, growth: 15.2 },
    { categoryId: '2', categoryName: 'Accessories', revenue: 12300, revenueShare: 25.4, unitsSold: 312, growth: 8.7 },
    { categoryId: '3', categoryName: 'Audio', revenue: 8200, revenueShare: 16.9, unitsSold: 164, growth: 22.1 },
    { categoryId: '4', categoryName: 'Wearables', revenue: 3400, revenueShare: 7.1, unitsSold: 45, growth: -3.4 },
  ],
  customerInsights: {
    newCustomers: 156,
    returningCustomers: 168,
    repeatPurchaseRate: 34.5,
    customerLifetimeValue: 287.50,
    topCustomerSegments: [
      { name: 'Tech Enthusiasts', count: 145, revenue: 18500, avgOrderValue: 127.59 },
      { name: 'Casual Buyers', count: 98, revenue: 8900, avgOrderValue: 90.82 },
      { name: 'Premium Customers', count: 42, revenue: 12400, avgOrderValue: 295.24 },
    ],
  },
  predictions: [
    { date: '2024-01-08', predictedRevenue: 3250, predictedOrders: 26, confidence: 0.85, factors: [] },
    { date: '2024-01-09', predictedRevenue: 3420, predictedOrders: 28, confidence: 0.82, factors: [] },
    { date: '2024-01-10', predictedRevenue: 3180, predictedOrders: 25, confidence: 0.78, factors: [] },
  ],
};

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const dateRanges = [
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 90 days', value: '90d' },
  { label: 'This Year', value: 'ytd' },
];

function StatCard({
  title,
  value,
  change,
  icon,
  prefix = '',
  suffix = '',
}: {
  title: string;
  value: number | string;
  change: number;
  icon: React.ReactNode;
  prefix?: string;
  suffix?: string;
}) {
  const isPositive = change >= 0;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="p-2 rounded-lg bg-primary/10">{icon}</div>
          <div
            className={cn(
              'flex items-center gap-1 text-sm font-medium',
              isPositive ? 'text-success' : 'text-destructive'
            )}
          >
            {isPositive ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            {Math.abs(change)}%
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold">
          {prefix}
          {typeof value === 'number' ? value.toLocaleString() : value}
          {suffix}
        </p>
      </CardContent>
    </Card>
  );
}

function TopProductsTable({ products }: { products: TopProduct[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
              Product
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
              Revenue
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
              Units Sold
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
              Growth
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
              Stock
            </th>
          </tr>
        </thead>
        <tbody>
          {products.map((product, index) => (
            <tr key={product.productId} className="border-b last:border-0">
              <td className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <span className="text-sm font-medium">{index + 1}</span>
                  </div>
                  <span className="font-medium">{product.productName}</span>
                </div>
              </td>
              <td className="text-right py-3 px-4 font-medium">
                {formatCurrency(product.revenue)}
              </td>
              <td className="text-right py-3 px-4">{product.unitsSold}</td>
              <td className="text-right py-3 px-4">
                <span
                  className={cn(
                    'font-medium',
                    product.growth >= 0 ? 'text-success' : 'text-destructive'
                  )}
                >
                  {product.growth >= 0 ? '+' : ''}{product.growth}%
                </span>
              </td>
              <td className="text-right py-3 px-4">
                <Badge
                  variant={
                    product.stockLevel > 100
                      ? 'default'
                      : product.stockLevel > 50
                      ? 'secondary'
                      : 'destructive'
                  }
                >
                  {product.stockLevel}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SalesInsights() {
  const { analyticsDateRange, setAnalyticsDateRange } = useVendorStore();
  const [selectedRange, setSelectedRange] = React.useState('30d');

  const { data: analytics, isLoading } = useSalesAnalytics(analyticsDateRange);
  const { data: predictions } = useSalesPredictions(30);
  const exportReport = useExportAnalytics();

  const salesData = analytics || mockAnalytics;

  const handleExport = (format: 'CSV' | 'EXCEL' | 'PDF') => {
    exportReport.mutate({
      type: 'SALES',
      format,
      dateRange: analyticsDateRange,
    });
  };

  const handleDateRangeChange = (range: string) => {
    setSelectedRange(range);
    const endDate = new Date().toISOString().split('T')[0];
    let startDate: string;

    switch (range) {
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '90d':
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case 'ytd':
        startDate = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
        break;
      default:
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }

    setAnalyticsDateRange({ start: startDate, end: endDate });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {dateRanges.map((range) => (
            <Button
              key={range.value}
              variant={selectedRange === range.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleDateRangeChange(range.value)}
            >
              {range.label}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('CSV')}
            disabled={exportReport.isPending}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Revenue"
          value={salesData.summary.totalRevenue}
          change={salesData.summary.revenueChange}
          icon={<DollarSign className="h-5 w-5 text-primary" />}
          prefix="$"
        />
        <StatCard
          title="Orders"
          value={salesData.summary.totalOrders}
          change={salesData.summary.ordersChange}
          icon={<ShoppingCart className="h-5 w-5 text-primary" />}
        />
        <StatCard
          title="Avg Order Value"
          value={salesData.summary.avgOrderValue}
          change={salesData.summary.aovChange}
          icon={<ArrowUpRight className="h-5 w-5 text-primary" />}
          prefix="$"
        />
        <StatCard
          title="Units Sold"
          value={salesData.summary.unitsSold}
          change={salesData.summary.unitsSoldChange}
          icon={<Package className="h-5 w-5 text-primary" />}
        />
        <StatCard
          title="Gross Margin"
          value={salesData.summary.grossMargin}
          change={salesData.summary.marginChange}
          icon={<TrendingUp className="h-5 w-5 text-primary" />}
          suffix="%"
        />
      </div>

      {/* Revenue Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
          <CardDescription>Daily revenue over the selected period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData.trends}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgb(99, 102, 241)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="rgb(99, 102, 241)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  stroke="#9ca3af"
                />
                <YAxis
                  tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
                  stroke="#9ca3af"
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                  labelFormatter={(label) => new Date(label).toLocaleDateString()}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="rgb(99, 102, 241)"
                  fill="url(#revenueGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Top Products</CardTitle>
            <CardDescription>Best performing products by revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <TopProductsTable products={salesData.topProducts} />
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Sales by Category</CardTitle>
            <CardDescription>Revenue distribution across categories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={salesData.categoryBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="revenue"
                    nameKey="categoryName"
                  >
                    {salesData.categoryBreakdown.map((entry, index) => (
                      <Cell key={entry.categoryId} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {salesData.categoryBreakdown.map((category, index) => (
                <div key={category.categoryId} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-sm truncate">{category.categoryName}</span>
                  <span className="text-sm text-muted-foreground ml-auto">
                    {category.revenueShare.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Insights</CardTitle>
          <CardDescription>Understanding your customer base</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">New Customers</p>
              <p className="text-2xl font-bold">{salesData.customerInsights.newCustomers}</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Returning</p>
              <p className="text-2xl font-bold">{salesData.customerInsights.returningCustomers}</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Repeat Rate</p>
              <p className="text-2xl font-bold">{salesData.customerInsights.repeatPurchaseRate}%</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Avg. CLV</p>
              <p className="text-2xl font-bold">
                {formatCurrency(salesData.customerInsights.customerLifetimeValue)}
              </p>
            </div>
          </div>

          <h4 className="font-medium mb-3">Top Customer Segments</h4>
          <div className="space-y-3">
            {salesData.customerInsights.topCustomerSegments.map((segment) => (
              <div
                key={segment.name}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div>
                  <p className="font-medium">{segment.name}</p>
                  <p className="text-sm text-muted-foreground">{segment.count} customers</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{formatCurrency(segment.revenue)}</p>
                  <p className="text-sm text-muted-foreground">
                    AOV: {formatCurrency(segment.avgOrderValue)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
