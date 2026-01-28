-- Rollback migration: 20251203_add_performance_indexes
-- This script reverses all changes made in migration.sql
-- Drops all performance indexes added for Broxiva platform

-- ============================================================================
-- COVERING INDEXES
-- ============================================================================
DROP INDEX IF EXISTS "idx_orders_list_covering";
DROP INDEX IF EXISTS "idx_products_search_covering";

-- ============================================================================
-- PARTIAL INDEXES FOR COMMON FILTERS
-- ============================================================================
DROP INDEX IF EXISTS "idx_unread_mobile_notifications";
DROP INDEX IF EXISTS "idx_active_deals_dates";
DROP INDEX IF EXISTS "idx_pending_orders_created";
DROP INDEX IF EXISTS "idx_active_products_category";

-- ============================================================================
-- MOBILE APP
-- ============================================================================
DROP INDEX IF EXISTS "idx_mobile_sessions_device";
DROP INDEX IF EXISTS "idx_mobile_sessions_user_active";
DROP INDEX IF EXISTS "idx_mobile_notifications_sent_read";
DROP INDEX IF EXISTS "idx_mobile_notifications_user_category";
DROP INDEX IF EXISTS "idx_push_tokens_device_platform";
DROP INDEX IF EXISTS "idx_push_tokens_user_active";

-- ============================================================================
-- WEBHOOKS
-- ============================================================================
DROP INDEX IF EXISTS "idx_webhook_event_logs_processed";
DROP INDEX IF EXISTS "idx_webhook_event_logs_type_created";
DROP INDEX IF EXISTS "idx_webhook_deliveries_event_type";
DROP INDEX IF EXISTS "idx_webhook_deliveries_retry";
DROP INDEX IF EXISTS "idx_webhook_deliveries_webhook_status";

-- ============================================================================
-- ORGANIZATION MODULE
-- ============================================================================
DROP INDEX IF EXISTS "idx_kyc_applications_org_status";
DROP INDEX IF EXISTS "idx_org_audit_logs_user_action";
DROP INDEX IF EXISTS "idx_org_audit_logs_org_created";
DROP INDEX IF EXISTS "idx_org_members_role";
DROP INDEX IF EXISTS "idx_org_members_org_status";
DROP INDEX IF EXISTS "idx_organizations_owner";
DROP INDEX IF EXISTS "idx_organizations_status_created";

-- ============================================================================
-- SUPPORT SYSTEM
-- ============================================================================
DROP INDEX IF EXISTS "idx_live_chat_sessions_assigned";
DROP INDEX IF EXISTS "idx_live_chat_sessions_status_started";
DROP INDEX IF EXISTS "idx_ticket_messages_ticket_created";
DROP INDEX IF EXISTS "idx_support_tickets_sla_breach";
DROP INDEX IF EXISTS "idx_support_tickets_priority_status";
DROP INDEX IF EXISTS "idx_support_tickets_assigned_status";
DROP INDEX IF EXISTS "idx_support_tickets_user_status";

-- ============================================================================
-- SECURITY & AUDIT
-- ============================================================================
DROP INDEX IF EXISTS "idx_login_attempts_ip_created";
DROP INDEX IF EXISTS "idx_login_attempts_email_created";
DROP INDEX IF EXISTS "idx_user_sessions_expiry";
DROP INDEX IF EXISTS "idx_user_sessions_user_active";
DROP INDEX IF EXISTS "idx_api_keys_expiry";
DROP INDEX IF EXISTS "idx_api_keys_user_active";
DROP INDEX IF EXISTS "idx_audit_logs_ip_created";
DROP INDEX IF EXISTS "idx_audit_logs_suspicious";
DROP INDEX IF EXISTS "idx_audit_logs_user_activity";

-- ============================================================================
-- SEARCH & ANALYTICS
-- ============================================================================
DROP INDEX IF EXISTS "idx_category_analytics_category_period";
DROP INDEX IF EXISTS "idx_product_analytics_product_period";
DROP INDEX IF EXISTS "idx_vendor_analytics_vendor_period";
DROP INDEX IF EXISTS "idx_product_views_user_created";
DROP INDEX IF EXISTS "idx_product_views_product_created";
DROP INDEX IF EXISTS "idx_search_queries_converted";
DROP INDEX IF EXISTS "idx_search_queries_user_session";
DROP INDEX IF EXISTS "idx_search_queries_query_created";

