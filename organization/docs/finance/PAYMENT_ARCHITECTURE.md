# CitadelBuy Global B2B Payment Architecture

## Overview

CitadelBuy's payment infrastructure is designed to handle global B2B transactions with multi-currency support, enterprise payment methods, and comprehensive tax compliance.

---

## Architecture Components

### 1. Multi-Currency System

#### Exchange Rate Service
- **Location**: `organization/apps/api/src/modules/payments/multi-currency/exchange-rate.service.ts`
- **Features**:
  - Real-time FX rates from multiple providers (OpenExchangeRates, CurrencyLayer, ECB)
  - Automatic fallback to backup providers
  - Redis caching (1-hour TTL)
  - Support for 160+ currencies
  - Historical rate tracking
  - Auto-refresh every hour

#### Currency Conversion Service
- **Location**: `organization/apps/api/src/modules/payments/multi-currency/currency-conversion.service.ts`
- **Features**:
  - Automatic currency conversion
  - Dynamic conversion fees (0.3% - 1.5% based on corridor)
  - Exchange rate markup for revenue (0.2% - 0.5%)
  - Batch conversion support
  - Conversion history tracking
  - Analytics and reporting

#### Supported Currencies (60+)
**Major Currencies**: USD, EUR, GBP, JPY, CNY, CAD, AUD, CHF

**African Currencies**: NGN, ZAR, KES, GHS, EGP, TZS, UGX, XOF, XAF, RWF

**Asian Currencies**: INR, KRW, SGD, HKD, THB, MYR, IDR, PHP, VND, PKR, BDT

**Middle East**: AED, SAR, ILS, QAR, KWD, BHD, OMR, JOD

**Latin America**: BRL, MXN, ARS, CLP, COP, PEN

---

## 2. Enterprise Payment Methods

### Escrow Service (Milestone-Based)
- **Location**: `organization/apps/api/src/modules/payments/enterprise/escrow.service.ts`
- **Use Cases**:
  - Large B2B transactions ($10K - $10M+)
  - Multi-milestone projects
  - International trade with trust issues
  - Custom manufacturing orders

**Workflow**:
1. Buyer and seller agree on milestones
2. Buyer funds escrow account
3. Seller completes milestone and submits deliverables
4. Buyer approves milestone
5. Funds released to seller (automatic or manual)
6. Repeat for next milestone

**Features**:
- Multi-milestone support
- Automatic fund release (configurable delay)
- Dispute resolution
- Partial releases
- Refund handling

---

### Letter of Credit (LC)
- **Location**: `organization/apps/api/src/modules/payments/enterprise/letter-of-credit.service.ts`
- **Types**:
  - Sight LC (immediate payment)
  - Usance LC (deferred payment)
  - Irrevocable LC
  - Confirmed LC

**Workflow**:
1. Buyer applies for LC at their bank
2. Issuing bank issues LC to beneficiary (seller)
3. Seller ships goods and presents documents
4. Documents verified against LC terms
5. Bank releases payment

**Required Documents**:
- Commercial invoice
- Bill of lading
- Certificate of origin
- Packing list
- Insurance certificate

---

### Wire Transfer Service
- **Location**: `organization/apps/api/src/modules/payments/enterprise/wire-transfer.service.ts`
- **Networks**:
  - SWIFT (international)
  - ACH (US domestic)
  - SEPA (European)
  - BACS (UK)
  - Wire (direct bank-to-bank)

**Fees**:
- SWIFT: $25 per transfer
- ACH: $1 per transfer
- SEPA: €0.50 per transfer
- Wire: $15 per transfer

**Timing**:
- SWIFT: 1-3 business days
- ACH: 1-2 business days
- SEPA: 1 business day
- Wire: Same day

---

### Invoice Financing
- **Location**: `organization/apps/api/src/modules/payments/enterprise/invoice-financing.service.ts`
- **Types**:
  - Invoice Factoring (sell invoices at discount)
  - Invoice Discounting (use as collateral)
  - Supply Chain Financing

**Terms**:
- Advance Rate: 85% of invoice value
- Discount Rate: 2% per month
- Typical Period: 30-90 days

**Example**:
- Invoice Amount: $100,000
- Payment Terms: 60 days
- Advance: $85,000 (85%)
- Discount Fee: $3,400 (2% × 2 months)
- Net to Supplier: $81,600
- Effective APR: 24.8%

---

## 3. Global Tax Engine

