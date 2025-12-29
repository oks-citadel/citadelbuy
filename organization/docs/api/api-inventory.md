# Broxiva API Inventory

## Vendor-Customer Global E-Commerce Platform

**MVP -> Production | API-First | Azure-Native**

---

## 1. API GOVERNANCE RULES

| Rule | Description |
|------|-------------|
| Protocol | All APIs are **REST + JSON** |
| Versioning | All APIs are versioned: `/api/v1/...` |
| Authentication | All APIs require authentication except public catalog endpoints |
| Authorization | RBAC is enforced at **controller + service layer** |
| Documentation | OpenAPI spec is mandatory for every endpoint |
| API-First | No frontend or mobile app may bypass APIs |
| Webhooks | Webhooks are first-class APIs |

### Rate Limiting

| Endpoint Category | Rate Limit |
|-------------------|------------|
| Authentication | 5 requests/minute |
| Password Reset | 3 requests/minute |
| General API | 100 requests/minute |
| Webhooks | 1000 requests/minute |

---

## 2. AUTH & IDENTITY (SHARED)

### Authentication

| Endpoint | Method | Role | Status | Description |
|----------|--------|------|--------|-------------|
| `/auth/register` | POST | Vendor / Customer | MVP | User registration with email verification |
| `/auth/login` | POST | Vendor / Customer | MVP | Email/password login with rate limiting |
| `/auth/refresh` | POST | Vendor / Customer | MVP | Refresh access token |
| `/auth/logout` | POST | Vendor / Customer | MVP | Logout with token blacklisting |
| `/auth/me` | GET | All Authenticated | MVP | Get current user profile |
| `/auth/forgot-password` | POST | Public | MVP | Password reset request |
| `/auth/reset-password` | POST | Public | MVP | Reset password with token |
| `/auth/verify-email` | POST | Public | MVP | Verify email address |
| `/auth/resend-verification` | POST | Public | MVP | Resend verification email |

### OAuth & Social Login

| Endpoint | Method | Role | Status | Description |
|----------|--------|------|--------|-------------|
| `/auth/social-login` | POST | Public | MVP | Generic OAuth login |
| `/auth/google` | POST | Public | MVP | Google OAuth |
| `/auth/facebook` | POST | Public | MVP | Facebook OAuth |
| `/auth/apple` | POST | Public | MVP | Apple Sign In |
| `/auth/github` | POST | Public | Phase 2 | GitHub OAuth |

### Multi-Factor Authentication

| Endpoint | Method | Role | Status | Description |
|----------|--------|------|--------|-------------|
| `/auth/mfa/setup` | POST | Authenticated | MVP | Setup 2FA (TOTP) |
| `/auth/mfa/verify` | POST | Authenticated | MVP | Verify and enable MFA |
| `/auth/mfa/status` | GET | Authenticated | MVP | Get MFA status |
| `/auth/mfa/disable` | POST | Authenticated | MVP | Disable MFA |

### Authorization

| Endpoint | Method | Role | Status | Description |
|----------|--------|------|--------|-------------|
| `/roles` | GET | Admin | MVP | List all roles |
| `/permissions` | GET | Admin | Phase 2 | List all permissions |

---

## 3. VENDOR APIs

### Vendor Onboarding & Profile

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/vendors/register` | POST | Create vendor account | MVP |
| `/vendors/profile` | GET | Get vendor profile | MVP |
| `/vendors/profile` | PATCH | Update vendor profile | MVP |
| `/vendors/{id}` | GET | Public vendor profile | MVP |
| `/vendors/banking` | PATCH | Update banking info | MVP |
| `/vendors/dashboard` | GET | Vendor dashboard metrics | MVP |

### Vendor KYC Verification

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/organization-kyc/start` | POST | Start KYC verification | MVP |
| `/organization-kyc/status` | GET | Get KYC status | MVP |
| `/organization-kyc/submit` | POST | Submit KYC documents | MVP |
| `/organization-kyc/details` | GET | Get KYC details | MVP |
| `/organization-kyc/webhook` | POST | KYC verification webhook | MVP |

