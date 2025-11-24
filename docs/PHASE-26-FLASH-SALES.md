# Phase 26: Flash Sales & Deals System

## Overview

A comprehensive time-sensitive deals and promotions system that creates urgency, drives conversions, and increases average order values through limited-time offers, flash sales, and bundle deals.

**Status:** Production-Ready
**Complexity:** High
**Revenue Impact:** +$600K/year
**Implementation Date:** 2024-01-17

---

## Business Value

### Revenue Projections

**Annual Revenue Impact:** $600,000

| Revenue Stream | Annual Value | Calculation Basis |
|---------------|--------------|-------------------|
| Flash Sale Conversions | $250,000 | 40% increase in conversion during sales |
| Urgency-Driven Purchases | $150,000 | FOMO creates impulse buying |
| Bundle Deal Upsells | $120,000 | Higher AOV through bundling |
| Inventory Clearance | $80,000 | Move slow-moving inventory faster |

### Key Performance Indicators

- **Target Conversion Rate:** 15% during active deals (vs 3% baseline)
- **Average Deal CTR:** 8-12%
- **Stock Sell-Through Rate:** 85%+ for flash sales
- **Customer Purchase Limit:** Average 2.5 items per deal
- **Early Access Participation:** 30% of eligible tier members

---

## Features

### 1. Eight Deal Types

| Deal Type | Use Case | Discount Method |
|-----------|----------|-----------------|
| **Flash Sale** | Ultra-short duration (2-6 hours) | Percentage discount |
| **Daily Deal** | 24-hour featured offers | Percentage discount |
| **Bundle Deal** | Multiple products together | Custom pricing |
| **BOGO** | Buy X Get Y Free | Quantity-based |
| **Percentage Discount** | Standard % off deals | Percentage discount |
| **Fixed Discount** | Dollar amount off | Fixed amount |
| **Volume Discount** | Discounts based on quantity | Tiered pricing |
| **Seasonal Sale** | Holiday/event promotions | Percentage discount |

### 2. Time-Based Deal Management

**Lifecycle States:**
- `SCHEDULED` - Deal created but not yet active
- `ACTIVE` - Currently running and accepting purchases
- `ENDED` - Time expired, no longer available
- `CANCELLED` - Manually cancelled before completion
- `PAUSED` - Temporarily suspended

**Automated State Transitions:**
- Auto-activation on start time (via cron job)
- Auto-expiration on end time (via cron job)
- Real-time status checks for API requests

**Time Windows:**
- Start time (precise to the second)
- End time (precise to the second)
- Early access period (hours before public launch)
- Countdown timers displayed to customers

### 3. Stock Management

**Inventory Control:**
- Deal-level total stock allocation
- Product-level stock allocation (for multi-product deals)
- Real-time stock tracking
- Automatic sold-out status
- Stock reservation during checkout (prevents overselling)

**Purchase Limits:**
- Per-customer quantity limits
- Lifetime limit enforcement
- Real-time limit checking
- Purchase history tracking

**Stock Display:**
- Visual progress bars
- Percentage sold indicators
- "Only X left!" urgency messages
- Sold-out badges

### 4. Loyalty Integration

**Tier-Based Benefits:**
- Early access hours for premium tiers
  - Gold+: 24 hours early access
  - Platinum+: 48 hours early access
  - Diamond: 72 hours early access
- Exclusive deals for specific tiers
- Tier requirement enforcement

**Stackability:**
- Configurable stacking with loyalty rewards
- Configurable stacking with coupons
- Combined discount calculations
- Benefit prioritization logic

### 5. Pricing Flexibility

**Deal-Level Pricing:**
- Percentage discount (e.g., 30% off)
- Fixed amount discount (e.g., $50 off)
- Minimum purchase requirements

**Product-Level Pricing:**
- Custom deal price per product
- Override deal-level discount
- Different prices for different products in same deal

**BOGO Configuration:**
- Buy X quantity
- Get Y quantity free
- Applies to same or different products

