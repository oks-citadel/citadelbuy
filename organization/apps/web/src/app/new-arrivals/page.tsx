'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Sparkles, Star, ShoppingCart, Heart, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface NewProduct {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  rating: number;
  reviews: number;
  addedDate: Date;
  isNew: boolean;
}

const newProducts: NewProduct[] = [
  {
    id: '1',
    name: 'Ultra HD 4K Action Camera',
    price: 299.99,
    image: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400',
    category: 'Electronics',
    rating: 4.7,
    reviews: 23,
    addedDate: new Date(Date.now() - 86400000),
    isNew: true,
  },
  {
    id: '2',
    name: 'Sustainable Bamboo Watch',
    price: 149.99,
    image: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400',
    category: 'Fashion',
    rating: 4.9,
    reviews: 15,
    addedDate: new Date(Date.now() - 86400000 * 2),
    isNew: true,
  },
  {
    id: '3',
    name: 'Smart Plant Monitor',
    price: 49.99,
    image: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=400',
    category: 'Home',
    rating: 4.5,
    reviews: 8,
    addedDate: new Date(Date.now() - 86400000 * 3),
    isNew: true,
  },
  {
    id: '4',
    name: 'Wireless Gaming Mouse',
    price: 79.99,
    image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400',
    category: 'Electronics',
    rating: 4.8,
    reviews: 45,
    addedDate: new Date(Date.now() - 86400000 * 4),
    isNew: true,
  },
  {
    id: '5',
    name: 'Organic Essential Oil Set',
    price: 39.99,
    image: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=400',
    category: 'Beauty',
    rating: 4.6,
    reviews: 32,
    addedDate: new Date(Date.now() - 86400000 * 5),
    isNew: true,
  },
  {
    id: '6',
    name: 'Yoga Mat Premium',
    price: 69.99,
    image: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400',
    category: 'Sports',
    rating: 4.7,
    reviews: 28,
    addedDate: new Date(Date.now() - 86400000 * 6),
    isNew: true,
  },
  {
    id: '7',
    name: 'Vintage Vinyl Player',
    price: 199.99,
    image: 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=400',
    category: 'Electronics',
    rating: 4.4,
    reviews: 12,
    addedDate: new Date(Date.now() - 86400000 * 7),
    isNew: false,
  },
  {
    id: '8',
    name: 'Ceramic Dinner Set',
    price: 89.99,
    image: 'https://images.unsplash.com/photo-1603199506016-5f36e6d10b0a?w=400',
    category: 'Home',
    rating: 4.8,
    reviews: 56,
    addedDate: new Date(Date.now() - 86400000 * 8),
    isNew: false,
  },
];

function getDaysAgo(date: Date): string {
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

export default function NewArrivalsPage() {
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [timeFilter, setTimeFilter] = useState('all');

  const toggleWishlist = (id: string) => {
    setWishlist(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const filteredProducts = newProducts.filter(product => {
    const daysAgo = Math.floor((Date.now() - product.addedDate.getTime()) / 86400000);
    switch (timeFilter) {
      case 'today': return daysAgo === 0;
      case 'week': return daysAgo <= 7;
      case 'month': return daysAgo <= 30;
      default: return true;
    }
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-500 text-white">
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="h-10 w-10" />
            <h1 className="text-4xl font-bold">New Arrivals</h1>
          </div>
          <p className="text-xl opacity-90">
            Be the first to discover our latest products
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Time Filter Tabs */}
        <Tabs value={timeFilter} onValueChange={setTimeFilter} className="mb-8">
          <TabsList className="grid w-full max-w-md grid-cols-4">
            <TabsTrigger value="all">All New</TabsTrigger>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="week">This Week</TabsTrigger>
            <TabsTrigger value="month">This Month</TabsTrigger>
          </TabsList>

          <TabsContent value={timeFilter} className="mt-8">
            {/* Products Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredProducts.map((product) => (
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

                    {/* New Badge */}
                    {product.isNew && (
                      <Badge className="absolute top-3 left-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white">
                        <Sparkles className="h-3 w-3 mr-1" />
                        NEW
                      </Badge>
                    )}

                    {/* Date Badge */}
                    <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-white/90 backdrop-blur-sm text-gray-700 text-xs font-medium px-2 py-1 rounded-full">
                      <Clock className="h-3 w-3" />
                      {getDaysAgo(product.addedDate)}
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
                      <span className="text-gray-400 text-sm">({product.reviews} reviews)</span>
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xl font-bold">${product.price.toFixed(2)}</span>
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
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No new arrivals in this time period</p>
                <Button variant="link" onClick={() => setTimeFilter('all')}>
                  View all new arrivals
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