### Vendor Product Management

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/products` | POST | Create product | MVP |
| `/vendors/products` | GET | List vendor products | MVP |
| `/products/{id}` | GET | Product details | MVP |
| `/products/{id}` | PATCH | Update product | MVP |
| `/products/{id}` | DELETE | Remove product | MVP |
| `/products/{id}/images` | POST | Upload product images | MVP |
| `/products/{id}/images/{imageId}` | DELETE | Delete product image | MVP |
| `/vendors/bulk-upload` | POST | Bulk upload products | Phase 2 |

### Vendor Variants & SKUs

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/variants` | GET | List all variants | MVP |
| `/variants` | POST | Create variant | MVP |
| `/variants/{id}` | GET | Get variant details | MVP |
| `/variants/{id}` | PATCH | Update variant | MVP |
| `/variants/{id}` | DELETE | Delete variant | MVP |
| `/variants/{id}/availability` | GET | Check availability | MVP |
| `/variants/{id}/prices` | POST | Set variant pricing | MVP |

### Vendor Inventory

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/inventory` | GET | Inventory list | MVP |
| `/inventory/{productId}` | GET | Get product inventory | MVP |
| `/inventory/{productId}` | PATCH | Update stock | MVP |
| `/inventory/reserve` | POST | Reserve inventory | MVP |
| `/inventory/check-availability` | POST | Check availability | MVP |
| `/inventory/low-stock` | GET | Get low stock alerts | MVP |

### Vendor Pricing

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/products/{id}` | PATCH | Set base price | MVP |
| `/ai/pricing-engine/calculate` | POST | Dynamic pricing | Phase 2 |
| `/ai/pricing-engine/recommendations/{productId}` | GET | AI price suggestions | Phase 2 |
| `/ai/pricing-engine/competitor-analysis` | POST | Competitor pricing analysis | Phase 2 |

### Vendor Orders & Fulfillment

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/vendor/orders` | GET | Vendor orders | MVP |
| `/orders/{id}` | GET | Order detail | MVP |
| `/orders/{id}/status` | PATCH | Fulfillment update | MVP |
| `/orders/{id}/tracking` | GET | Get tracking info | MVP |
| `/shipping/labels` | POST | Generate shipping label | MVP |
| `/orders/{id}/refund` | POST | Refund request | Phase 2 |
| `/returns/{id}/refund` | POST | Process refund | Phase 2 |

### Vendor Coupons & Promotions

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/vendor-coupons` | POST | Create vendor coupon | MVP |
| `/vendor-coupons` | GET | List vendor coupons | MVP |
| `/vendor-coupons/{id}` | PATCH | Update coupon | MVP |
| `/vendor-coupons/{id}` | DELETE | Delete coupon | MVP |
| `/vendor-coupons/{id}/analytics` | GET | Coupon usage analytics | Phase 2 |
| `/vendors/featured-listings` | GET | Get featured listings | Phase 2 |

### Vendor Analytics & Payouts

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/vendors/analytics` | GET | Vendor analytics overview | MVP |
| `/vendors/analytics/sales` | GET | Sales metrics | MVP |
| `/vendors/analytics/traffic` | GET | Traffic analytics | Phase 2 |
| `/vendors/analytics/products` | GET | Product performance | Phase 2 |
| `/vendors/commissions` | GET | Get commission details | MVP |
| `/vendors/payouts` | GET | Payout history | MVP |
| `/vendors/payouts/schedule` | GET | Get payout schedule | Phase 2 |

---

## 4. CUSTOMER APIs

### Customer Profile

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/me` | GET | Get current profile | MVP |
| `/me` | PATCH | Update profile | MVP |
| `/me/preferences` | GET | Get user preferences | MVP |
| `/me/preferences` | PATCH | Update preferences | MVP |
| `/me/addresses` | GET | Get saved addresses | MVP |
| `/me/addresses` | POST | Add new address | MVP |
| `/me/addresses/{id}` | PATCH | Update address | MVP |
| `/me/addresses/{id}` | DELETE | Delete address | MVP |
| `/me/security` | GET | Get security settings | MVP |
| `/me/security` | PATCH | Update security settings | MVP |
| `/me/notifications` | GET | Get notification preferences | MVP |
| `/users/{id}` | GET | Get user profile | MVP |
| `/users/{id}` | DELETE | Delete account | MVP |

