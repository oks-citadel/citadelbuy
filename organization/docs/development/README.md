# Development Documentation

Welcome to the Broxiva development documentation! This directory contains comprehensive guides for developers working on the Broxiva platform.

## Overview

Broxiva is an AI-powered e-commerce platform built with modern technologies:

- **Backend**: NestJS, Prisma ORM, PostgreSQL
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Infrastructure**: Docker, Kubernetes, Terraform
- **Cloud**: Azure (AKS, PostgreSQL, Redis, Blob Storage)

## Documentation Index

### Getting Started

1. **[Getting Started Guide](./GETTING_STARTED.md)** - Start here!
   - Prerequisites installation
   - Initial setup instructions
   - Running the application
   - Common tasks and commands
   - Troubleshooting guide

2. **[Onboarding Checklist](./ONBOARDING_CHECKLIST.md)**
   - Week-by-week onboarding plan
   - Learning objectives
   - Task completion tracking
   - Mentorship guidelines

3. **[Quick Reference](./QUICK_REFERENCE.md)**
   - Essential commands
   - Code patterns
   - Common tasks
   - Quick troubleshooting

### Core Guidelines

4. **[Contributing Guidelines](../../CONTRIBUTING.md)**
   - How to contribute
   - Development workflow
   - Code review process
   - Testing requirements
   - Documentation standards

5. **[Code of Conduct](../../CODE_OF_CONDUCT.md)**
   - Community standards
   - Expected behavior
   - Enforcement guidelines

6. **[Git Workflow](./GIT_WORKFLOW.md)**
   - Branching strategy
   - Commit message format
   - Pull request process
   - Merge strategy
   - Release process

7. **[Coding Standards](./CODING_STANDARDS.md)**
   - TypeScript conventions
   - NestJS patterns
   - React/Next.js best practices
   - Naming conventions
   - File organization
   - Error handling
   - Logging standards

### Specialized Guides

8. **[API Development Guide](./API_DEVELOPMENT_GUIDE.md)**
   - Creating NestJS modules
   - Controller patterns
   - Service implementation
   - DTOs and validation
   - Database operations
   - API documentation
   - Testing strategies

9. **[Setup Guide](./SETUP.md)** (Legacy)
   - Alternative setup instructions
   - Environment configuration

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Set up environment variables
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# 3. Start infrastructure
pnpm docker:up

# 4. Run migrations and seed
pnpm db:migrate
pnpm db:seed

# 5. Start development servers
pnpm dev
```

Access the application:
- **Frontend**: http://localhost:3000
- **API**: http://localhost:4000/api
- **API Docs**: http://localhost:4000/api/docs

## Common Commands

### Development
```bash
pnpm dev              # Start all services
pnpm dev:api          # Backend only
pnpm dev:web          # Frontend only
```

### Code Quality
```bash
pnpm lint             # Lint code
pnpm type-check       # Check types
pnpm format           # Format code
```

### Testing
```bash
pnpm test             # Run all tests
pnpm test:e2e         # Run E2E tests
pnpm test:cov         # Coverage report
```

### Database
```bash
pnpm db:migrate       # Run migrations
pnpm db:seed          # Seed database
pnpm prisma:studio    # Database GUI
```

## Project Structure

```
organization/
├── apps/
│   ├── api/              # NestJS Backend API
│   │   ├── prisma/       # Database schema & migrations
│   │   ├── src/
│   │   │   ├── common/   # Shared utilities
│   │   │   ├── config/   # Configuration
│   │   │   └── modules/  # Feature modules
│   │   └── test/         # E2E tests
│   │
│   ├── web/              # Next.js Frontend
│   │   ├── src/
│   │   │   ├── app/      # Next.js pages (App Router)
│   │   │   ├── components/ # React components
│   │   │   ├── hooks/    # Custom hooks
│   │   │   ├── lib/      # Utilities
│   │   │   ├── stores/   # State management
│   │   │   └── types/    # TypeScript types
│   │   └── public/       # Static assets
│   │
│   └── mobile/           # React Native (future)
│
├── packages/             # Shared packages
├── infrastructure/       # IaC (Docker, K8s, Terraform)
├── docs/                 # Documentation
│   ├── api/             # API documentation
│   ├── architecture/    # Architecture docs
│   ├── development/     # Developer guides (you are here)
│   └── deployment/      # Deployment guides
├── scripts/             # Utility scripts
└── tests/               # Integration tests
```

## Technology Stack

### Backend
- **Framework**: NestJS
- **Database**: PostgreSQL 16
- **ORM**: Prisma
- **Cache**: Redis
- **Queue**: Bull/BullMQ
- **Search**: Elasticsearch
- **Validation**: class-validator
- **Documentation**: Swagger/OpenAPI

### Frontend
- **Framework**: Next.js 15 (App Router)
- **UI Library**: React 19
- **Styling**: Tailwind CSS
- **Components**: Radix UI
- **State**: Zustand
- **Forms**: React Hook Form + Zod
- **Queries**: TanStack Query
- **Testing**: Jest, Playwright

### DevOps
- **Containers**: Docker, Docker Compose
- **Orchestration**: Kubernetes
- **IaC**: Terraform
- **CI/CD**: GitHub Actions
- **Cloud**: Azure (AKS, PostgreSQL, Redis, Blob)

## Development Workflow

### 1. Pick a Task
- Check GitHub Issues
- Look for "good first issue" label
- Discuss with team if uncertain

### 2. Create Feature Branch
```bash
git checkout develop
git pull origin develop
git checkout -b feature/add-wishlist
```

### 3. Make Changes
- Write clean, maintainable code
- Follow coding standards
- Add tests
- Update documentation

### 4. Commit Changes
```bash
git add .
git commit -m "feat(products): add wishlist functionality"
```

### 5. Push and Create PR
```bash
git push origin feature/add-wishlist
# Create PR on GitHub
```

### 6. Code Review
- Address review comments
- Make requested changes
- Get approval

### 7. Merge
- Squash commits if needed
- Merge when approved
- Delete feature branch

## Testing Strategy

### Unit Tests
- Test individual functions and methods
- Mock external dependencies
- Aim for 70%+ coverage

### Integration Tests
- Test API endpoints
- Test database interactions
- Test service integration

### E2E Tests
- Test critical user flows
- Test full application behavior
- Use Playwright for frontend

### Running Tests
```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Coverage
pnpm test:cov

