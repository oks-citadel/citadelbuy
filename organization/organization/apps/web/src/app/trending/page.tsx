'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { TrendingUp, Star, ShoppingCart, Heart, Filter, ArrowUpRight, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TrendingProduct {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  rating: number;
  reviews: number;
  trend: number;
  sales: number;
}

const trendingProducts: TrendingProduct[] = [
  {
    id: '1',
    name: 'Wireless Noise-Canceling Earbuds',
    price: 129.99,
    originalPrice: 179.99,
    image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400',
    category: 'Electronics',
    rating: 4.8,
    reviews: 2341,
    trend: 156,
    sales: 5678,
  },
  {
    id: '2',
    name: 'Smart Fitness Tracker Pro',
    price: 89.99,
    image: 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=400',
    category: 'Wearables',
    rating: 4.6,
    reviews: 1892,
    trend: 134,
    sales: 4532,
  },
  {
    id: '3',
    name: 'Minimalist Leather Wallet',
    price: 49.99,
    image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=400',
    category: 'Accessories',
    rating: 4.9,
    reviews: 987,
    trend: 128,
    sales: 3421,
  },
  {
    id: '4',
    name: 'Portable Bluetooth Speaker',
    price: 79.99,
    originalPrice: 99.99,
    image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400',
    category: 'Electronics',
    rating: 4.7,
    reviews: 1543,
    trend: 118,
    sales: 3198,
  },
  {
    id: '5',
    name: 'Organic Skincare Set',
    price: 65.00,
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400',
    category: 'Beauty',
    rating: 4.5,
    reviews: 876,
    trend: 112,
    sales: 2987,
  },
  {
    id: '6',
    name: 'Running Performance Shoes',
    price: 159.99,
    originalPrice: 199.99,
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400',
    category: 'Sports',
    rating: 4.8,
    reviews: 2156,
    trend: 108,
    sales: 2765,
  },
  {
    id: '7',
    name: 'Smart Home Security Camera',
    price: 119.99,
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
    category: 'Home',
    rating: 4.4,
    reviews: 654,
    trend: 95,
    sales: 2432,
  },
  {
    id: '8',
    name: 'Premium Coffee Maker',
    price: 199.99,
    originalPrice: 249.99,
    image: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=400',
    category: 'Home',
    rating: 4.7,
    reviews: 1234,
    trend: 89,
    sales: 2198,
  },
];

export default function TrendingPage() {
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('trend');
  const [category, setCategory] = useState('all');

  const toggleWishlist = (id: string) => {
    setWishlist(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const filteredProducts = trendingProducts
    .filter(p => category === 'all' || p.category.toLowerCase() === category.toLowerCase())
    .sort((a, b) => {
      switch (sortBy) {
        case 'trend': return b.trend - a.trend;
        case 'sales': return b.sales - a.sales;
        case 'rating': return b.rating - a.rating;
        case 'price-low': return a.price - b.price;
        case 'price-high': return b.price - a.price;
        default: return 0;
      }
    });

  const categories = ['all', ...Array.from(new Set(trendingProducts.map(p => p.category)))];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="h-10 w-10" />
            <h1 className="text-4xl font-bold">Trending Now</h1>
            <Flame className="h-8 w-8 animate-pulse" />
          </div>
          <p className="text-xl opacity-90">
            Discover what everyone is buying - Updated in real-time
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Filter className="h-5 w-5 text-gray-500" />
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {cat === 'all' ? 'All Categories' : cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="trend">Most Trending</SelectItem>
              <SelectItem value="sales">Best Selling</SelectItem>
              <SelectItem value="rating">Highest Rated</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredProducts.map((product, index) => (
            <Card key={product.id} className="group overflow-hidden hover:shadow-lg transition-all duration-300">
              <div className="relative">
                <div className="aspect-square relative overflow-hidden bg-gray-100">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>

                {/* Rank Badge */}
                <Badge className="absolute top-3 left-3 bg-orange-500 text-white font-bold">
                  #{index + 1}
                </Badge>

                {/* Trend Indicator */}
                <div className="absolute top-3 right-12 flex items-center gap-1 bg-green-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
                  <ArrowUpRight className="h-3 w-3" />
                  {product.trend}%
                </div>

                {/* Wishlist */}
                <button
                  onClick={() => toggleWishlist(product.id)}
                  className="absolute top-3 right-3 p-2 rounded-full bg-white shadow-md hover:bg-red-50 transition-colors"
                >
                  <Heart
                    className={`h-4 w-4 ${
                      wishlist.includes(product.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'
                    }`}
                  />
                </button>

                {product.originalPrice && (
                  <Badge className="absolute bottom-3 left-3 bg-red-600 text-white">
                    {Math.round((1 - product.price / product.originalPrice) * 100)}% OFF
                  </Badge>
                )}
              </div>

              <CardContent className="p-4">
                <Badge variant="secondary" className="text-xs mb-2">
                  {product.category}
                </Badge>

                <h3 className="font-semibold mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                  {product.name}
                </h3>

                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{product.rating}</span>
                  </div>
                  <span className="text-gray-400 text-sm">({product.reviews.toLocaleString()} reviews)</span>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-xl font-bold">${product.price.toFixed(2)}</span>
                    {product.originalPrice && (
                      <span className="ml-2 text-sm text-gray-400 line-through">
                        ${product.originalPrice.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {product.sales.toLocaleString()} sold
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button className="flex-1" size="sm">
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Add to Cart
                  </Button>
                  <Link href={`/products/${product.id}`}>
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No trending products found in this category</p>
            <Button variant="link" onClick={() => setCategory('all')}>
              View all categories
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