### Catalog & Discovery (PUBLIC + AUTH)

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/products` | GET | Product listing with filters | MVP |
| `/products/{id}` | GET | Product detail | MVP |
| `/products/{id}/variants` | GET | Get product variants | MVP |
| `/products/{id}/reviews` | GET | Get product reviews | MVP |
| `/products/{id}/related` | GET | Get related products | MVP |
| `/search/products` | GET | Full-text search | MVP |
| `/search/autocomplete` | GET | Autocomplete suggestions | MVP |
| `/search/trending` | GET | Get trending searches | MVP |
| `/categories` | GET | List all categories | MVP |
| `/categories/{id}` | GET | Get category details | MVP |
| `/categories/{id}/products` | GET | Get products in category | MVP |
| `/categories/{id}/subcategories` | GET | Get subcategories | MVP |

### AI-Powered Discovery (Optional)

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/recommendations/homepage` | GET | Homepage recommendations | Phase 2 |
| `/recommendations/product/{productId}` | GET | Product recommendations | Phase 2 |
| `/recommendations/personalized` | GET | Personalized recommendations | Phase 2 |
| `/recommendations/trending` | GET | Trending products | Phase 2 |
| `/recommendations/similar` | GET | Similar products | Phase 2 |
| `/recommendations/frequently-bought-together` | GET | Cross-sell recommendations | Phase 2 |
| `/ai/visual-search/search-by-image` | POST | Search by image | Phase 2 |
| `/ai/smart-search/natural-language` | POST | Natural language search | Phase 2 |

### Cart

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/cart` | GET | View cart (user or guest) | MVP |
| `/cart/items` | POST | Add item to cart | MVP |
| `/cart/items/{id}` | PUT | Update quantity | MVP |
| `/cart/items/{id}` | DELETE | Remove item | MVP |
| `/cart` | DELETE | Clear entire cart | MVP |
| `/cart/merge` | POST | Merge guest cart with user cart | MVP |
| `/cart/lock-prices` | POST | Lock prices for checkout | MVP |
| `/cart/validate` | POST | Validate cart | MVP |
| `/cart/saved` | GET | Get saved for later items | MVP |
| `/cart/items/{itemId}/save-for-later` | POST | Save item for later | MVP |

### Checkout & Orders

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/checkout/addresses` | GET | Get saved addresses | MVP |
| `/checkout/addresses` | POST | Add new address | MVP |
| `/checkout/shipping-methods` | GET | Available shipping methods | MVP |
| `/checkout/calculate-tax` | POST | Calculate tax | MVP |
| `/checkout/validate-coupon` | POST | Validate coupon | MVP |
| `/checkout/express-checkout` | POST | Express checkout | MVP |
| `/checkout/guest-checkout` | POST | Guest checkout | MVP |
| `/orders` | POST | Create order | MVP |
| `/orders` | GET | Get user's orders | MVP |
| `/orders/{id}` | GET | Order detail | MVP |
| `/orders/{id}/tracking` | GET | Get order tracking | MVP |
| `/orders/{id}/invoice` | GET | Get order invoice | MVP |
| `/orders/{id}/cancel` | POST | Request cancellation | Phase 2 |

### Order Tracking

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/order-tracking/{orderId}` | GET | Get real-time tracking | MVP |
| `/order-tracking/{orderId}/timeline` | GET | Get delivery timeline | MVP |
| `/order-tracking/{orderId}/subscribe` | POST | Subscribe to updates | Phase 2 |
| `/order-tracking/{orderId}/proof-of-delivery` | GET | Get proof of delivery | Phase 2 |

### Customer Wishlist

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/wishlist` | GET | Get user's wishlist | MVP |
| `/wishlist/items` | POST | Add item to wishlist | MVP |
| `/wishlist/items/{productId}` | DELETE | Remove from wishlist | MVP |
| `/wishlist/items/{productId}/status` | GET | Check if item in wishlist | MVP |
| `/wishlist/share` | POST | Share wishlist | Phase 2 |
| `/wishlist/shared/{shareId}` | GET | View shared wishlist | Phase 2 |

### Customer Reviews & Ratings

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/reviews` | POST | Submit review | Phase 2 |
| `/reviews/{id}` | GET | Get review details | Phase 2 |
| `/reviews/{id}` | PATCH | Update review | Phase 2 |
| `/reviews/{id}` | DELETE | Delete review | Phase 2 |
| `/reviews/{id}/helpful` | POST | Mark as helpful | Phase 2 |
| `/reviews/{id}/report` | POST | Report review | Phase 2 |

### Customer Support

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/support/tickets` | POST | Create support ticket | Phase 2 |
| `/support/tickets` | GET | Get user tickets | Phase 2 |
| `/support/tickets/{id}` | GET | Get ticket details | Phase 2 |
| `/support/tickets/{id}/messages` | POST | Add message to ticket | Phase 2 |
| `/support/faq` | GET | Get FAQs | MVP |
| `/support/contact` | POST | Contact form | MVP |
| `/ai/chatbot/message` | POST | AI chatbot | Phase 2 |

