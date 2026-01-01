-- ============================================================================
-- Broxiva Performance Indexes Migration
-- Created: December 2025
-- Purpose: Add database indexes for frequently queried columns and optimize query performance
-- ============================================================================

-- ============================================================================
-- CORE ENTITIES - PRODUCTS
-- ============================================================================

-- Products table performance indexes
-- Status-based filtering for active products
CREATE INDEX IF NOT EXISTS "idx_products_status" ON "products"("status") WHERE "status" IS NOT NULL;

-- Composite index for vendor's active products sorted by creation date
CREATE INDEX IF NOT EXISTS "idx_products_vendor_status_created" ON "products"("vendorId", "status", "createdAt" DESC);

-- Composite index for category browsing with pagination
CREATE INDEX IF NOT EXISTS "idx_products_category_status_created" ON "products"("categoryId", "status", "createdAt" DESC);

-- Price range filtering (common for search/filter operations)
CREATE INDEX IF NOT EXISTS "idx_products_price" ON "products"("price") WHERE "price" > 0;

-- Stock availability queries
CREATE INDEX IF NOT EXISTS "idx_products_stock" ON "products"("stock") WHERE "stock" >= 0;

-- SKU lookups (covering index for quick product retrieval)
CREATE INDEX IF NOT EXISTS "idx_products_sku_active" ON "products"("sku", "stock") WHERE "sku" IS NOT NULL;

-- Full-text search preparation (tags array)
CREATE INDEX IF NOT EXISTS "idx_products_tags_gin" ON "products" USING GIN("tags");

-- ============================================================================
-- CORE ENTITIES - ORDERS
-- ============================================================================

-- Orders table performance indexes
-- User's order history with status filtering
CREATE INDEX IF NOT EXISTS "idx_orders_user_status_created" ON "orders"("userId", "status", "createdAt" DESC);

-- Admin order management by status
CREATE INDEX IF NOT EXISTS "idx_orders_status_created" ON "orders"("status", "createdAt" DESC);

-- Guest order lookups
CREATE INDEX IF NOT EXISTS "idx_orders_guest_email" ON "orders"("guestEmail") WHERE "guestEmail" IS NOT NULL;

-- Shipping tracking
CREATE INDEX IF NOT EXISTS "idx_orders_tracking_carrier" ON "orders"("trackingNumber", "carrier") WHERE "trackingNumber" IS NOT NULL;

-- Date range queries for reporting
CREATE INDEX IF NOT EXISTS "idx_orders_created_status" ON "orders"("createdAt" DESC, "status");

-- Payment intent lookups
CREATE INDEX IF NOT EXISTS "idx_orders_payment_intent" ON "orders"("paymentIntentId") WHERE "paymentIntentId" IS NOT NULL;

-- ============================================================================
-- CORE ENTITIES - ORDER ITEMS
-- ============================================================================

-- OrderItems table performance indexes
-- Composite index for order details retrieval
CREATE INDEX IF NOT EXISTS "idx_order_items_order_product" ON "order_items"("orderId", "productId");

-- Product sales analytics
CREATE INDEX IF NOT EXISTS "idx_order_items_product_created" ON "order_items"("productId", "createdAt" DESC);

-- ============================================================================
-- CORE ENTITIES - USERS
-- ============================================================================

-- Users table performance indexes (some already exist in schema)
-- Active users by role
CREATE INDEX IF NOT EXISTS "idx_users_role_active" ON "users"("role", "createdAt" DESC);

-- Email domain analytics (for B2B features)
CREATE INDEX IF NOT EXISTS "idx_users_email_domain" ON "users"((split_part("email", '@', 2))) WHERE "email" LIKE '%@%';

-- ============================================================================
-- CORE ENTITIES - REVIEWS
-- ============================================================================

-- Reviews table performance indexes
-- Product reviews with status filtering
CREATE INDEX IF NOT EXISTS "idx_reviews_product_status_created" ON "reviews"("productId", "status", "createdAt" DESC);

-- User's review history
CREATE INDEX IF NOT EXISTS "idx_reviews_user_created" ON "reviews"("userId", "createdAt" DESC);

