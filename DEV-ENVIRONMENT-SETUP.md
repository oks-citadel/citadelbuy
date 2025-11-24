# Development Environment Setup - Complete

**Date:** 2025-11-18
**Phase:** 30 - Task 1.1 & Development Environment
**Status:** ✅ Complete

---

## 🎉 Development Environment Ready!

Your CitadelBuy development environment has been successfully configured and is ready for use.

---

## 📊 Environment Status

### Docker Services ✅

All Docker services are running and healthy:

| Service | Container Name | Port | Status | Health |
|---------|---------------|------|--------|--------|
| **PostgreSQL** | citadelbuy-postgres | 5432 | ✅ Running | 🟢 Healthy |
| **Redis** | citadelbuy-redis | 6379 | ✅ Running | 🟢 Healthy |
| **pgAdmin** | citadelbuy-pgadmin | 5050 | ✅ Running | - |

### Database Setup ✅

- ✅ PostgreSQL database created: `citadelbuy_dev`
- ✅ Prisma Client generated (v5.22.0)
- ✅ Database migrations applied (2 migrations total)
  - `20251117022438_add_password_reset_table`
  - `20251118154530_sync_schema_phase30` (NEW)
- ✅ Database seeded with test data

### Environment Variables ✅

- ✅ Backend `.env` configured
- ✅ Frontend `.env.local` configured
- ✅ All required environment variables set

---

## 🔐 Test Credentials

### Admin Account
```
Email: admin@citadelbuy.com
Password: password123
Role: ADMIN
```

### Vendor Accounts

**Vendor 1 (TechStore):**
```
Email: vendor1@citadelbuy.com
Password: password123
Role: VENDOR
```

**Vendor 2 (Fashion Boutique):**
```
Email: vendor2@citadelbuy.com
Password: password123
Role: VENDOR
```

### Customer Accounts

**Customer 1:**
```
Email: customer@citadelbuy.com
Password: password123
Role: CUSTOMER
```

**Customer 2:**
```
Email: jane@example.com
Password: password123
Role: CUSTOMER
```

---

## 🚀 Quick Start

### Start Backend Server

```bash
cd citadelbuy/backend
npm run start:dev
```

**Backend will be available at:** http://localhost:4000/api

**Swagger API Documentation:** http://localhost:4000/api/docs

### Start Frontend Application

```bash
cd citadelbuy/frontend
npm run dev
```

**Frontend will be available at:** http://localhost:3000

---

## 🗄️ Database Access

### Using pgAdmin (Web Interface)

1. Open browser to: http://localhost:5050
2. Login with:
   - Email: `admin@citadelbuy.com`
   - Password: `admin123`
3. Add server connection:
   - Host: `citadelbuy-postgres` (or `host.docker.internal` or `localhost`)
   - Port: `5432`
   - Database: `citadelbuy_dev`
   - Username: `citadelbuy`
   - Password: `citadelbuy123`

### Using Command Line (psql)

```bash
# Connect to database directly
docker exec -it citadelbuy-postgres psql -U citadelbuy -d citadelbuy_dev

# Or using local psql client
psql -h localhost -p 5432 -U citadelbuy -d citadelbuy_dev
```

**Useful queries:**
```sql
-- List all tables
\dt

-- Count users by role
SELECT role, COUNT(*) FROM "User" GROUP BY role;

-- List all products
SELECT id, name, price, stock FROM "Product";

-- View categories
SELECT id, name, slug FROM "Category";
```

---

## 📦 Seeded Data

The database has been populated with:

### Users
- 1 Admin user
- 2 Vendor users
- 2 Customer users

### Products & Categories
- Multiple product categories
- Sample products with:
  - Images
  - Descriptions
  - Pricing
  - Stock levels
  - Vendor associations

### Orders
- Sample orders with different statuses
- Order items linked to products
- Payment records

### Features
All Phase 27-29 features are enabled and seeded:
- ✅ Gift Cards
- ✅ Store Credit
- ✅ Loyalty Program (with tiers and points)
- ✅ BNPL (Buy Now Pay Later)
- ✅ Deals & Promotions
- ✅ Wishlists
- ✅ Product Reviews
- ✅ Subscriptions
- ✅ Advertisements
- ✅ Analytics

---

## 🔧 Database Management

### Reset Database

If you need to reset the database to a clean state:

```bash
cd citadelbuy/backend

# Reset database (WARNING: This will delete all data!)
npx prisma migrate reset

# Or manually:
npx prisma migrate reset --skip-seed  # Reset without seeding
npm run db:seed                        # Seed database
```

### Create New Migration

When you modify the Prisma schema:

```bash
cd citadelbuy/backend

# Create and apply migration
npx prisma migrate dev --name your_migration_name

# Generate Prisma Client
npx prisma generate
```

### View Migration History

```bash
cd citadelbuy/backend
npx prisma migrate status
```

---

## 🐳 Docker Commands

### Stop Services

```bash
cd citadelbuy/infrastructure/docker
docker-compose down
```

### Start Services

```bash
cd citadelbuy/infrastructure/docker
docker-compose up -d
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f postgres
docker-compose logs -f redis
```

### Restart Services

```bash
docker-compose restart
```

### Remove All Data (Nuclear Option)

