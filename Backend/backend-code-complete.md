# CitadelBuy Backend - Complete Code Implementation
## Node.js + Express + TypeScript

## Project Structure
```
backend/
├── src/
│   ├── controllers/          # Request handlers
│   ├── services/            # Business logic
│   ├── middleware/          # Express middleware
│   ├── models/              # Prisma models
│   ├── routes/              # API routes
│   ├── config/              # Configuration
│   ├── utils/               # Utilities
│   ├── types/               # TypeScript types
│   └── server.ts            # App entry point
├── prisma/                  # Database schema
├── tests/                   # Test files
└── Dockerfile              # Docker configuration
```

---

## 1. Core Configuration

### `package.json`
```json
{
  "name": "citadelbuy-backend",
  "version": "1.0.0",
  "description": "CitadelBuy E-commerce Platform - Backend API",
  "main": "dist/server.js",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc && tsc-alias",
    "start": "node dist/server.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "express": "^4.18.3",
    "@azure/cosmos": "^4.0.0",
    "@azure/storage-blob": "^12.17.0",
    "@azure/service-bus": "^7.9.4",
    "@azure/identity": "^4.0.1",
    "@azure/keyvault-secrets": "^4.7.0",
    "@azure/monitor-opentelemetry": "^1.2.0",
    "@prisma/client": "^5.11.0",
    "redis": "^4.6.13",
    "tedious": "^16.7.1",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "zod": "^3.22.4",
    "helmet": "^7.1.0",
    "cors": "^2.8.5",
    "compression": "^1.7.4",
    "express-rate-limit": "^7.2.0",
    "express-validator": "^7.0.1",
    "winston": "^3.12.0",
    "prom-client": "^15.1.0",
    "stripe": "^14.21.0",
    "nodemailer": "^6.9.11",
    "bull": "^4.12.2",
    "dotenv": "^16.4.5",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.11.30",
    "@types/bcryptjs": "^2.4.6",
    "@types/jsonwebtoken": "^9.0.6",
    "@types/cors": "^2.8.17",
    "@types/compression": "^1.7.5",
    "@types/nodemailer": "^6.4.14",
    "@types/uuid": "^9.0.8",
    "typescript": "^5.4.2",
    "tsx": "^4.7.1",
    "tsc-alias": "^1.8.8",
    "@typescript-eslint/eslint-plugin": "^7.3.1",
    "@typescript-eslint/parser": "^7.3.1",
    "eslint": "^8.57.0",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.12",
    "ts-jest": "^29.1.2",
    "supertest": "^6.3.4",
    "@types/supertest": "^6.0.2",
    "prisma": "^5.11.0"
  }
}
```

### `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/*": ["./src/*"],
      "@/controllers/*": ["./src/controllers/*"],
      "@/services/*": ["./src/services/*"],
      "@/middleware/*": ["./src/middleware/*"],
      "@/models/*": ["./src/models/*"],
      "@/routes/*": ["./src/routes/*"],
      "@/config/*": ["./src/config/*"],
      "@/utils/*": ["./src/utils/*"],
      "@/types/*": ["./src/types/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.spec.ts", "**/*.test.ts"]
}
```

---

## 2. Server Configuration

### `src/server.ts`
```typescript
import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { config } from '@/config/environment';
import { logger } from '@/utils/logger';
import { errorHandler } from '@/middleware/error-handler';
import { requestLogger } from '@/middleware/request-logger';
import { rateLimiter } from '@/middleware/rate-limiter';
import { metricsMiddleware } from '@/middleware/metrics';
import { connectDatabase } from '@/config/database';
import { connectRedis } from '@/config/redis';
import { initializeAppInsights } from '@/config/app-insights';
import routes from '@/routes';

class Server {
  public app: Application;
  private port: number;