### Returns & Refunds (Customer)

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/returns` | POST | Initiate return | Phase 2 |
| `/returns` | GET | Get user returns | Phase 2 |
| `/returns/{id}` | GET | Get return details | Phase 2 |
| `/returns/{id}/label` | GET | Get return shipping label | Phase 2 |
| `/returns/{id}/track` | POST | Track return | Phase 2 |

---

## 5. PAYMENTS & SUBSCRIPTIONS

### Payments

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/payments/methods` | GET | Available payment methods | MVP |
| `/payments/methods` | POST | Add payment method | MVP |
| `/payments/methods/{id}` | DELETE | Remove payment method | MVP |
| `/payments/create-intent` | POST | Create Stripe payment intent | MVP |
| `/payments/process` | POST | Process payment | MVP |
| `/payments/{id}` | GET | Get payment details | MVP |
| `/payments/refund` | POST | Process refund | MVP |
| `/payments/validate` | POST | Validate payment method | MVP |
| `/payments/webhook` | POST | Stripe webhook handler | MVP |

### Multi-Currency

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/unified-payments/rates` | GET | Get currency conversion rates | MVP |
| `/unified-payments/multi-currency/convert` | POST | Currency conversion | MVP |
| `/i18n/currencies` | GET | List supported currencies | MVP |

### Unified Payments

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/unified-payments/create-session` | POST | Create payment session | MVP |
| `/unified-payments/methods` | GET | Get available methods | MVP |
| `/unified-payments/webhook` | POST | Universal webhook handler | MVP |

### Buy Now, Pay Later (BNPL)

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/bnpl/check-eligibility` | POST | Check BNPL eligibility | Phase 2 |
| `/bnpl/create-session` | POST | Create BNPL session | Phase 2 |
| `/bnpl/plans` | GET | Get available payment plans | Phase 2 |
| `/bnpl/webhook` | POST | BNPL provider webhook | Phase 2 |

### Vendor Subscriptions

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/subscriptions/plans` | GET | Get subscription plans | MVP |
| `/subscriptions` | POST | Subscribe vendor | MVP |
| `/subscriptions` | GET | Get user subscriptions | MVP |
| `/subscriptions/{id}` | GET | Get subscription details | MVP |
| `/subscriptions/{id}` | PATCH | Update subscription | MVP |
| `/subscriptions/{id}` | DELETE | Cancel subscription | MVP |
| `/subscriptions/{id}/pause` | POST | Pause subscription | Phase 2 |
| `/subscriptions/{id}/resume` | POST | Resume subscription | Phase 2 |

### Gift Cards

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/gift-cards` | POST | Create/purchase gift card | Phase 2 |
| `/gift-cards/{code}` | GET | Check gift card balance | Phase 2 |
| `/gift-cards/{code}/redeem` | POST | Redeem gift card | Phase 2 |
| `/gift-cards/my-cards` | GET | Get user's gift cards | Phase 2 |
| `/gift-cards/send` | POST | Send gift card as gift | Phase 2 |

---

## 6. SHIPPING & TAX

### Shipping

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/shipping/rates` | GET | Get shipping rates | MVP |
| `/shipping/calculate` | POST | Calculate shipping cost | MVP |
| `/shipping/carriers` | GET | List available carriers | MVP |
| `/shipping/estimate` | POST | Get shipping estimate | MVP |
| `/shipping/validate-address` | POST | Validate shipping address | MVP |
| `/shipping/tracking/{trackingNumber}` | GET | Track shipment | MVP |
| `/shipping/labels` | POST | Generate shipping label | MVP |
| `/shipping/zones` | GET | List shipping zones | Phase 2 |

**Integrated Carriers:** FedEx, UPS, DHL, USPS, Local carriers (region-specific)

