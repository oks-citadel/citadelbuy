'use client';

import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  CreditCard,
  Download,
  RefreshCw,
  Calendar,
  Filter,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// Types
interface RevenueMetric {
  value: number;
  change: number;
  changeType: 'increase' | 'decrease';
}

interface RevenueByProvider {
  provider: string;
  revenue: number;
  transactions: number;
  percentage: number;
}

interface RevenueByPlan {
  plan: string;
  revenue: number;
  subscribers: number;
  churnRate: number;
}

interface RevenueByRegion {
  region: string;
  country: string;
  revenue: number;
  transactions: number;
}

interface RecentTransaction {
  id: string;
  date: string;
  customer: string;
  email: string;
  amount: number;
  currency: string;
  provider: string;
  type: string;
  status: string;
}

interface DashboardData {
  overview: {
    totalRevenue: RevenueMetric;
    mrr: RevenueMetric;
    arr: RevenueMetric;
    activeSubscribers: RevenueMetric;
    avgOrderValue: RevenueMetric;
    conversionRate: RevenueMetric;
  };
  byProvider: RevenueByProvider[];
  byPlan: RevenueByPlan[];
  byRegion: RevenueByRegion[];
  recentTransactions: RecentTransaction[];
  chartData: {
    labels: string[];
    revenue: number[];
    transactions: number[];
  };
}

// API helper
const api = {
  get: async (url: string) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}${url}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });
    return res.json();
  },
};

// Mock data for demonstration
const mockData: DashboardData = {
  overview: {
    totalRevenue: { value: 125430.50, change: 12.5, changeType: 'increase' },
    mrr: { value: 45200, change: 8.3, changeType: 'increase' },
    arr: { value: 542400, change: 15.2, changeType: 'increase' },
    activeSubscribers: { value: 4523, change: 3.2, changeType: 'increase' },
    avgOrderValue: { value: 78.50, change: -2.1, changeType: 'decrease' },
    conversionRate: { value: 3.2, change: 0.5, changeType: 'increase' },
  },
  byProvider: [
    { provider: 'Stripe', revenue: 89500, transactions: 1245, percentage: 71.4 },
    { provider: 'PayPal', revenue: 24300, transactions: 456, percentage: 19.4 },
    { provider: 'Flutterwave', revenue: 7800, transactions: 234, percentage: 6.2 },
    { provider: 'Paystack', revenue: 3830, transactions: 98, percentage: 3.0 },
  ],
  byPlan: [
    { plan: 'VIP', revenue: 52400, subscribers: 523, churnRate: 2.1 },
    { plan: 'Premium', revenue: 45200, subscribers: 1240, churnRate: 3.5 },
    { plan: 'Basic', revenue: 27830, subscribers: 2760, churnRate: 5.2 },
  ],
  byRegion: [
    { region: 'North America', country: 'US', revenue: 68500, transactions: 892 },
    { region: 'Europe', country: 'UK', revenue: 32100, transactions: 421 },
    { region: 'Africa', country: 'NG', revenue: 12400, transactions: 312 },
    { region: 'Asia', country: 'SG', revenue: 8200, transactions: 156 },
    { region: 'Oceania', country: 'AU', revenue: 4230, transactions: 87 },
  ],
  recentTransactions: [
    { id: 'txn_1', date: '2024-01-15T10:30:00Z', customer: 'John Doe', email: 'john@example.com', amount: 99.99, currency: 'USD', provider: 'Stripe', type: 'subscription', status: 'completed' },
    { id: 'txn_2', date: '2024-01-15T09:45:00Z', customer: 'Jane Smith', email: 'jane@example.com', amount: 49.99, currency: 'USD', provider: 'PayPal', type: 'one-time', status: 'completed' },
    { id: 'txn_3', date: '2024-01-15T08:20:00Z', customer: 'Mike Johnson', email: 'mike@example.com', amount: 199.99, currency: 'USD', provider: 'Stripe', type: 'subscription', status: 'completed' },
    { id: 'txn_4', date: '2024-01-14T16:30:00Z', customer: 'Sarah Williams', email: 'sarah@example.com', amount: 29.99, currency: 'USD', provider: 'Flutterwave', type: 'one-time', status: 'completed' },
    { id: 'txn_5', date: '2024-01-14T14:15:00Z', customer: 'Chris Brown', email: 'chris@example.com', amount: 9.99, currency: 'USD', provider: 'Paystack', type: 'wallet', status: 'completed' },
  ],
  chartData: {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    revenue: [45000, 52000, 48000, 61000, 55000, 67000, 72000, 69000, 84000, 91000, 98000, 125000],
    transactions: [580, 620, 590, 710, 680, 790, 850, 820, 980, 1050, 1120, 1420],
  },
};

