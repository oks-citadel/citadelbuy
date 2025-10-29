# Global Commerce Platform - Data Flow Guide

## Table of Contents
1. [Overview](#overview)
2. [Architecture Components](#architecture-components)
3. [Core Data Flows](#core-data-flows)
4. [Data Flow Patterns](#data-flow-patterns)
5. [Security & Compliance](#security--compliance)
6. [Performance Optimization](#performance-optimization)

---

## Overview

This document describes the data flows within the Global Commerce Platform, detailing how data moves through various services, storage systems, and external integrations.

### Key Principles
- **Event-Driven Architecture**: Asynchronous communication via Event Hub
- **Microservices Pattern**: Each service owns its data domain
- **CQRS**: Command Query Responsibility Segregation for high-traffic services
- **API Gateway**: Single entry point for all external requests
- **Data Consistency**: Eventually consistent with compensating transactions

---

## Architecture Components

### 1. Entry Points
- **Azure Front Door**: Global CDN and WAF
- **API Gateway**: Request routing and authentication
- **API Management (APIM)**: API versioning, rate limiting, and documentation

### 2. Compute Layer
- **App Services**: Containerized microservices
- **Services**:
  - API Gateway
  - Auth Service
  - User Service
  - Product Service
  - Order Service
  - Payment Service
  - Inventory Service
  - Shipping Service
  - Notification Service
  - Search Service
  - Analytics Service
  - AI Service
  - Vendor Service

### 3. Data Layer
- **PostgreSQL**: Primary transactional database (per service)
- **Redis Cache**: Session store and caching layer
- **Azure Storage**: Blob storage for media and documents
- **Event Hub**: Event streaming platform

### 4. Integration Layer
- **Event Hub**: Pub/Sub messaging
- **Application Insights**: Telemetry and logging
- **Key Vault**: Secrets management

---

## Core Data Flows

### 1. User Authentication Flow

```
┌─────────┐
│  User   │
└────┬────┘
     │ 1. Login Request (email/password)
     ▼
┌─────────────────┐
│  Front Door     │ (SSL Termination, WAF)
└────┬────────────┘
     │ 2. Route to APIM
     ▼
┌─────────────────┐
│  API Gateway    │ (Rate Limiting, Routing)
└────┬────────────┘
     │ 3. Forward to Auth Service
     ▼
┌─────────────────┐
│  Auth Service   │
└────┬────────────┘
     │ 4. Query user credentials
     ▼
┌─────────────────┐
│  PostgreSQL     │ (auth_db)
│  (Auth DB)      │
└────┬────────────┘
     │ 5. Validate & Generate JWT
     ▼
┌─────────────────┐
│  Redis Cache    │ (Store session token)
└────┬────────────┘
     │ 6. Publish auth event
     ▼
┌─────────────────┐
│  Event Hub      │ (analytics-events)
└────┬────────────┘
     │ 7. Return JWT to user
     ▼
┌─────────┐
│  User   │ (Receives access token)
└─────────┘
```

**Data Flow Steps:**
1. User submits credentials via HTTPS
2. Front Door terminates SSL and applies WAF rules
3. APIM applies rate limiting and routes to API Gateway
4. API Gateway forwards to Auth Service
5. Auth Service queries PostgreSQL auth_db
6. On success, generates JWT token
7. Stores session in Redis with TTL
8. Publishes authentication event to Event Hub
9. Returns JWT and refresh token to user

**Data Stored:**
- PostgreSQL: User credentials (hashed), MFA settings
- Redis: Session tokens (15-min TTL for access, 7-day for refresh)
- Event Hub: Authentication events for analytics

---

### 2. Product Search & Discovery Flow

```
┌─────────┐
│  User   │
└────┬────┘
     │ 1. Search query: "wireless headphones"
     ▼
┌─────────────────┐
│  Front Door     │
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│  API Gateway    │ (Auth validation)
└────┬────────────┘
     │ 2. Check cache
     ▼
┌─────────────────┐
│  Redis Cache    │ (Search results cache)
└────┬────────────┘
     │ Cache miss
     │ 3. Forward to Search Service
     ▼
┌─────────────────┐
│  Search Service │ (Elasticsearch)
└────┬────────────┘
     │ 4. Query product catalog
     ├──────────────────┐
     ▼                  ▼
┌─────────────┐   ┌─────────────┐
│  Product    │   │  AI Service │
│  Service    │   │             │
└─────────────┘   └─────────────┘
     │                  │ 5. Personalization
     │ 6. Fetch details │
     ▼                  ▼
┌─────────────────┐
│  PostgreSQL     │ (product_db)
│  (Product DB)   │
└────┬────────────┘
     │ 7. Enrich with images
     ▼
┌─────────────────┐
│  Blob Storage   │ (product-images)
└────┬────────────┘
     │ 8. Cache results
     ▼
┌─────────────────┐
│  Redis Cache    │
└────┬────────────┘
     │ 9. Return results
     ▼
┌─────────┐
│  User   │
└─────────┘
```

**Data Flow Steps:**
1. User enters search query
2. API Gateway validates JWT token
3. Check Redis cache for recent identical searches
4. On cache miss, Search Service queries Elasticsearch index
5. AI Service applies personalization based on user history
6. Product Service enriches results with latest pricing and inventory
7. Fetch product images from Blob Storage
8. Cache results in Redis (5-minute TTL)
9. Return paginated results to user
10. Log search event to Event Hub for analytics

**Data Stored:**
- Elasticsearch: Product catalog, indexed for search
- PostgreSQL: Product details, pricing, inventory counts
- Blob Storage: Product images, videos
- Redis: Search results cache, user preferences
- Event Hub: Search events for analytics and ML training

---

### 3. Order Placement Flow

```
┌─────────┐
│  User   │
└────┬────┘
     │ 1. Place order (cart items, shipping, payment)
     ▼
┌─────────────────┐
│  API Gateway    │
└────┬────────────┘
     │ 2. Initiate order
     ▼
┌─────────────────┐
│  Order Service  │
└────┬────────────┘
     │ 3. Create order (PENDING)
     ▼
┌─────────────────┐
│  PostgreSQL     │ (order_db)
│  (Order DB)     │
└────┬────────────┘
     │ 4. Reserve inventory
     ▼
┌─────────────────┐
│  Inventory      │
│  Service        │
└────┬────────────┘
     │ 5. Lock stock
     ▼
┌─────────────────┐
│  PostgreSQL     │ (inventory_db)
│  (Inventory DB) │
└────┬────────────┘
     │ 6. Process payment
     ▼
┌─────────────────┐
│  Payment        │
│  Service        │
└────┬────────────┘
     │ 7. Charge customer
     ├─────────────┬─────────────┐
     ▼             ▼             ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│  Stripe  │  │  PayPal  │  │ Adyen... │
└────┬─────┘  └────┬─────┘  └────┬─────┘
     │             │             │
     └─────────────┴─────────────┘
     │ 8. Payment confirmed
     ▼
┌─────────────────┐
│  PostgreSQL     │ (payment_db)
│  (Payment DB)   │
└────┬────────────┘
     │ 9. Publish events
     ├──────────────────┬──────────────────┐
     ▼                  ▼                  ▼
┌──────────┐      ┌──────────┐      ┌──────────┐
│ order-   │      │ payment- │      │inventory-│
│ events   │      │ events   │      │ events   │
└────┬─────┘      └────┬─────┘      └────┬─────┘
     │                  │                  │
     └──────────────────┴──────────────────┘
     │ 10. Trigger downstream processes
     ├────────────────┬──────────────────┬──────────────────┐
     ▼                ▼                  ▼                  ▼
┌──────────┐    ┌──────────┐      ┌──────────┐      ┌──────────┐
│Shipping  │    │Analytics │      │Notification│    │ Vendor   │
│Service   │    │Service   │      │Service     │    │Service   │
└──────────┘    └──────────┘      └──────────┘      └──────────┘
```

**Data Flow Steps:**
1. User submits order with cart items, shipping address, payment method
2. API Gateway validates request and forwards to Order Service
3. Order Service creates order record with status PENDING
4. Saga pattern begins - coordinate across services
5. Inventory Service reserves stock (distributed lock)
6. Payment Service processes payment via configured gateway
7. On success:
   - Update order status to CONFIRMED
   - Commit inventory reservation
   - Store payment record
8. Publish events to Event Hub:
   - order-events: OrderCreated, OrderConfirmed
   - payment-events: PaymentProcessed
   - inventory-events: InventoryReserved
9. Downstream services react to events:
   - Shipping Service: Generate shipping label
   - Notification Service: Send order confirmation email/SMS
   - Analytics Service: Update dashboards
   - Vendor Service: Notify suppliers (if dropshipping)
10. Return order confirmation to user

**Failure Handling:**
- If payment fails: Release inventory, update order status to FAILED
- If inventory unavailable: Don't attempt payment, return error
- Compensating transactions for partial failures

**Data Stored:**
- order_db: Order details, line items, status, history
- inventory_db: Stock levels, reservations
- payment_db: Transaction records, payment method tokens
- Event Hub: All order lifecycle events
- Blob Storage: Order invoices (PDF)

---

### 4. Real-time Inventory Synchronization

```
┌─────────────────┐
│  Vendor Portal  │ (Multiple vendors)
└────┬────────────┘
     │ 1. Upload inventory CSV/API
     ▼
┌─────────────────┐
│  Vendor Service │
└────┬────────────┘
     │ 2. Validate & parse
     ▼
┌─────────────────┐
│  Event Hub      │ (inventory-events)
│  (Topic)        │
└────┬────────────┘
     │ 3. Fan-out to subscribers
     ├──────────────────┬──────────────────┐
     ▼                  ▼                  ▼
┌──────────┐      ┌──────────┐      ┌──────────┐
│Inventory │      │ Product  │      │ Search   │
│Service   │      │ Service  │      │ Service  │
└────┬─────┘      └────┬─────┘      └────┬─────┘
     │                  │                  │
     │ 4. Update stock  │ 5. Update price  │ 6. Reindex
     ▼                  ▼                  ▼
┌──────────┐      ┌──────────┐      ┌──────────┐
│inventory_│      │product_db│      │Elasticsearch│
│db        │      │          │      │          │
└────┬─────┘      └────┬─────┘      └────┬─────┘
     │                  │                  │
     └──────────────────┴──────────────────┘
     │ 7. Invalidate cache
     ▼
┌─────────────────┐
│  Redis Cache    │ (Clear product cache)
└────┬────────────┘
     │ 8. Publish update event
     ▼
┌─────────────────┐
│  Event Hub      │ (analytics-events)
└────┬────────────┘
     │ 9. Update BI dashboards
     ▼
┌─────────────────┐
│  Analytics      │
│  Service        │
└─────────────────┘
```

**Data Flow Steps:**
1. Vendor uploads inventory update (CSV, API, or manual entry)
2. Vendor Service validates format and business rules
3. Publish InventoryUpdated event to Event Hub
4. Inventory Service updates stock quantities
5. Product Service updates product availability flags
6. Search Service reindexes affected products in Elasticsearch
7. Invalidate cached product data in Redis
8. Analytics Service updates inventory dashboards
9. If stock < threshold, trigger reorder notification

**Data Stored:**
- inventory_db: Current stock, warehouse locations, reorder points
- product_db: Product availability status
- Elasticsearch: Searchable product catalog
- Redis: Invalidated product caches
- Event Hub: Inventory change events

---

### 5. AI-Powered Recommendations

```
┌─────────┐
│  User   │
└────┬────┘
     │ 1. View product page
     ▼
┌─────────────────┐
│  Product Service│
└────┬────────────┘
     │ 2. Request recommendations
     ▼
┌─────────────────┐
│  AI Service     │
└────┬────────────┘
     │ 3. Fetch user profile
     ▼
┌─────────────────┐
│  User Service   │
└────┬────────────┘
     │ 4. Query user history
     ▼
┌─────────────────┐
│  PostgreSQL     │ (user_db)
│  (User DB)      │
└────┬────────────┘
     │ 5. Load ML model
     ▼
┌─────────────────┐
│  Blob Storage   │ (ml-models/recommendation)
└────┬────────────┘
     │ 6. Fetch event stream
     ▼
┌─────────────────┐
│  Event Hub      │ (analytics-events)
└────┬────────────┘
     │ 7. Real-time inference
     ▼
┌─────────────────┐
│  AI Service     │ (TensorFlow/PyTorch)
└────┬────────────┘
     │ 8. Fetch product details
     ▼
┌─────────────────┐
│  Product Service│
└────┬────────────┘
     │ 9. Cache recommendations
     ▼
┌─────────────────┐
│  Redis Cache    │ (30-min TTL)
└────┬────────────┘
     │ 10. Return recommendations
     ▼
┌─────────┐
│  User   │ (See personalized products)
└─────────┘
```

**Data Flow Steps:**
1. User views a product page
2. Product Service calls AI Service for recommendations
3. AI Service fetches user profile and preferences
4. Query user's browsing and purchase history
5. Load pre-trained recommendation model from Blob Storage
6. Stream recent user events from Event Hub
7. Run inference:
   - Collaborative filtering (user-item matrix)
   - Content-based filtering (product attributes)
   - Contextual bandits (real-time learning)
8. Fetch details for top-K recommended products
9. Cache recommendations in Redis (user-specific key)
10. Return personalized product list

**Model Training Pipeline (Batch):**
- Nightly: Analytics Service exports user behavior data
- ML Training: Retrain models on Azure ML or Databricks
- Model Registry: Store versioned models in Blob Storage
- Model Deployment: AI Service loads latest model

**Data Stored:**
- user_db: User preferences, demographics
- Event Hub: Real-time user interactions
- Blob Storage: Trained ML models
- Redis: Cached recommendation results
- Analytics Service: Historical data for model training

---

### 6. Payment Processing Flow

```
┌─────────┐
│  User   │
└────┬────┘
     │ 1. Submit payment info
     ▼
┌─────────────────┐
│  Order Service  │
└────┬────────────┘
     │ 2. Initiate payment
     ▼
┌─────────────────┐
│  Payment Service│
└────┬────────────┘
     │ 3. Retrieve secrets
     ▼
┌─────────────────┐
│  Key Vault      │ (API keys, certificates)
└────┬────────────┘
     │ 4. Fraud check
     ▼
┌─────────────────┐
│  AI Service     │ (Fraud detection model)
└────┬────────────┘
     │ 5. Score: 0.05 (low risk)
     │ 6. Process payment
     ▼
┌─────────────────┐
│  Payment Gateway│ (Stripe/PayPal/Adyen)
└────┬────────────┘
     │ 7. Payment response
     ▼
┌─────────────────┐
│  Payment Service│
└────┬────────────┘
     │ 8. Store transaction
     ▼
┌─────────────────┐
│  PostgreSQL     │ (payment_db)
│  (Payment DB)   │
└────┬────────────┘
     │ 9. Update order status
     ▼
┌─────────────────┐
│  Order Service  │
└────┬────────────┘
     │ 10. Publish event
     ▼
┌─────────────────┐
│  Event Hub      │ (payment-events)
└────┬────────────┘
     │ 11. Trigger notifications
     ▼
┌─────────────────┐
│  Notification   │
│  Service        │
└────┬────────────┘
     │ 12. Send confirmation
     ▼
┌─────────┐
│  User   │ (Receives email/SMS)
└─────────┘
```

**Data Flow Steps:**
1. User submits payment information (tokenized)
2. Order Service calls Payment Service
3. Payment Service retrieves gateway API keys from Key Vault
4. AI Service runs fraud detection:
   - Check user history
   - Analyze transaction patterns
   - Calculate fraud score
5. If score < threshold (0.2), proceed
6. Call external payment gateway (PCI-compliant)
7. Receive payment confirmation or decline
8. Store transaction record (PCI-DSS compliant)
9. Update order status based on payment result
10. Publish PaymentProcessed event
11. Notification Service sends confirmation
12. Analytics Service logs transaction

**Compliance:**
- No card data stored locally (PCI-DSS)
- All sensitive data in Key Vault
- TLS 1.3 for all communications
- Audit logs in Application Insights

**Data Stored:**
- payment_db: Transaction IDs, status, amount, gateway reference
- Key Vault: Payment gateway credentials
- Event Hub: Payment events
- Application Insights: Audit trail

---

### 7. Analytics & Reporting Flow

```
┌─────────────────┐
│  All Services   │
└────┬────────────┘
     │ 1. Emit events (all interactions)
     ▼
┌─────────────────┐
│  Event Hub      │ (analytics-events)
│  (High Throughput)
└────┬────────────┘
     │ 2. Stream processing
     ▼
┌─────────────────┐
│  Analytics      │
│  Service        │
└────┬────────────┘
     │ 3. Real-time aggregation
     ├──────────────────┬──────────────────┐
     ▼                  ▼                  ▼
┌──────────┐      ┌──────────┐      ┌──────────┐
│ Redis    │      │PostgreSQL│      │Blob      │
│ (RT data)│      │(analytics│      │Storage   │
│          │      │_db)      │      │(exports) │
└────┬─────┘      └────┬─────┘      └────┬─────┘
     │                  │                  │
     │ 4. Query metrics │                  │
     ▼                  ▼                  ▼
┌─────────────────┐
│  Application    │ (Dashboards)
│  Insights       │
└────┬────────────┘
     │ 5. Visualize
     ▼
┌─────────────────┐
│  Admin Portal   │ (Power BI / Grafana)
└─────────────────┘
```

**Data Flow Steps:**
1. All microservices emit events to analytics-events topic
2. Analytics Service consumes events in real-time
3. Aggregate metrics:
   - User sessions
   - Order volumes
   - Revenue (by region, product, time)
   - Conversion rates
   - Service health metrics
4. Store in multiple sinks:
   - Redis: Real-time counters (e.g., active users)
   - PostgreSQL: Historical aggregates (hourly, daily)
   - Blob Storage: Raw event logs (Parquet format)
5. Application Insights: Query and visualization
6. Admin Portal displays dashboards

**Batch Processing:**
- Nightly: Export raw events to Blob Storage
- Weekly: Run complex analytics (cohort analysis, churn prediction)
- Monthly: Generate executive reports

**Data Stored:**
- Event Hub: Raw events (24-hour retention)
- Redis: Real-time metrics (1-hour TTL)
- analytics_db: Aggregated metrics (1-year retention)
- Blob Storage: Raw event archives (indefinite retention)
- Application Insights: Telemetry data (90-day retention)

---

## Data Flow Patterns

### 1. Synchronous Request-Response
**Use Cases:** User authentication, product lookup, order status check

```
Client → API Gateway → Service → Database → Service → API Gateway → Client
```

**Characteristics:**
- Immediate response
- Strong consistency
- Higher latency
- Suitable for read-heavy operations

### 2. Asynchronous Event-Driven
**Use Cases:** Order processing, inventory updates, notifications

```
Service A → Event Hub → Service B, C, D (parallel)
```

**Characteristics:**
- Decoupled services
- Eventually consistent
- High throughput
- Fault tolerant

### 3. CQRS (Command Query Responsibility Segregation)
**Use Cases:** Product catalog, order history

```
Write Path: Command → Service → Write DB → Event Hub
Read Path: Query → Redis Cache → Read DB (optimized)
```

**Characteristics:**
- Optimized reads and writes
- Scalable independently
- Cache-friendly

### 4. Saga Pattern (Distributed Transactions)
**Use Cases:** Order placement, refunds

```
Step 1: Order → Success → Step 2: Inventory → Success → Step 3: Payment
                   ↓                    ↓                      ↓
                 Fail              Compensate           Compensate
```

**Characteristics:**
- Maintains consistency across services
- Handles partial failures
- Complex to implement

---

## Security & Compliance

### 1. Data Encryption
- **In Transit**: TLS 1.3 for all communications
- **At Rest**: AES-256 encryption for PostgreSQL and Storage
- **Secrets**: Managed in Azure Key Vault with RBAC

### 2. Authentication & Authorization
- **OAuth 2.0 + OpenID Connect**: For user authentication
- **JWT Tokens**: Stateless authentication
- **RBAC**: Role-based access control for APIs
- **Managed Identity**: For service-to-service auth

### 3. Data Privacy (GDPR/CCPA)
- **Right to Access**: User data export API
- **Right to Delete**: User data deletion workflow
- **Consent Management**: Stored in user_db
- **Audit Logs**: All data access logged

### 4. PCI-DSS Compliance
- **No Card Storage**: Tokenization via payment gateways
- **Scope Reduction**: Payment Service isolated
- **Audit Logging**: All payment transactions logged

### 5. Network Security
- **NSGs**: Network security groups restrict traffic
- **Private Endpoints**: Database and cache not publicly exposed
- **WAF**: Azure Front Door Web Application Firewall
- **DDoS Protection**: Azure DDoS Protection Standard

---

## Performance Optimization

### 1. Caching Strategy
**Redis Cache Layers:**
- **L1 - Session Data**: User sessions, JWT tokens (15-min TTL)
- **L2 - API Responses**: Product details, search results (5-min TTL)
- **L3 - Static Content**: Category lists, configurations (1-hour TTL)

**Cache Invalidation:**
- Event-driven: Invalidate on updates via Event Hub
- TTL-based: Automatic expiration
- Manual: Admin API for forced cache clear

### 2. Database Optimization
- **Read Replicas**: For read-heavy services (Product, User)
- **Connection Pooling**: PgBouncer for PostgreSQL
- **Indexing**: B-tree indexes on frequently queried columns
- **Partitioning**: Orders and analytics tables partitioned by date

### 3. Event Hub Optimization
- **Partitioning**: 8 partitions for high-traffic topics
- **Batching**: Process events in batches of 100
- **Checkpointing**: Store consumer offset every 30 seconds
- **Retention**: 7 days for production, 1 day for dev

### 4. API Performance
- **Rate Limiting**: Per-user and per-IP limits in APIM
- **Compression**: Gzip for responses > 1KB
- **Pagination**: Cursor-based for large result sets
- **Field Filtering**: Return only requested fields

### 5. Auto-Scaling
- **Horizontal Scaling**: App Services scale based on CPU/Memory
- **Database Scaling**: Vertical scaling for PostgreSQL
- **Event Hub**: Auto-inflate for throughput units
- **CDN**: Azure Front Door scales automatically

---

## Data Flow Diagrams

### High-Level System Data Flow

```
                                    ┌──────────────────┐
                                    │   Azure Front    │
                                    │      Door        │
                                    │  (Global CDN)    │
                                    └────────┬─────────┘
                                             │
                                             ▼
                                    ┌──────────────────┐
                                    │   API Gateway    │
                                    │   (APIM + App)   │
                                    └────────┬─────────┘
                                             │
                ┌────────────────────────────┼────────────────────────────┐
                │                            │                            │
                ▼                            ▼                            ▼
       ┌─────────────────┐        ┌─────────────────┐        ┌─────────────────┐
       │  Auth & User    │        │   E-Commerce    │        │   AI & ML       │
       │   Services      │        │    Services     │        │   Services      │
       │                 │        │                 │        │                 │
       │ • Auth          │        │ • Product       │        │ • Recommendations│
       │ • User          │        │ • Order         │        │ • Search        │
       │                 │        │ • Payment       │        │ • Fraud Detection│
       │                 │        │ • Inventory     │        │ • Analytics     │
       │                 │        │ • Shipping      │        │                 │
       │                 │        │ • Notification  │        │                 │
       └────────┬────────┘        └────────┬────────┘        └────────┬────────┘
                │                          │                          │
                └──────────────────────────┼──────────────────────────┘
                                           │
                                           ▼
                            ┌──────────────────────────────┐
                            │      Event Hub Namespace     │
                            │  ┌────────────────────────┐  │
                            │  │  • order-events        │  │
                            │  │  • payment-events      │  │
                            │  │  • inventory-events    │  │
                            │  │  • analytics-events    │  │
                            │  └────────────────────────┘  │
                            └──────────────┬───────────────┘
                                           │
                ┌──────────────────────────┼──────────────────────────┐
                │                          │                          │
                ▼                          ▼                          ▼
       ┌─────────────────┐        ┌─────────────────┐        ┌─────────────────┐
       │   PostgreSQL    │        │   Redis Cache   │        │  Azure Storage  │
       │   (Multiple DB) │        │                 │        │                 │
       │                 │        │ • Sessions      │        │ • Product Images│
       │ • auth_db       │        │ • API Cache     │        │ • Documents     │
       │ • user_db       │        │ • Counters      │        │ • ML Models     │
       │ • product_db    │        │                 │        │ • Analytics     │
       │ • order_db      │        │                 │        │                 │
       │ • payment_db    │        │                 │        │                 │
       │ • inventory_db  │        │                 │        │                 │
       │ • analytics_db  │        │                 │        │                 │
       └─────────────────┘        └─────────────────┘        └─────────────────┘
```

---

## Monitoring & Observability

### 1. Application Insights
- **Telemetry**: All services send metrics, logs, traces
- **Distributed Tracing**: Track requests across services
- **Alerts**: Automated alerts on errors, latency spikes

### 2. Log Analytics
- **Centralized Logging**: All logs in one place
- **Query Language**: KQL for log analysis
- **Dashboards**: Custom dashboards for operations

### 3. Metrics
- **Business Metrics**: Orders/min, revenue, conversion rate
- **Technical Metrics**: Latency (p50, p95, p99), error rate
- **Infrastructure Metrics**: CPU, memory, disk, network

---

## Disaster Recovery

### 1. Backup Strategy
- **PostgreSQL**: Automated daily backups, 35-day retention
- **Blob Storage**: Geo-redundant storage (GRS)
- **Configuration**: Infrastructure as Code (Terraform)

### 2. High Availability
- **App Services**: Zone-redundant deployment
- **PostgreSQL**: High Availability with standby replica
- **Redis**: Premium tier with clustering
- **Event Hub**: Geo-disaster recovery pairing

### 3. Recovery Procedures
- **RTO**: 4 hours (Recovery Time Objective)
- **RPO**: 1 hour (Recovery Point Objective)
- **Runbooks**: Documented in docs/runbooks/

---

## Conclusion

This data flow guide provides a comprehensive overview of how data moves through the Global Commerce Platform. The architecture is designed for:

- **Scalability**: Horizontal scaling of stateless services
- **Resilience**: Event-driven architecture with compensating transactions
- **Performance**: Multi-layer caching and optimized queries
- **Security**: End-to-end encryption and compliance
- **Observability**: Comprehensive monitoring and logging

For implementation details, refer to:
- `ARCHITECTURE.md` - Detailed architecture documentation
- `docs/api/` - API specifications
- `docs/runbooks/` - Operational procedures
