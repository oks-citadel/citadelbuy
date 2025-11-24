# CitadelBuy - Consolidated Project Structure

## Overview
This document defines the final consolidated structure for the CitadelBuy e-commerce platform, eliminating duplicates and organizing all components for production deployment.

## Root Directory Structure

```
citadelbuy/
├── .github/                          # GitHub workflows and actions
│   └── workflows/
│       ├── backend-ci.yml
│       ├── frontend-ci.yml
│       └── mobile-ci.yml
│
├── backend/                          # NestJS Backend API
│   ├── src/
│   │   ├── common/                   # Shared utilities
│   │   ├── modules/                  # Feature modules
│   │   │   ├── admin/
│   │   │   ├── advertisements/
│   │   │   ├── ai/                   # NEW: AI Services
│   │   │   │   ├── visual-search/
│   │   │   │   ├── conversational/
│   │   │   │   ├── personalization/
│   │   │   │   ├── chatbot/
│   │   │   │   └── pricing-engine/
│   │   │   ├── analytics/
│   │   │   ├── analytics-advanced/
│   │   │   ├── analytics-dashboard/
│   │   │   ├── auth/
│   │   │   ├── bnpl/
│   │   │   ├── cart/
│   │   │   ├── categories/
│   │   │   ├── coupons/
│   │   │   ├── deals/
│   │   │   ├── email/
│   │   │   ├── gift-cards/
│   │   │   ├── health/
│   │   │   ├── i18n/
│   │   │   ├── inventory/
│   │   │   ├── loyalty/
│   │   │   ├── mobile/
│   │   │   ├── orders/
│   │   │   ├── payments/
│   │   │   ├── platform/
│   │   │   ├── products/
│   │   │   ├── recommendations/
│   │   │   ├── returns/
│   │   │   ├── reviews/
│   │   │   ├── search/
│   │   │   ├── security/
│   │   │   ├── seo/
│   │   │   ├── shipping/
│   │   │   ├── social/
│   │   │   ├── subscriptions/
│   │   │   ├── support/
│   │   │   ├── tax/
│   │   │   ├── tracking/
│   │   │   ├── users/
│   │   │   ├── variants/
│   │   │   ├── vendors/
│   │   │   └── wishlist/
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── prisma/                       # Database schema
│   ├── test/                         # Tests
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                         # Next.js Web Application
│   ├── src/
│   │   ├── app/                      # App router pages
│   │   ├── components/               # React components
│   │   ├── config/                   # Configuration
│   │   ├── contexts/                 # React contexts
│   │   ├── hooks/                    # Custom hooks
│   │   ├── lib/                      # Utilities
│   │   ├── services/                 # API services
│   │   ├── store/                    # State management
│   │   ├── styles/                   # Global styles
│   │   └── types/                    # TypeScript types
│   ├── public/                       # Static assets
│   ├── Dockerfile
│   ├── next.config.js
│   ├── package.json
│   └── tsconfig.json
│
├── mobile/                           # NEW: React Native Mobile App
│   ├── android/                      # Android native code
│   ├── ios/                          # iOS native code
│   ├── src/
│   │   ├── components/
│   │   ├── screens/
│   │   ├── navigation/
│   │   ├── services/
│   │   ├── store/
│   │   ├── hooks/
│   │   ├── utils/
│   │   ├── types/
│   │   └── theme/
│   ├── assets/
│   ├── app.json
│   ├── package.json
│   └── tsconfig.json
│
├── infrastructure/                   # Infrastructure as Code
│   ├── docker/
│   │   ├── docker-compose.yml
│   │   └── docker-compose.prod.yml
│   ├── kubernetes/
│   │   ├── backend/
│   │   ├── frontend/
│   │   └── ingress/
│   ├── terraform/
│   │   ├── modules/
│   │   └── environments/
│   ├── ansible/
│   └── database/
│
├── docs/                             # CONSOLIDATED Documentation
│   ├── architecture/
│   │   ├── ARCHITECTURE.md
│   │   ├── BACKEND-TYPE-SAFETY.md
│   │   └── AI-ARCHITECTURE.md
│   ├── business/
│   │   ├── BUSINESS-PLAN.md
│   │   ├── EXECUTIVE-SUMMARY.md
│   │   └── GO-TO-MARKET-STRATEGY.md
│   ├── deployment/
│   │   ├── DEPLOYMENT-GUIDE.md
│   │   ├── RAILWAY-DEPLOYMENT.md
│   │   ├── DOCKER-DEPLOYMENT.md
│   │   └── QUICK-DEPLOY-REFERENCE.md
│   ├── development/
│   │   ├── DEVELOPMENT-GUIDE.md
│   │   ├── CONTRIBUTING.md
│   │   └── TESTING-GUIDE.md
│   ├── features/
│   │   ├── ADVANCED-SEARCH-SYSTEM.md
│   │   ├── AI-FEATURES-ROADMAP.md
│   │   ├── INVENTORY-MANAGEMENT.md
│   │   ├── TAX-SYSTEM.md
│   │   └── PRODUCT-VARIANTS.md
│   ├── api/
│   │   ├── API-REFERENCE.md
│   │   └── API-CREDENTIALS.md
│   ├── security/
│   │   ├── SECURITY-AUDIT.md
│   │   └── SECURITY-UPDATE-REPORT.md
│   ├── completed/                    # Historical documentation
│   ├── MASTER-INDEX.md
│   ├── DOCUMENTATION-INDEX.md
│   └── README.md
│
├── scripts/                          # Utility scripts
│   ├── deploy-docker.sh
│   ├── fix-controllers.sh
│   └── setup-dev.sh
│
├── .gitignore
├── README.md                         # Main project README
├── CHANGELOG.md
├── LICENSE
└── package.json                      # Root package.json for monorepo scripts
```

