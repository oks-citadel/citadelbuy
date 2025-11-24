# Database Deployment Guide - Phase 30

**Date:** 2025-11-18
**Priority:** 🔴 Critical
**Status:** ✅ Ready for Deployment
**Database:** PostgreSQL 14+
**ORM:** Prisma 5.7.1

---

## 🎯 Overview

This guide covers deploying the CitadelBuy PostgreSQL database to production on Railway, including migrations, seeding, backups, and security.

---

## 📋 Table of Contents

1. [Local Testing](#local-testing)
2. [Railway Database Setup](#railway-database-setup)
3. [Production Migrations](#production-migrations)
4. [Production Seeding](#production-seeding)
5. [Backup & Restore](#backup--restore)
6. [Security Best Practices](#security-best-practices)
7. [Troubleshooting](#troubleshooting)

---

## 🧪 Local Testing

### Prerequisites
- Docker Desktop running
- PostgreSQL container active
- `.env` file configured

### Verify Current State

```bash
cd citadelbuy/backend

# Check migration status
npx prisma migrate status

# Expected: "Database schema is up to date!"
```

### Test Migrations

```bash
# Generate Prisma Client
npx prisma generate

# Check for pending migrations
npx prisma migrate status

# Apply migrations (if needed)
npx prisma migrate dev
```

### Test Seeding

```bash
# Run seed script
npm run db:seed

# Expected output:
# 🌱 Starting database seed...
# 📦 Clearing existing data...
# 👥 Creating users...
# ✅ Users created
# 📁 Creating categories...
# ... (continues)
# ✅ Database seeded successfully!
```

### Verify Seeded Data

```bash
# Open Prisma Studio
npm run prisma:studio

# Or query directly
npx prisma studio
```

**Expected Data:**
- 5 Users (1 admin, 2 vendors, 2 customers)
- 4+ Categories
- 10+ Products
- Sample orders, reviews, etc.

---

## 🚂 Railway Database Setup

### Step 1: Create PostgreSQL Database

```bash
# Login to Railway (if not already logged in)
railway login

# Link to your project
railway link

# Add PostgreSQL service
railway add --database postgres
```

**Railway will automatically:**
- ✅ Provision PostgreSQL 14+ instance
- ✅ Generate `DATABASE_URL` environment variable
- ✅ Create database credentials
- ✅ Configure SSL connection

### Step 2: Get Database Connection String

```bash
# View database URL
railway variables

# Or get it directly
railway variables get DATABASE_URL
```

**Example Format:**
```
postgresql://postgres:password@hostname:5432/railway
```

### Step 3: Configure Local Access (Optional)

For managing production database from local machine:

```bash
# Create .env.production file
cd citadelbuy/backend
touch .env.production

# Add Railway database URL
echo "DATABASE_URL=<railway-database-url>" > .env.production
```

---

## 🔄 Production Migrations

### Option A: Deploy via Railway CLI

**Recommended for initial deployment:**

```bash
cd citadelbuy/backend

# Set production database URL temporarily
export DATABASE_URL="<railway-database-url>"

# Deploy migrations (production-safe)
npx prisma migrate deploy

# Unset variable
unset DATABASE_URL
```

**What `migrate deploy` does:**
- ✅ Applies pending migrations only
- ✅ Does NOT prompt for input (CI/CD safe)
- ✅ Does NOT create new migrations
- ✅ Records migration history in `_prisma_migrations` table
- ✅ Safe for production

### Option B: Automatic Deployment with Railway

**Add to backend service build command in `railway.json`:**

```json
{
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "startCommand": "sh -c 'npx prisma migrate deploy && node dist/main.js'",
    "healthcheckPath": "/api/health/ready",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE"
  }
}
```

**Railway will:**
- ✅ Run migrations before starting the app
- ✅ Use `DATABASE_URL` from environment
- ✅ Fail deployment if migrations fail
- ✅ Ensure database is ready before accepting traffic

### Verify Migrations

```bash
# Check migration status on production
DATABASE_URL="<railway-database-url>" npx prisma migrate status

# Should show: "Database schema is up to date!"
```

---

## 🌱 Production Seeding

### ⚠️ IMPORTANT: Production Seeding Strategy

**DO NOT run the full seed script on production!**

The current `prisma/seed.ts` file:
- ❌ Deletes ALL existing data
- ❌ Uses weak passwords ("password123")
- ❌ Creates test data only

### Recommended Production Seeding

#### Step 1: Create Production Seed Script

Create `prisma/seed.production.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting production database seed...');

  // Check if admin already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@citadelbuy.com' },
  });

  if (existingAdmin) {
    console.log('⏭️  Admin user already exists, skipping...');
    return;
  }

  // Get secure admin password from environment
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    throw new Error('ADMIN_PASSWORD environment variable is required');
  }

  // Create admin user
  const hashedPassword = await bcrypt.hash(adminPassword, 12); // Higher salt rounds

  await prisma.user.create({
    data: {
      email: 'admin@citadelbuy.com',
      password: hashedPassword,
      name: 'Admin',
      role: 'ADMIN',
    },
  });

  console.log('✅ Admin user created');

  // Create essential categories
  const categories = [
    { name: 'Electronics', slug: 'electronics', description: 'Electronic devices' },
    { name: 'Clothing', slug: 'clothing', description: 'Fashion and apparel' },
    { name: 'Home & Garden', slug: 'home-garden', description: 'Home essentials' },
    { name: 'Books', slug: 'books', description: 'Books and media' },
  ];

  for (const category of categories) {
    const existing = await prisma.category.findUnique({
      where: { slug: category.slug },
    });

    if (!existing) {
      await prisma.category.create({ data: category });
      console.log(`✅ Created category: ${category.name}`);
    }
  }

  // Create default loyalty program
  const existingProgram = await prisma.loyaltyProgram.findFirst();
  if (!existingProgram) {
    await prisma.loyaltyProgram.create({
      data: {
        name: 'CitadelBuy Rewards',
        description: 'Earn points on every purchase',
        pointsPerDollar: 1,
        isActive: true,
        reviewRewardPoints: 10,
        birthdayRewardPoints: 50,
        referrerRewardPoints: 100,
        refereeRewardPoints: 50,
        referralMinPurchase: 50,
      },
    });
    console.log('✅ Created default loyalty program');
  }

  // Create default loyalty tiers
  const tiers = [
    { name: 'Bronze', minPoints: 0, minSpending: 0, pointsMultiplier: 1 },
    { name: 'Silver', minPoints: 500, minSpending: 500, pointsMultiplier: 1.25 },
    { name: 'Gold', minPoints: 1000, minSpending: 1000, pointsMultiplier: 1.5 },
    { name: 'Platinum', minPoints: 5000, minSpending: 5000, pointsMultiplier: 2 },
  ];

  for (const tier of tiers) {
    const existing = await prisma.loyaltyTier.findFirst({
      where: { name: tier.name },
    });

    if (!existing) {
      await prisma.loyaltyTier.create({ data: tier });
      console.log(`✅ Created loyalty tier: ${tier.name}`);
    }
  }

  console.log('✅ Production seeding complete');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

#### Step 2: Add Production Seed Script to package.json

```json
{
  "scripts": {
    "db:seed": "ts-node prisma/seed.ts",
    "db:seed:prod": "ts-node prisma/seed.production.ts"
  }
}
```

#### Step 3: Run Production Seed

```bash
# On Railway (via CLI)
DATABASE_URL="<railway-database-url>" \
ADMIN_PASSWORD="<your-secure-password>" \
npm run db:seed:prod
```

**Or add to Railway environment variables:**
```bash
railway variables set ADMIN_PASSWORD=<secure-password>
```

---

## 💾 Backup & Restore

### Automated Backups (Railway)

Railway automatically backs up PostgreSQL databases:
- **Frequency:** Daily
- **Retention:** 7 days (Hobby plan), 30 days (Pro plan)
- **Location:** Railway infrastructure

**Access backups:**
```bash
railway run --service postgres pg_dump > backup.sql
```

### Manual Backup

```bash
# Full database backup
pg_dump "<railway-database-url>" > citadelbuy_backup_$(date +%Y%m%d).sql

# Compressed backup
pg_dump "<railway-database-url>" | gzip > citadelbuy_backup_$(date +%Y%m%d).sql.gz

# Schema only
pg_dump --schema-only "<railway-database-url>" > citadelbuy_schema.sql

# Data only
pg_dump --data-only "<railway-database-url>" > citadelbuy_data.sql
```

### Restore from Backup

```bash
# Restore full database
psql "<railway-database-url>" < citadelbuy_backup.sql

# Restore from compressed backup
gunzip -c citadelbuy_backup.sql.gz | psql "<railway-database-url>"

# Restore with Prisma (safer)
# 1. Reset database
DATABASE_URL="<railway-database-url>" npx prisma migrate reset --skip-seed

# 2. Restore data
psql "<railway-database-url>" < citadelbuy_backup.sql
```

### Backup Strategy Recommendations

**Development:**
- Backup before major changes
- Keep local backups of production data (anonymized)

**Staging:**
- Daily automated backups
- Keep last 7 backups

**Production:**
- Railway automatic daily backups
- Additional weekly manual backups
- Monthly archive backups (S3, CloudStorage)
- Test restore procedures monthly

---

## 🔐 Security Best Practices

### 1. Connection Security

**Always use SSL in production:**

```env
# In .env.production or Railway variables
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"
```

**SSL Modes:**
- `disable` - No SSL (development only)
- `require` - SSL required (production minimum)
- `verify-ca` - Verify certificate authority
- `verify-full` - Full certificate validation (most secure)

### 2. Database User Permissions

**Principle of least privilege:**

```sql
-- Create app-specific user (Railway handles this)
CREATE USER citadelbuy_app WITH PASSWORD 'secure_password';

-- Grant only necessary permissions
GRANT CONNECT ON DATABASE citadelbuy TO citadelbuy_app;
GRANT USAGE ON SCHEMA public TO citadelbuy_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO citadelbuy_app;

-- Prevent DROP/ALTER
REVOKE CREATE ON SCHEMA public FROM citadelbuy_app;
```

### 3. Sensitive Data

**Encrypt sensitive fields:**

```typescript
// Before storing
const encrypted = await bcrypt.hash(data, 12);

// For PII, consider:
// - Field-level encryption
// - Separate encrypted storage
// - Data masking in logs
```

### 4. Connection Pooling

**Already configured in Prisma:**

```typescript
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")

  // Connection pool settings
  shadowDatabaseUrl = env("SHADOW_DATABASE_URL") // For migrations
}
```

**Railway default pool:**
- Max connections: Based on plan
- Connection timeout: 30s
- Idle timeout: 10min

### 5. Environment Variables

**Never commit these:**
- ❌ `DATABASE_URL`
- ❌ `ADMIN_PASSWORD`
- ❌ Database credentials
- ❌ Migration history

**Use Railway secrets:**
```bash
railway variables set DATABASE_URL=<url>
railway variables set ADMIN_PASSWORD=<password>
```

---

## 🔍 Troubleshooting

### Issue: "Migration failed to apply"

```bash
# Check current schema state
npx prisma db pull

# Compare with your schema
npx prisma format

# Force reset (DANGER - deletes all data)
npx prisma migrate reset

# Or manually fix
npx prisma migrate resolve --applied <migration-name>
```

### Issue: "Can't connect to database"

**Check:**
1. Is `DATABASE_URL` correct?
2. Is database service running?
3. Is SSL required?
4. Firewall rules allow connection?

```bash
# Test connection
psql "<database-url>"

# Test with Prisma
npx prisma db pull
```

### Issue: "Timeout during migration"

```bash
# Increase timeout
DATABASE_URL="<url>?connect_timeout=60" npx prisma migrate deploy
```

### Issue: "Seed script fails"

```bash
# Check what failed
npm run db:seed 2>&1 | tee seed-error.log

# Common causes:
# - Missing environment variables
# - Data validation errors
# - Foreign key constraints
# - Unique constraint violations
```

### Issue: "Out of connections"

**Railway connection limits:**
- Hobby: 20 connections
- Pro: 100 connections

**Solutions:**
1. Enable connection pooling (already done)
2. Close connections properly
3. Upgrade Railway plan
4. Use PgBouncer

---

## 📊 Database Monitoring

### Health Checks

**Endpoints created:**
- `GET /api/health` - Includes database check
- `GET /api/health/ready` - Database connectivity

### Railway Dashboard

Monitor via Railway dashboard:
- Connection count
- Query performance
- Storage usage
- Memory usage

### Prisma Metrics

```typescript
// Add to your app
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});
```

---

## ✅ Deployment Checklist

### Pre-Deployment

- [ ] Migrations tested locally
- [ ] Seed script updated for production
- [ ] Backup procedures documented
- [ ] Connection string secured
- [ ] SSL enabled
- [ ] Admin password generated (128+ characters)
- [ ] Health check endpoints working

### Deployment

- [ ] Railway PostgreSQL service created
- [ ] `DATABASE_URL` environment variable set
- [ ] Migrations deployed (`npx prisma migrate deploy`)
- [ ] Production seed executed
- [ ] Admin user created successfully
- [ ] Essential categories created
- [ ] Health check passes

### Post-Deployment

- [ ] Test database connection
- [ ] Verify admin login
- [ ] Check Prisma Studio access
- [ ] Enable automated backups
- [ ] Set up monitoring alerts
- [ ] Document recovery procedures
- [ ] Test backup/restore

---

## 📚 Quick Reference

### Essential Commands

```bash
# Migrations
npx prisma migrate deploy        # Production deploy
npx prisma migrate dev           # Development
npx prisma migrate status        # Check status

# Database
npx prisma db push              # Push schema changes
npx prisma db pull              # Pull schema from DB
npx prisma studio               # Open admin UI

# Seeding
npm run db:seed                 # Development seed
npm run db:seed:prod            # Production seed

# Backup
pg_dump "<url>" > backup.sql    # Backup
psql "<url>" < backup.sql       # Restore
```

### Environment Variables

```env
# Required
DATABASE_URL="postgresql://..."

# Optional
ADMIN_PASSWORD="..."           # For production seeding
SHADOW_DATABASE_URL="..."      # For migration development
```

---

## 🎯 Success Criteria

- ✅ PostgreSQL database running on Railway
- ✅ All migrations applied successfully
- ✅ Production data seeded (admin, categories, etc.)
- ✅ Health checks passing
- ✅ Backups configured
- ✅ SSL connection verified
- ✅ Connection pooling active
- ✅ Monitoring enabled
- ✅ Documentation complete

---

**Last Updated:** 2025-11-18
**Next Steps:** Deploy backend application, configure environment variables
**Support:** [Railway Discord](https://discord.gg/railway) | [Prisma Discord](https://discord.gg/prisma)
