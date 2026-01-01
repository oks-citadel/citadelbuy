# Developer Quick Reference

Quick reference guide for common development tasks and commands.

## Quick Links

- **Frontend**: http://localhost:3000
- **API**: http://localhost:4000/api
- **API Docs**: http://localhost:4000/api/docs
- **Prisma Studio**: http://localhost:5555 (run `pnpm prisma:studio`)

## Essential Commands

### Development

```bash
# Start all services
pnpm dev

# Start specific service
pnpm dev:api          # Backend only
pnpm dev:web          # Frontend only

# Start infrastructure
pnpm docker:up        # Start PostgreSQL, Redis, etc.
pnpm docker:down      # Stop infrastructure
pnpm docker:logs      # View logs
```

### Code Quality

```bash
# Lint code
pnpm lint             # Check for issues
pnpm lint --fix       # Auto-fix issues

# Type checking
pnpm type-check       # Check TypeScript types

# Format code
pnpm format           # Format all files with Prettier
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests for specific workspace
pnpm test:api         # Backend tests
pnpm test:web         # Frontend tests

# Run E2E tests
pnpm test:e2e

# Watch mode
cd apps/api && pnpm test:watch

# Coverage
pnpm test:cov
```

### Database

```bash
# Migrations
pnpm db:migrate       # Run migrations
pnpm db:seed          # Seed database

# Prisma
pnpm prisma:generate  # Generate Prisma Client
pnpm prisma:studio    # Open Prisma Studio

# Reset (WARNING: deletes all data)
cd apps/api && pnpm db:migrate:reset
```

### Build

```bash
# Build all
pnpm build

# Build specific workspace
pnpm build:api
pnpm build:web
```

## Git Workflow

### Starting a New Feature

```bash
# Update your develop branch
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feature/add-wishlist

# Make changes and commit
git add .
git commit -m "feat(products): add wishlist functionality"

# Push to your fork
git push origin feature/add-wishlist
```

### Commit Message Format

```
<type>(<scope>): <subject>

Types: feat, fix, docs, style, refactor, test, chore
Examples:
  feat(auth): add OAuth2 login
  fix(cart): resolve race condition
  docs(api): update endpoint documentation
```

### Update Feature Branch

```bash
# Fetch latest changes
git fetch origin

# Rebase on develop
git checkout feature/my-feature
git rebase origin/develop

# Resolve conflicts if any
git add .
git rebase --continue

# Force push (only on feature branches!)
git push --force-with-lease origin feature/my-feature
```

## Creating New Features

### Backend (NestJS)

```bash
cd apps/api

# Generate module
npx nest g module modules/feature-name

# Generate controller
npx nest g controller modules/feature-name

# Generate service
npx nest g service modules/feature-name
```

### Frontend (Next.js)

```bash
cd apps/web/src

# Create new page
mkdir -p app/my-page
cd app/my-page
touch page.tsx

# Create new component
mkdir -p components/my-component
cd components/my-component
touch MyComponent.tsx
```

## Common Code Patterns

### Backend Controller

```typescript
@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all products' })
  async findAll(@Query() query: any) {
    return this.service.findAll(query);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create product' })
  async create(@Body() dto: CreateDto) {
    return this.service.create(dto);
  }
}
```

### Backend Service

```typescript
@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.product.findMany();
  }

  async findOne(id: string) {
    const item = await this.prisma.product.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`Item ${id} not found`);
    return item;
  }
}
```

### DTO with Validation

```typescript
export class CreateProductDto {
  @ApiProperty()
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
```

### Frontend Server Component

```typescript
// app/products/page.tsx
export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <div>
      <h1>Products</h1>
      <ProductList products={products} />
    </div>
  );
}
```

### Frontend Client Component

```typescript
'use client';

import { useState } from 'react';

interface Props {
  product: Product;
}

export function ProductCard({ product }: Props) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      await addToCart(product.id);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button onClick={handleClick} disabled={isLoading}>
      {isLoading ? 'Adding...' : 'Add to Cart'}
    </button>
  );
}
```

### Custom Hook

```typescript
export function useCart() {
  const { items, addItem, removeItem } = useCartStore();

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items],
  );

  return {
    items,
    total,
    addItem,
    removeItem,
  };
}
```

## Database Queries

### Basic Operations

```typescript
// Find all
await prisma.product.findMany();

// Find one
await prisma.product.findUnique({ where: { id } });

// Create
await prisma.product.create({ data: dto });

// Update
await prisma.product.update({ where: { id }, data: dto });

// Delete
await prisma.product.delete({ where: { id } });
```

### With Relations

```typescript
await prisma.product.findMany({
  include: {
    category: true,
    vendor: {
      select: {
        id: true,
        name: true,
      },
    },
  },
});
```

### Pagination

```typescript
const page = 1;
const limit = 20;
const skip = (page - 1) * limit;

await prisma.product.findMany({
  skip,
  take: limit,
  orderBy: { createdAt: 'desc' },
});
```

### Search

```typescript
await prisma.product.findMany({
  where: {
    OR: [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ],
  },
});
```

## Environment Variables

### Backend (.env)

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/broxiva_dev"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# API
PORT=4000
NODE_ENV=development
API_URL=http://localhost:4000
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env.local)

