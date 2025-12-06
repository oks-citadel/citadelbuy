# BNPL Provider API Reference

Quick reference guide for all BNPL provider methods and their usage.

## Provider Interface

All BNPL providers implement the `BaseBnplProvider` interface with the following methods:

## 1. Eligibility Check

### Method
```typescript
checkEligibility(request: BnplEligibilityRequest): Promise<BnplEligibilityResponse>
```

### Request
```typescript
interface BnplEligibilityRequest {
  amount: number;
  currency: string;
  customerEmail?: string;
  shippingCountry?: string;
}
```

### Response
```typescript
interface BnplEligibilityResponse {
  eligible: boolean;
  minAmount: number;
  maxAmount: number;
  availableTerms: number[];
  message?: string;
  currency?: string;
}
```

### Usage
```typescript
const eligibility = await provider.checkEligibility({
  amount: 500.00,
  currency: 'USD',
  customerEmail: 'customer@example.com',
});

if (eligibility.eligible) {
  console.log(`Available terms: ${eligibility.availableTerms}`);
}
```

## 2. Create Session

### Method
```typescript
createSession(request: BnplSessionRequest): Promise<BnplSession>
```

### Request
```typescript
interface BnplSessionRequest {
  orderId: string;
  orderTotal: number;
  currency: string;
  items: BnplLineItem[];
  customer: BnplCustomer;
  billingAddress: BnplAddress;
  shippingAddress: BnplAddress;
  returnUrl: string;
  cancelUrl: string;
  numberOfInstallments?: number;
}
```

### Response
```typescript
interface BnplSession {
  provider: BnplProvider;
  sessionId: string;
  sessionToken?: string;
  redirectUrl: string;
  expiresAt: Date;
  clientToken?: string;
  paymentMethods?: string[];
}
```

### Usage
```typescript
const session = await provider.createSession({
  orderId: 'order_123',
  orderTotal: 500.00,
  currency: 'USD',
  items: [
    {
      name: 'Product 1',
      quantity: 2,
      unitPrice: 25000, // $250.00 in cents
      totalAmount: 50000,
    }
  ],
  customer: {
    email: 'customer@example.com',
    firstName: 'John',
    lastName: 'Doe',
  },
  billingAddress: {
    line1: '123 Main St',
    city: 'New York',
    state: 'NY',
    postalCode: '10001',
    country: 'US',
  },
  shippingAddress: {
    line1: '123 Main St',
    city: 'New York',
    state: 'NY',
    postalCode: '10001',
    country: 'US',
  },
  returnUrl: 'https://example.com/success',
  cancelUrl: 'https://example.com/cancel',
  numberOfInstallments: 4,
});

// Redirect user to provider checkout
window.location.href = session.redirectUrl;
```

## 3. Authorize Payment

### Method
```typescript
authorizePayment(sessionId: string, checkoutToken?: string): Promise<BnplAuthorizationResult>
```

### Response
```typescript
interface BnplAuthorizationResult {
  authorized: boolean;
  authorizationToken?: string;
  orderId?: string;
  providerOrderId?: string;
  errorMessage?: string;
  fraudResult?: {
    status: 'ACCEPTED' | 'PENDING' | 'REJECTED';
    score?: number;
  };
}
```

### Usage
```typescript
const result = await provider.authorizePayment(sessionId, checkoutToken);

if (result.authorized) {
  console.log(`Payment authorized: ${result.authorizationToken}`);
  console.log(`Fraud status: ${result.fraudResult?.status}`);
} else {
  console.error(`Authorization failed: ${result.errorMessage}`);
}
```

## 4. Capture Payment

### Method
```typescript
capturePayment(authorizationToken: string, amount?: number): Promise<BnplCaptureResult>
```

### Response
```typescript
interface BnplCaptureResult {
  captured: boolean;
  captureId?: string;
  amount?: number;
  errorMessage?: string;
}
```

### Usage
```typescript
// Full capture
const result = await provider.capturePayment(authorizationToken);

// Partial capture
const partialResult = await provider.capturePayment(authorizationToken, 250.00);

if (result.captured) {
  console.log(`Payment captured: ${result.captureId}`);
}
```

## 5. Process Refund

### Method
```typescript
processRefund(request: BnplRefundRequest): Promise<BnplRefundResult>
```

### Request
```typescript
interface BnplRefundRequest {
  providerOrderId: string;
  amount: number;
  currency?: string;
  reason?: string;
  orderId?: string;
}
```

### Response
```typescript
interface BnplRefundResult {
  refunded: boolean;
  refundId?: string;
  amount?: number;
  errorMessage?: string;
}
```

### Usage
```typescript
const result = await provider.processRefund({
  providerOrderId: 'provider_order_123',
  amount: 500.00,
  currency: 'USD',
  reason: 'Customer requested refund',
});

if (result.refunded) {
  console.log(`Refund processed: ${result.refundId}`);
}
```

