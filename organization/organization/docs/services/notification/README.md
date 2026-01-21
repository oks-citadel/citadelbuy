# Notification Service

## Overview

The Notification Service manages all communications for the Broxiva platform including email, SMS, push notifications, and in-app messages. It provides templating, scheduling, and delivery tracking for all notification types.

## Key Features

### Multi-channel Notifications
- **Email**: Transactional and marketing emails
- **SMS**: Text message notifications
- **Push Notifications**: Mobile and web push
- **In-app Messages**: Platform notifications

### Template Management
- **Email Templates**: HTML email templates with variables
- **SMS Templates**: Dynamic SMS messages
- **Localization**: Multi-language support
- **Personalization**: User-specific content

### Delivery Management
- **Queue System**: Reliable message queuing
- **Scheduling**: Send notifications at specific times
- **Retry Logic**: Automatic retry on failures
- **Throttling**: Rate limiting to prevent spam

### Tracking & Analytics
- **Delivery Status**: Track delivery success/failure
- **Open Rates**: Email open tracking
- **Click Tracking**: Track link clicks
- **Unsubscribe Management**: Handle opt-outs

## Environment Variables

```bash
# Service Configuration
LOG_LEVEL=INFO
PORT=8009

# Database (PostgreSQL)
DATABASE_URL=postgresql://user:password@localhost:5432/broxiva

# Redis Queue
REDIS_URL=redis://localhost:6379/9
REDIS_PASSWORD=your_redis_password

# Email Configuration
EMAIL_PROVIDER=sendgrid  # sendgrid, ses, smtp
SENDGRID_API_KEY=your_sendgrid_key
FROM_EMAIL=noreply@broxiva.com
FROM_NAME=Broxiva

# SMS Configuration
SMS_PROVIDER=twilio  # twilio, sns
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890

# Push Notifications
FIREBASE_CREDENTIALS_PATH=/app/firebase-credentials.json
ENABLE_WEB_PUSH=true
WEB_PUSH_VAPID_PUBLIC_KEY=your_public_key
WEB_PUSH_VAPID_PRIVATE_KEY=your_private_key

# Notification Settings
MAX_RETRIES=3
RETRY_DELAY_SECONDS=60
BATCH_SIZE=100
QUEUE_WORKERS=4

# Feature Flags
ENABLE_EMAIL_TRACKING=true
ENABLE_SMS_NOTIFICATIONS=true
ENABLE_PUSH_NOTIFICATIONS=true
ENABLE_IN_APP_NOTIFICATIONS=true
```

## API Endpoints

### Notifications
- `POST /api/v1/notifications/send` - Send notification
- `POST /api/v1/notifications/send/batch` - Send batch notifications
- `GET /api/v1/notifications/{notification_id}` - Get notification status
- `POST /api/v1/notifications/schedule` - Schedule notification

### Email
- `POST /api/v1/email/send` - Send email
- `POST /api/v1/email/template` - Send templated email
- `GET /api/v1/email/{email_id}/status` - Get email status

### SMS
- `POST /api/v1/sms/send` - Send SMS
- `GET /api/v1/sms/{sms_id}/status` - Get SMS status

### Push
- `POST /api/v1/push/send` - Send push notification
- `POST /api/v1/push/subscribe` - Subscribe to push
- `DELETE /api/v1/push/unsubscribe` - Unsubscribe from push

### Templates
- `GET /api/v1/templates` - List templates
- `POST /api/v1/templates` - Create template
- `PUT /api/v1/templates/{template_id}` - Update template
- `DELETE /api/v1/templates/{template_id}` - Delete template

### Health & Monitoring
- `GET /health` - Service health check
- `GET /metrics` - Prometheus metrics

## Dependencies

- FastAPI 0.109.0
- Celery - Task queue
- SendGrid - Email delivery
- Twilio - SMS delivery
- Firebase Admin - Push notifications
- Redis 5.0.1 - Queue backend

## Local Development Setup

```bash
cd organization/apps/services/notification
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Start Celery worker
celery -A src.worker worker --loglevel=info

# Start API server
uvicorn main:app --reload --port 8009
```

## Docker Usage

```bash
docker build -t broxiva/notification:latest .
docker run -p 8009:8009 --env-file .env broxiva/notification:latest
```

## Usage Examples

### Send Email

```bash
curl -X POST http://localhost:8009/api/v1/email/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "customer@example.com",
    "subject": "Order Confirmation",
    "template": "order_confirmation",
    "variables": {
      "order_id": "12345",
      "customer_name": "John Doe"
    }
  }'
```

### Send SMS

```bash
curl -X POST http://localhost:8009/api/v1/sms/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+1234567890",
    "message": "Your order #12345 has shipped!"
  }'
```

### Send Push Notification

```bash
curl -X POST http://localhost:8009/api/v1/push/send \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_123",
    "title": "New Message",
    "body": "You have a new message",
    "data": {"type": "message", "id": "msg_456"}
  }'
```

## Testing

```bash
pytest tests/ -v
pytest tests/ --cov=src --cov-report=html
```

## API Documentation

- Swagger UI: http://localhost:8009/docs
- ReDoc: http://localhost:8009/redoc

## Support

- Internal Slack: #notification-support
- Email: notifications@broxiva.com
