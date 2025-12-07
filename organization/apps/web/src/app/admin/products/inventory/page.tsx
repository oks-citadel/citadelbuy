'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Package,
  Search,
  Filter,
  Download,
  ArrowLeft,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Archive,
  RefreshCw,
  Edit,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface InventoryItem {
  id: string;
  productName: string;
  sku: string;
  category: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  reorderPoint: number;
  lastRestocked?: string;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'OVERSTOCKED';
  location?: string;
  supplier?: string;
}

const demoInventory: InventoryItem[] = [
  {
    id: '1',
    productName: 'Wireless Bluetooth Headphones',
    sku: 'WBH-001',
    category: 'Electronics',
    currentStock: 150,
    minStock: 20,
    maxStock: 200,
    reorderPoint: 30,
    lastRestocked: '2024-03-10',
    status: 'IN_STOCK',
    location: 'Warehouse A - Shelf 12',
    supplier: 'TechGadgets Pro',
  },
  {
    id: '2',
    productName: 'Smart Fitness Tracker Pro',
    sku: 'SFT-002',
    category: 'Electronics',
    currentStock: 25,
    minStock: 20,
    maxStock: 150,
    reorderPoint: 30,
    lastRestocked: '2024-03-05',
    status: 'LOW_STOCK',
    location: 'Warehouse A - Shelf 15',
    supplier: 'TechGadgets Pro',
  },
  {
    id: '3',
    productName: 'Premium Cotton T-Shirt',
    sku: 'PCT-003',
    category: 'Clothing',
    currentStock: 500,
    minStock: 100,
    maxStock: 300,
    reorderPoint: 150,
    lastRestocked: '2024-03-01',
    status: 'OVERSTOCKED',
    location: 'Warehouse B - Section 3',
    supplier: 'Fashion Forward',
  },
  {
    id: '4',
    productName: 'Organic Green Tea Set',
    sku: 'OGT-004',
    category: 'Food & Beverage',
    currentStock: 0,
    minStock: 50,
    maxStock: 200,
    reorderPoint: 75,
    lastRestocked: '2024-02-20',
    status: 'OUT_OF_STOCK',
    location: 'Warehouse C - Row 5',
    supplier: 'Organic Foods Market',
  },
  {
    id: '5',
    productName: 'Leather Messenger Bag',
    sku: 'LMB-005',
    category: 'Accessories',
    currentStock: 28,
    minStock: 15,
    maxStock: 100,
    reorderPoint: 25,
    lastRestocked: '2024-03-12',
    status: 'IN_STOCK',
    location: 'Warehouse B - Shelf 8',
    supplier: 'Fashion Forward',
  },
  {
    id: '6',
    productName: 'Wireless Mouse',
    sku: 'WM-006',
    category: 'Electronics',
    currentStock: 12,
    minStock: 30,
    maxStock: 150,
    reorderPoint: 40,
    lastRestocked: '2024-02-28',
    status: 'LOW_STOCK',
    location: 'Warehouse A - Shelf 10',
    supplier: 'TechGadgets Pro',
  },
];

export default function InventoryManagementPage() {
  const [inventory] = useState<InventoryItem[]>(demoInventory);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const filteredInventory = inventory.filter((item) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !item.productName.toLowerCase().includes(query) &&
        !item.sku.toLowerCase().includes(query)
      ) {
        return false;
      }
    }
    if (statusFilter !== 'all' && item.status !== statusFilter) {
      return false;
    }
    if (categoryFilter !== 'all' && item.category !== categoryFilter) {
      return false;
    }
    return true;
  });

  const getStatusBadge = (status: InventoryItem['status']) => {
    const styles: Record<InventoryItem['status'], string> = {
      IN_STOCK: 'bg-green-100 text-green-800',
      LOW_STOCK: 'bg-orange-100 text-orange-800',
      OUT_OF_STOCK: 'bg-red-100 text-red-800',
      OVERSTOCKED: 'bg-blue-100 text-blue-800',
    };
    return styles[status];
  };

  const getStatusIcon = (status: InventoryItem['status']) => {
    switch (status) {
      case 'IN_STOCK':
        return <Package className="h-4 w-4" />;
      case 'LOW_STOCK':
        return <AlertTriangle className="h-4 w-4" />;
      case 'OUT_OF_STOCK':
        return <Archive className="h-4 w-4" />;
      case 'OVERSTOCKED':
        return <TrendingUp className="h-4 w-4" />;
    }
  };

  const categories = Array.from(new Set(inventory.map((i) => i.category)));
  const totalItems = inventory.length;
  const lowStock = inventory.filter((i) => i.status === 'LOW_STOCK').length;
  const outOfStock = inventory.filter((i) => i.status === 'OUT_OF_STOCK').length;
  const overstocked = inventory.filter((i) => i.status === 'OVERSTOCKED').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/products">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Inventory Management
            </h1>
            <p className="text-muted-foreground">
              Monitor and manage product stock levels
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync Stock
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{totalItems}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Low Stock</p>
                <p className="text-2xl font-bold text-orange-600">{lowStock}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Out of Stock</p>
                <p className="text-2xl font-bold text-red-600">{outOfStock}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <Archive className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overstocked</p>
                <p className="text-2xl font-bold text-blue-600">{overstocked}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-blue-600" />
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
                placeholder="Search by product name or SKU..."
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
              <option value="IN_STOCK">In Stock</option>
              <option value="LOW_STOCK">Low Stock</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
              <option value="OVERSTOCKED">Overstocked</option>
            </select>
            <select
              className="rounded-md border px-3 py-2 text-sm"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">
                    Product
                  </th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">
                    Current Stock
                  </th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">
                    Reorder Point
                  </th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">
                    Location
                  </th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">
                    Last Restocked
                  </th>
                  <th className="p-4 text-right text-sm font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredInventory.map((item) => {
                  const stockPercentage =
                    (item.currentStock / item.maxStock) * 100;

                  return (
                    <tr key={item.id} className="hover:bg-muted/50">
                      <td className="p-4">
                        <div>
                          <p className="font-medium">{item.productName}</p>
                          <p className="text-sm text-muted-foreground">
                            SKU: {item.sku} | {item.category}
                          </p>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge className={getStatusBadge(item.status)}>
                          <span className="flex items-center gap-1">
                            {getStatusIcon(item.status)}
                            {item.status.replace('_', ' ')}
                          </span>
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-medium">
                            {item.currentStock} / {item.maxStock}
                          </p>
                          <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${
                                stockPercentage > 75
                                  ? 'bg-green-600'
                                  : stockPercentage > 25
                                  ? 'bg-orange-600'
                                  : 'bg-red-600'
                              }`}
                              style={{ width: `${Math.min(stockPercentage, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm">
                          {item.reorderPoint} units
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm">{item.location || '-'}</span>
                      </td>
                      <td className="p-4">
                        {item.lastRestocked ? (
                          <span className="text-sm">
                            {new Date(item.lastRestocked).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8"
                            disabled={item.currentStock >= item.maxStock}
                          >
                            Restock
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredInventory.length === 0 && (
            <div className="p-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium text-gray-900 mb-2">
                No inventory items found
              </h3>
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
