import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { PreferencesController } from './preferences.controller';
import { UsersService } from './users.service';
import { AddressService } from './address.service';
import { DataExportService } from './data-export.service';
import { DataDeletionService } from './data-deletion.service';
import { PreferencesService } from './preferences.service';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { RedisModule } from '@/common/redis/redis.module';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [UsersController, PreferencesController],
  providers: [
    UsersService,
    AddressService,
    DataExportService,
    DataDeletionService,
    PreferencesService,
  ],
  exports: [
    UsersService,
    AddressService,
    DataExportService,
    DataDeletionService,
    PreferencesService,
  ],
})
export class UsersModule {}
