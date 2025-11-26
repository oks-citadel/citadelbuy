'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function AdminDashboardPage() {
  // Demo stats
  const stats = {
    revenue: { value: 125430, change: 12.5, period: 'vs last month' },
    orders: { value: 1284, change: 8.2, period: 'vs last month' },
    customers: { value: 5420, change: 15.3, period: 'vs last month' },
    products: { value: 892, active: 756, period: 'active' },
  };

  const recentOrders = [
    { id: 'ORD-001', customer: 'John Doe', amount: 249.99, status: 'PENDING', time: '5 min ago' },
    { id: 'ORD-002', customer: 'Jane Smith', amount: 89.50, status: 'PROCESSING', time: '12 min ago' },
    { id: 'ORD-003', customer: 'Bob Johnson', amount: 450.00, status: 'SHIPPED', time: '1 hour ago' },
    { id: 'ORD-004', customer: 'Alice Brown', amount: 125.00, status: 'DELIVERED', time: '2 hours ago' },
    { id: 'ORD-005', customer: 'Charlie Wilson', amount: 75.25, status: 'PENDING', time: '3 hours ago' },
  ];

  const alerts = [
    { type: 'warning', message: '5 products running low on stock', action: 'View Inventory' },
    { type: 'info', message: '3 new vendor applications pending', action: 'Review' },
    { type: 'warning', message: '12 support tickets awaiting response', action: 'View Tickets' },
    { type: 'success', message: 'AI fraud detection prevented 2 suspicious orders', action: 'Details' },
  ];

  const topProducts = [
    { name: 'Wireless Headphones', sales: 245, revenue: 19600, stock: 45 },
    { name: 'Smart Watch Pro', sales: 189, revenue: 28350, stock: 23 },
    { name: 'Premium T-Shirt', sales: 312, revenue: 9360, stock: 156 },
    { name: 'Leather Wallet', sales: 156, revenue: 7800, stock: 89 },
  ];

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
            Welcome back! Here's what's happening with your store.
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">${stats.revenue.value.toLocaleString()}</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600">+{stats.revenue.change}%</span>
                  <span className="text-xs text-muted-foreground">{stats.revenue.period}</span>
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
                <p className="text-2xl font-bold">{stats.orders.value.toLocaleString()}</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600">+{stats.orders.change}%</span>
                  <span className="text-xs text-muted-foreground">{stats.orders.period}</span>
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
                <p className="text-2xl font-bold">{stats.customers.value.toLocaleString()}</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600">+{stats.customers.change}%</span>
                  <span className="text-xs text-muted-foreground">{stats.customers.period}</span>
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
                <p className="text-2xl font-bold">{stats.products.value}</p>
                <div className="flex items-center gap-1 mt-1">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-muted-foreground">
                    {stats.products.active} {stats.products.period}
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

      {/* Alerts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {alerts.map((alert, i) => (
              <div
                key={i}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  alert.type === 'warning'
                    ? 'bg-yellow-50'
                    : alert.type === 'success'
                    ? 'bg-green-50'
                    : 'bg-blue-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  {alert.type === 'warning' ? (
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  ) : alert.type === 'success' ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <Clock className="h-5 w-5 text-blue-600" />
                  )}
                  <span className="text-sm font-medium">{alert.message}</span>
                </div>
                <Button variant="ghost" size="sm">
                  {alert.action}
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            ))}
          </div>
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
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{order.id}</p>
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
              ))}
            </div>
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
            <div className="space-y-4">
              {topProducts.map((product, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
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
              ))}
            </div>
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