### Tax Calculation

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/tax/calculate` | POST | Calculate tax for order | MVP |
| `/tax/rates` | GET | Get tax rates by location | MVP |
| `/tax/rates` | POST | Create tax rate (admin) | MVP |
| `/tax/rates/{id}` | PATCH | Update tax rate | MVP |
| `/tax/rates/{id}` | DELETE | Delete tax rate | MVP |
| `/tax/exemptions` | GET | Get tax-exempt customers | Phase 2 |
| `/tax/exemptions` | POST | Add tax exemption | Phase 2 |
| `/tax/compliance-report` | POST | Generate compliance report | Phase 2 |

---

## 7. PLATFORM & OPERATIONS

### Notifications

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/notifications` | GET | Get user notifications | MVP |
| `/notifications/mark-read` | POST | Mark as read | MVP |
| `/notifications/{id}` | DELETE | Delete notification | MVP |
| `/notifications/preferences` | GET | Get notification preferences | MVP |
| `/notifications/preferences` | PATCH | Update preferences | MVP |
| `/notifications/subscribe` | POST | Subscribe to notifications | MVP |
| `/email/send-verification` | POST | Send verification email | MVP |
| `/email/send-receipt` | POST | Send order receipt | MVP |
| `/email/send-promotion` | POST | Send promotional email | Phase 2 |

### Fraud & Risk

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/ai/fraud-detection/analyze-transaction` | POST | Analyze transaction for fraud | Phase 2 |
| `/ai/fraud-detection/detect-account-takeover` | POST | Detect account takeover | Phase 2 |
| `/ai/fraud-detection/risk-score/{userId}` | GET | Get user risk score | Phase 2 |
| `/ai/fraud-detection/verify-payment` | POST | Verify payment legitimacy | Phase 2 |

### Webhooks & Integrations

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/webhooks/register` | POST | Register webhook | MVP |
| `/webhooks` | GET | List webhooks | MVP |
| `/webhooks/{id}` | PATCH | Update webhook | MVP |
| `/webhooks/{id}` | DELETE | Delete webhook | MVP |
| `/webhooks/{id}/test` | POST | Send test webhook | MVP |
| `/webhooks/{id}/logs` | GET | Get webhook logs | MVP |
| `/webhooks/verify` | POST | Verify webhook signature | MVP |

**Supported Events:** order.created, payment.completed, shipment.updated, inventory.low, etc.

### Analytics

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/analytics/overview` | GET | Get analytics overview | MVP |
| `/analytics/sales` | GET | Sales metrics | MVP |
| `/analytics/traffic` | GET | Traffic metrics | Phase 2 |
| `/analytics/conversion` | GET | Conversion metrics | Phase 2 |
| `/analytics/customers` | GET | Customer metrics | Phase 2 |
| `/analytics/products` | GET | Product performance | Phase 2 |
| `/analytics/top-products` | GET | Top performing products | MVP |
| `/analytics/dashboard` | GET | Analytics dashboard data | MVP |
| `/analytics/export` | GET | Export analytics data | Phase 2 |

### Cart Abandonment

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/cart-abandonment/track` | POST | Track abandoned cart | Phase 2 |
| `/cart-abandonment/metrics` | GET | Get abandonment metrics | Phase 2 |
| `/cart-abandonment/recover` | POST | Send recovery email | Phase 2 |
| `/ai/cart-abandonment/predict` | POST | Predict cart abandonment | Phase 2 |
| `/ai/cart-abandonment/campaign` | POST | Launch recovery campaign | Phase 2 |

### Deals & Flash Sales

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/deals` | GET | Get active deals | MVP |
| `/deals/{id}` | GET | Get deal details | MVP |
| `/deals` | POST | Create deal (admin) | MVP |
| `/deals/{id}` | PATCH | Update deal | MVP |
| `/deals/{id}` | DELETE | Delete deal | MVP |
| `/deals/{id}/products` | GET | Get products in deal | MVP |
| `/deals/trending` | GET | Get trending deals | Phase 2 |
| `/deals/upcoming` | GET | Get upcoming flash sales | Phase 2 |

### Coupons & Marketing (Admin)

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/coupons` | POST | Create coupon (admin) | MVP |
| `/coupons` | GET | List coupons | MVP |
| `/coupons/{code}` | GET | Get coupon by code | MVP |
| `/coupons/{id}` | PATCH | Update coupon | MVP |
| `/coupons/{id}` | DELETE | Delete coupon | MVP |
| `/coupons/{id}/activate` | POST | Activate coupon | MVP |
| `/coupons/{id}/deactivate` | POST | Deactivate coupon | MVP |
| `/coupons/validate` | POST | Validate coupon code | MVP |
| `/marketing-campaigns` | POST | Create campaign | Phase 2 |
| `/marketing-campaigns` | GET | List campaigns | Phase 2 |

