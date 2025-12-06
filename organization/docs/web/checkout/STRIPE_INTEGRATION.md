# Stripe Payment Integration Guide

This guide explains how to use the `StripePaymentForm` component and set up the required backend integration.

## Components Overview

### 1. `StripePaymentFormWrapper` (Default Export)
The main component that includes the Stripe Elements provider. Use this for most cases.

### 2. `StripePaymentFormInternal`
The internal form component. Only use this if you're managing the Elements provider yourself.

### 3. `useStripeInstance` Hook
Access Stripe and Elements instances within the Elements provider context.

## Quick Start

### Prerequisites

1. **Install Dependencies** (already included in package.json):
   ```bash
   npm install @stripe/stripe-js @stripe/react-stripe-js
   ```

2. **Set Environment Variables**:
   ```env
   # .env.local
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

3. **Backend Setup** (see Backend Integration section below)

### Basic Usage

```tsx
import StripePaymentFormWrapper from '@/components/checkout/StripePaymentForm';

export default function CheckoutPage() {
  return (
    <StripePaymentFormWrapper
      amount={99.99}
      currency="USD"
      onSuccess={(result) => {
        console.log('Payment successful!', result);
      }}
      onError={(error) => {
        console.error('Payment failed:', error);
      }}
    />
  );
}
```

## Component Props

### Required Props

| Prop | Type | Description |
|------|------|-------------|
| `amount` | `number` | Payment amount in dollars (e.g., 99.99) |

### Optional Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `currency` | `string` | `'USD'` | Currency code (USD, EUR, GBP, etc.) |
| `orderId` | `string` | - | Order ID to associate with payment |
| `metadata` | `Record<string, string>` | - | Additional metadata to attach to payment |
| `onSuccess` | `(result: PaymentResult) => void` | - | Callback when payment succeeds |
| `onError` | `(error: string) => void` | - | Callback when payment fails |
| `submitButtonText` | `string` | `'Pay Now'` | Custom submit button text |
| `showCardholderName` | `boolean` | `true` | Show cardholder name input field |
| `className` | `string` | - | Additional CSS classes for the container |
| `stripeOptions` | `Partial<StripeElementsOptions>` | - | Custom Stripe Elements options |

## Features

### Security & PCI Compliance

- **No Card Data in State**: Card information never touches your React state or servers
- **Direct to Stripe**: All card data is sent directly to Stripe's servers
- **SSL Encryption**: All communications are encrypted with 256-bit SSL
- **PCI DSS Compliant**: Stripe handles all PCI compliance requirements
- **Tokenization**: Card data is tokenized by Stripe before any server communication

### User Experience

- **Real-time Validation**: Instant feedback on card number, expiry, and CVC
- **Error Handling**: Clear, user-friendly error messages
- **Loading States**: Proper loading indicators during processing
- **Success Animation**: Visual confirmation when payment succeeds
- **Responsive Design**: Works on all device sizes

### Developer Experience

- **TypeScript Support**: Full type safety with TypeScript
- **Flexible API**: Multiple callback options for success/error handling
- **Custom Styling**: Easy to customize appearance
- **Memoized Stripe**: Stripe instance is properly memoized to avoid recreating
- **Helper Utilities**: Includes utilities for amount formatting and currency handling

## Backend Integration

### Required API Endpoint

Create a backend endpoint to generate Stripe Payment Intents:

**Endpoint**: `POST /payments/create-intent`

**Request Body**:
```json
{
  "amount": 9999,        // Amount in cents
  "currency": "usd",
  "orderId": "ORD-123",
  "metadata": {
    "customerId": "CUST-456",
    "orderNumber": "ORD-123"
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "clientSecret": "pi_xxx_secret_xxx"
  }
}
```

### Node.js/Express Example

```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

app.post('/payments/create-intent', async (req, res) => {
  try {
    const { amount, currency, orderId, metadata } = req.body;

    // Validate amount
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount'
      });
    }

    // Create Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount, // Already in cents from frontend
      currency: currency.toLowerCase(),
      metadata: {
        orderId: orderId || '',
        ...metadata
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret
      }
    });
  } catch (error) {
    console.error('Payment intent creation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create payment intent'
    });
  }
});
```

### NestJS Example

```typescript
import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class PaymentService {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });
  }

  async createPaymentIntent(data: {
    amount: number;
    currency: string;
    orderId?: string;
    metadata?: Record<string, string>;
  }) {
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: data.amount,
      currency: data.currency.toLowerCase(),
      metadata: {
        orderId: data.orderId || '',
        ...data.metadata,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
    };
  }
}
```

## Advanced Usage

### Custom Styling

```tsx
<StripePaymentFormWrapper
  amount={99.99}
  stripeOptions={{
    appearance: {
      theme: 'stripe', // or 'night', 'flat'
      variables: {
        colorPrimary: '#0ea5e9',
        colorBackground: '#ffffff',
        colorText: '#1a1a1a',
        colorDanger: '#ef4444',
        fontFamily: 'Inter, system-ui, sans-serif',
        borderRadius: '8px',
      },
    },
  }}
