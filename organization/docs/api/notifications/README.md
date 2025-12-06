# Notifications Module

Comprehensive notification system for CitadelBuy e-commerce platform supporting multiple channels: email, push notifications, SMS, and in-app notifications.

## Features

### Notification Channels
- **Email Notifications**: Transactional, marketing, and system emails via SMTP/SendGrid
- **Push Notifications**: Mobile and web push via Firebase Cloud Messaging (FCM)
- **SMS Notifications**: Text messages via Twilio
- **In-App Notifications**: Real-time notifications within the application

### Key Capabilities
- Multi-channel notification delivery
- User preference management
- Notification queueing and scheduling
- Template-based notifications
- Analytics and tracking
- Rate limiting and throttling
- Dead letter queue for failed notifications
- Device token management

## Architecture

### Services

#### NotificationsService
Main service orchestrating all notification types.

**Key Methods:**
- `createNotification()` - Create in-app notification
- `getNotifications()` - Fetch user notifications
- `sendPushNotification()` - Send push notification
- `sendSmsNotification()` - Send SMS notification
- `updatePreferences()` - Update notification preferences
- `registerPushToken()` - Register device for push notifications

#### PushNotificationService
Handles Firebase Cloud Messaging (FCM) integration for push notifications.

**Key Methods:**
- `sendToUser()` - Send to all user's devices
- `sendToToken()` - Send to specific device token
- `sendToTopic()` - Broadcast to topic subscribers
- `subscribeToTopic()` - Subscribe user to topic
- `validateToken()` - Validate device token

**Configuration:**
```env
# Firebase Admin SDK
FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/service-account.json
# OR
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
# OR
FIREBASE_PROJECT_ID=your-project-id
```

#### SmsService
Handles SMS delivery via Twilio.

**Key Methods:**
- `sendSms()` - Send SMS to phone number
- `sendOrderUpdateSms()` - Send order status updates
- `sendDeliveryNotificationSms()` - Send delivery alerts
- `sendVerificationCodeSms()` - Send verification codes
- `validatePhoneNumber()` - Validate phone format

**Configuration:**
```env
# Twilio Credentials
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

## Database Models

### MobileNotification
Stores in-app and push notifications.

```prisma
model MobileNotification {
  id             String               @id @default(uuid())
  userId         String?
  title          String
  body           String
  data           Json?
  imageUrl       String?
  actionUrl      String?
  category       NotificationCategory
  priority       NotificationPriority @default(NORMAL)
  isSent         Boolean              @default(false)
  sentAt         DateTime?
  isRead         Boolean              @default(false)
  readAt         DateTime?
  deliveryStatus String?
  failureReason  String?
  createdAt      DateTime             @default(now())
}
```

### PushNotificationToken
Stores device tokens for push notifications.

```prisma
model PushNotificationToken {
  id         String         @id @default(uuid())
  userId     String
  deviceId   String
  platform   DevicePlatform
  token      String
  endpoint   String?
  isActive   Boolean        @default(true)
  lastUsedAt DateTime       @default(now())
  createdAt  DateTime       @default(now())
  updatedAt  DateTime       @updatedAt

  @@unique([userId, deviceId])
}
```

### NotificationPreference
Stores user notification preferences.

```prisma
model NotificationPreference {
  id     String @id @default(uuid())
  userId String @unique

  // Email preferences
  orderConfirmation     Boolean @default(true)
  shippingUpdates       Boolean @default(true)
  deliveryNotifications Boolean @default(true)
  newsletters           Boolean @default(false)
  promotionalEmails     Boolean @default(false)
  productRecommendations Boolean @default(false)

  // Activity notifications
  cartAbandonment   Boolean @default(true)
  priceDropAlerts   Boolean @default(true)
  backInStockAlerts Boolean @default(true)
  wishlistUpdates   Boolean @default(true)
  reviewReminders   Boolean @default(true)

  // Push notification preferences
  pushEnabled     Boolean @default(true)
  pushOrders      Boolean @default(true)
  pushPromotions  Boolean @default(false)
  pushMessages    Boolean @default(true)

  // SMS preferences
  smsEnabled         Boolean @default(false)
  smsOrderUpdates    Boolean @default(false)
  smsDeliveryAlerts  Boolean @default(false)
}
```

## API Endpoints

### Notifications
```
GET    /api/notifications              - Get user notifications
GET    /api/notifications/unread-count - Get unread count
PUT    /api/notifications/:id/read     - Mark as read
PUT    /api/notifications/read-all     - Mark all as read
DELETE /api/notifications/:id          - Delete notification
DELETE /api/notifications              - Delete all

GET    /api/notifications/preferences  - Get preferences
PUT    /api/notifications/preferences  - Update preferences

POST   /api/notifications/register-token    - Register push token
POST   /api/notifications/unregister-token  - Unregister push token
```

## Usage Examples

### Send Push Notification

```typescript
import { NotificationsService } from '@/modules/notifications/notifications.service';

// Inject service
constructor(private notificationsService: NotificationsService) {}