## 6. Handle Webhook

### Method
```typescript
handleWebhook(payload: any, headers: Record<string, string>): Promise<BnplWebhookEvent>
```

### Response
```typescript
interface BnplWebhookEvent {
  eventType: string;
  provider: BnplProvider;
  providerOrderId: string;
  orderId?: string;
  status?: string;
  amount?: number;
  currency?: string;
  timestamp: Date;
  rawData: any;
}
```

### Usage
```typescript
const event = await provider.handleWebhook(webhookPayload, headers);

console.log(`Received ${event.eventType} for order ${event.providerOrderId}`);
console.log(`Status: ${event.status}`);
```

## 7. Verify Webhook Signature

### Method
```typescript
verifyWebhookSignature(payload: any, signature: string): boolean
```

### Usage
```typescript
const signature = headers['x-provider-signature'];
const isValid = provider.verifyWebhookSignature(payload, signature);

if (isValid) {
  // Process webhook
} else {
  throw new Error('Invalid webhook signature');
}
```

## 8. Cancel Order

### Method
```typescript
cancelOrder(orderId: string): Promise<{ success: boolean; message?: string }>
```

### Usage
```typescript
const result = await provider.cancelOrder('provider_order_123');

if (result.success) {
  console.log('Order cancelled successfully');
} else {
  console.error(`Cancellation failed: ${result.message}`);
}
```

## 9. Get Order Status

### Method
```typescript
getOrderStatus(orderId: string): Promise<OrderStatus>
```

### Response
```typescript
interface OrderStatus {
  status: string;
  amount?: number;
  currency?: string;
  paidAmount?: number;
  refundedAmount?: number;
}
```

### Usage
```typescript
const status = await provider.getOrderStatus('provider_order_123');

console.log(`Order status: ${status.status}`);
console.log(`Amount: ${status.amount}`);
console.log(`Paid: ${status.paidAmount}`);
console.log(`Refunded: ${status.refundedAmount}`);
```

## Provider-Specific Notes

### Klarna
- Uses Basic Authentication
- Requires order acknowledgment after authorization
- Returns HTML snippet for embedded checkout
- Webhook signature: HMAC-SHA256

### Affirm
- Uses Basic Authentication
- Supports multiple financing programs
- Checkout token required for authorization
- Flexible installment terms (3-36 months)

### Afterpay
- Uses Basic Authentication
- Immediate capture on authorization (capturePayment is a no-op)
- Simple 4-installment model
- Amount format: Decimal strings (e.g., "250.00")

## Status Mapping

All providers map their statuses to standardized values:

```typescript
enum StandardStatus {
  AUTHORIZED = 'AUTHORIZED',
  CAPTURED = 'CAPTURED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
  PENDING = 'PENDING',
  REJECTED = 'REJECTED',
}
```

## Error Handling

All methods can throw the following exceptions:

- `BadRequestException` - Invalid request parameters
- `HttpException` - Provider API errors
- `UnauthorizedException` - Invalid credentials

Always wrap provider calls in try-catch blocks:

```typescript
try {
  const result = await provider.createSession(request);
  // Handle success
} catch (error) {
  if (error instanceof BadRequestException) {
    // Handle bad request
  } else if (error instanceof HttpException) {
    // Handle API error
  }
}
```

## Testing

### Sandbox Environments

- **Klarna**: `https://api.playground.klarna.com`
- **Affirm**: `https://sandbox.affirm.com`
- **Afterpay**: `https://global-api-sandbox.afterpay.com`

### Test Credentials

Each provider offers test credentials in their developer documentation.

## Complete Example

```typescript
import { BnplProviderFactory } from './providers/bnpl-provider.factory';
import { BnplProvider } from '@prisma/client';

// Get provider instance
const factory = new BnplProviderFactory(configService, httpService);
const klarnaProvider = factory.getProvider(BnplProvider.KLARNA);

// Check eligibility
const eligibility = await klarnaProvider.checkEligibility({
  amount: 500.00,
  currency: 'USD',
});

if (eligibility.eligible) {
  // Create session
  const session = await klarnaProvider.createSession({
    orderId: 'order_123',
    orderTotal: 500.00,
    currency: 'USD',
    items: [...],
    customer: {...},
    billingAddress: {...},
    shippingAddress: {...},
    returnUrl: 'https://example.com/success',
    cancelUrl: 'https://example.com/cancel',
  });

  // Redirect user
  window.location.href = session.redirectUrl;

  // After user returns...
  const authResult = await klarnaProvider.authorizePayment(session.sessionId);

  if (authResult.authorized) {
    // Capture payment
    const captureResult = await klarnaProvider.capturePayment(
      authResult.authorizationToken
    );

    if (captureResult.captured) {
      // Order complete
      console.log('Payment successful!');
    }
  }
}
```
