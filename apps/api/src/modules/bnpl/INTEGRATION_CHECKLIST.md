# BNPL Integration Checklist

Use this checklist to ensure proper integration of the BNPL module.

## Pre-Deployment Checklist

### 1. Configuration
- [ ] Add Klarna credentials to `.env`
  - [ ] `KLARNA_API_KEY`
  - [ ] `KLARNA_API_SECRET`
  - [ ] `KLARNA_MERCHANT_ID`
  - [ ] `KLARNA_ENV` (sandbox/production)
- [ ] Add Affirm credentials to `.env`
  - [ ] `AFFIRM_PUBLIC_KEY`
  - [ ] `AFFIRM_PRIVATE_KEY`
  - [ ] `AFFIRM_ENV` (sandbox/production)
- [ ] Add Afterpay credentials to `.env`
  - [ ] `AFTERPAY_MERCHANT_ID`
  - [ ] `AFTERPAY_SECRET_KEY`
  - [ ] `AFTERPAY_ENV` (sandbox/production)
- [ ] Set `APP_URL` for redirect URLs
- [ ] Set `API_URL` for webhook URLs

### 2. Module Registration
- [ ] Add `BnplProviderFactory` to `BnplModule` providers
- [ ] Export `BnplProviderFactory` from `BnplModule`
- [ ] Import `BnplModule` in `AppModule` (if not already done)
- [ ] Register `BnplWebhookController` in `BnplModule`

### 3. Database
- [ ] Run database migrations for BNPL tables
  - [ ] `BnplPaymentPlan` table exists
  - [ ] `BnplInstallment` table exists
- [ ] Verify foreign key relationships
- [ ] Check indexes on frequently queried fields

### 4. Provider Configuration

#### Klarna Setup
- [ ] Register merchant account at Klarna
- [ ] Generate API credentials
- [ ] Configure webhook URL: `https://yourdomain.com/webhooks/bnpl/klarna`
- [ ] Set merchant URLs (terms, checkout, confirmation)
- [ ] Test with playground environment

#### Affirm Setup
- [ ] Register merchant account at Affirm
- [ ] Generate API credentials
- [ ] Configure webhook URL: `https://yourdomain.com/webhooks/bnpl/affirm`
- [ ] Set up financing programs
- [ ] Test with sandbox environment

#### Afterpay Setup
- [ ] Register merchant account at Afterpay
- [ ] Generate merchant credentials
- [ ] Configure webhook URL: `https://yourdomain.com/webhooks/bnpl/afterpay`
- [ ] Set payment limits
- [ ] Test with sandbox environment

### 5. Testing

#### Unit Tests
- [ ] Test provider eligibility checks
- [ ] Test session creation
- [ ] Test authorization flows
- [ ] Test refund processing
- [ ] Test webhook signature verification
- [ ] Test status mapping

#### Integration Tests
- [ ] Test Klarna full flow (sandbox)
- [ ] Test Affirm full flow (sandbox)
- [ ] Test Afterpay full flow (sandbox)
- [ ] Test webhook delivery
- [ ] Test error scenarios
- [ ] Test refund flows

#### Manual Testing
- [ ] Create test order
- [ ] Check eligibility
- [ ] Create payment plan
- [ ] Complete checkout flow
- [ ] Verify payment authorization
- [ ] Test installment payments
- [ ] Test order cancellation
- [ ] Test refunds

### 6. Security
- [ ] HTTPS enabled for production
- [ ] Webhook signature verification enabled
- [ ] JWT authentication on all endpoints
- [ ] User ownership validation in place
- [ ] Sensitive credentials in environment variables (not code)
- [ ] Rate limiting configured
- [ ] CORS configured properly

### 7. Monitoring & Logging
- [ ] Set up error logging for provider API calls
- [ ] Monitor webhook failures
- [ ] Track payment authorization rates
- [ ] Monitor refund processing
- [ ] Set up alerts for critical errors
- [ ] Log all webhook events for audit trail

### 8. Documentation
- [ ] API endpoints documented
- [ ] Environment variables documented
- [ ] Webhook events documented
- [ ] Error codes documented
- [ ] Integration guide for frontend
- [ ] Troubleshooting guide

