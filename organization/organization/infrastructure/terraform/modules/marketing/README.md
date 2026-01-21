# Broxiva Marketing Infrastructure Module

This Terraform module creates the complete AWS infrastructure for the Broxiva E-Commerce Platform's marketing capabilities.

## Architecture Overview

The marketing infrastructure consists of seven sub-modules:

### 1. EKS Namespaces (`eks-namespaces/`)
Creates Kubernetes namespaces for marketing services:
- `broxiva-seo` - SEO services (sitemap generation, crawl management)
- `broxiva-content` - Content management services
- `broxiva-analytics` - Marketing analytics and tracking
- `broxiva-personalization` - Personalization engine
- `broxiva-lifecycle` - Customer lifecycle marketing
- `broxiva-growth` - Growth engineering and experimentation
- `broxiva-commerce` - Commerce marketing integrations
- `broxiva-ai-marketing` - AI/ML marketing services

### 2. Data Layer (`data-layer/`)
- **OpenSearch** - Search and analytics engine
- **DynamoDB Tables**:
  - `marketing-events` - High-scale event ingestion
  - `experiments` - A/B test assignments
  - `feature-flags` - Feature flag evaluations
  - `user-profiles` - Personalization data
- **ElastiCache Redis** - High-performance caching

### 3. Messaging (`messaging/`)
- **EventBridge** - Marketing event bus
- **SQS Queues**:
  - `seo-crawl-queue` - SEO crawl jobs
  - `email-send-queue` - Email dispatch (FIFO)
  - `analytics-events-queue` - Analytics ingestion
  - `experiment-events-queue` - Experiment tracking
- **SNS Topics** - Event fanout

### 4. Data Lake (`data-lake/`)
- **Kinesis Data Streams** - Real-time event streaming
- **Kinesis Firehose** - S3 delivery with Parquet conversion
- **S3 Buckets** - Raw and curated data storage
- **Glue Catalog** - Data catalog and ETL jobs
- **Athena** - SQL analytics workgroup

### 5. Email (`email/`)
- **SES Domain Identity** - Email sending domain
- **SES Configuration Set** - Tracking and reputation
- **Email Templates** - Pre-built marketing templates
- **Event Destinations** - SNS, CloudWatch, Firehose

### 6. CDN (`cdn/`)
- **CloudFront Distribution** - Global content delivery
- **S3 Origins** - SEO files and marketing assets
- **Cache Policies** - Optimized for SEO and static assets
- **CloudFront Functions** - URL rewriting

### 7. IAM (`iam/`)
- **IRSA Roles** - Per-service IAM roles with least privilege

## Usage

```hcl
module "marketing" {
  source = "./modules/marketing"

  project_name = "broxiva"
  environment  = "prod"

  # Network
  vpc_id                 = module.vpc.vpc_id
  vpc_cidr               = module.vpc.vpc_cidr_block
  opensearch_subnet_ids  = module.vpc.private_subnet_ids
  elasticache_subnet_ids = module.vpc.private_subnet_ids

  # EKS OIDC
  oidc_provider_arn = module.eks.oidc_provider_arn
  oidc_provider_url = module.eks.oidc_provider_url

  # Data Layer
  opensearch_master_user_arn = aws_iam_role.admin.arn
  elasticache_auth_token     = var.redis_auth_token

  # Email
  email_domain       = "broxiva.com"
  ses_from_addresses = ["noreply@broxiva.com", "marketing@broxiva.com"]

  # CDN
  cdn_domain_aliases      = ["cdn.broxiva.com", "assets.broxiva.com"]
  cdn_acm_certificate_arn = aws_acm_certificate.cdn.arn

  # Monitoring
  alarm_sns_topic_arn = aws_sns_topic.alerts.arn

  common_tags = {
    Project     = "broxiva"
    Environment = "prod"
    Team        = "marketing"
  }
}
```

## Requirements

| Name | Version |
|------|---------|
| terraform | >= 1.5.0 |
| aws | >= 5.0.0 |
| kubernetes | >= 2.23.0 |

## Security Features

- **KMS Encryption** - All data encrypted at rest with customer-managed keys
- **Network Security** - Security groups with least-privilege access
- **IRSA** - Pod-level IAM roles for Kubernetes
- **Network Policies** - Namespace isolation
- **TLS** - Encryption in transit for all services

## DNS Records Required

After deployment, configure these DNS records for SES:

```
# Domain Verification
_amazonses.example.com TXT <verification_token>

# DKIM (3 records)
<token1>._domainkey.example.com CNAME <token1>.dkim.amazonses.com
<token2>._domainkey.example.com CNAME <token2>.dkim.amazonses.com
<token3>._domainkey.example.com CNAME <token3>.dkim.amazonses.com

# Mail From
mail.example.com MX 10 feedback-smtp.<region>.amazonses.com
mail.example.com TXT "v=spf1 include:amazonses.com ~all"
```

## Outputs

The module exports comprehensive outputs for integration:

- `namespaces` - Kubernetes namespace names
- `data_layer` - OpenSearch, Redis, DynamoDB endpoints
- `messaging` - SQS queues, SNS topics, EventBridge
- `data_lake` - Kinesis, S3, Glue, Athena
- `email` - SES configuration, DNS records
- `cdn` - CloudFront distribution, S3 buckets
- `irsa_roles` - IAM role ARNs for services

## Cost Optimization

- Use `ON_DEMAND` Kinesis mode for variable workloads
- Configure S3 lifecycle policies for data archival
- Use CloudFront `PriceClass_100` for cost optimization
- Enable DynamoDB auto-scaling (pay-per-request mode)

## License

Proprietary - Broxiva E-Commerce Platform
