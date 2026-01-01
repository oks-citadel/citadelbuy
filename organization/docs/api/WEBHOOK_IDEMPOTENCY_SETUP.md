# Webhook Idempotency Setup Guide

## Quick Start

This guide will help you set up and deploy the idempotent payment webhook processing system.

## Prerequisites

- PostgreSQL database
- Redis server
- Node.js 18+
- Payment provider accounts (Stripe, PayPal, etc.)

## Installation Steps

### 1. Run Database Migration

```bash
cd organization/apps/api

# Development
npx prisma migrate dev --name add_payment_webhook_events

# Production
npx prisma migrate deploy
```

This creates the `payment_webhook_events` table with the following structure:

```sql
CREATE TABLE payment_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id VARCHAR(255) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  processed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  status VARCHAR(20) NOT NULL DEFAULT 'processing',
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_event_provider UNIQUE (event_id, provider)
);
```

### 2. Configure Environment Variables

Add the following to your `.env` file:

```bash
# Redis (required for idempotency)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password_here

# Payment Provider Webhook Secrets
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret
PAYPAL_WEBHOOK_ID=your_paypal_webhook_id
FLUTTERWAVE_WEBHOOK_SECRET=your_flutterwave_secret
PAYSTACK_WEBHOOK_SECRET=your_paystack_secret

# Stripe API Key
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
```

### 3. Configure Webhook Endpoints in Payment Providers

#### Stripe

1. Go to [Stripe Dashboard > Developers > Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Enter URL: `https://yourdomain.com/webhooks/payments/stripe`
4. Select events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Copy the webhook signing secret and add to `.env`

#### PayPal

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/developer/applications)
2. Select your application
3. Click "Add Webhook"
4. Enter URL: `https://yourdomain.com/webhooks/payments/paypal`
5. Select event types:
   - `CHECKOUT.ORDER.APPROVED`
   - `PAYMENT.CAPTURE.COMPLETED`
   - `PAYMENT.CAPTURE.DENIED`
   - `PAYMENT.CAPTURE.REFUNDED`
   - `BILLING.SUBSCRIPTION.ACTIVATED`
   - `BILLING.SUBSCRIPTION.CANCELLED`
6. Copy the webhook ID and add to `.env`

#### Flutterwave

1. Go to Flutterwave Dashboard > Settings > Webhooks
2. Enter URL: `https://yourdomain.com/webhooks/payments/flutterwave`
3. Copy the secret hash and add to `.env`

#### Paystack

1. Go to Paystack Dashboard > Settings > Webhooks
2. Enter URL: `https://yourdomain.com/webhooks/payments/paystack`
3. Copy the secret key and add to `.env`

### 4. Verify Redis Connection

```bash
# Test Redis connection
redis-cli ping
# Should return: PONG

# Check Redis info
redis-cli INFO
```

### 5. Deploy Application

```bash
# Build the application
npm run build

# Start the application
npm run start:prod

# Or use PM2
pm2 start dist/main.js --name broxiva-api
```

## Testing

### Test Webhook Endpoints

#### Test with Stripe CLI

```bash
# Install Stripe CLI
# https://stripe.com/docs/stripe-cli

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/webhooks/payments/stripe

# Trigger test event
stripe trigger payment_intent.succeeded
```

#### Test with curl

```bash
# Test Stripe webhook (with mock signature)
curl -X POST http://localhost:3000/webhooks/payments/stripe \
  -H "stripe-signature: test_signature" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "evt_test_123",
    "type": "payment_intent.succeeded",
    "data": {
      "object": {
        "id": "pi_test_123",
        "amount": 5000,
        "currency": "usd"
      }
    }
  }'
```

### Verify Idempotency

```bash
# Send the same webhook twice
curl -X POST http://localhost:3000/webhooks/payments/stripe ... # First call
curl -X POST http://localhost:3000/webhooks/payments/stripe ... # Second call (duplicate)

# Check logs - second call should show "Event already processed"
```

### Check Health Endpoint

```bash
curl http://localhost:3000/webhooks/payments/health

# Response:
{
  "status": "ok",
  "timestamp": "2025-12-03T22:00:00Z",
  "statistics": {
    "total": 100,
    "completed": 95,
    "failed": 3,
    "processing": 2
  }
}
```

## Monitoring

### Database Queries

```sql
-- Check webhook event statistics
SELECT
  provider,
  status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_processing_time_seconds
FROM payment_webhook_events
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY provider, status
ORDER BY provider, status;

-- Find stuck events (processing > 5 minutes)
SELECT *
FROM payment_webhook_events
WHERE status = 'processing'
  AND processed_at < NOW() - INTERVAL '5 minutes'
ORDER BY processed_at DESC;

-- Check duplicate webhook rate
SELECT
  provider,
  DATE(created_at) as date,
  COUNT(*) as total_attempts,
  COUNT(DISTINCT event_id) as unique_events,
  (COUNT(*) - COUNT(DISTINCT event_id))::FLOAT / COUNT(*) * 100 as duplicate_rate_percent
FROM payment_webhook_events
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY provider, DATE(created_at)
ORDER BY date DESC, provider;
```