-- ============================================================================
-- EMAIL & NOTIFICATIONS
-- ============================================================================
DROP INDEX IF EXISTS "idx_cart_abandonment_emails_conversion";
DROP INDEX IF EXISTS "idx_cart_abandonment_emails_scheduled";
DROP INDEX IF EXISTS "idx_email_queue_scheduled";
DROP INDEX IF EXISTS "idx_email_queue_status_priority";
DROP INDEX IF EXISTS "idx_email_logs_template_date";
DROP INDEX IF EXISTS "idx_email_logs_type_status";
DROP INDEX IF EXISTS "idx_email_logs_recipient_status";

-- ============================================================================
-- SUBSCRIPTIONS
-- ============================================================================
DROP INDEX IF EXISTS "idx_subscription_invoices_status_date";
DROP INDEX IF EXISTS "idx_subscriptions_period_end";
DROP INDEX IF EXISTS "idx_subscriptions_plan_status";
DROP INDEX IF EXISTS "idx_subscriptions_user_status";

-- ============================================================================
-- COUPONS & DISCOUNTS
-- ============================================================================
DROP INDEX IF EXISTS "idx_coupon_usages_user_date";
DROP INDEX IF EXISTS "idx_coupon_usages_coupon_date";
DROP INDEX IF EXISTS "idx_coupons_type_active";
DROP INDEX IF EXISTS "idx_coupons_dates_active";
DROP INDEX IF EXISTS "idx_coupons_code_active";

-- ============================================================================
-- DEALS & PROMOTIONS
-- ============================================================================
DROP INDEX IF EXISTS "idx_deal_products_deal_active";
DROP INDEX IF EXISTS "idx_deals_type_status";
DROP INDEX IF EXISTS "idx_deals_featured_order";
DROP INDEX IF EXISTS "idx_deals_status_dates";

-- ============================================================================
-- LOYALTY & REWARDS
-- ============================================================================
DROP INDEX IF EXISTS "idx_referrals_email";
DROP INDEX IF EXISTS "idx_referrals_status_created";
DROP INDEX IF EXISTS "idx_point_transactions_expiry";
DROP INDEX IF EXISTS "idx_point_transactions_loyalty_type";
DROP INDEX IF EXISTS "idx_customer_loyalty_referral";
DROP INDEX IF EXISTS "idx_customer_loyalty_tier";

-- ============================================================================
-- ADVERTISING SYSTEM
-- ============================================================================
DROP INDEX IF EXISTS "idx_ad_clicks_converted";
DROP INDEX IF EXISTS "idx_ad_clicks_ad_timestamp";
DROP INDEX IF EXISTS "idx_ad_impressions_ad_timestamp";
DROP INDEX IF EXISTS "idx_advertisements_product_dates";
DROP INDEX IF EXISTS "idx_advertisements_campaign_status";
DROP INDEX IF EXISTS "idx_ad_campaigns_dates_status";
DROP INDEX IF EXISTS "idx_ad_campaigns_vendor_status";

-- ============================================================================
-- VENDOR MANAGEMENT
-- ============================================================================
DROP INDEX IF EXISTS "idx_vendor_performance_period";
DROP INDEX IF EXISTS "idx_vendor_payouts_period";
DROP INDEX IF EXISTS "idx_vendor_payouts_vendor_status";
DROP INDEX IF EXISTS "idx_vendor_profiles_business_name";
DROP INDEX IF EXISTS "idx_vendor_profiles_status_verified";

-- ============================================================================
-- TAX SYSTEM
-- ============================================================================
DROP INDEX IF EXISTS "idx_tax_calculations_location_date";
DROP INDEX IF EXISTS "idx_tax_calculations_order";
DROP INDEX IF EXISTS "idx_tax_rates_effective_dates";
DROP INDEX IF EXISTS "idx_tax_rates_location";

-- ============================================================================
-- RETURNS & REFUNDS
-- ============================================================================
DROP INDEX IF EXISTS "idx_refunds_user_created";
DROP INDEX IF EXISTS "idx_refunds_status_processed";
DROP INDEX IF EXISTS "idx_return_requests_status_date";
DROP INDEX IF EXISTS "idx_return_requests_order_status";
DROP INDEX IF EXISTS "idx_return_requests_user_status";

