import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(private configService?: ConfigService) {
    const databaseUrl = configService?.get<string>('DATABASE_URL');
    const connectionLimit = configService?.get<number>('DATABASE_CONNECTION_LIMIT', 10);
    const poolTimeout = configService?.get<number>('DATABASE_POOL_TIMEOUT', 10);

    super({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
      // Connection pool configuration
      // Format: postgresql://user:password@host:port/database?connection_limit=10&pool_timeout=10
      // These are handled via the DATABASE_URL query parameters
    });

    // Log configuration
    this.logger.log(`Database connection pool size: ${connectionLimit}`);
    this.logger.log(`Database pool timeout: ${poolTimeout}s`);
  }

  async onModuleInit() {
    const maxRetries = 5;
    const retryDelay = 3000; // 3 seconds

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.$connect();
        this.logger.log('Database connected successfully');
        break;
      } catch (error) {
        this.logger.error(
          `Database connection attempt ${attempt}/${maxRetries} failed: ${error.message}`,
        );

        if (attempt === maxRetries) {
          this.logger.error(
            'CRITICAL: Unable to connect to database after maximum retries. ' +
            'Please check DATABASE_URL configuration and ensure the database is accessible.',
          );
          throw new Error(
            `Database connection failed after ${maxRetries} attempts: ${error.message}`,
          );
        }

        this.logger.warn(`Retrying database connection in ${retryDelay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }

    // Query performance monitoring (development only)
    if (process.env.NODE_ENV === 'development') {
      this.$use(async (params, next) => {
        const before = Date.now();
        const result = await next(params);
        const after = Date.now();
        const duration = after - before;

        // Log slow queries (> 100ms)
        if (duration > 100) {
          this.logger.warn(
            `Slow query detected: ${params.model}.${params.action} took ${duration}ms`,
          );
        }

        return result;
      });
    }

    // Query error handling
    this.$use(async (params, next) => {
      try {
        return await next(params);
      } catch (error) {
        this.logger.error(`Query error: ${params.model}.${params.action}`, error);
        throw error;
      }
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clean database in production');
    }

    const models = Reflect.ownKeys(this).filter((key) => {
      const keyStr = String(key);
      return keyStr.charAt(0) !== '_';
    });

    return Promise.all(
      models.map((modelKey) => {
        const key = String(modelKey);
        return (this as any)[key].deleteMany();
      }),
    );
  }
}
