# Sentry Debugging Workflows

## Overview

This guide provides actionable debugging workflows for common issues detected by Sentry in the Broxiva platform. It includes step-by-step investigation procedures, common patterns, and resolution strategies.

## Table of Contents

- [General Investigation Process](#general-investigation-process)
- [Backend Error Workflows](#backend-error-workflows)
- [Frontend Error Workflows](#frontend-error-workflows)
- [Performance Issue Workflows](#performance-issue-workflows)
- [Database Issue Workflows](#database-issue-workflows)
- [Payment Error Workflows](#payment-error-workflows)
- [Authentication Error Workflows](#authentication-error-workflows)
- [Common Error Patterns](#common-error-patterns)
- [Post-Incident Analysis](#post-incident-analysis)

---

## General Investigation Process

### Initial Triage (First 5 Minutes)

#### Step 1: Assess Severity and Impact

```
Questions to Answer:
1. How many users are affected?
2. What is the error frequency?
3. Is this a new error or regression?
4. What environment is affected?
5. Is revenue/business-critical function impacted?
```

**Sentry Dashboard Checks:**
- View issue details page
- Check "Affected Users" count
- Review "Events" graph for trends
- Check "First Seen" and "Last Seen" timestamps
- Review environment tag (production vs staging)

#### Step 2: Gather Context

**Navigate to Issue → Tags:**
- `release`: Which version introduced the error?
- `environment`: production, staging, or development?
- `user.id`: Specific users affected?
- `transaction`: Which API endpoint/page?
- `http.status_code`: Response status
- `browser.name`: (Frontend) Browser info
- `os.name`: (Mobile) Operating system

**Navigate to Issue → Breadcrumbs:**
- Review user actions leading to error
- Check API calls made before error
- Review database queries executed
- Check authentication events

**Navigate to Issue → Additional Data:**
- Request headers
- Query parameters
- Request body (if available)
- User agent
- IP address (if not scrubbed)

#### Step 3: Check for Related Issues

**Look For:**
- Similar errors in same release
- Spike in related error types
- Recent deployments or config changes
- External service outages

**Sentry Searches:**
```
# Similar errors in same transaction
transaction:"POST /api/checkout" is:unresolved

# Errors from same release
release:"broxiva-backend@2.0.0" is:unresolved

# Recent errors (last hour)
firstSeen:-1h is:unresolved

# Errors affecting multiple users
user.count:>=10 is:unresolved
```

#### Step 4: Determine Root Cause Category

| Category | Indicators | Priority | Team |
|----------|-----------|----------|------|
| Code Bug | Stack trace in application code | High | Dev Team |
| Dependency Issue | Error in third-party library | Medium | Dev Team |
| Infrastructure | Database/Redis/Network errors | Critical | DevOps |
| Configuration | Missing env vars, wrong settings | High | DevOps |
| User Input | Validation errors, malformed data | Low | Product |
| External API | Stripe, payment gateway errors | High | Dev Team |
| Security | Suspicious patterns, DDoS | Critical | Security |

---

## Backend Error Workflows

### Workflow 1: Unhandled Exception

**Symptom:** Error in Sentry with complete stack trace, level: error/fatal

#### Investigation Steps

1. **Review Stack Trace**
   ```
   Navigate to: Issue → Stack Trace

   Look for:
   - Top frame (where error occurred)
   - Application code frames (your code)
   - Library frames (third-party)
   - Entry point (HTTP handler, cron job, etc.)
   ```

2. **Reproduce Locally**
   ```bash
   # Get error details
   - Request method: GET/POST/PUT/DELETE
   - URL path: /api/checkout
   - Request body: Check Additional Data
   - Headers: Check Additional Data

   # Reproduce with curl
   curl -X POST http://localhost:4000/api/checkout \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer $TOKEN" \
     -d '{"items": [...]}'
   ```

3. **Check Recent Changes**
   ```bash
   # Find commits in problematic release
   git log --oneline v1.9.0..v2.0.0 -- apps/api/src/modules/checkout

   # Review specific file history
   git log -p apps/api/src/modules/checkout/checkout.service.ts
   ```

4. **Add Debug Logging**
   ```typescript
   // apps/api/src/modules/checkout/checkout.service.ts

   async createOrder(orderData: CreateOrderDto) {
     this.logger.debug('Creating order', { orderData });

     try {
       const order = await this.orderRepository.create(orderData);
       this.logger.debug('Order created successfully', { orderId: order.id });
       return order;
     } catch (error) {
       this.logger.error('Failed to create order', {
         error: error.message,
         stack: error.stack,
         orderData,
       });
       throw error;
     }
   }
   ```

5. **Implement Fix**
   ```typescript
   // Add validation
   if (!orderData.items || orderData.items.length === 0) {
     throw new BadRequestException('Order must contain at least one item');
   }

   // Add null checks
   const user = await this.userRepository.findById(userId);
   if (!user) {
     throw new NotFoundException(`User ${userId} not found`);
   }

   // Add error handling
   try {
     await this.paymentService.charge(amount);
   } catch (error) {
     this.logger.error('Payment failed', { error, orderId });
     throw new PaymentFailedException(error.message);
   }
   ```

6. **Deploy and Verify**
   ```bash
   # Deploy fix
   npm run build
   npm run deploy

   # Monitor Sentry
   # Navigate to: Issues → Search for issue
   # Check "Last Seen" timestamp
   # Verify error stopped after deployment
   ```

### Workflow 2: Database Connection Errors

**Symptom:** Prisma/Database connection errors, timeouts, pool exhaustion

#### Investigation Steps

1. **Check Database Health**
   ```bash
   # Connect to database
   psql $DATABASE_URL

   # Check connections
   SELECT count(*) as connections,
          state,
          wait_event_type
   FROM pg_stat_activity
   GROUP BY state, wait_event_type;

   # Check slow queries
   SELECT pid, now() - query_start as duration, query
   FROM pg_stat_activity
   WHERE state = 'active'
   ORDER BY duration DESC
   LIMIT 10;

   # Check locks
   SELECT * FROM pg_locks WHERE NOT granted;
   ```

2. **Check Connection Pool**
   ```typescript
   // Check Prisma connection pool settings
   // apps/api/prisma/schema.prisma

   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")

     // Connection pool settings
     connectionLimit = 10  // Check if too low
   }
   ```

3. **Check for Connection Leaks**
   ```typescript
   // Add connection lifecycle logging

   import { PrismaClient } from '@prisma/client';

   const prisma = new PrismaClient({
     log: [
       { level: 'query', emit: 'event' },
       { level: 'error', emit: 'event' },
       { level: 'info', emit: 'event' },
       { level: 'warn', emit: 'event' },
     ],
   });

   prisma.$on('query', (e) => {
     console.log('Query: ' + e.query);
     console.log('Duration: ' + e.duration + 'ms');
   });
   ```

4. **Check Application Metrics**
   ```bash
   # Check Redis for connection stats
   redis-cli INFO stats

   # Check application logs
   kubectl logs -n production deployment/broxiva-backend --tail=100

   # Check resource usage
   kubectl top pods -n production
   ```

5. **Implement Fix**
   ```typescript
   // Increase connection pool size
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
     connectionLimit = 20  // Increased from 10
   }

   // Add connection timeout
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
     connectionLimit = 20
     pool_timeout = 30  // 30 seconds
   }

   // Ensure connections are properly closed
   async function processData() {
     try {
       await prisma.$transaction(async (tx) => {
         // Database operations
       });
     } finally {
       await prisma.$disconnect();  // Always disconnect
     }
   }
   ```

6. **Scale Database if Needed**
   ```bash
   # Check if database is at capacity
   # Consider:
   # - Vertical scaling (more CPU/RAM)
   # - Read replicas for read-heavy workloads
   # - Connection pooling with PgBouncer
   # - Query optimization
   ```

---

## Frontend Error Workflows

### Workflow 1: JavaScript Runtime Errors

**Symptom:** Uncaught exceptions in browser, undefined variables, null references

#### Investigation Steps

1. **Review Error Context**
   ```
   Navigate to: Issue → Details

   Check:
   - Error message
   - Stack trace (with source maps)
   - Browser and version
   - Page URL where error occurred
   - User actions (breadcrumbs)
   ```

2. **Check Session Replay**
   ```
   Navigate to: Issue → Replays

   Watch session replay to:
   - See exact user actions leading to error
   - Identify UI state when error occurred
   - Check for race conditions
   - Verify user's workflow
   ```

3. **Check Browser Compatibility**
   ```
   Navigate to: Issue → Tags → browser.name

   Questions:
   - Is this specific to one browser?
   - Is this an older browser version?
   - Are we using unsupported features?
   ```

4. **Reproduce Issue**
   ```bash
   # Run development server
   cd apps/web
   npm run dev

   # Open browser console
   # Navigate to problematic page
   # Follow steps from session replay
   # Check console for errors
   ```

5. **Check Source Maps**
   ```bash
   # Verify source maps uploaded
   ls .next/static/chunks/*.map

   # Check Sentry for source maps
   # Navigate to: Project Settings → Source Maps

   # If missing, re-upload
   npm run build
   sentry-cli sourcemaps upload \
     --org broxiva \
     --project broxiva-web-prod \
     --release broxiva-web@2.0.0 \
     .next/static/chunks
   ```

6. **Implement Fix**
   ```typescript
   // Add null checks
   function displayUserName() {
     const user = getUser();
     if (!user || !user.name) {
       console.warn('User or user.name is undefined');
       return 'Guest';
     }
     return user.name;
   }

   // Add try-catch for async operations
   async function fetchData() {
     try {
       const response = await fetch('/api/data');
       const data = await response.json();
       return data;
     } catch (error) {
       console.error('Failed to fetch data:', error);
       // Show user-friendly error message
       toast.error('Failed to load data. Please try again.');
       return null;
     }
   }

   // Add error boundary
   class ErrorBoundary extends React.Component {
     componentDidCatch(error, errorInfo) {
       Sentry.captureException(error, { extra: errorInfo });
     }

     render() {
       if (this.state.hasError) {
         return <div>Something went wrong. Please refresh.</div>;
       }
       return this.props.children;
     }
   }
   ```

### Workflow 2: Performance Issues (Core Web Vitals)

**Symptom:** Slow page loads, high LCP/FID/CLS, user complaints about performance

#### Investigation Steps

1. **Check Performance Dashboard**
   ```
   Navigate to: Performance → Web Vitals

   Review:
   - LCP (Largest Contentful Paint): Target < 2.5s
   - FID (First Input Delay): Target < 100ms
   - CLS (Cumulative Layout Shift): Target < 0.1
   ```

2. **Identify Slow Pages**
   ```
   Navigate to: Performance → Pages

   Sort by: P75 LCP descending

   Identify:
   - Which pages are slowest?
   - Are they product pages? Checkout? Home?
   - Common patterns?
   ```

3. **Analyze Specific Transaction**
   ```
   Navigate to: Performance → Transaction Details

   Check:
   - Waterfall view
   - Resource timings
   - JavaScript bundles
   - API requests
   - Image loads
   ```

4. **Run Lighthouse Audit**
   ```bash
   # Install Lighthouse CLI
   npm install -g lighthouse

   # Run audit
   lighthouse https://broxiva.com/products/123 \
     --output=html \
     --output-path=./lighthouse-report.html

   # Review recommendations
   open lighthouse-report.html
   ```

5. **Check Bundle Size**
   ```bash
   # Analyze bundle
   cd apps/web
   npm run build

   # Use webpack-bundle-analyzer
   npx webpack-bundle-analyzer .next/static/chunks/*.js
   ```

6. **Implement Optimizations**
   ```typescript
   // Lazy load components
   const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
     loading: () => <Spinner />,
     ssr: false,
   });

   // Optimize images
   import Image from 'next/image';

   <Image
     src="/product.jpg"
     width={500}
     height={500}
     priority  // For above-the-fold images
     placeholder="blur"
   />

   // Code splitting
   const routes = [
     {
       path: '/admin',
       component: lazy(() => import('./pages/admin')),
     },
   ];

   // Preload critical resources
   <link
     rel="preload"
     href="/fonts/primary.woff2"
     as="font"
     type="font/woff2"
     crossOrigin="anonymous"
   />

   // Defer non-critical scripts
   <Script
     src="/analytics.js"
     strategy="lazyOnload"
   />
   ```

---

## Performance Issue Workflows

### Workflow 1: Slow API Endpoints

**Symptom:** High P95 response times, timeout errors, user complaints

#### Investigation Steps

1. **Identify Slow Endpoints**
   ```
   Navigate to: Performance → Transactions

   Sort by: P95 Duration descending

   Identify:
   - Which endpoints are slowest?
   - Are they database-heavy? External API calls?
   - Time of day patterns?
   ```

2. **Analyze Transaction**
   ```
   Navigate to: Performance → Transaction Details → [Endpoint]

   Check:
   - Span waterfall
   - Database query times
   - External HTTP calls
   - Redis operations
   ```

3. **Check for N+1 Queries**
   ```typescript
   // Bad: N+1 query
   const users = await prisma.user.findMany();
   for (const user of users) {
     const orders = await prisma.order.findMany({
       where: { userId: user.id }
     });
     user.orders = orders;  // N additional queries!
   }

   // Good: Single query with include
   const users = await prisma.user.findMany({
     include: {
       orders: true,
     }
   });
   ```

4. **Profile Database Queries**
   ```sql
   -- Enable query logging (temporarily)
   ALTER DATABASE broxiva SET log_statement = 'all';

   -- Check slow queries
   SELECT query, mean_exec_time, calls
   FROM pg_stat_statements
   ORDER BY mean_exec_time DESC
   LIMIT 10;

   -- Explain query plan
   EXPLAIN ANALYZE
   SELECT * FROM products
   WHERE category_id = 123
   ORDER BY created_at DESC
   LIMIT 20;
   ```

5. **Add Missing Indexes**
   ```sql
   -- Check for missing indexes
   SELECT schemaname, tablename, attname
   FROM pg_stats
   WHERE schemaname = 'public'
     AND n_distinct > 10
     AND NOT EXISTS (
       SELECT 1 FROM pg_index
       WHERE indrelid = (schemaname || '.' || tablename)::regclass
         AND attname = ANY(string_to_array(indkey::text, ' ')::int[])
     );

   -- Add index
   CREATE INDEX CONCURRENTLY idx_products_category_created
   ON products(category_id, created_at DESC);
   ```

6. **Implement Caching**
   ```typescript
   import { Injectable } from '@nestjs/common';
   import { RedisService } from '@common/redis/redis.service';

   @Injectable()
   export class ProductService {
     constructor(private redis: RedisService) {}

     async getProduct(id: string) {
       // Check cache first
       const cached = await this.redis.get(`product:${id}`);
       if (cached) {
         return JSON.parse(cached);
       }

       // Fetch from database
       const product = await this.prisma.product.findUnique({
         where: { id },
         include: { category: true, images: true },
       });

       // Cache for 1 hour
       await this.redis.setex(
         `product:${id}`,
         3600,
         JSON.stringify(product)
       );

       return product;
     }
   }
   ```

7. **Add Background Processing**
   ```typescript
   // Instead of synchronous processing
   async function processOrder(orderId: string) {
     await sendConfirmationEmail(orderId);  // Slow
     await updateInventory(orderId);  // Slow
     await notifyVendor(orderId);  // Slow
     return { success: true };
   }

   // Use background jobs
   async function processOrder(orderId: string) {
     // Quick response
     await this.orderQueue.add('process-order', {
       orderId,
       tasks: ['email', 'inventory', 'notify'],
     });
     return { success: true, queued: true };
   }
   ```

---

## Database Issue Workflows

### Workflow 1: Deadlocks

**Symptom:** "deadlock detected" errors, locked transactions

#### Investigation Steps

1. **Check Deadlock Details**
   ```sql
   -- View recent deadlocks
   SELECT * FROM pg_stat_database_conflicts
   WHERE datname = 'broxiva_prod';

   -- Check locks
   SELECT
     l.locktype,
     l.relation::regclass,
     l.mode,
     l.pid,
     a.usename,
     a.query
   FROM pg_locks l
   JOIN pg_stat_activity a ON l.pid = a.pid
   WHERE NOT l.granted;
   ```

2. **Identify Lock Patterns**
   ```typescript
   // Common deadlock pattern: updating in different orders

   // Transaction 1:
   await prisma.$transaction([
     prisma.product.update({ where: { id: 'A' } }),  // Lock A
     prisma.product.update({ where: { id: 'B' } }),  // Wait for B
   ]);

   // Transaction 2 (concurrent):
   await prisma.$transaction([
     prisma.product.update({ where: { id: 'B' } }),  // Lock B
     prisma.product.update({ where: { id: 'A' } }),  // Wait for A → DEADLOCK
   ]);
   ```

3. **Fix: Consistent Ordering**
   ```typescript
   // Always acquire locks in consistent order
   async function updateProducts(productIds: string[]) {
     // Sort to ensure consistent order
     const sortedIds = productIds.sort();

     await prisma.$transaction(
       sortedIds.map(id =>
         prisma.product.update({
           where: { id },
           data: { /* ... */ },
         })
       )
     );
   }
   ```

4. **Fix: Use SELECT FOR UPDATE**
   ```typescript
   await prisma.$transaction(async (tx) => {
     // Explicitly lock rows
     const products = await tx.$queryRaw`
       SELECT * FROM products
       WHERE id = ANY(${productIds})
       FOR UPDATE
     `;

     // Now safely update
     for (const product of products) {
       await tx.product.update({
         where: { id: product.id },
         data: { /* ... */ },
       });
     }
   });
   ```

---

## Payment Error Workflows

### Workflow 1: Stripe Payment Failures

**Symptom:** Payment declined, insufficient funds, card errors

#### Investigation Steps

1. **Check Sentry Error Details**
   ```
   Navigate to: Issue → Additional Data

   Check:
   - Stripe error code
   - Stripe error message
   - Payment method type
   - Amount
   - Currency
   ```

2. **Check Stripe Dashboard**
   ```
   1. Login to Stripe Dashboard
   2. Navigate to: Payments → All Payments
   3. Search for: Customer ID or Payment Intent
   4. Check payment timeline
   5. Review error details
   ```

3. **Common Stripe Errors**

   | Error Code | Meaning | Resolution |
   |-----------|---------|------------|
   | card_declined | Card declined by bank | Ask user to contact bank or try different card |
   | insufficient_funds | Insufficient funds | User needs to add funds or use different card |
   | expired_card | Card expired | Update card details |
   | incorrect_cvc | Wrong CVC code | Re-enter CVC |
   | processing_error | Temporary Stripe issue | Retry payment |
   | rate_limit | Too many API calls | Implement backoff, contact Stripe |

4. **Implement Better Error Handling**
   ```typescript
   import Stripe from 'stripe';

   async function processPayment(amount: number, paymentMethodId: string) {
     try {
       const paymentIntent = await stripe.paymentIntents.create({
         amount: amount * 100,  // Convert to cents
         currency: 'usd',
         payment_method: paymentMethodId,
         confirm: true,
       });

       return { success: true, paymentIntent };

     } catch (error) {
       if (error instanceof Stripe.errors.StripeCardError) {
         // Card was declined
         return {
           success: false,
           error: {
             type: 'card_error',
             code: error.code,
             message: this.getUserFriendlyMessage(error.code),
             decline_code: error.decline_code,
           },
         };
       } else if (error instanceof Stripe.errors.StripeRateLimitError) {
         // Rate limit exceeded
         this.logger.error('Stripe rate limit exceeded', { error });
         throw new ServiceUnavailableException('Payment service temporarily unavailable');
       } else if (error instanceof Stripe.errors.StripeInvalidRequestError) {
         // Invalid parameters
         this.logger.error('Invalid Stripe request', { error });
         throw new BadRequestException('Invalid payment details');
       } else {
         // Generic error
         this.logger.error('Stripe error', { error });
         throw new InternalServerErrorException('Payment processing failed');
       }
     }
   }

   private getUserFriendlyMessage(code: string): string {
     const messages = {
       card_declined: 'Your card was declined. Please try a different card.',
       insufficient_funds: 'Insufficient funds. Please use a different card.',
       expired_card: 'Your card has expired. Please update your card details.',
       incorrect_cvc: 'Incorrect CVC code. Please re-enter.',
       processing_error: 'Payment processing error. Please try again.',
     };

     return messages[code] || 'Payment failed. Please try again or contact support.';
   }
   ```

5. **Add Idempotency**
   ```typescript
   // Prevent duplicate charges
   async function processPayment(orderId: string, amount: number) {
     const paymentIntent = await stripe.paymentIntents.create({
       amount: amount * 100,
       currency: 'usd',
       idempotency_key: `order_${orderId}`,  // Ensure idempotency
     });

     return paymentIntent;
   }
   ```

---

## Authentication Error Workflows

### Workflow 1: JWT Token Errors

**Symptom:** "Invalid token", "Token expired", authentication failures

#### Investigation Steps

1. **Check Token Details**
   ```
   Navigate to: Issue → Additional Data

   Check:
   - Error message
   - Token expiration time
   - User ID
   - Request endpoint
   ```

2. **Verify JWT Configuration**
   ```bash
   # Check environment variables
   echo $JWT_SECRET
   echo $JWT_EXPIRATION
   echo $JWT_REFRESH_SECRET
   echo $JWT_REFRESH_EXPIRATION

   # Ensure secrets are:
   # - Minimum 64 characters
   # - Different for JWT_SECRET and JWT_REFRESH_SECRET
   # - Not committed to Git
   ```

3. **Debug Token**
   ```typescript
   import * as jwt from 'jsonwebtoken';

   try {
     const decoded = jwt.verify(token, process.env.JWT_SECRET);
     console.log('Token valid', decoded);
   } catch (error) {
     if (error.name === 'TokenExpiredError') {
       console.log('Token expired at:', error.expiredAt);
     } else if (error.name === 'JsonWebTokenError') {
       console.log('Invalid token:', error.message);
     }
   }
   ```

4. **Check for Clock Skew**
   ```bash
   # Check server time
   date

   # Sync with NTP
   sudo ntpdate -s time.nist.gov

   # Verify timezone
   timedatectl
   ```

5. **Implement Token Refresh**
   ```typescript
   async function refreshAccessToken(refreshToken: string) {
     try {
       // Verify refresh token
       const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

       // Issue new access token
       const newAccessToken = jwt.sign(
         { userId: payload.userId },
         process.env.JWT_SECRET,
         { expiresIn: '1h' }
       );

       return { accessToken: newAccessToken };

     } catch (error) {
       throw new UnauthorizedException('Invalid refresh token');
     }
   }
   ```

---

## Common Error Patterns

### Pattern 1: Spike After Deployment

**Symptoms:**
- New errors after deployment
- Error rate increases suddenly
- Specific to new release

**Investigation:**
```bash
# Compare releases
# Navigate to: Issues → Compare [old-release] vs [new-release]

# Check commits in release
git log v1.9.0..v2.0.0 --oneline

# Review specific changes
git diff v1.9.0 v2.0.0 -- apps/api/src/modules/checkout
```

**Resolution:**
1. Identify problematic commit
2. Create hotfix or revert
3. Deploy fix
4. Verify error stops
5. Schedule proper fix for next release

### Pattern 2: Time-Based Errors

**Symptoms:**
- Errors occur at specific times
- Correlated with high traffic
- Timeout errors

**Investigation:**
- Check traffic patterns
- Review resource utilization
- Check for scheduled jobs
- Review database query times during peak

**Resolution:**
- Scale infrastructure
- Optimize slow queries
- Add caching
- Implement rate limiting
- Reschedule heavy jobs

### Pattern 3: User-Specific Errors

**Symptoms:**
- Errors affect specific users
- Not reproducible by team
- Intermittent

**Investigation:**
```
Navigate to: Issue → Filter by user
Check user profile:
- Browser version
- Location
- Account state
- Permissions
```

**Resolution:**
- Contact user for more details
- Test with user's specific data
- Check for edge cases in user data
- Add validation/error handling

---

## Post-Incident Analysis

### Incident Documentation Template

After resolving a critical issue, document the incident:

```markdown
# Incident Report: [Title]

## Summary
- **Date:** 2024-12-04
- **Duration:** 45 minutes
- **Severity:** High
- **Impact:** 1,500 users affected

## Timeline
- 14:30 UTC: Error first detected in Sentry
- 14:35 UTC: On-call engineer paged
- 14:40 UTC: Root cause identified
- 14:50 UTC: Fix deployed to production
- 15:15 UTC: Verified issue resolved

## Root Cause
Database connection pool exhaustion due to connection leak in checkout service.

## Detection
- Sentry alert triggered for high error rate
- Alert sent to #incidents-critical Slack channel
- PagerDuty notification to on-call engineer

## Resolution
1. Increased database connection pool size temporarily
2. Identified connection leak in OrderService
3. Fixed: Added proper connection cleanup in finally block
4. Deployed fix
5. Monitored for 30 minutes to confirm resolution

## Prevention
- Add connection pool monitoring
- Implement connection leak detection
- Add unit tests for connection lifecycle
- Update code review checklist

## Action Items
- [ ] Add automated connection pool monitoring
- [ ] Review all services for similar patterns
- [ ] Update development guidelines
- [ ] Schedule code review session

## Lessons Learned
- Need better connection pool monitoring
- Should have caught in code review
- Need automated tests for resource cleanup
```

### Learning from Errors

**Weekly Error Review:**
1. Review top 10 errors from past week
2. Identify patterns and trends
3. Prioritize fixes
4. Update documentation
5. Share learnings with team

**Monthly Deep Dive:**
1. Analyze error trends over month
2. Identify recurring issues
3. Plan infrastructure improvements
4. Review and update alert thresholds
5. Celebrate wins (resolved issues, reduced error rates)

---

## Quick Reference

### Essential Sentry Searches

```
# All unresolved production errors
is:unresolved environment:production level:error

# Recent high-impact errors
is:unresolved user.count:>=100 firstSeen:-24h

# Errors in specific module
is:unresolved transaction:*checkout*

# Database errors
is:unresolved error.type:*Database*

# Payment errors
is:unresolved error.type:*Stripe* OR error.type:*Payment*

# Timeout errors
is:unresolved error.type:*Timeout*

# Memory errors
is:unresolved error.type:*Memory*
```

### Key Metrics to Monitor

- Error rate (errors per minute)
- Unique users affected
- P95 response time
- Database query time
- Cache hit rate
- API endpoint availability

### Escalation Matrix

| Severity | Response Time | Escalation Path |
|----------|--------------|-----------------|
| Critical | < 15 min | On-call → Team Lead → Engineering Manager |
| High | < 2 hours | Assigned Developer → Team Lead |
| Medium | < 1 day | Assigned Developer |
| Low | < 1 week | Backlog → Sprint Planning |

---

**Last Updated:** 2024-12-04
**Document Owner:** Platform Engineering Team
**Review Schedule:** Quarterly
