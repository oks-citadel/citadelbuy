# Real KYC Provider Integration Implementation Guide

## Overview

This document describes the real KYC provider integration implemented in the Broxiva platform. The mock KYC implementation has been replaced with production-ready integrations for Onfido, Jumio, and Sumsub.

## Implemented Features

### 1. Real KYC Provider Integrations

#### Onfido Provider
- **Document Verification**: Validates ID documents, passports, driver's licenses
- **Face Matching**: Compares photo on ID with selfie
- **Liveness Detection**: Video-based liveness checks to prevent spoofing
- **Data Extraction**: OCR extraction of personal data from documents
- **AML/Sanctions Screening**: Identity Enhanced reports include PEP, sanctions, and watchlist screening
- **Proof of Address**: Utility bill verification

#### Jumio Provider
- **ID Verification**: Workflow-based identity verification
- **Biometric Verification**: Face matching and liveness detection
- **Document Authentication**: AI-powered fraud detection
- **Data Extraction**: Automatic extraction of document data
- **AML Compliance**: Built-in compliance screening

#### Sumsub Provider
- **Document Verification**: Multi-document type support
- **Identity Verification**: Comprehensive identity checks
- **Face Matching**: Biometric verification
- **Address Verification**: Proof of residence checks
- **AML/KYC Compliance**: Sanctions, PEP, and adverse media screening

### 2. Core Implementation Components

#### KycProviderService
**Location**: `services/kyc-provider.service.ts`

**Responsibilities**:
- Provider selection and initialization
- Applicant creation in provider system
- Document upload to provider
- Verification check creation
- Webhook processing for async results
- Email notifications based on verification status

**Key Methods**:
```typescript
- initiateVerification(organizationId, userId, ipAddress)
- submitDocument(organizationId, userId, documentType, file, ...)
- createVerificationCheck(organizationId, userId, ipAddress)
- getCheckStatus(checkId)
- processWebhook(payload, signature, organizationId, providerName)
```

#### KycVerificationProcessor
**Location**: `processors/kyc-verification.processor.ts`

**Responsibilities**:
- Async verification processing
- Integration with KycProviderService
- Score calculation from verification results
- Database updates with verification data
- Fallback to mock mode for development

**Key Methods**:
```typescript
- processVerification(kycApplicationId)
- performVerificationSteps(kycApplicationId)
- calculateVerificationScore(checkReport)
- retryVerification(kycApplicationId)
```

#### Provider Implementations

**Onfido Provider** (`providers/onfido.provider.ts`):
- Full axios integration with authentication
- Automatic retry logic with exponential backoff
- Rate limit handling (429 responses)
- Webhook signature verification (HMAC-SHA256)
- Comprehensive error handling
- Mock mode support for development

**Jumio Provider** (`providers/jumio.provider.ts`):
- Workflow-based API integration
- Basic authentication (API token + secret)
- Document upload via workflow
- Webhook signature verification
- Mock mode support

**Sumsub Provider** (`providers/sumsub.provider.ts`):
- Custom signature authentication
- Applicant-based verification flow
- Multi-document support
- Webhook signature verification
- Mock mode support

### 3. Error Handling and Retry Logic

#### Automatic Retries
- **Exponential Backoff**: Failed requests retry with increasing delays (1s, 2s, 4s)
- **Max Retries**: 3 attempts by default
- **Rate Limit Handling**: Respects `Retry-After` headers
- **Server Error Recovery**: Automatic retry on 5xx errors

#### Error Logging
- Detailed error logging with request/response data
- Error categorization (client errors vs server errors)
- Audit trail for all verification events

### 4. Webhook Integration

#### Webhook Flow
1. Provider completes verification check
2. Provider sends webhook to `/api/kyc/webhook/:provider`
3. Signature verification (HMAC-SHA256)
4. Payload parsing and validation
5. Database update with verification results
6. Email notification to organization
7. Audit log entry

#### Webhook Signature Verification
- **Onfido**: `X-SHA2-Signature` header with SHA-256 HMAC
- **Jumio**: `X-Jumio-Signature` header with `sha256=<hash>` format
- **Sumsub**: `X-Payload-Digest` header with SHA-256 HMAC

#### Webhook Security
- Signature verification prevents unauthorized requests
- Timing-safe comparison to prevent timing attacks
- Configurable webhook tokens per provider

### 5. Document Storage Integration