**Bundle Pricing:**
- Set total bundle price
- Discount automatically calculated
- Multi-product combinations

### 6. Deal Discovery & Visibility

**Featured Deals:**
- Featured flag for promotion
- Featured order for sorting
- Homepage/banner placement
- Priority in listings

**Deal Badges:**
- Custom badge text (e.g., "FLASH SALE", "LIMITED TIME")
- Custom badge colors
- Type-based default badges
- Icon indicators

**Deal Banners:**
- Hero banner images
- Mobile-optimized banners
- Call-to-action overlays

### 7. Analytics & Tracking

**Deal Performance Metrics:**
- Total views (all visitors)
- Unique views (distinct users)
- Clicks (product page visits)
- Click-through rate (CTR)
- Conversions (purchases)
- Conversion rate
- Total revenue
- Average order value

**Stock Analytics:**
- Stock allocated
- Stock remaining
- Sell-through rate
- Peak purchase hour
- Inventory velocity

**Customer Insights:**
- Purchase distribution by tier
- Repeat deal participants
- Early access vs regular access conversions

### 8. Notifications System

**Notification Channels:**
- Email notifications
- SMS alerts
- Push notifications
- In-app notifications

**Notification Triggers:**
- Deal start reminder (1 hour before)
- Early access availability
- Low stock alerts
- Deal ending soon (1 hour remaining)
- Deal ended confirmation

**Targeting:**
- All customers
- Specific loyalty tiers
- Individual users
- Previous deal participants

---

## Technical Architecture

### Database Models

#### 1. Deal
**Purpose:** Core deal configuration and state

**Fields:**
- `id` (UUID): Unique identifier
- `name` (String): Deal name
- `description` (String): Deal description
- `type` (DealType): Deal type enum
- `status` (DealStatus): Current status
- `startTime` (DateTime): When deal becomes active
- `endTime` (DateTime): When deal expires
- `earlyAccessHours` (Int): Early access duration
- `minimumTier` (LoyaltyTier, nullable): Tier requirement
- `discountPercentage` (Float, nullable): % discount
- `discountAmount` (Float, nullable): $ discount
- `buyQuantity` (Int, nullable): BOGO buy amount
- `getQuantity` (Int, nullable): BOGO get amount
- `minimumPurchase` (Float, nullable): Min order value
- `totalStock` (Int, nullable): Total inventory
- `remainingStock` (Int, nullable): Available inventory
- `limitPerCustomer` (Int, nullable): Purchase limit
- `badge` (String, nullable): Custom badge text
- `badgeColor` (String, nullable): Badge color hex
- `featuredOrder` (Int, nullable): Featured sort order
- `isFeatured` (Boolean): Featured flag
- `bannerImage` (String, nullable): Banner URL
- `stackableWithCoupons` (Boolean): Coupon compatibility
- `stackableWithLoyalty` (Boolean): Loyalty compatibility
- `views` (Int): Total view count
- `clicks` (Int): Total click count
- `conversions` (Int): Total purchases
- `revenue` (Float): Total revenue

**Indexes:**
- `status`
- `type`
- `startTime`
- `endTime`
- `isFeatured`
- `minimumTier`

**Relationships:**
- `dealProducts` → DealProduct[] (one-to-many)
- `dealPurchases` → DealPurchase[] (one-to-many)
- `analytics` → DealAnalytics (one-to-one)
- `notifications` → DealNotification[] (one-to-many)

#### 2. DealProduct
**Purpose:** Product-specific deal configuration

**Fields:**
- `id` (UUID): Unique identifier
- `dealId` (String): Reference to Deal
- `productId` (String): Reference to Product
- `dealPrice` (Float, nullable): Custom deal price
- `originalPrice` (Float): Regular price
- `stockAllocated` (Int, nullable): Product stock limit
- `stockRemaining` (Int, nullable): Product stock available
- `isActive` (Boolean): Product availability

**Indexes:**
- `dealId`
- `productId`
- `isActive`

