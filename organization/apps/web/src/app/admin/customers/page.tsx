'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  totalOrders: number;
  totalSpent: number;
  avgOrderValue: number;
  lastOrderDate?: string;
  createdAt: string;
  location?: string;
}

const demoCustomers: Customer[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1 555-0123',
    status: 'ACTIVE',
    tier: 'GOLD',
    totalOrders: 24,
    totalSpent: 2450.00,
    avgOrderValue: 102.08,
    lastOrderDate: '2024-03-15',
    createdAt: '2023-06-15',
    location: 'New York, USA',
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    phone: '+1 555-0124',
    status: 'ACTIVE',
    tier: 'PLATINUM',
    totalOrders: 56,
    totalSpent: 8920.00,
    avgOrderValue: 159.29,
    lastOrderDate: '2024-03-14',
    createdAt: '2022-11-20',
    location: 'Los Angeles, USA',
  },
  {
    id: '3',
    name: 'Bob Johnson',
    email: 'bob.j@example.com',
    status: 'ACTIVE',
    tier: 'SILVER',
    totalOrders: 8,
    totalSpent: 680.00,
    avgOrderValue: 85.00,
    lastOrderDate: '2024-03-10',
    createdAt: '2024-01-05',
    location: 'Chicago, USA',
  },
  {
    id: '4',
    name: 'Alice Brown',
    email: 'alice.b@example.com',
    phone: '+1 555-0126',
    status: 'INACTIVE',
    tier: 'BRONZE',
    totalOrders: 2,
    totalSpent: 120.00,
    avgOrderValue: 60.00,
    lastOrderDate: '2023-12-20',
    createdAt: '2023-10-15',
    location: 'Houston, USA',
  },
  {
    id: '5',
    name: 'Charlie Wilson',
    email: 'charlie.w@example.com',
    status: 'BLOCKED',
    tier: 'BRONZE',
    totalOrders: 1,
    totalSpent: 45.00,
    avgOrderValue: 45.00,
    createdAt: '2024-02-01',
  },
  {
    id: '6',
    name: 'Diana Prince',
    email: 'diana.p@example.com',
    phone: '+1 555-0128',
    status: 'ACTIVE',
    tier: 'GOLD',
    totalOrders: 18,
    totalSpent: 1890.00,
    avgOrderValue: 105.00,
    lastOrderDate: '2024-03-12',
    createdAt: '2023-08-22',
    location: 'Miami, USA',
  },
];

export default function AdminCustomersPage() {
  const [customers] = useState<Customer[]>(demoCustomers);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');

  const filteredCustomers = customers.filter((customer) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !customer.name.toLowerCase().includes(query) &&
        !customer.email.toLowerCase().includes(query)
      ) {
        return false;
      }
    }
    if (statusFilter !== 'all' && customer.status !== statusFilter) {
      return false;
    }
    if (tierFilter !== 'all' && customer.tier !== tierFilter) {
      return false;
    }
    return true;
  });

  const getStatusBadge = (status: Customer['status']) => {
    const styles: Record<Customer['status'], string> = {
      ACTIVE: 'bg-green-100 text-green-800',
      INACTIVE: 'bg-gray-100 text-gray-800',
      BLOCKED: 'bg-red-100 text-red-800',
    };
    return styles[status];
  };

  const getTierBadge = (tier: Customer['tier']) => {
    const styles: Record<Customer['tier'], string> = {
      BRONZE: 'bg-orange-100 text-orange-800',
      SILVER: 'bg-gray-200 text-gray-800',
      GOLD: 'bg-yellow-100 text-yellow-800',
      PLATINUM: 'bg-purple-100 text-purple-800',
    };
    return styles[tier];
  };

  const totalCustomers = customers.length;
  const activeCustomers = customers.filter((c) => c.status === 'ACTIVE').length;
  const totalRevenue = customers.reduce((acc, c) => acc + c.totalSpent, 0);
  const avgCustomerValue = totalRevenue / totalCustomers;

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

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
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
              <option value="INACTIVE">Inactive</option>
              <option value="BLOCKED">Blocked</option>
            </select>
            <select
              className="rounded-md border px-3 py-2 text-sm"
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
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
        </CardContent>
      </Card>
    </div>
  );
}
