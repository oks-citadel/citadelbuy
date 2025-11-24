# Phase 27: Gift Cards & Store Credit System

## Overview

Phase 27 introduces a comprehensive gift card and store credit system that allows customers to purchase, send, redeem, and manage digital and physical gift cards. The system includes store credit functionality for refunds and promotional campaigns, scheduled delivery, partial redemption, and conversion between gift cards and store credit.

## Features Implemented

### 1. Gift Card Management
- **Purchase Gift Cards**: Buy digital or physical gift cards for any amount ($5-$1000)
- **Scheduled Delivery**: Send gift cards on future dates for special occasions
- **Personalization**: Add recipient name, sender name, and personal messages
- **Partial Redemption**: Use gift cards across multiple purchases
- **Balance Checking**: Public endpoint to check gift card balance
- **Code Generation**: Secure 16-character unique codes (XXXX-XXXX-XXXX-XXXX format)
- **Transaction History**: Complete audit trail of all gift card transactions

### 2. Store Credit System
- **Auto-Creation**: Store credit accounts created on first use
- **Multiple Sources**: Refunds, compensation, promotional, gift, and loyalty credits
- **Balance Tracking**: Real-time balance updates with transaction history
- **Expiration Management**: Optional expiration dates for promotional credits
- **Minimum Purchase Rules**: Configurable minimum purchase requirements
- **Automatic Application**: Credits automatically applied at checkout

### 3. Gift Card Types
- **Digital**: Instant email delivery
- **Physical**: Mailed to recipient
- **Promotional**: Admin-created cards for campaigns

### 4. Gift Card Statuses
- **ACTIVE**: Available for redemption
- **REDEEMED**: Fully used (zero balance)
- **EXPIRED**: Past expiration date
- **CANCELLED**: Administratively cancelled
- **SUSPENDED**: Temporarily suspended

### 5. Store Credit Types
- **REFUND**: From returned orders
- **COMPENSATION**: Customer service compensation
- **PROMOTIONAL**: Marketing campaigns
- **GIFT**: Gift card conversions
- **LOYALTY**: From loyalty program redemptions

## Database Schema

### Gift Card Model
```prisma
model GiftCard {
  id                String          @id @default(uuid())
  code              String          @unique
  type              GiftCardType    @default(DIGITAL)
  status            GiftCardStatus  @default(ACTIVE)
  initialAmount     Float
  currentBalance    Float
  currency          String          @default("USD")
  purchasedBy       String?
  recipientEmail    String?
  recipientName     String?
  senderName        String?
  personalMessage   String?
  redeemedBy        String?
  redeemedAt        DateTime?
  purchaseDate      DateTime        @default(now())
  activationDate    DateTime        @default(now())
  expirationDate    DateTime?
  designTemplate    String?
  customImage       String?
  isScheduled       Boolean         @default(false)
  scheduledDelivery DateTime?
  deliveredAt       DateTime?
  orderId           String?
  minimumPurchase   Float?
  allowedCategories String[]
  excludedProducts  String[]
  lastUsedAt        DateTime?
  usageCount        Int             @default(0)
}
```

### Store Credit Model
```prisma
model StoreCredit {
  id              String    @id @default(uuid())
  userId          String    @unique
  currentBalance  Float     @default(0)
  totalEarned     Float     @default(0)
  totalSpent      Float     @default(0)
  currency        String    @default("USD")
  expirationDate  DateTime?
  minimumPurchase Float?
}
```

### Transaction Models
- **GiftCardTransaction**: Tracks all gift card operations
- **StoreCreditTransaction**: Tracks all store credit movements

## API Endpoints

### Public Endpoints (1)

#### Check Gift Card Balance
```
POST /gift-cards/check-balance
Body: { code: string }
Response: { balance: number, status: GiftCardStatus, expirationDate?: string }
```

### Customer Endpoints (7)

#### Purchase Gift Card
```
POST /gift-cards/purchase
Auth: Required
Body: PurchaseGiftCardDto
Response: GiftCard
```