**Relationships:**
- `deal` → Deal (many-to-one)
- `product` → Product (many-to-one)
- `purchases` → DealPurchase[] (one-to-many)

#### 3. DealPurchase
**Purpose:** Customer purchase tracking

**Fields:**
- `id` (UUID): Unique identifier
- `dealId` (String): Reference to Deal
- `userId` (String): Reference to User
- `dealProductId` (String, nullable): Specific product purchased
- `orderId` (String): Reference to Order
- `quantity` (Int): Items purchased
- `purchasePrice` (Float): Final price paid
- `discountApplied` (Float): Discount amount
- `createdAt` (DateTime): Purchase timestamp

**Indexes:**
- `dealId`
- `userId`
- `orderId`
- `createdAt`

**Relationships:**
- `deal` → Deal (many-to-one)
- `user` → User (many-to-one)
- `dealProduct` → DealProduct (nullable, many-to-one)
- `order` → Order (many-to-one)

#### 4. DealNotification
**Purpose:** Track sent notifications

**Fields:**
- `id` (UUID): Unique identifier
- `dealId` (String): Reference to Deal
- `userId` (String): Reference to User
- `notificationType` (String): Channel used
- `sentAt` (DateTime): Send timestamp
- `readAt` (DateTime, nullable): Read timestamp

**Indexes:**
- `dealId`
- `userId`
- `notificationType`

**Relationships:**
- `deal` → Deal (many-to-one)
- `user` → User (many-to-one)

#### 5. DealAnalytics
**Purpose:** Aggregated performance metrics

**Fields:**
- `id` (UUID): Unique identifier
- `dealId` (String, unique): Reference to Deal
- `totalViews` (Int): All views
- `uniqueViews` (Int): Distinct viewers
- `clicks` (Int): Product clicks
- `clickThroughRate` (Float): CTR %
- `totalPurchases` (Int): Purchase count
- `totalRevenue` (Float): Revenue sum
- `conversionRate` (Float): Conversion %
- `sellThroughRate` (Float): Stock sold %
- `peakHour` (Int, nullable): Highest traffic hour
- `stockAllocated` (Int, nullable): Initial stock
- `stockRemaining` (Int, nullable): Current stock

**Indexes:**
- `dealId` (unique)

**Relationships:**
- `deal` → Deal (one-to-one)

---

## API Endpoints

### Public Endpoints (7)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/deals` | Get all deals with filters |
| GET | `/deals/featured` | Get featured deals |
| GET | `/deals/active` | Get currently active deals |
| GET | `/deals/:id` | Get deal by ID |
| POST | `/deals/calculate-price` | Calculate deal pricing |
| POST | `/deals/:id/track-view` | Track deal view |
| POST | `/deals/:id/track-click` | Track deal click |

### Customer Endpoints (3)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/deals/:id/eligibility` | Yes | Check eligibility |
| POST | `/deals/purchase` | Yes | Record purchase |
| GET | `/deals/my/purchases` | Yes | Get purchase history |

### Admin Endpoints (12)

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | `/deals` | Yes | ADMIN | Create deal |
| PUT | `/deals/:id` | Yes | ADMIN | Update deal |
| DELETE | `/deals/:id` | Yes | ADMIN | Delete deal |
| POST | `/deals/:id/products` | Yes | ADMIN | Add products |
| DELETE | `/deals/:dealId/products/:productId` | Yes | ADMIN | Remove product |
| PUT | `/deals/products/:dealProductId` | Yes | ADMIN | Update deal product |
| GET | `/deals/:id/analytics` | Yes | ADMIN | Get deal analytics |
| GET | `/deals/admin/analytics` | Yes | ADMIN | Get all analytics |
| POST | `/deals/:id/notify` | Yes | ADMIN | Send notifications |
| POST | `/deals/admin/activate-scheduled` | Yes | ADMIN | Activate deals (cron) |
| POST | `/deals/admin/end-expired` | Yes | ADMIN | End deals (cron) |

