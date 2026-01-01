# Organization KYC Module

## Overview

The Organization KYC (Know Your Customer) module provides secure identity verification and compliance features for organizations on the Broxiva platform. This module implements industry-standard security practices including AES-256-GCM encryption, PII masking, and comprehensive audit logging.

## Features

### Core Functionality
- ✅ KYC application submission with business details
- ✅ Secure document upload with pre-signed URLs
- ✅ Automated verification processing
- ✅ Admin review workflow (approve/reject/request more info)
- ✅ Real-time status tracking
- ✅ Comprehensive audit trail

### Security Features
- 🔒 AES-256-GCM encryption for sensitive data
- 🔒 PII masking in logs and audit trails
- 🔒 Permission-based access control
- 🔒 IP address tracking
- 🔒 Secure document URL generation
- 🔒 Input validation and sanitization
- 🔒 Rate limiting ready

### Compliance
- ✅ GDPR compliant data handling
- ✅ PCI DSS aligned encryption
- ✅ AML/KYC workflow support
- ✅ Audit trail for regulatory compliance

## Architecture

### Directory Structure
```
organization-kyc/
├── controllers/
│   └── kyc.controller.ts          # API endpoints
├── services/
│   └── kyc.service.ts              # Business logic & encryption
├── processors/
│   └── kyc-verification.processor.ts # Async verification
├── dto/
│   ├── submit-kyc.dto.ts           # Submission validation
│   ├── review-kyc.dto.ts           # Review validation
│   └── index.ts                    # DTO exports
├── organization-kyc.module.ts      # Module definition
├── README.md                       # This file
└── SECURITY_FEATURES.md            # Security documentation
```

### Key Components

#### 1. KycController
RESTful API endpoints for KYC operations:
- `POST /organizations/:orgId/kyc` - Submit KYC application
- `GET /organizations/:orgId/kyc` - Get KYC status
- `POST /organizations/:orgId/kyc/documents` - Upload documents
- `POST /organizations/:orgId/kyc/review` - Admin review
- `GET /organizations/:orgId/kyc/admin/pending` - List pending applications

#### 2. KycService
Core business logic including:
- Encryption/decryption of sensitive data
- Document upload URL generation
- Status workflow management
- Audit logging integration

#### 3. KycVerificationProcessor
Async verification processing:
- Document authenticity checks (placeholder)
- AI-powered verification (placeholder)
- Risk assessment
- Compliance screening preparation

## API Documentation

### Submit KYC Application

**Endpoint:** `POST /organizations/:orgId/kyc`

**Required Permission:** `org:admin`

**Request Body:**
```json
{
  "idType": "passport",
  "businessType": "LLC",
  "businessRegistrationNumber": "REG-123456",
  "taxId": "TAX-789012",
  "businessAddress": "123 Business St",
  "businessCity": "New York",
  "businessState": "NY",
  "businessPostalCode": "10001",
  "businessCountry": "United States"
}
```

**Response:**
```json
{
  "id": "kyc-uuid",
  "status": "DOCUMENTS_SUBMITTED",
  "submittedAt": "2025-12-01T10:00:00Z"
}
```

### Upload Document

**Endpoint:** `POST /organizations/:orgId/kyc/documents`

**Required Permission:** `org:admin`

**Request Body:**
```json
{
  "documentType": "id_document",
  "fileName": "passport.pdf",
  "contentType": "application/pdf"
}
```

**Response:**
```json
{
  "uploadUrl": "https://secure-upload-url.com/token",
  "expiresAt": "2025-12-01T10:15:00Z",
  "documentType": "id_document"
}
```

### Get KYC Status

**Endpoint:** `GET /organizations/:orgId/kyc`

**Required Permission:** `org:read`

**Response:**
```json
{
  "id": "kyc-uuid",
  "status": "UNDER_REVIEW",
  "idType": "passport",
  "idVerified": false,
  "addressVerified": false,
  "businessVerified": false,
  "submittedAt": "2025-12-01T10:00:00Z",
  "reviewedAt": null,
  "reviewNotes": null,
  "rejectionReason": null,
  "verificationScore": 0.85
}
```

### Review KYC Application (Admin)

**Endpoint:** `POST /organizations/:orgId/kyc/review`

**Required Permission:** `kyc:review`

**Request Body:**
```json
{
  "decision": "approve",
  "reviewNotes": "All documents verified successfully",
  "idVerified": true,
  "addressVerified": true,
  "businessVerified": true
}
```

**Response:**
```json
{
  "id": "kyc-uuid",
  "status": "APPROVED",
  "reviewedAt": "2025-12-01T12:00:00Z",
  "expiresAt": "2026-12-01T12:00:00Z"
}
```

## Status Workflow

```
NOT_STARTED
    ↓
DOCUMENTS_SUBMITTED ←──────┐
    ↓                      │
UNDER_REVIEW               │
    ↓                      │
    ├─→ APPROVED           │
    ├─→ REJECTED           │
    └─→ REQUEST_MORE_INFO ─┘
```

### Status Descriptions

- **NOT_STARTED**: KYC application created but not submitted
- **DOCUMENTS_SUBMITTED**: Application submitted with documents
- **UNDER_REVIEW**: Verification in progress (automated or manual)
- **APPROVED**: KYC verified and approved (valid for 1 year)
- **REJECTED**: KYC rejected with reason
- **REQUEST_MORE_INFO**: Additional information/documents required

