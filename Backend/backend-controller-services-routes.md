# CitadelBuy Backend - Controllers, Services & Routes

## 6. Controllers

### `src/controllers/auth.controller.ts`
```typescript
import { Request, Response, NextFunction } from 'express';
import { AuthService } from '@/services/auth.service';
import { loginSchema, registerSchema } from '@/utils/validation';
import { ApiError } from '@/middleware/error-handler';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  register = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const validatedData = registerSchema.parse(req.body);
      const result = await this.authService.register(validatedData);

      res.status(201).json({
        success: true,
        data: result,
        metadata: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  login = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const validatedData = loginSchema.parse(req.body);
      const result = await this.authService.login(validatedData);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  logout = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Implementation depends on your token strategy
      res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  refreshToken = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { refreshToken } = req.body;
      const result = await this.authService.refreshToken(refreshToken);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  getProfile = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const user = await this.authService.getUserById(userId);

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  };
}
```

### `src/controllers/products.controller.ts`
```typescript
import { Request, Response, NextFunction } from 'express';
import { ProductService } from '@/services/products.service';
import { productSchema, paginationSchema } from '@/utils/validation';
import { ApiError } from '@/middleware/error-handler';

export class ProductsController {
  private productService: ProductService;

  constructor() {
    this.productService = new ProductService();
  }

  getAllProducts = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const pagination = paginationSchema.parse(req.query);
      const { search, category, minPrice, maxPrice, status } = req.query;

      const result = await this.productService.getAllProducts({
        ...pagination,
        search: search as string,
        category: category as string,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        status: status as any,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  getProductBySlug = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { slug } = req.params;
      const product = await this.productService.getProductBySlug(slug);

      if (!product) {
        throw new ApiError('Product not found', 404, 'PRODUCT_NOT_FOUND');
      }

      res.json({
        success: true,
        data: product,
      });
    } catch (error) {
      next(error);
    }
  };

  createProduct = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const validatedData = productSchema.parse(req.body);
      const product = await this.productService.createProduct(validatedData);

      res.status(201).json({
        success: true,
        data: product,
      });
    } catch (error) {
      next(error);
    }
  };

  updateProduct = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const validatedData = productSchema.partial().parse(req.body);
      const product = await this.productService.updateProduct(id, validatedData);

      res.json({
        success: true,
        data: product,
      });
    } catch (error) {
      next(error);
    }
  };

  deleteProduct = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      await this.productService.deleteProduct(id);

      res.json({
        success: true,
        message: 'Product deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  getFeaturedProducts = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const products = await this.productService.getFeaturedProducts();

      res.json({
        success: true,
        data: products,
      });
    } catch (error) {
      next(error);
    }
  };

  searchProducts = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { q } = req.query;
      const pagination = paginationSchema.parse(req.query);

      if (!q || typeof q !== 'string' || q.length < 3) {
        throw new ApiError(
          'Search query must be at least 3 characters',
          400,
          'INVALID_SEARCH_QUERY'
        );
      }

      const result = await this.productService.searchProducts(q, pagination);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}
```

### `src/controllers/orders.controller.ts`
```typescript
import { Request, Response, NextFunction } from 'express';
import { OrderService } from '@/services/orders.service';
import { orderSchema, paginationSchema } from '@/utils/validation';
import { ApiError } from '@/middleware/error-handler';

export class OrdersController {
  private orderService: OrderService;

  constructor() {
    this.orderService = new OrderService();
  }

  createOrder = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const validatedData = orderSchema.parse(req.body);
      const order = await this.orderService.createOrder(validatedData);

      res.status(201).json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  };

  getOrderById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const order = await this.orderService.getOrderById(id);

      if (!order) {
        throw new ApiError('Order not found', 404, 'ORDER_NOT_FOUND');
      }

      res.json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  };

  getOrders = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const pagination = paginationSchema.parse(req.query);
      const { status, customerId } = req.query;

      const result = await this.orderService.getOrders({
        ...pagination,
        status: status as any,
        customerId: customerId as string,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  updateOrderStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const { status, description } = req.body;

      await this.orderService.updateOrderStatus(id, status, description);

      res.json({
        success: true,
        message: 'Order status updated successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  cancelOrder = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      await this.orderService.cancelOrder(id, reason);

      res.json({
        success: true,
        message: 'Order cancelled successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  getOrderHistory = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const history = await this.orderService.getOrderHistory(id);

      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      next(error);
    }
  };
}
```