#### Redeem Gift Card
```
POST /gift-cards/redeem
Auth: Required
Body: { code: string, orderId?: string, amount?: number }
Response: { redemptionAmount: number, remainingBalance: number }
```

#### Get My Purchased Gift Cards
```
GET /gift-cards/my-purchases?status=ACTIVE&type=DIGITAL&limit=20
Auth: Required
Response: GiftCard[]
```

#### Get My Redeemed Gift Cards
```
GET /gift-cards/my-redemptions?limit=20
Auth: Required
Response: GiftCard[]
```

#### Get Gift Card Details
```
GET /gift-cards/:id
Auth: Required
Response: GiftCard
```

#### Convert Gift Card to Store Credit
```
POST /gift-cards/convert-to-credit
Auth: Required
Body: { giftCardCode: string }
Response: { storeCredit: StoreCredit, message: string }
```

#### Get My Store Credit
```
GET /gift-cards/store-credit/balance
Auth: Required
Response: StoreCredit
```

#### Get Store Credit History
```
GET /gift-cards/store-credit/history?limit=10&type=REFUND
Auth: Required
Response: StoreCreditTransaction[]
```

#### Deduct Store Credit
```
POST /gift-cards/store-credit/deduct
Auth: Required
Body: { userId: string, amount: number, orderId: string, description?: string }
Response: StoreCredit
```

### Admin Endpoints (10)

#### Create Promotional Gift Card
```
POST /gift-cards/admin/promotional
Auth: Required (ADMIN)
Body: CreatePromotionalGiftCardDto
Response: GiftCard
```

#### Update Gift Card
```
PUT /gift-cards/admin/:id
Auth: Required (ADMIN)
Body: UpdateGiftCardDto
Response: GiftCard
```

#### Cancel Gift Card
```
POST /gift-cards/admin/:id/cancel
Auth: Required (ADMIN)
Body: { reason: string }
Response: GiftCard
```

#### Send/Resend Gift Card Email
```
POST /gift-cards/admin/:id/send-email
Auth: Required (ADMIN)
Response: { message: string }
```

#### Add Store Credit to User
```
POST /gift-cards/admin/store-credit/add
Auth: Required (ADMIN)
Body: AddStoreCreditDto
Response: StoreCredit
```

#### Adjust User Store Credit
```
POST /gift-cards/admin/store-credit/:userId/adjust
Auth: Required (ADMIN)
Body: { amount: number, reason: string, notes?: string }
Response: StoreCredit
```

#### Get Gift Card Statistics
```
GET /gift-cards/admin/statistics?startDate=2024-01-01&endDate=2024-12-31
Auth: Required (ADMIN)
Response: GiftCardStatistics
```

#### Process Scheduled Deliveries (Cron)
```
POST /gift-cards/admin/process-scheduled
Auth: Required (ADMIN)
Response: { count: number, message: string }
```

#### Expire Old Gift Cards (Cron)
```
POST /gift-cards/admin/expire-old
Auth: Required (ADMIN)
Response: { count: number, message: string }
```

## Frontend Implementation

### Pages Created

#### 1. Gift Cards Main Page
**Route**: `/gift-cards`
- Purchase gift cards form
- Check balance widget
- View purchased gift cards
- View redeemed gift cards
- Quick statistics dashboard

#### 2. Redeem Gift Card Page
**Route**: `/gift-cards/redeem`
- Redemption widget with balance checking
- Convert to store credit option
- How it works guide
- FAQ section

#### 3. Store Credit Page
**Route**: `/account/store-credit`
- Store credit balance display
- Transaction history
- Gift card to store credit conversion
- Ways to earn credit information

### Components Created

#### 1. GiftCardCard
**File**: `components/gift-cards/gift-card-card.tsx`
- Visual gift card display with gradient background
- Status and type badges
- Balance progress indicator
- Code display
- Transaction history
- Usage statistics

