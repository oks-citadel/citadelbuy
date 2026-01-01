# Payment Flow and Error Handling

This document details the complete payment processing flow, state transitions, error handling, and recovery strategies for Broxiva.

## Table of Contents

- [Payment Flow Overview](#payment-flow-overview)
- [Standard Checkout Flow](#standard-checkout-flow)
- [Express Checkout Flow](#express-checkout-flow)
- [Guest Checkout Flow](#guest-checkout-flow)
- [Payment State Machine](#payment-state-machine)
- [Error Handling](#error-handling)
- [Refund Processing](#refund-processing)
- [Dispute Handling](#dispute-handling)
- [Recovery Strategies](#recovery-strategies)

---

## Payment Flow Overview

Broxiva supports multiple payment flows to accommodate different customer preferences and scenarios.

### Payment Methods Supported

1. **Credit/Debit Cards** (via Stripe)
   - Visa, Mastercard, American Express, Discover
   - 3D Secure (SCA) for European customers
   - Saved cards for returning customers

2. **PayPal** (optional)
   - PayPal account balance
   - Credit/debit cards via PayPal
   - PayPal Credit

3. **Digital Wallets** (via Stripe)
   - Apple Pay (iOS/Safari)
   - Google Pay (Android/Chrome)

### Flow Types

```
┌─────────────────────────────────────────┐
│         Payment Flow Types              │
├─────────────────────────────────────────┤
│  1. Standard Checkout                   │
│     - Full checkout form                │
│     - New payment method                │
│     - Guest or logged-in user           │
│                                         │
│  2. Express Checkout                    │
│     - One-click purchase                │
│     - Saved payment method              │
│     - Logged-in users only              │
│                                         │
│  3. Guest Checkout                      │
│     - No account required               │
│     - Email for order tracking          │
│     - One-time payment                  │
└─────────────────────────────────────────┘
```

---

## Standard Checkout Flow

The standard flow for processing card payments using Stripe.

### Flow Diagram

```
┌──────────────┐
│   Customer   │
│  Adds Items  │
│   to Cart    │
└──────┬───────┘
       │
       v
┌──────────────┐
│   Proceeds   │
│  to Checkout │
└──────┬───────┘
       │
       v
┌──────────────────────────────────────┐
│  Initialize Checkout Session         │
│  GET /api/checkout/initialize        │
│  - Load cart items                   │
│  - Calculate totals                  │
│  - Get saved addresses               │
│  - Get saved payment methods         │
└──────┬───────────────────────────────┘
       │
       v
┌──────────────────────────────────────┐
│  Customer Enters/Selects             │
│  - Shipping address                  │
│  - Billing address (optional)        │
│  - Payment method                    │
│  - Applies coupon (optional)         │
└──────┬───────────────────────────────┘
       │
       v
┌──────────────────────────────────────┐
│  Create Payment Intent               │
│  POST /api/payments/create-intent    │
│  - Amount: calculated total          │
│  - Currency: USD                     │
│  - Metadata: orderId, userId         │
│  → Returns: clientSecret             │
└──────┬───────────────────────────────┘
       │
       v
┌──────────────────────────────────────┐
│  Customer Submits Payment            │
│  (Frontend - Stripe Elements)        │
│  - Card details entered              │
│  - stripe.confirmCardPayment()       │
│  - 3D Secure if required             │
└──────┬───────────────────────────────┘
       │
       v
┌──────────────────────────────────────┐
│  Stripe Processes Payment            │
│  - Validates card                    │
│  - Checks for fraud                  │
│  - Performs 3DS if needed            │
└──────┬───────────────────────────────┘
       │
       ├─ Success ──────────────────────┐
       │                                │
       │                                v
       │                    ┌───────────────────┐
       │                    │  Payment Success  │
       │                    │  (Client-side)    │
       │                    └─────────┬─────────┘
       │                              │
       │                              v
       │                    ┌───────────────────┐
       │                    │  Webhook Received │
       │                    │  payment_intent   │
       │                    │    .succeeded     │
       │                    └─────────┬─────────┘
       │                              │
       │                              v
       │                    ┌───────────────────┐
       │                    │  Update Order     │
       │                    │  Status:          │
       │                    │  PROCESSING       │
       │                    └─────────┬─────────┘
       │                              │
       │                              v
       │                    ┌───────────────────┐
       │                    │  Send Email       │
       │                    │  Confirmation     │
       │                    └─────────┬─────────┘
       │                              │
       │                              v
       │                    ┌───────────────────┐
       │                    │  Reduce Inventory │
       │                    └─────────┬─────────┘
       │                              │
       │                              v
       │                    ┌───────────────────┐
       │                    │  Clear Cart       │
       │                    └─────────┬─────────┘
       │                              │
       │                              v
       │                    ┌───────────────────┐
       │                    │  Redirect to      │
       │                    │  Order Success    │
       │                    └───────────────────┘
       │
       └─ Failure ──────────────────┐
                                    │
                                    v
                          ┌─────────────────┐
                          │  Payment Failed │
                          │  (Client-side)  │
                          └────────┬────────┘
                                   │
                                   v
                          ┌─────────────────┐
                          │  Display Error  │
                          │  to Customer    │
                          └────────┬────────┘
                                   │
                                   v
                          ┌─────────────────┐
                          │  Webhook:       │
                          │  payment_intent │
                          │  .failed        │
                          └────────┬────────┘
                                   │
                                   v
                          ┌─────────────────┐
                          │  Log Failure    │
                          │  Keep Order     │
                          │  Status: PENDING│
                          └────────┬────────┘
                                   │
                                   v
                          ┌─────────────────┐
                          │  Customer Can   │
                          │  Retry Payment  │
                          └─────────────────┘
```

### API Endpoints

#### 1. Initialize Checkout

**Request**:
```http
GET /api/checkout/initialize?cartId=cart_123&couponCode=SAVE10
```

**Response**:
```json
{
  "items": [
    {
      "productId": "prod_123",
      "name": "Product Name",
      "quantity": 2,
      "price": 29.99,
      "image": "https://..."
    }
  ],
  "subtotal": 59.98,
  "discount": 6.00,
  "shipping": 5.00,
  "tax": 4.80,
  "total": 63.78,
  "addresses": [...],
  "paymentMethods": [...],
  "coupon": {
    "applied": true,
    "code": "SAVE10",
    "discount": 6.00
  }
}
```

#### 2. Create Payment Intent

**Request**:
```http
POST /api/payments/create-intent
Content-Type: application/json

{
  "amount": 63.78,
  "currency": "usd",
  "orderId": "order_123",
  "metadata": {
    "userId": "user_456",
    "cartId": "cart_789"
  }
}
```

**Response**:
```json
{
  "clientSecret": "pi_xxx_secret_yyy",
  "paymentIntentId": "pi_1234567890"
}
```

#### 3. Confirm Payment (Frontend)

```typescript
// Frontend code using Stripe.js
const { error, paymentIntent } = await stripe.confirmCardPayment(
  clientSecret,
  {
    payment_method: {
      card: cardElement,
      billing_details: {
        name: cardholderName,
        email: customerEmail,
      },
    },
  }
);

if (error) {
  // Display error to customer
  console.error(error.message);
} else if (paymentIntent.status === 'succeeded') {
  // Payment succeeded!
  window.location.href = `/order-confirmation/${orderId}`;
}
```

---

## Express Checkout Flow

One-click checkout for returning customers with saved payment methods.

### Prerequisites

- User must be logged in
- User must have saved payment method
- User must have saved shipping address

### Flow Diagram

```
┌──────────────┐
│   Customer   │
│  Logged In   │
└──────┬───────┘
       │
       v
┌──────────────────────────────────────┐
│  Click "Buy Now" or                  │
│  "Express Checkout"                  │
└──────┬───────────────────────────────┘
       │
       v
┌──────────────────────────────────────┐
│  POST /api/checkout/express          │
│  {                                   │
│    cartId: "cart_123",               │
│    paymentMethodId: "pm_xxx",        │
│    shippingAddressId: "addr_yyy"     │
│  }                                   │
└──────┬───────────────────────────────┘
       │
       v
┌──────────────────────────────────────┐
│  Backend Processes:                  │
│  1. Validate user & payment method   │
│  2. Create order                     │
│  3. Create & confirm payment intent  │
│  4. Update order status              │
│  5. Send confirmation email          │
└──────┬───────────────────────────────┘
       │
       ├─ Success ──────────────────────┐
       │                                │
       │                                v
       │                    ┌───────────────────┐
       │                    │  Return Success   │
       │                    │  {                │
       │                    │    orderId,       │
       │                    │    status: "OK"   │
       │                    │  }                │
       │                    └─────────┬─────────┘
       │                              │
       │                              v
       │                    ┌───────────────────┐
       │                    │  Redirect to      │
       │                    │  Order Success    │
       │                    └───────────────────┘
       │
       └─ Failure ──────────────────┐
                                    │
                                    v
                          ┌─────────────────┐
                          │  Return Error   │
                          │  {              │
                          │    error: "..." │
                          │  }              │
                          └────────┬────────┘
                                   │
                                   v
                          ┌─────────────────┐
                          │  Display Error  │
                          │  Offer Standard │
                          │  Checkout       │
                          └─────────────────┘
```

### API Endpoint

**Request**:
```http
POST /api/checkout/express
Content-Type: application/json
Authorization: Bearer <jwt_token>

{
  "cartId": "cart_123",
  "paymentMethodId": "pm_1234567890",
  "shippingAddressId": "addr_1234567890",
  "couponCode": "SAVE10"
}
```

**Response (Success)**:
```json
{
  "success": true,
  "orderId": "order_1234567890",
  "paymentStatus": "succeeded",
  "total": 63.78,
  "discount": 6.00
}
```

**Response (Failure)**:
```json
{
  "success": false,
  "error": "Payment failed. Please try again.",
  "code": "payment_declined"
}
```

---

## Guest Checkout Flow

Allows customers to checkout without creating an account.

### Flow Diagram

```
┌──────────────┐
│   Customer   │
│  (No Account)│
└──────┬───────┘
       │
       v
┌──────────────────────────────────────┐
│  Proceeds to Checkout                │
│  (Not logged in)                     │
└──────┬───────────────────────────────┘
       │
       v
┌──────────────────────────────────────┐
│  Customer Enters:                    │
│  - Email address                     │
│  - Shipping address                  │
│  - Billing address (optional)        │
│  - Payment details                   │
└──────┬───────────────────────────────┘
       │
       v
┌──────────────────────────────────────┐
│  POST /api/checkout/guest            │
│  {                                   │
│    items: [...],                     │
│    guestEmail: "...",                │
│    shippingAddress: {...},           │
│    billingAddress: {...}             │
│  }                                   │
└──────┬───────────────────────────────┘
       │
       v
┌──────────────────────────────────────┐
│  Backend:                            │
│  1. Validate items & calculate total │
│  2. Create guest order               │
│  3. Create payment intent            │
│  4. Return client secret             │
└──────┬───────────────────────────────┘
       │
       v
┌──────────────────────────────────────┐
│  Customer Confirms Payment           │
│  (Frontend - Stripe Elements)        │
└──────┬───────────────────────────────┘
       │
       v
┌──────────────────────────────────────┐
│  Payment Processing                  │
│  (Same as Standard Checkout)         │
└──────┬───────────────────────────────┘
       │
       v
┌──────────────────────────────────────┐
│  Order Confirmation                  │
│  - Email sent to guest email         │
│  - Order tracking link provided      │
│  - Option to create account          │
└───────────────────────────────────────┘
```

### API Endpoint

**Request**:
```http
POST /api/checkout/guest
Content-Type: application/json

{
  "items": [
    {
      "productId": "prod_123",
      "quantity": 2,
      "price": 29.99
    }
  ],
  "guestEmail": "customer@example.com",
  "shippingAddress": {
    "fullName": "John Doe",
    "email": "customer@example.com",
    "phone": "+1234567890",
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "postalCode": "10001",
    "country": "US"
  },
  "couponCode": "WELCOME10"
}
```

**Response**:
```json
{
  "orderId": "order_guest_1234567890",
  "clientSecret": "pi_xxx_secret_yyy",
  "paymentIntentId": "pi_1234567890",
  "total": 63.78,
  "subtotal": 59.98,
  "tax": 4.80,
  "shipping": 5.00,
  "discount": 6.00
}
```

---

## Payment State Machine

Order and payment status transitions.

### Order States

```
                    ┌─────────┐
                    │ PENDING │
                    └────┬────┘
                         │
                         │ Payment Intent Created
                         v
                ┌────────────────┐
                │  AWAITING_     │
                │   PAYMENT      │
                └────┬───────────┘
                     │
         ┌───────────┼───────────┐
         │           │           │
         │ Payment   │ Payment   │ Payment
         │ Succeeded │ Failed    │ Canceled
         │           │           │
         v           v           v
    ┌──────────┐ ┌────────┐ ┌──────────┐
    │PROCESSING│ │PAYMENT_│ │ CANCELED │
    │          │ │ FAILED │ │          │
    └────┬─────┘ └───┬────┘ └──────────┘
         │           │
         │           │ Retry Payment
         │           └───────────────┐
         │                           │
         │ Fulfillment              │
         v                           v
    ┌──────────┐              ┌─────────┐
    │ SHIPPED  │              │ PENDING │
    └────┬─────┘              └─────────┘
         │
         │ Delivered
         v
    ┌──────────┐
    │DELIVERED │
    └────┬─────┘
         │
         ├─ Refund Requested ──┐
         │                     │
         │                     v
         │              ┌──────────┐
         │              │ REFUNDED │
         │              └──────────┘
         │
         └─ Dispute Filed ──────┐
                                │
                                v
                         ┌──────────┐
                         │ DISPUTED │
                         └──────────┘
```

### State Descriptions

| State | Description | Next States |
|-------|-------------|-------------|
| `PENDING` | Order created, awaiting payment | `AWAITING_PAYMENT` |
| `AWAITING_PAYMENT` | Payment intent created | `PROCESSING`, `PAYMENT_FAILED`, `CANCELED` |
| `PROCESSING` | Payment successful, preparing order | `SHIPPED` |
| `PAYMENT_FAILED` | Payment attempt failed | `PENDING` (retry), `CANCELED` |
| `CANCELED` | Order canceled by customer or system | N/A (terminal) |
| `SHIPPED` | Order shipped to customer | `DELIVERED`, `REFUNDED` |
| `DELIVERED` | Order delivered | `REFUNDED`, `DISPUTED` |
| `REFUNDED` | Payment refunded to customer | N/A (terminal) |
| `DISPUTED` | Customer disputed charge | N/A (requires resolution) |

### State Transitions Code

```typescript
// File: apps/api/src/modules/orders/orders.service.ts

export class OrdersService {
  async updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    metadata?: Record<string, any>
  ): Promise<Order> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Validate state transition
    this.validateStateTransition(order.status, newStatus);

    // Update order
    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: newStatus,
        ...metadata,
        updatedAt: new Date(),
      },
    });

    // Trigger side effects
    await this.handleStateChange(updated, order.status, newStatus);

    return updated;
  }

  private validateStateTransition(
    currentStatus: OrderStatus,
    newStatus: OrderStatus
  ): void {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      PENDING: ['AWAITING_PAYMENT', 'CANCELED'],
      AWAITING_PAYMENT: ['PROCESSING', 'PAYMENT_FAILED', 'CANCELED'],
      PROCESSING: ['SHIPPED', 'CANCELED'],
      PAYMENT_FAILED: ['PENDING', 'CANCELED'],
      SHIPPED: ['DELIVERED', 'REFUNDED'],
      DELIVERED: ['REFUNDED', 'DISPUTED'],
      CANCELED: [],
      REFUNDED: [],
      DISPUTED: [],
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid state transition: ${currentStatus} -> ${newStatus}`
      );
    }
  }

  private async handleStateChange(
    order: Order,
    oldStatus: OrderStatus,
    newStatus: OrderStatus
  ): Promise<void> {
    // Send notifications
    switch (newStatus) {
      case 'PROCESSING':
        await this.emailService.sendOrderConfirmation(order);
        await this.inventoryService.reserveStock(order);
        break;

      case 'SHIPPED':
        await this.emailService.sendShippingConfirmation(order);
        break;

      case 'DELIVERED':
        await this.emailService.sendDeliveryConfirmation(order);
        break;

      case 'REFUNDED':
        await this.emailService.sendRefundConfirmation(order);
        await this.inventoryService.restoreStock(order);
        break;

      case 'PAYMENT_FAILED':
        await this.emailService.sendPaymentFailedNotification(order);
        break;
    }
  }
}
```

---

## Error Handling

Comprehensive error handling for payment processing.

### Error Categories

1. **Validation Errors** - Invalid input data
2. **Card Errors** - Card declined, insufficient funds, etc.
3. **Network Errors** - API timeouts, connection issues
4. **Server Errors** - Internal server errors
5. **Fraud Errors** - Suspected fraudulent transaction

### Error Response Format

```typescript
interface PaymentError {
  code: string;
  message: string;
  type: 'validation' | 'card_error' | 'network' | 'server' | 'fraud';
  details?: Record<string, any>;
  retryable: boolean;
}
```

### Common Errors

#### Card Declined

```json
{
  "code": "card_declined",
  "message": "Your card was declined. Please try a different payment method.",
  "type": "card_error",
  "retryable": true,
  "details": {
    "declineCode": "generic_decline",
    "suggestedAction": "try_different_card"
  }
}
```

#### Insufficient Funds

```json
{
  "code": "insufficient_funds",
  "message": "Your card has insufficient funds.",
  "type": "card_error",
  "retryable": true,
  "details": {
    "declineCode": "insufficient_funds",
    "suggestedAction": "try_different_card"
  }
}
```

#### Expired Card

```json
{
  "code": "expired_card",
  "message": "Your card has expired.",
  "type": "card_error",
  "retryable": true,
  "details": {
    "declineCode": "expired_card",
    "suggestedAction": "update_card"
  }
}
```

#### Network Timeout

```json
{
  "code": "network_timeout",
  "message": "The request timed out. Please try again.",
  "type": "network",
  "retryable": true
}
```

#### Fraud Suspected

```json
{
  "code": "fraud_suspected",
  "message": "This transaction has been flagged for review.",
  "type": "fraud",
  "retryable": false,
  "details": {
    "reason": "high_risk_score",
    "action": "manual_review"
  }
}
```

### Error Handling Implementation

```typescript
// Frontend error handling
try {
  const { error, paymentIntent } = await stripe.confirmCardPayment(
    clientSecret,
    paymentMethodData
  );

  if (error) {
    handlePaymentError(error);
  } else if (paymentIntent.status === 'succeeded') {
    handlePaymentSuccess(paymentIntent);
  }
} catch (error) {
  handleUnexpectedError(error);
}

function handlePaymentError(error: StripeError) {
  const errorMap: Record<string, string> = {
    card_declined: 'Your card was declined. Please try another card.',
    insufficient_funds: 'Your card has insufficient funds.',
    expired_card: 'Your card has expired. Please use a different card.',
    incorrect_cvc: 'The security code is incorrect.',
    processing_error: 'An error occurred while processing your card. Please try again.',
    rate_limit: 'Too many requests. Please wait a moment and try again.',
  };

  const message = errorMap[error.code] || error.message || 'An unexpected error occurred.';

  // Display error to user
  showErrorMessage(message);

  // Log error for debugging
  logError('payment_failed', {
    errorCode: error.code,
    errorType: error.type,
    message: error.message,
  });

  // Show retry button if retryable
  if (isRetryable(error.code)) {
    showRetryButton();
  }
}

function isRetryable(errorCode: string): boolean {
  const retryableCodes = [
    'card_declined',
    'insufficient_funds',
    'processing_error',
    'network_error',
  ];
  return retryableCodes.includes(errorCode);
}
```

### Backend Error Handling

```typescript
// apps/api/src/modules/payments/payments.controller.ts

@Post('create-intent')
async createPaymentIntent(@Body() dto: CreatePaymentIntentDto) {
  try {
    return await this.paymentsService.createPaymentIntent(
      dto.amount,
      dto.currency,
      dto.metadata
    );
  } catch (error) {
    this.logger.error('Payment intent creation failed', error);

    if (error instanceof Stripe.errors.StripeError) {
      throw new BadRequestException({
        code: error.code,
        message: this.getUserFriendlyMessage(error),
        type: error.type,
      });
    }

    throw new InternalServerErrorException({
      code: 'internal_error',
      message: 'An unexpected error occurred. Please try again.',
    });
  }
}

private getUserFriendlyMessage(error: Stripe.errors.StripeError): string {
  const messages: Record<string, string> = {
    card_declined: 'Your payment was declined. Please try a different card.',
    insufficient_funds: 'Your card has insufficient funds.',
    invalid_request_error: 'Invalid payment request. Please refresh and try again.',
    api_error: 'Payment service temporarily unavailable. Please try again.',
  };

  return messages[error.type] || 'An error occurred while processing your payment.';
}
```

---

## Refund Processing

### Refund Types

1. **Full Refund** - Entire order amount
2. **Partial Refund** - Specific items or amount
3. **Automatic Refund** - Triggered by system (e.g., out of stock)
4. **Manual Refund** - Initiated by admin

### Refund Flow

```
┌──────────────┐
│   Refund     │
│   Request    │
└──────┬───────┘
       │
       v
┌──────────────────────────────────────┐
│  Validate Refund Request             │
│  - Order exists                      │
│  - Payment method supports refund    │
│  - Amount valid                      │
│  - Not already refunded              │
└──────┬───────────────────────────────┘
       │
       v
┌──────────────────────────────────────┐
│  Process Refund via Payment Gateway  │
│  - Stripe: stripe.refunds.create()   │
│  - PayPal: PayPal refund API         │
└──────┬───────────────────────────────┘
       │
       ├─ Success ──────────────────────┐
       │                                │
       │                                v
       │                    ┌───────────────────┐
       │                    │  Update Order     │
       │                    │  Status: REFUNDED │
       │                    └─────────┬─────────┘
       │                              │
       │                              v
       │                    ┌───────────────────┐
       │                    │  Restore Inventory│
       │                    └─────────┬─────────┘
       │                              │
       │                              v
       │                    ┌───────────────────┐
       │                    │  Send Refund      │
       │                    │  Confirmation     │
       │                    └─────────┬─────────┘
       │                              │
       │                              v
       │                    ┌───────────────────┐
       │                    │  Log Refund       │
       │                    └───────────────────┘
       │
       └─ Failure ──────────────────┐
                                    │
                                    v
                          ┌─────────────────┐
                          │  Log Error      │
                          │  Alert Admin    │
                          │  Retry Later    │
                          └─────────────────┘
```

### API Endpoint

**Request**:
```http
POST /api/refunds
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "orderId": "order_1234567890",
  "amount": 63.78,
  "reason": "requested_by_customer",
  "items": [
    {
      "orderItemId": "item_123",
      "quantity": 1,
      "reason": "defective"
    }
  ]
}
```

**Response**:
```json
{
  "refundId": "re_1234567890",
  "status": "succeeded",
  "amount": 63.78,
  "currency": "usd",
  "expectedArrival": "2024-01-20"
}
```

### Refund Implementation

```typescript
// apps/api/src/modules/refunds/refunds.service.ts

export class RefundsService {
  async processRefund(
    orderId: string,
    amount: number,
    reason: string
  ): Promise<RefundResult> {
    // Get order
    const order = await this.ordersService.findOne(orderId);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Validate refund
    this.validateRefund(order, amount);

    try {
      // Process refund based on payment method
      let refund;
      if (order.paymentMethod === 'STRIPE') {
        refund = await this.paymentsService.createStripeRefund(
          order.paymentIntentId,
          amount,
          reason as any,
          { orderId }
        );
      } else if (order.paymentMethod === 'PAYPAL') {
        refund = await this.paymentsService.createPayPalRefund(
          order.paypalCaptureId,
          amount,
          order.currency,
          reason
        );
      }

      // Update order status
      await this.ordersService.updateOrderStatus(orderId, 'REFUNDED', {
        refundId: refund.refundId,
        refundAmount: refund.amount,
        refundedAt: new Date(),
      });

      // Restore inventory
      await this.inventoryService.restoreStock(order);

      // Send notification
      await this.emailService.sendRefundConfirmation(order, refund);

      return refund;
    } catch (error) {
      this.logger.error('Refund processing failed', error);
      throw new InternalServerErrorException('Failed to process refund');
    }
  }

  private validateRefund(order: Order, amount: number): void {
    // Check if already refunded
    if (order.status === 'REFUNDED') {
      throw new BadRequestException('Order already refunded');
    }

    // Check amount
    if (amount > order.total) {
      throw new BadRequestException('Refund amount exceeds order total');
    }

    // Check refund window (e.g., 30 days)
    const refundDeadline = new Date(order.createdAt);
    refundDeadline.setDate(refundDeadline.getDate() + 30);

    if (new Date() > refundDeadline) {
      throw new BadRequestException('Refund window has expired');
    }
  }
}
```

---

## Dispute Handling

When a customer disputes a charge (chargeback).

### Dispute Flow

```
┌──────────────┐
│   Customer   │
│   Files      │
│   Dispute    │
└──────┬───────┘
       │
       v
┌──────────────────────────────────────┐
│  Payment Provider Notifies via       │
│  Webhook: charge.dispute.created     │
└──────┬───────────────────────────────┘
       │
       v
┌──────────────────────────────────────┐
│  System:                             │
│  - Update order status: DISPUTED     │
│  - Alert admin team                  │
│  - Lock order                        │
│  - Gather evidence                   │
└──────┬───────────────────────────────┘
       │
       v
┌──────────────────────────────────────┐
│  Admin Reviews Dispute               │
│  - Check order details               │
│  - Verify delivery                   │
│  - Prepare evidence                  │
└──────┬───────────────────────────────┘
       │
       v
┌──────────────────────────────────────┐
│  Submit Evidence to Payment Provider │
│  - Delivery confirmation             │
│  - Customer communication            │
│  - Product description               │
│  - Refund/return policy              │
└──────┬───────────────────────────────┘
       │
       v
┌──────────────────────────────────────┐
│  Payment Provider Reviews            │
│  - 7-14 day review period            │
│  - Decision: Won or Lost             │
└──────┬───────────────────────────────┘
       │
       ├─ Won ──────────────────────────┐
       │                                │
       │                                v
       │                    ┌───────────────────┐
       │                    │  Funds Returned   │
       │                    │  Update Order     │
       │                    │  Status: DELIVERED│
       │                    └───────────────────┘
       │
       └─ Lost ──────────────────────┐
                                     │
                                     v
                           ┌─────────────────┐
                           │  Funds Debited  │
                           │  Update Order   │
                           │  Status: REFUNDED│
                           └─────────────────┘
```

### Evidence Collection

```typescript
interface DisputeEvidence {
  // Product information
  productDescription: string;

  // Shipping proof
  shippingCarrier: string;
  trackingNumber: string;
  shippingDate: Date;
  deliveryDate?: Date;

  // Customer communication
  customerEmails: string[];
  customerSignature?: string;

  // Receipts
  receipt: string;

  // Policies
  refundPolicy: string;
  cancellationPolicy: string;
}
```

---

## Recovery Strategies

### Failed Payment Recovery

1. **Immediate Retry** - Some errors are temporary
2. **Alternative Payment Method** - Suggest trying different card
3. **Email Reminder** - Send cart recovery email
4. **Discount Code** - Incentivize completion

### Cart Abandonment Recovery

```typescript
// Trigger: User leaves checkout without completing
// Wait: 30 minutes
// Action: Send recovery email with 10% discount code

await this.emailService.sendCartAbandonmentEmail({
  to: user.email,
  cartItems: cart.items,
  recoveryCode: 'COMPLETE10',
  recoveryLink: `https://broxiva.com/checkout?cart=${cart.id}&code=COMPLETE10`
});
```

---

**Last Updated**: December 2024
**Version**: 1.0
**Maintained by**: Broxiva Development Team
