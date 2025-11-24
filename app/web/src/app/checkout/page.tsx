'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cart-store';
import { CheckoutSteps, type CheckoutStep } from '@/components/checkout/checkout-steps';
import { ShippingForm, type ShippingFormData } from '@/components/checkout/shipping-form';
import { StripePaymentForm } from '@/components/checkout/stripe-payment-form';
import { OrderReview } from '@/components/checkout/order-review';
import { CartSummary } from '@/components/cart/cart-summary';
import { StripeProvider } from '@/components/providers/stripe-provider';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, clearCart, subtotal, tax, total } = useCartStore();
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('shipping');
  const [shippingInfo, setShippingInfo] = useState<ShippingFormData | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [isCreatingIntent, setIsCreatingIntent] = useState(false);

  // Redirect if cart is empty
  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex min-h-[400px] flex-col items-center justify-center">
          <h2 className="text-2xl font-bold">Your cart is empty</h2>
          <p className="mt-2 text-muted-foreground">
            Add some products to your cart before checking out
          </p>
          <Button asChild className="mt-6" size="lg">
            <Link href="/products">Browse Products</Link>
          </Button>
        </div>
      </div>
    );
  }

  const handleShippingNext = async (data: ShippingFormData) => {
    setShippingInfo(data);

    try {
      setIsCreatingIntent(true);

      const shippingAmount = subtotal() >= 50 ? 0 : 9.99;
      const totalAmount = total() + shippingAmount;

      // Step 1: Create order in PENDING status
      const { ordersApi } = await import('@/lib/api/orders');
      const orderData = {
        items: items.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          price: item.product.price,
        })),
        shippingAddress: data,
        subtotal: subtotal(),
        tax: tax(),
        shipping: shippingAmount,
        total: totalAmount,
      };

      const order = await ordersApi.create(orderData);
      setOrderId(order.id);

      // Step 2: Create payment intent with order ID
      const { paymentsApi } = await import('@/lib/api/payments');
      const paymentIntent = await paymentsApi.createPaymentIntent({
        amount: totalAmount,
        currency: 'usd',
        orderId: order.id,
      });

      setClientSecret(paymentIntent.clientSecret);
      setPaymentIntentId(paymentIntent.paymentIntentId);
      setCurrentStep('payment');
    } catch (error) {
      console.error('Failed to initialize checkout:', error);
      alert('Failed to initialize checkout. Please try again.');
    } finally {
      setIsCreatingIntent(false);
    }
  };

  const handlePaymentNext = () => {
    setCurrentStep('review');
  };

  const handlePaymentBack = () => {
    setCurrentStep('shipping');
  };

  const handleReviewBack = () => {
    setCurrentStep('payment');
  };

  const handlePlaceOrder = async () => {
    if (!orderId || !paymentIntentId) {
      alert('Order information is missing. Please try again.');
      return;
    }

    try {
      // Order is already created and payment is confirmed
      // Just clear cart and redirect to confirmation
      clearCart();
      router.push(`/orders/${orderId}?success=true`);
    } catch (error) {
      console.error('Failed to complete order:', error);
      alert('Failed to complete order. Please try again.');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Checkout</h1>
        <p className="mt-2 text-muted-foreground">
          Complete your purchase in just a few steps
        </p>
      </div>

      {/* Progress Steps */}
      <CheckoutSteps currentStep={currentStep} />

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Forms */}
        <div className="lg:col-span-2">
          {currentStep === 'shipping' && (
            <ShippingForm
              onNext={handleShippingNext}
              initialData={shippingInfo || undefined}
            />
          )}

          {currentStep === 'payment' && (
            <>
              {isCreatingIntent || !clientSecret ? (
                <div className="flex min-h-[400px] items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                    <p className="mt-4 text-muted-foreground">
                      Initializing secure payment...
                    </p>
                  </div>
                </div>
              ) : (
                <StripeProvider clientSecret={clientSecret}>
                  <StripePaymentForm
                    onNext={handlePaymentNext}
                    onBack={handlePaymentBack}
                    clientSecret={clientSecret}
                  />
                </StripeProvider>
              )}
            </>
          )}

          {currentStep === 'review' && shippingInfo && (
            <OrderReview
              shippingInfo={shippingInfo}
              onBack={handleReviewBack}
              onPlaceOrder={handlePlaceOrder}
            />
          )}
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-4">
            <CartSummary showCheckoutButton={false} />
          </div>
        </div>
      </div>
    </div>
  );
}
