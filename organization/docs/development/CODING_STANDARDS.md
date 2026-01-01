# Coding Standards

This document defines the coding standards and best practices for the Broxiva platform.

## Table of Contents

- [General Principles](#general-principles)
- [TypeScript Conventions](#typescript-conventions)
- [NestJS Backend Patterns](#nestjs-backend-patterns)
- [React/Next.js Frontend Patterns](#reactnextjs-frontend-patterns)
- [Naming Conventions](#naming-conventions)
- [File Organization](#file-organization)
- [Error Handling](#error-handling)
- [Logging Standards](#logging-standards)
- [Security Best Practices](#security-best-practices)
- [Performance Guidelines](#performance-guidelines)
- [Testing Standards](#testing-standards)

## General Principles

### Code Quality

1. **SOLID Principles**: Follow SOLID design principles
2. **DRY (Don't Repeat Yourself)**: Avoid code duplication
3. **KISS (Keep It Simple, Stupid)**: Prefer simple solutions
4. **YAGNI (You Aren't Gonna Need It)**: Don't add functionality until needed
5. **Clean Code**: Write self-documenting, readable code

### Code Review Mindset

- Code is written once but read many times
- Optimize for readability and maintainability
- Think about the next developer who will work on your code
- Leave code better than you found it (Boy Scout Rule)

## TypeScript Conventions

### Type System

#### Use Strict Mode

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "strictBindCallApply": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

#### Prefer Interfaces Over Types

```typescript
// Good
interface User {
  id: string;
  email: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
}

// Use type for unions, intersections, or mapped types
type Status = 'active' | 'inactive' | 'pending';
type ReadonlyUser = Readonly<User>;
type PartialProduct = Partial<Product>;
```

#### Avoid `any`

```typescript
// Bad
function processData(data: any): any {
  return data.value;
}

// Good
function processData<T>(data: T): T {
  return data;
}

// Or use unknown when type is truly unknown
function processUnknownData(data: unknown): string {
  if (typeof data === 'string') {
    return data;
  }
  return JSON.stringify(data);
}
```

#### Use Type Inference

```typescript
// Bad - unnecessary type annotation
const count: number = 10;
const name: string = 'Product';

// Good - let TypeScript infer
const count = 10;
const name = 'Product';

// Good - explicit when needed
const users: User[] = [];
const config: Config = loadConfig();
```

#### Define Proper Types for Function Parameters and Returns

```typescript
// Bad
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// Good
interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

function calculateTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}
```

### Variables and Constants

```typescript
// Use const by default
const MAX_RETRIES = 3;
const API_BASE_URL = process.env.API_BASE_URL;

// Use let when value will change
let currentPage = 1;
let isLoading = false;

// Never use var
// var x = 10; // ❌ Don't use var
```

### Functions

```typescript
// Prefer arrow functions for callbacks
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map((n) => n * 2);

// Use regular functions for methods with 'this' context
class Calculator {
  constructor(private value: number) {}

  add(n: number): number {
    return this.value + n;
  }
}

// Use async/await over promises
// Bad
function fetchUser(id: string) {
  return fetch(`/api/users/${id}`)
    .then((res) => res.json())
    .then((data) => data.user);
}

// Good
async function fetchUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  const data = await response.json();
  return data.user;
}
```

### Enums and Constants

```typescript
// Use string enums for better debugging
enum OrderStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

// Or use const objects for similar functionality
const OrderStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
} as const;

type OrderStatusType = typeof OrderStatus[keyof typeof OrderStatus];
```

### Generics

```typescript
// Use descriptive generic names
interface ApiResponse<TData, TError = Error> {
  data: TData | null;
  error: TError | null;
  status: number;
}

// Generic function
function createResource<T>(data: Partial<T>): T {
  // Implementation
  return data as T;
}

// Generic class
class DataStore<T> {
  private items: T[] = [];

  add(item: T): void {
    this.items.push(item);
  }

  getAll(): T[] {
    return [...this.items];
  }
}
```

## NestJS Backend Patterns

### Module Structure

```typescript
// product.module.ts
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

### Controllers

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
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto, ProductDto } from './dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all products' })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully', type: [ProductDto] })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<ProductDto[]> {
    return this.productsService.findAll({ page, limit });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiResponse({ status: 200, description: 'Product found', type: ProductDto })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findOne(@Param('id') id: string): Promise<ProductDto> {
    return this.productsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'VENDOR')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new product' })
  @ApiResponse({ status: 201, description: 'Product created successfully', type: ProductDto })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async create(@Body() createProductDto: CreateProductDto): Promise<ProductDto> {
    return this.productsService.create(createProductDto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'VENDOR')
  @ApiOperation({ summary: 'Update a product' })
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ): Promise<ProductDto> {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a product' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.productsService.remove(id);
  }
}
```

### Services

```typescript
// products.service.ts
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateProductDto, UpdateProductDto, ProductDto } from './dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(options?: { page?: number; limit?: number }): Promise<ProductDto[]> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const products = await this.prisma.product.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        category: true,
        vendor: true,
      },
    });

    return products.map((product) => this.mapToDto(product));
  }

  async findOne(id: string): Promise<ProductDto> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        vendor: true,
        reviews: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return this.mapToDto(product);
  }

  async create(createProductDto: CreateProductDto): Promise<ProductDto> {
    try {
      const product = await this.prisma.product.create({
        data: {
          ...createProductDto,
          slug: this.generateSlug(createProductDto.name),
        },
        include: {
          category: true,
          vendor: true,
        },
      });

      return this.mapToDto(product);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Product with this name already exists');
        }
      }
      throw error;
    }
  }

  async update(id: string, updateProductDto: UpdateProductDto): Promise<ProductDto> {
    await this.findOne(id); // Ensure product exists

    const product = await this.prisma.product.update({
      where: { id },
      data: updateProductDto,
      include: {
        category: true,
        vendor: true,
      },
    });

    return this.mapToDto(product);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id); // Ensure product exists

    await this.prisma.product.delete({
      where: { id },
    });
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
      slug: product.slug,
      // Map other fields
    };
  }
}
```

### DTOs (Data Transfer Objects)

```typescript
// dto/create-product.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min, MaxLength } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ description: 'Product name', example: 'Wireless Mouse' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ description: 'Product description', example: 'High-quality wireless mouse' })
  @IsString()
  @MaxLength(5000)
  description: string;

  @ApiProperty({ description: 'Product price', example: 29.99 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ description: 'Stock quantity', example: 100 })
  @IsNumber()
  @Min(0)
  stock: number;

  @ApiProperty({ description: 'Category ID', example: 'cat_123' })
  @IsString()
  categoryId: string;

  @ApiProperty({ description: 'Product images', required: false })
  @IsOptional()
  @IsString({ each: true })
  images?: string[];
}

// dto/update-product.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';

export class UpdateProductDto extends PartialType(CreateProductDto) {}

// dto/product.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class ProductDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  price: number;

  @ApiProperty()
  stock: number;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  categoryId: string;

  @ApiProperty()
  images: string[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

// dto/index.ts
export * from './create-product.dto';
export * from './update-product.dto';
export * from './product.dto';
```

### Custom Exceptions

```typescript
// exceptions/product-not-found.exception.ts
import { NotFoundException } from '@nestjs/common';

export class ProductNotFoundException extends NotFoundException {
  constructor(productId: string) {
    super(`Product with ID ${productId} not found`);
  }
}

// Usage
throw new ProductNotFoundException('prod_123');
```

### Guards

```typescript
// guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '@/common/decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}
```

### Interceptors

```typescript
// interceptors/transform.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  data: T;
  statusCode: number;
  message: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => ({
        data,
        statusCode: context.switchToHttp().getResponse().statusCode,
        message: 'Success',
      })),
    );
  }
}
```

## React/Next.js Frontend Patterns

### Component Structure

```typescript
// components/ProductCard.tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/hooks/use-cart';
import { Product } from '@/types/product';
import { formatCurrency } from '@/lib/utils';

interface ProductCardProps {
  product: Product;
  onAddToCart?: (productId: string) => void;
  className?: string;
}

export function ProductCard({ product, onAddToCart, className }: ProductCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { addItem } = useCart();

  const handleAddToCart = async () => {
    setIsLoading(true);
    try {
      await addItem(product.id);
      onAddToCart?.(product.id);
    } catch (error) {
      console.error('Failed to add to cart:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`rounded-lg border bg-card text-card-foreground shadow-sm ${className}`}>
      <Link href={`/products/${product.slug}`}>
        <div className="relative h-48 w-full">
          <Image
            src={product.images[0] || '/placeholder.png'}
            alt={product.name}
            fill
            className="object-cover rounded-t-lg"
          />
        </div>
      </Link>

      <div className="p-4">
        <Link href={`/products/${product.slug}`}>
          <h3 className="font-semibold text-lg hover:underline">{product.name}</h3>
        </Link>

        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
          {product.description}
        </p>

        <div className="flex items-center justify-between mt-4">
          <span className="text-xl font-bold">{formatCurrency(product.price)}</span>
          {product.stock > 0 ? (
            <Badge>In Stock</Badge>
          ) : (
            <Badge variant="destructive">Out of Stock</Badge>
          )}
        </div>

        <Button
          onClick={handleAddToCart}
          disabled={isLoading || product.stock === 0}
          className="w-full mt-4"
        >
          {isLoading ? 'Adding...' : 'Add to Cart'}
        </Button>
      </div>
    </div>
  );
}
```

### Server Components (Next.js App Router)

```typescript
// app/products/[slug]/page.tsx
import { notFound } from 'next/navigation';
import { getProductBySlug } from '@/lib/api/products';
import { ProductDetails } from '@/components/product/ProductDetails';
import { RelatedProducts } from '@/components/product/RelatedProducts';

interface ProductPageProps {
  params: { slug: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

export async function generateMetadata({ params }: ProductPageProps) {
  const product = await getProductBySlug(params.slug);

  if (!product) {
    return {
      title: 'Product Not Found',
    };
  }

  return {
    title: product.name,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: [product.images[0]],
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const product = await getProductBySlug(params.slug);

  if (!product) {
    notFound();
  }

  return (
    <div className="container mx-auto py-8">
      <ProductDetails product={product} />
      <RelatedProducts categoryId={product.categoryId} currentProductId={product.id} />
    </div>
  );
}
```

### Custom Hooks

```typescript
// hooks/use-cart.ts
import { useState, useCallback } from 'react';
import { useCartStore } from '@/stores/cart-store';
import { toast } from 'sonner';

export function useCart() {
  const [isLoading, setIsLoading] = useState(false);
  const { items, addItem, removeItem, updateQuantity, clearCart } = useCartStore();

  const handleAddItem = useCallback(
    async (productId: string, quantity: number = 1) => {
      setIsLoading(true);
      try {
        await addItem(productId, quantity);
        toast.success('Added to cart');
      } catch (error) {
        toast.error('Failed to add to cart');
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [addItem],
  );

  const handleRemoveItem = useCallback(
    async (productId: string) => {
      try {
        await removeItem(productId);
        toast.success('Removed from cart');
      } catch (error) {
        toast.error('Failed to remove from cart');
        throw error;
      }
    },
    [removeItem],
  );

  return {
    items,
    isLoading,
    addItem: handleAddItem,
    removeItem: handleRemoveItem,
    updateQuantity,
    clearCart,
    totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
    totalPrice: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
  };
}
```

### State Management (Zustand)

```typescript
// stores/cart-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '@/lib/api-client';

interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

interface CartStore {
  items: CartItem[];
  isLoading: boolean;
  addItem: (productId: string, quantity?: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  clearCart: () => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isLoading: false,

      addItem: async (productId: string, quantity: number = 1) => {
        set({ isLoading: true });
        try {
          const response = await apiClient.post('/cart/items', { productId, quantity });
          const newItem = response.data;

          set((state) => {
            const existingItem = state.items.find((item) => item.productId === productId);
            if (existingItem) {
              return {
                items: state.items.map((item) =>
                  item.productId === productId
                    ? { ...item, quantity: item.quantity + quantity }
                    : item,
                ),
                isLoading: false,
              };
            }
            return {
              items: [...state.items, newItem],
              isLoading: false,
            };
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      removeItem: async (productId: string) => {
        try {
          await apiClient.delete(`/cart/items/${productId}`);
          set((state) => ({
            items: state.items.filter((item) => item.productId !== productId),
          }));
        } catch (error) {
          throw error;
        }
      },

      updateQuantity: async (productId: string, quantity: number) => {
        try {
          await apiClient.patch(`/cart/items/${productId}`, { quantity });
          set((state) => ({
            items: state.items.map((item) =>
              item.productId === productId ? { ...item, quantity } : item,
            ),
          }));
        } catch (error) {
          throw error;
        }
      },

      clearCart: () => {
        set({ items: [] });
      },
    }),
    {
      name: 'cart-storage',
    },
  ),
);
```

## Naming Conventions

### Files and Folders

```
# Components (PascalCase)
ProductCard.tsx
ShoppingCart.tsx
UserProfile.tsx

# Utilities/Helpers (kebab-case)
format-currency.ts
validate-email.ts
api-client.ts

# Hooks (camelCase with use- prefix)
use-cart.ts
use-auth.ts
use-debounce.ts

# Types/Interfaces (PascalCase)
product.types.ts
user.types.ts
api.types.ts

# Constants (SCREAMING_SNAKE_CASE in file, kebab-case filename)
api-constants.ts
app-config.ts

# Folders (kebab-case)
shopping-cart/
user-profile/
product-catalog/
```

### Variables and Functions

```typescript
// Variables: camelCase
const userName = 'John';
const productList = [];
const isLoading = false;

// Constants: SCREAMING_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;
const API_BASE_URL = 'https://api.example.com';
const DEFAULT_PAGE_SIZE = 20;

// Functions: camelCase, descriptive verbs
function calculateTotal() {}
function fetchUserData() {}
function validateEmail() {}

// Boolean functions: is/has/should prefix
function isValidEmail() {}
function hasPermission() {}
function shouldDisplayBanner() {}

// Async functions: clear naming
async function fetchProducts() {}
async function createOrder() {}
```

### Classes and Interfaces

```typescript
// Classes: PascalCase
class UserService {}
class ProductRepository {}
class AuthGuard {}

// Interfaces: PascalCase, often with 'I' prefix optional
interface User {}
interface IUserService {} // Optional 'I' prefix
interface Product {}

// Types: PascalCase
type OrderStatus = 'pending' | 'completed';
type ApiResponse<T> = { data: T; error: string | null };
```

### React Components

```typescript
// Component files: PascalCase
ProductCard.tsx;
UserProfile.tsx;
ShoppingCart.tsx;

// Component names match file names
export function ProductCard() {}
export function UserProfile() {}

// Props interfaces: ComponentNameProps
interface ProductCardProps {}
interface UserProfileProps {}
```

## File Organization

### Backend Structure (NestJS)

```
apps/api/src/
├── common/              # Shared utilities
│   ├── decorators/     # Custom decorators
│   ├── filters/        # Exception filters
│   ├── guards/         # Auth guards
│   ├── interceptors/   # Interceptors
│   ├── middleware/     # Middleware
│   ├── pipes/          # Validation pipes
│   └── utils/          # Utility functions
├── config/             # Configuration files
│   ├── app.config.ts
│   ├── database.config.ts
│   └── redis.config.ts
├── modules/            # Feature modules
│   ├── auth/
│   │   ├── dto/
│   │   ├── guards/
│   │   ├── strategies/
│   │   ├── auth.controller.ts
│   │   ├── auth.module.ts
│   │   ├── auth.service.ts
│   │   └── auth.service.spec.ts
│   ├── products/
│   │   ├── dto/
│   │   ├── entities/
│   │   ├── products.controller.ts
│   │   ├── products.module.ts
│   │   ├── products.service.ts
│   │   └── products.service.spec.ts
│   └── ...
├── app.module.ts
└── main.ts
```

### Frontend Structure (Next.js)

```
apps/web/src/
├── app/                # Next.js App Router
│   ├── (auth)/        # Route groups
│   │   ├── login/
│   │   └── register/
│   ├── (shop)/
│   │   ├── products/
│   │   ├── cart/
│   │   └── checkout/
│   ├── api/           # API routes
│   ├── layout.tsx
│   └── page.tsx
├── components/         # React components
│   ├── ui/            # Base UI components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   └── ...
│   ├── layout/        # Layout components
│   │   ├── header.tsx
│   │   ├── footer.tsx
│   │   └── sidebar.tsx
│   ├── product/       # Product-related
│   │   ├── ProductCard.tsx
│   │   ├── ProductList.tsx
│   │   └── ProductDetails.tsx
│   └── ...
├── hooks/             # Custom React hooks
│   ├── use-cart.ts
│   ├── use-auth.ts
│   └── use-debounce.ts
├── lib/               # Utilities
│   ├── api-client.ts
│   ├── utils.ts
│   └── validators.ts
├── stores/            # State management
│   ├── cart-store.ts
│   ├── auth-store.ts
│   └── ui-store.ts
├── types/             # TypeScript types
│   ├── product.ts
│   ├── user.ts
│   └── api.ts
└── styles/            # Global styles
    └── globals.css
```

## Error Handling

### Backend Error Handling

```typescript
// Custom exception
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

// Usage in service
async function addToCart(productId: string, quantity: number) {
  const product = await this.prisma.product.findUnique({ where: { id: productId } });

  if (!product) {
    throw new NotFoundException(`Product ${productId} not found`);
  }

  if (product.stock < quantity) {
    throw new InsufficientStockException(productId, quantity, product.stock);
  }

  // Proceed with adding to cart
}

// Global exception filter
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }
}
```

### Frontend Error Handling

```typescript
// Error boundary component
'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to error reporting service
    console.error('Error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h2 className="text-2xl font-bold">Something went wrong!</h2>
      <p className="mt-2 text-muted-foreground">{error.message}</p>
      <Button onClick={reset} className="mt-4">
        Try again
      </Button>
    </div>
  );
}

// API error handling
import axios, { AxiosError } from 'axios';
import { toast } from 'sonner';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public errors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function handleApiCall<T>(apiCall: () => Promise<T>): Promise<T> {
  try {
    return await apiCall();
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<any>;
      if (axiosError.response) {
        const { status, data } = axiosError.response;
        const message = data.message || 'An error occurred';
        throw new ApiError(status, message, data.errors);
      }
    }
    throw error;
  }
}

// Usage
try {
  const products = await handleApiCall(() => fetchProducts());
  // Use products
} catch (error) {
  if (error instanceof ApiError) {
    toast.error(error.message);
    // Handle specific error cases
    if (error.statusCode === 401) {
      // Redirect to login
    }
  } else {
    toast.error('An unexpected error occurred');
  }
}
```

## Logging Standards

### Backend Logging

```typescript
// Use built-in NestJS logger
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  async create(createProductDto: CreateProductDto): Promise<Product> {
    this.logger.log(`Creating product: ${createProductDto.name}`);

    try {
      const product = await this.prisma.product.create({ data: createProductDto });
      this.logger.log(`Product created successfully: ${product.id}`);
      return product;
    } catch (error) {
      this.logger.error(`Failed to create product: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findOne(id: string): Promise<Product> {
    this.logger.debug(`Fetching product: ${id}`);
    // Implementation
  }
}

// Log levels:
// logger.log() - General information
// logger.error() - Errors
// logger.warn() - Warnings
// logger.debug() - Debug information
// logger.verbose() - Detailed information
```

### Frontend Logging

```typescript
// lib/logger.ts
type LogLevel = 'log' | 'warn' | 'error' | 'info' | 'debug';

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  log(message: string, ...args: any[]) {
    if (this.isDevelopment) {
      console.log(`[LOG] ${message}`, ...args);
    }
  }

  error(message: string, error?: Error, ...args: any[]) {
    console.error(`[ERROR] ${message}`, error, ...args);
    // Send to error reporting service (e.g., Sentry)
    // sentryClient.captureException(error);
  }

  warn(message: string, ...args: any[]) {
    if (this.isDevelopment) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  info(message: string, ...args: any[]) {
    if (this.isDevelopment) {
      console.info(`[INFO] ${message}`, ...args);
    }
  }

  debug(message: string, ...args: any[]) {
    if (this.isDevelopment) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }
}

export const logger = new Logger();

// Usage
import { logger } from '@/lib/logger';

function addToCart(productId: string) {
  logger.info('Adding product to cart', { productId });
  try {
    // Implementation
    logger.log('Product added successfully');
  } catch (error) {
    logger.error('Failed to add product to cart', error as Error, { productId });
  }
}
```

## Security Best Practices

### Input Validation

```typescript
// Always validate and sanitize user input
import { IsString, IsEmail, MinLength, MaxLength, Matches } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Password must contain uppercase, lowercase, number and special character',
  })
  password: string;
}
```

### Authentication

```typescript
// Never store passwords in plain text
import * as bcrypt from 'bcrypt';

async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Use environment variables for secrets
const JWT_SECRET = process.env.JWT_SECRET;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

// Never expose secrets in responses
// Never log sensitive data
```

### SQL Injection Prevention

```typescript
// Use Prisma (parameterized queries) - automatically protected
const user = await prisma.user.findUnique({
  where: { email }, // Safe - parameterized
});

// If using raw queries, always use parameterized queries
const result = await prisma.$queryRaw`
  SELECT * FROM users WHERE email = ${email}
`; // Safe - parameterized
```

### XSS Prevention

```typescript
// React automatically escapes content
function ProductCard({ product }: { product: Product }) {
  return (
    <div>
      {/* Safe - React escapes by default */}
      <h3>{product.name}</h3>
      <p>{product.description}</p>

      {/* Dangerous - only use if you trust the content */}
      <div dangerouslySetInnerHTML={{ __html: product.htmlDescription }} />
    </div>
  );
}

// Sanitize HTML if needed
import DOMPurify from 'isomorphic-dompurify';

const cleanHtml = DOMPurify.sanitize(dirtyHtml);
```

## Performance Guidelines

### Database Queries

```typescript
// Bad - N+1 query problem
async function getProductsWithCategories() {
  const products = await prisma.product.findMany();
  for (const product of products) {
    product.category = await prisma.category.findUnique({
      where: { id: product.categoryId },
    });
  }
  return products;
}

// Good - Use relations
async function getProductsWithCategories() {
  return prisma.product.findMany({
    include: {
      category: true,
    },
  });
}

// Use select to limit fields
async function getProductList() {
  return prisma.product.findMany({
    select: {
      id: true,
      name: true,
      price: true,
      // Only select needed fields
    },
  });
}

// Use pagination
async function getProducts(page: number = 1, pageSize: number = 20) {
  return prisma.product.findMany({
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
}
```

### React Performance

```typescript
// Use React.memo for expensive components
import { memo } from 'react';

export const ProductCard = memo(({ product }: ProductCardProps) => {
  return <div>{/* Component JSX */}</div>;
});

// Use useCallback for callback functions
import { useCallback } from 'react';

function ProductList({ products }: { products: Product[] }) {
  const handleAddToCart = useCallback(
    (productId: string) => {
      // Add to cart logic
    },
    [], // Dependencies
  );

  return (
    <div>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} onAddToCart={handleAddToCart} />
      ))}
    </div>
  );
}

// Use useMemo for expensive calculations
import { useMemo } from 'react';

function ShoppingCart({ items }: { items: CartItem[] }) {
  const total = useMemo(() => {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [items]);

  return <div>Total: ${total}</div>;
}

// Use Next.js Image component
import Image from 'next/image';

<Image src="/product.jpg" alt="Product" width={500} height={500} priority />;
```

## Testing Standards

### Unit Tests

```typescript
// products.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '@/common/prisma/prisma.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductsService, PrismaService],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('findOne', () => {
    it('should return a product', async () => {
      const mockProduct = { id: '1', name: 'Test Product', price: 99.99 };
      jest.spyOn(prisma.product, 'findUnique').mockResolvedValue(mockProduct as any);

      const result = await service.findOne('1');

      expect(result).toEqual(mockProduct);
      expect(prisma.product.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException when product not found', async () => {
      jest.spyOn(prisma.product, 'findUnique').mockResolvedValue(null);

      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
    });
  });
});
```

### Integration Tests

```typescript
// products.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('ProductsController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/products (GET)', () => {
    it('should return array of products', () => {
      return request(app.getHttpServer())
        .get('/products')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('/products/:id (GET)', () => {
    it('should return a single product', async () => {
      const response = await request(app.getHttpServer()).get('/products/1').expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('price');
    });
  });
});
```

### Frontend Tests

```typescript
// ProductCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductCard } from './ProductCard';

describe('ProductCard', () => {
  const mockProduct = {
    id: '1',
    name: 'Test Product',
    description: 'Test Description',
    price: 99.99,
    stock: 10,
    images: ['/test.jpg'],
  };

  it('renders product information', () => {
    render(<ProductCard product={mockProduct} />);

    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByText('$99.99')).toBeInTheDocument();
  });

  it('calls onAddToCart when button is clicked', () => {
    const handleAddToCart = jest.fn();
    render(<ProductCard product={mockProduct} onAddToCart={handleAddToCart} />);

    const addButton = screen.getByText('Add to Cart');
    fireEvent.click(addButton);

    expect(handleAddToCart).toHaveBeenCalledWith('1');
  });

  it('disables button when out of stock', () => {
    const outOfStockProduct = { ...mockProduct, stock: 0 };
    render(<ProductCard product={outOfStockProduct} />);

    const addButton = screen.getByText('Add to Cart');
    expect(addButton).toBeDisabled();
  });
});
```

## Additional Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [NestJS Documentation](https://docs.nestjs.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [React Best Practices](https://react.dev/learn/thinking-in-react)
- [Clean Code Principles](https://www.freecodecamp.org/news/clean-coding-for-beginners/)

## Questions?

For questions about coding standards:
1. Check this documentation
2. Review existing codebase
3. Ask in team discussions
4. Consult with senior developers
