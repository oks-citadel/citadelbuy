import { Module } from '@nestjs/common';
import { FraudDetectionController } from './fraud-detection.controller';
import { FraudDetectionService } from './fraud-detection.service';
import { TransactionAnalysisService } from './transaction-analysis.service';
import { AccountSecurityService } from './account-security.service';

@Module({
  controllers: [FraudDetectionController],
  providers: [
    FraudDetectionService,
    TransactionAnalysisService,
    AccountSecurityService,
  ],
  exports: [FraudDetectionService, TransactionAnalysisService, AccountSecurityService],
})
export class FraudDetectionModule {}