// Send push notification
await this.notificationsService.sendPushNotification({
  userId: 'user-id',
  title: 'Order Shipped!',
  body: 'Your order #12345 has been shipped',
  category: NotificationCategory.ORDER,
  priority: NotificationPriority.HIGH,
  data: {
    orderId: '12345',
    trackingNumber: 'TRACK123',
  },
  imageUrl: 'https://example.com/product-image.jpg',
  actionUrl: '/orders/12345',
});
```

### Send SMS Notification

```typescript
// Send order update SMS
await this.notificationsService.sendOrderUpdateSms(
  userId,
  'ORD-12345',
  'shipped',
  'TRACK123456',
);

// Send delivery notification SMS
await this.notificationsService.sendDeliveryNotificationSms(
  userId,
  'ORD-12345',
  '2:00 PM - 5:00 PM',
);
```

### Register Device for Push Notifications

```typescript
// Register push token
await this.notificationsService.registerPushToken(
  userId,
  'device-unique-id',
  'fcm-token-string',
  'IOS',
);
```

### Update User Preferences

```typescript
await this.notificationsService.updatePreferences(userId, {
  pushEnabled: true,
  pushOrders: true,
  pushPromotions: false,
  smsEnabled: true,
  smsOrderUpdates: true,
  smsDeliveryAlerts: true,
  promotionalEmails: false,
});
```

### Subscribe to Topic (for broadcast notifications)

```typescript
// Subscribe user to deals topic
await this.notificationsService.subscribeToTopic(userId, 'daily-deals');

// Send notification to topic
await this.notificationsService.sendPushToTopic(
  'daily-deals',
  'Flash Sale!',
  '50% off on electronics - 2 hours only!',
  { saleId: 'flash-sale-123' },
);
```

## Notification Categories

```typescript
enum NotificationCategory {
  ORDER        // Order updates
  SHIPPING     // Shipping and delivery
  PAYMENT      // Payment confirmations/issues
  PRODUCT      // Product updates, restocks
  PROMOTION    // Marketing and promotions
  ACCOUNT      // Account updates
  SECURITY     // Security alerts
  SYSTEM       // System notifications
  MESSAGE      // Messages and chat
  DEAL         // Deal alerts
}
```

## Notification Priority

```typescript
enum NotificationPriority {
  LOW     // Non-urgent notifications
  NORMAL  // Standard notifications
  HIGH    // Urgent notifications
}
```

## Error Handling

All services handle errors gracefully:
- Push notification failures mark tokens as inactive
- SMS failures return detailed error messages
- Preference checks prevent unwanted notifications
- Automatic retry for transient failures

## Best Practices

### 1. Check User Preferences
Always check user preferences before sending:
```typescript
const preferences = await notificationsService.getPreferences(userId);
if (preferences.pushOrders) {
  // Send notification
}
```

### 2. Use Appropriate Priority
- HIGH: Order confirmations, payment issues, security alerts
- NORMAL: Shipping updates, product restocks
- LOW: Marketing, recommendations

### 3. Include Actionable Data
Always include relevant data in push notifications:
```typescript
{
  data: {
    orderId: 'ORD-123',
    screen: 'OrderDetails',
    trackingNumber: 'TRACK123'
  }
}
```

### 4. Handle Token Expiration
Implement token refresh in mobile apps:
```typescript
// On token refresh
await notificationsService.registerPushToken(
  userId,
  deviceId,
  newToken,
  platform,
);
```

### 5. Use Topics for Broadcasts
For mass notifications, use topics instead of individual sends:
```typescript
// More efficient for 1000+ users
await notificationsService.sendPushToTopic('all-users', title, body);
```

## Testing

### Development Mode
When Firebase or Twilio is not configured, the services will log notifications instead of sending them:

```
[NotificationsService] Push notification would be sent to user-123: Order Shipped!
[SmsService] SMS would be sent to +1234567890: Your order has been delivered
```

### Test Endpoints
Use the development endpoints to test notifications:

```bash
# Send test push notification
curl -X POST http://localhost:3000/api/notifications/test/push \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Notification",
    "body": "This is a test"
  }'
```

## Monitoring

### Metrics to Track
- Push notification delivery rate
- SMS delivery rate
- Token invalidation rate
- Preference opt-out rates
- Notification open rates

### Logs
All services provide detailed logging:
- Info: Successful sends
- Warn: Missing tokens, opted-out users
- Error: Delivery failures, configuration issues

## Troubleshooting

### Push Notifications Not Received
1. Check Firebase configuration
2. Verify device token is registered and active
3. Check user preferences
4. Review Firebase Console for errors

### SMS Not Delivered
1. Verify Twilio credentials
2. Check phone number format (E.164)
3. Verify user has SMS enabled in preferences
4. Check Twilio logs for delivery status

### Invalid Tokens
- Tokens are automatically marked inactive on errors
- Users need to re-register devices
- Implement token refresh mechanism in apps

## Future Enhancements

- [ ] WhatsApp Business integration
- [ ] Slack notifications for team alerts
- [ ] Email template A/B testing
- [ ] Advanced analytics dashboard
- [ ] Notification scheduling UI
- [ ] Multi-language support
- [ ] Rich push notification templates
- [ ] Voice notifications

## Dependencies

```json
{
  "firebase-admin": "^11.x",
  "twilio": "^4.x",
  "nodemailer": "^6.x",
  "@nestjs/bull": "^10.x"
}
```

## License

Proprietary - CitadelBuy Platform
