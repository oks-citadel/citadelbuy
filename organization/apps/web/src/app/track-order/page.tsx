'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Package, Search, Truck, CheckCircle, Clock, MapPin, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { trackingApi } from '@/lib/api-client';
import { toast } from 'sonner';

interface TrackingStatus {
  status: string;
  description: string;
  location: string;
  timestamp: string;
  completed?: boolean;
}

interface TrackingData {
  orderNumber: string;
  orderId: string;
  status: string;
  trackingNumber?: string;
  carrier?: string;
  shippingMethod?: string;
  estimatedDelivery: string;
  actualDelivery?: string;
  orderDate: string;
  timeline: TrackingStatus[];
  shippingAddress?: any;
  items?: Array<{
    name: string;
    quantity: number;
    image?: string;
  }>;
  total?: number;
}

export default function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [isTracking, setIsTracking] = useState(false);
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTrack = async () => {
    if (!orderNumber || !email) {
      toast.error('Please enter both order number and email');
      return;
    }

    try {
      setIsTracking(true);
      setError(null);

      // Call the tracking API with order number and email (guest tracking)
      const response = await trackingApi.trackGuestOrder(orderNumber, email);

      // Transform the response to match our interface
      const trackingData: TrackingData = {
        orderNumber: response.orderNumber,
        orderId: response.orderId,
        status: response.status,
        trackingNumber: response.trackingNumber,
        carrier: response.carrier,
        shippingMethod: response.shippingMethod,
        estimatedDelivery: new Date(response.estimatedDelivery).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        actualDelivery: response.actualDelivery
          ? new Date(response.actualDelivery).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })
          : undefined,
        orderDate: response.orderDate,
        timeline: response.timeline.map((event: any) => ({
          status: event.description,
          description: event.description,
          location: event.location,
          timestamp: new Date(event.timestamp).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          }),
          completed: event.completed ?? false,
        })),
        shippingAddress: response.shippingAddress,
        items: response.items,
        total: response.total,
      };

      setTrackingData(trackingData);
      toast.success('Order tracking information loaded successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to track order';
      setError(errorMessage);
      toast.error(errorMessage);
      setTrackingData(null);
    } finally {
      setIsTracking(false);
    }
  };

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('delivered')) return 'bg-green-100 text-green-800';
    if (statusLower.includes('transit') || statusLower.includes('shipped')) return 'bg-blue-100 text-blue-800';
    if (statusLower.includes('processing')) return 'bg-yellow-100 text-yellow-800';
    if (statusLower.includes('cancelled') || statusLower.includes('exception')) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-500 text-white">
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-center gap-3 mb-4">
            <Truck className="h-10 w-10" />
            <h1 className="text-4xl font-bold">Track Your Order</h1>
          </div>
          <p className="text-xl opacity-90">
            Enter your order details to see real-time tracking updates
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* Search Form */}
        <Card className="max-w-2xl mx-auto mb-12">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Find Your Order
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Order Number
                </label>
                <Input
                  type="text"
                  placeholder="e.g., CB-2024-12345678"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  disabled={isTracking}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <Input
                  type="email"
                  placeholder="Email used for order"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isTracking}
                />
              </div>
              <Button
                className="w-full"
                onClick={handleTrack}
                disabled={!orderNumber || !email || isTracking}
                isLoading={isTracking}
              >
                {isTracking ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Tracking...
                  </>
                ) : (
                  <>
                    <Package className="h-4 w-4 mr-2" />
                    Track Order
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error Message */}
        {error && (
          <div className="max-w-3xl mx-auto">
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-6 text-center">
                <Package className="h-12 w-12 mx-auto mb-4 text-red-600 opacity-50" />
                <h3 className="text-lg font-semibold mb-2 text-red-900">Order Not Found</h3>
                <p className="text-red-800">{error}</p>
                <p className="text-sm text-red-700 mt-2">
                  Please check your order number and email address and try again.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tracking Results */}
        {trackingData && (
          <div className="max-w-3xl mx-auto">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Order #{trackingData.orderNumber}</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                      Ordered on {new Date(trackingData.orderDate).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                    {trackingData.trackingNumber && (
                      <p className="text-sm text-gray-500">
                        Tracking: {trackingData.trackingNumber}
                        {trackingData.carrier && ` (${trackingData.carrier})`}
                      </p>
                    )}
                  </div>
                  <div className="text-left md:text-right">
                    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(trackingData.status)}`}>
                      <Truck className="h-4 w-4" />
                      {trackingData.status.replace(/_/g, ' ')}
                    </span>
                    <p className="text-sm text-gray-500 mt-2">
                      Est. Delivery: {trackingData.estimatedDelivery}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Progress Bar */}
                <div className="relative mb-8">
                  <div className="h-2 bg-gray-200 rounded-full">
                    <div
                      className="h-2 bg-emerald-500 rounded-full transition-all duration-500"
                      style={{
                        width: `${(trackingData.timeline.filter(s => s.completed).length / trackingData.timeline.length) * 100}%`
                      }}
                    />
                  </div>
                </div>

                {/* Timeline */}
                <div className="space-y-6">
                  {trackingData.timeline.map((step, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            step.completed
                              ? 'bg-emerald-500 text-white'
                              : 'bg-gray-200 text-gray-400'
                          }`}
                        >
                          {step.completed ? (
                            <CheckCircle className="h-5 w-5" />
                          ) : (
                            <Clock className="h-5 w-5" />
                          )}
                        </div>
                        {index < trackingData.timeline.length - 1 && (
                          <div
                            className={`w-0.5 h-12 ${
                              step.completed ? 'bg-emerald-500' : 'bg-gray-200'
                            }`}
                          />
                        )}
                      </div>
                      <div className="flex-1 pb-6">
                        <h3
                          className={`font-semibold ${
                            step.completed ? 'text-gray-900' : 'text-gray-400'
                          }`}
                        >
                          {step.description}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                          <MapPin className="h-3 w-3" />
                          {step.location}
                        </div>
                        <p className="text-sm text-gray-400 mt-1">{step.timestamp}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Order Items */}
                {trackingData.items && trackingData.items.length > 0 && (
                  <div className="mt-8 pt-8 border-t">
                    <h4 className="font-semibold mb-4">Order Items</h4>
                    <div className="space-y-3">
                      {trackingData.items.map((item, index) => (
                        <div key={index} className="flex items-center gap-3">
                          {item.image && (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                          )}
                          <div className="flex-1">
                            <p className="text-sm font-medium">{item.name}</p>
                            <p className="text-xs text-gray-500">Quantity: {item.quantity}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Shipping Address */}
                {trackingData.shippingAddress && (
                  <div className="mt-6 pt-6 border-t">
                    <h4 className="font-semibold mb-2">Shipping Address</h4>
                    <div className="text-sm text-gray-600">
                      <p>{trackingData.shippingAddress.name}</p>
                      <p>{trackingData.shippingAddress.street}</p>
                      <p>
                        {trackingData.shippingAddress.city}, {trackingData.shippingAddress.state} {trackingData.shippingAddress.postalCode}
                      </p>
                      <p>{trackingData.shippingAddress.country}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Help Text */}
        {!trackingData && !error && (
          <div className="text-center text-gray-500 mt-8">
            <p className="mb-2">Can&apos;t find your order number?</p>
            <p className="text-sm">
              Check your email confirmation or{' '}
              <Link href="/account/orders" className="text-primary hover:underline">
                view your order history
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