#### 2. GiftCardBalance
**File**: `components/gift-cards/gift-card-balance.tsx`
- Balance check form
- Code input validation
- Balance display with status
- Error handling

#### 3. GiftCardPurchaseForm
**File**: `components/gift-cards/gift-card-purchase-form.tsx`
- Preset amount selection ($25, $50, $100, $250, $500)
- Custom amount input
- Gift card type selection
- Recipient information
- Personal message
- Scheduled delivery option
- Form validation

#### 4. StoreCreditDisplay
**File**: `components/gift-cards/store-credit-display.tsx`
- Current balance card
- Total earned and spent statistics
- Recent transaction history
- Expiration warnings
- Minimum purchase notices

#### 5. RedeemWidget
**File**: `components/gift-cards/redeem-widget.tsx`
- Code input with validation
- Balance checking
- Partial redemption support
- Success/error states
- Order integration

### API Client

**File**: `lib/api/gift-cards.ts`
- Complete TypeScript type definitions
- React Query hooks for all endpoints
- Query key management
- Automatic cache invalidation
- Error handling

## Business Logic

### Gift Card Code Generation
```typescript
// Generates secure 16-character codes: XXXX-XXXX-XXXX-XXXX
// Uses crypto.randomBytes for cryptographic randomness
// Checks for uniqueness before returning
```

### Partial Redemption
- Customers can redeem any amount up to the current balance
- Balance updates atomically
- Card status changes to REDEEMED only when balance reaches $0
- Transaction history tracks each redemption

### Scheduled Delivery
- Cards can be scheduled for future delivery
- Cron job processes scheduled deliveries daily
- Email sent on scheduled date
- `deliveredAt` timestamp recorded

### Expiration Management
- Optional expiration dates
- Cron job expires cards past expiration date
- Status changed to EXPIRED
- Transaction created for audit trail

### Store Credit Auto-Creation
- Store credit account created on first use
- No action required from customer
- Prevents errors when adding credits

## Security Features

1. **Unique Code Generation**: Cryptographically secure random codes
2. **Code Uniqueness Check**: Database lookup prevents collisions
3. **Authorization Guards**: JWT authentication on all protected endpoints
4. **Role-Based Access**: Admin endpoints require ADMIN role
5. **User Validation**: Users can only redeem/view their own gift cards
6. **Transaction Logging**: Complete audit trail of all operations
7. **Balance Validation**: Prevents negative balances and over-redemption

## Usage Examples

### Purchase a Gift Card
```typescript
const { mutate: purchaseGiftCard } = usePurchaseGiftCard();

purchaseGiftCard({
  amount: 100,
  type: GiftCardType.DIGITAL,
  recipientEmail: 'friend@example.com',
  recipientName: 'John Doe',
  senderName: 'Jane Smith',
  personalMessage: 'Happy Birthday!',
  isScheduled: true,
  scheduledDelivery: '2024-12-25T00:00:00Z'
});
```

### Redeem a Gift Card
```typescript
const { mutate: redeemGiftCard } = useRedeemGiftCard();

redeemGiftCard({
  code: '1A2B-3C4D-5E6F-7G8H',
  orderId: 'order-123', // optional
  amount: 50 // optional - partial redemption
});
```

### Convert to Store Credit
```typescript
const { mutate: convertToCredit } = useConvertToStoreCredit();

convertToCredit({
  giftCardCode: '1A2B-3C4D-5E6F-7G8H'
});
```

### Check Balance
```typescript
const { mutate: checkBalance } = useCheckGiftCardBalance();

checkBalance({
  code: '1A2B-3C4D-5E6F-7G8H'
});
```

## Cron Jobs

### Process Scheduled Deliveries
**Frequency**: Daily
**Action**: Sends emails for gift cards scheduled for delivery
```bash
# Manual trigger
curl -X POST http://localhost:3000/api/gift-cards/admin/process-scheduled \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Expire Old Gift Cards
**Frequency**: Daily
**Action**: Marks expired gift cards as EXPIRED
```bash
# Manual trigger
curl -X POST http://localhost:3000/api/gift-cards/admin/expire-old \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