```bash
# Stop and remove containers, volumes, networks
docker-compose down -v

# Start fresh
docker-compose up -d
```

---

## 🧪 Testing the Setup

### 1. Test Backend API

```bash
# Health check
curl http://localhost:4000/health

# Get all products (requires authentication)
curl http://localhost:4000/api/products

# Test authentication
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@citadelbuy.com","password":"password123"}'
```

### 2. Test Database Connection

```bash
# Test PostgreSQL
docker exec citadelbuy-postgres pg_isready -U citadelbuy

# Test Redis
docker exec citadelbuy-redis redis-cli ping
```

### 3. Verify Swagger Documentation

Open in browser: http://localhost:4000/api/docs

---

## 📚 Available API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

### Products
- `GET /api/products` - List products
- `GET /api/products/:id` - Get product details
- `POST /api/products` - Create product (Admin/Vendor)
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Orders
- `GET /api/orders` - List user orders
- `GET /api/orders/:id` - Get order details
- `POST /api/orders` - Create order
- `PUT /api/orders/:id/status` - Update order status

### Gift Cards
- `POST /api/gift-cards/purchase` - Purchase gift card
- `POST /api/gift-cards/redeem` - Redeem gift card
- `POST /api/gift-cards/check-balance` - Check balance
- `GET /api/gift-cards/my-purchases` - List purchased cards

### Loyalty Program
- `GET /api/loyalty/balance` - Get points balance
- `GET /api/loyalty/history` - Transaction history
- `POST /api/loyalty/redeem` - Redeem points
- `GET /api/loyalty/tiers` - List loyalty tiers

### And many more...
Check Swagger documentation for complete API reference.

---

## 🔐 Security Notes

### Development Credentials
⚠️ **WARNING:** The seeded credentials are for DEVELOPMENT ONLY!

- Never use these credentials in production
- Change all default passwords before deployment
- Use strong, unique passwords in production
- Enable two-factor authentication for admin accounts

### Environment Variables
- `.env` and `.env.local` files are git-ignored
- Never commit credentials to version control
- Use secrets management for production (AWS Secrets Manager, Vault, etc.)

---

## 🐛 Troubleshooting

### Backend Won't Start

**Error:** `Cannot connect to database`
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check database logs
docker logs citadelbuy-postgres

# Restart PostgreSQL
docker restart citadelbuy-postgres
```

**Error:** `Prisma Client is not generated`
```bash
cd citadelbuy/backend
npx prisma generate
```

### Frontend Won't Build

**Error:** `Cannot connect to backend API`
```bash
# Check NEXT_PUBLIC_API_URL in .env.local
cat citadelbuy/frontend/.env.local | grep API_URL

# Should be: NEXT_PUBLIC_API_URL=http://localhost:4000
```

**Error:** `Module not found`
```bash
cd citadelbuy/frontend
rm -rf node_modules .next
npm install
npm run dev
```

### Database Issues

**Error:** `Migration failed`
```bash
# Reset migrations (WARNING: Deletes all data!)
cd citadelbuy/backend
npx prisma migrate reset

# Or force reset
npx prisma migrate reset --force
```

**Error:** `Connection refused`
```bash
# Check if PostgreSQL port is available
netstat -an | grep 5432

# If port is in use, stop other PostgreSQL instances
# or change port in docker-compose.yml
```

### Docker Issues

**Error:** `Docker daemon not running`
```bash
# Start Docker Desktop
# Windows: Start menu > Docker Desktop
# Mac: Applications > Docker
# Linux: sudo systemctl start docker
```

**Error:** `Port already in use`
```bash
# Check what's using the port
netstat -ano | findstr :5432  # Windows
lsof -i :5432                 # Mac/Linux

# Kill the process or change port in docker-compose.yml
```

---

## 📖 Next Steps

Now that your development environment is set up:

1. **Start Developing**
   - Backend: `cd citadelbuy/backend && npm run start:dev`
   - Frontend: `cd citadelbuy/frontend && npm run dev`

2. **Explore the API**
   - Open Swagger: http://localhost:4000/api/docs
   - Test endpoints with different user roles

3. **Review the Code**
   - Familiarize yourself with the project structure
   - Review implemented features (Phases 27-29)

4. **Plan Production Deployment**
   - Review [PHASE-30-DEPLOYMENT.md](PHASE-30-DEPLOYMENT.md)
   - Choose deployment platform (Task 1.3)
   - Set up production database (Task 1.2)

5. **Run Tests** (when available)
   - Backend: `npm run test`
   - Frontend: `npm run test`

---

## 📞 Support & Resources

### Documentation
- [Phase 30 Deployment Plan](PHASE-30-DEPLOYMENT.md)
- [Environment Variables Guide](docs/ENVIRONMENT_VARIABLES.md)
- [Progress Report](PROGRESS.md)
- [Next Tasks](NEXT_TASKS.md)

### External Resources
- [NestJS Documentation](https://docs.nestjs.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Docker Documentation](https://docs.docker.com/)

---

**Environment Setup Complete:** 2025-11-18
**Ready for Development:** ✅ Yes
**Database Seeded:** ✅ Yes
**Docker Running:** ✅ Yes
**All Services Healthy:** ✅ Yes

---

**Happy Coding! 🚀**