export function RevenueDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30d');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, [dateRange]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // In production, this would call the actual API
      // const response = await api.get(`/admin/revenue?range=${dateRange}`);
      // setData(response.data);

      // Using mock data for demonstration
      await new Promise(resolve => setTimeout(resolve, 500));
      setData(mockData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      // In production, this would download actual data
      // const response = await api.get(`/admin/revenue/export?range=${dateRange}&format=csv`);

      // Mock CSV export
      const csvContent = [
        'Date,Customer,Email,Amount,Currency,Provider,Type,Status',
        ...mockData.recentTransactions.map(t =>
          `${t.date},${t.customer},${t.email},${t.amount},${t.currency},${t.provider},${t.type},${t.status}`
        ),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `revenue-report-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  const formatCurrency = (value: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const MetricCard = ({
    title,
    metric,
    icon: Icon,
    prefix = '',
    suffix = '',
  }: {
    title: string;
    metric: RevenueMetric;
    icon: any;
    prefix?: string;
    suffix?: string;
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {prefix}
          {typeof metric.value === 'number' && metric.value >= 1000
            ? formatCurrency(metric.value)
            : metric.value}
          {suffix}
        </div>
        <div className={`flex items-center text-xs mt-1 ${
          metric.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
        }`}>
          {metric.changeType === 'increase' ? (
            <ArrowUpRight className="h-3 w-3 mr-1" />
          ) : (
            <ArrowDownRight className="h-3 w-3 mr-1" />
          )}
          {Math.abs(metric.change)}% from last period
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Revenue Dashboard</h1>
          <p className="text-muted-foreground">Track your payment performance and revenue</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[150px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="365d">Last year</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={loadDashboardData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={handleExportCSV} disabled={isExporting}>
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Export
          </Button>
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          title="Total Revenue"
          metric={data.overview.totalRevenue}
          icon={DollarSign}
        />
        <MetricCard
          title="MRR"
          metric={data.overview.mrr}
          icon={TrendingUp}
        />
        <MetricCard
          title="ARR"
          metric={data.overview.arr}
          icon={BarChart3}
        />
        <MetricCard
          title="Active Subscribers"
          metric={data.overview.activeSubscribers}
          icon={Users}
        />
        <MetricCard
          title="Avg Order Value"
          metric={data.overview.avgOrderValue}
          icon={CreditCard}
        />
        <MetricCard
          title="Conversion Rate"
          metric={data.overview.conversionRate}
          icon={PieChart}
          suffix="%"
        />
      </div>

      {/* Tabs for detailed views */}
      <Tabs defaultValue="providers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="providers">By Provider</TabsTrigger>
          <TabsTrigger value="plans">By Plan</TabsTrigger>
          <TabsTrigger value="regions">By Region</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>

        {/* By Provider */}
        <TabsContent value="providers">
          <Card>
            <CardHeader>
              <CardTitle>Revenue by Payment Provider</CardTitle>
              <CardDescription>Breakdown of revenue across payment gateways</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.byProvider.map((provider) => (
                  <div key={provider.provider} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{provider.provider}</span>
                        <Badge variant="secondary">{provider.transactions} txns</Badge>
                      </div>
                      <span className="font-bold">{formatCurrency(provider.revenue)}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary rounded-full h-2 transition-all"
                        style={{ width: `${provider.percentage}%` }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground text-right">
                      {provider.percentage.toFixed(1)}% of total
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* By Plan */}
        <TabsContent value="plans">
          <Card>
            <CardHeader>
              <CardTitle>Revenue by Subscription Plan</CardTitle>
              <CardDescription>Performance of each subscription tier</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Subscribers</TableHead>
                    <TableHead className="text-right">Churn Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.byPlan.map((plan) => (
                    <TableRow key={plan.plan}>
                      <TableCell className="font-medium">
                        <Badge
                          variant={
                            plan.plan === 'VIP'
                              ? 'default'
                              : plan.plan === 'Premium'
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {plan.plan}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(plan.revenue)}
                      </TableCell>
                      <TableCell className="text-right">{plan.subscribers.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <span className={plan.churnRate > 4 ? 'text-red-500' : 'text-green-500'}>
                          {plan.churnRate}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* By Region */}
        <TabsContent value="regions">
          <Card>
            <CardHeader>
              <CardTitle>Revenue by Region</CardTitle>
              <CardDescription>Geographic distribution of revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Region</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Transactions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.byRegion.map((region) => (
                    <TableRow key={region.country}>
                      <TableCell className="font-medium">{region.region}</TableCell>
                      <TableCell>{region.country}</TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(region.revenue)}
                      </TableCell>
                      <TableCell className="text-right">{region.transactions}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recent Transactions */}
        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Latest payment activities</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentTransactions.map((txn) => (
                    <TableRow key={txn.id}>
                      <TableCell className="text-muted-foreground">
                        {formatDate(txn.date)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{txn.customer}</div>
                          <div className="text-xs text-muted-foreground">{txn.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{txn.provider}</Badge>
                      </TableCell>
                      <TableCell className="capitalize">{txn.type}</TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(txn.amount, txn.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={txn.status === 'completed' ? 'default' : 'secondary'}
                          className={
                            txn.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : ''
                          }
                        >
                          {txn.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default RevenueDashboard;