## Changes from Current Structure

### Consolidation Actions

1. **Documentation**
   - Move all root-level .md files to `docs/` with proper categorization
   - Remove duplicates between root and citadelbuy/
   - Organize by category (architecture, business, deployment, etc.)

2. **Code Organization**
   - Keep citadelbuy/ as the main project directory
   - Add mobile/ directory for React Native app
   - Add backend/src/modules/ai/ for new AI features

3. **Git Setup**
   - Initialize git repository at citadelbuy-master/
   - Configure remote: https://github.com/oks-citadel/citadelbuy
   - Create proper .gitignore

## New AI Modules to Add

### 1. Visual Search Module
Location: `backend/src/modules/ai/visual-search/`
- Image upload and processing
- Similar product matching
- Camera-based search API
- Reverse image search

### 2. Conversational Commerce Module
Location: `backend/src/modules/ai/conversational/`
- Natural language query processing
- Multi-turn conversation handling
- Intent recognition
- Context management

### 3. Personalization Engine Module
Location: `backend/src/modules/ai/personalization/`
- User behavior tracking
- Recommendation algorithms
- Dynamic content generation
- A/B testing framework

### 4. Intelligent Chatbot Module
Location: `backend/src/modules/ai/chatbot/`
- 24/7 customer support
- Sentiment analysis
- Automated responses
- Human handoff logic

### 5. Dynamic Pricing Engine Module
Location: `backend/src/modules/ai/pricing-engine/`
- Real-time price optimization
- Demand forecasting
- Competitor price monitoring
- Margin protection

## Mobile Application Structure

### Technology Stack
- React Native (iOS & Android)
- TypeScript
- Redux Toolkit (state management)
- React Navigation
- Axios (API client)
- AsyncStorage (local storage)

### Key Features
- Cross-platform support
- Offline capabilities
- Push notifications
- AR product visualization
- Voice search
- Biometric authentication

## Implementation Priority

### Phase 1: Consolidation (Current)
1. Reorganize directory structure
2. Consolidate documentation
3. Initialize git repository
4. Push to GitHub

### Phase 2: Mobile Foundation
1. Create React Native project structure
2. Set up navigation
3. Implement authentication
4. Connect to backend APIs

### Phase 3: AI Features - Product Discovery
1. Visual search service
2. Conversational commerce
3. Smart search integration

### Phase 4: AI Features - Personalization
1. Personalization engine
2. Dynamic recommendations
3. Behavioral analytics

### Phase 5: AI Features - Intelligence
1. Chatbot service
2. Sentiment analysis
3. Dynamic pricing engine

### Phase 6: Production Readiness
1. Security hardening
2. Performance optimization
3. Load testing
4. Documentation completion

## Environment Configuration

### Backend (.env)
```
DATABASE_URL=
REDIS_URL=
JWT_SECRET=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
OPENAI_API_KEY=
STRIPE_SECRET_KEY=
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=
NEXT_PUBLIC_GOOGLE_MAPS_KEY=
```

### Mobile (.env)
```
API_URL=
GOOGLE_SERVICES_JSON=
GOOGLE_SERVICES_PLIST=
```

## Deployment Strategy

### Development
- Docker Compose for local development
- Hot reload for all services
- Shared database and Redis

### Staging
- Railway for backend and frontend
- Kubernetes for infrastructure testing
- Automated CI/CD

### Production
- Multi-region Kubernetes cluster
- CDN for static assets
- Auto-scaling enabled
- Monitoring and alerting

## Next Steps

1. Execute consolidation script
2. Initialize git and push to GitHub
3. Create mobile app foundation
4. Implement AI modules one by one
5. Test end-to-end functionality
6. Deploy to production

---

*Last Updated: 2025-11-24*
*Version: 1.0*
