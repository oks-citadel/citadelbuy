'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Store,
  Search,
  Filter,
  Download,
  Eye,
  MoreVertical,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  DollarSign,
  Star,
  UserPlus,
  TrendingUp,
  AlertTriangle,
  Ban,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface Vendor {
  id: string;
  storeName: string;
  ownerName: string;
  email: string;
  phone?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  rating: number;
  reviewCount: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  commission: number;
  createdAt: string;
  verifiedAt?: string;
}

const demoVendors: Vendor[] = [
  {
    id: '1',
    storeName: 'TechGadgets Pro',
    ownerName: 'Michael Chen',
    email: 'michael@techgadgets.com',
    phone: '+1 555-0201',
    status: 'APPROVED',
    rating: 4.8,
    reviewCount: 245,
    totalProducts: 156,
    totalOrders: 1280,
    totalRevenue: 125000,
    commission: 12500,
    createdAt: '2023-06-15',
    verifiedAt: '2023-06-20',
  },
  {
    id: '2',
    storeName: 'Fashion Forward',
    ownerName: 'Sarah Johnson',
    email: 'sarah@fashionforward.com',
    phone: '+1 555-0202',
    status: 'APPROVED',
    rating: 4.6,
    reviewCount: 189,
    totalProducts: 312,
    totalOrders: 890,
    totalRevenue: 78500,
    commission: 7850,
    createdAt: '2023-08-10',
    verifiedAt: '2023-08-15',
  },
  {
    id: '3',
    storeName: 'Home Essentials',
    ownerName: 'David Miller',
    email: 'david@homeessentials.com',
    status: 'PENDING',
    rating: 0,
    reviewCount: 0,
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    commission: 0,
    createdAt: '2024-03-10',
  },
  {
    id: '4',
    storeName: 'Organic Foods Market',
    ownerName: 'Emily Davis',
    email: 'emily@organicfoods.com',
    phone: '+1 555-0204',
    status: 'APPROVED',
    rating: 4.9,
    reviewCount: 312,
    totalProducts: 89,
    totalOrders: 2100,
    totalRevenue: 156000,
    commission: 15600,
    createdAt: '2023-03-20',
    verifiedAt: '2023-03-25',
  },
  {
    id: '5',
    storeName: 'Sports Gear Hub',
    ownerName: 'James Wilson',
    email: 'james@sportsgear.com',
    status: 'SUSPENDED',
    rating: 3.2,
    reviewCount: 45,
    totalProducts: 78,
    totalOrders: 156,
    totalRevenue: 12000,
    commission: 1200,
    createdAt: '2023-11-05',
    verifiedAt: '2023-11-10',
  },
  {
    id: '6',
    storeName: 'Artisan Crafts',
    ownerName: 'Lisa Brown',
    email: 'lisa@artisancrafts.com',
    status: 'PENDING',
    rating: 0,
    reviewCount: 0,
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    commission: 0,
    createdAt: '2024-03-14',
  },
];

export default function AdminVendorsPage() {
  const [vendors] = useState<Vendor[]>(demoVendors);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredVendors = vendors.filter((vendor) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !vendor.storeName.toLowerCase().includes(query) &&
        !vendor.ownerName.toLowerCase().includes(query) &&
        !vendor.email.toLowerCase().includes(query)
      ) {
        return false;
      }
    }
    if (statusFilter !== 'all' && vendor.status !== statusFilter) {
      return false;
    }
    return true;
  });

  const getStatusBadge = (status: Vendor['status']) => {
    const styles: Record<Vendor['status'], { class: string; icon: React.ReactNode }> = {
      PENDING: { class: 'bg-yellow-100 text-yellow-800', icon: <Clock className="h-3 w-3" /> },
      APPROVED: { class: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-3 w-3" /> },
      REJECTED: { class: 'bg-red-100 text-red-800', icon: <XCircle className="h-3 w-3" /> },
      SUSPENDED: { class: 'bg-gray-100 text-gray-800', icon: <Ban className="h-3 w-3" /> },
    };
    return styles[status];
  };

  const totalVendors = vendors.length;
  const pendingVendors = vendors.filter((v) => v.status === 'PENDING').length;
  const totalRevenue = vendors.reduce((acc, v) => acc + v.totalRevenue, 0);
  const totalCommission = vendors.reduce((acc, v) => acc + v.commission, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendors</h1>
          <p className="text-muted-foreground">
            Manage marketplace vendors
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Vendor
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Vendors</p>
                <p className="text-2xl font-bold">{totalVendors}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Store className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Approval</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingVendors}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total GMV</p>
                <p className="text-2xl font-bold">${(totalRevenue / 1000).toFixed(0)}k</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Commission Earned</p>
                <p className="text-2xl font-bold">${(totalCommission / 1000).toFixed(0)}k</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Applications Alert */}
      {pendingVendors > 0 && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <span className="font-medium text-yellow-800">
                  {pendingVendors} vendor application(s) pending review
                </span>
              </div>
              <Button size="sm" variant="outline" className="border-yellow-400">
                Review Now
              </Button>
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
                placeholder="Search by store name, owner or email..."
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
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Vendors Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">Vendor</th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">Status</th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">Rating</th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">Products</th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">Orders</th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">Revenue</th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">Commission</th>
                  <th className="p-4 text-right text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredVendors.map((vendor) => {
                  const statusInfo = getStatusBadge(vendor.status);
                  return (
                    <tr key={vendor.id} className="hover:bg-muted/50">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Store className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{vendor.storeName}</p>
                            <p className="text-sm text-muted-foreground">{vendor.ownerName}</p>
                            <p className="text-xs text-muted-foreground">{vendor.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge className={statusInfo.class}>
                          <span className="flex items-center gap-1">
                            {statusInfo.icon}
                            {vendor.status}
                          </span>
                        </Badge>
                      </td>
                      <td className="p-4">
                        {vendor.rating > 0 ? (
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            <span className="font-medium">{vendor.rating}</span>
                            <span className="text-sm text-muted-foreground">
                              ({vendor.reviewCount})
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span>{vendor.totalProducts}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span>{vendor.totalOrders.toLocaleString()}</span>
                      </td>
                      <td className="p-4">
                        <span className="font-medium">
                          ${vendor.totalRevenue.toLocaleString()}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-green-600 font-medium">
                          ${vendor.commission.toLocaleString()}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-1">
                          <Link href={`/admin/vendors/${vendor.id}`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Mail className="h-4 w-4" />
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

          {filteredVendors.length === 0 && (
            <div className="p-12 text-center">
              <Store className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium text-gray-900 mb-2">No vendors found</h3>
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
