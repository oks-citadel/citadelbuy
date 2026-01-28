'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useOrdersStore } from '@/stores/account-store';
import {
  ArrowLeft,
  Package,
  Truck,
  MapPin,
  CreditCard,
  Clock,
  CheckCircle,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { currentOrder, isLoading, fetchOrderById } = useOrdersStore();

  useEffect(() => {
    if (params.id) {
      fetchOrderById(params.id as string);
    }
  }, [params.id, fetchOrderById]);

  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      CONFIRMED: 'bg-blue-100 text-blue-800',
      PROCESSING: 'bg-purple-100 text-purple-800',
      SHIPPED: 'bg-indigo-100 text-indigo-800',
      OUT_FOR_DELIVERY: 'bg-cyan-100 text-cyan-800',
      DELIVERED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
      REFUNDED: 'bg-gray-100 text-gray-800',
    };
    return statusStyles[status] || 'bg-gray-100 text-gray-800';
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (isLoading || !currentOrder) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-gray-200 rounded" />
            <div className="h-4 w-32 bg-gray-200 rounded" />
          </div>
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-6 w-24 bg-gray-200 rounded" />
              <div className="h-20 bg-gray-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const order = currentOrder;

  // Order timeline
  const timeline = [
    {
      status: 'PENDING',
      label: 'Order Placed',
      date: order.createdAt,
      completed: true,
    },
    {
      status: 'CONFIRMED',
      label: 'Confirmed',
      date: order.status !== 'PENDING' ? order.updatedAt : null,
      completed: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(
        order.status
      ),
    },
    {
      status: 'PROCESSING',
      label: 'Processing',
      date: null,
      completed: ['PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.status),
    },
    {
      status: 'SHIPPED',
      label: 'Shipped',
      date: null,
      completed: ['SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.status),
    },
    {
      status: 'DELIVERED',
      label: 'Delivered',
      date: order.deliveredAt,
      completed: order.status === 'DELIVERED',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <button
          onClick={() => router.back()}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Orders
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Order #{order.orderNumber}
            </h1>
            <p className="text-gray-600">
              Placed on {new Date(order.createdAt).toLocaleDateString()} at{' '}
              {new Date(order.createdAt).toLocaleTimeString()}
            </p>
          </div>
          <Badge className={`${getStatusBadge(order.status)} text-sm px-4 py-2`}>
            {order.status.replace(/_/g, ' ')}
          </Badge>
        </div>
      </div>

      {/* Order Timeline */}
      {!['CANCELLED', 'REFUNDED'].includes(order.status) && (
        <Card>
          <CardHeader>
            <CardTitle>Order Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200" />
              <div className="relative flex justify-between">
                {timeline.map((step, index) => (
                  <div key={step.status} className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center z-10 ${
                        step.completed
                          ? 'bg-primary text-white'
                          : 'bg-gray-200 text-gray-400'
                      }`}
                    >
                      {step.completed ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <span className="text-sm font-medium">{index + 1}</span>
                      )}
                    </div>
                    <p
                      className={`mt-2 text-sm font-medium ${
                        step.completed ? 'text-gray-900' : 'text-gray-400'
                      }`}
                    >
                      {step.label}
                    </p>
                    {step.date && (
                      <p className="text-xs text-gray-500">
                        {new Date(step.date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tracking Info */}
      {order.tracking && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Tracking Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-sm text-gray-500">Carrier</p>
                <p className="font-medium text-gray-900">{order.tracking.carrier}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Tracking Number</p>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900 font-mono">
                    {order.tracking.trackingNumber}
                  </p>
                  <button
                    onClick={() => copyToClipboard(order.tracking!.trackingNumber)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <a
                href={order.tracking.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex"
              >
                <Button>
                  Track Package
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </a>
            </div>

            {order.tracking.events && order.tracking.events.length > 0 && (
              <div className="mt-6 border-t pt-6">
                <h4 className="font-medium text-gray-900 mb-4">Tracking History</h4>
                <div className="space-y-4">
                  {order.tracking.events.map((event, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                      <div>
                        <p className="font-medium text-gray-900">{event.status}</p>
                        <p className="text-sm text-gray-600">{event.description}</p>
                        {event.location && (
                          <p className="text-sm text-gray-500">{event.location}</p>
                        )}
                        <p className="text-xs text-gray-400">
                          {new Date(event.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Shipping Address */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Shipping Address
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-gray-600">
              <p className="font-medium text-gray-900">{order.shippingAddress.name}</p>
              <p>{order.shippingAddress.street}</p>
              <p>
                {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                {order.shippingAddress.postalCode}
              </p>
              <p>{order.shippingAddress.country}</p>
              {order.shippingAddress.phone && <p className="mt-2">{order.shippingAddress.phone}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Payment Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Payment Method
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="w-12 h-8 bg-gray-100 rounded flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {order.paymentMethod.brand || order.paymentMethod.type}
                  {order.paymentMethod.last4 && ` •••• ${order.paymentMethod.last4}`}
                </p>
                {order.paymentMethod.expiryMonth && order.paymentMethod.expiryYear && (
                  <p className="text-sm text-gray-500">
                    Expires {order.paymentMethod.expiryMonth}/{order.paymentMethod.expiryYear}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Payment Status</span>
                <Badge
                  className={
                    order.paymentStatus === 'CAPTURED'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }
                >
                  {order.paymentStatus}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order Items */}
      <Card>
        <CardHeader>
          <CardTitle>Order Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {order.items.map((item) => (
              <div key={item.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                <div className="w-20 h-20 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                  {item.product.images?.[0]?.url ? (
                    <img
                      src={item.product.images[0].url}
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/products/${item.product.slug}`}
                    className="font-medium text-gray-900 hover:text-primary"
                  >
                    {item.product.name}
                  </Link>
                  {item.variant && (
                    <p className="text-sm text-gray-500">
                      {item.variant.options.map((o) => `${o.name}: ${o.value}`).join(', ')}
                    </p>
                  )}
                  <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">${item.total.toFixed(2)}</p>
                  <p className="text-sm text-gray-500">${item.price.toFixed(2)} each</p>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="mt-6 pt-6 border-t space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="text-gray-900">${order.subtotal.toFixed(2)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Discount</span>
                <span className="text-green-600">-${order.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Shipping</span>
              <span className="text-gray-900">
                {order.shipping === 0 ? 'Free' : `$${order.shipping.toFixed(2)}`}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Tax</span>
              <span className="text-gray-900">${order.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-semibold pt-2 border-t">
              <span className="text-gray-900">Total</span>
              <span className="text-gray-900">${order.total.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {order.status === 'DELIVERED' && (
          <Link href={`/account/returns/new?orderId=${order.id}`}>
            <Button variant="outline">Return Items</Button>
          </Link>
        )}
        {['PENDING', 'CONFIRMED'].includes(order.status) && (
          <Button variant="outline" className="text-red-600 hover:text-red-700">
            Cancel Order
          </Button>
        )}
        <Button variant="outline">Download Invoice</Button>
        <Link href="/account/support">
          <Button variant="outline">Need Help?</Button>
        </Link>
      </div>
    </div>
  );
}
