# Broxiva Global Data Architecture

## Executive Summary

This document defines the complete data architecture for Broxiva's global B2B enterprise marketplace platform. It covers the multi-tenant enterprise data model, regional data residency requirements, multi-currency pricing schema, multi-language content model, and compliance/audit trail schema necessary to support cross-border trade operations across six global regions.

## Table of Contents

1. [Multi-Tenant Enterprise Data Model](#multi-tenant-enterprise-data-model)
2. [Regional Data Residency](#regional-data-residency)
3. [Multi-Currency Pricing Schema](#multi-currency-pricing-schema)
4. [Multi-Language Content Model](#multi-language-content-model)
5. [Compliance & Audit Trail Schema](#compliance--audit-trail-schema)
6. [Data Partitioning Strategy](#data-partitioning-strategy)
7. [Data Synchronization](#data-synchronization)
8. [Data Security & Encryption](#data-security--encryption)

---

## 1. Multi-Tenant Enterprise Data Model

### 1.1 Core Entity Relationship Diagram

```
CORE DATA MODEL
═══════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────────┐
│                            ORGANIZATION (Tenant)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│ • id: UUID (Primary Key)                                                    │
│ • name: VARCHAR(255)                                                        │
│ • type: ENUM('ENTERPRISE', 'SME', 'VENDOR', 'MARKETPLACE')                 │
│ • legal_name: VARCHAR(500)                                                  │
│ • tax_id: VARCHAR(100)                                                      │
│ • registration_number: VARCHAR(100)                                         │
│ • country_code: VARCHAR(3) [ISO 3166-1 alpha-3]                            │
│ • region: ENUM('AFRICA', 'US', 'EUROPE', 'APAC', 'LATAM', 'ME')           │
│ • billing_address: JSONB                                                    │
│ • subscription_tier: ENUM('FREE', 'BASIC', 'PRO', 'ENTERPRISE')            │
│ • status: ENUM('ACTIVE', 'SUSPENDED', 'PENDING', 'CLOSED')                 │
│ • onboarding_completed: BOOLEAN                                             │
│ • kyb_verified: BOOLEAN                                                     │
│ • compliance_status: JSONB                                                  │
│ • settings: JSONB                                                           │
│ • created_at: TIMESTAMP                                                     │
│ • updated_at: TIMESTAMP                                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 1:N
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                  USER                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ • id: UUID (Primary Key)                                                    │
│ • organization_id: UUID (Foreign Key → ORGANIZATION)                        │
│ • email: VARCHAR(255) [Unique]                                              │
│ • email_verified: BOOLEAN                                                   │
│ • phone: VARCHAR(50)                                                        │
│ • phone_verified: BOOLEAN                                                   │
│ • password_hash: VARCHAR(255)                                               │
│ • first_name: VARCHAR(100)                                                  │
│ • last_name: VARCHAR(100)                                                   │
│ • role: ENUM('OWNER', 'ADMIN', 'MANAGER', 'BUYER', 'FINANCE', 'QA')        │
│ • permissions: JSONB                                                        │
│ • language_preference: VARCHAR(10) [ISO 639-1]                             │
│ • timezone: VARCHAR(50)                                                     │
│ • currency_preference: VARCHAR(3) [ISO 4217]                                │
│ • profile_image: VARCHAR(500)                                               │
│ • status: ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED')               │
│ • last_login_at: TIMESTAMP                                                  │
│ • mfa_enabled: BOOLEAN                                                      │
│ • mfa_secret: VARCHAR(100)                                                  │
│ • created_at: TIMESTAMP                                                     │
│ • updated_at: TIMESTAMP                                                     │
└─────────────────────────────────────────────────────────────────────────────┘
         │                                        │
         │ 1:N                                    │ 1:N
         ▼                                        ▼
┌─────────────────────┐              ┌──────────────────────────┐
│   USER_ADDRESS      │              │   USER_SESSION           │
├─────────────────────┤              ├──────────────────────────┤
│ • id: UUID          │              │ • id: UUID               │
│ • user_id: UUID (FK)│              │ • user_id: UUID (FK)     │
│ • type: ENUM        │              │ • token: VARCHAR(500)    │
│ • address_line1     │              │ • device_info: JSONB     │
│ • address_line2     │              │ • ip_address: INET       │
│ • city              │              │ • user_agent: TEXT       │
│ • state             │              │ • expires_at: TIMESTAMP  │
│ • postal_code       │              │ • created_at: TIMESTAMP  │
│ • country_code      │              └──────────────────────────┘
│ • is_default        │
│ • created_at        │
└─────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                                VENDOR                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ • id: UUID (Primary Key)                                                    │
│ • organization_id: UUID (FK → ORGANIZATION)                                 │
│ • business_name: VARCHAR(255)                                               │
│ • display_name: VARCHAR(255)                                                │
│ • slug: VARCHAR(255) [Unique]                                               │
│ • description: TEXT                                                         │
│ • logo_url: VARCHAR(500)                                                    │
│ • banner_url: VARCHAR(500)                                                  │
│ • vendor_type: ENUM('MANUFACTURER', 'DISTRIBUTOR', 'WHOLESALER')           │
│ • business_categories: VARCHAR[] [Array of category IDs]                    │
│ • min_order_value: DECIMAL(15,2)                                            │
│ • payment_terms: JSONB                                                      │
│ • shipping_zones: JSONB                                                     │
│ • response_time_avg: INTEGER [in minutes]                                   │
│ • fulfillment_rate: DECIMAL(5,2) [percentage]                              │
│ • rating: DECIMAL(3,2)                                                      │
│ • review_count: INTEGER                                                     │
│ • total_sales: DECIMAL(20,2)                                                │
│ • total_orders: INTEGER                                                     │
│ • performance_score: DECIMAL(5,2)                                           │
│ • performance_tier: ENUM('PLATINUM', 'GOLD', 'SILVER', 'BRONZE', 'AT_RISK')│
│ • verified: BOOLEAN                                                         │
│ • verification_date: TIMESTAMP                                              │
│ • certifications: JSONB                                                     │
│ • compliance_documents: JSONB                                               │
│ • status: ENUM('ACTIVE', 'TRIAL', 'SUSPENDED', 'CLOSED')                   │
│ • created_at: TIMESTAMP                                                     │
│ • updated_at: TIMESTAMP                                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 1:N
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                               PRODUCT                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ • id: UUID (Primary Key)                                                    │
│ • vendor_id: UUID (FK → VENDOR)                                             │
│ • sku: VARCHAR(100) [Unique per vendor]                                     │
│ • name: VARCHAR(500)                                                        │
│ • slug: VARCHAR(500)                                                        │
│ • short_description: TEXT                                                   │
│ • long_description: TEXT                                                    │
│ • category_id: UUID (FK → CATEGORY)                                         │
│ • subcategory_id: UUID                                                      │
│ • brand: VARCHAR(255)                                                       │
│ • manufacturer: VARCHAR(255)                                                │
│ • model_number: VARCHAR(100)                                                │
│ • hs_code: VARCHAR(20)                                                      │
│ • eccn: VARCHAR(50) [Export Control Classification]                        │
│ • upc_ean: VARCHAR(50)                                                      │
│ • specifications: JSONB                                                     │
│ • attributes: JSONB                                                         │
│ • dimensions: JSONB [length, width, height, weight]                         │
│ • package_dimensions: JSONB                                                 │
│ • images: VARCHAR[] [Array of image URLs]                                   │
│ • videos: VARCHAR[] [Array of video URLs]                                   │
│ • documents: JSONB [Specs, certs, manuals]                                  │
│ • base_price: DECIMAL(15,2)                                                 │
│ • currency: VARCHAR(3) [ISO 4217]                                           │
│ • moq: INTEGER [Minimum Order Quantity]                                     │
│ • stock_quantity: INTEGER                                                   │
│ • low_stock_threshold: INTEGER                                              │
│ • lead_time_days: INTEGER                                                   │
│ • condition: ENUM('NEW', 'REFURBISHED', 'USED')                            │
│ • warranty: JSONB                                                           │
│ • certifications: VARCHAR[] [ISO, CE, UL, etc.]                             │
│ • compliance_info: JSONB                                                    │
│ • restricted_countries: VARCHAR[] [Array of country codes]                  │
│ • requires_license: BOOLEAN                                                 │
│ • status: ENUM('ACTIVE', 'DRAFT', 'INACTIVE', 'OUT_OF_STOCK')              │
│ • visibility: ENUM('PUBLIC', 'PRIVATE', 'INVITATION_ONLY')                 │
│ • views: INTEGER                                                            │
│ • favorites: INTEGER                                                        │
│ • rating: DECIMAL(3,2)                                                      │
│ • review_count: INTEGER                                                     │
│ • seo_title: VARCHAR(500)                                                   │
│ • seo_description: TEXT                                                     │
│ • seo_keywords: VARCHAR[]                                                   │
│ • created_at: TIMESTAMP                                                     │
│ • updated_at: TIMESTAMP                                                     │
│ • published_at: TIMESTAMP                                                   │
└─────────────────────────────────────────────────────────────────────────────┘
         │                                        │
         │ 1:N                                    │ 1:N
         ▼                                        ▼
┌─────────────────────────┐         ┌────────────────────────────┐
│  PRODUCT_PRICING        │         │  PRODUCT_INVENTORY         │
├─────────────────────────┤         ├────────────────────────────┤
│ • id: UUID              │         │ • id: UUID                 │
│ • product_id: UUID (FK) │         │ • product_id: UUID (FK)    │
│ • quantity_min: INTEGER │         │ • warehouse_id: UUID (FK)  │
│ • quantity_max: INTEGER │         │ • quantity: INTEGER        │
│ • unit_price: DECIMAL   │         │ • reserved: INTEGER        │
│ • currency: VARCHAR(3)  │         │ • available: INTEGER       │
│ • region_codes: VARCHAR[]         │ • location: VARCHAR        │
│ • valid_from: TIMESTAMP │         │ • last_counted: TIMESTAMP  │
│ • valid_until: TIMESTAMP│         │ • updated_at: TIMESTAMP    │
└─────────────────────────┘         └────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                                  ORDER                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ • id: UUID (Primary Key)                                                    │
│ • order_number: VARCHAR(50) [Unique, Auto-generated]                        │
│ • organization_id: UUID (FK → ORGANIZATION) [Buyer]                         │
│ • buyer_id: UUID (FK → USER)                                                │
│ • vendor_id: UUID (FK → VENDOR)                                             │
│ • status: ENUM('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED',            │
│         'DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED')                  │
│ • type: ENUM('DIRECT', 'RFQ', 'SUBSCRIPTION')                              │
│ • source: ENUM('WEB', 'MOBILE', 'API', 'BULK_IMPORT')                      │
│ • currency: VARCHAR(3) [ISO 4217]                                           │
│ • subtotal: DECIMAL(15,2)                                                   │
│ • tax_amount: DECIMAL(15,2)                                                 │
│ • duty_amount: DECIMAL(15,2)                                                │
│ • shipping_amount: DECIMAL(15,2)                                            │
│ • discount_amount: DECIMAL(15,2)                                            │
│ • total_amount: DECIMAL(15,2)                                               │
│ • exchange_rate: DECIMAL(15,6) [if multi-currency]                         │
│ • converted_amount: DECIMAL(15,2)                                           │
│ • converted_currency: VARCHAR(3)                                            │
│ • payment_method: VARCHAR(50)                                               │
│ • payment_status: ENUM('PENDING', 'AUTHORIZED', 'CAPTURED', 'FAILED')      │
│ • payment_terms: JSONB                                                      │
│ • billing_address: JSONB                                                    │
│ • shipping_address: JSONB                                                   │
│ • incoterms: VARCHAR(10) [EXW, FOB, CIF, etc.]                             │
│ • shipping_method: VARCHAR(100)                                             │
│ • estimated_delivery: DATE                                                  │
│ • actual_delivery: TIMESTAMP                                                │
│ • notes: TEXT                                                               │
│ • internal_notes: TEXT                                                      │
│ • metadata: JSONB                                                           │
│ • tracking_numbers: VARCHAR[]                                               │
│ • po_number: VARCHAR(100) [Purchase Order Number]                           │
│ • invoice_number: VARCHAR(100)                                              │
│ • tax_invoice_url: VARCHAR(500)                                             │
│ • commercial_invoice_url: VARCHAR(500)                                      │
│ • packing_list_url: VARCHAR(500)                                            │
│ • bol_url: VARCHAR(500) [Bill of Lading]                                   │
│ • customs_documents: JSONB                                                  │
│ • risk_score: DECIMAL(5,2)                                                  │
│ • fraud_check_status: ENUM('PASSED', 'FLAGGED', 'REVIEW', 'FAILED')        │
│ • compliance_check_status: ENUM('PASSED', 'PENDING', 'FAILED')             │
│ • created_at: TIMESTAMP                                                     │
│ • updated_at: TIMESTAMP                                                     │
│ • confirmed_at: TIMESTAMP                                                   │
│ • shipped_at: TIMESTAMP                                                     │
│ • delivered_at: TIMESTAMP                                                   │
│ • cancelled_at: TIMESTAMP                                                   │
│ • cancellation_reason: TEXT                                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 1:N
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ORDER_ITEM                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│ • id: UUID (Primary Key)                                                    │
│ • order_id: UUID (FK → ORDER)                                               │
│ • product_id: UUID (FK → PRODUCT)                                           │
│ • product_variant_id: UUID (FK → PRODUCT_VARIANT) [if applicable]          │
│ • sku: VARCHAR(100)                                                         │
│ • name: VARCHAR(500)                                                        │
│ • description: TEXT                                                         │
│ • quantity: INTEGER                                                         │
│ • unit_price: DECIMAL(15,2)                                                 │
│ • subtotal: DECIMAL(15,2)                                                   │
│ • tax_amount: DECIMAL(15,2)                                                 │
│ • discount_amount: DECIMAL(15,2)                                            │
│ • total_amount: DECIMAL(15,2)                                               │
│ • currency: VARCHAR(3)                                                      │
│ • hs_code: VARCHAR(20)                                                      │
│ • country_of_origin: VARCHAR(3)                                             │
│ • weight: DECIMAL(10,3)                                                     │
│ • weight_unit: VARCHAR(10)                                                  │
│ • image_url: VARCHAR(500)                                                   │
│ • specifications: JSONB                                                     │
│ • status: ENUM('PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'RETURNED') │
│ • tracking_number: VARCHAR(100)                                             │
│ • created_at: TIMESTAMP                                                     │
│ • updated_at: TIMESTAMP                                                     │
└─────────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                                   RFQ                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ • id: UUID (Primary Key)                                                    │
│ • rfq_number: VARCHAR(50) [Unique, Auto-generated]                          │
│ • organization_id: UUID (FK → ORGANIZATION) [Buyer]                         │
│ • created_by: UUID (FK → USER)                                              │
│ • title: VARCHAR(500)                                                       │
│ • description: TEXT                                                         │
│ • category_id: UUID (FK → CATEGORY)                                         │
│ • specifications: JSONB                                                     │
│ • attachments: VARCHAR[]                                                    │
│ • quantity_required: INTEGER                                                │
│ • unit_of_measurement: VARCHAR(20)                                          │
│ • target_price: DECIMAL(15,2)                                               │
│ • budget_range_min: DECIMAL(15,2)                                           │
│ • budget_range_max: DECIMAL(15,2)                                           │
│ • currency: VARCHAR(3)                                                      │
│ • delivery_deadline: DATE                                                   │
│ • delivery_location: JSONB                                                  │
│ • incoterms_preference: VARCHAR(10)                                         │
│ • payment_terms_preference: JSONB                                           │
│ • certifications_required: VARCHAR[]                                        │
│ • quality_requirements: TEXT                                                │
│ • warranty_requirements: TEXT                                               │
│ • visibility: ENUM('PUBLIC', 'PRIVATE', 'INVITATION_ONLY')                 │
│ • invited_vendors: UUID[] [Array of vendor IDs]                             │
│ • response_deadline: TIMESTAMP                                              │
│ • status: ENUM('DRAFT', 'PUBLISHED', 'CLOSED', 'AWARDED', 'CANCELLED')     │
│ • responses_received: INTEGER                                               │
│ • awarded_vendor_id: UUID (FK → VENDOR)                                     │
│ • awarded_quotation_id: UUID (FK → QUOTATION)                               │
│ • created_at: TIMESTAMP                                                     │
│ • updated_at: TIMESTAMP                                                     │
│ • published_at: TIMESTAMP                                                   │
│ • closed_at: TIMESTAMP                                                      │
│ • awarded_at: TIMESTAMP                                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 1:N
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              QUOTATION                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ • id: UUID (Primary Key)                                                    │
│ • rfq_id: UUID (FK → RFQ)                                                   │
│ • vendor_id: UUID (FK → VENDOR)                                             │
│ • quotation_number: VARCHAR(50) [Unique]                                    │
│ • unit_price: DECIMAL(15,2)                                                 │
│ • total_price: DECIMAL(15,2)                                                │
│ • currency: VARCHAR(3)                                                      │
│ • volume_discounts: JSONB                                                   │
│ • shipping_cost: DECIMAL(15,2)                                              │
│ • tax_amount: DECIMAL(15,2)                                                 │
│ • total_landed_cost: DECIMAL(15,2)                                          │
│ • lead_time_days: INTEGER                                                   │
│ • production_capacity: INTEGER                                              │
│ • delivery_terms: TEXT                                                      │
│ • incoterms: VARCHAR(10)                                                    │
│ • payment_terms: JSONB                                                      │
│ • warranty: JSONB                                                           │
│ • certifications: VARCHAR[]                                                 │
│ • product_specifications: JSONB                                             │
│ • sample_available: BOOLEAN                                                 │
│ • sample_cost: DECIMAL(15,2)                                                │
│ • notes: TEXT                                                               │
│ • attachments: VARCHAR[]                                                    │
│ • validity_period_days: INTEGER                                             │
│ • valid_until: TIMESTAMP                                                    │
│ • status: ENUM('SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED', 'AWARDED',      │
│         'REJECTED', 'WITHDRAWN')                                            │
│ • buyer_rating: DECIMAL(3,2)                                                │
│ • buyer_feedback: TEXT                                                      │
│ • created_at: TIMESTAMP                                                     │
│ • updated_at: TIMESTAMP                                                     │
│ • awarded_at: TIMESTAMP                                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Supporting Entities

```
CATEGORY & TAXONOMY
═══════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────────┐
│                               CATEGORY                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ • id: UUID (Primary Key)                                                    │
│ • parent_id: UUID (FK → CATEGORY) [Self-referencing]                        │
│ • name: VARCHAR(255)                                                        │
│ • slug: VARCHAR(255) [Unique]                                               │
│ • description: TEXT                                                         │
│ • icon: VARCHAR(500)                                                        │
│ • image: VARCHAR(500)                                                       │
│ • level: INTEGER [0=root, 1=category, 2=subcategory]                       │
│ • path: VARCHAR(500) [Materialized path: /electronics/computers/laptops]   │
│ • product_count: INTEGER                                                    │
│ • display_order: INTEGER                                                    │
│ • is_featured: BOOLEAN                                                      │
│ • seo_title: VARCHAR(500)                                                   │
│ • seo_description: TEXT                                                     │
│ • metadata: JSONB                                                           │
│ • status: ENUM('ACTIVE', 'INACTIVE')                                        │
│ • created_at: TIMESTAMP                                                     │
│ • updated_at: TIMESTAMP                                                     │
└─────────────────────────────────────────────────────────────────────────────┘


PAYMENT & FINANCIAL
═══════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────────┐
│                              PAYMENT                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│ • id: UUID (Primary Key)                                                    │
│ • order_id: UUID (FK → ORDER)                                               │
│ • organization_id: UUID (FK → ORGANIZATION)                                 │
│ • payment_intent_id: VARCHAR(255) [Stripe/PayPal ID]                        │
│ • amount: DECIMAL(15,2)                                                     │
│ • currency: VARCHAR(3)                                                      │
│ • exchange_rate: DECIMAL(15,6)                                              │
│ • converted_amount: DECIMAL(15,2)                                           │
│ • converted_currency: VARCHAR(3)                                            │
│ • payment_method: ENUM('CREDIT_CARD', 'WIRE_TRANSFER', 'LC', 'PAYPAL',     │
│         'STRIPE', 'LOCAL_GATEWAY', 'CRYPTO')                                │
│ • payment_provider: VARCHAR(50)                                             │
│ • status: ENUM('PENDING', 'AUTHORIZED', 'CAPTURED', 'REFUNDED', 'FAILED')  │
│ • payment_date: TIMESTAMP                                                   │
│ • authorization_code: VARCHAR(50)                                           │
│ • transaction_id: VARCHAR(255)                                              │
│ • card_last_four: VARCHAR(4)                                                │
│ • card_brand: VARCHAR(20)                                                   │
│ • billing_details: JSONB                                                    │
│ • metadata: JSONB                                                           │
│ • fee_amount: DECIMAL(15,2)                                                 │
│ • net_amount: DECIMAL(15,2)                                                 │
│ • refund_amount: DECIMAL(15,2)                                              │
│ • refund_reason: TEXT                                                       │
│ • refunded_at: TIMESTAMP                                                    │
│ • created_at: TIMESTAMP                                                     │
│ • updated_at: TIMESTAMP                                                     │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                            PAYOUT (Vendor)                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│ • id: UUID (Primary Key)                                                    │
│ • vendor_id: UUID (FK → VENDOR)                                             │
│ • payout_period_start: DATE                                                 │
│ • payout_period_end: DATE                                                   │
│ • gross_revenue: DECIMAL(15,2)                                              │
│ • commission_amount: DECIMAL(15,2)                                          │
│ • transaction_fees: DECIMAL(15,2)                                           │
│ • refund_deductions: DECIMAL(15,2)                                          │
│ • adjustment_amount: DECIMAL(15,2)                                          │
│ • tax_withholding: DECIMAL(15,2)                                            │
│ • net_payout: DECIMAL(15,2)                                                 │
│ • currency: VARCHAR(3)                                                      │
│ • payout_method: ENUM('BANK_TRANSFER', 'PAYPAL', 'STRIPE', 'WIRE')         │
│ • bank_account_id: UUID (FK → BANK_ACCOUNT)                                 │
│ • status: ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED')│
│ • transaction_id: VARCHAR(255)                                              │
│ • order_ids: UUID[] [Array of included order IDs]                           │
│ • notes: TEXT                                                               │
│ • processed_at: TIMESTAMP                                                   │
│ • created_at: TIMESTAMP                                                     │
│ • updated_at: TIMESTAMP                                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Regional Data Residency

### 2.1 Data Residency Strategy

```
REGIONAL DATA DISTRIBUTION
═══════════════════════════════════════════════════════════════════════════════

GLOBAL DATA (Replicated Across All Regions)
┌─────────────────────────────────────────────────────────────────────────────┐
│ • Product Catalog (read-optimized)                                          │
│ • Category Taxonomy                                                         │
│ • Vendor Profiles (public data)                                             │
│ • Public Reviews & Ratings                                                  │
│ • Static Content (CMS)                                                      │
│ • Configuration Data                                                        │
└─────────────────────────────────────────────────────────────────────────────┘

REGIONAL DATA (Stored in Specific Region)
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  AFRICA REGION (Lagos, Nigeria)                                            │
│  ─────────────────────────────────────────────────────────────────────     │
│  • User Data (Nigerian & African users)                                    │
│  • Organization Data (African companies)                                   │
│  • Orders & Transactions (African buyers/sellers)                          │
│  • Payment Data (African transactions)                                     │
│  • Personal Identifiable Information (PII)                                 │
│  • Compliance Documents (local regulations)                                │
│                                                                             │
│  UNITED STATES (East US, West US)                                          │
│  ─────────────────────────────────────────────────────────────────────     │
│  • User Data (US users)                                                    │
│  • Organization Data (US companies)                                        │
│  • Orders & Transactions (US buyers/sellers)                               │
│  • Payment Data (US transactions)                                          │
│  • PII (CCPA compliance)                                                   │
│  • Export Control Data (ITAR, EAR)                                         │
│                                                                             │
│  EUROPE (Dublin, Ireland)                                                  │
│  ─────────────────────────────────────────────────────────────────────     │
│  • User Data (EU users)                                                    │
│  • Organization Data (EU companies)                                        │
│  • Orders & Transactions (EU buyers/sellers)                               │
│  • Payment Data (EU transactions)                                          │
│  • PII (GDPR compliance - data minimization)                               │
│  • EORI & VAT Data                                                         │
│                                                                             │
│  ASIA-PACIFIC (Singapore, Tokyo)                                           │
│  ─────────────────────────────────────────────────────────────────────     │
│  • User Data (APAC users)                                                  │
│  • Organization Data (APAC companies)                                      │
│  • Orders & Transactions (APAC buyers/sellers)                             │
│  • Payment Data (APAC transactions)                                        │
│  • PII (regional privacy laws)                                             │
│                                                                             │
│  LATIN AMERICA (Sao Paulo, Mexico City)                                    │
│  ─────────────────────────────────────────────────────────────────────     │
│  • User Data (LATAM users)                                                 │
│  • Organization Data (LATAM companies)                                     │
│  • Orders & Transactions (LATAM buyers/sellers)                            │
│  • Payment Data (LATAM transactions)                                       │
│  • PII (local regulations)                                                 │
│                                                                             │
│  MIDDLE EAST (Dubai, UAE)                                                  │
│  ─────────────────────────────────────────────────────────────────────     │
│  • User Data (ME users)                                                    │
│  • Organization Data (ME companies)                                        │
│  • Orders & Transactions (ME buyers/sellers)                               │
│  • Payment Data (ME transactions)                                          │
│  • PII (local regulations)                                                 │
│  • Halal Certification Data                                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

DATA SOVEREIGNTY RULES
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  1. PII Data: MUST remain in user's home region                            │
│  2. Payment Data: MUST remain in transaction region (PCI DSS)              │
│  3. Audit Logs: Stored in both home region + central archive               │
│  4. Cross-border Orders: Metadata replicated, PII stays regional           │
│  5. Data Requests: Served from nearest region with appropriate data        │
│  6. GDPR Right to Erasure: Executed in home region + all replicas          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Cross-Border Data Handling

```sql
-- Example: Cross-border order between Africa (buyer) and US (seller)

-- ORDER TABLE (Metadata replicated in both regions)
-- US Region
INSERT INTO orders (
  id, order_number, organization_id, vendor_id,
  -- Anonymized buyer info (no PII)
  buyer_region, buyer_country,
  -- Order details
  total_amount, currency, status
) VALUES (...);

-- Africa Region (Full buyer details with PII)
INSERT INTO orders (
  id, order_number, organization_id, vendor_id,
  -- Full buyer info
  buyer_id, buyer_name, buyer_email, buyer_phone,
  billing_address, shipping_address,
  -- Order details
  total_amount, currency, status
) VALUES (...);

-- Data Access Rules:
-- - US Vendor: Can see anonymized buyer info (no PII)
-- - African Buyer: Full access to all order data
-- - Platform Admin: Region-specific access based on role
```

---

## 3. Multi-Currency Pricing Schema

### 3.1 Currency Support Architecture

```
MULTI-CURRENCY DATA MODEL
═══════════════════════════════════════════════════════════════════════════════

SUPPORTED CURRENCIES (30+)
┌─────────────────────────────────────────────────────────────────────────────┐
│  Major Currencies:                                                          │
│  • USD - United States Dollar (base currency)                              │
│  • EUR - Euro                                                               │
│  • GBP - British Pound Sterling                                            │
│  • JPY - Japanese Yen                                                       │
│  • CNY - Chinese Yuan                                                       │
│  • CAD - Canadian Dollar                                                    │
│  • AUD - Australian Dollar                                                  │
│  • CHF - Swiss Franc                                                        │
│                                                                             │
│  African Currencies:                                                        │
│  • NGN - Nigerian Naira                                                     │
│  • ZAR - South African Rand                                                 │
│  • KES - Kenyan Shilling                                                    │
│  • GHS - Ghanaian Cedi                                                      │
│  • EGP - Egyptian Pound                                                     │
│  • MAD - Moroccan Dirham                                                    │
│  • TZS - Tanzanian Shilling                                                 │
│  • UGX - Ugandan Shilling                                                   │
│                                                                             │
│  Latin American Currencies:                                                 │
│  • BRL - Brazilian Real                                                     │
│  • MXN - Mexican Peso                                                       │
│  • ARS - Argentine Peso                                                     │
│  • CLP - Chilean Peso                                                       │
│  • COP - Colombian Peso                                                     │
│                                                                             │
│  Middle East Currencies:                                                    │
│  • AED - UAE Dirham                                                         │
│  • SAR - Saudi Riyal                                                        │
│  • QAR - Qatari Riyal                                                       │
│  • KWD - Kuwaiti Dinar                                                      │
│                                                                             │
│  APAC Currencies:                                                           │
│  • SGD - Singapore Dollar                                                   │
│  • HKD - Hong Kong Dollar                                                   │
│  • INR - Indian Rupee                                                       │
│  • MYR - Malaysian Ringgit                                                  │
│  • THB - Thai Baht                                                          │
│  • VND - Vietnamese Dong                                                    │
└─────────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                          CURRENCY_EXCHANGE_RATE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ • id: UUID (Primary Key)                                                    │
│ • from_currency: VARCHAR(3) [ISO 4217]                                      │
│ • to_currency: VARCHAR(3) [ISO 4217]                                        │
│ • rate: DECIMAL(15,6)                                                       │
│ • inverse_rate: DECIMAL(15,6)                                               │
│ • source: VARCHAR(50) [Provider: ECB, OANDA, XE, etc.]                     │
│ • effective_from: TIMESTAMP                                                 │
│ • effective_until: TIMESTAMP                                                │
│ • is_active: BOOLEAN                                                        │
│ • created_at: TIMESTAMP                                                     │
│ • updated_at: TIMESTAMP                                                     │
└─────────────────────────────────────────────────────────────────────────────┘
-- Indexes:
-- CREATE INDEX idx_exchange_rate_currencies ON currency_exchange_rate(from_currency, to_currency);
-- CREATE INDEX idx_exchange_rate_effective ON currency_exchange_rate(effective_from, effective_until);


┌─────────────────────────────────────────────────────────────────────────────┐
│                        PRODUCT_REGIONAL_PRICING                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ • id: UUID (Primary Key)                                                    │
│ • product_id: UUID (FK → PRODUCT)                                           │
│ • region: ENUM('AFRICA', 'US', 'EUROPE', 'APAC', 'LATAM', 'ME')           │
│ • country_code: VARCHAR(3) [ISO 3166-1 alpha-3] [Optional: country-level]  │
│ • currency: VARCHAR(3) [ISO 4217]                                           │
│ • base_price: DECIMAL(15,2)                                                 │
│ • sale_price: DECIMAL(15,2)                                                 │
│ • vat_rate: DECIMAL(5,2) [Percentage]                                      │
│ • vat_included: BOOLEAN                                                     │
│ • import_duty_rate: DECIMAL(5,2)                                           │
│ • price_tier: ENUM('STANDARD', 'PREMIUM', 'ECONOMY')                       │
│ • min_quantity: INTEGER                                                     │
│ • max_quantity: INTEGER                                                     │
│ • valid_from: TIMESTAMP                                                     │
│ • valid_until: TIMESTAMP                                                    │
│ • is_active: BOOLEAN                                                        │
│ • created_at: TIMESTAMP                                                     │
│ • updated_at: TIMESTAMP                                                     │
└─────────────────────────────────────────────────────────────────────────────┘


PRICING CALCULATION EXAMPLE
═══════════════════════════════════════════════════════════════════════════════

Product: Industrial Machinery
Base Price: $10,000 USD (US Seller)
Buyer: Nigeria (Africa Region)

Step 1: Currency Conversion
  USD to NGN Exchange Rate: 1,500 (hypothetical)
  Base Price in NGN: $10,000 × 1,500 = ₦15,000,000

Step 2: Import Duty Calculation
  HS Code: 8479.89.99
  Nigeria Import Duty: 10% CET + 5% Levy = 15%
  Duty Amount: ₦15,000,000 × 0.15 = ₦2,250,000

Step 3: VAT Calculation
  Nigeria VAT: 7.5%
  VAT Base: ₦15,000,000 + ₦2,250,000 = ₦17,250,000
  VAT Amount: ₦17,250,000 × 0.075 = ₦1,293,750

Step 4: Shipping Cost
  Shipping (CIF): $3,000 USD × 1,500 = ₦4,500,000

Step 5: Total Landed Cost
  Product: ₦15,000,000
  Duty: ₦2,250,000
  VAT: ₦1,293,750
  Shipping: ₦4,500,000
  ───────────────────────
  TOTAL: ₦23,043,750 (~$15,362 USD)

-- Stored in database:
INSERT INTO order_pricing (
  order_id,
  base_currency, base_amount,
  display_currency, display_amount,
  exchange_rate,
  duty_amount, vat_amount, shipping_amount,
  total_amount
) VALUES (
  '...',
  'USD', 10000.00,
  'NGN', 15000000.00,
  1500.000000,
  2250000.00, 1293750.00, 4500000.00,
  23043750.00
);
```

### 3.2 Dynamic Pricing Rules

```sql
-- Table for AI-powered dynamic pricing
CREATE TABLE dynamic_pricing_rules (
  id UUID PRIMARY KEY,
  product_id UUID REFERENCES products(id),
  vendor_id UUID REFERENCES vendors(id),
  region VARCHAR(20),

  -- Pricing Strategy
  strategy ENUM('COMPETITIVE', 'PREMIUM', 'PENETRATION', 'DYNAMIC', 'VALUE_BASED'),

  -- Price Bounds
  min_price DECIMAL(15,2),
  max_price DECIMAL(15,2),
  target_margin_percent DECIMAL(5,2),

  -- Dynamic Adjustments
  demand_multiplier DECIMAL(5,3) DEFAULT 1.000, -- AI-calculated
  competition_multiplier DECIMAL(5,3) DEFAULT 1.000,
  seasonality_multiplier DECIMAL(5,3) DEFAULT 1.000,
  inventory_multiplier DECIMAL(5,3) DEFAULT 1.000,

  -- Time-based Rules
  time_of_day_rules JSONB, -- Peak/off-peak pricing
  day_of_week_rules JSONB,
  seasonal_rules JSONB,

  -- Volume Discounts
  volume_tiers JSONB, -- [{qty_min: 10, qty_max: 50, discount: 5%}, ...]

  -- A/B Testing
  ab_test_variant VARCHAR(10), -- 'A', 'B', 'C', etc.
  test_percentage DECIMAL(5,2), -- % of traffic to show this price

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Example: Volume-based pricing
{
  "volume_tiers": [
    {"qty_min": 1, "qty_max": 9, "price": 100.00, "discount_percent": 0},
    {"qty_min": 10, "qty_max": 49, "price": 95.00, "discount_percent": 5},
    {"qty_min": 50, "qty_max": 99, "price": 90.00, "discount_percent": 10},
    {"qty_min": 100, "qty_max": null, "price": 85.00, "discount_percent": 15}
  ]
}
```

---

## 4. Multi-Language Content Model

### 4.1 Internationalization (i18n) Schema

```
MULTI-LANGUAGE CONTENT ARCHITECTURE
═══════════════════════════════════════════════════════════════════════════════

SUPPORTED LANGUAGES (30+)
┌─────────────────────────────────────────────────────────────────────────────┐
│  Global Languages:                                                          │
│  • en - English (default)                                                   │
│  • es - Spanish                                                             │
│  • fr - French                                                              │
│  • de - German                                                              │
│  • it - Italian                                                             │
│  • pt - Portuguese                                                          │
│  • zh - Chinese (Simplified & Traditional)                                  │
│  • ja - Japanese                                                            │
│  • ko - Korean                                                              │
│  • ar - Arabic                                                              │
│  • ru - Russian                                                             │
│  • hi - Hindi                                                               │
│                                                                             │
│  African Languages:                                                         │
│  • sw - Swahili                                                             │
│  • yo - Yoruba                                                              │
│  • ig - Igbo                                                                │
│  • ha - Hausa                                                               │
│  • am - Amharic                                                             │
│  • zu - Zulu                                                                │
│  • af - Afrikaans                                                           │
│                                                                             │
│  Regional Languages:                                                        │
│  • vi - Vietnamese                                                          │
│  • th - Thai                                                                │
│  • id - Indonesian                                                          │
│  • ms - Malay                                                               │
│  • tl - Tagalog                                                             │
│  • ur - Urdu                                                                │
│  • he - Hebrew                                                              │
└─────────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                       PRODUCT_TRANSLATION                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ • id: UUID (Primary Key)                                                    │
│ • product_id: UUID (FK → PRODUCT)                                           │
│ • language_code: VARCHAR(10) [ISO 639-1]                                    │
│ • name: VARCHAR(500)                                                        │
│ • slug: VARCHAR(500)                                                        │
│ • short_description: TEXT                                                   │
│ • long_description: TEXT                                                    │
│ • specifications: JSONB [Translated key-value pairs]                        │
│ • features: TEXT[]                                                          │
│ • seo_title: VARCHAR(500)                                                   │
│ • seo_description: TEXT                                                     │
│ • seo_keywords: VARCHAR[]                                                   │
│ • translation_status: ENUM('DRAFT', 'MACHINE', 'PROFESSIONAL', 'VERIFIED') │
│ • translated_by: ENUM('HUMAN', 'AI', 'HYBRID')                             │
│ • translator_id: UUID (FK → USER) [if human]                               │
│ • quality_score: DECIMAL(3,2) [AI confidence score]                         │
│ • reviewed_by: UUID (FK → USER)                                             │
│ • reviewed_at: TIMESTAMP                                                    │
│ • created_at: TIMESTAMP                                                     │
│ • updated_at: TIMESTAMP                                                     │
└─────────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                      CATEGORY_TRANSLATION                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ • id: UUID (Primary Key)                                                    │
│ • category_id: UUID (FK → CATEGORY)                                         │
│ • language_code: VARCHAR(10)                                                │
│ • name: VARCHAR(255)                                                        │
│ • slug: VARCHAR(255)                                                        │
│ • description: TEXT                                                         │
│ • seo_title: VARCHAR(500)                                                   │
│ • seo_description: TEXT                                                     │
│ • created_at: TIMESTAMP                                                     │
│ • updated_at: TIMESTAMP                                                     │
└─────────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                    VENDOR_TRANSLATION                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ • id: UUID (Primary Key)                                                    │
│ • vendor_id: UUID (FK → VENDOR)                                             │
│ • language_code: VARCHAR(10)                                                │
│ • display_name: VARCHAR(255)                                                │
│ • description: TEXT                                                         │
│ • tagline: VARCHAR(500)                                                     │
│ • about_us: TEXT                                                            │
│ • return_policy: TEXT                                                       │
│ • shipping_policy: TEXT                                                     │
│ • created_at: TIMESTAMP                                                     │
│ • updated_at: TIMESTAMP                                                     │
└─────────────────────────────────────────────────────────────────────────────┘


AI-POWERED TRANSLATION WORKFLOW
═══════════════════════════════════════════════════════════════════════════════

1. Content Creation (Source Language: English)
   ├─ Vendor creates product in English
   └─ Content stored in PRODUCT table

2. Auto-Translation Trigger
   ├─ AI Translation Engine (GPT-4, Google Translate API)
   ├─ Translate to 29 target languages
   ├─ Quality Scoring (AI confidence: 0.0-1.0)
   └─ Store in PRODUCT_TRANSLATION table

3. Human Review (Optional - for key markets)
   ├─ Professional translator review
   ├─ Cultural adaptation
   ├─ Quality assurance
   └─ Mark as 'PROFESSIONAL'

4. Continuous Improvement
   ├─ User feedback on translations
   ├─ A/B testing different translations
   ├─ ML model retraining
   └─ Translation memory updates

5. Serving Content
   ├─ Detect user language preference
   │  ├─ Browser language
   │  ├─ User profile setting
   │  └─ Geolocation
   ├─ Fetch appropriate translation
   ├─ Fallback to English if unavailable
   └─ Cache for performance
```

### 4.2 Localization (L10n) Schema

```sql
-- Table for locale-specific content (beyond translation)
CREATE TABLE localized_content (
  id UUID PRIMARY KEY,
  entity_type VARCHAR(50), -- 'product', 'category', 'page', etc.
  entity_id UUID,
  locale VARCHAR(10), -- 'en-US', 'fr-FR', 'ar-EG', etc.

  -- Date/Time Formats
  date_format VARCHAR(50), -- 'MM/DD/YYYY' (US) vs 'DD/MM/YYYY' (EU)
  time_format VARCHAR(10), -- '12h' vs '24h'
  first_day_of_week INTEGER, -- 0=Sunday, 1=Monday

  -- Number Formats
  decimal_separator CHAR(1), -- '.' (US) vs ',' (EU)
  thousands_separator CHAR(1), -- ',' (US) vs '.' (EU)
  currency_position VARCHAR(10), -- 'before' ($100) vs 'after' (100€)

  -- Measurements
  unit_system VARCHAR(10), -- 'METRIC' vs 'IMPERIAL'
  weight_unit VARCHAR(10), -- 'kg' vs 'lbs'
  length_unit VARCHAR(10), -- 'm' vs 'ft'
  temperature_unit VARCHAR(5), -- 'C' vs 'F'

  -- Address Format
  address_format JSONB, -- Country-specific address structure
  postal_code_format VARCHAR(50), -- ZIP vs Postcode

  -- Payment Methods
  preferred_payment_methods VARCHAR[], -- Region-specific

  -- Legal/Compliance
  terms_url VARCHAR(500),
  privacy_url VARCHAR(500),
  cookie_policy_url VARCHAR(500),

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Example: Address format for different regions
{
  "US": {
    "format": "{name}\n{company}\n{address1}\n{address2}\n{city}, {state} {zip}\n{country}",
    "required_fields": ["name", "address1", "city", "state", "zip"],
    "postal_code_regex": "^[0-9]{5}(-[0-9]{4})?$"
  },
  "NG": {
    "format": "{name}\n{company}\n{address1}\n{address2}\n{city}, {state}\n{country}",
    "required_fields": ["name", "address1", "city", "state"],
    "postal_code_regex": "^[0-9]{6}$"
  },
  "UK": {
    "format": "{name}\n{company}\n{address1}\n{address2}\n{city}\n{postcode}\n{country}",
    "required_fields": ["name", "address1", "city", "postcode"],
    "postal_code_regex": "^[A-Z]{1,2}[0-9]{1,2} [0-9][A-Z]{2}$"
  }
}
```

---

## 5. Compliance & Audit Trail Schema

### 5.1 Audit Logging Architecture

```
COMPREHENSIVE AUDIT TRAIL
═══════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────────┐
│                             AUDIT_LOG                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ • id: UUID (Primary Key)                                                    │
│ • timestamp: TIMESTAMP (Indexed)                                            │
│ • event_type: VARCHAR(100) [e.g., 'user.login', 'order.created']           │
│ • event_category: ENUM('AUTH', 'ORDER', 'PAYMENT', 'USER', 'ADMIN',        │
│     'COMPLIANCE', 'SECURITY', 'DATA_ACCESS', 'SYSTEM')                      │
│ • severity: ENUM('INFO', 'WARNING', 'ERROR', 'CRITICAL')                   │
│ • actor_type: ENUM('USER', 'SYSTEM', 'API', 'ADMIN', 'BOT')                │
│ • actor_id: UUID [User or system ID]                                        │
│ • actor_email: VARCHAR(255)                                                 │
│ • actor_ip: INET                                                            │
│ • actor_user_agent: TEXT                                                    │
│ • actor_location: JSONB [Geo-location]                                      │
│ • organization_id: UUID (FK → ORGANIZATION)                                 │
│ • resource_type: VARCHAR(100) [e.g., 'Order', 'Product', 'User']           │
│ • resource_id: UUID                                                         │
│ • action: VARCHAR(50) [CREATE, READ, UPDATE, DELETE, APPROVE, etc.]        │
│ • changes: JSONB [Before/after values]                                      │
│ • metadata: JSONB [Additional context]                                      │
│ • request_id: UUID [Trace distributed requests]                             │
│ • session_id: UUID                                                          │
│ • compliance_flags: VARCHAR[] [GDPR, PCI, SOX, etc.]                        │
│ • retention_policy: VARCHAR(20) [7_YEARS, PERMANENT, 90_DAYS]              │
│ • encrypted: BOOLEAN                                                        │
│ • created_at: TIMESTAMP                                                     │
└─────────────────────────────────────────────────────────────────────────────┘
-- Partitioning: BY RANGE (timestamp) - Monthly partitions
-- Retention: 7 years minimum (compliance), PERMANENT for financial records


EXAMPLE AUDIT LOG ENTRIES
═══════════════════════════════════════════════════════════════════════════════

-- User Login
{
  "event_type": "user.login.success",
  "event_category": "AUTH",
  "severity": "INFO",
  "actor_type": "USER",
  "actor_id": "user-123",
  "actor_email": "buyer@company.com",
  "actor_ip": "41.203.X.X",
  "actor_location": {"country": "NG", "city": "Lagos"},
  "action": "LOGIN",
  "metadata": {
    "mfa_used": true,
    "device_type": "desktop",
    "browser": "Chrome 120"
  },
  "timestamp": "2025-12-06T10:30:00Z"
}

-- Order Creation
{
  "event_type": "order.created",
  "event_category": "ORDER",
  "severity": "INFO",
  "actor_type": "USER",
  "actor_id": "user-123",
  "organization_id": "org-456",
  "resource_type": "Order",
  "resource_id": "order-789",
  "action": "CREATE",
  "changes": {
    "total_amount": 50000.00,
    "currency": "USD",
    "vendor_id": "vendor-321",
    "items_count": 3
  },
  "compliance_flags": ["PCI", "EXPORT_CONTROL"],
  "retention_policy": "7_YEARS",
  "timestamp": "2025-12-06T10:35:00Z"
}

-- Payment Processing
{
  "event_type": "payment.processed",
  "event_category": "PAYMENT",
  "severity": "INFO",
  "actor_type": "SYSTEM",
  "resource_type": "Payment",
  "resource_id": "payment-999",
  "action": "CAPTURE",
  "changes": {
    "status": {"from": "AUTHORIZED", "to": "CAPTURED"},
    "amount": 50000.00,
    "currency": "USD",
    "payment_method": "CREDIT_CARD",
    "last_four": "4242"
  },
  "compliance_flags": ["PCI", "FINANCIAL"],
  "retention_policy": "PERMANENT",
  "encrypted": true,
  "timestamp": "2025-12-06T10:36:00Z"
}

-- Data Access (GDPR)
{
  "event_type": "user.data.accessed",
  "event_category": "DATA_ACCESS",
  "severity": "INFO",
  "actor_type": "ADMIN",
  "actor_id": "admin-111",
  "resource_type": "User",
  "resource_id": "user-123",
  "action": "READ",
  "metadata": {
    "reason": "Customer support request #CS-12345",
    "fields_accessed": ["email", "phone", "address"],
    "legal_basis": "Legitimate interest"
  },
  "compliance_flags": ["GDPR"],
  "retention_policy": "7_YEARS",
  "timestamp": "2025-12-06T11:00:00Z"
}

-- Suspicious Activity
{
  "event_type": "security.fraud_detected",
  "event_category": "SECURITY",
  "severity": "CRITICAL",
  "actor_type": "SYSTEM",
  "resource_type": "Order",
  "resource_id": "order-888",
  "action": "FLAG",
  "metadata": {
    "fraud_score": 0.92,
    "fraud_types": ["CARD_TESTING", "HIGH_VELOCITY"],
    "recommended_action": "BLOCK",
    "ai_model_version": "v2.3"
  },
  "compliance_flags": ["SECURITY", "FRAUD"],
  "retention_policy": "PERMANENT",
  "timestamp": "2025-12-06T11:15:00Z"
}
```

### 5.2 Compliance Tracking Schema

```sql
-- Table for tracking compliance certifications and audits
CREATE TABLE compliance_records (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),

  -- Compliance Type
  compliance_type ENUM(
    'PCI_DSS', 'GDPR', 'CCPA', 'SOC2', 'ISO27001',
    'EXPORT_CONTROL', 'SANCTIONS_SCREENING', 'KYC', 'KYB',
    'TRADE_COMPLIANCE', 'TAX_COMPLIANCE', 'CUSTOMS_COMPLIANCE'
  ),

  -- Status
  status ENUM('COMPLIANT', 'NON_COMPLIANT', 'PENDING', 'EXPIRED'),

  -- Certification Details
  certificate_number VARCHAR(100),
  certificate_url VARCHAR(500),
  issuing_authority VARCHAR(255),
  issued_date DATE,
  expiry_date DATE,

  -- Audit Trail
  last_audit_date DATE,
  next_audit_date DATE,
  auditor VARCHAR(255),
  audit_report_url VARCHAR(500),

  -- Findings
  findings JSONB, -- {critical: 0, high: 1, medium: 3, low: 5}
  remediation_plan JSONB,
  remediation_deadline DATE,

  -- Automated Checks
  automated_check_enabled BOOLEAN DEFAULT true,
  last_check_timestamp TIMESTAMP,
  check_frequency VARCHAR(20), -- 'DAILY', 'WEEKLY', 'MONTHLY'

  -- Notifications
  notify_before_expiry_days INTEGER DEFAULT 30,
  notification_recipients VARCHAR[],

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);


-- Table for data protection and privacy compliance
CREATE TABLE data_protection_records (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  organization_id UUID REFERENCES organizations(id),

  -- Consent Management (GDPR/CCPA)
  marketing_consent BOOLEAN DEFAULT false,
  marketing_consent_date TIMESTAMP,
  analytics_consent BOOLEAN DEFAULT false,
  analytics_consent_date TIMESTAMP,
  third_party_sharing_consent BOOLEAN DEFAULT false,
  third_party_consent_date TIMESTAMP,

  -- Data Subject Rights
  right_to_access_requested BOOLEAN DEFAULT false,
  right_to_access_fulfilled_date TIMESTAMP,
  right_to_erasure_requested BOOLEAN DEFAULT false,
  right_to_erasure_fulfilled_date TIMESTAMP,
  right_to_portability_requested BOOLEAN DEFAULT false,
  right_to_portability_fulfilled_date TIMESTAMP,
  right_to_rectification_requested BOOLEAN DEFAULT false,
  right_to_rectification_fulfilled_date TIMESTAMP,

  -- Data Retention
  retention_policy VARCHAR(50),
  retention_expiry_date DATE,
  deletion_scheduled_date DATE,

  -- Legal Basis for Processing (GDPR)
  legal_basis ENUM('CONSENT', 'CONTRACT', 'LEGAL_OBLIGATION',
                    'VITAL_INTERESTS', 'PUBLIC_TASK', 'LEGITIMATE_INTERESTS'),
  legal_basis_details TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);


-- Table for export control compliance
CREATE TABLE export_control_checks (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES orders(id),
  product_id UUID REFERENCES products(id),

  -- Classification
  hs_code VARCHAR(20),
  eccn VARCHAR(50), -- Export Control Classification Number
  schedule_b VARCHAR(20),

  -- Destination
  destination_country VARCHAR(3),
  end_user_type VARCHAR(50),
  end_use VARCHAR(255),

  -- Screening Results
  denied_parties_screening ENUM('PASS', 'FAIL', 'REVIEW'),
  denied_parties_hits JSONB,
  sanctions_screening ENUM('PASS', 'FAIL', 'REVIEW'),
  sanctions_hits JSONB,

  -- License Requirements
  license_required BOOLEAN,
  license_type VARCHAR(50), -- 'ITAR', 'EAR', etc.
  license_number VARCHAR(100),
  license_expiry DATE,

  -- Approval
  approval_status ENUM('APPROVED', 'DENIED', 'PENDING_REVIEW'),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  denial_reason TEXT,

  -- Audit
  checked_at TIMESTAMP,
  checked_by VARCHAR(50), -- 'SYSTEM', 'MANUAL'
  compliance_officer_id UUID REFERENCES users(id),

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 6. Data Partitioning Strategy

```
DATABASE PARTITIONING APPROACH
═══════════════════════════════════════════════════════════════════════════════

PARTITIONING STRATEGIES
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  1. RANGE PARTITIONING (Time-based tables)                                 │
│     ───────────────────────────────────────────────────────────────────    │
│     Tables: orders, audit_logs, payments, events                           │
│     Partition Key: created_at (monthly partitions)                         │
│     Retention: Automatic archival/deletion of old partitions               │
│                                                                             │
│     Example:                                                                │
│     orders_2025_01, orders_2025_02, ..., orders_2025_12                    │
│                                                                             │
│  2. LIST PARTITIONING (Region-based tables)                                │
│     ───────────────────────────────────────────────────────────────────    │
│     Tables: users, organizations, orders                                   │
│     Partition Key: region (AFRICA, US, EUROPE, APAC, LATAM, ME)           │
│     Benefits: Data residency compliance, regional failover                 │
│                                                                             │
│     Example:                                                                │
│     users_africa, users_us, users_europe, ...                              │
│                                                                             │
│  3. HASH PARTITIONING (High-volume tables)                                 │
│     ───────────────────────────────────────────────────────────────────    │
│     Tables: product_views, search_queries, analytics_events                │
│     Partition Key: id (UUID hash)                                          │
│     Partitions: 16 or 32 partitions                                        │
│     Benefits: Even distribution, parallel query execution                  │
│                                                                             │
│  4. COMPOSITE PARTITIONING (Complex tables)                                │
│     ───────────────────────────────────────────────────────────────────    │
│     Tables: orders                                                         │
│     Strategy: RANGE (created_at) → LIST (region)                           │
│     Example: orders_2025_01_africa, orders_2025_01_us, ...                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

IMPLEMENTATION EXAMPLE
═══════════════════════════════════════════════════════════════════════════════

-- Orders table with composite partitioning
CREATE TABLE orders (
  -- [All columns as defined earlier]
  ...
) PARTITION BY RANGE (created_at);

-- Create monthly partitions for 2025
CREATE TABLE orders_2025_01 PARTITION OF orders
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01')
  PARTITION BY LIST (region);

-- Sub-partitions by region
CREATE TABLE orders_2025_01_africa PARTITION OF orders_2025_01
  FOR VALUES IN ('AFRICA');

CREATE TABLE orders_2025_01_us PARTITION OF orders_2025_01
  FOR VALUES IN ('US');

CREATE TABLE orders_2025_01_europe PARTITION OF orders_2025_01
  FOR VALUES IN ('EUROPE');

-- ... repeat for other regions and months


-- Automated partition management
CREATE OR REPLACE FUNCTION create_monthly_partitions()
RETURNS void AS $$
DECLARE
  start_date DATE;
  end_date DATE;
  partition_name TEXT;
BEGIN
  start_date := DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month');
  end_date := start_date + INTERVAL '1 month';
  partition_name := 'orders_' || TO_CHAR(start_date, 'YYYY_MM');

  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF orders
     FOR VALUES FROM (%L) TO (%L)
     PARTITION BY LIST (region)',
    partition_name, start_date, end_date
  );

  -- Create sub-partitions for each region
  -- [Implementation continues...]
END;
$$ LANGUAGE plpgsql;

-- Schedule to run monthly
SELECT cron.schedule('create-partitions', '0 0 1 * *', 'SELECT create_monthly_partitions()');
```

---

## 7. Data Synchronization

```
MULTI-REGION DATA SYNCHRONIZATION
═══════════════════════════════════════════════════════════════════════════════

SYNCHRONIZATION PATTERNS
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  1. MASTER-REPLICA (Read Scaling)                                          │
│     ─────────────────────────────────────────────────────────────────────  │
│     Primary (Master): US-East                                              │
│     Replicas: US-West, Europe, APAC, Africa, LATAM, ME                     │
│     Replication: Async streaming replication                               │
│     Lag: < 5 seconds                                                       │
│     Use Case: Product catalog, vendor profiles (read-heavy)                │
│                                                                             │
│  2. MULTI-MASTER (Active-Active)                                           │
│     ─────────────────────────────────────────────────────────────────────  │
│     All Regions: Can accept writes                                         │
│     Conflict Resolution: Last-write-wins with vector clocks                │
│     Use Case: Global product availability, inventory                       │
│     Technology: PostgreSQL BDR, CockroachDB                                │
│                                                                             │
│  3. EVENT-DRIVEN SYNC (Eventually Consistent)                              │
│     ─────────────────────────────────────────────────────────────────────  │
│     Change Data Capture (CDC): Debezium                                    │
│     Event Bus: Kafka, Redis Streams                                        │
│     Propagation: Events published to all regions                           │
│     Use Case: Analytics, search index updates                              │
│                                                                             │
│  4. API-BASED SYNC (Cross-Region Orders)                                   │
│     ─────────────────────────────────────────────────────────────────────  │
│     API Gateway: Handles cross-region requests                             │
│     Data Residency: PII stays in home region                               │
│     Metadata Sync: Order status, tracking info                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

DATA CONSISTENCY GUARANTEES
┌─────────────────────────────────────────────────────────────────────────────┐
│  Entity Type           │ Consistency Model  │ Max Lag  │ Technology       │
│  ─────────────────────│───────────────────│──────────│──────────────────│
│  Users (PII)          │ Regional Strong    │ N/A      │ Single Region    │
│  Product Catalog      │ Eventual           │ 5 sec    │ Async Replication│
│  Inventory            │ Strong             │ < 1 sec  │ Distributed Locks│
│  Orders               │ Regional Strong    │ N/A      │ Single Region    │
│  Payments             │ Strong (ACID)      │ N/A      │ 2PC              │
│  Search Index         │ Eventual           │ 30 sec   │ CDC → Elastic    │
│  Analytics            │ Eventual           │ 5 min    │ Batch ETL        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Data Security & Encryption

```
DATA SECURITY ARCHITECTURE
═══════════════════════════════════════════════════════════════════════════════

ENCRYPTION AT REST
┌─────────────────────────────────────────────────────────────────────────────┐
│  • Database: Transparent Data Encryption (TDE) - AES-256                    │
│  • Blob Storage: Azure Storage Service Encryption (SSE) - AES-256           │
│  • Key Management: Azure Key Vault (HSM-backed)                             │
│  • Key Rotation: Automatic every 90 days                                    │
│  • Backup Encryption: AES-256 for all backups                               │
└─────────────────────────────────────────────────────────────────────────────┘

ENCRYPTION IN TRANSIT
┌─────────────────────────────────────────────────────────────────────────────┐
│  • HTTPS: TLS 1.3 (minimum TLS 1.2)                                         │
│  • API Calls: TLS 1.3 with certificate pinning                              │
│  • Database Connections: SSL/TLS enforced                                   │
│  • Internal Services: mTLS (mutual TLS)                                     │
│  • Webhooks: Request signing with HMAC-SHA256                               │
└─────────────────────────────────────────────────────────────────────────────┘

FIELD-LEVEL ENCRYPTION (Sensitive Data)
┌─────────────────────────────────────────────────────────────────────────────┐
│  Encrypted Fields:                                                          │
│  • Credit Card Numbers (PCI DSS)                                            │
│  • Bank Account Numbers                                                     │
│  • Social Security Numbers / Tax IDs                                        │
│  • Passport Numbers                                                         │
│  • Biometric Data                                                           │
│  • Encryption: AES-256-GCM with per-field keys                              │
│  • Key Derivation: HKDF from master key + record ID                         │
└─────────────────────────────────────────────────────────────────────────────┘

DATA MASKING & ANONYMIZATION
┌─────────────────────────────────────────────────────────────────────────────┐
│  • PII Masking: For non-privileged users                                    │
│    - Email: j***@example.com                                                │
│    - Phone: +234 *** *** **42                                               │
│    - Address: ***, Lagos, Nigeria                                           │
│  • Anonymization: For analytics/ML                                          │
│    - User ID → Hashed ID                                                    │
│    - Remove direct identifiers                                              │
│  • Pseudonymization: Reversible with key                                    │
└─────────────────────────────────────────────────────────────────────────────┘

ACCESS CONTROL
┌─────────────────────────────────────────────────────────────────────────────┐
│  • Row-Level Security (RLS): PostgreSQL policies                            │
│  • Column-Level Security: Restrict access to sensitive columns              │
│  • Role-Based Access Control (RBAC): Least privilege principle              │
│  • Attribute-Based Access Control (ABAC): Context-aware permissions         │
│  • Audit All Access: Log every read/write to sensitive data                 │
└─────────────────────────────────────────────────────────────────────────────┘

EXAMPLE: Row-Level Security Policy
sql
-- Users can only see their own organization's data
CREATE POLICY organization_isolation ON orders
  USING (organization_id = current_setting('app.current_org_id')::UUID);

-- Vendors can only see orders for their products
CREATE POLICY vendor_orders ON orders
  USING (vendor_id = current_setting('app.current_vendor_id')::UUID);
```

---

**Document Version**: 1.0
**Last Updated**: 2025-12-06
**Owner**: Platform Data Team
**Review Cycle**: Quarterly
