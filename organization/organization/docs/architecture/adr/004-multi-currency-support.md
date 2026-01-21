# ADR 004: Multi-Currency and Exchange Rate Management

**Status**: Accepted

**Date**: 2025-12-06

**Deciders**: Platform Architecture Team, CTO, Finance Lead

**Technical Story**: Support 30+ currencies for global B2B marketplace operations

---

## Context

Broxiva operates across 6 global regions with users expecting to:
1. **View prices in local currency**: Nigerians see NGN, Americans see USD, Europeans see EUR
2. **Pay in preferred currency**: Support 30+ currencies
3. **Accurate exchange rates**: Real-time or near-real-time rates
4. **Multi-currency invoicing**: Invoices in buyer's currency
5. **Vendor payouts**: Pay vendors in their preferred currency
6. **Compliance**: Meet accounting standards for multi-currency transactions
7. **FX risk management**: Minimize currency fluctuation exposure

**Challenges**:
- Exchange rates fluctuate constantly
- Different pricing strategies per region
- Import duties calculated in local currency
- Payment gateways support different currencies
- Need historical exchange rate data for accounting
- Currency conversion rounding errors

## Decision

We will implement a **comprehensive multi-currency system** with the following components:

### 1. Supported Currencies (30+)

**Base Currency**: USD (United States Dollar)
- All prices stored in base currency for consistency
- All conversions reference USD

**Supported Currencies**:
- **Major**: USD, EUR, GBP, JPY, CNY, CAD, AUD, CHF
- **African**: NGN, ZAR, KES, GHS, EGP, MAD, TZS, UGX
- **LATAM**: BRL, MXN, ARS, CLP, COP
- **Middle East**: AED, SAR, QAR, KWD
- **APAC**: SGD, HKD, INR, MYR, THB, VND

### 2. Exchange Rate Management

**Data Sources** (in priority order):
1. European Central Bank (ECB) API (free, reliable)
2. Open Exchange Rates API (backup)
3. XE.com API (tertiary)

**Update Frequency**:
- Fetch rates every 4 hours
- Cache rates in Redis (TTL: 4 hours)
- Store in PostgreSQL for historical tracking

**Rate Storage**:
```sql
CREATE TABLE currency_exchange_rates (
  id UUID PRIMARY KEY,
  from_currency VARCHAR(3),
  to_currency VARCHAR(3),
  rate DECIMAL(15,6),
  source VARCHAR(50),
  effective_from TIMESTAMP,
  effective_until TIMESTAMP,
  is_active BOOLEAN
);
```

### 3. Pricing Strategy

**Multi-tier Pricing**:
- **Display Price**: In user's preferred currency (converted from base)
- **Transaction Price**: Locked at checkout to avoid fluctuation
- **Settlement Price**: Final amount after payment processing

**Price Calculation Flow**:
1. Store product price in USD (base currency)
2. Apply regional pricing adjustments (if any)
3. Convert to display currency using latest rate
4. Lock exchange rate at checkout
5. Store both base and display amounts in order

**Example**:
```javascript
// Product base price: $100 USD
// User in Nigeria
// USD to NGN rate: 1,500

Display Price: ₦150,000 NGN
Locked Rate: 1,500.000000
Order stored with:
  - base_currency: 'USD'
  - base_amount: 100.00
  - display_currency: 'NGN'
  - display_amount: 150000.00
  - exchange_rate: 1500.000000
```

### 4. Currency Conversion Logic

**Conversion Rules**:
- Always convert through USD (no direct NGN → BRL conversion)
- Use mid-market rates (no markup in conversion)
- Round to currency's decimal places (JPY: 0, USD: 2, KWD: 3)
- Store conversion rate with 6 decimal precision

**Rounding Strategy**:
- Round individual items first
- Sum rounded amounts
- Adjust final total if needed (max ±0.01)

### 5. Payment Processing

**Multi-Currency Payments**:
- Stripe: 135+ currencies
- PayPal: 100+ currencies
- Regional gateways: Local currencies

**Currency Selection Priority**:
1. Buyer's preferred currency
2. Buyer's country currency
3. Vendor's currency
4. Platform base currency (USD)

**FX Fees**:
- Payment processor fees (2.9% + FX spread ~2%)
- Pass through to buyer or absorb (business decision)

### 6. Vendor Payouts

**Payout Currency**:
- Vendors choose payout currency during onboarding
- Can differ from transaction currency
- Conversion at payout time (weekly/monthly)

**Example**:
- Nigerian vendor sells to US buyer
- Transaction: $1,000 USD
- Vendor prefers NGN payout
- Payout: ₦1,500,000 NGN (minus fees)

## Consequences

### Positive

- **User Experience**: Users see prices in familiar currency
- **Global Reach**: Support for all major markets
- **Reduced Friction**: No mental currency conversion needed
- **Compliance**: Proper multi-currency accounting
- **Flexibility**: Vendors can choose payout currency
- **Transparency**: Show exchange rate and conversion clearly

### Negative

