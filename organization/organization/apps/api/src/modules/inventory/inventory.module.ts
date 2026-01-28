import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { InventoryJobs } from './inventory.jobs';
import { PrismaModule } from '@/common/prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
  ],
  controllers: [InventoryController],
  providers: [InventoryService, InventoryJobs],
  exports: [InventoryService],
})
export class InventoryModule {}
