# BNPL (Buy Now Pay Later) Module

Complete implementation of Buy Now Pay Later functionality supporting multiple providers.

## Supported Providers

### 1. Klarna
- **Terms**: 4 installments (Pay in 4)
- **Interest**: 0% APR
- **Order Limits**: $35 - $10,000
- **Features**: Pay later, Pay over time

### 2. Affirm
- **Terms**: 3, 6, 12, 18, 24, 36 months
- **Interest**: 0-30% APR (configurable)
- **Order Limits**: $50 - $30,000
- **Features**: Flexible financing programs

### 3. Afterpay
- **Terms**: 4 installments (Pay in 4)
- **Interest**: 0% APR
- **Order Limits**: $1 - $2,000
- **Features**: Instant approval, No interest

## Architecture

### Provider Integration
```
BnplProviderFactory
  ├── KlarnaProvider (extends BaseBnplProvider)
  ├── AffirmProvider (extends BaseBnplProvider)
  └── AfterpayProvider (extends BaseBnplProvider)
```

### Core Components

1. **BaseBnplProvider** - Abstract base class defining provider interface
2. **Provider Implementations** - Klarna, Affirm, Afterpay providers
3. **BnplProviderFactory** - Factory for creating and managing provider instances
4. **BnplProviderEnhancedService** - Enhanced service using the new architecture
5. **BnplService** - Main service for payment plan management
6. **BnplController** - REST API endpoints
7. **BnplWebhookController** - Webhook handlers for provider events

## Environment Variables

### Klarna
```env
KLARNA_API_KEY=your_api_key
KLARNA_API_SECRET=your_api_secret
KLARNA_MERCHANT_ID=your_merchant_id
KLARNA_ENV=sandbox # or production
```

### Affirm
```env
AFFIRM_PUBLIC_KEY=your_public_key
AFFIRM_PRIVATE_KEY=your_private_key
AFFIRM_ENV=sandbox # or production
```

### Afterpay
```env
AFTERPAY_MERCHANT_ID=your_merchant_id
AFTERPAY_SECRET_KEY=your_secret_key
AFTERPAY_ENV=sandbox # or production
```

## API Endpoints

### Payment Plans

#### Create Payment Plan
```http
POST /api/bnpl/payment-plans
Authorization: Bearer {token}

{
  "orderId": "order_123",
  "provider": "KLARNA",
  "numberOfInstallments": 4,
  "downPayment": 0,
  "frequency": "MONTHLY"
}
```

#### Get Payment Plans
```http
GET /api/bnpl/payment-plans
Authorization: Bearer {token}
```

#### Get Payment Plan by ID
```http
GET /api/bnpl/payment-plans/:id
Authorization: Bearer {token}
```

#### Cancel Payment Plan
```http
DELETE /api/bnpl/payment-plans/:id
Authorization: Bearer {token}
```

### Installments

#### Process Installment Payment
```http
POST /api/bnpl/installments/:id/pay
Authorization: Bearer {token}
```

#### Get Upcoming Installments
```http
GET /api/bnpl/installments/upcoming
Authorization: Bearer {token}
```

#### Get Overdue Installments
```http
GET /api/bnpl/installments/overdue
Authorization: Bearer {token}
```

### Eligibility

#### Check Eligibility
```http
GET /api/bnpl/eligibility/:orderId?provider=KLARNA
Authorization: Bearer {token}
```

## Webhooks

Each provider has a dedicated webhook endpoint:

- **Klarna**: `POST /webhooks/bnpl/klarna`
- **Affirm**: `POST /webhooks/bnpl/affirm`
- **Afterpay**: `POST /webhooks/bnpl/afterpay`

### Webhook Events

Webhooks are used to receive real-time updates from providers:

- Payment authorization
- Payment capture
- Order cancellation
- Refund processing
- Fraud check results

## Provider Interface

All providers implement the following interface:

