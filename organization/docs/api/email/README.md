# CitadelBuy Email Templates Documentation

This directory contains all email templates used by the CitadelBuy platform. All templates are written in Handlebars (.hbs) format and follow a consistent design system.

## Design System

All templates share the following design elements:
- **Primary Color**: Linear gradient from #667eea to #764ba2
- **Font**: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif
- **Max Width**: 600-700px for optimal email client compatibility
- **Responsive**: Mobile-friendly with media queries
- **Emojis**: Used sparingly for visual interest (🛒 📧 ✅ etc.)

## Template Categories

### Authentication & Account Management

#### 1. `welcome.hbs` - Welcome Email
**Sent when**: New user registers an account
**Variables**:
```javascript
{
  name: string,              // User's first name
  shopUrl: string,           // URL to start shopping
  helpUrl: string,           // URL to help center
  unsubscribeUrl: string     // URL to manage email preferences
}
```

#### 2. `account-verification.hbs` - Email Verification
**Sent when**: User needs to verify their email address
**Variables**:
```javascript
{
  name: string,              // User's first name
  verificationUrl: string,   // Verification link with token
  expiryHours: number,       // Hours until link expires (default: 24)
  supportEmail: string,      // Support email address
  helpUrl: string,           // URL to help center
  privacyUrl: string,        // URL to privacy policy
  termsUrl: string,          // URL to terms of service
  currentYear: number        // Current year for copyright
}
```

#### 3. `password-reset.hbs` - Password Reset
**Sent when**: User requests password reset
**Variables**:
```javascript
{
  name: string,              // User's first name
  email: string,             // User's email address
  resetUrl: string,          // Password reset link with token
  expiryTime: number,        // Minutes until link expires (default: 60)
  requestDate: string,       // When request was made
  ipAddress: string,         // IP address of request (optional)
  supportUrl: string         // URL to support page
}
```

### Order Management

#### 4. `order-confirmation.hbs` - Order Confirmation
**Sent when**: Order is successfully placed
**Variables**:
```javascript
{
  customerName: string,
  orderNumber: string,
  orderDate: string,
  items: Array<{
    name: string,
    image?: string,
    variant?: string,
    quantity: number,
    price: number
  }>,
  subtotal: number,
  discount?: number,
  discountCode?: string,
  shipping: number,
  shippingFree?: boolean,
  tax: number,
  total: number,
  currency?: string,         // Default: '$'
  shippingAddress: {
    name: string,
    line1: string,
    line2?: string,
    city: string,
    state: string,
    postalCode: string,
    country: string
  },
  paymentMethod: {
    brand: string,
    last4: string,
    email?: string
  },
  estimatedDelivery: string,
  itemCount: number,         // Auto-calculated
  trackingUrl: string,       // Auto-generated
  helpUrl: string,           // Auto-generated
  supportEmail: string,      // Auto-generated
  unsubscribeUrl: string,    // Auto-generated
  privacyUrl: string         // Auto-generated
}
```

#### 5. `order-status-update.hbs` - Order Status Update
**Sent when**: Order status changes (processing, shipped, delivered, cancelled)
**Variables**:
```javascript
{
  customerName: string,
  orderNumber: string,
  orderDate: string,
  status: 'processing' | 'shipped' | 'delivered' | 'cancelled',
  statusMessage: string,
  trackingNumber?: string,
  carrier?: string,
  trackingUrl?: string,
  estimatedDelivery?: string,
  items: Array<{
    name: string,
    image?: string,
    quantity: number
  }>,
  // Auto-generated from status:
  statusClass: string,
  statusIcon: string,
  statusTitle: string,
  progressSteps: Array,
  orderUrl: string,
  helpUrl: string,
  returnUrl: string,
  contactUrl: string,
  unsubscribeUrl: string
}
```

#### 6. `invoice-receipt.hbs` - Invoice / Receipt
**Sent when**: Payment is processed or invoice is generated
**Variables**:
```javascript
{
  invoiceNumber: string,
  invoiceDate: string,
  dueDate?: string,
  orderNumber?: string,
  status: 'paid' | 'pending' | 'failed',
  statusText: string,
  billingAddress: {
    name: string,
    line1: string,
    line2?: string,
    city: string,
    state: string,
    postalCode: string,
    country: string,
    email?: string
  },
  shippingAddress?: { /* same as billingAddress */ },
  items: Array<{
    name: string,
    description?: string,
    sku?: string,
    quantity: number,
    unitPrice: number,
    amount: number
  }>,
  subtotal: number,
  discount?: number,
  discountCode?: string,
  shipping?: number,
  tax?: number,
  taxRate?: number,
  total: number,
  currency: string,
  paymentMethod: {
    type: string,
    transactionId?: string,
    card?: {
      brand: string,
      last4: string
    }
  },
  paymentDate: string,
  notes?: string,
  downloadUrl?: string,
  companyAddress?: { /* address object */ },
  taxId?: string,
  supportEmail: string,
  supportPhone?: string,
  accountUrl: string,
  ordersUrl: string,
  helpUrl: string,
  privacyUrl: string,
  termsUrl: string,
  refundUrl: string,
  currentYear: number
}
```