-- Verified purchase reviews
CREATE INDEX IF NOT EXISTS "idx_reviews_verified_status" ON "reviews"("isVerifiedPurchase", "status") WHERE "isVerifiedPurchase" = true;

-- Rating distribution analysis
CREATE INDEX IF NOT EXISTS "idx_reviews_product_rating" ON "reviews"("productId", "rating");

-- ============================================================================
-- CORE ENTITIES - CATEGORIES
-- ============================================================================

-- Categories table performance indexes (many already exist)
-- Active categories hierarchy
CREATE INDEX IF NOT EXISTS "idx_categories_parent_status_order" ON "categories"("parentId", "status", "sortOrder");

-- Featured categories
CREATE INDEX IF NOT EXISTS "idx_categories_featured_active" ON "categories"("isFeatured", "status") WHERE "isFeatured" = true;

-- ============================================================================
-- SHOPPING CART
-- ============================================================================

-- Carts table performance indexes
-- Active carts by user
CREATE INDEX IF NOT EXISTS "idx_carts_user_active" ON "carts"("userId", "lastActivityAt" DESC) WHERE "userId" IS NOT NULL;

-- Session-based carts
CREATE INDEX IF NOT EXISTS "idx_carts_session_active" ON "carts"("sessionId", "lastActivityAt" DESC) WHERE "sessionId" IS NOT NULL;

-- Abandoned cart recovery
CREATE INDEX IF NOT EXISTS "idx_carts_abandoned_activity" ON "carts"("isAbandoned", "lastActivityAt" DESC) WHERE "isAbandoned" = true;

-- Cart expiration cleanup
CREATE INDEX IF NOT EXISTS "idx_carts_expires_at" ON "carts"("expiresAt") WHERE "expiresAt" IS NOT NULL;

-- Cart share token lookups
CREATE INDEX IF NOT EXISTS "idx_carts_share_token" ON "carts"("shareToken") WHERE "shareToken" IS NOT NULL;

-- CartItems table indexes
CREATE INDEX IF NOT EXISTS "idx_cart_items_cart_product" ON "cart_items"("cartId", "productId");
CREATE INDEX IF NOT EXISTS "idx_cart_items_variant" ON "cart_items"("variantId") WHERE "variantId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_cart_items_inventory_reserved" ON "cart_items"("inventoryReserved", "reservationExpiry") WHERE "inventoryReserved" = true;

-- ============================================================================
-- WISHLIST
-- ============================================================================

-- Wishlist collections
CREATE INDEX IF NOT EXISTS "idx_wishlist_collections_user_active" ON "wishlist_collections"("userId", "isPublic");

-- Wishlist items with price alerts
CREATE INDEX IF NOT EXISTS "idx_wishlist_items_price_notify" ON "wishlist_items"("notifyOnPriceDrop", "targetPrice") WHERE "notifyOnPriceDrop" = true;
CREATE INDEX IF NOT EXISTS "idx_wishlist_items_stock_notify" ON "wishlist_items"("notifyWhenInStock") WHERE "notifyWhenInStock" = true;

-- ============================================================================
-- INVENTORY MANAGEMENT
-- ============================================================================

-- Inventory items performance
CREATE INDEX IF NOT EXISTS "idx_inventory_status_product" ON "inventory_items"("status", "productId");
CREATE INDEX IF NOT EXISTS "idx_inventory_warehouse_status" ON "inventory_items"("warehouseId", "status");
CREATE INDEX IF NOT EXISTS "idx_inventory_low_stock" ON "inventory_items"("productId", "quantity") WHERE "quantity" <= "reorderPoint";

