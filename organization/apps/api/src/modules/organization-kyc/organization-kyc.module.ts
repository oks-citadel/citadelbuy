import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// Controllers
import { KycController } from './controllers/kyc.controller';
import { KycWebhookController } from './controllers/kyc-webhook.controller';

// Services
import { KycService } from './services/kyc.service';
import { DocumentStorageService } from './services/document-storage.service';
import { KycProviderService } from './services/kyc-provider.service';
import { KycVerificationProcessor } from './processors/kyc-verification.processor';

// Providers
import { OnfidoProvider } from './providers/onfido.provider';

// Common
import { PrismaModule } from '@/common/prisma/prisma.module';

// Audit module for logging KYC activities
import { OrganizationAuditModule } from '../organization-audit/organization-audit.module';
// Email module for KYC notifications
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    OrganizationAuditModule,
    EmailModule,
  ],
  controllers: [
    KycController,
    KycWebhookController,
  ],
  providers: [
    KycService,
    DocumentStorageService,
    KycProviderService,
    KycVerificationProcessor,
    OnfidoProvider,
  ],
  exports: [
    KycService,
    DocumentStorageService,
    KycProviderService,
  ],
})
export class OrganizationKycModule {}
