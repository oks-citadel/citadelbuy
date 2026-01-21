import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FraudDetectionController } from './fraud-detection.controller';
import { FraudDetectionService } from './fraud-detection.service';
import { TransactionAnalysisService } from './transaction-analysis.service';
import { AccountSecurityService } from './account-security.service';
import { DeviceFingerprintService } from './device-fingerprint.service';
import { PrismaModule } from '@/common/prisma/prisma.module';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [FraudDetectionController],
  providers: [
    DeviceFingerprintService,
    FraudDetectionService,
    TransactionAnalysisService,
    AccountSecurityService,
  ],
  exports: [
    DeviceFingerprintService,
    FraudDetectionService,
    TransactionAnalysisService,
    AccountSecurityService,
  ],
})
export class FraudDetectionModule {}
