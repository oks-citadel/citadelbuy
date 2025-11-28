'use client';

import { useState } from 'react';
import { Package, Search, Truck, CheckCircle, Clock, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TrackingStatus {
  status: string;
  location: string;
  timestamp: string;
  completed: boolean;
}

const mockTracking: TrackingStatus[] = [
  { status: 'Order Placed', location: 'Online', timestamp: 'Nov 20, 2024 - 10:30 AM', completed: true },
  { status: 'Processing', location: 'Warehouse', timestamp: 'Nov 20, 2024 - 2:15 PM', completed: true },
  { status: 'Shipped', location: 'Distribution Center', timestamp: 'Nov 21, 2024 - 9:00 AM', completed: true },
  { status: 'In Transit', location: 'Local Facility', timestamp: 'Nov 23, 2024 - 8:45 AM', completed: true },
  { status: 'Out for Delivery', location: 'Your City', timestamp: 'Nov 24, 2024 - 7:30 AM', completed: false },
  { status: 'Delivered', location: 'Your Address', timestamp: 'Estimated Today', completed: false },
];

export default function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [isTracking, setIsTracking] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleTrack = () => {
    if (orderNumber && email) {
      setIsTracking(true);
      setTimeout(() => {
        setIsTracking(false);
        setShowResults(true);
      }, 1500);
    }
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
                  placeholder="e.g., CB-2024-12345"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
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
                />
              </div>
              <Button
                className="w-full"
                onClick={handleTrack}
                disabled={!orderNumber || !email || isTracking}
              >
                {isTracking ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
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

        {/* Tracking Results */}
        {showResults && (
          <div className="max-w-3xl mx-auto">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Order #{orderNumber || 'CB-2024-12345'}</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">Estimated Delivery: Today</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                      <Truck className="h-4 w-4" />
                      Out for Delivery
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Progress Bar */}
                <div className="relative mb-8">
                  <div className="h-2 bg-gray-200 rounded-full">
                    <div
                      className="h-2 bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: '80%' }}
                    />
                  </div>
                </div>

                {/* Timeline */}
                <div className="space-y-6">
                  {mockTracking.map((step, index) => (
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
                        {index < mockTracking.length - 1 && (
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
                          {step.status}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <MapPin className="h-3 w-3" />
                          {step.location}
                        </div>
                        <p className="text-sm text-gray-400">{step.timestamp}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Delivery Info */}
                <div className="mt-8 p-4 bg-emerald-50 rounded-lg">
                  <h3 className="font-semibold text-emerald-800 mb-2">Delivery Details</h3>
                  <p className="text-sm text-emerald-700">
                    Your package is currently out for delivery and will arrive today between 2:00 PM - 6:00 PM.
                    Please ensure someone is available to receive the package.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Help Text */}
        {!showResults && (
          <div className="text-center text-gray-500 mt-8">
            <p className="mb-2">Can&apos;t find your order number?</p>
            <p className="text-sm">
              Check your email confirmation or{' '}
              <a href="/account/orders" className="text-primary hover:underline">
                view your order history
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
