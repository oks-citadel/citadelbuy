# Broxiva Marketing Platform

A comprehensive, self-hosted marketing automation platform designed for global SaaS growth without external dependencies.

## Overview

The Marketing Platform provides 11 integrated API modules with 150+ endpoints, covering everything from SEO and content management to AI-powered lead scoring and churn prediction.

**Key Design Principles:**
- **Self-Hosted Analytics**: No Google Analytics, Mixpanel, or third-party tracking
- **Organic Growth Focus**: SEO-first approach without paid advertising dependencies
- **AWS Native**: Full EKS deployment with IRSA for secure service authentication
- **Privacy-First**: GDPR/CCPA compliant from the ground up

---

## Architecture

```
Marketing Platform
├── API Layer (NestJS Modules)
│   ├── seo/              # SEO & Discoverability
│   ├── content/          # Content Management
│   ├── growth/           # Growth & Acquisition
│   ├── lifecycle/        # Lifecycle Marketing
│   ├── analytics/        # Self-Hosted Analytics
│   ├── personalization/  # User Personalization
│   ├── experiments/      # A/B Testing & Feature Flags
│   ├── reputation/       # Reviews & Social Proof
│   ├── localization/     # Geo & Currency
│   ├── commerce/         # Commerce Integrations
│   └── ai/               # AI/ML Services
│
├── Infrastructure (Terraform)
│   ├── eks-namespaces/   # Kubernetes namespaces
│   ├── data-layer/       # OpenSearch, DynamoDB, Redis
│   ├── messaging/        # EventBridge, SQS, SNS
│   ├── data-lake/        # Kinesis, Firehose, S3, Athena
│   ├── email/            # SES with templates
│   ├── cdn/              # CloudFront for SEO assets
│   └── iam/              # IRSA roles
│
└── Kubernetes (Helm)
    ├── seo-service/
    ├── content-service/
    ├── analytics-service/
    ├── experimentation-service/
    ├── personalization-service/
    ├── lifecycle-service/
    ├── growth-service/
    ├── commerce-service/
    └── ai-marketing-service/
```

---

## Modules

### 1. SEO & Discoverability (`/marketing/seo`)

Self-advertising through search engine optimization.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/sitemap` | GET | Dynamic XML sitemap generation |
| `/sitemap/submit` | POST | Submit sitemap to search engines |
| `/robots` | GET | Robots.txt generation |
| `/schema/product/{id}` | GET | JSON-LD for products |
| `/schema/organization` | GET | JSON-LD for organization |
| `/audit` | GET | SEO audit with scores |
| `/audit/{url}` | POST | Audit specific URL |
| `/keywords/research` | POST | Keyword research |
| `/keywords/rank` | GET | Keyword rankings |
| `/vitals` | GET | Core Web Vitals |

### 2. Content Management (`/marketing/content`)

CMS for marketing content with versioning and scheduling.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/content` | GET/POST | CRUD for content items |
| `/content/{id}` | GET/PUT/DELETE | Manage individual content |
| `/content/{id}/publish` | POST | Publish content |
| `/content/{id}/versions` | GET | Version history |
| `/templates` | GET/POST | Content templates |
| `/media` | POST | Media uploads |
| `/media/{id}/optimize` | POST | Image optimization |

### 3. Growth & Acquisition (`/marketing/growth`)

Campaigns, referrals, and affiliate management.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/campaigns` | GET/POST | Campaign management |
| `/campaigns/{id}/metrics` | GET | Campaign performance |
| `/landing-pages` | GET/POST | Landing page builder |
| `/landing-pages/{id}/variants` | GET/POST | A/B variants |
| `/referrals` | GET/POST | Referral programs |
| `/referrals/code/{code}` | GET | Validate referral code |
| `/affiliates` | GET/POST | Affiliate management |
| `/affiliates/{id}/payouts` | GET | Affiliate payouts |

### 4. Lifecycle Marketing (`/marketing/lifecycle`)

Email lists, segments, and automated workflows.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/lists` | GET/POST | Email list management |
| `/lists/{id}/subscribers` | GET/POST | List subscribers |
| `/segments` | GET/POST | Audience segmentation |
| `/segments/{id}/members` | GET | Segment members |
| `/triggers` | GET/POST | Event triggers |
| `/drip-flows` | GET/POST | Drip campaigns |
| `/drip-flows/{id}/start` | POST | Start flow for user |
| `/broadcasts` | POST | Send broadcast emails |

### 5. Self-Hosted Analytics (`/analytics`)