**Total:** 22 endpoints

---

## Service Methods

### Core Business Logic

#### createDeal(dto: CreateDealDto)
Creates a new deal with validation and setup.

**Process:**
1. Validate start/end times
2. Validate deal type specific fields
3. Create Deal record with SCHEDULED status
4. Add products if provided
5. Create DealAnalytics record
6. Return complete deal

**Validation:**
- End time must be after start time
- Required fields based on deal type:
  - Flash Sale/Percentage: `discountPercentage`
  - Fixed Discount: `discountAmount`
  - BOGO: `buyQuantity` and `getQuantity`

---

#### calculateDealPrice(dto: CalculateDealPriceDto)
Calculates final price with deal discount.

**Input:**
- `dealId`: Deal to apply
- `productId`: Specific product (optional)
- `originalPrice`: Regular price
- `quantity`: Items to purchase
- `userId`: For tier eligibility (optional)

**Process:**
1. Verify deal is active
2. Check product-specific deal price first
3. Apply deal-level discount if no product price:
   - Percentage: `price * (1 - discount/100)`
   - Fixed: `price - discountAmount`
   - BOGO: Calculate charged items based on buy/get ratio
4. Calculate totals with quantity
5. Return breakdown with savings

**Returns:**
```typescript
{
  dealId, dealName, dealType,
  originalPrice, discountedPrice,
  discountAmount, discountPercentage,
  quantity, totalOriginal, totalFinal,
  totalDiscount, savings
}
```

---

#### checkDealEligibility(dto: CheckDealEligibilityDto)
Validates if user can participate in deal.

**Checks:**
1. Deal status is ACTIVE
2. Current time is within deal window
3. Early access tier requirement (if applicable)
4. Minimum tier requirement
5. Stock availability
6. Customer purchase limit not exceeded

**Returns:**
```typescript
{
  isEligible: boolean,
  reasons: string[],
  deal: { id, name, status, ... }
}
```

---

#### recordDealPurchase(dto: PurchaseDealDto, userId: string)
Records a deal purchase and updates inventory.

**Process:**
1. Verify eligibility
2. Create DealPurchase record
3. Decrement deal remaining stock
4. Decrement product-specific stock if applicable
5. Update analytics (conversions, revenue)
6. Return purchase record

**Side Effects:**
- Stock reduced
- Purchase count increased
- Customer limit tracking updated
- Analytics metrics updated

---

#### activateScheduledDeals()
Cron job to activate deals at start time.

**Schedule:** Every 5 minutes

**Process:**
1. Find deals with status SCHEDULED and startTime <= now
2. Update status to ACTIVE
3. Send start notifications to eligible users
4. Return count of activated deals

---

#### endExpiredDeals()
Cron job to end deals at expiration.

**Schedule:** Every 5 minutes

**Process:**
1. Find deals with status ACTIVE and endTime < now
2. Update status to ENDED
3. Send completion notifications
4. Return count of ended deals

---

#### trackDealView(dto: TrackDealViewDto)
Tracks when deal is viewed.

**Updates:**
- Increment deal.views
- Increment analytics.totalViews
- Increment analytics.uniqueViews (if userId provided)

---

#### trackDealClick(dto: TrackDealClickDto)
Tracks when deal product is clicked.

**Updates:**
- Increment deal.clicks
- Increment analytics.clicks
- Recalculate analytics.clickThroughRate

---

#### updateDealAnalytics(dealId, updates)
Internal method to update analytics metrics.

**Recalculated Metrics:**
- Click-through rate: `(clicks / totalViews) * 100`
- Conversion rate: `(totalPurchases / clicks) * 100`
- Sell-through rate: `((allocated - remaining) / allocated) * 100`

---

## Frontend Integration

### React Query Hooks

**Public Hooks:**
```typescript
useDeals(params) // Get deals with filters
useFeaturedDeals() // Get featured deals
useActiveDeals() // Get active deals
useDeal(id) // Get deal by ID
useCalculateDealPrice() // Calculate pricing
useTrackDealView() // Track view
useTrackDealClick() // Track click
```

