import { Module } from '@nestjs/common';
import { SecurityService } from './security.service';
import { SessionManagerService } from './session-manager.service';
import { SecurityController } from './security.controller';
import { PrismaModule } from '@/common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SecurityController],
  providers: [SecurityService, SessionManagerService],
  exports: [SecurityService, SessionManagerService],
})
export class SecurityModule {}