### Loyalty Program

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/loyalty/points` | GET | Get loyalty points balance | Phase 2 |
| `/loyalty/redeem` | POST | Redeem points | Phase 2 |
| `/loyalty/history` | GET | Get points history | Phase 2 |
| `/loyalty/tiers` | GET | Get loyalty tiers | Phase 2 |
| `/loyalty/rewards` | GET | Get available rewards | Phase 2 |
| `/loyalty/refer` | POST | Referral program | Phase 2 |

---

## 8. AI-ENABLED (OPTIONAL) APIs

These APIs **must never block commerce flows**.

### Recommendations

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/ai/personalization/recommendations/{userId}` | GET | Personalized recommendations | Phase 2 |
| `/ai/personalization/homepage/{userId}` | GET | Personalized homepage | Phase 2 |
| `/recommendations/track` | POST | Track user behavior | Phase 2 |

### Pricing Intelligence

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/ai/pricing-engine/calculate` | POST | Dynamic pricing | Phase 2 |
| `/ai/pricing-engine/recommendations/{productId}` | GET | Pricing recommendations | Phase 2 |
| `/ai/pricing-engine/competitor-analysis` | POST | Competitor pricing | Phase 2 |

### Demand Forecasting

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/ai/demand-forecasting/predict` | POST | Predict demand | Phase 2 |
| `/ai/demand-forecasting/trends/{productId}` | GET | Get demand trends | Phase 2 |

### Fraud Detection

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/ai/fraud-detection/analyze-transaction` | POST | Transaction fraud scoring | Phase 2 |
| `/ai/fraud-detection/risk-score/{userId}` | GET | User risk score | Phase 2 |

### Content Generation

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/ai/content-generation/product-description` | POST | Generate descriptions | Phase 2 |
| `/ai/content-generation/title-variations` | POST | Generate title variations | Phase 2 |
| `/ai/content-generation/seo-keywords` | POST | Generate SEO keywords | Phase 2 |

### Visual & Conversational AI

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/ai/visual-search/search-by-image` | POST | Search by image | Phase 2 |
| `/ai/visual-search/similar-products` | POST | Find similar products | Phase 2 |
| `/ai/chatbot/message` | POST | AI chatbot | Phase 2 |
| `/ai/conversational/query` | POST | Natural language query | Phase 2 |

### AR Virtual Try-On

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/ai/ar-tryon/virtual-tryon` | POST | Generate virtual try-on | Phase 2 |
| `/ai/ar-tryon/body-measurements` | POST | Extract body measurements | Phase 2 |
| `/ai/ar-tryon/fit-recommendation` | POST | Get size/fit recommendations | Phase 2 |

---

## 9. ADMIN APIs

### Admin Orders

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/admin/orders` | GET | List all orders | MVP |
| `/admin/orders/{id}` | GET | Order details | MVP |
| `/admin/orders/{id}` | PATCH | Update order | MVP |
| `/admin/orders/{id}/refund` | POST | Manual refund | MVP |

### Admin Products

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/admin/products` | GET | List products | MVP |
| `/admin/products` | POST | Create product | MVP |
| `/admin/products/{id}` | PATCH | Update product | MVP |
| `/admin/products/{id}` | DELETE | Delete product | MVP |

### Admin Users

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/admin/users` | GET | List users | MVP |
| `/admin/users/{id}/ban` | POST | Ban user | MVP |
| `/admin/users/{id}/unban` | POST | Unban user | MVP |

### Admin Analytics

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/admin/analytics` | GET | System analytics | MVP |
| `/analytics/overview` | GET | Platform overview | MVP |

### Admin Categories

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/categories` | POST | Create category | MVP |
| `/categories/{id}` | PATCH | Update category | MVP |
| `/categories/{id}` | DELETE | Delete category | MVP |
| `/categories/{id}/reorder` | PUT | Reorder categories | MVP |

### Admin Reviews

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/reviews/admin/pending` | GET | Pending review moderation | Phase 2 |
| `/reviews/admin/{id}/approve` | POST | Approve review | Phase 2 |