**Customer Hooks:**
```typescript
useCheckDealEligibility(dealId, quantity) // Check eligibility
useRecordDealPurchase() // Record purchase
useMyDealPurchases(limit) // Get purchase history
```

**Admin Hooks:**
```typescript
useCreateDeal() // Create deal
useUpdateDeal() // Update deal
useDeleteDeal() // Delete deal
useAddProductsToDeal() // Add products
useRemoveProductFromDeal() // Remove product
useDealAnalytics(dealId) // Get analytics
useAllDealsAnalytics(params) // Get all analytics
useNotifyDeal() // Send notifications
```

### Components

**CountdownTimer:**
- Real-time countdown display
- Shows days, hours, minutes, seconds
- Configurable sizes (sm, md, lg)
- Status indicators (upcoming, active, ended)
- Auto-refresh every second
- onComplete callback

**DealBadge:**
- Visual deal type indicators
- 8 predefined type configurations
- Custom badge text and colors
- Icon + label display
- 3 sizes available

**DealCard:**
- Grid-friendly deal display
- Banner image support
- Countdown timer integration
- Stock progress bar
- Product preview thumbnails
- Stats display (views, purchases)
- Tier requirement badges
- Hover effects and transitions

### Pages

**Deals Listing (`/deals`):**
- 3 tabs: Active, Featured, All
- Filter by deal type
- Pagination support
- Grid layout with DealCard
- Empty states
- Loading skeletons

**Deal Detail (`/deals/[id]`):**
- Hero banner section
- Deal information card
- Countdown timer (large)
- Stock progress
- Deal conditions list
- Product grid
- Eligibility status
- Deal statistics sidebar
- Shop now CTA

---

## Implementation Checklist

### Backend

- [x] Define Prisma schema models (5 models, 2 enums)
- [x] Generate Prisma client
- [x] Create DTOs (deal.dto.ts)
- [x] Implement DealsService (954 lines)
  - [x] Deal CRUD operations
  - [x] Product management
  - [x] Pricing calculations
  - [x] Eligibility checking
  - [x] Purchase recording
  - [x] Analytics tracking
  - [x] Notification sending
  - [x] Cron job methods
- [x] Create DealsController (22 endpoints)
- [x] Create DealsModule
- [x] Register module in AppModule
- [x] Add database indexes

### Frontend

- [x] Create API client (lib/api/deals.ts)
- [x] Define TypeScript types
- [x] Implement React Query hooks
- [x] Create CountdownTimer component
- [x] Create DealBadge component
- [x] Create DealCard component
- [x] Create Deals listing page (/deals)
  - [x] Active deals tab
  - [x] Featured deals tab
  - [x] All deals tab
  - [x] Type filter
  - [x] Pagination
- [x] Create Deal detail page (/deals/[id])
  - [x] Hero section
  - [x] Deal info
  - [x] Countdown timer
  - [x] Stock progress
  - [x] Product grid
  - [x] Eligibility check
  - [x] Statistics
- [x] Add navigation menu item
- [x] Test all flows

### Documentation

- [x] API reference documentation
- [x] Frontend integration guide
- [x] Phase 26 comprehensive docs
- [ ] Admin user guide
- [ ] Deal creation tutorial

---

## Testing Scenarios

### Deal Lifecycle
1. Create scheduled deal
2. Verify auto-activation at start time
3. Check active deal display
4. Verify auto-expiration at end time
5. Confirm ended deal status

### Stock Management
1. Create deal with stock limit
2. Record purchases
3. Verify stock decrement
4. Test sold-out state
5. Validate stock reservation

### Eligibility
1. Check tier-based early access
2. Verify minimum tier requirements
3. Test purchase limit enforcement
4. Validate stock availability checks
5. Confirm time window validation