## Statistics & Analytics

### Gift Card Statistics
- Total active, redeemed, expired, cancelled cards
- Total revenue from gift card sales
- Total outstanding balance
- Average card value
- Redemption rate
- Scheduled deliveries pending

### Store Credit Analytics
- Total store credit issued by type
- Total redeemed vs available
- Expiration tracking
- User adoption rate

## Testing Recommendations

### Unit Tests
- Gift card code generation uniqueness
- Balance calculation logic
- Expiration date handling
- Transaction creation

### Integration Tests
- Complete purchase flow
- Redemption with partial amounts
- Store credit conversion
- Scheduled delivery processing
- Expiration cron job

### E2E Tests
- User purchases gift card
- Recipient receives email
- Recipient redeems at checkout
- Partial redemption across multiple orders
- Gift card to store credit conversion

## Future Enhancements

### Potential Additions
1. **Bulk Gift Card Generation**: Create multiple cards for corporate sales
2. **Custom Designs**: Upload custom gift card images
3. **QR Codes**: Add QR codes for easy redemption
4. **Physical Card Shipping**: Integration with shipping providers
5. **Balance Transfer**: Transfer balance between gift cards
6. **Reload Functionality**: Add funds to existing gift cards
7. **Gift Card Exchange**: Trade unwanted cards for store credit
8. **Mobile Wallet**: Apple Pay / Google Pay integration
9. **Print-at-Home**: PDF gift card certificates
10. **Analytics Dashboard**: Admin dashboard for gift card metrics

### Recommended Improvements
1. Email service integration for actual email sending
2. SMS notifications for gift card delivery
3. Push notifications for redemption confirmations
4. Advanced fraud detection
5. Multi-currency support
6. International shipping for physical cards

## Database Migration

Run the following to apply the schema:

```bash
cd citadelbuy/backend
npx prisma migrate dev --name add-gift-cards-and-store-credit
npx prisma generate
```

## Environment Variables

No new environment variables required for basic functionality.

Optional email service configuration:
```env
# Email Service (future enhancement)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@citadelbuy.com
SMTP_PASS=your-smtp-password
GIFT_CARD_FROM_EMAIL=giftcards@citadelbuy.com
```

## Deployment Notes

### Backend
1. Run database migrations
2. Deploy updated backend service
3. Configure cron jobs for scheduled deliveries and expiration
4. Test admin endpoints

### Frontend
1. Deploy updated frontend
2. Verify API client connections
3. Test gift card purchase flow
4. Verify redemption widget integration

### Monitoring
- Monitor gift card purchase success rates
- Track redemption rates
- Alert on failed scheduled deliveries
- Monitor outstanding balance totals

## Documentation Files

- **API Reference**: See API-REFERENCE.md
- **Frontend Guide**: See FRONTEND-INTEGRATION-GUIDE.md
- **Database Schema**: See prisma/schema.prisma
- **Deployment Guide**: See DEPLOYMENT-SUMMARY.md

## Support & Troubleshooting

### Common Issues

**Issue**: Gift card code not working
**Solution**: Check code format (must be XXXX-XXXX-XXXX-XXXX), verify status is ACTIVE

**Issue**: Scheduled delivery not sent
**Solution**: Verify cron job is running, check scheduled delivery date, review email logs

**Issue**: Store credit not applied at checkout
**Solution**: Verify minimum purchase requirement met, check expiration date, confirm sufficient balance

**Issue**: Cannot purchase gift card
**Solution**: Verify amount is between $5-$1000, check payment method, ensure recipient email is valid

## License

Copyright © 2024 CitadelBuy. All rights reserved.

---

**Phase 27 Status**: ✅ COMPLETE

**Last Updated**: 2024-11-17
**Version**: 2.0
**Author**: CitadelBuy Development Team
