'use client';

import * as React from 'react';
import Link from 'next/link';
import { Zap, ChevronRight, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProductCard } from '@/components/product/product-card';
import { Product } from '@/types';

// Mock flash deal products
const mockFlashDeals: Product[] = [
  {
    id: 'flash-1',
    sku: 'FLASH001',
    name: 'Wireless Noise-Cancelling Headphones',
    slug: 'wireless-noise-cancelling-headphones',
    description: 'Premium sound quality with active noise cancellation',
    price: 149.99,
    compareAtPrice: 299.99,
    currency: 'USD',
    images: [{ id: '1', url: '/products/headphones.jpg', alt: 'Headphones', position: 0 }],
    category: { id: 'cat-1', name: 'Electronics', slug: 'electronics' },
    vendor: { id: 'v-1', name: 'TechBrand', slug: 'techbrand', rating: 4.8, reviewCount: 500, verified: true },
    tags: ['electronics', 'audio', 'headphones'],
    status: 'ACTIVE',
    inventory: { quantity: 50, reserved: 0, available: 50, lowStockThreshold: 10, trackInventory: true, allowBackorder: false, status: 'IN_STOCK' },
    rating: 4.7,
    reviewCount: 234,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  // Add more mock products as needed
];

function CountdownTimer({ endTime }: { endTime: Date }) {
  const [timeLeft, setTimeLeft] = React.useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  React.useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = endTime.getTime() - new Date().getTime();

      if (difference > 0) {
        setTimeLeft({
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [endTime]);

  return (
    <div className="flex items-center gap-1">
      <Clock className="h-4 w-4" />
      <span className="font-mono font-bold">
        {String(timeLeft.hours).padStart(2, '0')}:
        {String(timeLeft.minutes).padStart(2, '0')}:
        {String(timeLeft.seconds).padStart(2, '0')}
      </span>
    </div>
  );
}

export function FlashDeals() {
  const [products] = React.useState<Product[]>(mockFlashDeals);
  const dealEndTime = React.useMemo(() => {
    const end = new Date();
    end.setHours(end.getHours() + 8);
    return end;
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
            <Zap className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-destructive">Flash Deals</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Ends in</span>
              <Badge variant="destructive" className="font-mono">
                <CountdownTimer endTime={dealEndTime} />
              </Badge>
            </div>
          </div>
        </div>
        <Link href="/deals">
          <Button variant="destructive" size="sm">
            View All Deals <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            badge={{ text: 'Flash Deal', variant: 'destructive' }}
          />
        ))}
      </div>
    </div>
  );
}
