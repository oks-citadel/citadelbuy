import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';

// Controllers
import { DomainsController, TenantResolutionController } from './domains.controller';

// Services
import { DomainsService } from './domains.service';
import { DomainVerificationService } from './domain-verification.service';

// Workers
import { DomainVerificationProcessor } from './workers/domain-verification.processor';

// Common modules
import { PrismaModule } from '@/common/prisma/prisma.module';
import { RedisModule } from '@/common/redis/redis.module';
import { QUEUES } from '@/common/queue/queue.constants';

/**
 * Domains Module
 *
 * Provides tenant domain management capabilities:
 * - Custom domain registration and verification
 * - Subdomain management
 * - DNS verification (TXT and CNAME records)
 * - Tenant resolution by host header
 * - Background domain verification workers
 *
 * This module is essential for multi-tenancy support in the Broxiva marketplace.
 */
@Module({
  imports: [
    PrismaModule,
    RedisModule,
    ConfigModule,
    BullModule.registerQueue({
      name: QUEUES.DOMAIN_VERIFICATION,
    }),
  ],
  controllers: [
    DomainsController,
    TenantResolutionController,
  ],
  providers: [
    DomainsService,
    DomainVerificationService,
    DomainVerificationProcessor,
  ],
  exports: [
    DomainsService,
    DomainVerificationService,
    DomainVerificationProcessor,
  ],
})
export class DomainsModule {}