### Shipping & Fulfillment

#### 7. `shipping-update.hbs` - Shipping Notification
**Sent when**: Order ships or shipping status changes
**Variables**:
```javascript
{
  customerName: string,
  orderNumber: string,
  trackingNumber: string,
  carrier: string,
  trackingUrl: string,
  estimatedDelivery: string,
  shippingAddress: {
    name: string,
    line1: string,
    line2?: string,
    city: string,
    state: string,
    postalCode: string,
    country: string
  },
  items: Array<{
    name: string,
    image?: string,
    quantity: number
  }>,
  shipmentStatus?: string,
  currentLocation?: string,
  // Additional auto-generated URLs
  trackOrderUrl: string,
  supportUrl: string,
  helpUrl: string
}
```

### Cart & Marketing

#### 8. `cart-abandonment.hbs` - Cart Abandonment
**Sent when**: User leaves items in cart without completing purchase
**Variables**:
```javascript
{
  customerName: string,
  email: string,
  items: Array<{
    name: string,
    image?: string,
    variant?: string,
    quantity: number,
    price: number
  }>,
  total: number,
  currency: string,
  recoveryLink: string,
  hasDiscount?: boolean,
  discountPercent?: number,
  expiryHours?: number,
  helpUrl: string,
  unsubscribeUrl: string,
  privacyUrl: string
}
```

### Returns & Refunds

#### 9. `return-confirmation.hbs` - Return Request Confirmation
**Sent when**: Return request is received
**Variables**:
```javascript
{
  email: string,
  customerName: string,
  rmaNumber: string,
  orderNumber: string,
  items: Array<{
    name: string,
    quantity: number
  }>,
  totalRefund: number
}
```

#### 10. `return-approved.hbs` - Return Approved
**Sent when**: Return request is approved
**Variables**:
```javascript
{
  email: string,
  customerName: string,
  rmaNumber: string,
  approvedAmount: number,
  nextSteps: string
}
```

#### 11. `return-rejected.hbs` - Return Rejected
**Sent when**: Return request is declined
**Variables**:
```javascript
{
  email: string,
  customerName: string,
  rmaNumber: string,
  reason: string
}
```

#### 12. `return-label.hbs` - Return Shipping Label Ready
**Sent when**: Return shipping label is generated
**Variables**:
```javascript
{
  email: string,
  customerName: string,
  rmaNumber: string,
  trackingNumber: string,
  carrier: string,
  labelUrl?: string
}
```

#### 13. `refund-processed.hbs` - Refund Processed
**Sent when**: Refund is issued
**Variables**:
```javascript
{
  email: string,
  customerName: string,
  rmaNumber: string,
  refundAmount: number,
  refundMethod: string,
  estimatedDays: number
}
```

#### 14. `store-credit-issued.hbs` - Store Credit Issued
**Sent when**: Store credit is added to account
**Variables**:
```javascript
{
  email: string,
  customerName: string,
  rmaNumber: string,
  creditAmount: number,
  expiresAt?: Date
}
```

### Subscription Management

#### 15. `subscription-confirmation.hbs` - Subscription Confirmation
**Sent when**: User subscribes to a paid plan
**Variables**:
```javascript
{
  customerName: string,
  planName: string,
  subscriptionId: string,
  startDate: string,
  nextBillingDate: string,
  amount: number,
  currency: string,
  billingInterval: string,   // e.g., "per month", "per year"
  trialDays?: number,
  chargeDate?: string,
  benefits: Array<{
    title: string,
    description?: string
  }>,
  paymentMethod: {
    brand: string,
    last4: string,
    expiry: string
  },
  dashboardUrl: string,
  manageSubscriptionUrl: string,
  invoiceUrl: string,
  supportEmail: string,
  helpUrl: string,
  unsubscribeUrl: string,
  privacyUrl: string,
  currentYear: number
}
```

### KYC & Compliance

#### 16. `kyc-approved.hbs` - KYC Verification Approved
**Sent when**: Organization KYC verification is approved
**Variables**:
```javascript
{
  email: string,
  organizationName: string,
  applicationId: string,
  verificationScore?: number,
  approvedDate: string,
  idVerified?: boolean,
  addressVerified?: boolean,
  businessVerified?: boolean,
  verifiedComponents: boolean,  // Auto-calculated
  dashboardUrl: string,
  supportEmail: string,
  currentYear: number
}
```

#### 17. `kyc-rejected.hbs` - KYC Verification Rejected
**Sent when**: Organization KYC verification is rejected
**Variables**:
```javascript
{
  email: string,
  organizationName: string,
  applicationId: string,
  submittedDate: string,
  reviewedDate: string,
  rejectionReasons?: Array<string>,
  resubmitUrl: string,
  supportUrl: string,
  supportEmail: string,
  currentYear: number
}
```

#### 18. `kyc-pending-review.hbs` - KYC Pending Review
**Sent when**: Organization KYC application is submitted
**Variables**:
```javascript
{
  email: string,
  organizationName: string,
  applicationId: string,
  submittedDate: string,
  estimatedReviewTime?: string,  // Default: "1-3 business days"
  statusUrl: string,
  supportEmail: string,
  currentYear: number
}
```