Complete analytics without external dependencies.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/events/ingest` | POST | Ingest single event |
| `/events/batch` | POST | Batch ingestion (1000 max) |
| `/funnels` | GET/POST | Funnel definitions |
| `/funnels/{id}/conversion` | GET | Conversion rates |
| `/cohorts` | GET/POST | Cohort definitions |
| `/retention` | GET | Retention curves |
| `/ltv` | GET | Customer lifetime value |
| `/attribution` | GET | Multi-touch attribution |
| `/sessions` | GET | Session analytics |
| `/heatmaps` | GET | Click/scroll heatmaps |
| `/realtime/users` | GET | Active users now |
| `/realtime/stream` | WS | Real-time WebSocket |

### 6. Personalization (`/marketing/personalization`)

User profiles and personalized experiences.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/profiles/{userId}` | GET/PUT | User profile |
| `/profiles/{userId}/preferences` | GET/PUT | Preferences |
| `/rules` | GET/POST | Personalization rules |
| `/rules/{id}/evaluate` | POST | Evaluate rule |
| `/recommendations/{userId}` | GET | Personalized recommendations |
| `/next-best-action/{userId}` | GET | Next best action |

### 7. Experimentation (`/experiments`)

A/B testing and feature flags with statistical significance.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/experiments` | GET/POST | Experiment management |
| `/experiments/{id}/variants` | POST | Add variant |
| `/experiments/{id}/assign` | POST | Assign user |
| `/experiments/{id}/results` | GET | Statistical results |
| `/feature-flags` | GET/POST | Feature flag management |
| `/feature-flags/{key}/evaluate` | POST | Evaluate flag |
| `/feature-flags/bulk-evaluate` | POST | Evaluate multiple |

### 8. Reputation Management (`/marketing/reputation`)

Reviews, testimonials, and social proof.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/reviews` | GET/POST | Review management |
| `/reviews/{id}/respond` | POST | Respond to review |
| `/reviews/aggregate` | GET | Aggregated ratings |
| `/testimonials` | GET/POST | Testimonial management |
| `/nps` | GET/POST | NPS surveys |
| `/nps/score` | GET | Calculate NPS |
| `/csat` | GET/POST | CSAT surveys |
| `/social-proof/widget` | GET | Social proof widget |

### 9. Localization (`/marketing/localization`)

Geo pricing and multi-currency support.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/pricing/geo` | GET | Geo-based pricing |
| `/pricing/currency/{currency}` | GET | Currency conversion |
| `/pricing/ppp` | GET | PPP adjusted pricing |
| `/detect` | GET | Geo detection |
| `/markets` | GET/POST | Market configuration |
| `/markets/{id}/pricing` | PUT | Market pricing |

### 10. Commerce Integration (`/marketing/commerce`)

Upsells, cross-sells, and promotions.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/upsells` | GET/POST | Upsell offers |
| `/upsells/evaluate` | POST | Evaluate upsells |
| `/cross-sells` | GET/POST | Cross-sell offers |
| `/coupons` | GET/POST | Coupon management |
| `/coupons/{code}/validate` | POST | Validate coupon |
| `/promotions` | GET/POST | Promotions |
| `/banners` | GET/POST | Banner management |
| `/popups` | GET/POST | Exit-intent popups |
| `/messages/in-app` | POST | In-app messaging |

### 11. AI Marketing (`/marketing/ai`)

ML-powered marketing intelligence.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/lead-scoring/{userId}` | GET | Lead score |
| `/lead-scoring/batch` | POST | Batch scoring |
| `/churn-prediction/{userId}` | GET | Churn probability |
| `/churn-prediction/high-risk` | GET | High-risk users |
| `/content/generate` | POST | AI content generation |
| `/content/optimize` | POST | Content optimization |
| `/subject-lines/generate` | POST | Email subject lines |
| `/audience/lookalike` | POST | Lookalike audiences |

---

## Infrastructure

### AWS Services Used

| Service | Purpose |
|---------|---------|
| **EKS** | Kubernetes cluster for all services |
| **OpenSearch** | Analytics data storage and querying |
| **DynamoDB** | Real-time event storage, feature flags |
| **ElastiCache** | Redis caching, session storage |
| **SQS** | Message queues for async processing |
| **SNS** | Pub/sub for event distribution |
| **EventBridge** | Event bus for service communication |
| **Kinesis** | Real-time event streaming |
| **Firehose** | ETL to data lake |
| **S3** | Data lake storage, CDN origin |
| **Athena** | SQL queries on data lake |
| **Glue** | Data catalog and ETL |
| **SES** | Transactional and marketing email |
| **CloudFront** | CDN for SEO assets |

### Kubernetes Namespaces

```yaml
broxiva-marketing-core:     # Core marketing services
broxiva-marketing-analytics: # Analytics pipeline
broxiva-marketing-email:     # Email services
broxiva-marketing-content:   # Content services
broxiva-marketing-growth:    # Growth services
broxiva-marketing-ai:        # AI/ML services
broxiva-marketing-data:      # Data layer
broxiva-marketing-events:    # Event processing
```

### IRSA Roles

Each service has a dedicated IAM role with least-privilege permissions:

- `broxiva-marketing-seo-role`
- `broxiva-marketing-content-role`
- `broxiva-marketing-analytics-role`
- `broxiva-marketing-email-role`
- `broxiva-marketing-experiments-role`
- `broxiva-marketing-personalization-role`
- `broxiva-marketing-ai-role`
- `broxiva-marketing-data-role`

---

## Deployment

### Terraform

```bash
# Initialize
cd infrastructure/terraform/modules/marketing
terraform init