  constructor() {
    this.app = express();
    this.port = config.port;
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddleware(): void {
    // Security
    this.app.use(helmet());
    this.app.use(cors({
      origin: config.allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID'],
    }));

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logging & Monitoring
    this.app.use(requestLogger);
    this.app.use(metricsMiddleware);

    // Rate limiting
    this.app.use('/api/', rateLimiter);

    // Health check endpoints
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config.nodeEnv,
        version: process.env.npm_package_version || '1.0.0',
      });
    });

    this.app.get('/ready', async (req, res) => {
      try {
        // Check database connection
        await connectDatabase();
        
        // Check Redis connection
        const redis = await connectRedis();
        await redis.ping();

        res.json({ status: 'ready' });
      } catch (error) {
        logger.error('Readiness check failed:', error);
        res.status(503).json({
          status: 'not ready',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });
  }

  private initializeRoutes(): void {
    // API routes
    this.app.use('/api', routes);

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Route ${req.originalUrl} not found`,
          statusCode: 404,
        },
      });
    });
  }

  private initializeErrorHandling(): void {
    this.app.use(errorHandler);
  }

  public async start(): Promise<void> {
    try {
      // Initialize Application Insights
      await initializeAppInsights();

      // Connect to databases
      await connectDatabase();
      logger.info('Database connected successfully');

      // Connect to Redis
      const redis = await connectRedis();
      logger.info('Redis connected successfully');

      // Start server
      this.app.listen(this.port, () => {
        logger.info(`Server running on port ${this.port} in ${config.nodeEnv} mode`);
        logger.info(`Process ID: ${process.pid}`);
      });
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  public getApp(): Application {
    return this.app;
  }
}

// Start server
const server = new Server();
server.start();

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received, starting graceful shutdown...`);

  setTimeout(() => {
    logger.error('Forcefully shutting down...');
    process.exit(1);
  }, 30000); // 30 second timeout

  try {
    // Close server
    // Add cleanup logic here

    logger.info('Shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

export default server.getApp();
```

---

## 3. Configuration Files

### `src/config/environment.ts`
```typescript
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  APP_NAME: z.string().default('citadelbuy-api'),
  API_VERSION: z.string().default('v1'),
  
  // Database - Azure SQL
  DB_HOST: z.string(),
  DB_PORT: z.string().transform(Number).default('1433'),
  DB_NAME: z.string(),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),
  DB_ENCRYPT: z.string().transform(v => v === 'true').default('true'),
  
  // Cosmos DB
  COSMOS_DB_ENDPOINT: z.string(),
  COSMOS_DB_NAME: z.string(),
  
  // Redis
  REDIS_HOST: z.string(),
  REDIS_PORT: z.string().transform(Number).default('6379'),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_TLS: z.string().transform(v => v === 'true').default('false'),
  
  // Service Bus
  SERVICE_BUS_NAMESPACE: z.string(),
  
  // Storage
  AZURE_STORAGE_ACCOUNT: z.string(),
  
  // Key Vault
  AZURE_KEY_VAULT_NAME: z.string(),
  
  // Authentication
  JWT_SECRET: z.string(),
  JWT_EXPIRATION: z.string().default('24h'),
  REFRESH_TOKEN_EXPIRATION: z.string().default('7d'),
  
  // Payment
  STRIPE_SECRET_KEY: z.string(),
  STRIPE_WEBHOOK_SECRET: z.string(),
  
  // Email
  SMTP_HOST: z.string(),
  SMTP_PORT: z.string().transform(Number),
  SMTP_USER: z.string(),
  SMTP_PASSWORD: z.string(),
  SMTP_FROM: z.string(),
  
  // Application Insights
  APPLICATIONINSIGHTS_CONNECTION_STRING: z.string(),
  
  // CORS
  ALLOWED_ORIGINS: z.string().transform(v => v.split(',')),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'), // 15 min
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

const parsedEnv = envSchema.parse(process.env);

export const config = {
  nodeEnv: parsedEnv.NODE_ENV,
  port: parsedEnv.PORT,
  appName: parsedEnv.APP_NAME,
  apiVersion: parsedEnv.API_VERSION,
  
  database: {
    host: parsedEnv.DB_HOST,
    port: parsedEnv.DB_PORT,
    name: parsedEnv.DB_NAME,
    user: parsedEnv.DB_USER,
    password: parsedEnv.DB_PASSWORD,
    encrypt: parsedEnv.DB_ENCRYPT,
  },
  
  cosmosDb: {
    endpoint: parsedEnv.COSMOS_DB_ENDPOINT,
    name: parsedEnv.COSMOS_DB_NAME,
  },
  
  redis: {
    host: parsedEnv.REDIS_HOST,
    port: parsedEnv.REDIS_PORT,
    password: parsedEnv.REDIS_PASSWORD,
    tls: parsedEnv.REDIS_TLS,
  },
  
  serviceBus: {
    namespace: parsedEnv.SERVICE_BUS_NAMESPACE,
  },
  
  storage: {
    account: parsedEnv.AZURE_STORAGE_ACCOUNT,
  },
  
  keyVault: {
    name: parsedEnv.AZURE_KEY_VAULT_NAME,
  },
  
  jwt: {
    secret: parsedEnv.JWT_SECRET,
    expiration: parsedEnv.JWT_EXPIRATION,
    refreshExpiration: parsedEnv.REFRESH_TOKEN_EXPIRATION,
  },
  
  stripe: {
    secretKey: parsedEnv.STRIPE_SECRET_KEY,
    webhookSecret: parsedEnv.STRIPE_WEBHOOK_SECRET,
  },
  
  email: {
    host: parsedEnv.SMTP_HOST,
    port: parsedEnv.SMTP_PORT,
    user: parsedEnv.SMTP_USER,
    password: parsedEnv.SMTP_PASSWORD,
    from: parsedEnv.SMTP_FROM,
  },
  
  appInsights: {
    connectionString: parsedEnv.APPLICATIONINSIGHTS_CONNECTION_STRING,
  },
  
  allowedOrigins: parsedEnv.ALLOWED_ORIGINS,
  
  rateLimit: {
    windowMs: parsedEnv.RATE_LIMIT_WINDOW_MS,
    maxRequests: parsedEnv.RATE_LIMIT_MAX_REQUESTS,
  },
  
  logLevel: parsedEnv.LOG_LEVEL,
} as const;
```

### `src/config/database.ts`
```typescript
import { Connection, ConnectionConfig, Request } from 'tedious';
import { config } from './environment';
import { logger } from '@/utils/logger';

let dbConnection: Connection | null = null;

const dbConfig: ConnectionConfig = {
  server: config.database.host,
  authentication: {
    type: 'default',
    options: {
      userName: config.database.user,
      password: config.database.password,
    },
  },
  options: {
    database: config.database.name,
    port: config.database.port,
    encrypt: config.database.encrypt,
    trustServerCertificate: false,
    connectTimeout: 30000,
    requestTimeout: 30000,
    rowCollectionOnRequestCompletion: true,
  },
};

export async function connectDatabase(): Promise<Connection> {
  if (dbConnection && dbConnection.state.name === 'LoggedIn') {
    return dbConnection;
  }

  return new Promise((resolve, reject) => {
    const connection = new Connection(dbConfig);

    connection.on('connect', (err) => {
      if (err) {
        logger.error('Database connection failed:', err);
        reject(err);
      } else {
        logger.info('Database connected successfully');
        dbConnection = connection;
        resolve(connection);
      }
    });

    connection.on('error', (err) => {
      logger.error('Database error:', err);
    });

    connection.connect();
  });
}

export function getDatabase(): Connection {
  if (!dbConnection || dbConnection.state.name !== 'LoggedIn') {
    throw new Error('Database not connected');
  }
  return dbConnection;
}

export async function executeQuery<T = any>(
  query: string,
  parameters: Array<{ name: string; type: any; value: any }> = []
): Promise<T[]> {
  const connection = await connectDatabase();

  return new Promise((resolve, reject) => {
    const results: T[] = [];
    const request = new Request(query, (err) => {
      if (err) {
        logger.error('Query execution error:', err);
        reject(err);
      } else {
        resolve(results);
      }
    });

    parameters.forEach((param) => {
      request.addParameter(param.name, param.type, param.value);
    });

    request.on('row', (columns) => {
      const row: any = {};
      columns.forEach((column) => {
        row[column.metadata.colName] = column.value;
      });
      results.push(row as T);
    });

    connection.execSql(request);
  });
}
```

### `src/config/redis.ts`
```typescript
import { createClient, RedisClientType } from 'redis';
import { config } from './environment';
import { logger } from '@/utils/logger';

let redisClient: RedisClientType | null = null;

export async function connectRedis(): Promise<RedisClientType> {
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }

  const client = createClient({
    socket: {
      host: config.redis.host,
      port: config.redis.port,
      tls: config.redis.tls,
    },
    password: config.redis.password,
  });

  client.on('error', (err) => {
    logger.error('Redis error:', err);
  });

  client.on('connect', () => {
    logger.info('Redis connecting...');
  });

  client.on('ready', () => {
    logger.info('Redis connected successfully');
  });

  await client.connect();
  redisClient = client;
  return client;
}

export function getRedis(): RedisClientType {
  if (!redisClient || !redisClient.isOpen) {
    throw new Error('Redis not connected');
  }
  return redisClient;
}

export class CacheService {
  private client: RedisClientType;
  private defaultTTL: number = 3600; // 1 hour

  constructor() {
    this.client = getRedis();
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  async set(key: string, value: any, ttl: number = this.defaultTTL): Promise<void> {
    try {
      await this.client.setEx(key, ttl, JSON.stringify(value));
    } catch (error) {
      logger.error('Cache set error:', error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      logger.error('Cache delete error:', error);
    }
  }

  async deletePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
    } catch (error) {
      logger.error('Cache delete pattern error:', error);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error:', error);
      return false;
    }
  }

  async increment(key: string, amount: number = 1): Promise<number> {
    try {
      return await this.client.incrBy(key, amount);
    } catch (error) {
      logger.error('Cache increment error:', error);
      return 0;
    }
  }

  async expire(key: string, ttl: number): Promise<void> {
    try {
      await this.client.expire(key, ttl);
    } catch (error) {
      logger.error('Cache expire error:', error);
    }
  }
}
```

---

## 4. Utilities

### `src/utils/logger.ts`
```typescript
import winston from 'winston';
import { config } from '@/config/environment';

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
};

winston.addColors(colors);

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const transports = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      winston.format.printf((info) => {
        const { timestamp, level, message, ...meta } = info;
        return `${timestamp} [${level}]: ${message} ${
          Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
        }`;
      })
    ),
  }),
];

