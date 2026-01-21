# Privacy Module - GDPR/CCPA Compliance

This module implements comprehensive privacy and data protection features for Broxiva, ensuring compliance with GDPR (General Data Protection Regulation) and CCPA (California Consumer Privacy Act).

## Features

### Data Subject Rights

1. **Right of Access** (GDPR Art. 15 / CCPA 1798.100)
   - View all stored personal data
   - Endpoint: `GET /privacy/data`

2. **Right to Data Portability** (GDPR Art. 20 / CCPA 1798.110)
   - Export data in JSON or CSV format
   - Endpoints: `POST /privacy/export`, `GET /privacy/export/download`

3. **Right to Erasure** (GDPR Art. 17 / CCPA 1798.105)
   - Request account deletion with multiple strategies
   - Endpoint: `DELETE /privacy/delete-account`

4. **Right to Rectification** (GDPR Art. 16)
   - Verify and update personal data
   - Endpoint: `GET /privacy/data-accuracy`

5. **Right to Restriction** (GDPR Art. 18)
   - Limit data processing to essential operations
   - Endpoint: `POST /privacy/restrict-processing`

6. **Consent Management** (GDPR Art. 7)
   - Granular consent for different processing activities
   - Endpoints: `POST /privacy/consent`, `GET /privacy/consent`

## Installation

### 1. Install Dependencies

The privacy module uses `json2csv` for CSV export functionality:

```bash
cd apps/api
npm install json2csv
npm install --save-dev @types/json2csv
```

### 2. Database Migration

Apply the privacy schema to your database:

```bash
# Using Prisma
npx prisma migrate dev --name add_privacy_consent

# Or run the SQL migration directly
psql -U your_user -d broxiva < prisma/migrations/add_privacy_consent/migration.sql
```

This creates the following tables:
- `ConsentLog` - Tracks user consent history
- `DataDeletionRequest` - Manages deletion requests
- `DataExportRequest` - Manages export requests
- `AgreedTerms` - Tracks agreed privacy policy versions

### 3. Update Prisma Schema

Add privacy relations to your User model in `schema.prisma`:

```prisma
model User {
  // ... existing fields ...

  // Privacy & Compliance
  consentLogs          ConsentLog[]
  dataDeletionRequests DataDeletionRequest[]
  dataExportRequests   DataExportRequest[]
  agreedTerms          AgreedTerms[]
  deletedAt            DateTime?
  processingRestricted Boolean  @default(false)
}
```

Then include the privacy models from `schema-privacy.prisma` or merge them into your main schema.

### 4. Verify Module Integration

The privacy module should already be imported in `app.module.ts`:

```typescript
import { PrivacyModule } from './modules/privacy/privacy.module';

@Module({
  imports: [
    // ... other modules ...
    PrivacyModule,
  ],
})
export class AppModule {}
```

## Usage

### API Endpoints

All endpoints require JWT authentication via the `JwtAuthGuard`.

#### View Stored Data

```bash
GET /privacy/data
Authorization: Bearer <token>

Response:
{
  "userId": "...",
  "email": "...",
  "exportDate": "...",
  "dataCategories": {
    "personalInformation": 1,
    "orders": 15,
    "reviews": 8,
    ...
  },
  "consentStatus": { ... }
}
```

#### Export Data

```bash
POST /privacy/export
Authorization: Bearer <token>
Content-Type: application/json

{
  "format": "json"  // or "csv"
}

Response:
{
  "message": "Data export has been initiated",
  "exportId": "...",
  "downloadUrl": "/privacy/export/download?format=json",
  "expiresAt": "..."
}
```

#### Download Export

```bash
GET /privacy/export/download?format=json
Authorization: Bearer <token>

Response: JSON or CSV file download
```

#### Request Account Deletion

```bash
DELETE /privacy/delete-account
Authorization: Bearer <token>
Content-Type: application/json

{
  "strategy": "ANONYMIZE",  // SOFT_DELETE, HARD_DELETE, or ANONYMIZE
  "reason": "No longer need the account",
  "scheduledDate": "2024-12-31T23:59:59Z"  // optional
}

Response:
{
  "message": "Account deletion request has been received",
  "userId": "...",
  "strategy": "ANONYMIZE",
  "scheduledDate": "...",
  "cancellationDeadline": "..."
}
```

#### Get Retention Information

```bash
GET /privacy/retention-info
Authorization: Bearer <token>

Response:
{
  "userId": "...",
  "retentionRequirements": {
    "taxRecords": { ... },
    "activePaymentPlans": { ... }
  },
  "deletionOptions": {
    "hardDelete": true,
    "softDelete": true,
    "anonymize": true
  }
}
```

#### Update Consent

```bash
POST /privacy/consent
Authorization: Bearer <token>
Content-Type: application/json

{
  "dataProcessing": true,
  "marketing": false,
  "analytics": true,
  "thirdPartySharing": false
}

Response:
{
  "userId": "...",
  "consent": { ... },
  "updatedAt": "...",
  "ipAddress": "...",
  "userAgent": "..."
}
```

#### Get Consent Status

```bash
GET /privacy/consent
Authorization: Bearer <token>

Response:
{
  "userId": "...",
  "consent": { ... },
  "grantedAt": "...",
  "lastUpdatedAt": "..."
}
```

## Deletion Strategies

### 1. Soft Delete
- Anonymizes personal information
- Retains all records for legal compliance
- User cannot log in or be identified
- Reversible within grace period (30 days)

**Use Case**: Standard deletion for most users

### 2. Hard Delete
- Permanently removes user record
- Deletes non-essential data
- Anonymizes orders (legal requirement)
- Irreversible after grace period
- Blocked if active payment plans exist

**Use Case**: Complete removal when legally permissible