# Plan
terraform plan -var-file=production.tfvars

# Apply
terraform apply -var-file=production.tfvars
```

### Helm

```bash
# Add all marketing services
for chart in seo content analytics experimentation personalization lifecycle growth commerce ai-marketing; do
  helm upgrade --install $chart-service ./charts/$chart-service \
    -n broxiva-marketing-core \
    -f ./charts/$chart-service/values/prod.yaml
done
```

---

## Event Schema

All analytics events follow a standardized schema:

```typescript
interface AnalyticsEvent {
  event_id: string;        // UUID v4
  event_type: string;      // e.g., 'page_view', 'button_click'
  user_id?: string;        // Authenticated user ID
  anonymous_id: string;    // Device/session identifier
  session_id: string;      // Session identifier
  timestamp: string;       // ISO 8601
  properties: Record<string, any>;
  context: {
    page?: {
      url: string;
      path: string;
      title: string;
      referrer?: string;
    };
    device?: {
      type: string;        // 'desktop', 'mobile', 'tablet'
      os: string;
      browser: string;
    };
    geo?: {
      country: string;
      region: string;
      city: string;
    };
    campaign?: {
      source?: string;
      medium?: string;
      campaign?: string;
      term?: string;
      content?: string;
    };
  };
}
```

### Standard Event Types

| Category | Event Types |
|----------|-------------|
| **Navigation** | page_view, page_exit, scroll_depth |
| **User** | user_signed_up, user_logged_in, user_logged_out, profile_updated |
| **E-commerce** | product_viewed, product_added_to_cart, checkout_started, order_completed |
| **Engagement** | button_clicked, form_submitted, search_performed, video_played |
| **Marketing** | email_opened, email_clicked, campaign_viewed, banner_clicked |

---

## Attribution Models

The analytics module supports 5 attribution models:

1. **First Touch**: 100% credit to first touchpoint
2. **Last Touch**: 100% credit to last touchpoint
3. **Linear**: Equal credit to all touchpoints
4. **Time Decay**: More credit to recent touchpoints (7-day half-life)
5. **Position Based**: 40% first, 40% last, 20% middle

---

## Experimentation

### Deterministic Assignment

User assignment is deterministic using SHA-256 hashing:

```typescript
// Assignment is always the same for (experimentId, userId)
const bucket = hash(`${experimentId}:${userId}`) % 100;
const variant = variants.find(v => bucket < v.cumulativeWeight);
```

### Statistical Significance

Results include statistical analysis:

```typescript
interface ExperimentResults {
  experiment_id: string;
  variants: Array<{
    id: string;
    name: string;
    participants: number;
    conversions: number;
    conversion_rate: number;
    confidence_interval: [number, number];
  }>;
  winner?: string;
  is_significant: boolean;  // p < 0.05
  p_value: number;
  lift: number;             // % improvement
  sample_size_needed: number;
}
```

---

## Performance Targets

| Metric | Target |
|--------|--------|
| Event ingestion | < 50ms p99 |
| Feature flag evaluation | < 10ms p99 |
| Dashboard queries | < 500ms p95 |
| Real-time delay | < 1 second |
| Email delivery | < 5 seconds |

---

## Monitoring

All services expose Prometheus metrics:

```
# Event ingestion
marketing_events_ingested_total
marketing_events_ingestion_latency_seconds

# Feature flags
marketing_feature_flags_evaluated_total
marketing_feature_flags_evaluation_latency_seconds

# Email
marketing_emails_sent_total
marketing_emails_delivery_rate

# Analytics queries
marketing_analytics_query_latency_seconds
marketing_analytics_query_errors_total
```

---

## Security

### Authentication

All endpoints require JWT authentication except:
- `/marketing/seo/sitemap` (public)
- `/marketing/seo/robots` (public)
- `/marketing/seo/schema/*` (public)

### Rate Limiting

| Endpoint Pattern | Rate Limit |
|-----------------|------------|
| `/events/ingest` | 1000/min |
| `/events/batch` | 100/min |
| `/experiments/*/assign` | 10000/min |
| `/feature-flags/evaluate` | 10000/min |
| Default | 100/min |

### Data Privacy

- PII is encrypted at rest (AES-256)
- Data retention policies configurable per event type
- User deletion propagates to all analytics tables
- IP addresses anonymized by default

---

## Related Documentation

- [SEO Module Details](./seo/README.md)
- [Analytics Architecture](../../docs/architecture/analytics.md)
- [Experimentation Guide](./experiments/README.md)
- [Infrastructure Setup](../../../../infrastructure/terraform/modules/marketing/README.md)
- [Helm Charts](../../../../infrastructure/helm/charts/README.md)