**DocumentStorageService** handles encrypted document storage:
- **Encryption**: AES-256-GCM encryption for all documents
- **Storage Options**: Local filesystem, AWS S3, Azure Blob Storage
- **Metadata**: Document type, size, upload date, encryption info
- **Access Control**: Pre-signed URLs for secure document access

### 6. Verification Score Calculation

The system calculates a verification score (0-1) based on multiple factors:

| Check Type | Weight | Clear Score | Consider Score |
|------------|--------|-------------|----------------|
| Document Authenticity | 30% | 0.30 | 0.15 |
| Face Comparison | 25% | 0.25 | 0.12 |
| Liveness Check | 20% | 0.20 | 0.10 |
| Address Verification | 15% | 0.15 | 0.07 |
| Data Consistency | 10% | 0.10 | 0.05 |

**Thresholds**:
- **Auto-Approve**: Score >= 0.85
- **Manual Review**: Score between 0.65 and 0.85
- **Reject**: Score < 0.65

## Configuration

### Environment Variables

#### Provider Selection
```env
# Choose provider: onfido, jumio, sumsub, mock
KYC_PROVIDER=onfido
NODE_ENV=production
```

#### Onfido Configuration
```env
ONFIDO_API_TOKEN=your_onfido_api_token_here
ONFIDO_WEBHOOK_TOKEN=your_onfido_webhook_token_here
ONFIDO_REGION=us  # Options: us, eu, ca
```

#### Jumio Configuration
```env
JUMIO_API_TOKEN=your_jumio_api_token_here
JUMIO_API_SECRET=your_jumio_api_secret_here
JUMIO_WEBHOOK_SECRET=your_jumio_webhook_secret_here
JUMIO_DATACENTER=us  # Options: us, eu, sg
```

#### Sumsub Configuration
```env
SUMSUB_APP_TOKEN=your_sumsub_app_token_here
SUMSUB_SECRET_KEY=your_sumsub_secret_key_here
SUMSUB_WEBHOOK_SECRET=your_sumsub_webhook_secret_here
```

#### Document Storage
```env
KYC_ENCRYPTION_KEY=your_256_bit_encryption_key_in_hex_format
STORAGE_PROVIDER=S3  # Options: S3, AZURE, LOCAL

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
STORAGE_BUCKET=kyc-documents

# Azure Blob Storage
AZURE_STORAGE_ACCOUNT=your_storage_account
AZURE_STORAGE_KEY=your_storage_key
AZURE_STORAGE_CONTAINER=kyc-documents
```

## API Flow

### Complete KYC Verification Flow

#### Step 1: Submit KYC Application
```http
POST /api/kyc/submit
Content-Type: application/json

{
  "businessName": "Acme Corp",
  "businessAddress": "123 Main St",
  "taxId": "12-3456789",
  "documents": {
    "idDocument": "base64_encoded_file",
    "addressProof": "base64_encoded_file"
  }
}
```

#### Step 2: Automatic Provider Integration
The system automatically:
1. Creates applicant in provider system
2. Uploads documents to provider
3. Creates verification check
4. Updates database with provider IDs

#### Step 3: Provider Processing
The provider performs:
1. Document authenticity verification
2. OCR data extraction
3. Face matching (if selfie provided)
4. Liveness detection
5. AML/PEP/Sanctions screening
6. Address verification

#### Step 4: Webhook Callback
Provider sends results via webhook:
```http
POST /api/kyc/webhook/onfido
X-SHA2-Signature: <signature>
Content-Type: application/json

{
  "id": "check_abc123",
  "status": "complete",
  "result": "clear",
  "breakdown": {
    "document": { "result": "clear" },
    "facial_similarity_photo": { "result": "clear" }
  }
}
```

#### Step 5: Application Update
The system:
1. Verifies webhook signature
2. Parses verification results
3. Calculates verification score
4. Updates KYC application status
5. Sends email notification
6. Creates audit log entry

#### Step 6: Admin Review (if needed)
For applications requiring manual review:
```http
POST /api/kyc/:id/review
Content-Type: application/json

{
  "action": "approve",
  "notes": "All documents verified successfully"
}
```

## Development vs Production

### Development Mode (Mock Provider)
```env
KYC_PROVIDER=mock
NODE_ENV=development
```

**Behavior**:
- No real API calls to external providers
- Simulated verification results
- Instant processing (no async delays)
- All results marked with `isMockData: true`
- No actual costs incurred

