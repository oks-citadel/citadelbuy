# Webhook System Documentation

## Overview

The Broxiva Webhook System provides a robust, scalable solution for sending real-time notifications to external systems when specific events occur in the platform.

## Features

- **Webhook Endpoint Management**: Create, update, and delete webhook endpoints
- **Event-Driven Architecture**: Automatically trigger webhooks based on application events
- **Retry Logic with Exponential Backoff**: Automatic retry for failed deliveries
- **Dead Letter Queue**: Failed webhooks are stored for manual review and retry
- **Signature Verification**: HMAC-SHA256 signatures for secure webhook delivery
- **Delivery Tracking**: Complete audit trail of all webhook deliveries
- **Admin Dashboard**: Monitor webhook performance and manage failures

## Architecture

### Components

1. **WebhookService**: Core business logic for webhook management
2. **WebhookProcessor**: Bull queue processor for webhook delivery
3. **WebhookEventsService**: Event listener that triggers webhooks
4. **WebhookController**: REST API endpoints
5. **Bull Queue**: Job queue for reliable delivery and retries

### Retry Schedule

Failed webhook deliveries are automatically retried with exponential backoff:

| Attempt | Delay      |
|---------|------------|
| 1       | Immediate  |
| 2       | 5 minutes  |
| 3       | 30 minutes |
| 4       | 2 hours    |
| 5       | 24 hours   |

After 5 failed attempts, the delivery is moved to the dead letter queue for manual intervention.

## API Endpoints

### Webhook Management

#### Create Webhook
```http
POST /webhooks
Authorization: Bearer <token>

{
  "url": "https://example.com/webhooks/broxiva",
  "description": "Order notifications",
  "events": ["order.created", "order.updated"],
  "isActive": true
}
```

**Response:**
```json
{
  "id": "webhook_123",
  "url": "https://example.com/webhooks/broxiva",
  "secret": "whsec_abc123...", // Only shown on creation
  "events": ["order.created", "order.updated"],
  "isActive": true,
  "createdAt": "2025-12-03T10:00:00Z"
}
```

#### List Webhooks
```http
GET /webhooks
Authorization: Bearer <token>
```

#### Get Webhook
```http
GET /webhooks/:id
Authorization: Bearer <token>
```

#### Update Webhook
```http
PUT /webhooks/:id
Authorization: Bearer <token>

{
  "events": ["order.created", "order.updated", "order.cancelled"]
}
```

#### Delete Webhook
```http
DELETE /webhooks/:id
Authorization: Bearer <token>
```

#### Rotate Secret
```http
POST /webhooks/:id/rotate-secret
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "secret": "whsec_new123..." // Only shown on rotation
}
```

### Delivery Management

#### Get Delivery History
```http
GET /webhooks/:id/deliveries?limit=50&offset=0
Authorization: Bearer <token>
```

#### Get Delivery Statistics
```http
GET /webhooks/:id/stats
Authorization: Bearer <token>
```

**Response:**
```json
{
  "PENDING": 5,
  "DELIVERED": 1234,
  "FAILED": 3,
  "RETRYING": 2
}
```

#### Retry Failed Delivery
```http
POST /webhooks/deliveries/retry
Authorization: Bearer <token>

{
  "deliveryId": "delivery_123"
}
```

### Admin Endpoints

#### Get Dead Letter Queue
```http
GET /webhooks/admin/dead-letter-queue?limit=50&offset=0
Authorization: Bearer <token>
```

#### Retry from Dead Letter Queue
```http
POST /webhooks/admin/dead-letter-queue/retry
Authorization: Bearer <token>

{
  "deadLetterId": "dl_123"
}
```

#### Trigger Test Event
```http
POST /webhooks/admin/trigger-test-event
Authorization: Bearer <token>

{
  "eventType": "test.event",
  "eventId": "test_123",
  "payload": {
    "message": "This is a test"
  }
}
```

## Webhook Payload Format

All webhooks are delivered as HTTP POST requests with JSON payload:

```json
{
  "eventType": "order.created",
  "eventId": "evt_order_created_1234567890_abc",
  "payload": {
    "order": {
      "id": "order_123",
      "total": 99.99,
      "status": "pending",
      "items": [...]
    }
  },
  "source": "order_service",
  "triggeredBy": "user_456"
}
```

### Headers

```
Content-Type: application/json
User-Agent: Broxiva-Webhook/1.0
X-Webhook-Signature: t=1701612000,v1=abc123...
X-Webhook-Event-Type: order.created
X-Webhook-Event-ID: evt_order_created_1234567890_abc
X-Webhook-Timestamp: 1701612000
```