### Pricing
1. Test percentage discount calculation
2. Test fixed discount calculation
3. Test BOGO pricing
4. Test bundle pricing
5. Test product-specific prices
6. Verify stacking rules

### Analytics
1. Track deal views
2. Track product clicks
3. Record conversions
4. Calculate CTR
5. Calculate conversion rate
6. Measure sell-through rate

### Notifications
1. Send deal start notifications
2. Send early access alerts
3. Send low stock warnings
4. Send ending soon reminders
5. Target by tier
6. Target individual users

---

## Performance Considerations

### Database Optimization

**Indexes:**
- `Deal.status` - Active deal filtering
- `Deal.type` - Type filtering
- `Deal.startTime, endTime` - Time range queries
- `Deal.isFeatured` - Featured filtering
- `DealProduct.dealId, isActive` - Active products
- `DealPurchase.userId, dealId` - Purchase limits

**Query Optimization:**
- Paginate deal listings
- Limit product preview (first 4-5)
- Select only needed fields
- Cache featured deals (5 min TTL)
- Cache active deals (1 min TTL)

### Caching Strategy

**Redis Caching:**
- Featured deals (5 minutes)
- Active deals (1 minute)
- Deal analytics (30 seconds)
- Eligibility checks (10 seconds per user)

**React Query Caching:**
- Deal list (staleTime: 1 minute)
- Deal detail (staleTime: 30 seconds)
- Analytics (staleTime: 30 seconds)

### Real-Time Updates

**Countdown Timer:**
- Client-side calculation (no server polling)
- Interval updates every 1 second
- Cleanup on unmount

**Stock Updates:**
- Optimistic UI updates
- Invalidate queries on purchase
- Real-time via WebSocket (future enhancement)

### Scalability

**Concurrent Purchases:**
- Database transactions for stock updates
- Row-level locking on stock fields
- Retry logic for conflicts
- Queue system for high-traffic deals

**Cron Job Performance:**
- Batch processing (100 deals per batch)
- Run every 5 minutes (adjustable)
- Separate workers for activation/expiration
- Monitor job execution time

---

## Security Considerations

### Authorization

**Access Control:**
- Public: View deals, calculate prices, track events
- Customers: Check eligibility, record purchases
- Admins: Full CRUD, analytics, notifications

**Data Protection:**
- User-scoped purchase history
- Tier-based early access enforcement
- Purchase limit per user tracking

### Validation

**Input Validation:**
- Date range validation (end > start)
- Stock quantity positive integers
- Discount ranges (0-100% or positive $)
- Purchase quantity limits

**Business Rules:**
- Can't delete active/ended deals
- Can't exceed stock limits
- Can't bypass tier requirements
- Can't exceed purchase limits
- Time window enforcement

### Fraud Prevention

**Purchase Limits:**
- Per-customer tracking
- Lifetime limit enforcement
- Multi-account detection (future)

**Stock Protection:**
- Atomic stock updates
- Transaction-based decrement
- Prevent negative stock
- Oversell prevention

---

## Monitoring & Analytics

### Key Metrics

**Deal Performance:**
- Total deals created
- Active deal count
- Conversion rate by type
- Average discount percentage
- Revenue per deal type

**Customer Engagement:**
- Deal views per user
- Click-through rates
- Conversion rates
- Repeat deal participants
- Early access utilization

**Inventory Management:**
- Average sell-through rate
- Stock-out frequency
- Time to stock-out
- Overstock prevention

**Financial:**
- Total deal revenue
- Discount cost
- ROI by deal type
- Customer acquisition cost

### Admin Dashboard

**Statistics Endpoint Provides:**
- Deal count by status
- Revenue by deal type
- Top performing deals
- Low performing deals
- Upcoming deal calendar
- Stock alerts

---

## Future Enhancements

### Phase 26.1: Advanced Features
- **Lightning Deals:** Ultra-short hourly deals
- **Group Buying:** Unlock discounts at volume thresholds
- **Mystery Deals:** Reveal discount at checkout
- **Deal Stacking:** Combine multiple deal types
- **Countdown to Start:** Pre-deal hype building

