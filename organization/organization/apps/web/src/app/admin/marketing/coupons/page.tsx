'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Tag,
  Search,
  Download,
  Eye,
  MoreVertical,
  Plus,
  Copy,
  Edit,
  Trash2,
  TrendingUp,
  Users,
  DollarSign,
  Percent,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface Coupon {
  id: string;
  code: string;
  description: string;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING';
  value: number;
  minPurchase?: number;
  maxDiscount?: number;
  usageLimit: number;
  usedCount: number;
  status: 'ACTIVE' | 'EXPIRED' | 'SCHEDULED' | 'PAUSED';
  startDate: string;
  endDate: string;
  createdAt: string;
  totalRevenue: number;
}

const demoCoupons: Coupon[] = [
  {
    id: '1',
    code: 'SAVE20',
    description: '20% off on all orders',
    type: 'PERCENTAGE',
    value: 20,
    minPurchase: 50,
    maxDiscount: 100,
    usageLimit: 500,
    usedCount: 145,
    status: 'ACTIVE',
    startDate: '2024-03-01',
    endDate: '2024-04-15',
    createdAt: '2024-02-28',
    totalRevenue: 12450,
  },
  {
    id: '2',
    code: 'FIRSTBUY',
    description: '$10 off for first-time buyers',
    type: 'FIXED_AMOUNT',
    value: 10,
    minPurchase: 30,
    usageLimit: 200,
    usedCount: 89,
    status: 'ACTIVE',
    startDate: '2024-03-01',
    endDate: '2024-04-30',
    createdAt: '2024-02-25',
    totalRevenue: 890,
  },
  {
    id: '3',
    code: 'FREESHIP',
    description: 'Free shipping on orders over $25',
    type: 'FREE_SHIPPING',
    value: 0,
    minPurchase: 25,
    usageLimit: 1000,
    usedCount: 567,
    status: 'ACTIVE',
    startDate: '2024-02-15',
    endDate: '2024-12-31',
    createdAt: '2024-02-10',
    totalRevenue: 0,
  },
  {
    id: '4',
    code: 'FLASH50',
    description: '50% off flash sale',
    type: 'PERCENTAGE',
    value: 50,
    minPurchase: 100,
    maxDiscount: 200,
    usageLimit: 500,
    usedCount: 500,
    status: 'EXPIRED',
    startDate: '2024-03-01',
    endDate: '2024-03-10',
    createdAt: '2024-02-28',
    totalRevenue: 45000,
  },
  {
    id: '5',
    code: 'SUMMER25',
    description: '25% off summer collection',
    type: 'PERCENTAGE',
    value: 25,
    minPurchase: 75,
    maxDiscount: 150,
    usageLimit: 1000,
    usedCount: 0,
    status: 'SCHEDULED',
    startDate: '2024-06-01',
    endDate: '2024-08-31',
    createdAt: '2024-03-15',
    totalRevenue: 0,
  },
  {
    id: '6',
    code: 'VIP15',
    description: '15% off for VIP customers',
    type: 'PERCENTAGE',
    value: 15,
    minPurchase: 0,
    usageLimit: 10000,
    usedCount: 1234,
    status: 'ACTIVE',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    createdAt: '2023-12-15',
    totalRevenue: 28500,
  },
];

