# GDPR/CCPA Implementation Guide - CitadelBuy

## Overview

This guide provides step-by-step instructions for completing the GDPR/CCPA compliance implementation for CitadelBuy. The core backend functionality has been implemented, but some integration and frontend work remains.

## What Has Been Implemented

### Backend Services ✅

1. **Data Export Service** (`apps/api/src/modules/users/data-export.service.ts`)
   - Export user data in JSON/CSV format
   - Includes all personal data, orders, reviews, wishlists, etc.
   - GDPR Article 20 compliant data portability

2. **Data Deletion Service** (`apps/api/src/modules/users/data-deletion.service.ts`)
   - Three deletion strategies: Soft Delete, Hard Delete, Anonymize
   - 30-day grace period with cancellation option
   - Respects legal data retention requirements
   - GDPR Article 17 & CCPA Section 1798.105 compliant

3. **Privacy Controller** (`apps/api/src/modules/privacy/privacy.controller.ts`)
   - 10 RESTful endpoints for privacy management
   - JWT authentication on all endpoints
   - Comprehensive API documentation with Swagger

4. **Privacy Module** (`apps/api/src/modules/privacy/privacy.module.ts`)
   - Integrated into app.module.ts
   - Ready to use with existing authentication system

5. **Database Schema** (`apps/api/prisma/schema-privacy.prisma`)
   - ConsentLog table for tracking consent history
   - DataDeletionRequest table for managing deletion requests
   - DataExportRequest table for export tracking
   - AgreedTerms table for policy version tracking

### Documentation ✅

1. **Privacy Compliance Documentation** (`docs/PRIVACY_COMPLIANCE.md`)
   - Complete GDPR/CCPA compliance checklist
   - Implementation details for all rights
   - Data retention policies
   - Cookie consent requirements
   - Third-party data sharing policies

2. **Privacy Policy Template** (`docs/templates/PRIVACY_POLICY_TEMPLATE.md`)
   - Comprehensive privacy policy template
   - GDPR and CCPA compliant
   - Ready for legal review and customization

3. **Module README** (`apps/api/src/modules/privacy/README.md`)
   - Usage guide for privacy API
   - Integration examples
   - Testing instructions

## Next Steps

### 1. Database Setup

#### Option A: Using Prisma Migrate (Recommended)

```bash
cd apps/api

# Add the privacy models to your main schema.prisma
# Either merge schema-privacy.prisma content or use Prisma's multiple schema files feature

# Run migration
npx prisma migrate dev --name add_privacy_compliance

# Generate Prisma Client
npx prisma generate
```

#### Option B: Manual SQL Migration

```bash
cd apps/api

# Run the migration SQL
psql -U your_user -d citadelbuy < prisma/migrations/add_privacy_consent/migration.sql

# Update Prisma schema and regenerate client
npx prisma generate
```

#### Update User Model

Add these fields to your User model in `schema.prisma`:

```prisma
model User {
  // ... existing fields ...

  // Privacy & Compliance Relations
  consentLogs          ConsentLog[]
  dataDeletionRequests DataDeletionRequest[]
  dataExportRequests   DataExportRequest[]
  agreedTerms          AgreedTerms[]

  // Privacy Fields
  deletedAt            DateTime?
  processingRestricted Boolean  @default(false)
}
```

### 2. Install Dependencies

```bash
cd apps/api

# Install JSON to CSV converter
npm install json2csv
npm install --save-dev @types/json2csv
```

### 3. Test the API

Start your server and test the endpoints:

```bash
# Start server
npm run start:dev

# Test data export
curl -X POST http://localhost:3000/privacy/export \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"format":"json"}'

# Test consent management
curl -X POST http://localhost:3000/privacy/consent \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "dataProcessing": true,
    "marketing": false,
    "analytics": true,
    "thirdPartySharing": false
  }'

# Test viewing stored data
curl -X GET http://localhost:3000/privacy/data \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 4. Frontend Implementation

#### 4.1 Create Privacy Dashboard Page

Create `apps/web/src/app/privacy/page.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';

