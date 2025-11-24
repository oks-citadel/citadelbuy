import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/store/cart-store';
import type { Product } from '@/types';
import { ShoppingCart, Check } from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const [isAdded, setIsAdded] = useState(false);
  const { addItem } = useCartStore();
  const imageUrl = product.images?.[0] || '/placeholder-product.jpg';
  const inStock = product.stock > 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem(product, 1);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  return (
    <Card className="group overflow-hidden transition-shadow hover:shadow-lg">
      <Link href={`/products/${product.id}`}>
        <CardHeader className="p-0">
          <div className="relative aspect-square overflow-hidden bg-gray-100">
            <Image
              src={imageUrl}
              alt={product.name}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            {!inStock && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <span className="text-lg font-semibold text-white">Out of Stock</span>
              </div>
            )}
          </div>
        </CardHeader>
      </Link>

      <CardContent className="p-4">
        <Link href={`/products/${product.id}`} className="block">
          <h3 className="line-clamp-2 font-semibold text-foreground transition-colors hover:text-primary">
            {product.name}
          </h3>
        </Link>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
          {product.description}
        </p>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-2xl font-bold">
            ${product.price.toFixed(2)}
          </span>
          {inStock && (
            <span className="text-sm text-muted-foreground">
              {product.stock} in stock
            </span>
          )}
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Button
          className="w-full"
          disabled={!inStock || isAdded}
          onClick={handleAddToCart}
        >
          {!inStock ? (
            'Out of Stock'
          ) : isAdded ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              Added to Cart
            </>
          ) : (
            <>
              <ShoppingCart className="mr-2 h-4 w-4" />
              Add to Cart
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
