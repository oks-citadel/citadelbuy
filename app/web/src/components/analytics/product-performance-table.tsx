'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  images: string[];
  views: number;
  purchases: number;
  revenue: number;
  addToCart: number;
  conversionRate: number;
}

interface ProductPerformanceTableProps {
  startDate?: string;
  endDate?: string;
  limit?: number;
}

export function ProductPerformanceTable({
  startDate,
  endDate,
  limit = 10
}: ProductPerformanceTableProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'revenue' | 'views' | 'purchases'>('revenue');

  useEffect(() => {
    fetchProducts();
  }, [startDate, endDate, limit]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
        limit: limit.toString(),
      });

      const res = await fetch(`/api/analytics-dashboard/vendor/products?${params}`);
      const data = await res.json();
      setProducts(data);
    } catch (error) {
      console.error('Failed to fetch product performance:', error);
    } finally {
      setLoading(false);
    }
  };

  const sortedProducts = [...products].sort((a, b) => {
    switch (sortBy) {
      case 'views':
        return b.views - a.views;
      case 'purchases':
        return b.purchases - a.purchases;
      case 'revenue':
      default:
        return b.revenue - a.revenue;
    }
  });

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Products</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Top Products</CardTitle>
          <div className="flex gap-2">
            <button
              onClick={() => setSortBy('revenue')}
              className={`px-3 py-1 text-sm rounded ${
                sortBy === 'revenue' ? 'bg-blue-500 text-white' : 'bg-gray-100'
              }`}
            >
              Revenue
            </button>
            <button
              onClick={() => setSortBy('views')}
              className={`px-3 py-1 text-sm rounded ${
                sortBy === 'views' ? 'bg-blue-500 text-white' : 'bg-gray-100'
              }`}
            >
              Views
            </button>
            <button
              onClick={() => setSortBy('purchases')}
              className={`px-3 py-1 text-sm rounded ${
                sortBy === 'purchases' ? 'bg-blue-500 text-white' : 'bg-gray-100'
              }`}
            >
              Sales
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Product</th>
                <th className="text-right py-3 px-4">Views</th>
                <th className="text-right py-3 px-4">Sales</th>
                <th className="text-right py-3 px-4">Conv. Rate</th>
                <th className="text-right py-3 px-4">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {sortedProducts.map((product) => (
                <tr key={product.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <Link
                      href={`/products/${product.slug}`}
                      className="flex items-center gap-3 hover:underline"
                    >
                      {product.images[0] && (
                        <div className="relative w-12 h-12 flex-shrink-0">
                          <Image
                            src={product.images[0]}
                            alt={product.name}
                            fill
                            className="object-cover rounded"
                          />
                        </div>
                      )}
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-gray-500">
                          ${product.price.toFixed(2)}
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td className="text-right py-3 px-4">
                    {product.views.toLocaleString()}
                  </td>
                  <td className="text-right py-3 px-4">
                    {product.purchases.toLocaleString()}
                  </td>
                  <td className="text-right py-3 px-4">
                    <span className={`font-medium ${
                      product.conversionRate >= 5 ? 'text-green-600' :
                      product.conversionRate >= 2 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {product.conversionRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="text-right py-3 px-4 font-semibold">
                    ${product.revenue.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {products.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No product data available for this period
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