export default function AdminCouponsPage() {
  const [coupons] = useState<Coupon[]>(demoCoupons);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filteredCoupons = coupons.filter((coupon) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !coupon.code.toLowerCase().includes(query) &&
        !coupon.description.toLowerCase().includes(query)
      ) {
        return false;
      }
    }
    if (statusFilter !== 'all' && coupon.status !== statusFilter) {
      return false;
    }
    if (typeFilter !== 'all' && coupon.type !== typeFilter) {
      return false;
    }
    return true;
  });

  const getStatusBadge = (status: Coupon['status']) => {
    const styles: Record<Coupon['status'], { class: string; icon: React.ReactNode }> = {
      ACTIVE: { class: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-3 w-3" /> },
      EXPIRED: { class: 'bg-gray-100 text-gray-800', icon: <XCircle className="h-3 w-3" /> },
      SCHEDULED: { class: 'bg-blue-100 text-blue-800', icon: <Clock className="h-3 w-3" /> },
      PAUSED: { class: 'bg-yellow-100 text-yellow-800', icon: <Clock className="h-3 w-3" /> },
    };
    return styles[status];
  };

  const getTypeDisplay = (type: Coupon['type'], value: number) => {
    switch (type) {
      case 'PERCENTAGE':
        return `${value}%`;
      case 'FIXED_AMOUNT':
        return `$${value}`;
      case 'FREE_SHIPPING':
        return 'Free Ship';
      default:
        return '-';
    }
  };

  const totalCoupons = coupons.length;
  const activeCoupons = coupons.filter((c) => c.status === 'ACTIVE').length;
  const totalUsage = coupons.reduce((acc, c) => acc + c.usedCount, 0);
  const totalRevenue = coupons.reduce((acc, c) => acc + c.totalRevenue, 0);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/admin" className="hover:text-foreground">Admin</Link>
        <span>/</span>
        <Link href="/admin/marketing" className="hover:text-foreground">Marketing</Link>
        <span>/</span>
        <span className="text-foreground">Coupons</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coupon Management</h1>
          <p className="text-muted-foreground">
            Create and manage discount coupons
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Coupon
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Coupons</p>
                <p className="text-2xl font-bold">{totalCoupons}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Tag className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Coupons</p>
                <p className="text-2xl font-bold">{activeCoupons}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Usage</p>
                <p className="text-2xl font-bold">{totalUsage.toLocaleString()}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Revenue Impact</p>
                <p className="text-2xl font-bold">${(totalRevenue / 1000).toFixed(0)}k</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-orange-600" />
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
                placeholder="Search by code or description..."
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
              <option value="EXPIRED">Expired</option>
              <option value="PAUSED">Paused</option>
            </select>
            <select
              className="rounded-md border px-3 py-2 text-sm"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="PERCENTAGE">Percentage</option>
              <option value="FIXED_AMOUNT">Fixed Amount</option>
              <option value="FREE_SHIPPING">Free Shipping</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Coupons Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">Code</th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">Discount</th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">Usage</th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">Status</th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">Valid Period</th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">Revenue</th>
                  <th className="p-4 text-right text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredCoupons.map((coupon) => {
                  const statusInfo = getStatusBadge(coupon.status);
                  const usagePercent = (coupon.usedCount / coupon.usageLimit) * 100;

                  return (
                    <tr key={coupon.id} className="hover:bg-muted/50">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Percent className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium font-mono">{coupon.code}</p>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                            <p className="text-sm text-muted-foreground">{coupon.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-green-600">
                            {getTypeDisplay(coupon.type, coupon.value)}
                          </p>
                          {coupon.minPurchase && (
                            <p className="text-xs text-muted-foreground">
                              Min: ${coupon.minPurchase}
                            </p>
                          )}
                          {coupon.maxDiscount && (
                            <p className="text-xs text-muted-foreground">
                              Max: ${coupon.maxDiscount}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-medium">
                            {coupon.usedCount} / {coupon.usageLimit}
                          </p>
                          <div className="w-24 h-2 bg-gray-200 rounded-full mt-1">
                            <div
                              className={`h-full rounded-full ${
                                usagePercent >= 90 ? 'bg-red-500' : usagePercent >= 70 ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(usagePercent, 100)}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {usagePercent.toFixed(0)}% used
                          </p>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge className={statusInfo.class}>
                          <span className="flex items-center gap-1">
                            {statusInfo.icon}
                            {coupon.status}
                          </span>
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <div>
                            <p>{new Date(coupon.startDate).toLocaleDateString()}</p>
                            <p className="text-muted-foreground">to</p>
                            <p>{new Date(coupon.endDate).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        {coupon.totalRevenue > 0 ? (
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-4 w-4 text-green-500" />
                            <span className="font-medium">
                              ${coupon.totalRevenue.toLocaleString()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-1">
                          <Link href={`/admin/marketing/coupons/${coupon.id}`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Eye className="h-4 w-4" />
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

          {filteredCoupons.length === 0 && (
            <div className="p-12 text-center">
              <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium text-gray-900 mb-2">No coupons found</h3>
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