// Add file transports in production
if (config.nodeEnv === 'production') {
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880,
      maxFiles: 5,
    })
  );
}

export const logger = winston.createLogger({
  level: config.logLevel,
  levels,
  format,
  transports,
  exitOnError: false,
});

// Stream for Morgan
export const loggerStream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};
```

### `src/utils/validation.ts`
```typescript
import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('20'),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const productSchema = z.object({
  sku: z.string().min(1).max(50),
  name: z.string().min(1).max(500),
  slug: z.string().min(1).max(500),
  description: z.string().min(1),
  shortDescription: z.string().max(500).optional(),
  category: z.string(),
  subcategory: z.string().optional(),
  price: z.object({
    amount: z.number().positive(),
    currency: z.string().length(3).default('USD'),
    discountPrice: z.number().positive().optional(),
    discountPercentage: z.number().min(0).max(100).optional(),
  }),
  inventory: z.object({
    quantity: z.number().int().min(0),
    lowStockThreshold: z.number().int().default(10),
    warehouse: z.string(),
  }),
  images: z.array(z.object({
    url: z.string().url(),
    alt: z.string(),
    isPrimary: z.boolean().default(false),
  })),
  status: z.enum(['active', 'inactive', 'draft', 'archived']).default('active'),
  featured: z.boolean().default(false),
});