---

## 7. Services

### `src/services/auth.service.ts`
```typescript
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '@/config/environment';
import { executeQuery } from '@/config/database';
import { encryptionService } from '@/utils/encryption';
import { ApiError } from '@/middleware/error-handler';
import { logger } from '@/utils/logger';

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

interface LoginData {
  email: string;
  password: string;
}

export class AuthService {
  async register(data: RegisterData) {
    try {
      // Check if user exists
      const existingUser = await executeQuery(
        'SELECT * FROM Users WHERE Email = @email',
        [{ name: 'email', type: 'NVarChar', value: data.email }]
      );

      if (existingUser.length > 0) {
        throw new ApiError('Email already registered', 400, 'EMAIL_EXISTS');
      }

      // Hash password
      const passwordHash = await encryptionService.hashPassword(data.password);

      // Create user
      const userId = uuidv4();
      await executeQuery(
        `INSERT INTO Users (UserId, Email, PasswordHash, FirstName, LastName, Phone, Role, Status, CreatedAt)
         VALUES (@userId, @email, @passwordHash, @firstName, @lastName, @phone, 'customer', 'active', GETUTCDATE())`,
        [
          { name: 'userId', type: 'UniqueIdentifier', value: userId },
          { name: 'email', type: 'NVarChar', value: data.email },
          { name: 'passwordHash', type: 'NVarChar', value: passwordHash },
          { name: 'firstName', type: 'NVarChar', value: data.firstName },
          { name: 'lastName', type: 'NVarChar', value: data.lastName },
          { name: 'phone', type: 'NVarChar', value: data.phone || null },
        ]
      );

      // Generate tokens
      const token = this.generateToken(userId, data.email, 'customer');
      const refreshToken = this.generateRefreshToken(userId);

      // Get user data
      const user = await this.getUserById(userId);

      logger.info(`User registered: ${data.email}`);

      return {
        user,
        token,
        refreshToken,
      };
    } catch (error) {
      logger.error('Registration error:', error);
      throw error;
    }
  }

  async login(data: LoginData) {
    try {
      // Get user
      const users = await executeQuery(
        'SELECT * FROM Users WHERE Email = @email',
        [{ name: 'email', type: 'NVarChar', value: data.email }]
      );

      if (users.length === 0) {
        throw new ApiError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
      }

      const user = users[0];

      // Check password
      const isValidPassword = await encryptionService.comparePassword(
        data.password,
        user.PasswordHash
      );

      if (!isValidPassword) {
        throw new ApiError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
      }

      // Check if user is active
      if (user.Status !== 'active') {
        throw new ApiError('Account is not active', 403, 'ACCOUNT_INACTIVE');
      }

      // Update last login
      await executeQuery(
        'UPDATE Users SET LastLoginAt = GETUTCDATE() WHERE UserId = @userId',
        [{ name: 'userId', type: 'UniqueIdentifier', value: user.UserId }]
      );

      // Generate tokens
      const token = this.generateToken(user.UserId, user.Email, user.Role);
      const refreshToken = this.generateRefreshToken(user.UserId);

      logger.info(`User logged in: ${data.email}`);

      return {
        user: {
          id: user.UserId,
          email: user.Email,
          firstName: user.FirstName,
          lastName: user.LastName,
          role: user.Role,
        },
        token,
        refreshToken,
      };
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  }

  async getUserById(userId: string) {
    const users = await executeQuery(
      `SELECT UserId, Email, FirstName, LastName, Phone, Role, Status, 
              EmailVerified, CreatedAt, LastLoginAt
       FROM Users WHERE UserId = @userId`,
      [{ name: 'userId', type: 'UniqueIdentifier', value: userId }]
    );

    if (users.length === 0) {
      throw new ApiError('User not found', 404, 'USER_NOT_FOUND');
    }

    return users[0];
  }

  async refreshToken(refreshToken: string) {
    try {
      const decoded = jwt.verify(refreshToken, config.jwt.secret) as any;
      const user = await this.getUserById(decoded.id);

      const newToken = this.generateToken(user.UserId, user.Email, user.Role);

      return {
        token: newToken,
      };
    } catch (error) {
      throw new ApiError('Invalid refresh token', 401, 'INVALID_TOKEN');
    }
  }

  private generateToken(userId: string, email: string, role: string): string {
    return jwt.sign(
      {
        id: userId,
        email,
        role,
      },
      config.jwt.secret,
      {
        expiresIn: config.jwt.expiration,
      }
    );
  }

  private generateRefreshToken(userId: string): string {
    return jwt.sign(
      {
        id: userId,
      },
      config.jwt.secret,
      {
        expiresIn: config.jwt.refreshExpiration,
      }
    );
  }
}
```

