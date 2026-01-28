# KYC Webhook Handlers Documentation

## Overview

This document provides comprehensive information about the KYC (Know Your Customer) webhook handlers implemented for identity verification providers: Onfido, Jumio, and Sumsub.

## Supported Providers

### 1. Onfido
- **Endpoint**: `POST /webhooks/kyc/onfido`
- **Signature Header**: `X-SHA2-Signature`
- **Algorithm**: HMAC SHA-256

### 2. Jumio
- **Endpoint**: `POST /webhooks/kyc/jumio`
- **Signature Header**: `X-Jumio-Signature`
- **Algorithm**: HMAC SHA-256
- **Format**: `sha256=<hash>`

### 3. Sumsub (Sum&Substance)
- **Endpoint**: `POST /webhooks/kyc/sumsub`
- **Signature Header**: `X-Payload-Digest`
- **Algorithm**: HMAC SHA-256

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Webhook Flow                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Provider (Onfido/Jumio/Sumsub)                             │
│           │                                                  │
│           ▼                                                  │
│  KycWebhookController                                        │
│           │                                                  │
│           ├─► Signature Validation                          │
│           │                                                  │
│           ▼                                                  │
│  KycProviderService                                          │
│           │                                                  │
│           ├─► Provider-specific parsing                     │
│           ├─► Database update                               │
│           ├─► Audit logging                                 │
│           │                                                  │
│           ▼                                                  │
│  EmailService                                                │
│           │                                                  │
│           └─► Notification emails                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Webhook Implementation Details

### 1. Onfido Webhook Handler

**Location**: `controllers/kyc-webhook.controller.ts`

**Features**:
- HMAC SHA-256 signature verification
- Supports all Onfido check types (document, facial similarity, identity)
- Automatic status mapping
- Email notifications

**Example Payload**:
```json
{
  "payload": {
    "object": {
      "id": "check_123456",
      "status": "complete",
      "result": "clear",
      "applicant_id": "applicant_123",
      "completed_at": "2025-12-06T12:00:00Z",
      "output": {
        "result": "clear",
        "breakdown": {
          "document_authenticity": {
            "result": "clear"
          },
          "face_comparison": {
            "result": "clear"
          }
        }
      }
    }
  }
}
```

### 2. Jumio Webhook Handler

**Location**: `controllers/kyc-webhook.controller.ts`

**Features**:
- HMAC SHA-256 signature verification with `sha256=` prefix
- Workflow execution tracking
- Document verification, liveness, and AML checks
- Detailed breakdown parsing

**Example Payload**:
```json
{
  "workflowExecution": {
    "id": "workflow_123456",
    "status": "PROCESSED",
    "completedAt": "2025-12-06T12:00:00Z",
    "href": "https://netverify.jumio.com/api/v4/workflow/executions/workflow_123456"
  },
  "decision": {
    "type": "PASSED"
  },
  "capabilities": {
    "documentVerification": {
      "decision": {
        "type": "PASSED",
        "details": {
          "documentClassification": "PASSPORT"
        }
      }
    },
    "similarity": {
      "decision": {
        "type": "PASSED",
        "details": {
          "similarity": 95
        }
      }
    },
    "liveness": {
      "decision": {
        "type": "PASSED"
      }
    }
  }
}
```

### 3. Sumsub Webhook Handler

**Location**: `controllers/kyc-webhook.controller.ts`

**Features**:
- HMAC SHA-256 signature verification
- Applicant review status tracking
- Multiple check result types (IDENTITY, SELFIE, PROOF_OF_RESIDENCE, WATCHLIST)
- Color-coded results (GREEN/YELLOW/RED)

**Example Payload**:
```json
{
  "applicantId": "applicant_123456",
  "inspectionId": "inspection_123",
  "correlationId": "correlation_123",
  "externalUserId": "org_123",
  "type": "applicantReviewed",
  "reviewStatus": "completed",
  "reviewResult": {
    "reviewAnswer": "GREEN",
    "moderationComment": "Document verified",
    "checkResults": {
      "IDENTITY": {
        "answer": "GREEN"
      },
      "SELFIE": {
        "answer": "GREEN"
      },
      "WATCHLIST": {
        "answer": "GREEN",
        "hits": []
      }
    }
  },
  "createdAt": "2025-12-06T12:00:00Z"
}
```

## Provider Integration Details

### Onfido Provider (`providers/onfido.provider.ts`)

