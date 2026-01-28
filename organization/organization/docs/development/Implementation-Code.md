# Broxiva Complete Code Implementation
## Backend & Frontend Production Code

---

## 🔧 BACKEND IMPLEMENTATION

### Project Structure
```
services/
├── api-gateway/
├── auth-service/
├── product-service/
├── order-service/
├── payment-service/
├── notification-service/
├── search-service/
├── analytics-service/
└── shared/
    ├── types/
    ├── utils/
    ├── middleware/
    └── config/
```

### Shared Configuration

**`services/shared/config/database.ts`**
```typescript
import { Connection, ConnectionConfig } from 'tedious';
import { CosmosClient } from '@azure/cosmos';
import { createClient, RedisClientType } from 'redis';
import { DefaultAzureCredential } from '@azure/identity';

export class DatabaseManager {
  private static instance: DatabaseManager;
  private sqlConnection?: Connection;
  private cosmosClient?: CosmosClient;
  private redisClient?: RedisClientType;

  private constructor() {}

  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  async connectSQL(): Promise<Connection> {
    if (this.sqlConnection?.state.name === 'LoggedIn') {
      return this.sqlConnection;
    }

    const config: ConnectionConfig = {
      server: process.env.SQL_SERVER!,
      authentication: {
        type: 'azure-active-directory-msi-app-service',
      },
      options: {
        database: process.env.SQL_DATABASE!,
        encrypt: true,
        trustServerCertificate: false,
      },
    };

    return new Promise((resolve, reject) => {
      const connection = new Connection(config);
      connection.on('connect', (err) => {
        if (err) reject(err);
        else {
          this.sqlConnection = connection;
          resolve(connection);
        }
      });
      connection.connect();
    });
  }

  async connectCosmos(): Promise<CosmosClient> {
    if (this.cosmosClient) return this.cosmosClient;

    const credential = new DefaultAzureCredential();
    this.cosmosClient = new CosmosClient({
      endpoint: process.env.COSMOS_ENDPOINT!,
      aadCredentials: credential,
    });

    return this.cosmosClient;
  }

  async connectRedis(): Promise<RedisClientType> {
    if (this.redisClient?.isOpen) return this.redisClient;

    this.redisClient = createClient({
      url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
      password: process.env.REDIS_PASSWORD,
      socket: { tls: true },
    });

    await this.redisClient.connect();
    return this.redisClient;
  }
}
```

### Product Service (Complete Implementation)

**`services/product-service/src/index.ts`**
```typescript
import express from 'express';
import { ProductController } from './controllers/ProductController';
import { authenticateToken } from '@shared/middleware/auth';
import { errorHandler } from '@shared/middleware/error';
import { requestLogger } from '@shared/middleware/logger';
import { metricsMiddleware } from '@shared/middleware/metrics';

const app = express();

app.use(express.json());
app.use(requestLogger);
app.use(metricsMiddleware);

const productController = new ProductController();

// Public routes
app.get('/products', productController.getProducts);
app.get('/products/:slug', productController.getProduct);
app.get('/products/search', productController.searchProducts);

// Protected routes
app.post('/products', authenticateToken, productController.createProduct);
app.put('/products/:id', authenticateToken, productController.updateProduct);
app.delete('/products/:id', authenticateToken, productController.deleteProduct);

// Health checks
app.get('/health', (req, res) => res.json({ status: 'healthy' }));
app.get('/ready', async (req, res) => {
  // Check dependencies
  try {
    const db = DatabaseManager.getInstance();
    await db.connectCosmos();
    res.json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({ status: 'not ready' });
  }
});

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Product Service on port ${PORT}`));
```

**`services/product-service/src/services/ProductService.ts`**
```typescript
import { CosmosClient, Container } from '@azure/cosmos';
import { ServiceBusClient } from '@azure/service-bus';
import { BlobServiceClient } from '@azure/storage-blob';
import { DatabaseManager } from '@shared/config/database';
import { CacheService } from '@shared/services/CacheService';
import { logger } from '@shared/utils/logger';

export class ProductService {
  private container: Container;
  private cache: CacheService;
  private serviceBus: ServiceBusClient;
  private blobClient: BlobServiceClient;

  constructor() {
    this.initializeClients();
  }

  private async initializeClients() {
    const db = DatabaseManager.getInstance();
    const cosmosClient = await db.connectCosmos();
    
    this.container = cosmosClient
      .database(process.env.COSMOS_DB_NAME!)
      .container('products');
    
    this.cache = new CacheService();
    this.serviceBus = new ServiceBusClient(process.env.SERVICE_BUS_NAMESPACE!);
    this.blobClient = new BlobServiceClient(process.env.STORAGE_ACCOUNT_URL!);
  }

