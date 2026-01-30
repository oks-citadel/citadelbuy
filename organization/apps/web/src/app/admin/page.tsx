'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  Users,
  ShoppingBag,
  DollarSign,
  Package,
  ArrowRight,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  Store,
  Star,
  Activity,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  adminDashboardApi,
  type DashboardStats,
  type RecentOrder,
  type SystemAlert,
  type TopProduct,
} from '@/services/admin-api';

// Loading skeleton for stats
function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-12 w-12 rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Loading skeleton for orders/products list
function ListSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
      ))}
    </div>
  );
}

// Error state component
function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
      <p className="text-muted-foreground mb-4">{message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      )}
    </div>
  );
}

export default function AdminDashboardPage() {
  // Fetch dashboard stats
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['admin', 'dashboard', 'stats'],
    queryFn: adminDashboardApi.getStats,
  });

  // Fetch recent orders
  const {
    data: recentOrders,
    isLoading: ordersLoading,
    error: ordersError,
    refetch: refetchOrders,
  } = useQuery({
    queryKey: ['admin', 'dashboard', 'recentOrders'],
    queryFn: () => adminDashboardApi.getRecentOrders(5),
  });

  // Fetch system alerts
  const {
    data: alerts,
    isLoading: alertsLoading,
    error: alertsError,
    refetch: refetchAlerts,
  } = useQuery({
    queryKey: ['admin', 'dashboard', 'alerts'],
    queryFn: adminDashboardApi.getAlerts,
  });

  // Fetch top products
  const {
    data: topProducts,
    isLoading: productsLoading,
    error: productsError,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: ['admin', 'dashboard', 'topProducts'],
    queryFn: () => adminDashboardApi.getTopProducts(4),
  });

  // Default values for when data is loading or unavailable
  const defaultStats: DashboardStats = {
    revenue: { value: 0, change: 0, period: 'vs last month' },
    orders: { value: 0, change: 0, period: 'vs last month' },
    customers: { value: 0, change: 0, period: 'vs last month' },
    products: { value: 0, active: 0, period: 'active' },
  };

  const displayStats = stats || defaultStats;
  const displayOrders = recentOrders || [];
  const displayAlerts = alerts || [];
  const displayProducts = topProducts || [];

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      PROCESSING: 'bg-blue-100 text-blue-800',
      SHIPPED: 'bg-purple-100 text-purple-800',
      DELIVERED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here&apos;s what&apos;s happening with your store.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <BarChart3 className="h-4 w-4 mr-2" />
            View Reports
          </Button>
          <Button>
            <Package className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      {statsLoading ? (
        <StatsSkeleton />
      ) : statsError ? (
        <Card>
          <ErrorState
            message="Failed to load dashboard statistics"
            onRetry={() => refetchStats()}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold">${displayStats.revenue.value.toLocaleString()}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {displayStats.revenue.change >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                    <span className={`text-sm ${displayStats.revenue.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {displayStats.revenue.change >= 0 ? '+' : ''}{displayStats.revenue.change}%
                    </span>
                    <span className="text-xs text-muted-foreground">{displayStats.revenue.period}</span>
                  </div>
                </div>
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                  <p className="text-2xl font-bold">{displayStats.orders.value.toLocaleString()}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {displayStats.orders.change >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                    <span className={`text-sm ${displayStats.orders.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {displayStats.orders.change >= 0 ? '+' : ''}{displayStats.orders.change}%
                    </span>
                    <span className="text-xs text-muted-foreground">{displayStats.orders.period}</span>
                  </div>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <ShoppingBag className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Customers</p>
                  <p className="text-2xl font-bold">{displayStats.customers.value.toLocaleString()}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {displayStats.customers.change >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                    <span className={`text-sm ${displayStats.customers.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {displayStats.customers.change >= 0 ? '+' : ''}{displayStats.customers.change}%
                    </span>
                    <span className="text-xs text-muted-foreground">{displayStats.customers.period}</span>
                  </div>
                </div>
                <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Products</p>
                  <p className="text-2xl font-bold">{displayStats.products.value}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-muted-foreground">
                      {displayStats.products.active} {displayStats.products.period}
                    </span>
                  </div>
                </div>
                <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                  <Package className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alerts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alertsLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : alertsError ? (
            <ErrorState
              message="Failed to load system alerts"
              onRetry={() => refetchAlerts()}
            />
          ) : displayAlerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p>No alerts at this time</p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayAlerts.map((alert, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    alert.type === 'warning'
                      ? 'bg-yellow-50'
                      : alert.type === 'success'
                      ? 'bg-green-50'
                      : alert.type === 'error'
                      ? 'bg-red-50'
                      : 'bg-blue-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {alert.type === 'warning' ? (
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    ) : alert.type === 'success' ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : alert.type === 'error' ? (
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    ) : (
                      <Clock className="h-5 w-5 text-blue-600" />
                    )}
                    <span className="text-sm font-medium">{alert.message}</span>
                  </div>
                  {alert.link ? (
                    <Link href={alert.link}>
                      <Button variant="ghost" size="sm">
                        {alert.action}
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  ) : (
                    <Button variant="ghost" size="sm">
                      {alert.action}
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Orders</CardTitle>
              <Link href="/admin/orders">
                <Button variant="ghost" size="sm">
                  View All
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <ListSkeleton />
            ) : ordersError ? (
              <ErrorState
                message="Failed to load recent orders"
                onRetry={() => refetchOrders()}
              />
            ) : displayOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingBag className="h-12 w-12 mx-auto mb-4" />
                <p>No recent orders</p>
              </div>
            ) : (
              <div className="space-y-4">
                {displayOrders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/admin/orders/${order.id}`}
                    className="block"
                  >
                    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                          <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{order.orderNumber || order.id}</p>
                          <p className="text-sm text-muted-foreground">{order.customer}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${order.amount.toFixed(2)}</p>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusBadge(order.status)} variant="outline">
                            {order.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{order.time}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Top Selling Products</CardTitle>
              <Link href="/admin/products">
                <Button variant="ghost" size="sm">
                  View All
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {productsLoading ? (
              <ListSkeleton />
            ) : productsError ? (
              <ErrorState
                message="Failed to load top products"
                onRetry={() => refetchProducts()}
              />
            ) : displayProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4" />
                <p>No product data available</p>
              </div>
            ) : (
              <div className="space-y-4">
                {displayProducts.map((product, i) => (
                  <Link
                    key={product.id || i}
                    href={`/admin/products/${product.id}`}
                    className="block"
                  >
                    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center font-bold text-muted-foreground">
                          #{i + 1}
                        </div>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {product.sales} sales | Stock: {product.stock}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-green-600">
                          ${product.revenue.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: Package, label: 'Add Product', href: '/admin/products/new', color: 'bg-blue-100 text-blue-600' },
              { icon: Users, label: 'View Customers', href: '/admin/customers', color: 'bg-purple-100 text-purple-600' },
              { icon: Store, label: 'Manage Vendors', href: '/admin/vendors', color: 'bg-orange-100 text-orange-600' },
              { icon: Star, label: 'View Reviews', href: '/admin/products/reviews', color: 'bg-yellow-100 text-yellow-600' },
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
