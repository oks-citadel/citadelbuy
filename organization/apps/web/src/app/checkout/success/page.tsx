'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Package,
  Truck,
  Mail,
  Download,
  Share2,
  Home,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ProductCard } from '@/components/product/product-card';
import { recommendationService } from '@/services/ai';
import { Product } from '@/types';
import confetti from 'canvas-confetti';

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId') || 'ORD-' + Date.now();
  const [recommendations, setRecommendations] = React.useState<Product[]>([]);

  React.useEffect(() => {
    // Trigger confetti animation
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: NodeJS.Timeout = setInterval(function () {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  React.useEffect(() => {
    const loadRecommendations = async () => {
      try {
        const recs = await recommendationService.getPersonalized('user', 4);
        setRecommendations(recs);
      } catch (error) {
        console.error('Failed to load recommendations:', error);
      }
    };
    loadRecommendations();
  }, []);

  const orderDetails = {
    orderId,
    email: 'customer@example.com',
    estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }),
  };

  const timelineSteps = [
    { label: 'Order Placed', completed: true, icon: <CheckCircle2 className="h-5 w-5" /> },
    { label: 'Processing', completed: false, icon: <Package className="h-5 w-5" /> },
    { label: 'Shipped', completed: false, icon: <Truck className="h-5 w-5" /> },
    { label: 'Delivered', completed: false, icon: <Home className="h-5 w-5" /> },
  ];

  return (
    <div className="min-h-screen bg-muted/30 py-12">
      <div className="container max-w-4xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center mb-8"
        >
          <div className="h-20 w-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-10 w-10 text-success" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Order Confirmed!</h1>
          <p className="text-muted-foreground">
            Thank you for your purchase. Your order has been received.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="grid md:grid-cols-3 gap-6 text-center md:text-left">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Order Number</p>
                  <p className="font-bold text-lg">{orderDetails.orderId}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Confirmation sent to</p>
                  <p className="font-medium">{orderDetails.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Estimated Delivery</p>
                  <p className="font-medium text-success">{orderDetails.estimatedDelivery}</p>
                </div>
              </div>

              {/* Order Timeline */}
              <div className="mt-8 pt-8 border-t">
                <h3 className="font-medium mb-6">Order Status</h3>
                <div className="flex justify-between">
                  {timelineSteps.map((step, index) => (
                    <div key={step.label} className="flex flex-col items-center flex-1">
                      <div className="relative">
                        <div
                          className={`h-10 w-10 rounded-full flex items-center justify-center ${
                            step.completed
                              ? 'bg-success text-success-foreground'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {step.icon}
                        </div>
                        {index < timelineSteps.length - 1 && (
                          <div
                            className={`absolute top-5 left-10 w-full h-0.5 ${
                              step.completed ? 'bg-success' : 'bg-muted'
                            }`}
                            style={{ width: 'calc(100% + 2rem)' }}
                          />
                        )}
                      </div>
                      <p className="text-sm mt-2 text-center">{step.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="mt-8 pt-8 border-t flex flex-wrap gap-4 justify-center">
                <Button variant="outline">
                  <Mail className="mr-2 h-4 w-4" />
                  Email Receipt
                </Button>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Download Invoice
                </Button>
                <Button variant="outline">
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* What's Next */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="mb-8">
            <CardContent className="p-6">
              <h3 className="font-medium mb-4">What's Next?</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Check your email</p>
                    <p className="text-sm text-muted-foreground">
                      We've sent a confirmation email with your order details and tracking
                      information.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Package className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Track your order</p>
                    <p className="text-sm text-muted-foreground">
                      You can track your order status anytime from your account page or using the
                      tracking link in your email.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Truck className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Delivery updates</p>
                    <p className="text-sm text-muted-foreground">
                      We'll notify you via email and SMS when your order ships and when it's out
                      for delivery.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Continue Shopping */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex gap-4 justify-center mb-12"
        >
          <Link href="/orders">
            <Button variant="outline" size="lg">
              <Package className="mr-2 h-4 w-4" />
              View Orders
            </Button>
          </Link>
          <Link href="/">
            <Button size="lg">
              <ShoppingBag className="mr-2 h-4 w-4" />
              Continue Shopping
            </Button>
          </Link>
        </motion.div>

        {/* AI Recommendations */}
        {recommendations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold">You Might Also Like</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {recommendations.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