  async getProduct(slug: string): Promise<Product | null> {
    const cacheKey = `product:${slug}`;
    
    // Check cache
    const cached = await this.cache.get<Product>(cacheKey);
    if (cached) {
      logger.info(`Cache hit: ${cacheKey}`);
      return cached;
    }

    // Query Cosmos DB
    const { resources } = await this.container.items
      .query({
        query: 'SELECT * FROM c WHERE c.slug = @slug AND c.status = "active"',
        parameters: [{ name: '@slug', value: slug }],
      })
      .fetchAll();

    if (resources.length === 0) return null;

    const product = resources[0];
    
    // Cache for 1 hour
    await this.cache.set(cacheKey, product, 3600);
    
    // Track view event
    await this.publishEvent('product.viewed', {
      productId: product.id,
      slug: product.slug,
      timestamp: new Date().toISOString(),
    });

    return product;
  }

  async createProduct(data: Partial<Product>): Promise<Product> {
    const product: Product = {
      id: `prod_${Date.now()}_${this.generateId()}`,
      ...data,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Product;

    const { resource } = await this.container.items.create(product);

    await this.publishEvent('product.created', {
      productId: resource!.id,
      sku: resource!.sku,
    });

    logger.info(`Product created: ${resource!.id}`);
    return resource!;
  }

  async searchProducts(
    query: string,
    filters: any = {},
    page = 1,
    limit = 20
  ): Promise<{ products: Product[]; total: number }> {
    const offset = (page - 1) * limit;
    
    let sqlQuery = 'SELECT * FROM c WHERE c.status = "active"';
    const parameters: any[] = [];

    if (query) {
      sqlQuery += ' AND CONTAINS(LOWER(c.name), @query)';
      parameters.push({ name: '@query', value: query.toLowerCase() });
    }

    if (filters.category) {
      sqlQuery += ' AND c.category = @category';
      parameters.push({ name: '@category', value: filters.category });
    }

    if (filters.minPrice) {
      sqlQuery += ' AND c.price.amount >= @minPrice';
      parameters.push({ name: '@minPrice', value: filters.minPrice });
    }

    sqlQuery += ` OFFSET ${offset} LIMIT ${limit}`;

    const { resources } = await this.container.items
      .query({ query: sqlQuery, parameters })
      .fetchAll();

    return {
      products: resources,
      total: resources.length,
    };
  }

  private async publishEvent(eventType: string, data: any): Promise<void> {
    try {
      const sender = this.serviceBus.createSender('product-events');
      await sender.sendMessages({
        body: { eventType, data, timestamp: new Date().toISOString() },
        contentType: 'application/json',
      });
      await sender.close();
    } catch (error) {
      logger.error('Event publish error:', error);
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}
```

---

## ⚛️ FRONTEND IMPLEMENTATION

### Project Structure
```
frontend/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (shop)/
│   │   │   ├── products/
│   │   │   │   ├── [slug]/page.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── cart/page.tsx
│   │   │   └── checkout/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── orders/page.tsx
│   │   │   └── profile/page.tsx
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/
│   │   ├── features/
│   │   └── layout/
│   ├── lib/
│   │   ├── api/
│   │   ├── hooks/
│   │   ├── stores/
│   │   └── utils/
│   └── types/
└── public/
```

### Core Configuration

**`src/lib/api/client.ts`**
```typescript
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
      withCredentials: true,
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        config.headers['X-Request-ID'] = crypto.randomUUID();
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<{ data: T }>(url, config);
    return response.data.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<{ data: T }>(url, data, config);
    return response.data.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<{ data: T }>(url, data, config);
    return response.data.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<{ data: T }>(url, config);
    return response.data.data;
  }
}

export const apiClient = new ApiClient();
```

### State Management

**`src/lib/stores/cartStore.ts`**
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import toast from 'react-hot-toast';

interface CartItem {
  product: Product;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (product, quantity = 1) => {
        set((state) => {
          const existing = state.items.find(i => i.product.id === product.id);
          
          if (existing) {
            toast.success(`Added ${quantity} more to cart`);
            return {
              items: state.items.map(i =>
                i.product.id === product.id
                  ? { ...i, quantity: i.quantity + quantity }
                  : i
              ),
              isOpen: true,
            };
          }

          toast.success(`${product.name} added to cart`);
          return {
            items: [...state.items, { product, quantity }],
            isOpen: true,
          };
        });
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter(i => i.product.id !== productId),
        }));
        toast.success('Item removed from cart');
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        set((state) => ({
          items: state.items.map(i =>
            i.product.id === productId ? { ...i, quantity } : i
          ),
        }));
      },

      clearCart: () => {
        set({ items: [], isOpen: false });
        toast.success('Cart cleared');
      },

      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

      getTotalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      getTotalPrice: () => get().items.reduce((sum, i) => {
        const price = i.product.price.discountPrice || i.product.price.amount;
        return sum + (price * i.quantity);
      }, 0),
    }),
    {
      name: 'broxiva-cart',
    }
  )
);
```

### Custom Hooks

**`src/lib/hooks/useProducts.ts`**
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import toast from 'react-hot-toast';

export function useProduct(slug: string) {
  return useQuery({
    queryKey: ['product', slug],
    queryFn: () => apiClient.get<Product>(`/products/${slug}`),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });
}

export function useProducts(params: any = {}) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value) searchParams.append(key, String(value));
      });
      return apiClient.get<{
        products: Product[];
        total: number;
      }>(`/products?${searchParams.toString()}`);
    },
    keepPreviousData: true,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Product>) =>
      apiClient.post<Product>('/products', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create product');
    },
  });
}
```

### Product Page Example

**`src/app/(shop)/products/[slug]/page.tsx`**
```typescript
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { ProductGallery } from '@/components/features/product/ProductGallery';
import { AddToCartButton } from '@/components/features/cart/AddToCartButton';
import { apiClient } from '@/lib/api/client';

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const product = await apiClient.get<Product>(`/products/${params.slug}`);
    return {
      title: `${product.name} | Broxiva`,
      description: product.description,
      openGraph: {
        title: product.name,
        description: product.description,
        images: [{ url: product.images[0].url }],
      },
    };
  } catch {
    return { title: 'Product Not Found' };
  }
}

