import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { InventoryJobs } from './inventory.jobs';
import { PrismaModule } from '@/common/prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [InventoryController],
  providers: [InventoryService, InventoryJobs],
  exports: [InventoryService],
})
export class InventoryModule {}
