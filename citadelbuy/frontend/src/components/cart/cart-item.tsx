import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useCartStore, type CartItem as CartItemType } from '@/store/cart-store';
import { X } from 'lucide-react';

interface CartItemProps {
  item: CartItemType;
}

export function CartItem({ item }: CartItemProps) {
  const { updateQuantity, removeItem } = useCartStore();
  const { product, quantity } = item;

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta;
    if (newQuantity > 0 && newQuantity <= product.stock) {
      updateQuantity(product.id, newQuantity);
    }
  };

  const itemTotal = product.price * quantity;
  const imageUrl = product.images?.[0] || '/placeholder-product.jpg';

  return (
    <div className="flex gap-4 border-b py-4">
      {/* Product Image */}
      <Link href={`/products/${product.id}`} className="relative h-24 w-24 flex-shrink-0">
        <Image
          src={imageUrl}
          alt={product.name}
          fill
          className="rounded-md object-cover"
          sizes="96px"
        />
      </Link>

      {/* Product Info */}
      <div className="flex flex-1 flex-col justify-between">
        <div>
          <Link
            href={`/products/${product.id}`}
            className="font-semibold hover:text-primary"
          >
            {product.name}
          </Link>
          <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
            {product.description}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Quantity Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuantityChange(-1)}
              disabled={quantity <= 1}
            >
              -
            </Button>
            <span className="w-8 text-center font-medium">{quantity}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuantityChange(1)}
              disabled={quantity >= product.stock}
            >
              +
            </Button>
          </div>

          {/* Price */}
          <div className="text-sm">
            <span className="font-semibold">${itemTotal.toFixed(2)}</span>
            {quantity > 1 && (
              <span className="ml-2 text-muted-foreground">
                (${product.price.toFixed(2)} each)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Remove Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => removeItem(product.id)}
        className="h-8 w-8 p-0"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
