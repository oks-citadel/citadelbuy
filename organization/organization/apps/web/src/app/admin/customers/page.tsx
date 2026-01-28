'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Users,
  Search,
  Filter,
  Download,
  Eye,
  MoreVertical,
  Mail,
  Phone,
  MapPin,
  ShoppingBag,
  DollarSign,
  Star,
  UserPlus,
  TrendingUp,
  Calendar,
  AlertTriangle,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  adminCustomersApi,
  type AdminCustomer,
  type CustomersResponse,
} from '@/services/admin-api';

// Loading skeleton for table
function TableSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border-b">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-24 ml-auto" />
        </div>
      ))}
    </div>
  );
}

// Loading skeleton for stats
function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
              </div>
              <Skeleton className="h-10 w-10 rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Error state component
function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
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

export default function AdminCustomersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Fetch customers from API
  const {
    data: customersData,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['admin', 'customers', { page, limit, status: statusFilter, tier: tierFilter, search: searchQuery }],
    queryFn: () => adminCustomersApi.getAll({
      page,
      limit,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      tier: tierFilter !== 'all' ? tierFilter : undefined,
      search: searchQuery || undefined,
    }),
  });

  const customers = customersData?.customers || [];
  const totalCustomersCount = customersData?.total || 0;
  const customerStats = customersData?.stats || {
    total: 0,
    active: 0,
    totalRevenue: 0,
    avgCustomerValue: 0,
  };
  const totalPages = Math.ceil(totalCustomersCount / limit);

  // Handle search with pagination reset
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };

  // Handle filter changes with pagination reset
  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleTierChange = (value: string) => {
    setTierFilter(value);
    setPage(1);
  };

  // Client-side filtering is a fallback - API should handle filtering
  const filteredCustomers = customers;

  const getStatusBadge = (status: AdminCustomer['status']) => {
    const styles: Record<AdminCustomer['status'], string> = {
      ACTIVE: 'bg-green-100 text-green-800',
      INACTIVE: 'bg-gray-100 text-gray-800',
      BLOCKED: 'bg-red-100 text-red-800',
    };
    return styles[status];
  };

  const getTierBadge = (tier: AdminCustomer['tier']) => {
    const styles: Record<AdminCustomer['tier'], string> = {
      BRONZE: 'bg-orange-100 text-orange-800',
      SILVER: 'bg-gray-200 text-gray-800',
      GOLD: 'bg-yellow-100 text-yellow-800',
      PLATINUM: 'bg-purple-100 text-purple-800',
    };
    return styles[tier];
  };

  // Use stats from API response
  const totalCustomers = customerStats.total;
  const activeCustomers = customerStats.active;
  const totalRevenue = customerStats.totalRevenue;
  const avgCustomerValue = customerStats.avgCustomerValue;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-muted-foreground">
            Manage your customer base
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Stats */}
      {isLoading ? (
        <StatsSkeleton />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Customers</p>
                  <p className="text-2xl font-bold">{totalCustomers}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Customers</p>
                  <p className="text-2xl font-bold">{activeCustomers}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold">${totalRevenue.toLocaleString()}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Customer Value</p>
                  <p className="text-2xl font-bold">${avgCustomerValue.toFixed(2)}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <Star className="h-5 w-5 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
              {isFetching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            <select
              className="rounded-md border px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="BLOCKED">Blocked</option>
            </select>
            <select
              className="rounded-md border px-3 py-2 text-sm"
              value={tierFilter}
              onChange={(e) => handleTierChange(e.target.value)}
            >
              <option value="all">All Tiers</option>
              <option value="PLATINUM">Platinum</option>
              <option value="GOLD">Gold</option>
              <option value="SILVER">Silver</option>
              <option value="BRONZE">Bronze</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton />
          ) : error ? (
            <ErrorState
              message="Failed to load customers. Please try again."
              onRetry={() => refetch()}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="p-4 text-left text-sm font-medium text-muted-foreground">Customer</th>
                      <th className="p-4 text-left text-sm font-medium text-muted-foreground">Status</th>
                      <th className="p-4 text-left text-sm font-medium text-muted-foreground">Tier</th>
                      <th className="p-4 text-left text-sm font-medium text-muted-foreground">Orders</th>
                      <th className="p-4 text-left text-sm font-medium text-muted-foreground">Total Spent</th>
                      <th className="p-4 text-left text-sm font-medium text-muted-foreground">Last Order</th>
                      <th className="p-4 text-left text-sm font-medium text-muted-foreground">Joined</th>
                      <th className="p-4 text-right text-sm font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredCustomers.map((customer) => (
                      <tr key={customer.id} className="hover:bg-muted/50">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="font-medium text-primary">
                                {customer.name.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{customer.name}</p>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                <span>{customer.email}</span>
                              </div>
                              {customer.location && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <MapPin className="h-3 w-3" />
                                  <span>{customer.location}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge className={getStatusBadge(customer.status)}>
                            {customer.status}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <Badge className={getTierBadge(customer.tier)} variant="outline">
                            {customer.tier}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1">
                            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                            <span>{customer.totalOrders}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div>
                            <p className="font-medium">${customer.totalSpent.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">
                              Avg: ${customer.avgOrderValue.toFixed(2)}
                            </p>
                          </div>
                        </td>
                        <td className="p-4">
                          {customer.lastOrderDate ? (
                            <span>{new Date(customer.lastOrderDate).toLocaleDateString()}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(customer.createdAt).toLocaleDateString()}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex justify-end gap-1">
                            <Link href={`/admin/customers/${customer.id}`}>
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
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredCustomers.length === 0 && (
                <div className="p-12 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium text-gray-900 mb-2">No customers found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your search or filters
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {!isLoading && !error && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {filteredCustomers.length} of {totalCustomersCount} customers
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span className="flex items-center text-sm text-muted-foreground px-2">
              Page {page} of {totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || isLoading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
