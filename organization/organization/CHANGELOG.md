# Changelog

All notable changes to the Broxiva E-Commerce Platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-01-06

### Added

#### Multi-Agent Verification System (23 Agents)
- Platform integrity verification with 70+ backend modules registered
- Identity & access architecture audit with JWT/OAuth security validation
- Backend authorization audit with IDOR vulnerability remediation
- AWS cloud security posture hardening
- DevSecOps pipeline with secret detection and SBOM generation
- Kubernetes/EKS security with Pod Security Standards
- Infrastructure HA configuration with Elasticsearch and Prometheus clustering
- Terraform IaC governance with drift detection
- CI/CD policy enforcement with staging gate requirement
- SRE observability with SLI/SLO definitions and incident runbooks
- QA test coverage expansion with impersonation and billing audit tests
- UX journey validation with friction point documentation
- Security penetration testing with business logic abuse tests
- Release governance with unified version management
- Product requirements validation (99.3% PRD compliance)
- Documentation accuracy audit across all README files

#### UI/UX Quality Verification (7 Agents)
- Visual design audit with brand consistency enforcement
- Responsive layout validation across all breakpoints (320px-1920px)
- Accessibility audit with WCAG 2.1 AA compliance
- UI interaction testing with loading state standardization
- Performance optimization with Core Web Vitals targets
- Error handling with comprehensive empty states
- Design-to-build fidelity audit with design token compliance

#### Security Enhancements
- AWS GitHub Actions OIDC provider and IAM role for secure CI/CD authentication
- CodeQL SAST (Static Application Security Testing) integration in CI/CD pipeline
- Trivy container image vulnerability scanning for all Docker images
- Enhanced CORS configuration hardening across all Python microservices
- reCAPTCHA integration for bot protection
- Admin impersonation module with audit logging
- Billing audit module for financial compliance
- Comprehensive threat models for API, Authentication, Data, and Payments
- Gitleaks secret detection in CI/CD pipeline
- SBOM (Software Bill of Materials) generation with Syft

#### Compliance & Documentation
- SBOM (Software Bill of Materials) policy documentation
- Penetration test schedule documentation
- Key person risk mitigation documentation
- Insurance coverage documentation
- Vendor DPA (Data Processing Agreement) tracker
- Email deliverability setup documentation
- Privacy policy and Terms of Service templates

#### Infrastructure
- AWS-only messaging infrastructure
- Production-ready EKS deployment configuration
- Blue-Green deployment strategy implementation
- Multi-region CDN support
- Auto-scaling configuration for all services

#### Features
- Broxiva Design System with premium dark atmospheric theme
- Rate limiting across all API controllers
- Enhanced API documentation with OpenAPI/Swagger
- Impersonation notification email templates
- About and Contact pages

#### Marketing Platform (11 Modules, 150+ Endpoints)
- **SEO & Discoverability**: Dynamic sitemaps, robots.txt, JSON-LD schemas, Core Web Vitals, keyword research
- **Content Management**: CMS with versioning, scheduling, media optimization, templates
- **Growth & Acquisition**: Campaigns, landing pages with A/B variants, referral programs, affiliates
- **Lifecycle Marketing**: Email lists, segments, event triggers, drip campaigns, broadcasts
- **Self-Hosted Analytics**: Event ingestion, funnel analysis, cohort retention, multi-touch attribution
- **Personalization**: User profiles, personalization rules, next-best-action recommendations
- **Experimentation**: A/B testing with deterministic assignment, feature flags, statistical significance
- **Reputation Management**: Reviews, testimonials, NPS/CSAT surveys, social proof widgets
- **Localization**: Geo pricing, currency conversion, PPP adjustments, market configuration
- **Commerce Integration**: Upsells, cross-sells, coupons, banners, exit-intent popups, in-app messaging
- **AI Marketing**: Lead scoring, churn prediction, content generation, lookalike audiences

#### Marketing Infrastructure (AWS Native)
- 7 Terraform modules for AWS infrastructure (eks-namespaces, data-layer, messaging, data-lake, email, cdn, iam)
- 9 Helm charts for Kubernetes deployment
- 8 dedicated Kubernetes namespaces with resource quotas and network policies
- 8 IRSA roles with least-privilege IAM policies
- OpenSearch cluster for analytics data
- DynamoDB tables for real-time features
- Kinesis/Firehose pipeline for event streaming
- SES integration for email marketing

### Changed

#### API Improvements
- Upgraded rate limiting and API documentation for Returns and Marketing controllers
- Enhanced LLM implementation for AI services
- Improved error handling and validation across all endpoints

#### Infrastructure Updates
- Unified release schedule (Tuesday January 6, 2026 at 9:00 PM CST)
- Disabled Docker cache for builds to prevent stale code deployment
- Expanded HTTPS redirect skip for health endpoints
- Updated CORS security headers for cross-origin API access

#### Package Updates
- Unified all package versions to 2.0.0 for consistency
- Updated Node.js requirement to >=20.0.0
- Updated pnpm requirement to >=10.0.0

