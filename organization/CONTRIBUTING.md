# Contributing to CitadelBuy

Thank you for your interest in contributing to CitadelBuy! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Environment Setup](#development-environment-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Code Style Guidelines](#code-style-guidelines)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)
- [Code Review Checklist](#code-review-checklist)
- [Documentation Requirements](#documentation-requirements)
- [Getting Help](#getting-help)

## Code of Conduct

Please read and follow our [Code of Conduct](./CODE_OF_CONDUCT.md) to maintain a welcoming and inclusive community.

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: >= 20.0.0
- **pnpm**: >= 10.0.0 (package manager)
- **Docker & Docker Compose**: Latest stable version
- **Git**: >= 2.30.0
- **PostgreSQL**: 16+ (or use Docker)
- **Redis**: 7+ (or use Docker)

### First Time Setup

1. **Fork and clone the repository:**
   ```bash
   git clone https://github.com/your-username/citadelbuy.git
   cd citadelbuy/organization
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Set up environment variables:**
   ```bash
   # Copy example environment files
   cp .env.example .env
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env
   ```

4. **Start infrastructure services (PostgreSQL, Redis, etc.):**
   ```bash
   pnpm docker:up
   ```

5. **Run database migrations and seed data:**
   ```bash
   pnpm db:migrate
   pnpm db:seed
   ```

6. **Start development servers:**
   ```bash
   pnpm dev
   ```

7. **Verify setup:**
   - Frontend: http://localhost:3000
   - API: http://localhost:4000/api
   - API Docs: http://localhost:4000/api/docs

## Development Environment Setup

### Recommended IDE Extensions

**VS Code:**
- ESLint
- Prettier
- TypeScript and JavaScript Language Features
- Prisma
- Tailwind CSS IntelliSense
- Docker
- GitLens

### Workspace Configuration

Create `.vscode/settings.json` (already configured in project):
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

## Project Structure

```
organization/
├── apps/
│   ├── api/              # NestJS backend API
│   ├── web/              # Next.js frontend
│   └── mobile/           # React Native mobile (future)
├── packages/             # Shared packages
├── infrastructure/       # IaC (Terraform, Docker, K8s)
├── docs/                 # Documentation
├── scripts/              # Utility scripts
└── tests/                # Cross-cutting tests
```

### Key Directories

- **apps/api/src/modules/**: Feature modules (auth, products, orders, etc.)
- **apps/web/src/app/**: Next.js App Router pages
- **apps/web/src/components/**: React components
- **docs/development/**: Development guides
- **infrastructure/**: Infrastructure as Code

## Development Workflow

### Branch Strategy

We follow a Git Flow-inspired workflow. See [Git Workflow](./docs/development/GIT_WORKFLOW.md) for detailed information.

**Branch Types:**
- `main`: Production-ready code
- `develop`: Integration branch for features
- `feature/*`: New features
- `bugfix/*`: Bug fixes
- `hotfix/*`: Production hotfixes
- `release/*`: Release preparation

### Creating a New Feature

1. **Create a feature branch:**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/add-new-payment-method
   ```

2. **Make your changes:**
   - Write clean, maintainable code
   - Follow coding standards (see below)
   - Write tests for new functionality
   - Update documentation as needed

3. **Commit your changes:**
   ```bash
   git add .
   git commit -m "feat(payments): add PayPal payment integration"
   ```

4. **Keep your branch updated:**
   ```bash
   git fetch origin
   git rebase origin/develop
   ```

5. **Push to your fork:**
   ```bash
   git push origin feature/add-new-payment-method
   ```

6. **Create a Pull Request** (see [Pull Request Process](#pull-request-process))

## Code Style Guidelines

### TypeScript Conventions

See [Coding Standards](./docs/development/CODING_STANDARDS.md) for comprehensive guidelines.

**Key Principles:**
- Use TypeScript strict mode
- Prefer `interface` over `type` for object shapes
- Use `const` by default, `let` when mutation is needed
- Avoid `any`; use `unknown` if type is truly unknown
- Use meaningful variable and function names

**Example:**
```typescript
// Good
interface User {
  id: string;
  email: string;
  name: string;
}

async function getUserById(userId: string): Promise<User> {
  // Implementation
}

// Bad
type User = {
  id: any;
  email: any;
};

function get(id: any) {
  // Implementation
}
```

### NestJS Conventions

- Use dependency injection
- Follow module-based architecture
- Use decorators appropriately
- Implement proper error handling with custom exceptions
- Use DTOs for request/response validation

**Example:**
```typescript
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ProductDto> {
    return this.productsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() createProductDto: CreateProductDto): Promise<ProductDto> {
    return this.productsService.create(createProductDto);
  }
}
```

### React/Next.js Conventions

- Use functional components with hooks
- Prefer Server Components in Next.js when possible
- Use Client Components only when necessary (interactivity, browser APIs)
- Implement proper loading and error states
- Use TypeScript for props
- Follow component composition patterns

**Example:**
```typescript
// Server Component (default in Next.js App Router)
async function ProductsPage() {
  const products = await getProducts();

  return (
    <div>
      <ProductList products={products} />
    </div>
  );
}

// Client Component (when needed)
'use client';

interface ProductCardProps {
  product: Product;
  onAddToCart: (id: string) => void;
}

function ProductCard({ product, onAddToCart }: ProductCardProps) {
  return (
    <button onClick={() => onAddToCart(product.id)}>
      Add to Cart
    </button>
  );
}
```

### Formatting

- **Indentation**: 2 spaces
- **Line Length**: 100 characters (soft limit)
- **Quotes**: Single quotes for strings
- **Semicolons**: Required
- **Trailing Commas**: Yes

Run Prettier before committing:
```bash
pnpm format
```

## Testing Requirements

All contributions must include appropriate tests. See [Testing Documentation](./docs/TESTING_QUICK_REFERENCE.md).

### Required Tests

1. **Unit Tests**: For business logic, utilities, and services
2. **Integration Tests**: For API endpoints and database interactions
3. **E2E Tests**: For critical user flows (when applicable)

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests for specific workspace
pnpm test:api
pnpm test:web

# Run E2E tests
pnpm test:e2e

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:cov
```

### Test Coverage Requirements

- Minimum coverage: 70% overall
- Critical paths: 90%+ coverage
- New code should not decrease coverage

### Writing Tests

**Unit Test Example (NestJS):**
```typescript
describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ProductsService, PrismaService],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should create a product', async () => {
    const createDto = { name: 'Test Product', price: 99.99 };
    const result = await service.create(createDto);

    expect(result).toBeDefined();
    expect(result.name).toBe(createDto.name);
  });
});
```

**E2E Test Example (Playwright):**
```typescript
test('user can add product to cart', async ({ page }) => {
  await page.goto('/products');
  await page.click('[data-testid="product-card"]:first-child');
  await page.click('[data-testid="add-to-cart"]');

  await expect(page.locator('[data-testid="cart-count"]')).toHaveText('1');
});
```

## Pull Request Process

### Before Submitting

1. **Ensure all tests pass:**
   ```bash
   pnpm test
   pnpm test:e2e
   ```

2. **Check code quality:**
   ```bash
   pnpm lint
   pnpm type-check
   ```

3. **Update documentation** if needed

4. **Review your own code** first

### PR Title Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

Examples:
feat(auth): add OAuth2 Google login
fix(cart): resolve race condition in cart updates
docs(api): update authentication endpoints documentation
refactor(products): simplify product filtering logic
test(checkout): add E2E tests for checkout flow
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `ci`: CI/CD changes

### PR Description Template

Your PR should include:

```markdown
## Description
Brief description of what this PR does and why.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Related Issues
Closes #123
Related to #456

## Changes Made
- Detailed list of changes
- Another change
- Yet another change

## Testing Done
- [ ] Unit tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed
- [ ] All tests pass locally

## Screenshots (if applicable)
[Add screenshots for UI changes]

## Checklist
- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code where necessary
- [ ] I have updated the documentation accordingly
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix/feature works
- [ ] New and existing tests pass locally
- [ ] Any dependent changes have been merged

## Additional Notes
Any additional information reviewers should know.
```

### Review Process

1. **Automated checks must pass:**
   - Linting
   - Type checking
   - Unit tests
   - E2E tests
   - Build verification

2. **Code review required:**
   - At least 1 approval from maintainers
   - All comments resolved
   - No requested changes pending

3. **Merge criteria:**
   - All CI checks green
   - Approved by reviewers
   - Up-to-date with base branch
   - No merge conflicts

## Code Review Checklist

### For Authors

Before requesting review:
- [ ] Code follows style guidelines
- [ ] No unnecessary comments or console.logs
- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] Documentation updated
- [ ] Self-reviewed the code

### For Reviewers

When reviewing:
- [ ] Code is clean and maintainable
- [ ] Logic is correct and efficient
- [ ] Edge cases are handled
- [ ] Error handling is appropriate
- [ ] Tests cover the changes
- [ ] No security vulnerabilities
- [ ] No performance issues
- [ ] Documentation is clear and accurate

## Documentation Requirements

### When to Update Documentation

Update documentation when you:
- Add or modify API endpoints
- Change environment variables
- Add new features
- Modify configuration
- Change development setup
- Update dependencies with breaking changes

### Documentation Types

1. **Code Comments**: For complex logic
   ```typescript
   /**
    * Calculates tax based on location and product type.
    * Handles edge cases for digital products and international orders.
    *
    * @param amount - The base amount before tax
    * @param location - User's shipping location
    * @param productType - Type of product (PHYSICAL, DIGITAL, SERVICE)
    * @returns The calculated tax amount
    */
   function calculateTax(amount: number, location: Location, productType: ProductType): number {
     // Implementation
   }
   ```

2. **API Documentation**: Update Swagger/OpenAPI specs
   ```typescript
   @ApiOperation({ summary: 'Create a new product' })
   @ApiResponse({ status: 201, description: 'Product created successfully', type: ProductDto })
   @ApiResponse({ status: 400, description: 'Invalid input' })
   ```

3. **README Updates**: For setup or usage changes

4. **Architecture Decision Records (ADRs)**: For significant architectural changes (see `docs/ADR/`)

### Documentation Standards

- Use clear, concise language
- Include code examples
- Keep documentation up-to-date with code
- Use Markdown formatting
- Link to related documentation

## Getting Help

### Resources

- **Documentation**: Check `/docs` directory
- **API Docs**: http://localhost:4000/api/docs (when running locally)
- **Troubleshooting**: See [TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)

### Communication Channels

- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and general discussion
- **Pull Requests**: For code-related discussions

### Common Issues

See [Troubleshooting Guide](./docs/TROUBLESHOOTING.md) for solutions to common problems.

### Asking Questions

When asking for help:
1. Check existing documentation first
2. Search for similar issues
3. Provide context and code examples
4. Include error messages and logs
5. Describe what you've tried

## License

By contributing to CitadelBuy, you agree that your contributions will be licensed under the same license as the project.

## Thank You!

Your contributions make CitadelBuy better for everyone. We appreciate your time and effort!