### Admin Returns

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/returns/admin/all` | GET | View all returns | Phase 2 |
| `/returns/{id}` | PATCH | Update return status | Phase 2 |

---

## 10. ORGANIZATION & MULTI-TENANT

### Organizations

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/organizations` | POST | Create organization | MVP |
| `/organizations` | GET | List user organizations | MVP |
| `/organizations/{id}` | GET | Get organization details | MVP |
| `/organizations/{id}` | PATCH | Update organization | MVP |
| `/organizations/{id}` | DELETE | Delete organization | MVP |
| `/organizations/{id}/members` | POST | Add member | MVP |
| `/organizations/{id}/members` | GET | List members | MVP |
| `/organizations/{id}/members/{userId}` | DELETE | Remove member | MVP |

### Departments & Teams

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/organizations/{id}/departments` | POST | Create department | Phase 2 |
| `/organizations/{id}/departments` | GET | List departments | Phase 2 |
| `/organizations/{id}/teams` | POST | Create team | Phase 2 |
| `/organizations/{id}/teams` | GET | List teams | Phase 2 |

### Organization Roles & Permissions

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/organization-roles` | POST | Create role | MVP |
| `/organization-roles` | GET | List roles | MVP |
| `/organization-roles/{id}` | PATCH | Update role | MVP |
| `/organization-roles/{id}` | DELETE | Delete role | MVP |
| `/organization-permissions` | GET | List permissions | MVP |
| `/organization-roles/{roleId}/permissions` | POST | Assign permissions | MVP |

### Organization Billing

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/organization-billing/invoice` | GET | Get invoices | MVP |
| `/organization-billing/subscription` | GET | Get subscription info | MVP |
| `/organization-billing/webhook` | POST | Billing webhook handler | MVP |

### Organization Audit

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/organization-audit/logs` | GET | Get audit logs | MVP |
| `/organization-audit/logs/{id}` | GET | Get audit log details | MVP |
| `/organization-audit/export` | POST | Export audit logs | Phase 2 |

---

## 11. HEALTH & MONITORING

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/` | GET | Health check | MVP |
| `/version` | GET | API version | MVP |
| `/health` | GET | Detailed health status | MVP |
| `/metrics` | GET | System metrics | MVP |
| `/health/database` | GET | Database health | MVP |
| `/health/cache` | GET | Redis health | MVP |
| `/health/elasticsearch` | GET | Search engine health | MVP |
| `/health/external-services` | GET | Third-party service status | MVP |

---

## 12. INTERNATIONALIZATION

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/i18n/languages` | GET | List supported languages | MVP |
| `/i18n/translations/{lang}` | GET | Get translations | MVP |
| `/i18n/currencies` | GET | List supported currencies | MVP |
| `/i18n/locale-preferences` | POST | Set locale preferences | MVP |

---

## 13. MOBILE-SPECIFIC

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/mobile/app-config` | GET | Get app configuration | MVP |
| `/mobile/push-token` | POST | Register push token | MVP |
| `/mobile/deeplinks/{id}` | GET | Handle deep links | MVP |
| `/mobile/crash-reports` | POST | Log crashes | MVP |

---

## 14. PRIVACY & COMPLIANCE

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/privacy/policy` | GET | Get privacy policy | MVP |
| `/privacy/export-data` | POST | Request data export (GDPR) | MVP |
| `/privacy/delete-account` | POST | Request account deletion | MVP |
| `/privacy/consent` | GET | Get consent preferences | MVP |
| `/privacy/consent` | PATCH | Update consent | MVP |

---

## 15. SEO & ADVERTISEMENTS

### SEO

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/seo/sitemap` | GET | Get XML sitemap | MVP |
| `/seo/robots` | GET | Get robots.txt | MVP |
| `/seo/schema` | GET | Get structured data | Phase 2 |

### Advertisements

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/advertisements` | GET | Get ads for context | Phase 2 |
| `/advertisements` | POST | Create ad | Phase 2 |
| `/advertisements/{id}` | PATCH | Update ad | Phase 2 |
| `/advertisements/track-click` | POST | Track ad click | Phase 2 |
| `/advertisements/track-impression` | POST | Track impression | Phase 2 |
| `/advertisements/analytics` | GET | Ad performance | Phase 2 |

---

## 16. REQUIRED ARTIFACTS PER API (ENFORCED)

For **every endpoint** above, generate:

### Development Inventory

