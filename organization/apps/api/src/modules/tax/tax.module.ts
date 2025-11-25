import { Module } from '@nestjs/common';
import { TaxService } from './tax.service';
import { TaxController } from './tax.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { TaxProviderFactory } from './providers/tax-provider.factory';

@Module({
  imports: [PrismaModule],
  controllers: [TaxController],
  providers: [TaxService, TaxProviderFactory],
  exports: [TaxService],
})
export class TaxModule {}