/>
```

### With Order Context

```tsx
const orderData = {
  orderId: 'ORD-12345',
  amount: 299.99,
  customerEmail: 'customer@example.com',
};

<StripePaymentFormWrapper
  amount={orderData.amount}
  orderId={orderData.orderId}
  metadata={{
    customerEmail: orderData.customerEmail,
    orderNumber: orderData.orderId,
  }}
  onSuccess={async (result) => {
    // Update order status in database
    await updateOrderStatus(orderData.orderId, 'paid');

    // Send confirmation email
    await sendConfirmationEmail(orderData.customerEmail);

    // Redirect to success page
    router.push(`/orders/${orderData.orderId}/success`);
  }}
  onError={(error) => {
    // Log error for debugging
    logPaymentError({
      orderId: orderData.orderId,
      error,
      timestamp: new Date(),
    });

    // Show user-friendly message
    toast.error('Payment failed. Please try again.');
  }}
  submitButtonText={`Pay $${orderData.amount.toFixed(2)}`}
/>
```

### Using the Hook

```tsx
import { useStripeInstance } from '@/components/checkout/StripePaymentForm';

function CustomPaymentComponent() {
  const { stripe, elements, isReady } = useStripeInstance();

  const handleCustomPayment = async () => {
    if (!isReady) return;

    // Your custom Stripe logic here
    const cardElement = elements.getElement(CardElement);
    // ...
  };

  return (
    <div>
      <button disabled={!isReady} onClick={handleCustomPayment}>
        Custom Payment
      </button>
    </div>
  );
}
```

## Testing

### Test Card Numbers

Stripe provides test card numbers for development:

| Card Number | Scenario |
|------------|----------|
| `4242 4242 4242 4242` | Success |
| `4000 0000 0000 9995` | Decline (insufficient funds) |
| `4000 0000 0000 0069` | Decline (expired card) |
| `4000 0000 0000 0341` | Decline (incorrect CVC) |

**Expiry**: Use any future date (e.g., 12/25)
**CVC**: Use any 3 digits (e.g., 123)
**ZIP**: Use any 5 digits (e.g., 12345)

### Test in Development

1. Use test publishable key: `pk_test_...`
2. Use test secret key on backend: `sk_test_...`
3. View test payments in Stripe Dashboard (test mode)

## Webhook Integration (Recommended)

For production, implement webhook handlers to track payment events:

```javascript
app.post('/webhooks/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      // Update order status, send confirmation email, etc.
      await handleSuccessfulPayment(paymentIntent);
      break;

    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      // Log failure, notify customer, etc.
      await handleFailedPayment(failedPayment);
      break;
  }

  res.json({ received: true });
});
```

## Utility Functions

### Format Amount for Stripe

```tsx
import { formatAmountForStripe } from '@/components/checkout/StripePaymentForm';

const amountInCents = formatAmountForStripe(99.99, 'USD'); // 9999
const amountInYen = formatAmountForStripe(1000, 'JPY');    // 1000 (zero-decimal)
```

### Format Amount from Stripe

```tsx
import { formatAmountFromStripe } from '@/components/checkout/StripePaymentForm';

const amountInDollars = formatAmountFromStripe(9999, 'USD'); // 99.99
const amountInYen = formatAmountFromStripe(1000, 'JPY');     // 1000 (zero-decimal)
```

## Troubleshooting

### Common Issues

**"Stripe has not been loaded yet"**
- Ensure you're using `StripePaymentFormWrapper` (not the internal component)
- Check that your publishable key is set in environment variables

**"Failed to create payment intent"**
- Verify backend endpoint is running and accessible
- Check that your Stripe secret key is valid
- Ensure CORS is configured if API is on different domain

**"Card validation errors"**
- Make sure you're using test cards in development
- Check that the card number is 16 digits
- Verify expiry is in the future (MM/YY format)

## Environment Variables

Required environment variables:

```bash
# Frontend (.env.local)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...  # Or pk_live_... for production

# Backend
STRIPE_SECRET_KEY=sk_test_...                    # Or sk_live_... for production
STRIPE_WEBHOOK_SECRET=whsec_...                  # For webhook verification
```

## Security Best Practices

1. **Never expose secret keys**: Only use publishable keys on frontend
2. **Validate on backend**: Always validate amount and order on server
3. **Use HTTPS**: Always use HTTPS in production
4. **Implement webhooks**: Don't rely solely on client-side success callbacks
5. **Rate limiting**: Implement rate limiting on payment endpoints
6. **Audit logging**: Log all payment attempts for security auditing

## Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe React Library](https://stripe.com/docs/stripe-js/react)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [PCI Compliance](https://stripe.com/docs/security/guide)

## Support

For issues or questions:
- Check the example file: `StripePaymentForm.example.tsx`
- Review Stripe's official documentation
- Contact your development team