export default function PrivacyPage() {
  const [data, setData] = useState(null);
  const [consent, setConsent] = useState({
    dataProcessing: true,
    marketing: false,
    analytics: false,
    thirdPartySharing: false,
  });

  useEffect(() => {
    loadPrivacyData();
    loadConsent();
  }, []);

  const loadPrivacyData = async () => {
    const response = await apiClient.get('/privacy/data');
    setData(response.data);
  };

  const loadConsent = async () => {
    const response = await apiClient.get('/privacy/consent');
    setConsent(response.data.consent);
  };

  const exportData = async (format: 'json' | 'csv') => {
    await apiClient.post('/privacy/export', { format });
    alert(`Data export initiated. Check your email for the download link.`);
  };

  const updateConsent = async () => {
    await apiClient.post('/privacy/consent', consent);
    alert('Consent preferences updated successfully.');
  };

  const requestDeletion = async () => {
    if (!confirm('Are you sure? This cannot be undone after 30 days.')) return;

    await apiClient.delete('/privacy/delete-account', {
      data: { strategy: 'ANONYMIZE', reason: 'User requested deletion' }
    });
    alert('Deletion request submitted. You have 30 days to cancel.');
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Privacy & Data Rights</h1>

      {/* Data Overview Section */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Your Data</h2>
        {data && (
          <div className="bg-gray-100 p-4 rounded">
            <p>Email: {data.email}</p>
            <p>Orders: {data.dataCategories.orders}</p>
            <p>Reviews: {data.dataCategories.reviews}</p>
            <p>Wishlists: {data.dataCategories.wishlist}</p>
          </div>
        )}
      </section>

      {/* Export Section */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Export Your Data</h2>
        <div className="flex gap-4">
          <button onClick={() => exportData('json')} className="btn btn-primary">
            Export as JSON
          </button>
          <button onClick={() => exportData('csv')} className="btn btn-secondary">
            Export as CSV
          </button>
        </div>
      </section>

      {/* Consent Section */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Consent Preferences</h2>
        <div className="space-y-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={consent.marketing}
              onChange={(e) => setConsent({...consent, marketing: e.target.checked})}
              className="mr-2"
            />
            Marketing communications
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={consent.analytics}
              onChange={(e) => setConsent({...consent, analytics: e.target.checked})}
              className="mr-2"
            />
            Analytics and tracking
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={consent.thirdPartySharing}
              onChange={(e) => setConsent({...consent, thirdPartySharing: e.target.checked})}
              className="mr-2"
            />
            Third-party data sharing
          </label>
          <button onClick={updateConsent} className="btn btn-primary">
            Save Preferences
          </button>
        </div>
      </section>

      {/* Deletion Section */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 text-red-600">Delete Account</h2>
        <p className="mb-4 text-gray-600">
          Permanently delete your account and personal data. This action has a 30-day grace period.
        </p>
        <button onClick={requestDeletion} className="btn btn-danger">
          Request Account Deletion
        </button>
      </section>
    </div>
  );
}
```

#### 4.2 Cookie Consent Banner

Create `apps/web/src/components/CookieConsent.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const acceptAll = () => {
    localStorage.setItem('cookieConsent', JSON.stringify({
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
    }));
    setShowBanner(false);
  };

  const acceptNecessary = () => {
    localStorage.setItem('cookieConsent', JSON.stringify({
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
    }));
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-6 z-50">
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-bold mb-2">We Value Your Privacy</h3>
          <p className="text-sm">
            We use cookies to enhance your browsing experience, serve personalized content,
            and analyze our traffic. By clicking "Accept All", you consent to our use of cookies.
          </p>
          <a href="/privacy-policy" className="text-blue-400 text-sm underline">
            Learn more in our Privacy Policy
          </a>
        </div>
        <div className="flex gap-4">
          <button onClick={acceptNecessary} className="btn btn-secondary">
            Necessary Only
          </button>
          <button onClick={acceptAll} className="btn btn-primary">
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
}
```

Add to your layout:

```typescript
// apps/web/src/app/layout.tsx
import CookieConsent from '@/components/CookieConsent';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
```

#### 4.3 Add Privacy Links to Footer

Update `apps/web/src/components/layout/footer.tsx`:

```typescript
<footer>
  {/* ... existing footer content ... */}
  <div className="legal-links">
    <a href="/privacy-policy">Privacy Policy</a>
    <a href="/terms-of-service">Terms of Service</a>
    <a href="/cookie-policy">Cookie Policy</a>
    <a href="/privacy">Privacy Settings</a>
    <a href="/privacy/do-not-sell">Do Not Sell My Personal Information</a>
  </div>
</footer>
```

### 5. Legal Review

1. **Review Privacy Policy Template**
   - Customize `docs/templates/PRIVACY_POLICY_TEMPLATE.md`
   - Fill in all [INSERT] placeholders
   - Add company-specific details
   - Have legal counsel review

2. **Create Supporting Documents**
   - Terms of Service
   - Cookie Policy
   - Data Processing Agreements (DPAs) with vendors

3. **Update Existing Policies**
   - Ensure all policies reference GDPR/CCPA rights
   - Add links to privacy dashboard
   - Include contact information for privacy inquiries

### 6. Staff Training

1. **Privacy Training**
   - Train all staff on GDPR/CCPA basics
   - Explain user rights and how to respond
   - Review data handling procedures

2. **Technical Training**
   - Train developers on privacy API usage
   - Review data retention policies
   - Explain deletion procedures

3. **Customer Service Training**
   - How to handle privacy requests
   - Escalation procedures
   - Response templates

### 7. Operational Setup

#### 7.1 Email Templates

Create email templates for:
- Data export ready notification
- Account deletion confirmation
- Deletion cancellation confirmation
- Consent update confirmation

#### 7.2 Scheduled Jobs

Set up cron jobs or scheduled tasks for:

```typescript
// Example: Clean up expired exports (run daily)
@Cron('0 0 * * *')
async cleanupExpiredExports() {
  const expiredDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  await this.prisma.dataExportRequest.deleteMany({
    where: {
      status: 'COMPLETED',
      expiresAt: { lt: expiredDate }
    }
  });
}

// Example: Process scheduled deletions (run daily)
@Cron('0 2 * * *')
async processScheduledDeletions() {
  const now = new Date();
  const requests = await this.prisma.dataDeletionRequest.findMany({
    where: {
      status: 'SCHEDULED',
      scheduledDate: { lte: now }
    }
  });

  for (const request of requests) {
    await this.dataDeletionService.deleteUserData({
      userId: request.userId,
      strategy: request.strategy,
    });
  }
}
```

#### 7.3 Monitoring & Alerts

Set up monitoring for:
- Privacy request volume
- Deletion request patterns
- Consent opt-out rates
- API errors on privacy endpoints
- Data retention compliance

### 8. Testing Checklist

#### Backend Testing
- [ ] Test data export in JSON format
- [ ] Test data export in CSV format
- [ ] Test soft delete strategy
- [ ] Test hard delete strategy
- [ ] Test anonymize strategy
- [ ] Test consent update
- [ ] Test consent retrieval
- [ ] Test processing restriction
- [ ] Test retention info retrieval
- [ ] Verify authentication required on all endpoints

#### Frontend Testing
- [ ] Privacy dashboard displays correctly
- [ ] Cookie consent banner appears on first visit
- [ ] Cookie preferences are saved
- [ ] Data export buttons work
- [ ] Consent toggles work
- [ ] Account deletion confirmation works
- [ ] Privacy links in footer work

#### Integration Testing
- [ ] End-to-end data export flow
- [ ] End-to-end deletion flow with grace period
- [ ] Consent changes affect backend behavior
- [ ] Email notifications are sent

### 9. Compliance Verification

#### GDPR Checklist
- [ ] Right of access implemented
- [ ] Right to rectification implemented
- [ ] Right to erasure implemented
- [ ] Right to data portability implemented
- [ ] Right to restriction implemented
- [ ] Consent management implemented
- [ ] Privacy policy published
- [ ] Cookie consent banner active
- [ ] Data retention policies documented
- [ ] Audit trails in place
- [ ] DPO appointed (if required)
- [ ] DPIA completed (if required)

#### CCPA Checklist
- [ ] Right to know implemented
- [ ] Right to delete implemented
- [ ] Right to opt-out implemented
- [ ] "Do Not Sell" link in footer
- [ ] Privacy policy includes CCPA disclosures
- [ ] Response procedures within 45 days
- [ ] Non-discrimination policy
- [ ] Service provider agreements in place

### 10. Deployment

#### Pre-Deployment
1. Backup database
2. Test migration on staging environment
3. Verify all endpoints work in staging
4. Load test privacy endpoints
5. Security audit of privacy features

#### Deployment Steps
1. Run database migrations
2. Deploy backend code
3. Deploy frontend code
4. Verify all features work in production
5. Monitor for errors

#### Post-Deployment
1. Announce new privacy features to users
2. Send email about privacy dashboard
3. Monitor usage and errors
4. Gather user feedback
5. Document any issues

## Support & Resources

### Internal Documentation
- [Privacy Compliance Docs](docs/PRIVACY_COMPLIANCE.md)
- [Privacy Policy Template](docs/templates/PRIVACY_POLICY_TEMPLATE.md)
- [Privacy Module README](apps/api/src/modules/privacy/README.md)

### External Resources
- [GDPR Official Text](https://gdpr-info.eu/)
- [CCPA Official Text](https://oag.ca.gov/privacy/ccpa)
- [ICO Guidance](https://ico.org.uk/)
- [CNIL Guidance](https://www.cnil.fr/en)

### Contact
- Privacy Questions: privacy@citadelbuy.com
- Technical Issues: Platform team
- Legal Review: Legal team

## Timeline Estimate

| Task | Estimated Time |
|------|----------------|
| Database setup | 2 hours |
| Backend testing | 4 hours |
| Frontend development | 16 hours |
| Email templates | 4 hours |
| Legal review | 1-2 weeks (external) |
| Staff training | 1 week |
| Testing & QA | 1 week |
| Documentation | 4 hours |
| **Total** | **3-4 weeks** |

## Success Metrics

Track these metrics to measure compliance success:
- Number of data export requests
- Number of deletion requests
- Consent opt-in/opt-out rates
- Average response time to privacy requests
- User satisfaction with privacy features
- Reduction in privacy-related support tickets

## Conclusion

The core GDPR/CCPA compliance infrastructure is complete. Follow this guide to finish the integration, add frontend components, complete legal review, and deploy the privacy features to production.

For questions or assistance, consult the documentation files or reach out to the platform team.

**Last Updated**: December 2024
