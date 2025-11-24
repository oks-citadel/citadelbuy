'use client';

import { use, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Download, Package } from 'lucide-react';

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  product: {
    id: string;
    name: string;
    images: string[];
  };
}

interface Order {
  id: string;
  status: string;
  total: number;
  subtotal: number;
  tax: number;
  shipping: number;
  createdAt: string;
  shippingAddress: {
    fullName: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    email: string;
    phone: string;
  };
  items: OrderItem[];
}

export default function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resolvedParams = use(params);
  const isSuccess = searchParams.get('success') === 'true';

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setIsLoading(true);
        const { ordersApi } = await import('@/lib/api/orders');
        const orderData = await ordersApi.getById(resolvedParams.id);

        // Parse shippingAddress if it's a string
        const parsedOrder = {
          ...orderData,
          shippingAddress: typeof orderData.shippingAddress === 'string'
            ? JSON.parse(orderData.shippingAddress)
            : orderData.shippingAddress,
        };

        setOrder(parsedOrder);
      } catch (err) {
        setError('Failed to load order details');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [resolvedParams.id]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="mt-4 text-muted-foreground">Loading order details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex min-h-[400px] flex-col items-center justify-center">
          <h2 className="text-2xl font-bold">Order Not Found</h2>
          <p className="mt-2 text-muted-foreground">
            {error || 'The order you are looking for does not exist'}
          </p>
          <Button asChild className="mt-6" size="lg">
            <Link href="/products">Continue Shopping</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Success Banner */}
      {isSuccess && (
        <div className="mb-8 rounded-lg bg-green-50 p-6 dark:bg-green-950">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-green-900 dark:text-green-100">
                Order Placed Successfully!
              </h2>
              <p className="mt-1 text-green-700 dark:text-green-300">
                Thank you for your purchase. Your order #{order.id} has been confirmed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Order Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Order Details</h1>
        <p className="mt-2 text-muted-foreground">
          Order #{order.id} • Placed on {new Date(order.createdAt).toLocaleDateString()}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Items ({order.items.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex gap-4">
                  <div className="relative h-20 w-20 flex-shrink-0">
                    <Image
                      src={item.product.images[0] || '/placeholder-product.jpg'}
                      alt={item.product.name}
                      fill
                      className="rounded-md object-cover"
                      sizes="80px"
                    />
                  </div>
                  <div className="flex flex-1 items-center justify-between">
                    <div>
                      <h4 className="font-semibold">{item.product.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Quantity: {item.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        ${item.price.toFixed(2)} each
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Shipping Address */}
          <Card>
            <CardHeader>
              <CardTitle>Shipping Address</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm">
                <p className="font-semibold">{order.shippingAddress.fullName}</p>
                <p>{order.shippingAddress.street}</p>
                <p>
                  {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                  {order.shippingAddress.postalCode}
                </p>
                <p>{order.shippingAddress.country}</p>
                <div className="pt-2">
                  <p className="text-muted-foreground">
                    {order.shippingAddress.email}
                  </p>
                  <p className="text-muted-foreground">
                    {order.shippingAddress.phone}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-4 space-y-6">
            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">${order.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span className="font-medium">${order.tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="font-medium">
                      {order.shipping === 0 ? (
                        <span className="text-green-600">FREE</span>
                      ) : (
                        `$${order.shipping.toFixed(2)}`
                      )}
                    </span>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between">
                    <span className="text-lg font-semibold">Total</span>
                    <span className="text-lg font-bold">
                      ${order.total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Status */}
            <Card>
              <CardHeader>
                <CardTitle>Order Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                    <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-semibold">Processing</p>
                    <p className="text-sm text-muted-foreground">
                      Your order is being prepared
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="space-y-3">
              <Button variant="outline" className="w-full" disabled>
                <Download className="mr-2 h-4 w-4" />
                Download Invoice
              </Button>
              <Button asChild className="w-full">
                <Link href="/products">Continue Shopping</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Email Confirmation Notice */}
      <div className="mt-8 rounded-lg bg-muted p-4">
        <p className="text-sm text-muted-foreground">
          A confirmation email has been sent to{' '}
          <span className="font-medium text-foreground">
            {order.shippingAddress.email}
          </span>
          . You will receive another email when your order ships.
        </p>
      </div>
    </div>
  );
}