export default async function ProductPage({ params }: Props) {
  let product: Product;
  
  try {
    product = await apiClient.get<Product>(`/products/${params.slug}`);
  } catch {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ProductGallery images={product.images} />
        
        <div>
          <h1 className="text-3xl font-bold mb-4">{product.name}</h1>
          
          <div className="flex items-center gap-4 mb-6">
            <span className="text-3xl font-bold text-primary">
              ${product.price.discountPrice || product.price.amount}
            </span>
            {product.price.discountPrice && (
              <span className="text-xl text-gray-500 line-through">
                ${product.price.amount}
              </span>
            )}
          </div>

          <p className="text-gray-700 mb-8">{product.description}</p>

          <AddToCartButton product={product} />
          
          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Free shipping on orders over $99</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>90-day return policy</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 🔒 SECURITY BEST PRACTICES

### 1. Environment Variables
```bash
# Never commit secrets to git
# Use Azure Key Vault for production

# .env.example
NODE_ENV=production
SQL_SERVER=broxiva-prod-sql.database.windows.net
SQL_DATABASE=orders
COSMOS_ENDPOINT=https://broxiva-prod-cosmos.documents.azure.com:443/
REDIS_HOST=broxiva-prod-redis.redis.cache.windows.net
SERVICE_BUS_NAMESPACE=broxiva-prod-sb.servicebus.windows.net
STORAGE_ACCOUNT_URL=https://broxivaprodstrg.blob.core.windows.net
JWT_SECRET=${KEY_VAULT_SECRET}
STRIPE_SECRET_KEY=${KEY_VAULT_SECRET}
```

### 2. Input Validation (Zod)
```typescript
import { z } from 'zod';

export const productSchema = z.object({
  name: z.string().min(1).max(500),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  description: z.string().min(10),
  price: z.object({
    amount: z.number().positive(),
    currency: z.string().length(3),
  }),
  inventory: z.object({
    quantity: z.number().int().min(0),
  }),
});
```

### 3. Authentication Middleware
```typescript
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
  user?: { id: string; email: string; role: string };
}

export async function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
    
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

export function authorize(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}
```

### 4. Rate Limiting
```typescript
import rateLimit from 'express-rate-limit';

export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
});
```

---

## 📊 MONITORING & OBSERVABILITY

### Application Insights Setup
```typescript
import { ApplicationInsights } from '@azure/monitor-opentelemetry';

const appInsights = new ApplicationInsights({
  connectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING,
});

appInsights.start();

export { appInsights };
```

### Custom Metrics
```typescript
import { register, Counter, Histogram } from 'prom-client';

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 1, 2, 5],
});

export const httpRequestCounter = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});
```

---

See additional files for DevOps, deployment, and operational guides.
