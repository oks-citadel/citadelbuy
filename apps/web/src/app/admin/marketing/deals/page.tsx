'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Gift,
  Search,
  Download,
  Eye,
  MoreVertical,
  Plus,
  Edit,
  Trash2,
  TrendingUp,
  Users,
  DollarSign,
  Zap,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Tag,
  Package,
  Percent,
  Star,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface Deal {
  id: string;
  name: string;
  description: string;
  type: 'FLASH_SALE' | 'DAILY_DEAL' | 'BOGO' | 'BUNDLE' | 'CLEARANCE';
  discount: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'BOGO' | 'BUNDLE_PRICE';
  status: 'ACTIVE' | 'SCHEDULED' | 'EXPIRED' | 'PAUSED';
  startDate: string;
  endDate: string;
  products: number;
  views: number;
  sales: number;
  revenue: number;
  featured: boolean;
  createdAt: string;
}

const demoDeals: Deal[] = [
  {
    id: '1',
    name: 'Summer Collection Sale',
    description: '30% off all summer apparel',
    type: 'FLASH_SALE',
    discount: '30% OFF',
    discountType: 'PERCENTAGE',
    status: 'ACTIVE',
    startDate: '2024-03-20',
    endDate: '2024-03-27',
    products: 156,
    views: 12450,
    sales: 892,
    revenue: 45600,
    featured: true,
    createdAt: '2024-03-15',
  },
  {
    id: '2',
    name: 'Electronics Flash Deal',
    description: 'Up to 50% off selected electronics',
    type: 'FLASH_SALE',
    discount: 'Up to 50% OFF',
    discountType: 'PERCENTAGE',
    status: 'ACTIVE',
    startDate: '2024-03-18',
    endDate: '2024-03-25',
    products: 45,
    views: 8900,
    sales: 234,
    revenue: 67800,
    featured: true,
    createdAt: '2024-03-12',
  },
  {
    id: '3',
    name: 'Buy 2 Get 1 Free',
    description: 'Buy 2 products, get 1 free on selected items',
    type: 'BOGO',
    discount: 'BOGO',
    discountType: 'BOGO',
    status: 'ACTIVE',
    startDate: '2024-03-15',
    endDate: '2024-03-31',
    products: 234,
    views: 15600,
    sales: 567,
    revenue: 23400,
    featured: false,
    createdAt: '2024-03-10',
  },
  {
    id: '4',
    name: 'Weekend Bundle Deal',
    description: 'Complete setup bundle at special price',
    type: 'BUNDLE',
    discount: '$199 Bundle',
    discountType: 'BUNDLE_PRICE',
    status: 'SCHEDULED',
    startDate: '2024-03-23',
    endDate: '2024-03-24',
    products: 3,
    views: 0,
    sales: 0,
    revenue: 0,
    featured: false,
    createdAt: '2024-03-16',
  },
  {
    id: '5',
    name: 'Clearance Sale',
    description: 'Final clearance - up to 70% off',
    type: 'CLEARANCE',
    discount: 'Up to 70% OFF',
    discountType: 'PERCENTAGE',
    status: 'ACTIVE',
    startDate: '2024-03-01',
    endDate: '2024-03-31',
    products: 89,
    views: 23400,
    sales: 1234,
    revenue: 18900,
    featured: false,
    createdAt: '2024-02-28',
  },
  {
    id: '6',
    name: 'Daily Deal - Smart Watch',
    description: 'Today only: Smart Watch Pro at $99',
    type: 'DAILY_DEAL',
    discount: '$99 Only',
    discountType: 'FIXED_AMOUNT',
    status: 'EXPIRED',
    startDate: '2024-03-15',
    endDate: '2024-03-15',
    products: 1,
    views: 3400,
    sales: 45,
    revenue: 4455,
    featured: false,
    createdAt: '2024-03-14',
  },
];

