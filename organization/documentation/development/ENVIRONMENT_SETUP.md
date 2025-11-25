# CitadelBuy - Environment Setup Guide

Last Updated: 2025-11-17

## Quick Start

### Development Setup (5 minutes)

1. Backend Setup:
cd citadelbuy/backend
cp .env.example .env
# Edit .env and update DATABASE_URL, JWT_SECRET, STRIPE_SECRET_KEY

2. Frontend Setup:
cd citadelbuy/frontend  
cp .env.local.example .env.local
# Edit .env.local and update NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

3. Verify Setup:
cd citadelbuy/backend && npm run start:dev
cd citadelbuy/frontend && npm run dev

## Critical Environment Variables

### Backend (Required)
- DATABASE_URL - PostgreSQL connection string
- JWT_SECRET - Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
- STRIPE_SECRET_KEY - From Stripe Dashboard
- CORS_ORIGIN - Frontend URLs (comma-separated)

### Frontend (Required)
- NEXT_PUBLIC_API_URL - Backend URL (default: http://localhost:4000)
- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY - From Stripe Dashboard (CRITICAL - currently missing!)

## Security Checklist
- Use strong JWT_SECRET (min 32 chars)
- Never commit .env files
- Use different secrets for dev/prod
- Enable SSL for production database
- Verify .gitignore includes .env files

## Troubleshooting

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY not set:
echo 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key' >> citadelbuy/frontend/.env.local

Database connection failed:
- Check PostgreSQL is running
- Verify DATABASE_URL credentials
- Ensure database exists

CORS error:
- Add frontend URL to backend CORS_ORIGIN

For detailed information, see .env.example files in backend and frontend directories.
