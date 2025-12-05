import { Module, Global } from '@nestjs/common';

// Controllers
import { AuditController } from './controllers/audit.controller';

// Services
import { AuditService } from './services/audit.service';

// Interceptors
import { AuditLogInterceptor } from './interceptors/audit-log.interceptor';

// Common
import { PrismaModule } from '@/common/prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [AuditController],
  providers: [AuditService, AuditLogInterceptor],
  exports: [AuditService, AuditLogInterceptor],
})
export class OrganizationAuditModule {}
