import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@/common/prisma/prisma.module';

// Core compliance services
import { DataResidencyService } from './data-residency.service';
import { KYBService } from './kyb.service';
import { SanctionsScreeningService } from './sanctions-screening.service';
import { TradeComplianceService } from './trade-compliance.service';
import { VendorVerificationService } from './vendor-verification.service';

// Certification services
import { AuditTrailService } from './certifications/audit-trail.service';
import { BadgeService } from './certifications/badge.service';
import { CertificationService } from './certifications/certification.service';

// Regional compliance services
import { AfricaComplianceService } from './regional/africa-compliance.service';
import { EUComplianceService } from './regional/eu-compliance.service';
import { MiddleEastComplianceService } from './regional/middle-east-compliance.service';
import { USComplianceService } from './regional/us-compliance.service';

@Module({
  imports: [PrismaModule, ConfigModule],
  providers: [
    // Core compliance services
    DataResidencyService,
    KYBService,
    SanctionsScreeningService,
    TradeComplianceService,
    VendorVerificationService,

    // Certification services
    AuditTrailService,
    BadgeService,
    CertificationService,

    // Regional compliance services
    AfricaComplianceService,
    EUComplianceService,
    MiddleEastComplianceService,
    USComplianceService,
  ],
  exports: [
    // Core compliance services
    DataResidencyService,
    KYBService,
    SanctionsScreeningService,
    TradeComplianceService,
    VendorVerificationService,

    // Certification services
    AuditTrailService,
    BadgeService,
    CertificationService,

    // Regional compliance services
    AfricaComplianceService,
    EUComplianceService,
    MiddleEastComplianceService,
    USComplianceService,
  ],
})
export class ComplianceModule {}
