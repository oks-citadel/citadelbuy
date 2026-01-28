# Shipping Providers - Quick Reference Guide

## File Locations

```
organization/apps/api/src/modules/shipping/
├── dto/
│   ├── shipping.dto.ts                          # Main DTOs
│   └── pickup.dto.ts                            # Pickup scheduling DTOs (NEW)
├── providers/
│   ├── shipping-provider.interface.ts           # Original interface
│   ├── shipping-provider-updated.interface.ts   # Enhanced interface (NEW)
│   ├── shipping-provider.factory.ts             # Provider factory (NEW)
│   ├── pickup-scheduling.mixin.ts               # Pickup implementations (NEW)
│   ├── fedex.provider.ts                        # Existing FedEx
│   ├── fedex-enhanced.provider.ts               # Enhanced FedEx example (NEW)
│   ├── ups.provider.ts                          # Enhanced UPS
│   ├── dhl.provider.ts                          # Enhanced DHL
│   ├── usps.provider.ts                         # Existing USPS
│   └── README.md                                # Provider docs (NEW)
├── shipping.controller.ts                       # API endpoints
├── shipping.service.ts                          # Business logic
├── shipping.module.ts                           # Module definition
├── IMPLEMENTATION_SUMMARY.md                    # This summary (NEW)
├── INTEGRATION_GUIDE.md                         # Step-by-step guide (NEW)
├── SHIPPING_PROVIDERS_IMPLEMENTATION.md         # Technical docs (NEW)
└── QUICK_REFERENCE.md                           # This file (NEW)
```

## Quick Start Commands

```bash
# 1. Set environment variables
cp .env.example .env
# Edit .env and add carrier credentials

# 2. Install dependencies (if needed)
pnpm install

# 3. Run database migration
npx prisma migrate dev

# 4. Start development server
pnpm dev

# 5. Test the API
curl -X POST http://localhost:3000/api/shipping/rates \
  -H "Content-Type: application/json" \
  -d @test-rate-request.json
```

## Environment Variables Template

```env
# FedEx
FEDEX_API_KEY=your_fedex_client_id
FEDEX_API_SECRET=your_fedex_client_secret
FEDEX_ACCOUNT_NUMBER=123456789
FEDEX_METER_NUMBER=987654321

# UPS
UPS_API_KEY=your_ups_client_id
UPS_API_SECRET=your_ups_client_secret
UPS_ACCOUNT_NUMBER=ABC123

# DHL
DHL_API_KEY=your_dhl_api_key
DHL_API_SECRET=your_dhl_api_secret
DHL_ACCOUNT_NUMBER=123456789

# USPS
USPS_API_KEY=your_usps_user_id
USPS_ACCOUNT_NUMBER=123456789

# Environment
NODE_ENV=development
```

## API Endpoints Quick Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/shipping/rates` | Calculate shipping rates |
| `POST` | `/api/shipping/shipments` | Create shipment & label |
| `GET` | `/api/shipping/shipments/track` | Track shipment |
| `POST` | `/api/shipping/pickups` | Schedule pickup |
| `POST` | `/api/shipping/pickups/cancel` | Cancel pickup |
| `GET` | `/api/shipping/pickups` | List pickups |

## Code Snippets

### Calculate Rates

```typescript
const rates = await shippingService.calculateRates({
  fromAddress: {
    name: "Warehouse",
    street1: "123 Main St",
    city: "Los Angeles",
    state: "CA",
    postalCode: "90001",
    country: "US"
  },
  toAddress: {
    name: "Customer",
    street1: "456 Oak Ave",
    city: "New York",
    state: "NY",
    postalCode: "10001",
    country: "US"
  },
  package: {
    type: "SMALL_PACKAGE",
    weight: 5.5,
    length: 12,
    width: 8,
    height: 6
  },
  carriers: ["UPS", "FEDEX"],
  serviceLevels: ["GROUND", "TWO_DAY"]
});
```

### Create Label

```typescript
const label = await shippingService.createShipment({
  orderId: "order_123",
  carrier: "UPS",
  serviceLevel: "GROUND",
  fromAddress: warehouseAddress,
  toAddress: customerAddress,
  package: packageInfo,
  signature: false,
  insurance: 100
});
```

### Schedule Pickup

```typescript
const pickup = await shippingService.schedulePickup({
  carrier: "UPS",
  pickupAddress: warehouseAddress,
  pickupDate: "2025-12-10",
  readyTime: "09:00",
  closeTime: "17:00",
  packageCount: 5,
  totalWeight: 45.5,
  specialInstructions: "Call upon arrival",
  trackingNumbers: ["1Z123...", "1Z456..."]
});
```

### Track Shipment

```typescript
const tracking = await shippingService.trackShipment({
  trackingNumber: "1Z999AA10123456784",
  carrier: "UPS"
});
```

## Provider-Specific Quick Reference

### FedEx

**Service Types:**
- `FEDEX_GROUND` → Ground (4-5 days)
- `FEDEX_2_DAY` → 2-day express
- `PRIORITY_OVERNIGHT` → Next day
- `INTERNATIONAL_PRIORITY` → International

**API Endpoints:**
- Auth: `POST /oauth/token`
- Rates: `POST /rate/v1/rates/quotes`
- Ship: `POST /ship/v1/shipments`
- Track: `POST /track/v1/trackingnumbers`
- Pickup: `POST /pickup/v1/pickups`

### UPS

**Service Codes:**
- `01` → Next Day Air
- `02` → 2nd Day Air
- `03` → Ground
- `07` → Worldwide Express