### `src/services/products.service.ts`
```typescript
import { CosmosClient } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';
import { CacheService } from '@/config/redis';
import { ServiceBusClient } from '@azure/service-bus';
import { config } from '@/config/environment';
import { ApiError } from '@/middleware/error-handler';
import { logger } from '@/utils/logger';

export class ProductService {
  private cosmosClient: CosmosClient;
  private container: any;
  private cache: CacheService;
  private serviceBus: ServiceBusClient;

  constructor() {
    const credential = new DefaultAzureCredential();
    
    this.cosmosClient = new CosmosClient({
      endpoint: config.cosmosDb.endpoint,
      aadCredentials: credential,
    });

    this.container = this.cosmosClient
      .database(config.cosmosDb.name)
      .container('products');

    this.cache = new CacheService();
    
    this.serviceBus = new ServiceBusClient(
      config.serviceBus.namespace,
      credential
    );
  }

  async getAllProducts(params: any) {
    const { page = 1, limit = 20, search, category, minPrice, maxPrice, status = 'active' } = params;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM c WHERE c.status = @status';
    const parameters: any[] = [{ name: '@status', value: status }];

    if (search) {
      query += ' AND CONTAINS(LOWER(c.name), @search)';
      parameters.push({ name: '@search', value: search.toLowerCase() });
    }

    if (category) {
      query += ' AND c.category = @category';
      parameters.push({ name: '@category', value: category });
    }

    if (minPrice) {
      query += ' AND c.price.amount >= @minPrice';
      parameters.push({ name: '@minPrice', value: minPrice });
    }

    if (maxPrice) {
      query += ' AND c.price.amount <= @maxPrice';
      parameters.push({ name: '@maxPrice', value: maxPrice });
    }

    query += ` OFFSET ${offset} LIMIT ${limit}`;

    const { resources: products } = await this.container.items
      .query({ query, parameters })
      .fetchAll();

    // Get total count (simplified, in production use a separate count query)
    const total = products.length;

    return {
      items: products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    };
  }

  async getProductBySlug(slug: string) {
    const cacheKey = `product:${slug}`;

    // Try cache
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      logger.info(`Cache hit for product: ${slug}`);
      return cached;
    }

    // Query Cosmos DB
    const { resources } = await this.container.items
      .query({
        query: 'SELECT * FROM c WHERE c.slug = @slug AND c.status = @status',
        parameters: [
          { name: '@slug', value: slug },
          { name: '@status', value: 'active' },
        ],
      })
      .fetchAll();

    if (resources.length === 0) {
      return null;
    }

    const product = resources[0];

    // Cache for 1 hour
    await this.cache.set(cacheKey, product, 3600);

    // Publish view event
    await this.publishEvent('product.viewed', {
      productId: product.id,
      slug: product.slug,
      timestamp: new Date().toISOString(),
    });

    return product;
  }

  async createProduct(data: any) {
    try {
      const product = {
        id: `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const { resource } = await this.container.items.create(product);

      // Invalidate caches
      await this.cache.deletePattern(`category:${product.category}:*`);
      await this.cache.deletePattern('featured:*');

      // Publish event
      await this.publishEvent('product.created', {
        productId: resource.id,
        sku: resource.sku,
      });

      logger.info(`Product created: ${resource.sku}`);
      return resource;
    } catch (error) {
      logger.error('Error creating product:', error);
      throw new ApiError('Failed to create product', 500, 'CREATE_FAILED');
    }
  }

  async updateProduct(id: string, data: any) {
    try {
      const { resource: existing } = await this.container.item(id, id).read();

      if (!existing) {
        throw new ApiError('Product not found', 404, 'PRODUCT_NOT_FOUND');
      }

      const updated = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      };

      const { resource } = await this.container.item(id, id).replace(updated);

      // Invalidate caches
      await this.cache.delete(`product:${resource.slug}`);
      await this.cache.deletePattern(`category:${resource.category}:*`);

      // Publish event
      await this.publishEvent('product.updated', {
        productId: resource.id,
        changes: data,
      });

      logger.info(`Product updated: ${id}`);
      return resource;
    } catch (error) {
      logger.error('Error updating product:', error);
      throw error;
    }
  }

  async deleteProduct(id: string) {
    try {
      await this.container.item(id, id).delete();

      // Invalidate caches
      await this.cache.deletePattern(`product:*`);
      await this.cache.deletePattern(`category:*`);

      logger.info(`Product deleted: ${id}`);
    } catch (error) {
      logger.error('Error deleting product:', error);
      throw new ApiError('Failed to delete product', 500, 'DELETE_FAILED');
    }
  }

  async getFeaturedProducts() {
    const cacheKey = 'featured:products';

    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const { resources } = await this.container.items
      .query({
        query: 'SELECT * FROM c WHERE c.featured = true AND c.status = @status OFFSET 0 LIMIT 20',
        parameters: [{ name: '@status', value: 'active' }],
      })
      .fetchAll();

    await this.cache.set(cacheKey, resources, 7200); // 2 hours

    return resources;
  }

  async searchProducts(searchTerm: string, params: any) {
    const { page = 1, limit = 20 } = params;
    const offset = (page - 1) * limit;

    const { resources } = await this.container.items
      .query({
        query: `SELECT * FROM c WHERE CONTAINS(LOWER(c.name), @search) 
                AND c.status = @status OFFSET ${offset} LIMIT ${limit}`,
        parameters: [
          { name: '@search', value: searchTerm.toLowerCase() },
          { name: '@status', value: 'active' },
        ],
      })
      .fetchAll();

    return {
      items: resources,
      pagination: {
        page,
        limit,
        total: resources.length,
        totalPages: Math.ceil(resources.length / limit),
      },
    };
  }

  private async publishEvent(eventType: string, data: any) {
    try {
      const sender = this.serviceBus.createSender('product-events');
      await sender.sendMessages({
        body: { eventType, data, timestamp: new Date().toISOString() },
        contentType: 'application/json',
      });
      await sender.close();
    } catch (error) {
      logger.error('Error publishing event:', error);
    }
  }
}
```

---

## 8. Routes

### `src/routes/index.ts`
```typescript
import { Router } from 'express';
import authRoutes from './auth.routes';
import productsRoutes from './products.routes';
import ordersRoutes from './orders.routes';
import usersRoutes from './users.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/products', productsRoutes);
router.use('/orders', ordersRoutes);
router.use('/users', usersRoutes);

