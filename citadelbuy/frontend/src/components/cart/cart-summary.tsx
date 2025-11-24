import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useCartStore } from '@/store/cart-store';
import Link from 'next/link';

interface CartSummaryProps {
  showCheckoutButton?: boolean;
}

export function CartSummary({ showCheckoutButton = true }: CartSummaryProps) {
  const { subtotal, tax, total, itemCount } = useCartStore();

  const subtotalAmount = subtotal();
  const taxAmount = tax();
  const totalAmount = total();
  const count = itemCount();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal ({count} items)</span>
            <span className="font-medium">${subtotalAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tax (10%)</span>
            <span className="font-medium">${taxAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Shipping</span>
            <span className="font-medium text-green-600">
              {subtotalAmount >= 50 ? 'FREE' : '$9.99'}
            </span>
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="flex justify-between">
            <span className="text-lg font-semibold">Total</span>
            <span className="text-lg font-bold">
              ${(totalAmount + (subtotalAmount >= 50 ? 0 : 9.99)).toFixed(2)}
            </span>
          </div>
        </div>

        {subtotalAmount < 50 && (
          <p className="text-sm text-muted-foreground">
            Add ${(50 - subtotalAmount).toFixed(2)} more for free shipping!
          </p>
        )}
      </CardContent>

      {showCheckoutButton && (
        <CardFooter className="flex-col gap-2">
          <Button asChild className="w-full" size="lg">
            <Link href="/checkout">Proceed to Checkout</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/products">Continue Shopping</Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