**Key Features**:
- Document verification (passport, driver's license, ID card)
- Facial similarity checks
- Identity verification
- Proof of address verification
- Mock mode for development

**Configuration**:
```env
ONFIDO_API_TOKEN=your_token
ONFIDO_WEBHOOK_TOKEN=your_webhook_token
ONFIDO_REGION=us  # or eu
```

### Jumio Provider (`providers/jumio.provider.ts`)

**Key Features**:
- Workflow-based verification
- Document verification with multiple types
- Liveness detection
- AML/Sanctions screening
- Face matching
- Mock mode for development

**Configuration**:
```env
JUMIO_API_TOKEN=your_token
JUMIO_API_SECRET=your_secret
JUMIO_WEBHOOK_SECRET=your_webhook_secret
JUMIO_DATACENTER=us  # or eu
```

### Sumsub Provider (`providers/sumsub.provider.ts`)

**Key Features**:
- Complete identity verification
- Document verification with OCR
- Selfie verification
- Proof of residence
- AML/Watchlist screening
- Custom signature authentication
- Mock mode for development

**Configuration**:
```env
SUMSUB_APP_TOKEN=your_app_token
SUMSUB_SECRET_KEY=your_secret_key
SUMSUB_WEBHOOK_SECRET=your_webhook_secret
```

## Webhook Processing Flow

### 1. Signature Verification
Each provider has a unique signature verification method:

```typescript
// Onfido
const hmac = crypto.createHmac('sha256', webhookSecret);
const expectedSignature = hmac.update(payload).digest('hex');

// Jumio (with sha256= prefix)
const providedSignature = signature.replace('sha256=', '');

// Sumsub (lowercase hex)
const providedSignature = signature.toLowerCase();
```

### 2. Payload Parsing
Provider-specific parsing converts webhook data to a common format:

```typescript
interface KycWebhookPayload {
  id: string;
  status: KycCheckStatus;
  completedAt?: string;
  href?: string;
  output?: {
    result: KycCheckResult;
    subResult?: string;
    breakdown?: any;
    properties?: any;
  };
  applicantId?: string;
  checkId?: string;
}
```

### 3. Status Mapping

**Status Mapping**:
- `PENDING` → Verification not started or awaiting documents
- `IN_PROGRESS` → Verification in progress
- `COMPLETE` → Verification completed
- `WITHDRAWN` → Verification cancelled
- `PAUSED` → Verification on hold
- `REOPENED` → Verification restarted

**Result Mapping**:
- `CLEAR` → Verification passed (GREEN in Sumsub, PASSED in Jumio)
- `CONSIDER` → Manual review needed (YELLOW in Sumsub, WARNING in Jumio)
- `UNIDENTIFIED` → Verification failed (RED in Sumsub, REJECTED in Jumio)

### 4. Database Updates

The webhook handler updates the KYC application with:
- Verification status
- Provider-specific results
- Document verification flags
- Address verification flags
- Business verification flags
- Verification score
- Audit trail

### 5. Notifications

Email notifications are sent based on the final status:
- **APPROVED**: `kyc-approved.hbs` template
- **REJECTED**: `kyc-rejected.hbs` template with rejection reasons
- **UNDER_REVIEW**: `kyc-pending-review.hbs` template

## Error Handling

### Common Errors

1. **Missing Signature**
```json
{
  "statusCode": 400,
  "message": "Missing webhook signature",
  "error": "Bad Request"
}
```

2. **Invalid Signature**
```json
{
  "statusCode": 400,
  "message": "Invalid webhook signature",
  "error": "Bad Request"
}
```

3. **KYC Application Not Found**
```
Webhook processed but no action taken (logged as warning)
```

### Error Logging

All errors are logged with:
- Timestamp
- Provider name
- Check ID
- Error message
- Stack trace (in development)

## Testing

### Development Mode

All providers support mock mode when API credentials are not configured:

```typescript
// Automatically enabled when:
// - API token is not set
// - NODE_ENV === 'development'

// Mock responses return:
// - Random applicant IDs
// - CLEAR verification results
// - Complete document data
```

### Test Endpoint

A test endpoint is available for webhook testing:

```bash
POST /webhooks/kyc/test
Content-Type: application/json

{
  "provider": "onfido",
  "status": "complete",
  "result": "clear"
}
```

### Manual Testing

**Onfido**:
```bash
curl -X POST http://localhost:3000/webhooks/kyc/onfido \
  -H "Content-Type: application/json" \
  -H "X-SHA2-Signature: <signature>" \
  -d '{
    "payload": {
      "object": {
        "id": "check_123",
        "status": "complete",
        "result": "clear"
      }
    }
  }'
```

**Jumio**:
```bash
curl -X POST http://localhost:3000/webhooks/kyc/jumio \
  -H "Content-Type: application/json" \
  -H "X-Jumio-Signature: sha256=<signature>" \
  -d '{
    "workflowExecution": {
      "id": "workflow_123",
      "status": "PROCESSED"
    },
    "decision": {
      "type": "PASSED"
    }
  }'
```

**Sumsub**:
```bash
curl -X POST http://localhost:3000/webhooks/kyc/sumsub \
  -H "Content-Type: application/json" \
  -H "X-Payload-Digest: <signature>" \
  -d '{
    "applicantId": "applicant_123",
    "type": "applicantReviewed",
    "reviewStatus": "completed",
    "reviewResult": {
      "reviewAnswer": "GREEN"
    }
  }'
```

## Security Best Practices

### 1. Signature Verification
- **Always verify** webhook signatures in production
- Use timing-safe comparison to prevent timing attacks
- Store webhook secrets securely in environment variables

### 2. IP Whitelisting (Optional)
Consider implementing IP whitelisting for additional security:

**Onfido IPs**:
- US: `52.70.94.0/24`
- EU: `35.157.83.0/24`

**Jumio IPs**: Contact Jumio support for current IP ranges

**Sumsub IPs**: Contact Sumsub support for current IP ranges

### 3. Rate Limiting
Implement rate limiting on webhook endpoints to prevent abuse:

```typescript
@Throttle({ default: { limit: 100, ttl: 60000 } })
```

### 4. Audit Logging
All webhook events are logged to the audit trail with:
- Organization ID
- User ID (system for automated events)
- Action type
- Resource details
- IP address (if available)
- Timestamp

## Monitoring and Alerting

### Recommended Monitoring

1. **Webhook Success Rate**
   - Track successful vs. failed webhook processing
   - Alert on success rate < 95%

2. **Processing Time**
   - Monitor webhook processing duration
   - Alert on processing time > 5 seconds

3. **Signature Validation Failures**
   - Track signature validation failures
   - Alert on > 5 failures per hour

4. **Provider Availability**
   - Monitor provider API response times
   - Track provider error rates

### Logging Levels

- **INFO**: Successful webhook processing, status updates
- **WARN**: Missing signatures (in dev), unknown providers, application not found
- **ERROR**: Signature validation failures, processing errors, email failures
- **DEBUG**: Detailed payload information, provider-specific debugging

## Troubleshooting

### Issue: Webhook Not Processing

**Possible Causes**:
1. Invalid signature
2. Wrong webhook secret
3. Payload format mismatch
4. KYC application not found

**Resolution**:
1. Check webhook secret configuration
2. Verify payload format matches provider documentation
3. Check application logs for detailed error messages
4. Ensure KYC application exists in database

### Issue: Email Not Sent

**Possible Causes**:
1. Email service not configured
2. Organization has no primary email
3. Email template not found

**Resolution**:
1. Check email service configuration
2. Verify organization email in database
3. Ensure email templates exist in `modules/email/templates/`

### Issue: Incorrect Status Mapping

**Possible Causes**:
1. Provider status changed in API update
2. Custom status values not mapped

**Resolution**:
1. Update status mapping in provider implementation
2. Add new status values to mapping dictionaries
3. Test with provider's sandbox environment

## Performance Optimization

### 1. Async Processing
Webhooks are processed asynchronously to avoid blocking:

```typescript
// Email sending is non-blocking
await this.sendKycNotificationEmail(...).catch(error => {
  this.logger.error('Email failed but webhook continues', error);
});
```

### 2. Database Queries
Optimized database queries using Prisma:
- Index on `verificationData.providerCheckId`
- Single update query per webhook

### 3. Caching
Consider implementing caching for:
- Provider configurations
- Organization lookups
- Template rendering

## Future Enhancements

### Planned Features

1. **Retry Mechanism**
   - Automatic retry on transient failures
   - Exponential backoff
   - Dead letter queue for failed webhooks

2. **Webhook Replay**
   - Store raw webhook payloads
   - Admin endpoint to replay webhooks
   - Useful for debugging and recovery

3. **Multi-Provider Support**
   - Support multiple providers per organization
   - Provider failover
   - Provider comparison

4. **Advanced Analytics**
   - Webhook processing metrics
   - Provider performance comparison
   - Verification success rates by provider

5. **Compliance Enhancements**
   - Enhanced AML screening integration
   - Sanctions list checking
   - Adverse media screening

## Support and Documentation

### Provider Documentation Links

- **Onfido**: https://documentation.onfido.com/
- **Jumio**: https://docs.jumio.com/
- **Sumsub**: https://developers.sumsub.com/

### Internal Documentation

- Provider Interface: `providers/kyc-provider.interface.ts`
- KYC Service: `services/kyc.service.ts`
- Provider Service: `services/kyc-provider.service.ts`
- Email Templates: `../email/templates/kyc-*.hbs`

### Contact

For questions or issues, contact the platform team or create an issue in the repository.

---

**Last Updated**: 2025-12-06
**Version**: 1.0.0
**Maintainer**: Platform Team