**Use Cases**:
- Local development
- Testing application flow
- UI/UX development
- Integration testing without provider costs

### Production Mode (Real Provider)
```env
KYC_PROVIDER=onfido
NODE_ENV=production
ONFIDO_API_TOKEN=live_abc123...
```

**Behavior**:
- Real API calls to provider
- Actual document verification
- Async processing via webhooks
- Real verification scores
- Provider costs apply

**Requirements**:
- Valid provider API credentials
- Webhook endpoint configured in provider dashboard
- SSL certificate for webhook endpoint
- Proper error monitoring and logging

## Security Considerations

### Document Encryption
- **Algorithm**: AES-256-GCM
- **Key Storage**: Environment variable (rotate regularly)
- **IV Generation**: Unique random IV per document
- **Auth Tag**: Integrity verification

### Webhook Security
- **Signature Verification**: HMAC-SHA256 with secret token
- **Timing Attack Prevention**: Constant-time comparison
- **Request Validation**: Payload schema validation
- **IP Whitelisting**: Optional provider IP restrictions

### Data Privacy
- **PII Encryption**: All personal data encrypted at rest
- **Minimal Storage**: Only store necessary verification data
- **Data Retention**: Configurable retention policies
- **GDPR Compliance**: Right to deletion support

### Access Control
- **API Authentication**: JWT tokens required
- **Role-Based Access**: Admin, reviewer, submitter roles
- **Audit Logging**: All access logged with IP and user
- **Rate Limiting**: Prevent abuse and DOS

## Monitoring and Logging

### Key Metrics to Monitor
- **Verification Success Rate**: % of successful verifications
- **Average Processing Time**: Time from submit to decision
- **Provider API Latency**: Response times from providers
- **Webhook Delivery Rate**: % of webhooks successfully processed
- **Error Rate**: Failed verifications and API errors
- **Cost per Verification**: Provider costs tracking

### Logging
```typescript
// All important events are logged
this.logger.log('KYC verification initiated', { kycId, provider });
this.logger.warn('Rate limited by provider', { provider, retryAfter });
this.logger.error('Verification failed', { error, kycId });
```

### Audit Trail
Every action is recorded in `organization_audit_logs`:
- `kyc.provider_initiated`
- `kyc.document_submitted_to_provider`
- `kyc.check_created`
- `kyc.webhook_processed`
- `kyc.manually_reviewed`
- `kyc.approved`
- `kyc.rejected`

## Testing

### Unit Tests
```bash
npm test kyc-provider.service.spec.ts
npm test kyc-verification.processor.spec.ts
npm test onfido.provider.spec.ts
```

### Integration Tests
```bash
npm run test:e2e kyc-workflow.e2e.spec.ts
```

### Manual Testing with Mock Mode
1. Set `KYC_PROVIDER=mock`
2. Submit KYC application
3. Verify mock data is returned
4. Check `isMockData: true` flag
5. Test webhook flow with mock signatures

### Testing with Real Provider (Sandbox)
1. Use provider sandbox/test credentials
2. Set `KYC_PROVIDER=onfido`
3. Upload test documents provided by provider
4. Verify real API integration
5. Test webhook delivery to local ngrok tunnel

## Troubleshooting

### Common Issues

#### 1. "Failed to create KYC applicant"
**Cause**: Invalid API credentials or network error
**Solution**:
- Verify `ONFIDO_API_TOKEN` is correct
- Check network connectivity to provider API
- Review provider API status page

#### 2. "Webhook signature verification failed"
**Cause**: Incorrect webhook token or payload tampering
**Solution**:
- Verify `ONFIDO_WEBHOOK_TOKEN` matches provider dashboard
- Check that payload hasn't been modified
- Ensure webhook is sent from provider's IP range

#### 3. "Rate limited by provider"
**Cause**: Too many API requests
**Solution**:
- System automatically retries after delay
- Review rate limit quotas with provider
- Consider upgrading plan if limits too low

#### 4. "Document upload failed"
**Cause**: File size, format, or quality issues
**Solution**:
- Check file size limits (usually 10MB)
- Ensure file format is supported (JPEG, PNG, PDF)
- Verify image quality meets minimum requirements

#### 5. "Verification stuck in UNDER_REVIEW"
**Cause**: Webhook not received or processed
**Solution**:
- Check webhook endpoint is accessible
- Manually poll check status: `GET /api/kyc/:id/status`
- Review provider dashboard for webhook delivery status
- Check webhook error logs in provider dashboard

