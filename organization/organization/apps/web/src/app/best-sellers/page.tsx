'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Trophy, Star, TrendingUp, ShoppingBag, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BroxivaBackground } from '@/components/theme/BroxivaBackground';

const bestSellers = [
  { id: 1, name: 'Premium Wireless Headphones', price: 299.99, rating: 4.9, reviews: 2847, image: '/products/headphones.jpg', category: 'Electronics', rank: 1 },
  { id: 2, name: 'Smart Fitness Watch Pro', price: 449.99, rating: 4.8, reviews: 1923, image: '/products/watch.jpg', category: 'Electronics', rank: 2 },
  { id: 3, name: 'Organic Cotton T-Shirt', price: 49.99, rating: 4.7, reviews: 3421, image: '/products/tshirt.jpg', category: 'Fashion', rank: 3 },
  { id: 4, name: 'Ergonomic Office Chair', price: 599.99, rating: 4.9, reviews: 1567, image: '/products/chair.jpg', category: 'Home', rank: 4 },
  { id: 5, name: 'Natural Skincare Set', price: 129.99, rating: 4.8, reviews: 2156, image: '/products/skincare.jpg', category: 'Beauty', rank: 5 },
  { id: 6, name: 'Running Shoes Ultra', price: 179.99, rating: 4.7, reviews: 1834, image: '/products/shoes.jpg', category: 'Sports', rank: 6 },
  { id: 7, name: 'Smart Home Hub', price: 249.99, rating: 4.6, reviews: 1245, image: '/products/smarthome.jpg', category: 'Electronics', rank: 7 },
  { id: 8, name: 'Premium Coffee Maker', price: 349.99, rating: 4.8, reviews: 987, image: '/products/coffee.jpg', category: 'Home', rank: 8 },
];

export default function BestSellersPage() {
  return (
    <BroxivaBackground variant="default">
      <section className="py-12 sm:py-20">
        <div className="container">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-bx-bg-2 border border-[var(--bx-border)] mb-6">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium text-bx-text">Top Rated Products</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              <span className="text-bx-text">Best </span>
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, var(--bx-pink) 0%, var(--bx-violet) 50%, var(--bx-cyan) 100%)' }}>
                Sellers
              </span>
            </h1>
            <p className="text-bx-text-muted text-lg max-w-2xl mx-auto">
              Discover our most popular products loved by thousands of customers worldwide.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {bestSellers.map((product) => (
              <Link href={`/products/${product.id}`} key={product.id}>
                <Card className="group h-full bg-bx-bg-2 border-[var(--bx-border)] hover:border-[var(--bx-border-hover)] transition-all duration-300 overflow-hidden">
                  <div className="aspect-square bg-bx-bg-3 relative">
                    <Badge className="absolute top-3 left-3 bg-yellow-500 text-black font-bold">
                      #{product.rank}
                    </Badge>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <ShoppingBag className="w-16 h-16 text-bx-text-muted/30" />
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <Badge variant="outline" className="mb-2 text-xs">{product.category}</Badge>
                    <h3 className="font-semibold text-bx-text mb-2 group-hover:text-bx-pink transition-colors line-clamp-2">
                      {product.name}
                    </h3>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                        <span className="text-sm font-medium text-bx-text">{product.rating}</span>
                      </div>
                      <span className="text-sm text-bx-text-muted">({product.reviews.toLocaleString()} reviews)</span>
                    </div>
                    <p className="text-lg font-bold text-bx-text">${product.price}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button asChild size="lg" className="bg-gradient-to-r from-bx-pink via-bx-violet to-bx-cyan text-white">
              <Link href="/products">
                View All Products
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </BroxivaBackground>
  );
}