## Signature Verification

All webhooks include an HMAC-SHA256 signature for verification.

### Signature Format

```
X-Webhook-Signature: t=<timestamp>,v1=<signature>
```

### Verification Example (Node.js)

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signatureHeader, secret) {
  const elements = signatureHeader.split(',');
  const timestamp = elements.find(e => e.startsWith('t=')).split('=')[1];
  const signature = elements.find(e => e.startsWith('v1=')).split('=')[1];

  // Check timestamp tolerance (prevent replay attacks)
  const currentTimestamp = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTimestamp - parseInt(timestamp)) > 300) {
    return false; // Reject if older than 5 minutes
  }

  // Verify signature
  const signedPayload = `${timestamp}.${JSON.stringify(payload)}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload, 'utf8')
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Express middleware example
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = JSON.parse(req.body.toString());

  if (!verifyWebhookSignature(payload, signature, 'your_webhook_secret')) {
    return res.status(401).send('Invalid signature');
  }

  // Process webhook...
  res.status(200).send('OK');
});
```

## Supported Events

### Order Events
- `order.created` - New order created
- `order.updated` - Order updated
- `order.cancelled` - Order cancelled
- `order.fulfilled` - Order fulfilled
- `order.shipped` - Order shipped
- `order.delivered` - Order delivered

### Payment Events
- `payment.succeeded` - Payment successful
- `payment.failed` - Payment failed
- `payment.refunded` - Payment refunded

### Product Events
- `product.created` - New product created
- `product.updated` - Product updated
- `product.deleted` - Product deleted
- `product.out_of_stock` - Product out of stock
- `product.low_stock` - Product low stock

### User Events
- `user.created` - New user registered
- `user.updated` - User profile updated
- `user.deleted` - User account deleted

### Cart Events
- `cart.abandoned` - Cart abandoned
- `cart.recovered` - Abandoned cart recovered

### Inventory Events
- `inventory.updated` - Inventory level updated
- `inventory.restocked` - Product restocked

### Subscription Events
- `subscription.created` - New subscription
- `subscription.updated` - Subscription updated
- `subscription.cancelled` - Subscription cancelled

### Review Events
- `review.created` - New review posted
- `review.updated` - Review updated

### Return Events
- `return.requested` - Return requested
- `return.approved` - Return approved
- `return.rejected` - Return rejected

## Triggering Webhooks from Code

Webhooks are automatically triggered when you emit events using the EventEmitter:

```typescript
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class OrderService {
  constructor(private eventEmitter: EventEmitter2) {}

  async createOrder(orderData) {
    const order = await this.prisma.order.create({ data: orderData });

    // This will automatically trigger webhooks subscribed to 'order.created'
    this.eventEmitter.emit('order.created', {
      order: order,
      userId: order.userId,
    });

    return order;
  }
}
```

## Database Schema

### Webhook
Stores webhook endpoint configurations.

```prisma
model Webhook {
  id             String  @id @default(uuid())
  organizationId String?
  userId         String?
  url            String
  secret         String
  description    String?
  events         String[]
  isActive       Boolean @default(true)
  metadata       Json?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  deliveries     WebhookDelivery[]
}
```

### WebhookDelivery
Tracks individual webhook delivery attempts.

```prisma
model WebhookDelivery {
  id            String                 @id @default(uuid())
  webhookId     String
  eventType     String
  eventId       String
  payload       Json
  status        WebhookDeliveryStatus
  statusCode    Int?
  responseBody  String?
  errorMessage  String?
  attempts      Int                    @default(0)
  maxAttempts   Int                    @default(5)
  nextRetryAt   DateTime?
  lastAttemptAt DateTime?
  createdAt     DateTime               @default(now())
  deliveredAt   DateTime?
  failedAt      DateTime?
  metadata      Json?
}
```

### WebhookDeadLetter
Stores failed webhooks for manual intervention.

```prisma
model WebhookDeadLetter {
  id                 String   @id @default(uuid())
  webhookId          String
  originalDeliveryId String
  eventType          String
  eventId            String
  payload            Json
  errorMessage       String
  statusCode         Int?
  responseBody       String?
  attemptsMade       Int
  lastAttemptAt      DateTime
  processedAt        DateTime?
  retriedAt          DateTime?
  createdAt          DateTime @default(now())
  metadata           Json?
}
```

### WebhookEventLog
Audit log of all webhook events.