### Redis Monitoring

```bash
# Check Redis memory usage
redis-cli INFO memory | grep used_memory_human

# Check number of webhook event keys
redis-cli KEYS "webhook:event:*" | wc -l

# Get TTL for a specific event
redis-cli TTL "webhook:event:stripe:evt_123"
```

### Application Logs

Key log patterns to search for:

```bash
# Successful webhook processing
grep "processed successfully" /var/log/broxiva/app.log

# Duplicate webhooks caught
grep "already processed" /var/log/broxiva/app.log

# Failed webhooks
grep "webhook processing error" /var/log/broxiva/app.log

# Signature verification failures
grep "signature verification failed" /var/log/broxiva/app.log
```

## Maintenance

### Regular Cleanup

Set up a cron job to clean up old webhook events:

```bash
# Add to crontab
crontab -e

# Run cleanup daily at 2 AM (keeps events for 30 days)
0 2 * * * cd /path/to/broxiva/organization/apps/api && npm run cleanup:webhook-events

# Or weekly (keeps events for 7 days)
0 2 * * 0 cd /path/to/broxiva/organization/apps/api && npm run cleanup:webhook-events -- --days 7
```

Create the cleanup script in `package.json`:

```json
{
  "scripts": {
    "cleanup:webhook-events": "ts-node scripts/cleanup-webhook-events.ts"
  }
}
```

### Backup Considerations

When backing up the database, consider:

1. **Include webhook events table** for compliance/audit
2. **Retention period**: Keep at least 90 days for financial records
3. **Archive old events** before deletion if required by compliance

### Performance Tuning

Monitor these metrics and adjust as needed:

1. **Redis Memory**: Should stay < 80% of allocated memory
2. **Database Connections**: Monitor connection pool usage
3. **Processing Time**: p95 should be < 2 seconds
4. **Cache Hit Rate**: Should be > 90%

## Troubleshooting

### Issue: Webhooks Not Being Processed

**Check:**
1. Is the application running? `pm2 status`
2. Is Redis running? `redis-cli ping`
3. Is the database accessible? `psql -c "SELECT 1"`
4. Are webhook URLs configured correctly in provider dashboards?
5. Check application logs for errors

### Issue: Duplicate Payments

**Check:**
1. Are webhook events being stored? Query the database
2. Is Redis connected? Check logs for Redis errors
3. Is the unique constraint in place? `\d payment_webhook_events`
4. Check idempotency service logs

### Issue: High Memory Usage

**Possible Causes:**
1. Too many events cached in Redis
2. TTL not being set correctly
3. Memory leak in application

**Solutions:**
1. Verify Redis TTL: `redis-cli TTL webhook:event:stripe:evt_123`
2. Clear Redis cache: `redis-cli FLUSHDB` (use with caution!)
3. Restart application: `pm2 restart broxiva-api`

### Issue: Slow Webhook Processing

**Check:**
1. Database query performance (check indexes)
2. Redis latency (network issues?)
3. Application CPU/memory usage
4. Concurrent webhook processing

**Solutions:**
1. Ensure indexes exist on `payment_webhook_events`
2. Scale Redis if needed
3. Scale application horizontally
4. Consider async processing for complex webhooks

## Rollback

If you need to rollback the idempotency system:

```bash
# 1. Disable enforcement in code (allow all events through)
# Comment out the idempotency check in payments-webhook.controller.ts

# 2. Rollback database migration
cd organization/apps/api
npx prisma migrate rollback

# 3. Restart application
pm2 restart broxiva-api

# 4. Clear Redis cache (optional)
redis-cli FLUSHDB
```

## Production Checklist

Before going to production:

- [ ] Database migration deployed
- [ ] Environment variables configured
- [ ] Webhook endpoints configured in all payment providers
- [ ] Webhook secrets verified and stored securely
- [ ] Redis running and accessible
- [ ] Application deployed and running
- [ ] Health check endpoint returns 200
- [ ] Test webhooks sent and processed successfully
- [ ] Monitoring and alerts configured
- [ ] Backup strategy includes webhook events table
- [ ] Cleanup cron job scheduled
- [ ] Documentation reviewed by team
- [ ] Incident response plan updated

## Support

For issues or questions:

- **Documentation**: See [PAYMENT_STATE_MACHINE.md](../../docs/PAYMENT_STATE_MACHINE.md)
- **Idempotency Details**: See [README_IDEMPOTENCY.md](./README_IDEMPOTENCY.md)
- **DevOps Issues**: Contact DevOps team
- **Payment Issues**: Contact Payments team
- **Security Issues**: Contact Security team immediately

## References

- [Prisma Migrations](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Redis Best Practices](https://redis.io/docs/manual/patterns/)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [PayPal Webhooks](https://developer.paypal.com/docs/api-basics/notifications/webhooks/)

---

**Last Updated**: 2025-12-03
**Version**: 1.0