## Post-Deployment Checklist

### 1. Smoke Tests
- [ ] Test eligibility endpoint
- [ ] Test payment plan creation
- [ ] Verify webhook endpoints accessible
- [ ] Test with real provider credentials (sandbox)

### 2. Monitoring
- [ ] Check application logs
- [ ] Verify webhook deliveries
- [ ] Monitor error rates
- [ ] Check payment authorization success rates

### 3. Provider Verification
- [ ] Verify Klarna integration in merchant dashboard
- [ ] Verify Affirm integration in merchant dashboard
- [ ] Verify Afterpay integration in merchant dashboard
- [ ] Check webhook event logs in provider dashboards

### 4. Production Readiness
- [ ] Switch to production credentials
- [ ] Update webhook URLs to production domain
- [ ] Verify HTTPS certificate
- [ ] Test production webhooks
- [ ] Monitor first production transactions

## Troubleshooting Checklist

### Provider Connection Issues
- [ ] Verify credentials are correct
- [ ] Check environment (sandbox vs production)
- [ ] Verify API URLs are correct
- [ ] Check network connectivity
- [ ] Review provider API status

### Webhook Issues
- [ ] Verify webhook URL is publicly accessible
- [ ] Check HTTPS is enabled
- [ ] Verify signature verification logic
- [ ] Check webhook endpoint logs
- [ ] Review provider webhook delivery logs

### Authorization Failures
- [ ] Check order eligibility
- [ ] Verify customer information is complete
- [ ] Check amount limits
- [ ] Review fraud check results
- [ ] Verify provider account status

### Refund Failures
- [ ] Verify order was captured
- [ ] Check refund amount doesn't exceed captured amount
- [ ] Verify provider order ID is correct
- [ ] Check provider refund policies
- [ ] Review provider account balance

## Frontend Integration Checklist

### 1. UI Components
- [ ] BNPL option display on checkout page
- [ ] Provider logo/badge integration
- [ ] Installment calculator widget
- [ ] Payment plan summary view
- [ ] Upcoming payments display

### 2. API Integration
- [ ] Eligibility check endpoint integration
- [ ] Payment plan creation endpoint
- [ ] Redirect to provider checkout
- [ ] Handle return from provider
- [ ] Display payment plan details
- [ ] Installment payment interface

### 3. User Experience
- [ ] Loading states for API calls
- [ ] Error messages user-friendly
- [ ] Success confirmations
- [ ] Mobile-responsive design
- [ ] Accessibility compliance

## Compliance Checklist

### Legal & Regulatory
- [ ] Terms of service updated for BNPL
- [ ] Privacy policy includes BNPL data sharing
- [ ] Consent flow for provider redirect
- [ ] Clear disclosure of terms and fees
- [ ] Compliance with consumer protection laws

### Financial
- [ ] Proper accounting for installment payments
- [ ] Revenue recognition policies updated
- [ ] Refund processing compliant
- [ ] Tax implications reviewed

## Performance Checklist

### 1. API Response Times
- [ ] Eligibility check < 1s
- [ ] Session creation < 2s
- [ ] Authorization < 3s
- [ ] Webhook processing < 1s

### 2. Optimization
- [ ] Provider API calls cached where appropriate
- [ ] Database queries optimized
- [ ] Webhook processing asynchronous
- [ ] Error retry logic implemented

## Support Checklist

### Customer Support
- [ ] Support team trained on BNPL
- [ ] Refund process documented
- [ ] Cancellation process documented
- [ ] Troubleshooting guide for common issues
- [ ] Escalation process for provider issues

### Technical Support
- [ ] On-call rotation includes BNPL
- [ ] Runbook for common issues
- [ ] Provider support contacts documented
- [ ] Monitoring dashboards configured
- [ ] Alert thresholds configured

## Sign-off

- [ ] Development complete
- [ ] Testing complete
- [ ] Security review complete
- [ ] Documentation complete
- [ ] Stakeholder approval
- [ ] Ready for production deployment

---

**Last Updated**: [Date]
**Reviewed By**: [Name]
**Status**: [Draft/In Progress/Complete]
