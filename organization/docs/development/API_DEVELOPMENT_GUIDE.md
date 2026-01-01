# API Development Guide

This guide covers best practices for developing APIs in the Broxiva platform using NestJS.

## Table of Contents

- [Module Structure](#module-structure)
- [Creating a New Module](#creating-a-new-module)
- [Controllers](#controllers)
- [Services](#services)
- [DTOs and Validation](#dtos-and-validation)
- [Error Handling](#error-handling)
- [Authentication & Authorization](#authentication--authorization)
- [Database Operations](#database-operations)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Best Practices](#best-practices)

## Module Structure

Each feature module should follow this structure:

```
modules/
└── products/
    ├── dto/
    │   ├── create-product.dto.ts
    │   ├── update-product.dto.ts
    │   ├── product.dto.ts
    │   └── index.ts
    ├── entities/
    │   └── product.entity.ts
    ├── products.controller.ts
    ├── products.controller.spec.ts
    ├── products.service.ts
    ├── products.service.spec.ts
    └── products.module.ts
```

## Creating a New Module

### Step 1: Generate Module Files

```bash
# Navigate to API directory
cd apps/api

# Generate module
npx nest g module modules/products

# Generate controller
npx nest g controller modules/products

# Generate service
npx nest g service modules/products
```

### Step 2: Define the Module

```typescript
// products.module.ts
import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { PrismaModule } from '@/common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService], // Export if used by other modules
})
export class ProductsModule {}
```

## Controllers

Controllers handle HTTP requests and return responses.

### Basic Controller Structure

```typescript
// products.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto, ProductDto } from './dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all products' })
  @ApiResponse({
    status: 200,
    description: 'Products retrieved successfully',
    type: [ProductDto],
  })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('category') category?: string,
  ): Promise<ProductDto[]> {
    return this.productsService.findAll({ page, limit, search, category });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiResponse({
    status: 200,
    description: 'Product found',
    type: ProductDto,
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findOne(@Param('id') id: string): Promise<ProductDto> {
    return this.productsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'VENDOR')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new product' })
  @ApiResponse({
    status: 201,
    description: 'Product created successfully',
    type: ProductDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async create(
    @Body() createProductDto: CreateProductDto,
    @CurrentUser() user: any,
  ): Promise<ProductDto> {
    return this.productsService.create(createProductDto, user.id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'VENDOR')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a product' })
  @ApiResponse({
    status: 200,
    description: 'Product updated successfully',
    type: ProductDto,
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @CurrentUser() user: any,
  ): Promise<ProductDto> {
    return this.productsService.update(id, updateProductDto, user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a product' })
  @ApiResponse({ status: 204, description: 'Product deleted successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.productsService.remove(id);
  }
}
```

### Controller Best Practices

1. **Use appropriate HTTP methods**:
   - GET: Retrieve data
   - POST: Create new resource
   - PUT/PATCH: Update existing resource
   - DELETE: Remove resource

2. **Use proper status codes**:
   - 200: Success
   - 201: Created
   - 204: No Content
   - 400: Bad Request
   - 401: Unauthorized
   - 403: Forbidden
   - 404: Not Found
   - 500: Internal Server Error

3. **Keep controllers thin**: Business logic belongs in services

4. **Use decorators properly**: Guards, interceptors, pipes

## Services

Services contain business logic and data access.

### Basic Service Structure

```typescript
// products.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateProductDto, UpdateProductDto, ProductDto } from './dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(options?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
  }): Promise<ProductDto[]> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {};

    if (options?.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { description: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    if (options?.category) {
      where.categoryId = options.category;
    }

    const products = await this.prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
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

    return products.map((product) => this.mapToDto(product));
  }

  async findOne(id: string): Promise<ProductDto> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        vendor: {
          select: {
            id: true,
            name: true,
          },
        },
        reviews: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      this.logger.warn(`Product not found: ${id}`);
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return this.mapToDto(product);
  }

  async create(
    createProductDto: CreateProductDto,
    userId: string,
  ): Promise<ProductDto> {
    this.logger.log(`Creating product: ${createProductDto.name}`);

    try {
      const product = await this.prisma.product.create({
        data: {
          ...createProductDto,
          slug: this.generateSlug(createProductDto.name),
          vendorId: userId,
        },
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

      this.logger.log(`Product created: ${product.id}`);
      return this.mapToDto(product);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Product with this name already exists');
        }
      }
      this.logger.error(`Failed to create product: ${error.message}`);
      throw error;
    }
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
    userId: string,
  ): Promise<ProductDto> {
    const product = await this.findOne(id);

    // Check ownership (vendors can only update their own products)
    if (product.vendorId !== userId) {
      throw new ForbiddenException('You can only update your own products');
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: updateProductDto,
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

    this.logger.log(`Product updated: ${id}`);
    return this.mapToDto(updated);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id); // Ensure product exists

    await this.prisma.product.delete({
      where: { id },
    });

    this.logger.log(`Product deleted: ${id}`);
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private mapToDto(product: any): ProductDto {
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      stock: product.stock,
      slug: product.slug,
      categoryId: product.categoryId,
      vendorId: product.vendorId,
      images: product.images,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }
}
```

### Service Best Practices

1. **Single Responsibility**: Each method should do one thing
2. **Use logging**: Log important operations and errors
3. **Handle errors properly**: Throw appropriate exceptions
4. **Use transactions**: For operations that modify multiple records
5. **Optimize queries**: Avoid N+1 queries, use includes wisely

## DTOs and Validation

DTOs (Data Transfer Objects) define the shape of data and provide validation.

### Create DTO

```typescript
// dto/create-product.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  Min,
  Max,
  MaxLength,
  IsUUID,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({
    description: 'Product name',
    example: 'Wireless Keyboard',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Product description',
    example: 'High-quality wireless keyboard with RGB lighting',
    maxLength: 5000,
  })
  @IsString()
  @MaxLength(5000)
  description: string;

  @ApiProperty({
    description: 'Product price in USD',
    example: 79.99,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({
    description: 'Stock quantity',
    example: 100,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  stock: number;

  @ApiProperty({
    description: 'Category ID',
    example: 'cat_123456',
  })
  @IsUUID()
  categoryId: string;

  @ApiProperty({
    description: 'Product images',
    example: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiProperty({
    description: 'Product discount percentage',
    example: 10,
    required: false,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discount?: number;
}
```

### Update DTO

```typescript
// dto/update-product.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';

// PartialType makes all fields optional
export class UpdateProductDto extends PartialType(CreateProductDto) {}
```

### Response DTO

```typescript
// dto/product.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class ProductDto {
  @ApiProperty({ description: 'Product ID' })
  id: string;

  @ApiProperty({ description: 'Product name' })
  name: string;

  @ApiProperty({ description: 'Product description' })
  description: string;

  @ApiProperty({ description: 'Product price' })
  price: number;

  @ApiProperty({ description: 'Stock quantity' })
  stock: number;

  @ApiProperty({ description: 'Product slug' })
  slug: string;

  @ApiProperty({ description: 'Category ID' })
  categoryId: string;

  @ApiProperty({ description: 'Vendor ID' })
  vendorId: string;

  @ApiProperty({ description: 'Product images' })
  images: string[];

  @ApiProperty({ description: 'Creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: Date;
}
```

### Index File

```typescript
// dto/index.ts
export * from './create-product.dto';
export * from './update-product.dto';
export * from './product.dto';
```

### Common Validators

```typescript
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsEmail,
  IsUUID,
  IsUrl,
  IsDate,
  IsEnum,
  IsArray,
  IsOptional,
  Min,
  Max,
  MinLength,
  MaxLength,
  Matches,
  ValidateNested,
} from 'class-validator';

// String validation
@IsString()
@MinLength(3)
@MaxLength(100)
name: string;

// Email validation
@IsEmail()
email: string;

// Number validation
@IsNumber()
@Min(0)
@Max(100)
price: number;

// Boolean validation
@IsBoolean()
isActive: boolean;

// UUID validation
@IsUUID()
id: string;

// URL validation
@IsUrl()
website: string;

// Enum validation
enum Status {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

@IsEnum(Status)
status: Status;

// Array validation
@IsArray()
@IsString({ each: true })
tags: string[];

// Optional field
@IsOptional()
@IsString()
description?: string;

// Pattern matching
@Matches(/^[A-Z0-9]{6}$/)
code: string;

// Nested validation
@ValidateNested()
@Type(() => AddressDto)
address: AddressDto;
```

## Error Handling

### Custom Exceptions

```typescript
// exceptions/insufficient-stock.exception.ts
import { HttpException, HttpStatus } from '@nestjs/common';

export class InsufficientStockException extends HttpException {
  constructor(productId: string, requested: number, available: number) {
    super(
      {
        statusCode: HttpStatus.CONFLICT,
        message: 'Insufficient stock',
        error: 'INSUFFICIENT_STOCK',
        details: {
          productId,
          requested,
          available,
        },
      },
      HttpStatus.CONFLICT,
    );
  }
}
```

### Using Exceptions

```typescript
import {
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';

// Not found
throw new NotFoundException('Product not found');

// Bad request
throw new BadRequestException('Invalid product data');

// Unauthorized
throw new UnauthorizedException('You must be logged in');

// Forbidden
throw new ForbiddenException('You do not have permission');

// Conflict
throw new ConflictException('Product already exists');

// Internal error
throw new InternalServerErrorException('Something went wrong');

// Custom exception
throw new InsufficientStockException('prod_123', 10, 5);
```

## Authentication & Authorization

### JWT Auth Guard

```typescript
// Use on routes that require authentication
@UseGuards(JwtAuthGuard)
@Get('profile')
getProfile(@CurrentUser() user: User) {
  return user;
}
```

### Roles Guard

```typescript
// Use on routes that require specific roles
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'VENDOR')
@Post()
create(@Body() dto: CreateProductDto) {
  // Only ADMIN and VENDOR can access
}
```

### Current User Decorator

```typescript
// decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

## Database Operations

### Basic Queries

```typescript
// Find all
const products = await this.prisma.product.findMany();

// Find one
const product = await this.prisma.product.findUnique({
  where: { id },
});

// Find with conditions
const products = await this.prisma.product.findMany({
  where: {
    price: { gte: 10, lte: 100 },
    stock: { gt: 0 },
  },
});

// Create
const product = await this.prisma.product.create({
  data: createProductDto,
});

// Update
const product = await this.prisma.product.update({
  where: { id },
  data: updateProductDto,
});

// Delete
await this.prisma.product.delete({
  where: { id },
});
```

### Relations

```typescript
// Include relations
const product = await this.prisma.product.findUnique({
  where: { id },
  include: {
    category: true,
    vendor: true,
    reviews: true,
  },
});

// Select specific fields
const product = await this.prisma.product.findUnique({
  where: { id },
  select: {
    id: true,
    name: true,
    price: true,
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
async findAll(page: number = 1, limit: number = 20) {
  const skip = (page - 1) * limit;

  const [products, total] = await Promise.all([
    this.prisma.product.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    this.prisma.product.count(),
  ]);

  return {
    data: products,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
```

### Transactions

```typescript
async createOrderWithItems(orderDto: CreateOrderDto) {
  return this.prisma.$transaction(async (prisma) => {
    // Create order
    const order = await prisma.order.create({
      data: {
        userId: orderDto.userId,
        total: orderDto.total,
      },
    });

    // Create order items
    await prisma.orderItem.createMany({
      data: orderDto.items.map((item) => ({
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
      })),
    });

    // Update product stock
    for (const item of orderDto.items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: {
          stock: { decrement: item.quantity },
        },
      });
    }

    return order;
  });
}
```

## API Documentation

### Swagger Tags

```typescript
@ApiTags('products')
@Controller('products')
export class ProductsController {}
```

### Operation Documentation

```typescript
@ApiOperation({ summary: 'Create a new product' })
@ApiResponse({
  status: 201,
  description: 'Product created successfully',
  type: ProductDto,
})
@ApiResponse({ status: 400, description: 'Invalid input' })
@Post()
create(@Body() dto: CreateProductDto) {}
```

### Bearer Auth

```typescript
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Get('profile')
getProfile() {}
```

## Testing

### Unit Tests

```typescript
// products.service.spec.ts
describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: PrismaService,
          useValue: {
            product: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('findOne', () => {
    it('should return a product', async () => {
      const mockProduct = {
        id: '1',
        name: 'Test Product',
        price: 99.99,
      };

      jest.spyOn(prisma.product, 'findUnique').mockResolvedValue(mockProduct as any);

      const result = await service.findOne('1');

      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException', async () => {
      jest.spyOn(prisma.product, 'findUnique').mockResolvedValue(null);

      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
    });
  });
});
```

### Integration Tests

```typescript
// products.e2e-spec.ts
describe('ProductsController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get<PrismaService>(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe('/products (GET)', () => {
    it('should return products', () => {
      return request(app.getHttpServer())
        .get('/products')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });
});
```

## Best Practices

### 1. Use Environment Variables

```typescript
// config/app.config.ts
export default () => ({
  port: parseInt(process.env.PORT, 10) || 4000,
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
});
```

### 2. Use Validation Pipes

```typescript
// main.ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
);
```

### 3. Use Logging

```typescript
private readonly logger = new Logger(ProductsService.name);

this.logger.log('Creating product');
this.logger.error('Failed to create product', error.stack);
this.logger.warn('Product stock low');
```

### 4. Handle Async Operations

```typescript
// Always use try-catch for async operations
try {
  await this.someAsyncOperation();
} catch (error) {
  this.logger.error('Operation failed', error.stack);
  throw new InternalServerErrorException('Operation failed');
}
```

### 5. Use Proper Status Codes

```typescript
@HttpCode(HttpStatus.CREATED)
@Post()
create() {}

@HttpCode(HttpStatus.NO_CONTENT)
@Delete(':id')
remove() {}
```

### 6. Implement Pagination

```typescript
@Get()
async findAll(
  @Query('page') page: number = 1,
  @Query('limit') limit: number = 20,
) {
  // Implement pagination
}
```

### 7. Use Query Builders for Complex Queries

```typescript
const products = await this.prisma.product.findMany({
  where: {
    AND: [
      { price: { gte: minPrice } },
      { price: { lte: maxPrice } },
      { stock: { gt: 0 } },
    ],
    OR: [
      { name: { contains: search } },
      { description: { contains: search } },
    ],
  },
});
```

## Additional Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [class-validator Documentation](https://github.com/typestack/class-validator)
- [Swagger/OpenAPI Specification](https://swagger.io/specification/)