```typescript
interface BnplProvider {
  // Eligibility
  checkEligibility(request: BnplEligibilityRequest): Promise<BnplEligibilityResponse>;

  // Session Management
  createSession(request: BnplSessionRequest): Promise<BnplSession>;

  // Payment Processing
  authorizePayment(sessionId: string, checkoutToken?: string): Promise<BnplAuthorizationResult>;
  capturePayment(authorizationToken: string, amount?: number): Promise<BnplCaptureResult>;

  // Refunds
  processRefund(request: BnplRefundRequest): Promise<BnplRefundResult>;

  // Webhooks
  handleWebhook(payload: any, headers: Record<string, string>): Promise<BnplWebhookEvent>;
  verifyWebhookSignature(payload: any, signature: string): boolean;

  // Order Management
  cancelOrder(orderId: string): Promise<{ success: boolean; message?: string }>;
  getOrderStatus(orderId: string): Promise<OrderStatus>;
}
```

## Usage Example

### Creating a Payment Plan

```typescript
// 1. Check eligibility
const eligibility = await bnplService.checkEligibility('order_123', BnplProvider.KLARNA);

if (eligibility.eligible) {
  // 2. Create payment plan
  const paymentPlan = await bnplService.createPaymentPlan(userId, {
    orderId: 'order_123',
    provider: BnplProvider.KLARNA,
    numberOfInstallments: 4,
    frequency: 'MONTHLY',
  });

  // 3. Redirect user to provider checkout
  window.location.href = paymentPlan.providerSession.redirectUrl;
}
```

### Processing Installment Payment

```typescript
// 1. Get upcoming installments
const installments = await bnplService.getUpcomingInstallments(userId);

// 2. Process payment
const result = await bnplService.processInstallmentPayment(
  installments[0].id,
  userId,
  paymentToken
);

if (result.success) {
  console.log('Payment processed successfully');
}
```

## Database Schema

### BnplPaymentPlan
- id (UUID)
- orderId (String)
- userId (String)
- provider (Enum: KLARNA, AFFIRM, AFTERPAY, SEZZLE)
- providerPlanId (String)
- totalAmount (Float)
- downPayment (Float)
- numberOfInstallments (Int)
- installmentAmount (Float)
- frequency (Enum: WEEKLY, BIWEEKLY, MONTHLY)
- status (Enum: PENDING, ACTIVE, COMPLETED, CANCELLED, DEFAULTED)
- interestRate (Float)
- fees (Float)
- remainingBalance (Float)
- totalPaid (Float)

### BnplInstallment
- id (UUID)
- paymentPlanId (String)
- installmentNumber (Int)
- amount (Float)
- dueDate (DateTime)
- paidDate (DateTime)
- status (Enum: PENDING, PAID, OVERDUE, FAILED)
- attemptCount (Int)
- lastAttemptDate (DateTime)
- failureReason (String)

## Testing

### Test with Sandbox Credentials

All providers offer sandbox/test environments:

1. **Klarna**: Use playground credentials
2. **Affirm**: Use sandbox API keys
3. **Afterpay**: Use sandbox merchant ID

### Test Cards

Each provider has specific test cards for different scenarios:
- Successful authorization
- Declined payment
- Fraud detection
- Various error conditions

## Error Handling

The module implements comprehensive error handling:

- **BadRequestException**: Invalid request data
- **NotFoundException**: Payment plan not found
- **ConflictException**: Payment plan already exists
- **HttpException**: Provider API errors

## Security

- Webhook signature verification for all providers
- JWT authentication for all endpoints
- User ownership validation
- HTTPS required for production webhooks

## Monitoring

The module logs all important events:
- Session creation
- Payment authorization
- Webhook events
- Errors and failures

## Future Enhancements

- [ ] Sezzle provider implementation
- [ ] Installment reminder notifications
- [ ] Auto-pay functionality
- [ ] Payment plan modification
- [ ] Partial refunds
- [ ] Multi-currency support
- [ ] Advanced fraud detection
- [ ] Analytics and reporting
