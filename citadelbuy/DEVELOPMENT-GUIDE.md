# CitadelBuy Development Guide

Complete guide to set up and run the CitadelBuy e-commerce platform locally.

## Prerequisites

- **Node.js**: 20.x or higher
- **npm**: 10.x or higher
- **Docker**: 24.x or higher (for databases)
- **Git**: Latest version

## Quick Start (5 minutes)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd citadelbuy
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install all workspace dependencies
npm install --workspaces
```

### 3. Start Development Services

```bash
# Start PostgreSQL and Redis using Docker
npm run docker:up

# Wait for services to be healthy (check with docker ps)
```

### 4. Setup Backend

```bash
# Copy environment variables
cp backend/.env.example backend/.env

# Generate Prisma client
cd backend
npm run prisma:generate

# Run database migrations
npm run migrate

# Optional: Seed database with sample data
npm run db:seed

cd ..
```

### 5. Setup Frontend

```bash
# Copy environment variables
cp frontend/.env.local.example frontend/.env.local
```

### 6. Start Development Servers

```bash
# Start both frontend and backend
npm run dev

# Or start individually:
npm run dev:frontend  # Frontend at http://localhost:3000
npm run dev:backend   # Backend at http://localhost:4000
```

## Environment Variables

### Backend (.env)

```bash
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://citadelbuy:citadelbuy123@localhost:5432/citadelbuy_dev
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key-here
STRIPE_SECRET_KEY=sk_test_your_key_here
CORS_ORIGIN=http://localhost:3000
```

### Frontend (.env.local)

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
```

## Available Commands

### Root Level

```bash
npm run dev              # Start both frontend and backend
npm run build            # Build both projects
npm run test             # Run all tests
npm run lint             # Lint all projects
npm run format           # Format code with Prettier

# Docker commands
npm run docker:up        # Start PostgreSQL and Redis
npm run docker:down      # Stop all services
npm run docker:logs      # View container logs

# Database commands
npm run db:migrate       # Run database migrations
npm run db:seed          # Seed database with sample data
```

### Frontend

```bash
cd frontend

npm run dev              # Start dev server (port 3000)
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
npm run type-check       # Run TypeScript type checking
```

### Backend

```bash
cd backend

npm run dev              # Start dev server with hot reload (port 4000)
npm run build            # Build for production
npm run start:prod       # Start production server
npm run test             # Run tests
npm run test:watch       # Run tests in watch mode
npm run test:cov         # Run tests with coverage

# Database commands
npm run migrate          # Run migrations
npm run migrate:reset    # Reset database
npm run db:push          # Push schema changes
npm run db:seed          # Seed database
npm run prisma:generate  # Generate Prisma client
npm run prisma:studio    # Open Prisma Studio GUI
```

## Project Structure

```
citadelbuy/
├── frontend/                 # Next.js 15 frontend
│   ├── src/
│   │   ├── app/             # Next.js app router
│   │   ├── components/      # React components
│   │   ├── lib/             # Utilities and API client
│   │   ├── hooks/           # Custom React hooks
│   │   ├── types/           # TypeScript types
│   │   └── styles/          # Global styles
│   └── package.json
│
├── backend/                  # NestJS backend
│   ├── src/
│   │   ├── modules/         # Feature modules
│   │   │   ├── auth/        # Authentication
│   │   │   ├── users/       # User management
│   │   │   ├── products/    # Product management
│   │   │   ├── orders/      # Order management
│   │   │   └── payments/    # Payment processing
│   │   ├── common/          # Shared code
│   │   └── config/          # Configuration
│   ├── prisma/
│   │   └── schema.prisma    # Database schema
│   └── package.json
│
├── infrastructure/           # Infrastructure as code
│   ├── docker/              # Docker configurations
│   │   └── docker-compose.yml
│   └── terraform/           # Terraform configs (future)
│
└── package.json             # Workspace root

```

## Development Workflow

### 1. Create a New Feature

```bash
# Create a new branch
git checkout -b feature/your-feature-name

# Make your changes...
# Test locally...

# Commit and push
git add .
git commit -m "feat: add your feature"
git push origin feature/your-feature-name
```

### 2. Database Changes

```bash
# 1. Update prisma/schema.prisma
# 2. Create migration
cd backend
npm run migrate -- --name your_migration_name

# 3. Generate Prisma client
npm run prisma:generate
```

### 3. Adding New Dependencies

```bash
# Frontend
cd frontend
npm install package-name

# Backend
cd backend
npm install package-name
```

## Accessing Services

### Frontend
- **URL**: http://localhost:3000
- **Framework**: Next.js 15

### Backend API
- **URL**: http://localhost:4000/api
- **Docs**: http://localhost:4000/api/docs (Swagger UI)

### Database (PostgreSQL)
- **Host**: localhost
- **Port**: 5432
- **Database**: citadelbuy_dev
- **User**: citadelbuy
- **Password**: citadelbuy123

### pgAdmin (Database GUI)
- **URL**: http://localhost:5050
- **Email**: admin@citadelbuy.com
- **Password**: admin123

### Redis
- **Host**: localhost
- **Port**: 6379

### Prisma Studio (Database GUI)
```bash
cd backend
npm run prisma:studio
# Opens at http://localhost:5555
```

## Testing

### Backend Tests

```bash
cd backend

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:cov

# Run E2E tests
npm run test:e2e
```

### Frontend Tests

```bash
cd frontend

# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Common Issues

### Port Already in Use

```bash
# Kill process on port 3000 (frontend)
npx kill-port 3000

# Kill process on port 4000 (backend)
npx kill-port 4000
```

### Database Connection Issues

```bash
# Check if Docker containers are running
docker ps

# Restart Docker services
npm run docker:down
npm run docker:up

# Check database logs
npm run docker:logs
```

### Prisma Issues

```bash
# Regenerate Prisma client
cd backend
npm run prisma:generate

# Reset database (WARNING: deletes all data)
npm run migrate:reset
```

### Module Not Found Errors

```bash
# Clean install all dependencies
npm run docker:down
rm -rf node_modules frontend/node_modules backend/node_modules
npm install
npm install --workspaces
```

## Best Practices

### Code Style
- Use ESLint and Prettier (automatically configured)
- Run `npm run format` before committing
- Follow TypeScript strict mode

### Git Commits
- Use conventional commits: `feat:`, `fix:`, `docs:`, `chore:`, etc.
- Keep commits atomic and focused
- Write descriptive commit messages

### API Development
- Document all endpoints with Swagger decorators
- Use DTOs for validation (class-validator)
- Handle errors properly with appropriate HTTP status codes
- Add unit tests for services

### Frontend Development
- Use TypeScript for all components
- Create reusable UI components in `components/ui/`
- Use React Query for data fetching
- Implement proper error boundaries

### Security
- Never commit .env files
- Use environment variables for secrets
- Validate all user inputs
- Implement rate limiting for public endpoints
- Use HTTPS in production

## Getting Help

- Check documentation in `/docs` folder
- Review existing code for patterns
- Check API documentation at http://localhost:4000/api/docs
- Review Prisma schema for database structure

## Next Steps

1. **Review the codebase** - Familiarize yourself with the project structure
2. **Run the development servers** - Make sure everything works
3. **Check out the API docs** - Understand available endpoints
4. **Make a small change** - Test the development workflow
5. **Read the business documentation** - Understand the platform vision

Happy coding! 🚀
