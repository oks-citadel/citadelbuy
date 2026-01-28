/**
 * Example usage of StripePaymentForm component
 *
 * This file demonstrates how to integrate the Stripe payment form
 * into your checkout flow.
 */

'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import StripePaymentFormWrapper, { PaymentResult } from './StripePaymentForm';

/**
 * Example 1: Basic usage with minimal configuration
 */
export function BasicPaymentExample() {
  const handleSuccess = (result: PaymentResult) => {
    console.log('Payment successful:', result);
    toast.success('Payment completed successfully!');
  };

  const handleError = (error: string) => {
    console.error('Payment error:', error);
    toast.error(`Payment failed: ${error}`);
  };

  return (
    <div className="max-w-lg mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Complete Your Payment</h1>
      <StripePaymentFormWrapper
        amount={99.99}
        currency="USD"
        onSuccess={handleSuccess}
        onError={handleError}
      />
    </div>
  );
}

/**
 * Example 2: Full checkout integration with order details
 */
export function CheckoutPaymentExample() {
  const router = useRouter();
  const [isCompleted, setIsCompleted] = React.useState(false);

  const orderDetails = {
    orderId: 'ORD-12345',
    amount: 299.99,
    currency: 'USD',
    items: [
      { name: 'Product 1', quantity: 2, price: 149.99 },
    ],
  };

  const handleSuccess = (result: PaymentResult) => {
    console.log('Payment completed:', result);
    setIsCompleted(true);

    // Redirect to success page after a short delay
    setTimeout(() => {
      router.push(`/checkout/success?orderId=${orderDetails.orderId}&paymentId=${result.paymentIntentId}`);
    }, 2000);
  };

  const handleError = (error: string) => {
    toast.error('Payment failed', {
      description: error,
    });
  };

  if (isCompleted) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-green-600 mb-2">Payment Successful!</h2>
        <p className="text-muted-foreground">Redirecting to confirmation page...</p>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8">
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Order Summary */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
          <div className="space-y-3">
            {orderDetails.items.map((item, index) => (
              <div key={index} className="flex justify-between">
                <span>{item.name} (x{item.quantity})</span>
                <span>${item.price.toFixed(2)}</span>
              </div>
            ))}
            <div className="border-t pt-3 font-bold flex justify-between">
              <span>Total</span>
              <span>${orderDetails.amount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payment Form */}
        <div>
          <StripePaymentFormWrapper
            amount={orderDetails.amount}
            currency={orderDetails.currency}
            orderId={orderDetails.orderId}
            metadata={{
              customerEmail: 'customer@example.com',
              orderNumber: orderDetails.orderId,
            }}
            onSuccess={handleSuccess}
            onError={handleError}
            submitButtonText={`Pay $${orderDetails.amount.toFixed(2)}`}
            showCardholderName={true}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Example 3: Custom styled payment form
 */
export function CustomStyledPaymentExample() {
  return (
    <StripePaymentFormWrapper
      amount={149.99}
      currency="USD"
      onSuccess={(result) => console.log('Success:', result)}
      onError={(error) => console.error('Error:', error)}
      className="shadow-lg"
      stripeOptions={{
        appearance: {
          theme: 'night',
          variables: {
            colorPrimary: '#0ea5e9',
            colorBackground: '#1e293b',
            colorText: '#f1f5f9',
            colorDanger: '#f87171',
            borderRadius: '8px',
          },
        },
      }}
    />
  );
}

/**
 * Example 4: Payment with subscription
 */
export function SubscriptionPaymentExample() {
  const [selectedPlan, setSelectedPlan] = React.useState('pro');

  const plans = {
    basic: { name: 'Basic', price: 9.99 },
    pro: { name: 'Pro', price: 29.99 },
    enterprise: { name: 'Enterprise', price: 99.99 },
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Subscribe to {plans[selectedPlan as keyof typeof plans].name}</h1>

      {/* Plan selector */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {Object.entries(plans).map(([key, plan]) => (
          <button
            key={key}
            onClick={() => setSelectedPlan(key)}
            className={`p-4 border rounded-lg ${
              selectedPlan === key ? 'border-primary bg-primary/5' : 'border-gray-200'
            }`}
          >
            <div className="font-semibold">{plan.name}</div>
            <div className="text-2xl font-bold">${plan.price}</div>
            <div className="text-sm text-muted-foreground">/month</div>
          </button>
        ))}
      </div>

      <StripePaymentFormWrapper
        amount={plans[selectedPlan as keyof typeof plans].price}
        currency="USD"
        metadata={{
          subscriptionType: 'monthly',
          plan: selectedPlan,
        }}
        onSuccess={(result) => {
          toast.success('Subscription activated!');
          console.log('Subscription payment:', result);
        }}
        onError={(error) => {
          toast.error('Subscription failed', { description: error });
        }}
        submitButtonText={`Subscribe for $${plans[selectedPlan as keyof typeof plans].price}/mo`}
      />
    </div>
  );
}

/**
 * Example 5: Payment with loading state from parent
 */
export function PaymentWithExternalStateExample() {
  const [orderData, setOrderData] = React.useState<{
    amount: number;
    orderId: string;
  } | null>(null);

  React.useEffect(() => {
    // Simulate fetching order data
    const fetchOrderData = async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setOrderData({
        amount: 199.99,
        orderId: 'ORD-' + Date.now(),
      });
    };

    fetchOrderData();
  }, []);

  if (!orderData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-6">
      <StripePaymentFormWrapper
        amount={orderData.amount}
        orderId={orderData.orderId}
        onSuccess={(result) => console.log('Payment successful:', result)}
        onError={(error) => console.error('Payment error:', error)}
      />
    </div>
  );
}

export default BasicPaymentExample;