### VAT Service
- **Location**: `organization/apps/api/src/modules/tax/vat.service.ts`
- **Coverage**:
  - EU VAT (19-27%)
  - UK VAT (20%)
  - African VAT (7.5% - 18%)
  - GST (India, Singapore, Australia)

**Features**:
- Reverse charge for B2B in EU
- VAT number validation
- Digital services VAT rules
- Threshold management

---

### Customs Duty Service
- **Location**: `organization/apps/api/src/modules/tax/customs-duty.service.ts`
- **Features**:
  - HS code-based duty calculation
  - Country-specific duty rates
  - Additional fees (MPF, ETLS)
  - De minimis threshold handling

**Duty Rates** (examples):
- US: 0% - 16.4% (depending on HS code)
- EU: 0% - 14%
- Nigeria: 5% - 20%

---

### Tax Compliance Service
- **Location**: `organization/apps/api/src/modules/tax/tax-compliance.service.ts`
- **Features**:
  - Multi-jurisdiction tax reporting
  - CSV/JSON export
  - Audit trail
  - Breakdown by tax type

---

## 4. Regional Payment Rails

### Africa Payments
- **Location**: `organization/apps/api/src/modules/payments/regional/africa-payments.service.ts`
- **Providers**:
  - Flutterwave (9 countries)
  - Paystack (4 countries)

**Payment Methods**:
- Card payments
- Mobile Money (M-Pesa, MTN, Airtel)
- Bank transfers
- USSD codes

**Coverage**:
- Nigeria, Kenya, Ghana, South Africa, Tanzania, Uganda, Rwanda, etc.

---

### US Payments
- **Location**: `organization/apps/api/src/modules/payments/regional/us-payments.service.ts`
- **Provider**: Stripe

**Payment Methods**:
- Credit/Debit cards
- ACH Direct Debit
- ACH Credit Transfer
- Wire Transfer
- Apple Pay, Google Pay

---

### EU Payments
- **Location**: `organization/apps/api/src/modules/payments/regional/eu-payments.service.ts`
- **Provider**: Stripe

**Payment Methods**:
- SEPA Direct Debit
- SEPA Credit Transfer
- Cards
- iDEAL (Netherlands)
- Sofort (Germany)
- Bancontact (Belgium)

---

### Asia Payments
- **Location**: `organization/apps/api/src/modules/payments/regional/asia-payments.service.ts`
- **Providers**: Stripe, Alipay, WeChat Pay

**Payment Methods**:
- Alipay (China)
- WeChat Pay (China)
- UPI (India)
- PayNow (Singapore)
- GrabPay (Southeast Asia)
- Cards

---

## 5. Settlement Process

### Cross-Border Settlement Flow

```
1. Transaction Initiated
   ├─ Buyer places order in local currency
   ├─ System calculates conversion to seller currency
   └─ Conversion fee and FX markup applied

2. Payment Collection
   ├─ Regional payment rail processes payment
   ├─ Payment held in platform account
   └─ Confirmation sent to buyer and seller

3. Currency Conversion
   ├─ Real-time FX rate fetched
   ├─ Conversion executed
   └─ Conversion logged for audit

4. Tax Calculation
   ├─ VAT/Sales tax calculated
   ├─ Customs duties estimated (if applicable)
   └─ Tax report generated

5. Settlement to Seller
   ├─ Converted amount transferred to seller
   ├─ Platform fee deducted
   ├─ Payment rail fee deducted
   └─ Settlement confirmation sent
```

---

## 6. Fee Structure

### Platform Fees
- **Standard Transaction**: 2.5% + $0.30
- **Enterprise (>$10K)**: 1.5% + $5
- **High Volume (>$100K/month)**: 1.0% + $10

### Currency Conversion Fees
- **Major Pairs** (USD/EUR/GBP): 0.3%
- **African Corridors**: 1.0%
- **Exotic Pairs**: 1.5%

### Payment Method Fees
- **Cards**: 2.9% + $0.30
- **Bank Transfer**: $1 - $25
- **Mobile Money**: 1.5%
- **SEPA**: €0.50

---

## 7. Compliance Requirements

### KYC/AML
- Customer identity verification
- Business registration verification
- Ultimate Beneficial Owner (UBO) identification
- Transaction monitoring
- Sanctions screening

### Tax Compliance
- VAT registration in relevant jurisdictions
- Tax reporting by country
- Digital services tax compliance
- Transfer pricing documentation

### Data Compliance
- PCI DSS Level 1 compliance
- GDPR compliance (EU customers)
- Data residency requirements
- Encryption at rest and in transit

---

