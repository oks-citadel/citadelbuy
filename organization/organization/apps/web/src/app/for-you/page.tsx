'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { User, Star, ShoppingCart, Heart, Sparkles, ThumbsUp, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface RecommendedProduct {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  rating: number;
  reviews: number;
  matchScore: number;
  reason: string;
}

const recommendedProducts: RecommendedProduct[] = [
  {
    id: '1',
    name: 'Premium Wireless Headphones',
    price: 199.99,
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
    category: 'Electronics',
    rating: 4.8,
    reviews: 2341,
    matchScore: 98,
    reason: 'Based on your recent views',
  },
  {
    id: '2',
    name: 'Smart Watch Series 5',
    price: 349.99,
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
    category: 'Wearables',
    rating: 4.7,
    reviews: 1892,
    matchScore: 95,
    reason: 'Similar to items in your wishlist',
  },
  {
    id: '3',
    name: 'Leather Messenger Bag',
    price: 149.99,
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400',
    category: 'Fashion',
    rating: 4.9,
    reviews: 567,
    matchScore: 92,
    reason: 'Customers like you also bought',
  },
  {
    id: '4',
    name: 'Bluetooth Speaker Pro',
    price: 129.99,
    image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400',
    category: 'Electronics',
    rating: 4.6,
    reviews: 1234,
    matchScore: 89,
    reason: 'Trending in your area',
  },
  {
    id: '5',
    name: 'Running Shoes Elite',
    price: 179.99,
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400',
    category: 'Sports',
    rating: 4.8,
    reviews: 876,
    matchScore: 87,
    reason: 'Based on your browsing history',
  },
  {
    id: '6',
    name: 'Aromatherapy Diffuser',
    price: 59.99,
    image: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=400',
    category: 'Home',
    rating: 4.5,
    reviews: 432,
    matchScore: 84,
    reason: 'Popular in Home category',
  },
  {
    id: '7',
    name: 'Minimalist Desk Lamp',
    price: 89.99,
    image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400',
    category: 'Home',
    rating: 4.7,
    reviews: 321,
    matchScore: 82,
    reason: 'Matches your style preferences',
  },
  {
    id: '8',
    name: 'Organic Tea Collection',
    price: 34.99,
    image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400',
    category: 'Food',
    rating: 4.9,
    reviews: 654,
    matchScore: 79,
    reason: 'Based on your past purchases',
  },
];

export default function ForYouPage() {
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const toggleWishlist = (id: string) => {
    setWishlist(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const refreshRecommendations = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1500);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="h-10 w-10" />
            <h1 className="text-4xl font-bold">For You</h1>
          </div>
          <p className="text-xl opacity-90">
            Personalized recommendations powered by AI
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Actions Bar */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <User className="h-4 w-4" />
            <span>Based on your activity and preferences</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshRecommendations}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {recommendedProducts.map((product) => (
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

                {/* Match Score Badge */}
                <Badge className="absolute top-3 left-3 bg-indigo-600 text-white">
                  <ThumbsUp className="h-3 w-3 mr-1" />
                  {product.matchScore}% Match
                </Badge>

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
                {/* Reason */}
                <div className="text-xs text-indigo-600 font-medium mb-2 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  {product.reason}
                </div>

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
                  <span className="text-gray-400 text-sm">({product.reviews.toLocaleString()})</span>
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

        {/* CTA */}
        <div className="text-center mt-12 p-8 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl">
          <Sparkles className="h-12 w-12 text-indigo-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Get Better Recommendations</h2>
          <p className="text-gray-600 mb-4">
            The more you shop and browse, the better our AI understands your preferences
          </p>
          <Link href="/products">
            <Button>Continue Shopping</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