export default function AdminDealsPage() {
  const [deals] = useState<Deal[]>(demoDeals);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filteredDeals = deals.filter((deal) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !deal.name.toLowerCase().includes(query) &&
        !deal.description.toLowerCase().includes(query)
      ) {
        return false;
      }
    }
    if (statusFilter !== 'all' && deal.status !== statusFilter) {
      return false;
    }
    if (typeFilter !== 'all' && deal.type !== typeFilter) {
      return false;
    }
    return true;
  });

  const getStatusBadge = (status: Deal['status']) => {
    const styles: Record<Deal['status'], { class: string; icon: React.ReactNode }> = {
      ACTIVE: { class: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-3 w-3" /> },
      SCHEDULED: { class: 'bg-blue-100 text-blue-800', icon: <Clock className="h-3 w-3" /> },
      EXPIRED: { class: 'bg-gray-100 text-gray-800', icon: <XCircle className="h-3 w-3" /> },
      PAUSED: { class: 'bg-yellow-100 text-yellow-800', icon: <AlertTriangle className="h-3 w-3" /> },
    };
    return styles[status];
  };

  const getTypeIcon = (type: Deal['type']) => {
    const icons: Record<Deal['type'], React.ReactNode> = {
      FLASH_SALE: <Zap className="h-5 w-5" />,
      DAILY_DEAL: <Calendar className="h-5 w-5" />,
      BOGO: <Tag className="h-5 w-5" />,
      BUNDLE: <Package className="h-5 w-5" />,
      CLEARANCE: <Percent className="h-5 w-5" />,
    };
    return icons[type];
  };

  const getTypeColor = (type: Deal['type']) => {
    const colors: Record<Deal['type'], string> = {
      FLASH_SALE: 'bg-red-100 text-red-600',
      DAILY_DEAL: 'bg-blue-100 text-blue-600',
      BOGO: 'bg-purple-100 text-purple-600',
      BUNDLE: 'bg-orange-100 text-orange-600',
      CLEARANCE: 'bg-green-100 text-green-600',
    };
    return colors[type];
  };

  const totalDeals = deals.length;
  const activeDeals = deals.filter((d) => d.status === 'ACTIVE').length;
  const totalSales = deals.reduce((acc, d) => acc + d.sales, 0);
  const totalRevenue = deals.reduce((acc, d) => acc + d.revenue, 0);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/admin" className="hover:text-foreground">Admin</Link>
        <span>/</span>
        <Link href="/admin/marketing" className="hover:text-foreground">Marketing</Link>
        <span>/</span>
        <span className="text-foreground">Deals & Promotions</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deals & Promotions</h1>
          <p className="text-muted-foreground">
            Manage flash sales, daily deals, and special promotions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Deal
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Deals</p>
                <p className="text-2xl font-bold">{totalDeals}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Gift className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Deals</p>
                <p className="text-2xl font-bold">{activeDeals}</p>
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
                <p className="text-sm text-muted-foreground">Total Sales</p>
                <p className="text-2xl font-bold">{totalSales.toLocaleString()}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">${(totalRevenue / 1000).toFixed(0)}k</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Deals Alert */}
      {activeDeals > 0 && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-800">
                  {activeDeals} deal{activeDeals > 1 ? 's' : ''} currently active
                </span>
              </div>
              <Link href="/deals">
                <Button size="sm" variant="outline" className="border-green-400">
                  View Live Deals
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or description..."
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
              <option value="FLASH_SALE">Flash Sale</option>
              <option value="DAILY_DEAL">Daily Deal</option>
              <option value="BOGO">Buy One Get One</option>
              <option value="BUNDLE">Bundle Deal</option>
              <option value="CLEARANCE">Clearance</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Deals Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {filteredDeals.map((deal) => {
          const statusInfo = getStatusBadge(deal.status);
          const conversionRate = deal.views > 0 ? (deal.sales / deal.views) * 100 : 0;

          return (
            <Card key={deal.id} className={deal.featured ? 'border-2 border-primary' : ''}>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${getTypeColor(deal.type)}`}>
                        {getTypeIcon(deal.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-lg">{deal.name}</h3>
                          {deal.featured && (
                            <Badge className="bg-yellow-100 text-yellow-800">
                              <Star className="h-3 w-3 mr-1 fill-yellow-500" />
                              Featured
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{deal.description}</p>
                      </div>
                    </div>
                    <Badge className={statusInfo.class}>
                      <span className="flex items-center gap-1">
                        {statusInfo.icon}
                        {deal.status}
                      </span>
                    </Badge>
                  </div>

                  {/* Discount Badge */}
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border-2 border-green-200 rounded-lg">
                    <Percent className="h-5 w-5 text-green-600" />
                    <span className="font-bold text-green-700 text-lg">{deal.discount}</span>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <p className="text-xs text-muted-foreground">Products</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{deal.products}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Views</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{deal.views.toLocaleString()}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Sales</p>
                      <div className="flex items-center gap-1 mt-1">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        <span className="font-medium">{deal.sales}</span>
                        {deal.views > 0 && (
                          <span className="text-xs text-muted-foreground">
                            ({conversionRate.toFixed(1)}%)
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Revenue</p>
                      <div className="flex items-center gap-1 mt-1">
                        <DollarSign className="h-4 w-4 text-green-500" />
                        <span className="font-medium text-green-600">
                          ${deal.revenue.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Date Range */}
                  <div className="flex items-center gap-2 text-sm pt-4 border-t">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {new Date(deal.startDate).toLocaleDateString()} - {new Date(deal.endDate).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t">
                    <Link href={`/admin/marketing/deals/${deal.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </Link>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredDeals.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium text-gray-900 mb-2">No deals found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search or filters
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