- **Complexity**: Managing 30+ currencies is complex
- **FX Risk**: Currency fluctuations can impact margins
- **Rounding Errors**: Small discrepancies due to rounding
- **API Costs**: Some exchange rate APIs charge per request
- **Storage**: Need to store historical rates
- **Testing**: Complex to test all currency combinations

### Neutral

- **Price Display**: Some users prefer USD even if not local currency
- **Regional Pricing**: May need different pricing strategies per region

## Alternatives Considered

### Alternative 1: USD Only

**Description**: Only support USD, let users do their own conversion.

**Pros**:
- Extremely simple
- No FX risk
- No exchange rate APIs needed
- Single currency accounting

**Cons**:
- Terrible user experience
- Excludes non-USD markets
- Users see unfamiliar prices
- Competitive disadvantage

**Reason for rejection**: Not viable for global marketplace.

### Alternative 2: Limited Currencies (5-10)

**Description**: Support only major currencies (USD, EUR, GBP, NGN, CNY).

**Pros**:
- Simpler than 30+ currencies
- Covers 80% of use cases
- Lower complexity

**Cons**:
- Excludes important markets (LATAM, Middle East)
- Users in unsupported countries have poor experience
- Limits growth

**Reason for rejection**: Arbitrary limitation that hurts global expansion.

### Alternative 3: Dynamic Pricing (Per Region)

**Description**: Set different prices per region/currency manually.

**Pros**:
- Full control over regional pricing
- Can account for purchasing power
- Optimize for each market

**Cons**:
- Huge operational overhead (update 30+ prices per product)
- Inconsistent pricing (arbitrage opportunities)
- Difficult to maintain
- Vendor confusion

**Reason for rejection**: Too much manual work, hard to scale.

### Alternative 4: Payment Processor Conversion

**Description**: Let Stripe/PayPal handle all currency conversion.

**Pros**:
- Offload complexity to payment processor
- No exchange rate API needed
- Simpler implementation

**Cons**:
- Higher FX markup (3-4% vs 0-1%)
- Less control over rates
- Can't show accurate prices before checkout
- Different rates from different processors

**Reason for rejection**: Higher costs, worse user experience.

## Implementation Notes

### Phase 1: Foundation (Completed)
- ✅ Define supported currencies
- ✅ Integrate exchange rate API
- ✅ Build currency conversion service
- ✅ Update database schema

### Phase 2: Product Pricing (In Progress)
- Display prices in user's currency
- Add currency selector
- Store exchange rates historically
- Implement rate caching

### Phase 3: Checkout & Payments (Planned)
- Lock exchange rate at checkout
- Multi-currency payment processing
- Store dual currency amounts (base + display)
- Handle payment processor currency limitations

### Phase 4: Accounting & Reporting (Planned)
- Multi-currency financial reports
- Vendor payout in multiple currencies
- FX gain/loss tracking
- Tax reporting in multiple currencies

### Technical Implementation

**Currency Service**:
```typescript
class CurrencyService {
  async convert(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    rateDate?: Date
  ): Promise<number> {
    // Get exchange rate (cached or fetch)
    const rate = await this.getExchangeRate(fromCurrency, toCurrency, rateDate);

    // Convert
    const converted = amount * rate;

    // Round to currency decimal places
    return this.round(converted, toCurrency);
  }

  async getExchangeRate(from: string, to: string, date?: Date): Promise<number> {
    // Check Redis cache first
    const cached = await this.redis.get(`rate:${from}:${to}`);
    if (cached) return parseFloat(cached);

    // Fetch from database
    const dbRate = await this.prisma.exchangeRate.findFirst({
      where: {
        from_currency: from,
        to_currency: to,
        effective_from: { lte: date || new Date() },
        effective_until: { gte: date || new Date() }
      }
    });

    if (dbRate) {
      // Cache for 4 hours
      await this.redis.setex(`rate:${from}:${to}`, 14400, dbRate.rate);
      return dbRate.rate;
    }

    // Fetch from external API and cache
    return this.fetchAndCacheRate(from, to);
  }
}
```

### Monitoring & Alerts

**Metrics**:
- Exchange rate API failures
- Conversion errors
- Large rate fluctuations (> 5% change)
- Currency conversion volume

**Alerts**:
- Exchange rate API unavailable
- Stale rates (> 6 hours old)
- Abnormal FX movements
- Rounding discrepancies

## References

- [Stripe Multi-Currency Guide](https://stripe.com/docs/currencies)
- [PayPal Multi-Currency](https://developer.paypal.com/docs/reports/reference/multicurrency/)
- [ISO 4217 Currency Codes](https://www.iso.org/iso-4217-currency-codes.html)
- [ECB Exchange Rates API](https://www.ecb.europa.eu/stats/policy_and_exchange_rates/)
- [Shopify Multi-Currency Implementation](https://shopify.dev/docs/apps/payments/multicurrency)

---

**Last Updated**: 2025-12-06
**Author**: Platform Architecture Team
**Reviewers**: CTO, Finance Lead, Principal Engineers