**API Endpoints:**
- Auth: `POST /security/v1/oauth/token`
- Rates: `POST /api/rating/v2205/Shop`
- Ship: `POST /api/shipments/v2205/ship`
- Track: `GET /api/track/v1/details/{tracking}`
- Pickup: `POST /api/pickup/v1/pickups`

### DHL

**Product Codes:**
- `N` → Express Domestic (Next Day)
- `P` → Express 12:00 (2-Day)
- `G` → Express Worldwide
- `D` → Worldwide Non-Doc

**API Endpoints:**
- Auth: `POST https://api.dhl.com/oauth2/v1/token`
- Rates: `POST /rates`
- Ship: `POST /shipments`
- Track: `GET /shipments/{tracking}/tracking`
- Pickup: `POST /pickups`

### USPS

**Services:**
- Priority Mail (2-3 days)
- First Class (2-5 days, up to 13 oz)
- Priority Mail Express (overnight-2 days)
- Priority Mail International

**API Format:** XML over HTTP GET
- Base: `https://secure.shippingapis.com/ShippingAPI.dll`
- Rates: `?API=RateV4`
- Track: `?API=TrackV2`
- Pickup: `?API=CarrierPickupSchedule`

## Common Tasks

### Add New Carrier Credentials

```typescript
// Via API
POST /api/shipping/providers
{
  "carrier": "FEDEX",
  "name": "FedEx Production",
  "apiKey": "...",
  "apiSecret": "...",
  "accountNumber": "...",
  "meterNumber": "...",
  "testMode": false
}
```

### Enable/Disable Carrier

```typescript
// Via database
await prisma.shippingProvider.update({
  where: { id: "provider_id" },
  data: { isActive: false }
});
```

### Clear Rate Cache

```typescript
await shippingService.clearRateCache();
```

### Get Provider Status

```typescript
const providers = await shippingService.getProviders();
console.log(providers.map(p => ({
  carrier: p.carrier,
  active: p.isActive,
  testMode: p.testMode
})));
```

## Troubleshooting

### Issue: API Returns 401 Unauthorized

**Solution:**
1. Check credentials in `.env`
2. Verify credentials are for correct environment (test vs prod)
3. Check if account is active with carrier
4. For FedEx/UPS: Ensure OAuth credentials are correct

### Issue: No Rates Returned

**Solution:**
1. Verify addresses are valid
2. Check package weight/dimensions are realistic
3. Ensure postal codes are correct format
4. Try with different service levels
5. Check carrier supports the route

### Issue: Pickup Scheduling Fails

**Solution:**
1. Verify pickup date is in future (not today for some carriers)
2. Check ready/close times are during business hours
3. Ensure carrier services the pickup address
4. Verify account has pickup privileges

### Issue: Tracking Not Updating

**Solution:**
1. Allow 24 hours after label creation
2. Verify tracking number format is correct
3. Check if package was actually shipped
4. Try different carrier's tracking page directly

## Testing Checklist

- [ ] Environment variables set
- [ ] Database migrated
- [ ] Server starts without errors
- [ ] Can create provider instances
- [ ] Rate calculation works (test mode)
- [ ] Label generation works (test mode)
- [ ] Tracking returns mock data
- [ ] Pickup scheduling works (test mode)
- [ ] Error handling tested
- [ ] Cache working properly

## Production Deployment Checklist

- [ ] Production credentials obtained
- [ ] Test mode disabled
- [ ] Environment variables secured
- [ ] Database backup created
- [ ] Monitoring configured
- [ ] Alerts set up
- [ ] Rate limiting enabled
- [ ] SSL/TLS verified
- [ ] Load testing completed
- [ ] Rollback plan documented

## Performance Tips

1. **Cache Aggressively**
   - Rates: 1 hour
   - Tracking: 15 minutes
   - Provider configs: 24 hours

2. **Batch Operations**
   - Schedule one pickup per day per carrier
   - Bulk label generation when possible

3. **Parallel Requests**
   - Fetch rates from all carriers simultaneously
   - Don't wait for sequential responses

4. **Monitor API Usage**
   - Track calls per carrier
   - Watch for rate limit warnings
   - Optimize high-frequency operations

## Security Checklist

- [ ] API keys stored encrypted
- [ ] No credentials in logs
- [ ] HTTPS only for API calls
- [ ] Input validation on all endpoints
- [ ] Rate limiting implemented
- [ ] Auth tokens expire and refresh
- [ ] No sensitive data in cache keys
- [ ] Error messages don't leak info

## Key Metrics to Monitor

| Metric | Target | Alert Threshold |
|--------|--------|----------------|
| API Success Rate | > 99% | < 95% |
| Average Response Time | < 2s | > 5s |
| Cache Hit Rate | > 70% | < 50% |
| Failed Pickups | < 1% | > 5% |
| Label Generation Success | > 99% | < 98% |

## Support Contacts

**FedEx Developer Support:**
- Portal: https://developer.fedex.com
- Email: apisupport@fedex.com

**UPS Developer Support:**
- Portal: https://developer.ups.com
- Phone: 1-800-742-5877

**DHL Developer Support:**
- Portal: https://developer.dhl.com
- Email: developer.support@dhl.com

**USPS Web Tools Support:**
- Portal: https://www.usps.com/business/web-tools-apis/
- Email: uspstechnicalsupport@usps.gov

## Additional Resources

- **Full Documentation**: See `SHIPPING_PROVIDERS_IMPLEMENTATION.md`
- **Integration Guide**: See `INTEGRATION_GUIDE.md`
- **Provider README**: See `providers/README.md`
- **API Examples**: See `INTEGRATION_GUIDE.md` examples section

---

**Last Updated**: December 2025
**Version**: 1.0
