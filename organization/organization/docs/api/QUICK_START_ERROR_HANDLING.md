# Quick Start: Implementing Error Handling

## TL;DR

Custom exception classes have been created. Follow these steps to apply them:

## Step 1: Review Files Created (5 minutes)

```bash
# Navigate to the exceptions directory
cd src/common/exceptions/

# Review the exception classes
cat payment.exception.ts   # Payment-related exceptions
cat email.exception.ts     # Email-related exceptions
cat kyc.exception.ts       # KYC-related exceptions
```

## Step 2: Update Service Imports (2 minutes each)

### Payments Service
```typescript
// Add to src/modules/payments/payments.service.ts (line 3)
import {
  PaymentProviderNotConfiguredException,
  PaymentIntentCreationException,
  PaymentProcessingException,
  RefundFailedException,
  PaymentWebhookVerificationException,
  InvalidPaymentAmountException,
  PayPalOrderCreationException,
  PayPalCaptureException,
  CardDeclinedException,
  PaymentException,
} from '@/common/exceptions';
```

### Email Service
```typescript
// Add to src/modules/email/email.service.ts (line 11)
import {
  EmailSendingException,
  SmtpConnectionException,
  SmtpAuthenticationException,
  EmailTemplateNotFoundException,
  TransientEmailException,
  InvalidEmailAddressException,
} from '@/common/exceptions';
```

### KYC Service
```typescript
// Add to src/modules/organization-kyc/services/kyc-provider.service.ts (line 13)
import {
  KycApplicationNotFoundException,
  KycVerificationNotInitiatedException,
  KycDocumentUploadException,
  KycDocumentInvalidException,
  KycApplicantCreationException,
  KycCheckCreationException,
  KycCheckRetrievalException,
  KycWebhookVerificationException,
} from '@/common/exceptions';
```

## Step 3: Apply Key Changes (Use Implementation Guide)

Open `ERROR_HANDLING_IMPLEMENTATION_GUIDE.md` and apply changes to:

1. **Payments Service** (Section 1)
   - Replace try-catch blocks in `createPaymentIntent`
   - Add error categorization in `createStripeRefund`
   - Enhance PayPal error handling

2. **Email Service** (Section 2)
   - Add retry logic to `sendEmail`
   - Enhance template error handling
   - Implement email queueing for failures

3. **KYC Service** (Section 3)
   - Add document validation
   - Enhance API error handling
   - Improve webhook processing

## Step 4: Test (10 minutes)

```bash
# Run unit tests
npm run test

# Test specific services
npm run test payments.service
npm run test email.service
npm run test kyc-provider.service
```

## Step 5: Deploy (When Ready)

1. Test in development
2. Deploy to staging
3. Monitor error logs
4. Deploy to production

## Common Patterns

### Pattern 1: Wrap External API Calls
```typescript
try {
  const result = await externalAPI.call();
  return result;
} catch (error: any) {
  this.logger.error('API call failed', { error: error.message });

  // Categorize the error
  if (error.status >= 500) {
    throw new ServiceException('Temporary failure', true); // isTransient
  }

  throw new ServiceException(error.message, false);
}
```

### Pattern 2: Validate Before Processing
```typescript
// Validate input
if (amount <= 0) {
  throw new InvalidAmountException(amount, 'Amount must be positive');
}

try {
  // Process
} catch (error) {
  // Handle
}
```

### Pattern 3: Retry with Backoff
```typescript
async function withRetry(operation, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      if (!error.isTransient || i === maxRetries - 1) throw error;
      await delay(Math.pow(2, i) * 1000);
    }
  }
}
```

## Exception Usage Examples

### Payments
```typescript
// Invalid amount
throw new InvalidPaymentAmountException(amount, 'Amount must be > 0');

// Card declined
throw new CardDeclinedException('Insufficient funds', { code: 'card_declined' });

// Provider not configured
throw new PaymentProviderNotConfiguredException('Stripe', {
  missingConfig: ['STRIPE_SECRET_KEY'],
});
```

### Email
```typescript
// Template not found
throw new EmailTemplateNotFoundException('welcome-email', { path: templatePath });

// SMTP error
throw new SmtpConnectionException('smtp.example.com', 587, 'Connection timeout', true);

// Invalid email
throw new InvalidEmailAddressException('invalid@email');
```

### KYC
```typescript
// Application not found
throw new KycApplicationNotFoundException(orgId, 'organizationId');

// Document invalid
throw new KycDocumentInvalidException('passport', ['Document expired', 'Poor quality']);

// API error
throw new KycApiCommunicationException('Onfido', 'applicants', 500, 'Server error', true);
```

## Error Response Format

All exceptions return:
```json
{
  "message": "Human-readable error message",
  "code": "UNIQUE_ERROR_CODE",
  "metadata": {
    "field1": "value1",
    "isTransient": true
  },
  "timestamp": "2025-12-04T12:00:00.000Z"
}
```

## Logging Best Practices

```typescript
// ✅ Good
this.logger.error('Payment failed', {
  paymentIntentId,
  amount,
  currency,
  error: error.message,
  code: error.code,
  isTransient: error.isTransient,
});

// ❌ Bad
this.logger.error('Error:', error);
```

## Quick Checklist

- [ ] Custom exceptions created in `src/common/exceptions/`
- [ ] Imports added to service files
- [ ] Try-catch blocks updated with specific exceptions
- [ ] Retry logic implemented for transient errors
- [ ] Email queueing for failed sends
- [ ] Validation before processing
- [ ] Structured logging in catch blocks
- [ ] Tests updated/created
- [ ] Documentation reviewed

## Need Help?

1. **Full details**: Read `ERROR_HANDLING_IMPLEMENTATION_GUIDE.md`
2. **Overview**: Read `ERROR_HANDLING_SUMMARY.md`
3. **Code examples**: Check the implementation guide sections

## Files Structure

```
src/common/exceptions/
├── index.ts                    # Export all exceptions
├── payment.exception.ts        # 14 payment exceptions
├── email.exception.ts          # 14 email exceptions
└── kyc.exception.ts            # 16 KYC exceptions

Documentation:
├── ERROR_HANDLING_SUMMARY.md           # High-level overview
├── ERROR_HANDLING_IMPLEMENTATION_GUIDE.md  # Detailed guide
└── QUICK_START_ERROR_HANDLING.md       # This file
```

## Time Estimate

- Review files: 5 minutes
- Add imports: 10 minutes
- Apply key changes: 2-3 hours
- Testing: 1 hour
- Documentation: 30 minutes

**Total: ~4 hours for core implementation**

## Support

If you encounter issues:
1. Check the implementation guide for detailed examples
2. Review the exception class comments
3. Verify imports are correct
4. Check TypeScript compilation errors
5. Run tests to validate behavior

---

**Ready to start?** Begin with Step 1 above!