## Template Development Guide

### Testing Templates Locally

1. **Using Nodemailer with MailHog/MailDev**:
   ```bash
   # Install MailHog (macOS)
   brew install mailhog
   mailhog

   # Or use MailDev (npm)
   npm install -g maildev
   maildev
   ```

2. **View emails at**: http://localhost:8025 (MailHog) or http://localhost:1080 (MailDev)

### Creating New Templates

1. **Follow naming convention**: Use kebab-case (e.g., `new-template.hbs`)

2. **Use the standard structure**:
   ```html
   <!DOCTYPE html>
   <html lang="en">
   <head>
     <meta charset="UTF-8">
     <meta name="viewport" content="width=device-width, initial-scale=1.0">
     <title>Subject - CitadelBuy</title>
     <style>
       /* Inline styles for email client compatibility */
     </style>
   </head>
   <body>
     <div class="container">
       <div class="header"><!-- Header --></div>
       <div class="content"><!-- Content --></div>
       <div class="footer"><!-- Footer --></div>
     </div>
   </body>
   </html>
   ```

3. **Add service method** in `email.service.ts`:
   ```typescript
   async sendNewTemplate(email: string, data: TemplateData): Promise<void> {
     await this.sendEmail({
       to: email,
       subject: 'Email Subject',
       template: 'new-template',
       context: data,
     });
   }
   ```

4. **Document the template** in this README with all variables

### Best Practices

1. **Inline CSS**: All styles must be inline or in `<style>` tags for email client compatibility
2. **Responsive Design**: Use media queries for mobile devices
3. **Alt Text**: Always provide alt text for images
4. **Fallback Fonts**: Use web-safe font stacks
5. **Test Across Clients**: Test in Gmail, Outlook, Apple Mail, etc.
6. **Plain Text Alternative**: Consider providing plain text versions for better deliverability
7. **Accessibility**: Use semantic HTML and sufficient color contrast
8. **File Size**: Keep total email size under 102KB for Gmail clipping
9. **Links**: Always use absolute URLs, never relative paths
10. **Emojis**: Use Unicode emojis (e.g., `&#128722;` for 🛒) for better compatibility

### Testing Checklist

Before deploying a new template:

- [ ] Test in Gmail (web, iOS, Android)
- [ ] Test in Outlook (desktop, web)
- [ ] Test in Apple Mail (macOS, iOS)
- [ ] Test on mobile devices
- [ ] Verify all links work
- [ ] Check responsive layout
- [ ] Validate HTML
- [ ] Test with long/short content
- [ ] Check dark mode appearance
- [ ] Verify all variables render correctly
- [ ] Test with missing optional variables

### Email Client Compatibility

Templates are tested and optimized for:
- Gmail (Web, iOS, Android)
- Outlook (2013, 2016, 2019, 365, Web)
- Apple Mail (macOS, iOS)
- Yahoo Mail
- Outlook.com
- Samsung Email
- Thunderbird

### Handlebars Helpers

Available helpers in templates:

```handlebars
{{! Conditionals }}
{{#if variable}}Content{{/if}}
{{#unless variable}}Content{{/unless}}

{{! Loops }}
{{#each items}}
  {{this.property}}
{{/each}}

{{! Comparisons (if custom helpers are added) }}
{{#ifEquals status "shipped"}}Content{{/ifEquals}}
```

### Environment Variables

Templates use these environment variables (configured in EmailService):
- `FRONTEND_URL` - Base URL for frontend links
- `SUPPORT_EMAIL` - Support email address
- `EMAIL_FROM` - Sender email address
- `COMPANY_NAME` - Company name (default: CitadelBuy)

## Template Analytics

Track email performance using EmailService methods:
- `getEmailStats()` - Get delivery statistics
- `getEmailLogs()` - View email logs with filters
- Email opens and clicks (requires tracking pixels/links)

## Troubleshooting

### Common Issues

1. **Template not found error**:
   - Check file name matches exactly (case-sensitive)
   - Ensure `.hbs` extension is included
   - Verify file is in `/templates` directory

2. **Variables not rendering**:
   - Check variable names match context object
   - Use `{{variable}}` for strings, `{{{html}}}` for HTML
   - Verify data is passed to `sendEmail()` context

3. **Styles not applying**:
   - Use inline styles for critical CSS
   - Avoid external stylesheets
   - Test in multiple email clients

4. **Images not loading**:
   - Use absolute URLs
   - Host images on CDN
   - Provide alt text fallback

## Additional Resources

- [Handlebars Documentation](https://handlebarsjs.com/)
- [Email Client CSS Support](https://www.caniemail.com/)
- [Email on Acid](https://www.emailonacid.com/) - Testing tool
- [Litmus](https://www.litmus.com/) - Testing tool
- [Really Good Emails](https://reallygoodemails.com/) - Inspiration

## Support

For questions or issues with email templates:
- Create an issue in the repository
- Contact the development team
- Email: dev@citadelbuy.com

---

**Last Updated**: December 2025
**Maintainer**: CitadelBuy Development Team