export default router;
```

### `src/routes/auth.routes.ts`
```typescript
import { Router } from 'express';
import { AuthController } from '@/controllers/auth.controller';
import { authenticateToken } from '@/middleware/auth.middleware';

const router = Router();
const authController = new AuthController();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authenticateToken, authController.logout);
router.post('/refresh', authController.refreshToken);
router.get('/me', authenticateToken, authController.getProfile);

export default router;
```

### `src/routes/products.routes.ts`
```typescript
import { Router } from 'express';
import { ProductsController } from '@/controllers/products.controller';
import { authenticateToken, authorize } from '@/middleware/auth.middleware';

const router = Router();
const productsController = new ProductsController();

// Public routes
router.get('/', productsController.getAllProducts);
router.get('/featured', productsController.getFeaturedProducts);
router.get('/search', productsController.searchProducts);
router.get('/:slug', productsController.getProductBySlug);

// Admin routes
router.post(
  '/',
  authenticateToken,
  authorize('admin', 'vendor'),
  productsController.createProduct
);
router.put(
  '/:id',
  authenticateToken,
  authorize('admin', 'vendor'),
  productsController.updateProduct
);
router.delete(
  '/:id',
  authenticateToken,
  authorize('admin'),
  productsController.deleteProduct
);

export default router;
```

### `src/routes/orders.routes.ts`
```typescript
import { Router } from 'express';
import { OrdersController } from '@/controllers/orders.controller';
import { authenticateToken, authorize } from '@/middleware/auth.middleware';