## 8. API Integration Examples

### Create Payment with Currency Conversion

```typescript
POST /api/currencies/convert
{
  "amount": 100000,
  "fromCurrency": "USD",
  "toCurrency": "NGN",
  "purpose": "payment",
  "userId": "user_123"
}

Response:
{
  "success": true,
  "originalAmount": 100000,
  "originalCurrency": "USD",
  "convertedAmount": 77500000,
  "convertedCurrency": "NGN",
  "exchangeRate": 775,
  "conversionFee": 1000,
  "conversionFeePercent": 0.01,
  "totalCost": 101000
}
```

### Create Escrow Agreement

```typescript
POST /api/payments/escrow
{
  "orderId": "order_456",
  "buyerId": "buyer_123",
  "sellerId": "seller_789",
  "totalAmount": 50000,
  "currency": "USD",
  "milestones": [
    {
      "name": "Design Phase",
      "description": "Complete product design",
      "amount": 15000,
      "dueDate": "2025-02-01"
    },
    {
      "name": "Manufacturing",
      "description": "Produce 1000 units",
      "amount": 25000,
      "dueDate": "2025-03-15"
    },
    {
      "name": "Delivery",
      "description": "Ship to warehouse",
      "amount": 10000,
      "dueDate": "2025-04-01"
    }
  ],
  "automaticRelease": true,
  "releaseDelay": 3
}
```

### Calculate VAT

```typescript
POST /api/tax/vat/calculate
{
  "netAmount": 10000,
  "country": "DE",
  "vatNumber": "DE123456789",
  "isB2B": true
}

Response:
{
  "country": "DE",
  "netAmount": 10000,
  "vatRate": 0.19,
  "vatAmount": 0,
  "grossAmount": 10000,
  "isReverseCharge": true
}
```

---

## 9. Error Handling

### Common Error Codes

- `CURRENCY_NOT_SUPPORTED`: Currency not available
- `INSUFFICIENT_BALANCE`: Insufficient escrow balance
- `CONVERSION_FAILED`: Currency conversion error
- `TAX_CALCULATION_FAILED`: Tax calculation error
- `PAYMENT_PROVIDER_ERROR`: Provider API error
- `COMPLIANCE_CHECK_FAILED`: KYC/AML check failed

---

## 10. Monitoring & Analytics

### Key Metrics
- Total transaction volume (by currency)
- Conversion fees earned
- Average conversion rate markup
- Settlement success rate
- Failed payment rate
- Average settlement time

### Alerts
- Failed payment threshold exceeded
- Large transaction anomaly
- Compliance flag triggered
- Provider downtime detected
- FX rate anomaly

---

## 11. Future Enhancements

### Planned Features
1. Cryptocurrency support (BTC, ETH, USDT)
2. Open Banking integration (EU PSD2)
3. Real-time settlement
4. Dynamic currency hedging
5. Automated tax filing
6. Blockchain-based trade finance
7. AI-powered fraud detection
8. Multi-party escrow
9. Carbon-neutral shipping offset
10. Trade credit insurance

---

## 12. Contact & Support

**Technical Support**: fintech@citadelbuy.com
**Compliance**: compliance@citadelbuy.com
**Enterprise Sales**: enterprise@citadelbuy.com

**Documentation**: https://docs.citadelbuy.com/payments
**API Reference**: https://api.citadelbuy.com/docs

---

## Appendix A: Supported Countries

### Tier 1 (Full Support)
US, UK, CA, DE, FR, IT, ES, NL, NG, ZA, KE, GH

### Tier 2 (Regional Support)
AU, NZ, SG, HK, JP, IN, CN, BR, MX, AE, SA

### Tier 3 (Limited Support)
All other countries via Stripe/PayPal

---

## Appendix B: Conversion Fee Matrix

| Corridor | Fee | Volume Discount |
|----------|-----|-----------------|
| USD-EUR | 0.3% | 0.2% (>$1M/mo) |
| USD-GBP | 0.3% | 0.2% (>$1M/mo) |
| USD-NGN | 1.0% | 0.8% (>$500K/mo) |
| USD-ZAR | 0.8% | 0.6% (>$500K/mo) |
| USD-KES | 1.0% | 0.8% (>$250K/mo) |
| EUR-GBP | 0.3% | 0.2% (>€1M/mo) |
| Exotic | 1.5% | 1.2% (>$250K/mo) |

---

**Document Version**: 1.0
**Last Updated**: 2025-01-XX
**Author**: Finance Agent - CitadelBuy Engineering