export const orderSchema = z.object({
  customerId: z.string().uuid(),
  items: z.array(z.object({
    productId: z.string(),
    sku: z.string(),
    quantity: z.number().int().positive(),
    price: z.number().positive(),
  })).min(1),
  shipping: z.object({
    method: z.string(),
    cost: z.number().min(0),
    address: z.object({
      firstName: z.string(),
      lastName: z.string(),
      street: z.string(),
      city: z.string(),
      state: z.string(),
      postalCode: z.string(),
      country: z.string(),
      phone: z.string().optional(),
    }),
  }),
  payment: z.object({
    method: z.enum(['credit_card', 'paypal', 'stripe']),
  }),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain uppercase, lowercase, and number',
  }),
  firstName: z.string().min(1).max(255),
  lastName: z.string().min(1).max(255),
  phone: z.string().optional(),
});
```

### `src/utils/encryption.ts`
```typescript
import bcrypt from 'bcryptjs';

export class EncryptionService {
  private saltRounds = 10;

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  generateRandomString(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

export const encryptionService = new EncryptionService();
```

---

## 5. Middleware

### `src/middleware/auth.middleware.ts`
```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '@/config/environment';
import { ApiError } from '@/types';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export async function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      throw new ApiError('No token provided', 401, 'UNAUTHORIZED');
    }

    const decoded = jwt.verify(token, config.jwt.secret) as any;
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid token',
          statusCode: 401,
        },
      });
    } else {
      next(error);
    }
  }
}

export function authorize(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          statusCode: 401,
        },
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
          statusCode: 403,
        },
      });
    }

    next();
  };
}
```

### `src/middleware/error-handler.ts`
```typescript
import { Request, Response, NextFunction } from 'express';
import { logger } from '@/utils/logger';
import { ZodError } from 'zod';

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR',
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  logger.error('Error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  // Zod validation error
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        statusCode: 400,
        details: err.errors,
      },
    });
    return;
  }

  // API error
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        statusCode: err.statusCode,
        details: err.details,
      },
    });
    return;
  }

  // Default error
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
      statusCode: 500,
    },
  });
}
```

### `src/middleware/request-logger.ts`
```typescript
import { Request, Response, NextFunction } from 'express';
import { logger } from '@/utils/logger';

export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      correlationId: req.get('x-correlation-id'),
    });
  });

  next();
}
```

### `src/middleware/rate-limiter.ts`
```typescript
import rateLimit from 'express-rate-limit';
import { config } from '@/config/environment';

export const rateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
      statusCode: 429,
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
```

### `src/middleware/metrics.ts`
```typescript
import { Request, Response, NextFunction } from 'express';
import { register, Counter, Histogram } from 'prom-client';

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 1, 2, 5],
});

const httpRequestCounter = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

export function metricsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;

    httpRequestDuration.observe(
      {
        method: req.method,
        route,
        status_code: res.statusCode,
      },
      duration
    );

    httpRequestCounter.inc({
      method: req.method,
      route,
      status_code: res.statusCode,
    });
  });

  next();
}

export async function metricsHandler(req: Request, res: Response) {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
}
```

---

Continue to Part 2 for Controllers, Services, and Routes...