## Document Types

### Supported Documents

1. **ID Document** (`id_document`)
   - Passport
   - Driver's License
   - National ID Card

2. **Address Proof** (`address_proof`)
   - Utility Bill
   - Bank Statement
   - Government Correspondence

3. **Business Document** (`business_document`)
   - Business Registration Certificate
   - Articles of Incorporation
   - Tax Registration

### File Requirements

- **Formats:** PDF, JPEG, PNG
- **Maximum Size:** 10MB (configured at gateway level)
- **Quality:** Minimum 300 DPI recommended
- **Color:** Color scans preferred

## Environment Variables

```env
# Required
KYC_ENCRYPTION_KEY=your-64-character-hex-string

# Optional
APP_URL=https://api.broxiva.com
```

### Generate Encryption Key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Integration Example

### Frontend Integration

```typescript
import axios from 'axios';

// 1. Submit KYC Application
const submitKyc = async (orgId: string, data: KycData) => {
  const response = await axios.post(
    `/organizations/${orgId}/kyc`,
    data,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};

// 2. Upload Document
const uploadDocument = async (orgId: string, file: File, type: string) => {
  // Get upload URL
  const { uploadUrl } = await axios.post(
    `/organizations/${orgId}/kyc/documents`,
    {
      documentType: type,
      fileName: file.name,
      contentType: file.type,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  // Upload file to pre-signed URL
  await axios.put(uploadUrl, file, {
    headers: {
      'Content-Type': file.type,
    },
  });
};

// 3. Check Status
const checkKycStatus = async (orgId: string) => {
  const response = await axios.get(
    `/organizations/${orgId}/kyc`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};
```

## Testing

### Unit Tests

```bash
# Run tests for KYC module
npm test -- organization-kyc

# With coverage
npm test -- --coverage organization-kyc
```

### Integration Tests

```bash
# Run integration tests
npm run test:e2e -- kyc
```

### Manual Testing with cURL

```bash
# Submit KYC
curl -X POST http://localhost:3000/organizations/{orgId}/kyc \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "idType": "passport",
    "businessType": "LLC",
    "businessRegistrationNumber": "REG-123"
  }'

# Get Status
curl -X GET http://localhost:3000/organizations/{orgId}/kyc \
  -H "Authorization: Bearer {token}"
```

## Monitoring and Alerts

### Recommended Metrics

1. **KYC Submission Rate**
   - Track submissions per day/hour
   - Alert on unusual spikes

2. **Verification Processing Time**
   - Average time from submission to review
   - Alert on delays > 24 hours

3. **Approval/Rejection Rates**
   - Track approval percentage
   - Alert on unusual rejection rates

4. **Failed Verifications**
   - Count of failed AI verifications
   - Alert on high failure rates

5. **Security Events**
   - Failed decryption attempts
   - Invalid file upload attempts
   - Unauthorized access attempts

### Logging

All KYC operations are logged with:
- Timestamp
- Organization ID (masked)
- User ID (masked)
- Action type
- IP address
- Result (success/failure)

## Troubleshooting

### Common Issues

**Issue:** Encryption key error on startup
```
Solution: Ensure KYC_ENCRYPTION_KEY is set in environment variables
```

**Issue:** Document upload fails
```
Solution: Check file type (must be PDF, JPEG, or PNG) and size limits
```

**Issue:** Permission denied on review endpoint
```
Solution: Ensure user has 'kyc:review' permission
```

**Issue:** Cannot resubmit KYC
```
Solution: KYC can only be resubmitted if status is NOT_STARTED or REJECTED
```

## Security Considerations

⚠️ **IMPORTANT:** See [SECURITY_FEATURES.md](./SECURITY_FEATURES.md) for detailed security documentation.

### Quick Security Checklist

- [ ] Use HTTPS in production
- [ ] Set secure random KYC_ENCRYPTION_KEY
- [ ] Enable rate limiting on endpoints
- [ ] Implement file size limits at gateway
- [ ] Set up log monitoring and alerts
- [ ] Regular security audits
- [ ] Backup encryption keys securely
- [ ] Implement key rotation policy

## Future Enhancements

### Planned Features

- [ ] Multi-language support for rejection reasons
- [ ] Webhook notifications for status changes
- [ ] Bulk document upload
- [ ] OCR data extraction from documents
- [ ] AI-powered document verification
- [ ] Face matching with ID photos
- [ ] Liveness detection
- [ ] Sanctions and PEP screening
- [ ] Risk scoring system
- [ ] Integration with external KYC providers

### Integration Targets

- Onfido
- Jumio
- Stripe Identity
- AWS Rekognition
- ComplyAdvantage

## Contributing

When contributing to this module:

1. Follow TypeScript best practices
2. Add comprehensive tests for new features
3. Update documentation
4. Ensure all sensitive data is encrypted
5. Add PII masking for any new log statements
6. Update SECURITY_FEATURES.md for security changes

## License

Proprietary - Broxiva Platform

## Support

For issues or questions:
- Internal: Check #kyc-module Slack channel
- Security: security@broxiva.com
- General: support@broxiva.com