### 3. Anonymize
- Replaces personal identifiers with anonymous values
- Preserves data structure for analytics
- Maintains referential integrity
- Best balance of privacy and compliance

**Use Case**: Recommended for most scenarios

## Data Retention

### Legal Requirements

| Data Type | Retention Period | Reason |
|-----------|-----------------|---------|
| Financial Records | 7 years | Tax law compliance |
| Order History | 7 years | Warranty, disputes |
| Fraud Logs | 5 years | Security, fraud prevention |
| Marketing Data | Until consent withdrawn | User preference |
| Analytics | 2 years | Business intelligence |

### Automatic Cleanup

Consider implementing scheduled jobs to:
- Delete expired export download links (7 days)
- Process scheduled deletion requests
- Archive old consent logs
- Clean up expired sessions

## Testing

### Manual Testing

1. **Export Data**
   ```bash
   # Request export
   curl -X POST http://localhost:3000/privacy/export \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"format":"json"}'

   # Download export
   curl -X GET http://localhost:3000/privacy/export/download?format=json \
     -H "Authorization: Bearer $TOKEN" \
     -o data-export.json
   ```

2. **Update Consent**
   ```bash
   curl -X POST http://localhost:3000/privacy/consent \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "dataProcessing": true,
       "marketing": false,
       "analytics": false,
       "thirdPartySharing": false
     }'
   ```

3. **Request Deletion**
   ```bash
   curl -X DELETE http://localhost:3000/privacy/delete-account \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "strategy": "ANONYMIZE",
       "reason": "Testing deletion"
     }'
   ```

### Automated Testing

```typescript
import { Test } from '@nestjs/testing';
import { PrivacyService } from './privacy.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('PrivacyService', () => {
  let service: PrivacyService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [PrivacyService, PrismaService],
    }).compile();

    service = module.get<PrivacyService>(PrivacyService);
  });

  it('should export user data in JSON format', async () => {
    const result = await service.generateDataExport('user-id', 'json');
    expect(result).toBeDefined();
    expect(() => JSON.parse(result)).not.toThrow();
  });

  // Add more tests...
});
```

## Frontend Integration

### Example React Component

```typescript
import { useState } from 'react';
import { apiClient } from '@/lib/api-client';

export function PrivacyDashboard() {
  const [loading, setLoading] = useState(false);

  const exportData = async (format: 'json' | 'csv') => {
    setLoading(true);
    try {
      const response = await apiClient.post('/privacy/export', { format });
      // Show success message
      alert('Export initiated. Check your email for the download link.');
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateConsent = async (consent: any) => {
    try {
      await apiClient.post('/privacy/consent', consent);
      alert('Consent preferences updated.');
    } catch (error) {
      console.error('Update failed:', error);
    }
  };

  const requestDeletion = async () => {
    if (!confirm('Are you sure you want to delete your account?')) return;

    try {
      await apiClient.delete('/privacy/delete-account', {
        data: { strategy: 'ANONYMIZE', reason: 'User requested' }
      });
      alert('Deletion request submitted. You have 30 days to cancel.');
    } catch (error) {
      console.error('Deletion request failed:', error);
    }
  };

  return (
    <div>
      <h1>Privacy & Data Rights</h1>

      <section>
        <h2>Export Your Data</h2>
        <button onClick={() => exportData('json')}>Export as JSON</button>
        <button onClick={() => exportData('csv')}>Export as CSV</button>
      </section>

      <section>
        <h2>Consent Management</h2>
        {/* Consent form here */}
      </section>

      <section>
        <h2>Delete Account</h2>
        <button onClick={requestDeletion} className="danger">
          Delete My Account
        </button>
      </section>
    </div>
  );
}
```

## Security Considerations

1. **Authentication**: All endpoints require valid JWT token
2. **Authorization**: Users can only access their own data
3. **Rate Limiting**: Consider limiting export/deletion requests per time period
4. **Audit Logging**: All privacy operations are logged with IP and user agent
5. **Data Encryption**:
   - Use HTTPS for all API calls
   - Encrypt exports before download
   - Secure deletion (overwrite) for hard deletes

## Compliance Notes

### GDPR Requirements
- ✅ Respond to access requests within 1 month
- ✅ Provide data in machine-readable format
- ✅ Allow data portability
- ✅ Process deletion requests within reasonable time
- ✅ Maintain audit trail of consent
- ⚠️ Consider appointing DPO if processing is large-scale
- ⚠️ Conduct DPIA for high-risk processing

### CCPA Requirements
- ✅ Respond to requests within 45 days
- ✅ Provide data free of charge (up to 2 requests per 12 months)
- ✅ Verify requestor identity
- ✅ Do not discriminate based on privacy choices
- ⚠️ Display "Do Not Sell My Personal Information" link
- ⚠️ Train staff on CCPA compliance

## Troubleshooting

### Common Issues

**Issue**: Export fails with large data sets
**Solution**: Implement pagination or background job processing

**Issue**: Deletion blocked due to active orders
**Solution**: Use ANONYMIZE strategy instead of HARD_DELETE

**Issue**: Consent not being tracked
**Solution**: Ensure ConsentLog table exists and relations are set up

**Issue**: JSON2CSV errors in CSV export
**Solution**: Check that json2csv is installed: `npm install json2csv`

## Further Reading

- [GDPR Official Text](https://gdpr-info.eu/)
- [CCPA Official Text](https://oag.ca.gov/privacy/ccpa)
- [Broxiva Privacy Compliance Docs](../../../docs/PRIVACY_COMPLIANCE.md)
- [Privacy Policy Template](../../../docs/templates/PRIVACY_POLICY_TEMPLATE.md)

## Support

For questions or issues:
- Internal: Contact the platform team
- External: privacy@broxiva.com
- DPO: dpo@broxiva.com (if appointed)