### Fixed

#### Security Fixes (Multi-Agent Verification)
- Fixed 5 IDOR vulnerabilities in Products, Returns, Billing Audit, Search controllers
- Fixed password reset DTO missing strong password validation
- Fixed mobile logout not blacklisting JWT tokens
- Fixed 4 overly permissive security groups (0.0.0.0/0 egress)
- Fixed missing AdminGuard on billing audit and search index endpoints
- Removed exposed credentials from git tracking
- Removed hardcoded credentials from supplier-integration config
- Fixed potential security vulnerabilities in dependency chain

#### Platform Fixes (Multi-Agent Verification)
- Registered 4 missing modules: CrossBorderModule, GrowthModule, EnterpriseModule, BillingAuditModule
- Fixed AI gateway missing security contexts in Kubernetes
- Added Pod Security Standards labels to all namespaces
- Fixed Grafana deployment missing ServiceAccount reference
- Added VPA configurations for resource optimization
- Created HA Elasticsearch configuration (3-node cluster)
- Created HA Prometheus configuration with Thanos sidecar

#### UI/UX Fixes (Multi-Agent Verification)
- Fixed mobile Tailwind config color mismatch (Indigo → Purple/Violet brand)
- Added ARIA labels, focus states, screen reader support to UI components
- Added debounce/throttle utilities for click protection
- Added loading states to ProductCard component
- Fixed font loading (removed render-blocking @import)
- Added skeleton loaders for cart, checkout, account, admin pages
- Created EmptyState, NetworkStatus, RetryableError components
- Added global error boundary and 404 page
- Fixed design tokens in mobile app Tailwind config

#### Bug Fixes
- Fixed EventEmitterModule initialization in root AppModule
- Fixed Kubernetes namespace and deployment configurations
- Fixed Firebase validation handling during initial deployment
- Fixed shipping_providers table handling
- Fixed Stripe test keys handling in production with SKIP_PRODUCTION_VALIDATION flag
- Fixed SubscriptionsModule import into ProductsModule for guard DI
- Fixed API 404 errors caused by module initialization issues

#### Infrastructure Fixes
- Added staging deployment gate before production
- Removed mutable 'latest' tags from Docker builds
- Added Alertmanager and Elasticsearch to Prometheus scrape config
- Reverted to AMD64 Docker builds with x86 node group support in EKS
- Fixed Terraform formatting and configuration issues
- Fixed Docker cache issues causing stale code deployment

### Security

- Implemented AWS OIDC federation for GitHub Actions (replacing long-lived credentials)
- Added CodeQL security analysis with security-and-quality query suite
- Implemented container image scanning with Trivy (blocking CRITICAL/HIGH vulnerabilities)
- Enhanced rate limiting across all API endpoints
- Added comprehensive audit logging for sensitive operations

### Deprecated

- N/A

### Removed

- Removed legacy Azure deployment configurations (migrated to AWS-only)
- Removed hardcoded credentials and secrets from codebase

---

## [1.0.0] - 2024-12-01

### Added

- Initial release of Broxiva E-Commerce Platform
- Core e-commerce functionality (products, orders, payments)
- User authentication and authorization
- Admin dashboard
- Mobile application (iOS/Android via Expo)
- AI-powered recommendation engine
- Search service with Elasticsearch
- Fraud detection service
- Notification service
- Analytics service
- Inventory management
- Pricing engine
- Chatbot service
- Media service for asset management
- Supplier integration service

### Infrastructure

- Kubernetes deployment configuration
- Docker containerization for all services
- CI/CD pipeline with GitHub Actions
- Terraform infrastructure as code
- Redis caching layer
- PostgreSQL database with Prisma ORM

---

## Version History Summary

| Version | Date | Type | Description |
|---------|------|------|-------------|
| 2.0.0 | 2026-01-06 | Major | Security hardening, compliance, unified release |
| 1.0.0 | 2024-12-01 | Major | Initial platform release |

---

## Upgrade Guide

### From 1.x to 2.0.0

1. **Environment Variables**: Review new required environment variables:
   - `AWS_ROLE_ARN` - For OIDC authentication
   - `RECAPTCHA_SITE_KEY` and `RECAPTCHA_SECRET_KEY` - For bot protection

2. **Database Migrations**: Run Prisma migrations:
   ```bash
   pnpm db:migrate:deploy
   ```

3. **Docker Images**: All images now require vulnerability scanning to pass before deployment

4. **CORS Configuration**: Review CORS settings if you have custom frontend domains

5. **Rate Limiting**: All API endpoints now have rate limiting enabled by default

---

## Contributing

When contributing changes, please update this CHANGELOG following the Keep a Changelog format:

1. Add your changes under the `[Unreleased]` section
2. Categorize changes: Added, Changed, Deprecated, Removed, Fixed, Security
3. Include PR/issue references where applicable
4. Keep descriptions clear and concise
