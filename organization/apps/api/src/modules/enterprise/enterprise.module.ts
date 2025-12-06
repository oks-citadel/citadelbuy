import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { RFQService } from './rfq.service';
import { EscrowService } from './escrow.service';
import { ContractsService } from './contracts.service';
import { MultiOfficeService } from './multi-office.service';

@Module({
  imports: [PrismaModule],
  providers: [
    RFQService,
    EscrowService,
    ContractsService,
    MultiOfficeService,
  ],
  exports: [
    RFQService,
    EscrowService,
    ContractsService,
    MultiOfficeService,
  ],
})
export class EnterpriseModule {}