### Debug Mode
Enable detailed logging:
```typescript
// In provider service
this.logger.setLogLevels(['log', 'error', 'warn', 'debug', 'verbose']);
```

## Migration from Mock to Production

### Pre-Migration Checklist
- [ ] Provider account created and verified
- [ ] API credentials obtained (live/production keys)
- [ ] Webhook endpoint configured in provider dashboard
- [ ] SSL certificate installed and valid
- [ ] Environment variables updated with production credentials
- [ ] Document storage configured (S3/Azure)
- [ ] Encryption keys generated and secured
- [ ] Monitoring and alerting configured
- [ ] Cost tracking and budgets set up

### Migration Steps
1. **Test in Sandbox**: Verify integration with provider sandbox
2. **Update Environment**: Switch to production credentials
3. **Deploy Application**: Deploy with new configuration
4. **Verify Webhooks**: Test webhook delivery to production endpoint
5. **Monitor Initial Verifications**: Closely monitor first 10-20 verifications
6. **Scale Gradually**: Gradually increase verification volume
7. **Review Costs**: Monitor provider costs and optimize if needed

### Rollback Plan
If issues occur:
1. Switch `KYC_PROVIDER=mock`
2. Redeploy application
3. Existing verifications in progress will fail gracefully
4. New submissions use mock mode
5. Investigate and fix issues
6. Re-attempt migration when ready

## Cost Optimization

### Provider Cost Comparison

| Provider | Document Check | Face Match | ID Enhanced | Per Month Base |
|----------|---------------|------------|-------------|----------------|
| Onfido | $1-2 | $0.50 | $3-5 | $0-500 |
| Jumio | $2-3 | Included | $4-6 | $0-1000 |
| Sumsub | $1.50-2.50 | $0.40 | $3-4 | $0-300 |

**Note**: Prices vary by volume, region, and contract terms

### Cost Reduction Strategies
1. **Batch Processing**: Group verifications to reduce per-check costs
2. **Selective Checks**: Only run necessary checks (e.g., skip face match for documents only)
3. **Webhook Mode**: Avoid polling, use webhooks for async updates
4. **Caching**: Cache verification results to avoid duplicate checks
5. **Volume Discounts**: Negotiate rates for high volume

## Support and Resources

### Provider Documentation
- **Onfido**: https://documentation.onfido.com/
- **Jumio**: https://docs.jumio.com/
- **Sumsub**: https://developers.sumsub.com/

### Support Channels
- **Onfido**: support@onfido.com
- **Jumio**: support@jumio.com
- **Sumsub**: support@sumsub.com

### Internal Support
- **Developer**: Check code comments and TypeScript types
- **Logs**: Review application logs for detailed error messages
- **Audit Trail**: Check `organization_audit_logs` table
- **Database**: Review `kyc_applications` table for verification data

## Future Enhancements

### Planned Features
1. **Queue Integration**: BullMQ for async job processing
2. **Multi-Provider Fallback**: Automatic fallback to secondary provider
3. **AI-Powered Risk Scoring**: Machine learning for fraud detection
4. **Real-Time Verification**: Instant verification for low-risk cases
5. **Advanced Analytics**: Dashboard for verification metrics
6. **A/B Testing**: Compare provider performance and costs
7. **OCR Enhancement**: Additional OCR providers for better accuracy
8. **Liveness Detection**: Enhanced video liveness checks
9. **Cross-Border Verification**: Support for international documents
10. **Blockchain Verification**: Store verification hashes on blockchain

## Conclusion

The KYC provider integration is production-ready with support for Onfido, Jumio, and Sumsub. The implementation includes:

✅ Real API integration with retry logic and error handling
✅ Webhook support for async verification updates
✅ Document encryption and secure storage
✅ Comprehensive audit logging
✅ Email notifications
✅ Mock mode for development
✅ Flexible provider selection
✅ Verification score calculation
✅ AML/Sanctions screening support

The system is designed to be:
- **Secure**: Encryption, signature verification, access control
- **Scalable**: Async processing, rate limiting, caching
- **Reliable**: Retry logic, error handling, fallback mechanisms
- **Observable**: Logging, monitoring, audit trail
- **Cost-Effective**: Selective checks, webhook mode, batch processing

For production deployment, ensure all environment variables are configured, webhooks are tested, and monitoring is in place.