### Phase 26.2: Personalization
- **AI-Powered Deals:** Personalized deal recommendations
- **Dynamic Pricing:** Real-time price optimization
- **Behavior-Based Deals:** Deals based on browsing history
- **Abandoned Cart Deals:** Recovery with special offers

### Phase 26.3: Social Features
- **Share & Earn:** Bonus for sharing deals
- **Group Deals:** Friends buy together for better price
- **Deal Alerts:** Custom notifications for preferred products
- **Wish List Deals:** Automatic deals on saved items

### Phase 26.4: Technical Improvements
- **WebSocket Real-Time:** Live stock and countdown updates
- **Deal Scheduler UI:** Visual calendar for planning
- **A/B Testing:** Test different deal configurations
- **Predictive Analytics:** Forecast deal performance

---

## Deployment Notes

### Environment Variables

```env
# Deal Settings
DEAL_ACTIVATION_CRON="*/5 * * * *"  # Every 5 minutes
DEAL_EXPIRATION_CRON="*/5 * * * *"  # Every 5 minutes
DEAL_STOCK_RESERVATION_TTL=600      # 10 minutes

# Notification Settings
DEAL_NOTIFICATION_EMAIL_ENABLED=true
DEAL_NOTIFICATION_SMS_ENABLED=false
DEAL_NOTIFICATION_PUSH_ENABLED=true

# Analytics
DEAL_ANALYTICS_REFRESH_INTERVAL=30  # seconds
```

### Database Migration

```bash
# Run Prisma migration
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

### Cron Job Setup

**Deal Activation (Every 5 minutes):**
```bash
*/5 * * * * curl -X POST https://api.citadelbuy.com/deals/admin/activate-scheduled \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Deal Expiration (Every 5 minutes):**
```bash
*/5 * * * * curl -X POST https://api.citadelbuy.com/deals/admin/end-expired \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

Or use NestJS Scheduler:
```typescript
@Cron('*/5 * * * *') // Every 5 minutes
async handleDealActivation() {
  await this.dealsService.activateScheduledDeals();
}

@Cron('*/5 * * * *') // Every 5 minutes
async handleDealExpiration() {
  await this.dealsService.endExpiredDeals();
}
```

---

## Support & Maintenance

### Common Issues

**Issue:** Deal not activating at start time
**Solution:** Check cron job is running, verify timezone settings

**Issue:** Stock oversold
**Solution:** Verify transaction usage, check for race conditions

**Issue:** Countdown timer not updating
**Solution:** Check client-side calculation, verify time format

**Issue:** Eligibility check failing
**Solution:** Verify user tier, check early access window calculation

### Monitoring

**Daily Checks:**
- Cron job execution success
- Active deal count
- Stock-out alerts
- Error rate for purchases

**Weekly Reviews:**
- Top performing deals
- Conversion rate trends
- Stock optimization
- Customer feedback

---

## Conclusion

The Flash Sales & Deals System provides a powerful, flexible platform for running time-sensitive promotions that drive urgency and increase conversions. With 22 API endpoints, 5 database models, and a complete frontend experience including real-time countdown timers, the system is production-ready and optimized for high-traffic sales events.

**Key Achievements:**
- ✅ 8 flexible deal types for various promotion strategies
- ✅ Real-time countdown timers with auto-refresh
- ✅ Comprehensive stock management and limits
- ✅ Loyalty tier integration with early access
- ✅ Full analytics and tracking system
- ✅ Automated deal lifecycle management
- ✅ Production-ready frontend with deal cards and detail pages

**Expected Impact:**
- 15% conversion rate during active deals
- 40% increase in flash sale conversions
- $600K additional annual revenue
- 85%+ stock sell-through on flash sales
- 30% early access participation from tier members

---

**Documentation Version:** 1.0
**Last Updated:** 2024-01-17
**Phase Status:** Complete