# Watch mode
cd apps/api && pnpm test:watch
```

## Code Quality Standards

### TypeScript
- Use strict mode
- Avoid `any` type
- Define proper interfaces
- Use type inference

### NestJS
- Use dependency injection
- Follow module-based architecture
- Implement proper error handling
- Use DTOs for validation

### React/Next.js
- Use Server Components by default
- Client Components only when needed
- Implement proper loading states
- Handle errors gracefully

### General
- Write self-documenting code
- Add comments for complex logic
- Follow DRY principle
- Keep functions small and focused

## Security Best Practices

- ✅ Validate all user input
- ✅ Sanitize data before storing
- ✅ Use parameterized queries (Prisma)
- ✅ Implement authentication/authorization
- ✅ Use HTTPS in production
- ✅ Never commit secrets
- ✅ Use environment variables
- ✅ Implement rate limiting
- ✅ Sanitize HTML content
- ❌ Never trust user input

## Performance Guidelines

### Backend
- Use database indexes
- Avoid N+1 queries
- Implement pagination
- Use caching (Redis)
- Use transactions for multi-step operations

### Frontend
- Use Next.js Image component
- Implement code splitting
- Use React.memo for expensive components
- Lazy load components
- Optimize bundle size

## Getting Help

### Documentation
1. Check this development documentation
2. Review the specific guide for your task
3. Search existing documentation

### Issues
1. Search GitHub Issues
2. Check Stack Overflow
3. Review similar PRs

### Team
1. Ask in team discussions
2. Contact your mentor
3. Reach out to maintainers

### Resources
- [NestJS Documentation](https://docs.nestjs.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev/)

## Contributing Back

We welcome contributions! Here's how you can help:

1. **Fix Bugs**: Check open issues
2. **Add Features**: Propose new features
3. **Improve Docs**: Update or add documentation
4. **Write Tests**: Improve test coverage
5. **Code Review**: Review others' PRs
6. **Help Others**: Answer questions

## Test Accounts

Use these accounts for development:

| Role | Email | Password |
|------|-------|----------|
| Customer | customer@broxiva.com | password123 |
| Admin | admin@broxiva.com | password123 |
| Vendor | vendor1@broxiva.com | password123 |

## Important Links

- **Repository**: https://github.com/broxiva/broxiva
- **Issue Tracker**: https://github.com/broxiva/broxiva/issues
- **Discussions**: https://github.com/broxiva/broxiva/discussions
- **CI/CD**: GitHub Actions
- **Deployment**: Azure Portal

## Troubleshooting

### Common Issues

1. **Port already in use**: Kill process using the port
2. **Database connection failed**: Restart Docker services
3. **Prisma issues**: Regenerate Prisma client
4. **Node modules issues**: Clean and reinstall

See [Getting Started Guide](./GETTING_STARTED.md#troubleshooting) for detailed solutions.

## Updates and Changes

This documentation is actively maintained. If you find issues or have suggestions:

1. Create an issue
2. Submit a PR with fixes
3. Discuss in team meetings

Last Updated: December 2025

## License

This project is proprietary. See LICENSE file for details.

---

## Next Steps

1. **New Developers**: Start with [Getting Started Guide](./GETTING_STARTED.md)
2. **Contributing**: Read [Contributing Guidelines](../../CONTRIBUTING.md)
3. **Backend Development**: See [API Development Guide](./API_DEVELOPMENT_GUIDE.md)
4. **Git Workflow**: Review [Git Workflow](./GIT_WORKFLOW.md)
5. **Coding Standards**: Study [Coding Standards](./CODING_STANDARDS.md)

Welcome to the Broxiva development team! 🚀
