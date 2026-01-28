import { Module } from '@nestjs/common';
import { TaxService } from './tax.service';
import { TaxController } from './tax.controller';
import { TaxAdminController } from './tax-admin.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { RedisModule } from '../../common/redis/redis.module';
import { TaxProviderFactory } from './providers/tax-provider.factory';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [TaxController, TaxAdminController],
  providers: [TaxService, TaxProviderFactory],
  exports: [TaxService],
})
export class TaxModule {}