-- ============================================================================
-- SHIPPING & FULFILLMENT
-- ============================================================================
DROP INDEX IF EXISTS "idx_tracking_events_shipment_time";
DROP INDEX IF EXISTS "idx_shipments_warehouse_carrier";
DROP INDEX IF EXISTS "idx_shipments_order_status";
DROP INDEX IF EXISTS "idx_shipments_tracking_status";

-- ============================================================================
-- INVENTORY MANAGEMENT
-- ============================================================================
DROP INDEX IF EXISTS "idx_stock_transfers_warehouses";
DROP INDEX IF EXISTS "idx_stock_transfers_status_created";
DROP INDEX IF EXISTS "idx_stock_movements_warehouse_type";
DROP INDEX IF EXISTS "idx_stock_movements_product_created";
DROP INDEX IF EXISTS "idx_inventory_low_stock";
DROP INDEX IF EXISTS "idx_inventory_warehouse_status";
DROP INDEX IF EXISTS "idx_inventory_status_product";

-- ============================================================================
-- WISHLIST
-- ============================================================================
DROP INDEX IF EXISTS "idx_wishlist_items_stock_notify";
DROP INDEX IF EXISTS "idx_wishlist_items_price_notify";
DROP INDEX IF EXISTS "idx_wishlist_collections_user_active";

-- ============================================================================
-- SHOPPING CART
-- ============================================================================
DROP INDEX IF EXISTS "idx_cart_items_inventory_reserved";
DROP INDEX IF EXISTS "idx_cart_items_variant";
DROP INDEX IF EXISTS "idx_cart_items_cart_product";
DROP INDEX IF EXISTS "idx_carts_share_token";
DROP INDEX IF EXISTS "idx_carts_expires_at";
DROP INDEX IF EXISTS "idx_carts_abandoned_activity";
DROP INDEX IF EXISTS "idx_carts_session_active";
DROP INDEX IF EXISTS "idx_carts_user_active";

-- ============================================================================
-- CORE ENTITIES - CATEGORIES
-- ============================================================================
DROP INDEX IF EXISTS "idx_categories_featured_active";
DROP INDEX IF EXISTS "idx_categories_parent_status_order";

-- ============================================================================
-- CORE ENTITIES - REVIEWS
-- ============================================================================
DROP INDEX IF EXISTS "idx_reviews_product_rating";
DROP INDEX IF EXISTS "idx_reviews_verified_status";
DROP INDEX IF EXISTS "idx_reviews_user_created";
DROP INDEX IF EXISTS "idx_reviews_product_status_created";

-- ============================================================================
-- CORE ENTITIES - USERS
-- ============================================================================
DROP INDEX IF EXISTS "idx_users_email_domain";
DROP INDEX IF EXISTS "idx_users_role_active";

-- ============================================================================
-- CORE ENTITIES - ORDER ITEMS
-- ============================================================================
DROP INDEX IF EXISTS "idx_order_items_product_created";
DROP INDEX IF EXISTS "idx_order_items_order_product";

-- ============================================================================
-- CORE ENTITIES - ORDERS
-- ============================================================================
DROP INDEX IF EXISTS "idx_orders_payment_intent";
DROP INDEX IF EXISTS "idx_orders_created_status";
DROP INDEX IF EXISTS "idx_orders_tracking_carrier";
DROP INDEX IF EXISTS "idx_orders_guest_email";
DROP INDEX IF EXISTS "idx_orders_status_created";
DROP INDEX IF EXISTS "idx_orders_user_status_created";

-- ============================================================================
-- CORE ENTITIES - PRODUCTS
-- ============================================================================
DROP INDEX IF EXISTS "idx_products_tags_gin";
DROP INDEX IF EXISTS "idx_products_sku_active";
DROP INDEX IF EXISTS "idx_products_stock";
DROP INDEX IF EXISTS "idx_products_price";
DROP INDEX IF EXISTS "idx_products_category_status_created";
DROP INDEX IF EXISTS "idx_products_vendor_status_created";
DROP INDEX IF EXISTS "idx_products_status";
