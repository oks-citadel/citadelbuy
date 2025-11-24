'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowLeft, TrendingUp, TrendingDown, DollarSign, Package, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import type { ReturnAnalytics } from '@/lib/api/returns';

export default function ReturnsAnalyticsPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  const [analytics, setAnalytics] = useState<ReturnAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30'); // days

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/admin/returns/analytics');
      return;
    }

    if (user?.role !== 'admin') {
      router.push('/');
      return;
    }

    fetchAnalytics();
  }, [isAuthenticated, user, router, timeRange]);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      const { returnsApi } = await import('@/lib/api/returns');

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(timeRange));

      const data = await returnsApi.getAnalytics(
        startDate.toISOString(),
        endDate.toISOString()
      );
      setAnalytics(data);
    } catch (err: any) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex min-h-[400px] flex-col items-center justify-center">
          <h2 className="text-2xl font-bold">No Analytics Available</h2>
          <Link href="/admin/returns">
            <Button className="mt-4">Back to Returns</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/admin/returns">
          <Button variant="ghost">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Returns
          </Button>
        </Link>
        <div className="mt-4 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Returns Analytics</h1>
            <p className="mt-2 text-muted-foreground">
              Insights and trends for return requests
            </p>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Total Returns</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalReturns}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {analytics.pendingReturns} pending approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Return Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.returnRate.toFixed(2)}%</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Of total orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Total Refunded</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${analytics.totalRefundAmount.toFixed(2)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Across {analytics.totalReturns} returns
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Avg Processing Time</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.averageProcessingTime.toFixed(1)} days
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              From request to completion
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Return Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Return Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Pending Approval</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-32 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full bg-yellow-500"
                      style={{
                        width: `${(analytics.pendingReturns / analytics.totalReturns) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-bold">{analytics.pendingReturns}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Approved</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-32 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full bg-blue-500"
                      style={{
                        width: `${(analytics.approvedReturns / analytics.totalReturns) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-bold">{analytics.approvedReturns}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Rejected</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-32 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full bg-red-500"
                      style={{
                        width: `${(analytics.rejectedReturns / analytics.totalReturns) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-bold">{analytics.rejectedReturns}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Return Types */}
        <Card>
          <CardHeader>
            <CardTitle>Return Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.returnsByType.map((item) => (
                <div key={item.type} className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {item.type.split('_').join(' ')}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-32 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full bg-primary"
                        style={{
                          width: `${(item.count / analytics.totalReturns) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-bold">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Return Reasons */}
        <Card>
          <CardHeader>
            <CardTitle>Top Return Reasons</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.topReasons.map((item, index) => (
                <div key={item.reason} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium">
                      {item.reason.split('_').join(' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full bg-orange-500"
                        style={{
                          width: `${(item.count / analytics.topReasons[0].count) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-bold">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Monthly Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.monthlyTrends.slice(0, 6).map((item) => (
                <div key={item.month} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{item.month}</span>
                    <div className="flex gap-4">
                      <span className="text-muted-foreground">
                        {item.count} returns
                      </span>
                      <span className="font-bold">
                        ${item.refundAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                      style={{
                        width: `${(item.refundAmount / Math.max(...analytics.monthlyTrends.map((t) => t.refundAmount))) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Items */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Insights & Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.returnRate > 10 && (
              <div className="flex items-start gap-3 rounded-lg bg-red-50 p-4">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <div>
                  <h4 className="font-semibold text-red-900">High Return Rate</h4>
                  <p className="text-sm text-red-700">
                    Your return rate of {analytics.returnRate.toFixed(2)}% is above the industry average.
                    Review product descriptions and quality control processes.
                  </p>
                </div>
              </div>
            )}
            {analytics.averageProcessingTime > 7 && (
              <div className="flex items-start gap-3 rounded-lg bg-yellow-50 p-4">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <div>
                  <h4 className="font-semibold text-yellow-900">Slow Processing Time</h4>
                  <p className="text-sm text-yellow-700">
                    Returns are taking {analytics.averageProcessingTime.toFixed(1)} days on average to process.
                    Consider streamlining your approval and inspection workflow.
                  </p>
                </div>
              </div>
            )}
            {analytics.topReasons[0]?.count > analytics.totalReturns * 0.3 && (
              <div className="flex items-start gap-3 rounded-lg bg-blue-50 p-4">
                <AlertCircle className="h-5 w-5 text-blue-600" />
                <div>
                  <h4 className="font-semibold text-blue-900">Top Return Reason</h4>
                  <p className="text-sm text-blue-700">
                    {analytics.topReasons[0].reason.split('_').join(' ')} accounts for{' '}
                    {((analytics.topReasons[0].count / analytics.totalReturns) * 100).toFixed(1)}% of returns.
                    Address this issue to reduce return volume.
                  </p>
                </div>
              </div>
            )}
            {analytics.pendingReturns > 10 && (
              <div className="flex items-start gap-3 rounded-lg bg-orange-50 p-4">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                <div>
                  <h4 className="font-semibold text-orange-900">Pending Approvals Backlog</h4>
                  <p className="text-sm text-orange-700">
                    You have {analytics.pendingReturns} returns awaiting approval.
                    Process these promptly to maintain customer satisfaction.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