-- Stock movements
CREATE INDEX IF NOT EXISTS "idx_stock_movements_product_created" ON "stock_movements"("productId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_stock_movements_warehouse_type" ON "stock_movements"("warehouseId", "type", "createdAt" DESC);

-- Stock transfers
CREATE INDEX IF NOT EXISTS "idx_stock_transfers_status_created" ON "stock_transfers"("status", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_stock_transfers_warehouses" ON "stock_transfers"("fromWarehouseId", "toWarehouseId", "status");

-- ============================================================================
-- SHIPPING & FULFILLMENT
-- ============================================================================

-- Shipments tracking
CREATE INDEX IF NOT EXISTS "idx_shipments_tracking_status" ON "shipments"("trackingNumber", "status") WHERE "trackingNumber" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_shipments_order_status" ON "shipments"("orderId", "status");
CREATE INDEX IF NOT EXISTS "idx_shipments_warehouse_carrier" ON "shipments"("warehouseId", "carrier") WHERE "warehouseId" IS NOT NULL;

-- Tracking events
CREATE INDEX IF NOT EXISTS "idx_tracking_events_shipment_time" ON "tracking_events"("shipmentId", "timestamp" DESC);

-- ============================================================================
-- RETURNS & REFUNDS
-- ============================================================================

-- Return requests
CREATE INDEX IF NOT EXISTS "idx_return_requests_user_status" ON "return_requests"("userId", "status", "requestedAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_return_requests_order_status" ON "return_requests"("orderId", "status");
CREATE INDEX IF NOT EXISTS "idx_return_requests_status_date" ON "return_requests"("status", "requestedAt" DESC);

-- Refunds
CREATE INDEX IF NOT EXISTS "idx_refunds_status_processed" ON "refunds"("status", "processedAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_refunds_user_created" ON "refunds"("userId", "createdAt" DESC);

-- ============================================================================
-- TAX SYSTEM
-- ============================================================================

-- Tax rates location lookup
CREATE INDEX IF NOT EXISTS "idx_tax_rates_location" ON "tax_rates"("country", "state", "city", "status");
CREATE INDEX IF NOT EXISTS "idx_tax_rates_effective_dates" ON "tax_rates"("effectiveFrom", "effectiveTo", "status");

-- Tax calculations
CREATE INDEX IF NOT EXISTS "idx_tax_calculations_order" ON "tax_calculations"("orderId");
CREATE INDEX IF NOT EXISTS "idx_tax_calculations_location_date" ON "tax_calculations"("country", "state", "calculatedAt" DESC);

-- ============================================================================
-- VENDOR MANAGEMENT
-- ============================================================================

-- Vendor profiles
CREATE INDEX IF NOT EXISTS "idx_vendor_profiles_status_verified" ON "vendor_profiles"("status", "isVerified");
CREATE INDEX IF NOT EXISTS "idx_vendor_profiles_business_name" ON "vendor_profiles"("businessName");

-- Vendor payouts
CREATE INDEX IF NOT EXISTS "idx_vendor_payouts_vendor_status" ON "vendor_payouts"("vendorProfileId", "status", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_vendor_payouts_period" ON "vendor_payouts"("periodStart", "periodEnd", "status");

-- Vendor performance
CREATE INDEX IF NOT EXISTS "idx_vendor_performance_period" ON "vendor_performance_metrics"("vendorProfileId", "period", "periodDate" DESC);

-- ============================================================================
-- ADVERTISING SYSTEM
-- ============================================================================

-- Ad campaigns
CREATE INDEX IF NOT EXISTS "idx_ad_campaigns_vendor_status" ON "ad_campaigns"("vendorId", "status");
CREATE INDEX IF NOT EXISTS "idx_ad_campaigns_dates_status" ON "ad_campaigns"("startDate", "endDate", "status");

-- Advertisements
CREATE INDEX IF NOT EXISTS "idx_advertisements_campaign_status" ON "advertisements"("campaignId", "status");
CREATE INDEX IF NOT EXISTS "idx_advertisements_product_dates" ON "advertisements"("productId", "startDate", "endDate") WHERE "productId" IS NOT NULL;

-- Ad impressions and clicks (time-series data)
CREATE INDEX IF NOT EXISTS "idx_ad_impressions_ad_timestamp" ON "ad_impressions"("adId", "timestamp" DESC);
CREATE INDEX IF NOT EXISTS "idx_ad_clicks_ad_timestamp" ON "ad_clicks"("adId", "timestamp" DESC);
CREATE INDEX IF NOT EXISTS "idx_ad_clicks_converted" ON "ad_clicks"("adId", "converted", "timestamp" DESC);

-- ============================================================================
-- LOYALTY & REWARDS
-- ============================================================================

-- Customer loyalty
CREATE INDEX IF NOT EXISTS "idx_customer_loyalty_tier" ON "customer_loyalty"("currentTier", "tierSpending" DESC);
CREATE INDEX IF NOT EXISTS "idx_customer_loyalty_referral" ON "customer_loyalty"("referralCode");

-- Point transactions
CREATE INDEX IF NOT EXISTS "idx_point_transactions_loyalty_type" ON "point_transactions"("loyaltyId", "type", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_point_transactions_expiry" ON "point_transactions"("expiresAt", "isExpired") WHERE "expiresAt" IS NOT NULL;

-- Referrals
CREATE INDEX IF NOT EXISTS "idx_referrals_status_created" ON "referrals"("status", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_referrals_email" ON "referrals"("refereeEmail") WHERE "refereeEmail" IS NOT NULL;

-- ============================================================================
-- DEALS & PROMOTIONS
-- ============================================================================

-- Deals
CREATE INDEX IF NOT EXISTS "idx_deals_status_dates" ON "deals"("status", "startTime", "endTime");
CREATE INDEX IF NOT EXISTS "idx_deals_featured_order" ON "deals"("isFeatured", "featuredOrder") WHERE "isFeatured" = true;
CREATE INDEX IF NOT EXISTS "idx_deals_type_status" ON "deals"("type", "status");

-- Deal products
CREATE INDEX IF NOT EXISTS "idx_deal_products_deal_active" ON "deal_products"("dealId", "isActive");

-- ============================================================================
-- COUPONS & DISCOUNTS
-- ============================================================================

-- Coupons
CREATE INDEX IF NOT EXISTS "idx_coupons_code_active" ON "coupons"("code", "isActive");
CREATE INDEX IF NOT EXISTS "idx_coupons_dates_active" ON "coupons"("startDate", "endDate", "isActive");
CREATE INDEX IF NOT EXISTS "idx_coupons_type_active" ON "coupons"("type", "isActive");

-- Coupon usage tracking
CREATE INDEX IF NOT EXISTS "idx_coupon_usages_coupon_date" ON "coupon_usages"("couponId", "usedAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_coupon_usages_user_date" ON "coupon_usages"("userId", "usedAt" DESC);

-- ============================================================================
-- SUBSCRIPTIONS
-- ============================================================================

-- Subscriptions
CREATE INDEX IF NOT EXISTS "idx_subscriptions_user_status" ON "subscriptions"("userId", "status");
CREATE INDEX IF NOT EXISTS "idx_subscriptions_plan_status" ON "subscriptions"("planId", "status");
CREATE INDEX IF NOT EXISTS "idx_subscriptions_period_end" ON "subscriptions"("currentPeriodEnd", "status");

-- Subscription invoices
CREATE INDEX IF NOT EXISTS "idx_subscription_invoices_status_date" ON "subscription_invoices"("status", "periodStart" DESC);

-- ============================================================================
-- EMAIL & NOTIFICATIONS
-- ============================================================================

-- Email logs
CREATE INDEX IF NOT EXISTS "idx_email_logs_recipient_status" ON "email_logs"("to", "status", "sentAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_email_logs_type_status" ON "email_logs"("type", "status", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_email_logs_template_date" ON "email_logs"("templateId", "sentAt" DESC) WHERE "templateId" IS NOT NULL;

-- Email queue
CREATE INDEX IF NOT EXISTS "idx_email_queue_status_priority" ON "email_queue"("status", "priority" DESC, "scheduledFor");
CREATE INDEX IF NOT EXISTS "idx_email_queue_scheduled" ON "email_queue"("scheduledFor", "status") WHERE "scheduledFor" IS NOT NULL;

-- Cart abandonment emails
CREATE INDEX IF NOT EXISTS "idx_cart_abandonment_emails_scheduled" ON "cart_abandonment_emails"("scheduledFor", "sent");
CREATE INDEX IF NOT EXISTS "idx_cart_abandonment_emails_conversion" ON "cart_abandonment_emails"("convertedToOrder", "orderId") WHERE "convertedToOrder" = true;

-- ============================================================================
-- SEARCH & ANALYTICS
-- ============================================================================

-- Search queries
CREATE INDEX IF NOT EXISTS "idx_search_queries_query_created" ON "search_queries"("query", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_search_queries_user_session" ON "search_queries"("userId", "sessionId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_search_queries_converted" ON "search_queries"("converted", "createdAt" DESC);

-- Product views
CREATE INDEX IF NOT EXISTS "idx_product_views_product_created" ON "product_views"("productId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_product_views_user_created" ON "product_views"("userId", "createdAt" DESC) WHERE "userId" IS NOT NULL;

-- Vendor analytics
CREATE INDEX IF NOT EXISTS "idx_vendor_analytics_vendor_period" ON "vendor_analytics"("vendorId", "period", "date" DESC);

-- Product analytics
CREATE INDEX IF NOT EXISTS "idx_product_analytics_product_period" ON "product_analytics"("productId", "period", "date" DESC);

-- Category analytics
CREATE INDEX IF NOT EXISTS "idx_category_analytics_category_period" ON "category_analytics"("categoryId", "period", "date" DESC);

-- ============================================================================
-- SECURITY & AUDIT
-- ============================================================================

-- Audit logs
CREATE INDEX IF NOT EXISTS "idx_audit_logs_user_activity" ON "audit_logs"("userId", "activityType", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_audit_logs_suspicious" ON "audit_logs"("isSuspicious", "createdAt" DESC) WHERE "isSuspicious" = true;
CREATE INDEX IF NOT EXISTS "idx_audit_logs_ip_created" ON "audit_logs"("ipAddress", "createdAt" DESC) WHERE "ipAddress" IS NOT NULL;

-- API keys
CREATE INDEX IF NOT EXISTS "idx_api_keys_user_active" ON "api_keys"("userId", "isActive");
CREATE INDEX IF NOT EXISTS "idx_api_keys_expiry" ON "api_keys"("expiresAt", "isActive") WHERE "expiresAt" IS NOT NULL;

-- User sessions
CREATE INDEX IF NOT EXISTS "idx_user_sessions_user_active" ON "user_sessions"("userId", "isActive", "lastActivityAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_user_sessions_expiry" ON "user_sessions"("expiresAt", "isActive");

-- Login attempts (for rate limiting and security)
CREATE INDEX IF NOT EXISTS "idx_login_attempts_email_created" ON "login_attempts"("email", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_login_attempts_ip_created" ON "login_attempts"("ipAddress", "createdAt" DESC);

-- ============================================================================
-- SUPPORT SYSTEM
-- ============================================================================

-- Support tickets
CREATE INDEX IF NOT EXISTS "idx_support_tickets_user_status" ON "support_tickets"("userId", "status", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_support_tickets_assigned_status" ON "support_tickets"("assignedToId", "status", "createdAt" DESC) WHERE "assignedToId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_support_tickets_priority_status" ON "support_tickets"("priority", "status", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_support_tickets_sla_breach" ON "support_tickets"("slaBreached", "slaDeadline") WHERE "slaBreached" = true;

-- Ticket messages
CREATE INDEX IF NOT EXISTS "idx_ticket_messages_ticket_created" ON "ticket_messages"("ticketId", "createdAt" ASC);

-- Live chat sessions
CREATE INDEX IF NOT EXISTS "idx_live_chat_sessions_status_started" ON "live_chat_sessions"("status", "startedAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_live_chat_sessions_assigned" ON "live_chat_sessions"("assignedToId", "status") WHERE "assignedToId" IS NOT NULL;

-- ============================================================================
-- ORGANIZATION MODULE
-- ============================================================================

-- Organizations
CREATE INDEX IF NOT EXISTS "idx_organizations_status_created" ON "organizations"("status", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_organizations_owner" ON "organizations"("ownerId");

-- Organization members
CREATE INDEX IF NOT EXISTS "idx_org_members_org_status" ON "organization_members"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "idx_org_members_role" ON "organization_members"("roleId") WHERE "roleId" IS NOT NULL;

-- Organization audit logs
CREATE INDEX IF NOT EXISTS "idx_org_audit_logs_org_created" ON "organization_audit_logs"("organizationId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_org_audit_logs_user_action" ON "organization_audit_logs"("userId", "action", "createdAt" DESC) WHERE "userId" IS NOT NULL;

-- KYC applications
CREATE INDEX IF NOT EXISTS "idx_kyc_applications_org_status" ON "kyc_applications"("organizationId", "status");

-- ============================================================================
-- WEBHOOKS
-- ============================================================================

-- Webhook deliveries
CREATE INDEX IF NOT EXISTS "idx_webhook_deliveries_webhook_status" ON "webhook_deliveries"("webhookId", "status", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_webhook_deliveries_retry" ON "webhook_deliveries"("status", "nextRetryAt") WHERE "nextRetryAt" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_webhook_deliveries_event_type" ON "webhook_deliveries"("eventType", "createdAt" DESC);

-- Webhook event logs
CREATE INDEX IF NOT EXISTS "idx_webhook_event_logs_type_created" ON "webhook_event_logs"("eventType", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_webhook_event_logs_processed" ON "webhook_event_logs"("processed", "createdAt" DESC);

-- ============================================================================
-- MOBILE APP
-- ============================================================================

-- Push notification tokens
CREATE INDEX IF NOT EXISTS "idx_push_tokens_user_active" ON "push_notification_tokens"("userId", "isActive");
CREATE INDEX IF NOT EXISTS "idx_push_tokens_device_platform" ON "push_notification_tokens"("deviceId", "platform");

-- Mobile notifications
CREATE INDEX IF NOT EXISTS "idx_mobile_notifications_user_category" ON "mobile_notifications"("userId", "category", "createdAt" DESC) WHERE "userId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_mobile_notifications_sent_read" ON "mobile_notifications"("isSent", "isRead", "sentAt" DESC);

-- Mobile sessions
CREATE INDEX IF NOT EXISTS "idx_mobile_sessions_user_active" ON "mobile_sessions"("userId", "isActive");
CREATE INDEX IF NOT EXISTS "idx_mobile_sessions_device" ON "mobile_sessions"("deviceId", "platform");

-- ============================================================================
-- PARTIAL INDEXES FOR COMMON FILTERS
-- ============================================================================

-- Active products only
CREATE INDEX IF NOT EXISTS "idx_active_products_category" ON "products"("categoryId", "createdAt" DESC) WHERE "status" = 'active';

-- Pending orders
CREATE INDEX IF NOT EXISTS "idx_pending_orders_created" ON "orders"("createdAt" DESC) WHERE "status" = 'PENDING';

-- Active deals
CREATE INDEX IF NOT EXISTS "idx_active_deals_dates" ON "deals"("startTime", "endTime") WHERE "status" = 'ACTIVE';

-- Unread notifications
CREATE INDEX IF NOT EXISTS "idx_unread_mobile_notifications" ON "mobile_notifications"("userId", "sentAt" DESC) WHERE "isRead" = false;

-- ============================================================================
-- COVERING INDEXES (Include commonly accessed columns)
-- ============================================================================

-- Product search results (cover common display fields)
CREATE INDEX IF NOT EXISTS "idx_products_search_covering"
  ON "products"("categoryId", "createdAt" DESC)
  INCLUDE ("name", "price", "stock", "images");

-- Order list view
CREATE INDEX IF NOT EXISTS "idx_orders_list_covering"
  ON "orders"("userId", "createdAt" DESC)
  INCLUDE ("total", "status", "trackingNumber");

-- ============================================================================
-- COMMENTS & DOCUMENTATION
-- ============================================================================

-- This migration adds comprehensive performance indexes for Broxiva platform
--
-- Index Strategy:
-- 1. Single-column indexes for frequent filters (status, dates, foreign keys)
-- 2. Composite indexes for common query patterns (user+status+date, etc.)
-- 3. Partial indexes for filtered queries (active products, pending orders)
-- 4. Covering indexes for frequently accessed columns
-- 5. GIN indexes for array and full-text search
--
-- Index Naming Convention:
-- idx_{table}_{columns}_{condition} where condition is optional
--
-- Maintenance Notes:
-- - Run ANALYZE after applying this migration
-- - Monitor index usage with pg_stat_user_indexes
-- - Consider index maintenance during low-traffic periods
-- - Review and drop unused indexes periodically
--
-- Performance Impact:
-- - Improved query performance for common operations
-- - Slightly increased write overhead (inserts/updates)
-- - Increased storage requirements (estimated 10-15% of table size)
--
-- Author: Broxiva Platform Team
-- Date: December 2025