```prisma
model WebhookEventLog {
  id                String    @id @default(uuid())
  eventType         String
  eventId           String    @unique
  payload           Json
  source            String?
  triggeredBy       String?
  webhooksTriggered Int       @default(0)
  processed         Boolean   @default(false)
  processedAt       DateTime?
  createdAt         DateTime  @default(now())
  metadata          Json?
}
```

## Best Practices

### For Webhook Consumers

1. **Respond Quickly**: Return a 200 status code as soon as possible. Process the webhook asynchronously.

2. **Verify Signatures**: Always verify the webhook signature before processing.

3. **Handle Idempotency**: Webhooks may be delivered more than once. Use the `eventId` to prevent duplicate processing.

4. **Use HTTPS**: Always use HTTPS endpoints for security.

5. **Implement Timeouts**: Your endpoint should respond within 30 seconds.

### For Webhook Providers

1. **Monitor Dead Letter Queue**: Regularly check the dead letter queue for failed webhooks.

2. **Rotate Secrets**: Periodically rotate webhook secrets for security.

3. **Use Descriptive Events**: Choose clear, descriptive event names.

4. **Include Relevant Data**: Ensure the payload contains all necessary information.

5. **Version Your Webhooks**: Consider webhook versioning for backward compatibility.

## Monitoring and Debugging

### View Delivery Statistics

```bash
GET /webhooks/:id/stats
```

### Check Dead Letter Queue

```bash
GET /webhooks/admin/dead-letter-queue
```

### View Recent Deliveries

```bash
GET /webhooks/:id/deliveries?limit=100
```

### Logs

The webhook system logs all important events:

- Webhook creation/updates
- Delivery attempts
- Failures and retries
- Dead letter queue entries

Check application logs for detailed debugging information.

## Migration

To add the webhook system to your database:

```bash
# Generate Prisma client
npx prisma generate

# Create migration
npx prisma migrate dev --name add_webhook_system

# Or push directly to database
npx prisma db push
```

## Testing

### Test Webhook Endpoint

Use a service like [webhook.site](https://webhook.site) or [requestbin.com](https://requestbin.com) to test webhooks.

### Trigger Test Event

```bash
POST /webhooks/admin/trigger-test-event
{
  "eventType": "test.event",
  "eventId": "test_123",
  "payload": { "test": "data" }
}
```

### Manual Retry

```bash
POST /webhooks/deliveries/retry
{
  "deliveryId": "delivery_123"
}
```

## Troubleshooting

### Webhooks Not Firing

1. Check if webhook is active: `GET /webhooks/:id`
2. Verify event subscription: Ensure the webhook is subscribed to the event type
3. Check event logs: `WebhookEventLog` table

### Delivery Failures

1. Check delivery history: `GET /webhooks/:id/deliveries`
2. Review error messages in the delivery record
3. Verify endpoint URL is accessible
4. Check signature verification on receiving end

### Dead Letter Queue Growing

1. Review failed webhooks: `GET /webhooks/admin/dead-letter-queue`
2. Check for common error patterns
3. Fix endpoint issues
4. Retry failed webhooks: `POST /webhooks/admin/dead-letter-queue/retry`

## Security Considerations

1. **Secret Storage**: Webhook secrets are stored securely in the database
2. **Signature Verification**: All webhooks include HMAC-SHA256 signatures
3. **HTTPS Only**: Only HTTPS endpoints should be used in production
4. **Rate Limiting**: Consider implementing rate limiting on webhook endpoints
5. **IP Whitelisting**: Consider whitelisting Broxiva IP addresses

## Performance

- **Async Processing**: Webhooks are processed asynchronously using Bull queues
- **Batch Processing**: Multiple webhooks can be processed concurrently
- **Redis Backend**: Uses Redis for reliable job queuing
- **Configurable Concurrency**: Adjust processor concurrency based on load

## Future Enhancements

- [ ] Webhook endpoint health checks
- [ ] Webhook delivery analytics dashboard
- [ ] Webhook replay functionality
- [ ] Webhook filtering based on payload conditions
- [ ] Webhook transformation templates
- [ ] Multi-region webhook delivery
- [ ] Webhook rate limiting per endpoint
- [ ] Custom retry schedules per webhook

## Support

For issues or questions about the webhook system:

1. Check this documentation
2. Review logs for error messages
3. Check the dead letter queue for failed deliveries
4. Contact the development team

## License

Copyright (c) 2025 Broxiva. All rights reserved.