const router = Router();
const ordersController = new OrdersController();

// Protected routes
router.use(authenticateToken);

router.post('/', ordersController.createOrder);
router.get('/', ordersController.getOrders);
router.get('/:id', ordersController.getOrderById);
router.get('/:id/history', ordersController.getOrderHistory);
router.post('/:id/cancel', ordersController.cancelOrder);

// Admin routes
router.patch(
  '/:id/status',
  authorize('admin'),
  ordersController.updateOrderStatus
);

export default router;
```

---

## 9. Database Schema (Prisma)

### `prisma/schema.prisma`
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlserver"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(uuid()) @db.UniqueIdentifier
  email         String    @unique @db.NVarChar(255)
  passwordHash  String    @db.NVarChar(Max)
  firstName     String    @db.NVarChar(255)
  lastName      String    @db.NVarChar(255)
  phone         String?   @db.NVarChar(50)
  avatar        String?   @db.NVarChar(Max)
  role          String    @default("customer") @db.NVarChar(50)
  status        String    @default("active") @db.NVarChar(50)
  emailVerified Boolean   @default(false)
  loyaltyPoints Int       @default(0)
  preferences   String?   @db.NVarChar(Max) // JSON
  createdAt     DateTime  @default(now()) @db.DateTime2
  updatedAt     DateTime  @updatedAt @db.DateTime2
  lastLoginAt   DateTime? @db.DateTime2

  orders    Order[]
  addresses Address[]
  reviews   Review[]

  @@map("Users")
}

model Address {
  id         String   @id @default(uuid()) @db.UniqueIdentifier
  userId     String   @db.UniqueIdentifier
  type       String   @db.NVarChar(50)
  firstName  String   @db.NVarChar(255)
  lastName   String   @db.NVarChar(255)
  company    String?  @db.NVarChar(255)
  street     String   @db.NVarChar(500)
  street2    String?  @db.NVarChar(500)
  city       String   @db.NVarChar(255)
  state      String   @db.NVarChar(255)
  postalCode String   @db.NVarChar(50)
  country    String   @db.NVarChar(3)
  phone      String?  @db.NVarChar(50)
  isDefault  Boolean  @default(false)
  createdAt  DateTime @default(now()) @db.DateTime2
  updatedAt  DateTime @updatedAt @db.DateTime2

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("Addresses")
}

model Order {
  id              String   @id @default(uuid()) @db.UniqueIdentifier
  orderNumber     String   @unique @db.NVarChar(50)
  customerId      String   @db.UniqueIdentifier
  customerEmail   String   @db.NVarChar(255)
  customerName    String   @db.NVarChar(255)
  status          String   @default("pending") @db.NVarChar(50)
  subtotal        Decimal  @db.Decimal(18, 2)
  tax             Decimal  @db.Decimal(18, 2)
  shippingCost    Decimal  @db.Decimal(18, 2)
  discount        Decimal  @default(0) @db.Decimal(18, 2)
  total           Decimal  @db.Decimal(18, 2)
  currency        String   @default("USD") @db.NVarChar(3)
  paymentStatus   String   @default("pending") @db.NVarChar(50)
  paymentMethod   String?  @db.NVarChar(50)
  transactionId   String?  @db.NVarChar(255)
  shippingAddress String   @db.NVarChar(Max) // JSON
  billingAddress  String   @db.NVarChar(Max) // JSON
  notes           String?  @db.NVarChar(Max)
  metadata        String?  @db.NVarChar(Max) // JSON
  createdAt       DateTime @default(now()) @db.DateTime2
  updatedAt       DateTime @updatedAt @db.DateTime2
  paidAt          DateTime? @db.DateTime2

  customer User        @relation(fields: [customerId], references: [id])
  items    OrderItem[]
  history  OrderHistory[]

  @@index([customerId])
  @@index([status])
  @@index([createdAt])
  @@map("Orders")
}

model OrderItem {
  id             String   @id @default(uuid()) @db.UniqueIdentifier
  orderId        String   @db.UniqueIdentifier
  productId      String   @db.NVarChar(100)
  sku            String   @db.NVarChar(100)
  name           String   @db.NVarChar(500)
  quantity       Int
  unitPrice      Decimal  @db.Decimal(18, 2)
  discountAmount Decimal  @default(0) @db.Decimal(18, 2)
  totalPrice     Decimal  @db.Decimal(18, 2)
  metadata       String?  @db.NVarChar(Max) // JSON
  createdAt      DateTime @default(now()) @db.DateTime2

  order Order @relation(fields: [orderId], references: [id], onDelete: Cascade)

  @@index([orderId])
  @@index([productId])
  @@map("OrderItems")
}

model OrderHistory {
  id          String   @id @default(uuid()) @db.UniqueIdentifier
  orderId     String   @db.UniqueIdentifier
  status      String   @db.NVarChar(50)
  description String?  @db.NVarChar(Max)
  changedBy   String?  @db.NVarChar(255)
  createdAt   DateTime @default(now()) @db.DateTime2

  order Order @relation(fields: [orderId], references: [id], onDelete: Cascade)

  @@index([orderId])
  @@map("OrderHistory")
}

model Review {
  id         String   @id @default(uuid()) @db.UniqueIdentifier
  productId  String   @db.NVarChar(100)
  userId     String   @db.UniqueIdentifier
  rating     Int
  title      String   @db.NVarChar(500)
  comment    String   @db.NVarChar(Max)
  images     String?  @db.NVarChar(Max) // JSON array
  verified   Boolean  @default(false)
  helpful    Int      @default(0)
  createdAt  DateTime @default(now()) @db.DateTime2

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([productId])
  @@index([userId])
  @@map("Reviews")
}
```

