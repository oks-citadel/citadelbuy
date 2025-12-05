import { Module } from '@nestjs/common';
import { PrivacyController } from './privacy.controller';
import { PrivacyService } from './privacy.service';
import { DataExportService } from '../users/data-export.service';
import { DataDeletionService } from '../users/data-deletion.service';

@Module({
  controllers: [PrivacyController],
  providers: [PrivacyService, DataExportService, DataDeletionService],
  exports: [PrivacyService, DataExportService, DataDeletionService],
})
export class PrivacyModule {}
