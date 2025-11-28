'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Clock, Zap, Tag, ArrowRight, ShoppingCart, Heart, Flame, Timer, Percent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface Deal {
  id: string;
  name: string;
  description: string;
  originalPrice: number;
  salePrice: number;
  discount: number;
  image: string;
  category: string;
  endsAt: Date;
  stock: number;
  sold: number;
}

const mockDeals: Deal[] = [
  {
    id: '1',
    name: 'Premium Wireless Headphones',
    description: 'High-fidelity sound with active noise cancellation',
    originalPrice: 299.99,
    salePrice: 149.99,
    discount: 50,
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
    category: 'Electronics',
    endsAt: new Date(Date.now() + 3600000 * 5),
    stock: 50,
    sold: 35,
  },
  {
    id: '2',
    name: 'Smart Watch Pro',
    description: 'Advanced fitness tracking with heart rate monitor',
    originalPrice: 399.99,
    salePrice: 249.99,
    discount: 38,
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
    category: 'Electronics',
    endsAt: new Date(Date.now() + 3600000 * 8),
    stock: 30,
    sold: 22,
  },
  {
    id: '3',
    name: 'Designer Leather Bag',
    description: 'Handcrafted genuine leather with gold accents',
    originalPrice: 450.00,
    salePrice: 225.00,
    discount: 50,
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400',
    category: 'Fashion',
    endsAt: new Date(Date.now() + 3600000 * 12),
    stock: 20,
    sold: 15,
  },
  {
    id: '4',
    name: 'Robot Vacuum Cleaner',
    description: 'Smart mapping with automatic charging',
    originalPrice: 599.99,
    salePrice: 349.99,
    discount: 42,
    image: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=400',
    category: 'Home',
    endsAt: new Date(Date.now() + 3600000 * 6),
    stock: 40,
    sold: 28,
  },
  {
    id: '5',
    name: 'Professional Camera Kit',
    description: 'Mirrorless camera with 2 lenses and accessories',
    originalPrice: 1499.99,
    salePrice: 999.99,
    discount: 33,
    image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400',
    category: 'Electronics',
    endsAt: new Date(Date.now() + 3600000 * 10),
    stock: 15,
    sold: 8,
  },
  {
    id: '6',
    name: 'Ergonomic Office Chair',
    description: 'Premium mesh back with lumbar support',
    originalPrice: 699.99,
    salePrice: 399.99,
    discount: 43,
    image: 'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=400',
    category: 'Furniture',
    endsAt: new Date(Date.now() + 3600000 * 4),
    stock: 25,
    sold: 18,
  },
];

function CountdownTimer({ endsAt }: { endsAt: Date }) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const end = endsAt.getTime();
      const diff = end - now;

      if (diff > 0) {
        setTimeLeft({
          hours: Math.floor(diff / (1000 * 60 * 60)),
          minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((diff % (1000 * 60)) / 1000),
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [endsAt]);

  return (
    <div className="flex items-center gap-1 text-sm">
      <Timer className="h-4 w-4 text-red-500" />
      <span className="font-mono font-semibold text-red-600">
        {String(timeLeft.hours).padStart(2, '0')}:
        {String(timeLeft.minutes).padStart(2, '0')}:
        {String(timeLeft.seconds).padStart(2, '0')}
      </span>
    </div>
  );
}

export default function DealsPage() {
  const [wishlist, setWishlist] = useState<string[]>([]);

  const toggleWishlist = (id: string) => {
    setWishlist(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-white">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-red-600 via-red-500 to-orange-500 text-white">
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Zap className="h-10 w-10 animate-pulse" />
            <h1 className="text-4xl md:text-5xl font-bold">Flash Deals</h1>
            <Flame className="h-10 w-10 animate-pulse" />
          </div>
          <p className="text-center text-xl opacity-90 mb-6">
            Limited time offers - Up to 50% off!
          </p>
          <div className="flex justify-center gap-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-6 py-3">
              <div className="text-3xl font-bold">{mockDeals.length}</div>
              <div className="text-sm opacity-90">Active Deals</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-6 py-3">
              <div className="text-3xl font-bold">50%</div>
              <div className="text-sm opacity-90">Max Discount</div>
            </div>
          </div>
        </div>
      </div>

      {/* Deals Grid */}
      <div className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Tag className="h-6 w-6 text-red-500" />
            Today&apos;s Hot Deals
          </h2>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="h-4 w-4" />
            Updated every hour
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockDeals.map((deal) => (
            <Card key={deal.id} className="group overflow-hidden hover:shadow-xl transition-all duration-300 border-2 hover:border-red-200">
              <div className="relative">
                <div className="aspect-square relative overflow-hidden bg-gray-100">
                  <Image
                    src={deal.image}
                    alt={deal.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>

                {/* Discount Badge */}
                <Badge className="absolute top-3 left-3 bg-red-600 text-white text-lg font-bold px-3 py-1">
                  -{deal.discount}%
                </Badge>

                {/* Wishlist Button */}
                <button
                  onClick={() => toggleWishlist(deal.id)}
                  className="absolute top-3 right-3 p-2 rounded-full bg-white shadow-md hover:bg-red-50 transition-colors"
                >
                  <Heart
                    className={`h-5 w-5 transition-colors ${
                      wishlist.includes(deal.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'
                    }`}
                  />
                </button>

                {/* Stock Progress */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                  <div className="flex items-center justify-between text-white text-sm mb-1">
                    <span>{deal.sold} sold</span>
                    <span>{deal.stock - deal.sold} left</span>
                  </div>
                  <div className="h-2 bg-white/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500 rounded-full transition-all"
                      style={{ width: `${(deal.sold / deal.stock) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="secondary" className="text-xs">
                    {deal.category}
                  </Badge>
                  <CountdownTimer endsAt={deal.endsAt} />
                </div>

                <h3 className="font-semibold text-lg mb-1 line-clamp-1">{deal.name}</h3>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{deal.description}</p>

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-red-600">
                      ${deal.salePrice.toFixed(2)}
                    </span>
                    <span className="text-sm text-gray-400 line-through">
                      ${deal.originalPrice.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                    <Percent className="h-4 w-4" />
                    Save ${(deal.originalPrice - deal.salePrice).toFixed(2)}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button className="flex-1 bg-red-600 hover:bg-red-700">
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Add to Cart
                  </Button>
                  <Link href={`/products/${deal.id}`}>
                    <Button variant="outline" size="icon">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* More Deals CTA */}
        <div className="text-center mt-12">
          <div className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 rounded-full text-gray-600">
            <Clock className="h-5 w-5" />
            <span>New deals every day at midnight!</span>
          </div>
        </div>
      </div>
    </div>
  );
}