| Artifact | Location | Required |
|----------|----------|----------|
| Controller | `apps/api/src/modules/{domain}/{domain}.controller.ts` | Yes |
| DTOs | `apps/api/src/modules/{domain}/dto/*.dto.ts` | Yes |
| Service | `apps/api/src/modules/{domain}/{domain}.service.ts` | Yes |
| Repository | `apps/api/src/modules/{domain}/{domain}.repository.ts` | Yes |
| Guards (RBAC) | `apps/api/src/common/guards/*.guard.ts` | Yes |
| OpenAPI Spec | Auto-generated via Swagger decorators | Yes |
| Frontend Client | `apps/web/src/lib/api/{domain}.ts` | Yes |
| Mobile Client | `apps/mobile/src/services/{domain}.ts` | Yes |

### Test Inventory

| Test Type | Location | Required |
|-----------|----------|----------|
| Unit Tests | `apps/api/src/modules/{domain}/*.spec.ts` | Yes |
| Integration Tests | `apps/api/test/{domain}/*.e2e-spec.ts` | Yes |
| Auth/RBAC Tests | `apps/api/test/auth/*.e2e-spec.ts` | Yes |
| Negative Tests | Included in unit/integration | Yes |
| Contract Tests | `apps/api/test/contracts/*.spec.ts` | Phase 2 |
| Smoke Tests | `apps/api/test/smoke/*.spec.ts` | MVP |

Tracked in:

- `/docs/development/development-inventory.md`
- `/docs/testing/test-inventory.md`

---

## 17. TECHNOLOGY STACK

| Layer | Technology |
|-------|-----------|
| **Framework** | NestJS 10.x |
| **Language** | TypeScript 5.x |
| **Database** | PostgreSQL + Prisma ORM |
| **Cache** | Redis (Azure Cache for Redis) |
| **Search** | Elasticsearch 9.x / Algolia |
| **Queue** | Bull (Redis-backed) |
| **Real-time** | Socket.IO |
| **Email** | Nodemailer + Handlebars templates |
| **Testing** | Jest + Supertest |
| **API Docs** | Swagger/OpenAPI 3.0 |
| **Containerization** | Docker |
| **Orchestration** | Kubernetes (Azure AKS) |
| **Infrastructure** | Terraform on Azure |
| **CI/CD** | GitHub Actions |
| **Monitoring** | Azure Monitor + Application Insights |
| **Security** | Azure Key Vault |

---

## 18. PAYMENT PROVIDERS

| Provider | Status | Use Case |
|----------|--------|----------|
| Stripe | MVP | Primary payment processor |
| PayPal | MVP | Alternative payments |
| Flutterwave | Phase 2 | African markets |
| Paystack | Phase 2 | African markets |
| Affirm | Phase 2 | BNPL - US |
| Klarna | Phase 2 | BNPL - Europe |
| Afterpay | Phase 2 | BNPL - APAC |

---

## 19. DEPLOYMENT INFRASTRUCTURE

**Hosted on:** Microsoft Azure

| Component | Azure Service |
|-----------|---------------|
| Compute | Azure Kubernetes Service (AKS) |
| Container Registry | Azure Container Registry (ACR) |
| Database | PostgreSQL Flexible Server |
| Cache | Azure Cache for Redis |
| Storage | Azure Storage Account |
| Secrets | Azure Key Vault |
| Monitoring | Azure Monitor + Application Insights |
| CI/CD | GitHub Actions |
| DNS | Azure DNS |
| CDN | Azure Front Door |

---

## 20. NEXT REQUIRED ARTIFACTS

Recommended order:

1. **Development Inventory** (mapped to monorepo folders) - `/docs/development/development-inventory.md`
2. **Test Inventory** (unit -> e2e -> load) - `/docs/testing/test-inventory.md`
3. **OpenAPI specs per domain** - Auto-generated via Swagger
4. **GitHub Actions Workflows** - `.github/workflows/`
5. **Azure AKS + Terraform reference architecture** - `infrastructure/terraform/`

---

## 21. API SUMMARY METRICS

| Metric | Count |
|--------|-------|
| Total Endpoints | 300+ |
| MVP Endpoints | 180+ |
| Phase 2 Endpoints | 120+ |
| Domain Modules | 48 |
| AI/ML Endpoints | 25+ |
| Webhook Types | 10+ |

---

**Document Version:** 1.0.0
**Last Updated:** 2025-12-17
**Status:** Production-Ready
**Next:** Development Inventory
