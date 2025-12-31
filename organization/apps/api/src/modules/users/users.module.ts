import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AddressService } from './address.service';
import { DataExportService } from './data-export.service';
import { DataDeletionService } from './data-deletion.service';
import { PrismaModule } from '@/common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [UsersService, AddressService, DataExportService, DataDeletionService],
  exports: [UsersService, AddressService, DataExportService, DataDeletionService],
})
export class UsersModule {}