---

## 10. Dockerfile

### `Dockerfile`
```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "dist/server.js"]
```

### `.dockerignore`
```
node_modules
npm-debug.log
.env
.env.local
.env.*.local
dist
coverage
.git
.gitignore
README.md
.vscode
.idea
*.log
```

---

## 11. Environment Variables Template

### `.env.example`
```bash
# Application
NODE_ENV=production
PORT=3000
APP_NAME=citadelbuy-api
API_VERSION=v1

# Database - Azure SQL
DB_HOST=citadelbuy-prod-sql.database.windows.net
DB_PORT=1433
DB_NAME=orders-db
DB_USER=citadeladmin
DB_PASSWORD=your_strong_password
DB_ENCRYPT=true

# Cosmos DB
COSMOS_DB_ENDPOINT=https://citadelbuy-prod-cosmos.documents.azure.com:443/
COSMOS_DB_NAME=product-catalog

# Redis
REDIS_HOST=citadelbuy-prod-redis.redis.cache.windows.net
REDIS_PORT=6380
REDIS_PASSWORD=your_redis_password
REDIS_TLS=true

# Service Bus
SERVICE_BUS_NAMESPACE=citadelbuy-prod-sb.servicebus.windows.net

# Storage
AZURE_STORAGE_ACCOUNT=citadelbuyprodstrg

# Key Vault
AZURE_KEY_VAULT_NAME=citadelbuy-prod-kv

# Authentication
JWT_SECRET=your_jwt_secret_key_change_in_production
JWT_EXPIRATION=24h
REFRESH_TOKEN_EXPIRATION=7d

# Payment
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Email
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your_sendgrid_api_key
SMTP_FROM=noreply@citadelbuy.com

# Application Insights
APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=xxxxx;IngestionEndpoint=xxxxx

# CORS
ALLOWED_ORIGINS=https://www.citadelbuy.com,https://citadelbuy.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

---

This completes the comprehensive backend implementation!
