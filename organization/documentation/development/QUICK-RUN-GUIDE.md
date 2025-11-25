# Quick Run Guide - CitadelBuy

**Get the application running in 5 minutes!**

---

## Prerequisites Check

Before starting, ensure you have:
- ✅ Node.js 20+ installed (`node --version`)
- ✅ Docker Desktop running (`docker --version`)
- ✅ Git installed (`git --version`)

---

## Step-by-Step Instructions

### 1. Navigate to Project Directory
```bash
cd citadelbuy
```

### 2. Create Environment Files

**Backend Environment**:
```bash
cd backend
cp .env.example .env
```

**Frontend Environment**:
```bash
cd ../frontend
cp .env.local.example .env.local
cd ..
```

### 3. Start Database Services
```bash
# Start PostgreSQL and Redis
npm run docker:up

# Wait for services to be healthy (30 seconds)
# Check status with: docker ps
```

### 4. Setup Backend Database
```bash
cd backend

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run migrate

# Optional: Seed with sample data
# npm run db:seed

cd ..
```

### 5. Start Development Servers

**Option A: Start Both (Recommended)**
```bash
npm run dev
```

**Option B: Start Individually**
```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev
```

### 6. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000/api
- **API Docs**: http://localhost:4000/api/docs
- **pgAdmin**: http://localhost:5050 (optional)

---

## Testing Authentication

### Register a New User
1. Go to http://localhost:3000
2. Click **"Sign Up"** in the navbar
3. Fill in:
   - Name: `Test User`
   - Email: `test@example.com`
   - Password: `password123`
   - Confirm Password: `password123`
4. Click **"Create Account"**
5. You should be redirected to the homepage
6. Navbar should show your avatar

### Test Profile Page
1. Click your **avatar** in the navbar
2. You should see your profile with:
   - Name and email
   - Account type (Customer)
   - Member since date
3. Try clicking **"Sign Out"**
4. You should be redirected to login

### Test Login
1. Click **"Sign In"** in navbar
2. Enter:
   - Email: `test@example.com`
   - Password: `password123`
3. Click **"Sign In"**
4. You should be logged in

### Test Protected Routes
1. **While logged out**: Try visiting http://localhost:3000/profile
2. You should be redirected to login
3. **After logging in**: You can access the profile page

---

## Common Commands

### Development
```bash
npm run dev              # Start both frontend & backend
npm run dev:frontend     # Frontend only
npm run dev:backend      # Backend only
```

### Database
```bash
cd backend
npm run prisma:studio    # Open database GUI
npm run migrate          # Run new migrations
npm run db:push          # Push schema changes
```

### Docker
```bash
npm run docker:up        # Start databases
npm run docker:down      # Stop databases
npm run docker:logs      # View logs
docker ps                # Check running containers
```

### Code Quality
```bash
npm run lint             # Lint all code
npm run format           # Format code
npm test                 # Run tests
```

---

## Troubleshooting

### Port Already in Use
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9
```

### Docker Not Starting
1. Open Docker Desktop
2. Ensure Docker daemon is running
3. Try `docker ps` to verify
4. Restart Docker Desktop if needed

### Database Connection Error
```bash
# Check if containers are running
docker ps

# Restart Docker services
npm run docker:down
npm run docker:up

# Wait 30 seconds for startup
# Check logs
npm run docker:logs
```

### Module Not Found Errors
```bash
# Clean install
rm -rf node_modules frontend/node_modules backend/node_modules
npm install
```

### Prisma Client Not Generated
```bash
cd backend
npm run prisma:generate
cd ..
```

---

## Stopping the Application

### Stop Development Servers
- Press `Ctrl + C` in each terminal running `npm run dev`

### Stop Docker Services
```bash
npm run docker:down
```

### Complete Shutdown
```bash
# Stop dev servers (Ctrl + C)
# Stop Docker
npm run docker:down

# Optionally remove data (WARNING: deletes database!)
# docker volume prune
```

---

## Quick Test Checklist

- [ ] Docker containers running (`docker ps`)
- [ ] Backend API accessible (http://localhost:4000/api)
- [ ] Frontend loading (http://localhost:3000)
- [ ] Can register new user
- [ ] Can login
- [ ] Avatar shows in navbar
- [ ] Profile page loads
- [ ] Can logout
- [ ] Auth persists on page refresh
- [ ] Protected routes redirect to login

---

## API Testing (Optional)

### Using Swagger UI
1. Go to http://localhost:4000/api/docs
2. Test endpoints directly in browser

### Using curl
```bash
# Register user
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","password":"123456"}'

# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456"}'

# Get profile (replace TOKEN)
curl http://localhost:4000/api/users/profile \
  -H "Authorization: Bearer TOKEN"
```

---

## Database Access

### Using Prisma Studio (Recommended)
```bash
cd backend
npm run prisma:studio
# Opens at http://localhost:5555
```

### Using pgAdmin
1. Go to http://localhost:5050
2. Login:
   - Email: `admin@citadelbuy.com`
   - Password: `admin123`
3. Add server:
   - Host: `postgres`
   - Port: `5432`
   - Database: `citadelbuy_dev`
   - Username: `citadelbuy`
   - Password: `citadelbuy123`

### Using psql
```bash
docker exec -it citadelbuy-postgres psql -U citadelbuy -d citadelbuy_dev
```

---

## Environment Variables Reference

### Backend (.env)
```env
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://citadelbuy:citadelbuy123@localhost:5432/citadelbuy_dev
JWT_SECRET=your-secret-key
CORS_ORIGIN=http://localhost:3000
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## Success!

If you can:
- ✅ See the homepage at http://localhost:3000
- ✅ Register and login
- ✅ View your profile
- ✅ See API docs at http://localhost:4000/api/docs

**You're ready to develop! 🎉**

---

## Next Steps

1. **Explore the codebase** - Check out the files in PHASE-1-COMPLETE.md
2. **Read the docs** - Review DEVELOPMENT-GUIDE.md
3. **Start building** - Implement product management or shopping cart
4. **Deploy to staging** - Set up Azure infrastructure

---

## Getting Help

- 📖 Read DEVELOPMENT-GUIDE.md for detailed info
- 🔧 Check PHASE-1-COMPLETE.md for what's implemented
- 📊 Review PROJECT-STATUS.md for roadmap
- 🐛 Check troubleshooting section above

---

**Happy coding! 🚀**
