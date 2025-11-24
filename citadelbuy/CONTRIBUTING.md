# Contributing to CitadelBuy

Thank you for your interest in contributing to CitadelBuy! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing Requirements](#testing-requirements)

## Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. Please be respectful and professional in all interactions.

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- Git
- PostgreSQL 15+ (via Docker)
- Redis (via Docker)

### Initial Setup

1. **Fork and Clone**
   ```bash
   git fork https://github.com/yourusername/citadelbuy
   git clone https://github.com/yourusername/citadelbuy
   cd citadelbuy
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Set Up Environment**
   ```bash
   # Backend
   cp backend/.env.example backend/.env
   # Edit backend/.env with your local configuration

   # Frontend
   cp frontend/.env.example frontend/.env.local
   # Edit frontend/.env.local with your local configuration
   ```

4. **Start Infrastructure**
   ```bash
   cd infrastructure/docker
   docker compose up -d
   ```

5. **Run Database Migrations**
   ```bash
   cd ../../backend
   npm run migrate
   npm run db:seed
   ```

6. **Start Development Servers**
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev

   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

## Development Workflow

### Branch Naming Convention

- `feature/` - New features (e.g., `feature/payment-integration`)
- `fix/` - Bug fixes (e.g., `fix/auth-token-expiry`)
- `docs/` - Documentation updates (e.g., `docs/api-endpoints`)
- `refactor/` - Code refactoring (e.g., `refactor/auth-service`)
- `test/` - Test additions/updates (e.g., `test/order-workflow`)
- `chore/` - Maintenance tasks (e.g., `chore/update-dependencies`)

### Workflow Steps

1. Create a new branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and commit regularly with meaningful messages

3. Write or update tests for your changes

4. Ensure all tests pass:
   ```bash
   npm run test        # Unit tests
   npm run test:e2e    # E2E tests
   ```

5. Run linting and formatting:
   ```bash
   npm run lint
   npm run format
   ```

6. Push your branch and create a Pull Request

## Coding Standards

### TypeScript

- Use TypeScript strict mode
- Avoid `any` types - use proper typing
- Use interfaces for object shapes
- Use enums for fixed sets of values
- Document complex functions with JSDoc comments

### Backend (NestJS)

- Follow NestJS module structure
- Use dependency injection
- Implement DTOs for all API inputs
- Use Prisma for database operations
- Add Swagger/OpenAPI decorators to controllers
- Validate inputs with class-validator
- Handle errors with custom exception filters

**Example:**
```typescript
@Controller('products')
@ApiTags('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new product' })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  async create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }
}
```

### Frontend (Next.js + React)

- Use functional components with hooks
- Keep components small and focused
- Use TypeScript for all components
- Follow React Hook rules
- Use Shadcn UI components for consistency
- Implement proper error boundaries
- Use React Query for server state
- Use Zustand for client state

**Example:**
```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { productsApi } from '@/lib/api';

export function ProductList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.getAll(),
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading products</div>;

  return (
    <div className="grid grid-cols-3 gap-4">
      {data?.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

### Code Formatting

- Use Prettier for consistent formatting
- 2 spaces for indentation
- Single quotes for strings
- Trailing commas in multi-line objects/arrays
- Max line length: 100 characters

Run formatting before committing:
```bash
npm run format
```

## Commit Guidelines

### Commit Message Format

Follow the Conventional Commits specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, semicolons, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```bash
feat(auth): add password reset functionality

Implement password reset flow with email verification.
Includes backend API endpoints and frontend forms.

Closes #123

fix(cart): prevent duplicate items being added

Add validation to check if item already exists in cart
before adding.

Fixes #456

docs(readme): update installation instructions

Add Docker installation steps and troubleshooting section
```

### Commit Best Practices

- Make atomic commits (one logical change per commit)
- Write clear, descriptive commit messages
- Reference issue numbers when applicable
- Don't commit sensitive data (API keys, passwords, etc.)
- Don't commit build artifacts or node_modules

## Pull Request Process

### Before Submitting

1. **Update Documentation**
   - Update README if adding new features
   - Add/update API documentation
   - Update CHANGELOG.md

2. **Run Tests**
   ```bash
   npm run test              # All unit tests
   npm run test:e2e          # E2E tests
   npm run test:coverage     # Check coverage (aim for 70%+)
   ```

3. **Check Code Quality**
   ```bash
   npm run lint              # Run ESLint
   npm run type-check        # TypeScript type checking
   npm run format:check      # Check formatting
   ```

4. **Verify Build**
   ```bash
   npm run build             # Ensure project builds successfully
   ```

### PR Title Format

Use the same convention as commit messages:
```
feat(scope): description
fix(scope): description
docs(scope): description
```

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issues
Closes #issue_number

## Changes Made
- Bullet point list of changes

## Testing
- [ ] Unit tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed

## Screenshots (if applicable)
Add screenshots or GIFs

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added to complex code
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests pass locally
- [ ] Build succeeds
```

### Review Process

1. Automated checks must pass (CI/CD pipeline)
2. At least one maintainer approval required
3. All review comments must be resolved
4. Rebase on latest `main` before merging

## Testing Requirements

### Unit Tests

- Write unit tests for all business logic
- Test edge cases and error conditions
- Mock external dependencies
- Aim for 70%+ code coverage

**Example (Backend):**
```typescript
describe('AuthService', () => {
  it('should hash password correctly', async () => {
    const password = 'test123';
    const hashed = await authService.hashPassword(password);
    expect(hashed).not.toBe(password);
    expect(await bcrypt.compare(password, hashed)).toBe(true);
  });
});
```

**Example (Frontend):**
```typescript
describe('ProductCard', () => {
  it('should display product information', () => {
    const product = { id: '1', name: 'Test Product', price: 99.99 };
    render(<ProductCard product={product} />);
    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('$99.99')).toBeInTheDocument();
  });
});
```

### E2E Tests

- Test critical user flows
- Use Playwright for frontend E2E tests
- Test API endpoints for backend

**Example:**
```typescript
test('user can complete purchase', async ({ page }) => {
  await page.goto('/products');
  await page.click('[data-testid="product-1"]');
  await page.click('[data-testid="add-to-cart"]');
  await page.goto('/cart');
  await page.click('[data-testid="checkout"]');
  await fillCheckoutForm(page);
  await page.click('[data-testid="place-order"]');
  await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
});
```

### Running Tests

```bash
# Unit tests
npm run test                    # Run all tests
npm run test:watch              # Watch mode
npm run test:coverage           # With coverage

# E2E tests
npm run test:e2e                # Run E2E tests
npm run test:e2e:ui             # With Playwright UI

# Specific tests
npm run test -- auth.service    # Test specific file
```

## Project Structure

### Backend
```
backend/src/
├── common/                 # Shared utilities
│   ├── decorators/
│   ├── filters/
│   ├── guards/
│   └── prisma/
├── config/                 # Configuration
├── modules/                # Feature modules
│   ├── auth/
│   ├── products/
│   └── orders/
└── main.ts                 # Entry point
```

### Frontend
```
frontend/src/
├── app/                    # Next.js pages (App Router)
├── components/             # React components
├── hooks/                  # Custom hooks
├── lib/                    # Utilities and API clients
├── store/                  # State management
└── types/                  # TypeScript types
```

## Getting Help

- Check existing issues and documentation
- Ask questions in GitHub Discussions
- Join our community Discord (if applicable)
- Email: support@citadelbuy.com

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

Thank you for contributing to CitadelBuy! 🚀