```env
# API
NEXT_PUBLIC_API_URL=http://localhost:4000/api

# App
NEXT_PUBLIC_APP_NAME=Broxiva
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Error Handling

### Backend

```typescript
// Throw exceptions
throw new NotFoundException('Product not found');
throw new BadRequestException('Invalid data');
throw new UnauthorizedException('Not authenticated');
throw new ForbiddenException('No permission');

// Custom exception
export class CustomException extends HttpException {
  constructor(message: string) {
    super({ error: 'CUSTOM_ERROR', message }, HttpStatus.CONFLICT);
  }
}
```

### Frontend

```typescript
// Try-catch
try {
  const data = await apiCall();
} catch (error) {
  if (error instanceof ApiError) {
    toast.error(error.message);
  } else {
    toast.error('An unexpected error occurred');
  }
}

// Error boundary (app/error.tsx)
'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

## Testing Patterns

### Unit Test (Backend)

```typescript
describe('ProductsService', () => {
  let service: ProductsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ProductsService, PrismaService],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it('should return products', async () => {
    const result = await service.findAll();
    expect(Array.isArray(result)).toBe(true);
  });
});
```

### E2E Test (Backend)

```typescript
describe('/products (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  it('/products (GET)', () => {
    return request(app.getHttpServer()).get('/products').expect(200);
  });
});
```

### Component Test (Frontend)

```typescript
import { render, screen } from '@testing-library/react';

describe('ProductCard', () => {
  it('renders product name', () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText('Product Name')).toBeInTheDocument();
  });
});
```

## Debugging

### Backend

```typescript
// Use logger
this.logger.log('Info message');
this.logger.error('Error message', error.stack);
this.logger.debug('Debug info');

// Console in development
if (process.env.NODE_ENV === 'development') {
  console.log('Debug:', data);
}
```

### Frontend

```typescript
// Console logs (remove before commit)
console.log('Data:', data);

// React DevTools
// Install React DevTools browser extension

// Network tab
// Check API calls in browser DevTools
```

### VS Code Debugging

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug API",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["dev:api"],
      "cwd": "${workspaceFolder}"
    }
  ]
}
```

## Useful VS Code Shortcuts

- `Ctrl+Shift+P`: Command palette
- `Ctrl+P`: Quick open file
- `Ctrl+Shift+F`: Search in files
- `F2`: Rename symbol
- `Ctrl+.`: Quick fix
- `Ctrl+/`: Toggle comment
- `Alt+Up/Down`: Move line
- `Ctrl+D`: Select next occurrence
- `Ctrl+Shift+L`: Select all occurrences

## Docker Commands

```bash
# View running containers
docker ps

# View logs
docker logs <container-id>

# Access container shell
docker exec -it <container-id> /bin/bash

# Remove all containers
docker-compose down -v

# Rebuild images
docker-compose build --no-cache
```

## Database CLI

```bash
# PostgreSQL
psql -h localhost -U postgres -d broxiva_dev

# Common commands
\dt          # List tables
\d products  # Describe table
\q           # Quit
```

## Common Issues & Solutions

### Port Already in Use

```bash
# Find process (Mac/Linux)
lsof -ti:4000

# Kill process
kill -9 <PID>

# Windows
netstat -ano | findstr :4000
taskkill /PID <PID> /F
```

### Node Modules Issues

```bash
# Clean and reinstall
pnpm clean
pnpm install

# Clear cache
pnpm store prune
```

### Database Connection Failed

```bash
# Restart PostgreSQL
pnpm docker:down
pnpm docker:up

# Check connection
psql -h localhost -U postgres
```

### Prisma Issues

```bash
cd apps/api

# Regenerate client
npx prisma generate

# Reset database
npx prisma migrate reset
```

## Code Review Checklist

- [ ] Code follows style guidelines
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No console.logs left
- [ ] No commented code
- [ ] Proper error handling
- [ ] TypeScript types defined
- [ ] Commit messages follow convention
- [ ] PR template filled out

## Performance Tips

### Backend

- Use database indexes
- Avoid N+1 queries
- Use pagination
- Implement caching (Redis)
- Use database transactions
- Optimize Prisma queries

### Frontend

- Use Next.js Image component
- Implement code splitting
- Use React.memo for expensive components
- Implement lazy loading
- Optimize bundle size
- Use proper loading states

## Security Checklist

- [ ] Validate all inputs
- [ ] Sanitize user data
- [ ] Use prepared statements (Prisma does this)
- [ ] Implement rate limiting
- [ ] Use HTTPS in production
- [ ] Never commit secrets
- [ ] Use environment variables
- [ ] Implement CSRF protection
- [ ] Sanitize HTML content
- [ ] Use authentication guards

## Resources

### Documentation
- [NestJS Docs](https://docs.nestjs.com/)
- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

### Internal Docs
- [Contributing Guide](../../CONTRIBUTING.md)
- [Git Workflow](./GIT_WORKFLOW.md)
- [Coding Standards](./CODING_STANDARDS.md)
- [API Development](./API_DEVELOPMENT_GUIDE.md)

### Getting Help
- Check documentation first
- Search existing issues
- Ask in team discussions
- Contact maintainers

## Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Customer | customer@broxiva.com | password123 |
| Admin | admin@broxiva.com | password123 |
| Vendor | vendor1@broxiva.com | password123 |
