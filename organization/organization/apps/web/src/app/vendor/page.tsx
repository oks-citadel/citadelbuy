'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn, formatCurrency } from '@/lib/utils';
import { useVendorDashboard } from '@/hooks/use-vendor';
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
} from 'recharts';

// Mock data for demo purposes (replace with actual API data)
const mockDashboardData = {
  overview: {
    revenue: { value: 48392.5, change: 12.5, trend: [35000, 38000, 42000, 39000, 45000, 48392] },
    orders: { value: 324, change: 8.2, trend: [250, 280, 300, 290, 310, 324] },
    visitors: { value: 12847, change: -3.1, trend: [14000, 13500, 13000, 12500, 13200, 12847] },
    conversionRate: { value: 2.52, change: 15.3, trend: [2.1, 2.2, 2.3, 2.4, 2.5, 2.52] },
    avgOrderValue: { value: 149.35, change: 4.1 },
    activeListings: { value: 156, change: 5 },
    pendingOrders: { value: 18, urgent: 3 },
    lowStockItems: { value: 7, critical: 2 },
  },
  recentOrders: [
    { id: '1', orderNumber: 'ORD-001234', customer: 'John D.', total: 249.99, status: 'PROCESSING', items: 3, createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
    { id: '2', orderNumber: 'ORD-001233', customer: 'Sarah M.', total: 89.50, status: 'SHIPPED', items: 1, createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString() },
    { id: '3', orderNumber: 'ORD-001232', customer: 'Mike R.', total: 425.00, status: 'PENDING', items: 5, createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString() },
    { id: '4', orderNumber: 'ORD-001231', customer: 'Emma W.', total: 159.99, status: 'DELIVERED', items: 2, createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString() },
  ],
  alerts: [
    { id: '1', type: 'WARNING', title: 'Low Stock Alert', message: '7 products are running low on inventory', actionUrl: '/vendor/products?filter=low-stock', actionText: 'View Products', createdAt: new Date().toISOString() },
    { id: '2', type: 'INFO', title: 'New Feature', message: 'AI-powered pricing suggestions are now available', actionUrl: '/vendor/pricing/insights', actionText: 'Explore', createdAt: new Date().toISOString() },
    { id: '3', type: 'ERROR', title: 'Fraud Alert', message: '3 suspicious orders detected', actionUrl: '/vendor/fraud', actionText: 'Review', createdAt: new Date().toISOString() },
  ],
  tasks: [
    { id: '1', title: 'Process pending orders', description: '18 orders awaiting processing', priority: 'HIGH', completed: false },
    { id: '2', title: 'Respond to reviews', description: '5 reviews need response', priority: 'MEDIUM', completed: false },
    { id: '3', title: 'Update product images', description: '3 products have missing images', priority: 'LOW', completed: false },
  ],
  quickStats: [],
};

function StatCard({
  title,
  value,
  change,
  icon,
  trend,
  prefix = '',
  suffix = '',
}: {
  title: string;
  value: number;
  change: number;
  icon: React.ReactNode;
  trend?: number[];
  prefix?: string;
  suffix?: string;
}) {
  const isPositive = change >= 0;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
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
        <div className="mt-4">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">
            {prefix}
            {typeof value === 'number' && value > 1000
              ? value.toLocaleString()
              : value}
            {suffix}
          </p>
        </div>
        {trend && (
          <div className="mt-4 h-12">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend.map((v, i) => ({ value: v, index: i }))}>
                <defs>
                  <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={isPositive ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="100%"
                      stopColor={isPositive ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={isPositive ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'}
                  fill={`url(#gradient-${title})`}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OrderStatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; label: string }> = {
    PENDING: { color: 'bg-yellow-100 text-yellow-700', label: 'Pending' },
    PROCESSING: { color: 'bg-blue-100 text-blue-700', label: 'Processing' },
    SHIPPED: { color: 'bg-purple-100 text-purple-700', label: 'Shipped' },
    DELIVERED: { color: 'bg-green-100 text-green-700', label: 'Delivered' },
    CANCELLED: { color: 'bg-red-100 text-red-700', label: 'Cancelled' },
  };

  const { color, label } = config[status] || { color: 'bg-gray-100 text-gray-700', label: status };

  return <Badge className={cn('font-medium', color)}>{label}</Badge>;
}

function AlertItem({
  alert,
}: {
  alert: {
    id: string;
    type: string;
    title: string;
    message: string;
    actionUrl?: string;
    actionText?: string;
  };
}) {
  const icons: Record<string, React.ReactNode> = {
    WARNING: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
    ERROR: <AlertTriangle className="h-5 w-5 text-destructive" />,
    SUCCESS: <CheckCircle2 className="h-5 w-5 text-success" />,
    INFO: <Sparkles className="h-5 w-5 text-primary" />,
  };

  return (
    <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
      {icons[alert.type]}
      <div className="flex-1">
        <p className="font-medium">{alert.title}</p>
        <p className="text-sm text-muted-foreground">{alert.message}</p>
      </div>
      {alert.actionUrl && (
        <Link href={alert.actionUrl}>
          <Button variant="outline" size="sm">
            {alert.actionText || 'View'}
          </Button>
        </Link>
      )}
    </div>
  );
}

export default function VendorDashboardPage() {
  const { data, isLoading } = useVendorDashboard();
  const dashboardData = data || mockDashboardData;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const { overview, recentOrders, alerts, tasks } = dashboardData;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's your store performance overview.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">Download Report</Button>
          <Link href="/vendor/analytics">
            <Button>View Analytics</Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
        >
          <StatCard
            title="Total Revenue"
            value={overview.revenue.value}
            change={overview.revenue.change}
            icon={<DollarSign className="h-5 w-5 text-primary" />}
            trend={overview.revenue.trend}
            prefix="$"
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <StatCard
            title="Orders"
            value={overview.orders.value}
            change={overview.orders.change}
            icon={<ShoppingCart className="h-5 w-5 text-primary" />}
            trend={overview.orders.trend}
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <StatCard
            title="Visitors"
            value={overview.visitors.value}
            change={overview.visitors.change}
            icon={<Users className="h-5 w-5 text-primary" />}
            trend={overview.visitors.trend}
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <StatCard
            title="Conversion Rate"
            value={overview.conversionRate.value}
            change={overview.conversionRate.change}
            icon={<TrendingUp className="h-5 w-5 text-primary" />}
            trend={overview.conversionRate.trend}
            suffix="%"
          />
        </motion.div>
      </div>

      {/* Quick Actions & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Stats */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                <span>Avg. Order Value</span>
              </div>
              <span className="font-bold">{formatCurrency(overview.avgOrderValue.value)}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-muted-foreground" />
                <span>Active Listings</span>
              </div>
              <span className="font-bold">{overview.activeListings.value}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-50">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-yellow-600" />
                <span>Pending Orders</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">{overview.pendingOrders.value}</span>
                {overview.pendingOrders.urgent > 0 && (
                  <Badge variant="destructive">{overview.pendingOrders.urgent} urgent</Badge>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-red-50">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span>Low Stock Items</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">{overview.lowStockItems.value}</span>
                {overview.lowStockItems.critical > 0 && (
                  <Badge variant="destructive">{overview.lowStockItems.critical} critical</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Alerts & Notifications</CardTitle>
            <Button variant="ghost" size="sm">
              View All <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.map((alert) => (
              <AlertItem key={alert.id} alert={alert} />
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders & Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Orders</CardTitle>
            <Link href="/vendor/orders">
              <Button variant="ghost" size="sm">
                View All <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div>
                    <p className="font-medium">{order.orderNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.customer} • {order.items} items
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(order.total)}</p>
                    <OrderStatusBadge status={order.status} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Tasks</CardTitle>
            <Button variant="ghost" size="sm">
              Add Task
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-start gap-3 p-3 rounded-lg border"
                >
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => {}}
                    className="mt-1 h-4 w-4 rounded"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{task.title}</p>
                    <p className="text-sm text-muted-foreground">{task.description}</p>
                  </div>
                  <Badge
                    variant={
                      task.priority === 'HIGH'
                        ? 'destructive'
                        : task.priority === 'MEDIUM'
                        ? 'default'
                        : 'secondary'
                    }
                  >
                    {task.priority}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold mb-2">AI Insights</h3>
              <p className="text-muted-foreground mb-4">
                Based on your recent performance, here are some recommendations to boost your sales:
              </p>
              <ul className="space-y-2 mb-4">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span>
                    <strong>Optimize pricing</strong> for 5 products to increase margin by ~8%
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span>
                    <strong>Launch retargeting campaign</strong> to recover abandoned carts worth $2,450
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span>
                    <strong>Send win-back emails</strong> to 156 inactive customers
                  </span>
                </li>
              </ul>
              <div className="flex gap-3">
                <Link href="/vendor/pricing/insights">
                  <Button>View Pricing Insights</Button>
                </Link>
                <Link href="/vendor/campaigns/create">
                  <Button variant="outline">Create Campaign</Button>
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
