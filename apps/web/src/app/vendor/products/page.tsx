'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Package,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Copy,
  BarChart2,
  Tag,
  Image as ImageIcon,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowUpDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  comparePrice?: number;
  stock: number;
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED' | 'OUT_OF_STOCK';
  category: string;
  image?: string;
  sales: number;
  views: number;
  rating: number;
  reviews: number;
  createdAt: string;
}

// Demo products
const demoProducts: Product[] = [
  {
    id: '1',
    name: 'Wireless Bluetooth Headphones',
    sku: 'WBH-001',
    price: 79.99,
    comparePrice: 99.99,
    stock: 150,
    status: 'ACTIVE',
    category: 'Electronics',
    sales: 1250,
    views: 15000,
    rating: 4.5,
    reviews: 328,
    createdAt: '2024-01-15',
  },
  {
    id: '2',
    name: 'Smart Fitness Tracker Pro',
    sku: 'SFT-002',
    price: 149.99,
    stock: 45,
    status: 'ACTIVE',
    category: 'Electronics',
    sales: 890,
    views: 12500,
    rating: 4.7,
    reviews: 256,
    createdAt: '2024-02-20',
  },
  {
    id: '3',
    name: 'Premium Cotton T-Shirt',
    sku: 'PCT-003',
    price: 29.99,
    comparePrice: 39.99,
    stock: 500,
    status: 'ACTIVE',
    category: 'Clothing',
    sales: 2100,
    views: 8900,
    rating: 4.3,
    reviews: 412,
    createdAt: '2024-01-10',
  },
  {
    id: '4',
    name: 'Organic Green Tea Set',
    sku: 'OGT-004',
    price: 24.99,
    stock: 0,
    status: 'OUT_OF_STOCK',
    category: 'Food & Beverage',
    sales: 560,
    views: 3200,
    rating: 4.8,
    reviews: 89,
    createdAt: '2024-03-05',
  },
  {
    id: '5',
    name: 'Leather Messenger Bag',
    sku: 'LMB-005',
    price: 189.99,
    comparePrice: 249.99,
    stock: 28,
    status: 'ACTIVE',
    category: 'Accessories',
    sales: 345,
    views: 5600,
    rating: 4.6,
    reviews: 67,
    createdAt: '2024-02-28',
  },
  {
    id: '6',
    name: 'New Summer Collection Dress',
    sku: 'SCD-006',
    price: 89.99,
    stock: 75,
    status: 'DRAFT',
    category: 'Clothing',
    sales: 0,
    views: 0,
    rating: 0,
    reviews: 0,
    createdAt: '2024-03-15',
  },
];

export default function VendorProductsPage() {
  const [products] = useState<Product[]>(demoProducts);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'stock' | 'sales'>('sales');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const filteredProducts = products
    .filter((p) => {
      if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (statusFilter !== 'all' && p.status !== statusFilter) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      const order = sortOrder === 'asc' ? 1 : -1;
      if (sortBy === 'name') return a.name.localeCompare(b.name) * order;
      if (sortBy === 'price') return (a.price - b.price) * order;
      if (sortBy === 'stock') return (a.stock - b.stock) * order;
      return (a.sales - b.sales) * order;
    });

  const getStatusBadge = (status: Product['status']) => {
    const styles: Record<Product['status'], string> = {
      ACTIVE: 'bg-green-100 text-green-800',
      DRAFT: 'bg-yellow-100 text-yellow-800',
      ARCHIVED: 'bg-gray-100 text-gray-800',
      OUT_OF_STOCK: 'bg-red-100 text-red-800',
    };
    return styles[status];
  };

  const toggleSelectAll = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts.map((p) => p.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedProducts((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const totalRevenue = products.reduce((acc, p) => acc + p.price * p.sales, 0);
  const totalSales = products.reduce((acc, p) => acc + p.sales, 0);
  const activeProducts = products.filter((p) => p.status === 'ACTIVE').length;
  const lowStock = products.filter((p) => p.stock > 0 && p.stock < 50).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-muted-foreground">
            Manage your product catalog
          </p>
        </div>
        <Link href="/vendor/products/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">${totalRevenue.toLocaleString()}</p>
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
                <p className="text-sm text-muted-foreground">Total Sales</p>
                <p className="text-2xl font-bold">{totalSales.toLocaleString()}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <BarChart2 className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Products</p>
                <p className="text-2xl font-bold">{activeProducts}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Low Stock</p>
                <p className="text-2xl font-bold">{lowStock}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
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
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="DRAFT">Draft</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
              <option value="ARCHIVED">Archived</option>
            </select>
            <select
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field as typeof sortBy);
                setSortOrder(order as typeof sortOrder);
              }}
            >
              <option value="sales-desc">Best Selling</option>
              <option value="sales-asc">Lowest Selling</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="stock-asc">Stock: Low to High</option>
              <option value="name-asc">Name: A-Z</option>
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
                  <Tag className="w-4 h-4 mr-2" />
                  Update Prices
                </Button>
                <Button variant="outline" size="sm">
                  <Clock className="w-4 h-4 mr-2" />
                  Set Status
                </Button>
                <Button variant="outline" size="sm" className="text-red-600">
                  <Trash2 className="w-4 h-4 mr-2" />
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
                      checked={selectedProducts.length === filteredProducts.length}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">
                    Product
                  </th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">
                    Price
                  </th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">
                    Stock
                  </th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">
                    Sales
                  </th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">
                    Rating
                  </th>
                  <th className="p-4 text-right text-sm font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-muted/50">
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(product.id)}
                        onChange={() => toggleSelect(product.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.name}
                              className="h-12 w-12 rounded-lg object-cover"
                            />
                          ) : (
                            <ImageIcon className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{product.name}</p>
                          <p className="text-sm text-muted-foreground">
                            SKU: {product.sku} | {product.category}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge className={getStatusBadge(product.status)}>
                        {product.status.replace('_', ' ')}
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
                      <div className="flex items-center gap-2">
                        <span
                          className={
                            product.stock === 0
                              ? 'text-red-600'
                              : product.stock < 50
                              ? 'text-orange-600'
                              : 'text-gray-900'
                          }
                        >
                          {product.stock}
                        </span>
                        {product.stock < 50 && product.stock > 0 && (
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span>{product.sales.toLocaleString()}</span>
                        <span className="text-sm text-muted-foreground">
                          ({product.views.toLocaleString()} views)
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      {product.rating > 0 ? (
                        <div className="flex items-center gap-1">
                          <span className="text-yellow-500">★</span>
                          <span>{product.rating}</span>
                          <span className="text-sm text-muted-foreground">
                            ({product.reviews})
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600"
                        >
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
              <p className="text-muted-foreground mb-4">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Get started by adding your first product'}
              </p>
              <Link href="/vendor/products/new">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Product
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {filteredProducts.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {filteredProducts.length} of {products.length} products
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
