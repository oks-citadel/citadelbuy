# Tax Calculation System Documentation

**Version:** 2.0
**Last Updated:** 2025-11-20
**Status:** Production Ready

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Integration with Orders](#integration-with-orders)
- [External Providers](#external-providers)
- [Configuration](#configuration)
- [Usage Examples](#usage-examples)
- [Testing](#testing)

---

## Overview

The CitadelBuy Tax Calculation System provides comprehensive tax management functionality for e-commerce operations, including:

- Automated tax calculation based on location (jurisdiction-based)
- Support for multiple tax types (Sales Tax, VAT, GST, HST, PST, etc.)
- Tax exemption management at customer, product, and category levels
- Tax reporting and compliance features
- Integration with external tax providers (TaxJar, Avalara)
- International tax support with multi-currency handling

---

## Features

### 1. **Tax Rate Management**
- Create and manage tax rates by jurisdiction (country, state, city, ZIP code)
- Support for multiple calculation methods:
  - Percentage-based
  - Flat rate
  - Tiered rates
  - Compound taxes (tax-on-tax)
- Wildcard ZIP code matching (e.g., "900*" matches all ZIP codes starting with 900)
- Priority-based rate application when multiple rates match
- Date-based effective periods for tax rate changes

### 2. **Tax Exemption Handling**
- Customer-level exemptions (tax-exempt organizations)
- Product-level exemptions (tax-free items like groceries, medicine)
- Category-level exemptions
- Certificate management with verification workflow
- Expiration date tracking
- Verification notes and audit trail

### 3. **Location-Based Tax Calculation**
- Automatic jurisdiction detection based on shipping address
- Support for multiple tax jurisdictions per order
- Cascading tax rules (federal, state, county, city, special districts)
- Tax breakdown by jurisdiction for transparency

### 4. **Tax Reporting**
- Automated tax report generation (daily, weekly, monthly, quarterly, annual)
- Detailed breakdown by tax type and jurisdiction
- Total orders, taxable amount, and tax collected tracking
- Export capabilities for filing with tax authorities
- Draft and finalized report statuses

### 5. **External Provider Integration**
- **TaxJar** integration for US tax calculation
- **Avalara AvaTax** integration for global tax compliance
- Automatic rate updates from providers
- Transaction recording for audit purposes
- Certificate validation through provider APIs

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                         Tax Module                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐     ┌──────────────────────────────┐ │
│  │  TaxController    │────▶│      TaxService              │ │
│  │  (REST API)       │     │  (Business Logic)            │ │
│  └──────────────────┘     └──────────────────────────────┘ │
│                                      │                       │
│                          ┌───────────┴───────────┐          │
│                          │                       │          │
│                  ┌───────▼──────┐        ┌──────▼──────┐   │
│                  │   Internal    │        │   External   │   │
│                  │ Calculation   │        │  Providers   │   │
│                  │    Engine     │        │  (Factory)   │   │
│                  └───────────────┘        └──────────────┘   │
│                                                  │            │
│                                     ┌────────────┼────────────┐
│                                     │            │            │
│                             ┌───────▼───┐  ┌────▼────┐       │
│                             │  TaxJar   │  │ Avalara │       │
│                             │  Provider │  │ Provider│       │
│                             └───────────┘  └─────────┘       │
└─────────────────────────────────────────────────────────────┘
                                    │
                        ┌───────────▼──────────┐
                        │   Orders Module       │
                        │ (Integration Point)   │
                        └──────────────────────┘
```

### Module Structure

```
src/modules/tax/
├── tax.module.ts              # Module definition
├── tax.controller.ts          # REST API endpoints
├── tax.service.ts             # Core business logic
├── dto/
│   ├── create-tax-rate.dto.ts
│   ├── create-tax-exemption.dto.ts
│   └── ...
└── providers/
    ├── tax-provider.interface.ts
    ├── tax-provider.factory.ts
    ├── taxjar.provider.ts
    └── avalara.provider.ts
```

---

## Database Schema

### Models

#### 1. **TaxRate**
Stores tax rate configurations by jurisdiction.

```prisma
model TaxRate {
  id                String              @id @default(uuid())
  name              String
  code              String              @unique
  description       String?
  taxType           TaxType
  calculationMethod TaxCalculationMethod @default(PERCENTAGE)
  rate              Float
  country           String
  state             String?
  city              String?
  zipCode           String?
  county            String?
  applyToShipping   Boolean             @default(false)
  applyToGiftCards  Boolean             @default(false)
  compoundTax       Boolean             @default(false)
  priority          Int                 @default(0)
  status            TaxRateStatus       @default(ACTIVE)
  effectiveFrom     DateTime            @default(now())
  effectiveTo       DateTime?
  externalId        String?
  externalProvider  String?
  categoryIds       String[]
  metadata          Json?
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt
}
```

#### 2. **TaxExemption**
Manages tax exemption certificates and rules.

```prisma
model TaxExemption {
  id                String              @id @default(uuid())
  userId            String?
  productId         String?
  categoryId        String?
  taxRateId         String?
  exemptionType     TaxExemptionType
  exemptionReason   String
  certificateNumber String?
  certificateFile   String?
  country           String
  state             String?
  validFrom         DateTime            @default(now())
  validUntil        DateTime?
  isActive          Boolean             @default(true)
  verifiedBy        String?
  verifiedAt        DateTime?
  verificationNotes String?
  metadata          Json?
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt
}
```

#### 3. **TaxCalculation**
Records tax calculations for each order.

```prisma
model TaxCalculation {
  id                    String    @id @default(uuid())
  orderId               String    @unique
  country               String
  state                 String?
  city                  String?
  zipCode               String?
  subtotal              Float
  shippingAmount        Float     @default(0)
  taxableAmount         Float
  taxAmount             Float
  taxBreakdown          Json
  calculationMethod     String
  externalProvider      String?
  externalTransactionId String?
  exemptionsApplied     Json?
  calculatedAt          DateTime  @default(now())
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
}
```

#### 4. **TaxReport**
Stores generated tax reports for compliance.

```prisma
model TaxReport {
  id                String    @id @default(uuid())
  reportType        String
  periodStart       DateTime
  periodEnd         DateTime
  country           String
  state             String?
  totalOrders       Int       @default(0)
  taxableAmount     Float     @default(0)
  totalTaxCollected Float     @default(0)
  totalExemptions   Float     @default(0)
  breakdown         Json
  status            String    @default("draft")
  filedAt           DateTime?
  filedBy           String?
  reportFile        String?
  metadata          Json?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}
```

#### 5. **TaxConfiguration**
Global tax system configuration.

```prisma
model TaxConfiguration {
  id                String    @id @default(uuid())
  taxEnabled        Boolean   @default(true)
  defaultTaxBehavior String   @default("tax_exclusive")
  externalProvider  String?
  apiKey            String?
  apiEndpoint       String?
  businessName      String?
  taxId             String?
  address           Json?
  nexusLocations    Json
  roundingMode      String    @default("half_up")
  roundingPrecision Int       @default(2)
  displayTaxInPrice Boolean   @default(false)
  displayTaxLabel   String    @default("Tax")
  metadata          Json?
  updatedAt         DateTime  @updatedAt
  updatedBy         String?
}
```

---

## API Endpoints

### Tax Rates

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/tax/rates` | Admin | Create a new tax rate |
| GET | `/tax/rates` | Public | List all tax rates (with filters) |
| GET | `/tax/rates/:id` | Public | Get a specific tax rate |
| PUT | `/tax/rates/:id` | Admin | Update a tax rate |
| DELETE | `/tax/rates/:id` | Admin | Delete a tax rate |

### Tax Calculation

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/tax/calculate` | Public | Calculate tax for an order |
| POST | `/tax/orders/:orderId/calculate` | Authenticated | Calculate and store tax for an order |

### Tax Exemptions

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/tax/exemptions` | Admin | Create a tax exemption |
| GET | `/tax/exemptions` | Admin | List all tax exemptions |
| GET | `/tax/exemptions/:id` | Admin | Get a specific tax exemption |
| POST | `/tax/exemptions/verify` | Admin | Verify a tax exemption certificate |
| DELETE | `/tax/exemptions/:id` | Admin | Delete a tax exemption |

### Tax Reports

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/tax/reports/generate` | Admin | Generate a new tax report |
| GET | `/tax/reports` | Admin | List all tax reports |
| POST | `/tax/reports/:id/finalize` | Admin | Finalize a tax report |

---

## Integration with Orders

The tax system is automatically integrated with the orders module. When an order is created:

1. **Order Creation** → `OrdersService.create()`
2. **Extract Location** → Get shipping address details
3. **Get Product Categories** → Extract category IDs from order items
4. **Calculate Tax** → Call `TaxService.calculateTax()`
5. **Apply Exemptions** → Check for applicable exemptions
6. **Store Calculation** → Save tax calculation record
7. **Create Order** → Save order with calculated tax amount

### Example Order Flow

```typescript
// In OrdersService
async create(userId: string, createOrderDto: CreateOrderDto) {
  // 1. Extract product details
  const products = await this.prisma.product.findMany({
    where: { id: { in: productIds } },
  });

  // 2. Calculate tax automatically
  const taxCalculation = await this.taxService.calculateTax({
    subtotal,
    shippingAmount: shipping,
    country: 'US',
    state: 'CA',
    city: 'Los Angeles',
    zipCode: '90001',
    customerId: userId,
    productIds,
    categoryIds,
  });

  // 3. Create order with calculated tax
  const order = await this.prisma.order.create({
    data: {
      userId,
      total: subtotal + shipping + taxCalculation.taxAmount,
      tax: taxCalculation.taxAmount,
      // ... other fields
    },
  });

  // 4. Store tax calculation
  await this.taxService.calculateOrderTax(order.id, taxDto);
}
```

---

## External Providers

### TaxJar Integration

**Setup:**
```env
TAX_PROVIDER=taxjar
TAXJAR_API_KEY=your_api_key_here
```

**Features:**
- Real-time US sales tax calculation
- Automatic nexus detection
- Transaction recording
- Sales tax report generation

**Pricing:** Starting at $19/month

### Avalara Integration

**Setup:**
```env
TAX_PROVIDER=avalara
AVALARA_ACCOUNT_ID=your_account_id
AVALARA_LICENSE_KEY=your_license_key
AVALARA_COMPANY_CODE=DEFAULT
AVALARA_ENVIRONMENT=sandbox  # or 'production'
```

**Features:**
- Global tax calculation (180+ countries)
- VAT/GST support
- Certificate management
- Tax return filing
- Compliance reporting

**Pricing:** Custom enterprise pricing

### Internal Calculation

If no external provider is configured:
```env
TAX_PROVIDER=none
```

The system uses internal tax rate database for calculations.

---

## Configuration

### Environment Variables

```env
# Tax System Configuration
TAX_ENABLED=true
TAX_ROUNDING_MODE=half_up
TAX_ROUNDING_PRECISION=2
TAX_DISPLAY_IN_PRICE=false

# External Provider (optional)
TAX_PROVIDER=taxjar  # Options: taxjar, avalara, none
TAXJAR_API_KEY=your_api_key
AVALARA_ACCOUNT_ID=your_account_id
AVALARA_LICENSE_KEY=your_license_key
AVALARA_COMPANY_CODE=DEFAULT
AVALARA_ENVIRONMENT=production
```

---

## Usage Examples

### Example 1: Create a Tax Rate

```typescript
POST /tax/rates
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "name": "California State Sales Tax",
  "code": "US-CA-SALES",
  "description": "California state sales tax rate",
  "taxType": "SALES_TAX",
  "calculationMethod": "PERCENTAGE",
  "rate": 7.25,
  "country": "US",
  "state": "CA",
  "applyToShipping": false,
  "applyToGiftCards": false,
  "compoundTax": false,
  "priority": 1,
  "status": "ACTIVE",
  "effectiveFrom": "2025-01-01T00:00:00Z"
}
```

### Example 2: Calculate Tax for an Order

```typescript
POST /tax/calculate
Content-Type: application/json

{
  "subtotal": 100.00,
  "shippingAmount": 10.00,
  "country": "US",
  "state": "CA",
  "city": "Los Angeles",
  "zipCode": "90001",
  "categoryIds": ["category-uuid-1", "category-uuid-2"],
  "productIds": ["product-uuid-1", "product-uuid-2"]
}
```

**Response:**
```json
{
  "taxableAmount": 110.00,
  "taxAmount": 7.98,
  "taxBreakdown": [
    {
      "taxRateId": "rate-uuid",
      "name": "California State Sales Tax",
      "code": "US-CA-SALES",
      "rate": 7.25,
      "amount": 7.98,
      "taxType": "SALES_TAX"
    }
  ],
  "exemptionsApplied": [],
  "calculationMethod": "automatic",
  "totalAmount": 117.98
}
```

### Example 3: Create a Tax Exemption

```typescript
POST /tax/exemptions
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "userId": "user-uuid",
  "exemptionType": "NON_PROFIT",
  "exemptionReason": "501(c)(3) non-profit organization",
  "certificateNumber": "NP-12345678",
  "country": "US",
  "state": "CA",
  "isActive": true,
  "verificationNotes": "Verified through IRS database"
}
```

### Example 4: Generate a Tax Report

```typescript
POST /tax/reports/generate
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "reportType": "monthly",
  "periodStart": "2025-10-01",
  "periodEnd": "2025-10-31",
  "country": "US",
  "state": "CA"
}
```

---

## Testing

### Unit Tests

Run tax system unit tests:
```bash
npm test -- --testPathPattern=tax
```

### Integration Tests

Test tax calculation with sample data:
```bash
npm run test:e2e -- --testNamePattern="Tax"
```

### Manual Testing Checklist

- [ ] Create tax rate for US-CA
- [ ] Calculate tax for $100 order in California
- [ ] Verify tax breakdown includes all jurisdictions
- [ ] Create customer exemption
- [ ] Calculate tax with exemption applied
- [ ] Generate monthly tax report
- [ ] Verify report accuracy
- [ ] Test TaxJar integration (if configured)
- [ ] Test Avalara integration (if configured)
- [ ] Verify tax calculation on order creation

---

## Troubleshooting

### Common Issues

**Issue: Tax calculation returns $0**
- Check if tax rates exist for the location
- Verify tax rate status is ACTIVE
- Check effective date range
- Ensure location details are correct

**Issue: External provider error**
- Verify API credentials are correct
- Check API key permissions
- Verify network connectivity
- Check provider service status

**Issue: Multiple tax rates applied**
- This is expected for jurisdictions with compound taxes
- Check tax rate priorities
- Verify jurisdiction hierarchy (state, county, city)

---

## Best Practices

1. **Always verify tax rates** before going live in a new jurisdiction
2. **Keep certificates** for tax-exempt customers on file
3. **Generate reports regularly** for compliance
4. **Use external providers** for accuracy and automatic updates
5. **Test tax calculations** thoroughly before deployment
6. **Monitor tax calculations** for anomalies
7. **Update tax rates** when legislation changes
8. **Archive tax calculations** for audit purposes

---

## Support

For questions or issues:
- Email: support@citadelbuy.com
- Documentation: https://docs.citadelbuy.com/tax-system
- GitHub Issues: https://github.com/citadelbuy/issues

---

**Document Version:** 1.0.0
**Last Updated:** 2025-11-20
**Maintained By:** CitadelBuy Development Team
