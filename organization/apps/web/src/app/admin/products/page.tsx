'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Package,
  Search,
  Filter,
  Download,
  Plus,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  Image as ImageIcon,
  AlertTriangle,
  CheckCircle,
  Archive,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  vendor: string;
  price: number;
  comparePrice?: number;
  stock: number;
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  rating: number;
  reviews: number;
  sales: number;
  createdAt: string;
  image?: string;
}

const demoProducts: Product[] = [
  {
    id: '1',
    name: 'Wireless Bluetooth Headphones',
    sku: 'WBH-001',
    category: 'Electronics',
    vendor: 'TechGadgets Pro',
    price: 79.99,
    comparePrice: 99.99,
    stock: 150,
    status: 'ACTIVE',
    rating: 4.5,
    reviews: 328,
    sales: 1250,
    createdAt: '2024-01-15',
  },
  {
    id: '2',
    name: 'Smart Fitness Tracker Pro',
    sku: 'SFT-002',
    category: 'Electronics',
    vendor: 'TechGadgets Pro',
    price: 149.99,
    stock: 45,
    status: 'ACTIVE',
    rating: 4.7,
    reviews: 256,
    sales: 890,
    createdAt: '2024-02-20',
  },
  {
    id: '3',
    name: 'Premium Cotton T-Shirt',
    sku: 'PCT-003',
    category: 'Clothing',
    vendor: 'Fashion Forward',
    price: 29.99,
    comparePrice: 39.99,
    stock: 500,
    status: 'ACTIVE',
    rating: 4.3,
    reviews: 412,
    sales: 2100,
    createdAt: '2024-01-10',
  },
  {
    id: '4',
    name: 'Organic Green Tea Set',
    sku: 'OGT-004',
    category: 'Food & Beverage',
    vendor: 'Organic Foods Market',
    price: 24.99,
    stock: 0,
    status: 'ACTIVE',
    rating: 4.8,
    reviews: 89,
    sales: 560,
    createdAt: '2024-03-05',
  },
  {
    id: '5',
    name: 'Leather Messenger Bag',
    sku: 'LMB-005',
    category: 'Accessories',
    vendor: 'Fashion Forward',
    price: 189.99,
    comparePrice: 249.99,
    stock: 28,
    status: 'ACTIVE',
    rating: 4.6,
    reviews: 67,
    sales: 345,
    createdAt: '2024-02-28',
  },
  {
    id: '6',
    name: 'Summer Collection Dress',
    sku: 'SCD-006',
    category: 'Clothing',
    vendor: 'Fashion Forward',
    price: 89.99,
    stock: 75,
    status: 'DRAFT',
    rating: 0,
    reviews: 0,
    sales: 0,
    createdAt: '2024-03-15',
  },
];

export default function AdminProductsPage() {
  const [products] = useState<Product[]>(demoProducts);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  const filteredProducts = products.filter((product) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !product.name.toLowerCase().includes(query) &&
        !product.sku.toLowerCase().includes(query) &&
        !product.vendor.toLowerCase().includes(query)
      ) {
        return false;
      }
    }
    if (statusFilter !== 'all' && product.status !== statusFilter) {
      return false;
    }
    if (categoryFilter !== 'all' && product.category !== categoryFilter) {
      return false;
    }
    return true;
  });

  const getStatusBadge = (status: Product['status']) => {
    const styles: Record<Product['status'], string> = {
      ACTIVE: 'bg-green-100 text-green-800',
      DRAFT: 'bg-yellow-100 text-yellow-800',
      ARCHIVED: 'bg-gray-100 text-gray-800',
    };
    return styles[status];
  };

  const categories = [...new Set(products.map((p) => p.category))];
  const totalProducts = products.length;
  const activeProducts = products.filter((p) => p.status === 'ACTIVE').length;
  const lowStockProducts = products.filter((p) => p.stock > 0 && p.stock < 50).length;
  const outOfStock = products.filter((p) => p.stock === 0).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-muted-foreground">
            Manage marketplace product catalog
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Link href="/admin/products/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Products</p>
                <p className="text-2xl font-bold">{totalProducts}</p>
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
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-green-600">{activeProducts}</p>
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
                <p className="text-sm text-muted-foreground">Low Stock</p>
                <p className="text-2xl font-bold text-orange-600">{lowStockProducts}</p>
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
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, SKU or vendor..."
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
              <option value="DRAFT">Draft</option>
              <option value="ARCHIVED">Archived</option>
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

      {/* Bulk Actions */}
      {selectedProducts.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedProducts.length} product(s) selected
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  Activate
                </Button>
                <Button variant="outline" size="sm">
                  Archive
                </Button>
                <Button variant="outline" size="sm" className="text-red-600">
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Products Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-4 text-left">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedProducts(filteredProducts.map((p) => p.id));
                        } else {
                          setSelectedProducts([]);
                        }
                      }}
                    />
                  </th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">Product</th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">Status</th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">Price</th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">Stock</th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">Vendor</th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">Sales</th>
                  <th className="p-4 text-right text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-muted/50">
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(product.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedProducts([...selectedProducts, product.id]);
                          } else {
                            setSelectedProducts(selectedProducts.filter((id) => id !== product.id));
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                          <ImageIcon className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-muted-foreground">
                            SKU: {product.sku} | {product.category}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge className={getStatusBadge(product.status)}>
                        {product.status}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="font-medium">${product.price.toFixed(2)}</p>
                        {product.comparePrice && (
                          <p className="text-sm text-muted-foreground line-through">
                            ${product.comparePrice.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={
                          product.stock === 0
                            ? 'text-red-600 font-medium'
                            : product.stock < 50
                            ? 'text-orange-600'
                            : ''
                        }
                      >
                        {product.stock}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm">{product.vendor}</span>
                    </td>
                    <td className="p-4">
                      <span>{product.sales.toLocaleString()}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredProducts.length === 0 && (
            <div className="p-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium text-gray-900 mb-2">No products found</h3>
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
