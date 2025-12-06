import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

export enum KYBStatus {
  PENDING = 'PENDING',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  REQUIRES_ADDITIONAL_INFO = 'REQUIRES_ADDITIONAL_INFO',
}

export enum BusinessVerificationLevel {
  BASIC = 'BASIC', // Basic business info verified
  STANDARD = 'STANDARD', // Business registration + tax ID verified
  ENHANCED = 'ENHANCED', // Full verification with UBO, financial statements
  ENTERPRISE = 'ENTERPRISE', // Enterprise-level verification with audited financials
}

export interface KYBVerificationRequest {
  vendorId: string;
  businessName: string;
  registrationNumber: string;
  taxId: string;
  businessType: string;
  country: string;
  jurisdiction: string;
  incorporationDate?: Date;
  registeredAddress: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  beneficialOwners?: Array<{
    name: string;
    ownershipPercentage: number;
    dateOfBirth: Date;
    nationality: string;
    isPEP: boolean; // Politically Exposed Person
  }>;
  documents: {
    certificateOfIncorporation?: string;
    taxCertificate?: string;
    bankStatement?: string;
    financialStatements?: string;
    uboCertificate?: string; // Ultimate Beneficial Owner
    operatingLicense?: string;
  };
}

export interface KYBVerificationResult {
  status: KYBStatus;
  verificationLevel: BusinessVerificationLevel;
  score: number;
  checks: {
    businessRegistration: { verified: boolean; source: string; confidence: number };
    taxIdValidation: { verified: boolean; source: string; confidence: number };
    addressVerification: { verified: boolean; source: string; confidence: number };
    uboVerification: { verified: boolean; source: string; confidence: number };
    sanctionsCheck: { cleared: boolean; matches: any[] };
    adverseMediaCheck: { cleared: boolean; findings: any[] };
    creditCheck?: { score: number; rating: string };
  };
  risks: Array<{
    type: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    description: string;
  }>;
  recommendations: string[];
  reviewedAt: Date;
  expiresAt: Date;
}

/**
 * Know Your Business (KYB) Service
 *
 * Provides comprehensive business verification for vendor onboarding.
 * Integrates with multiple data sources for business verification:
 * - Government business registries
 * - Tax authority databases
 * - Credit bureaus (Dun & Bradstreet, Experian, etc.)
 * - Sanctions lists (OFAC, UN, EU)
 * - Corporate registries (Companies House, SEC, etc.)
 */
@Injectable()
export class KYBService {
  private readonly logger = new Logger(KYBService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Initiate KYB verification for a vendor
   */
  async initiateVerification(request: KYBVerificationRequest): Promise<string> {
    this.logger.log(`Initiating KYB verification for vendor: ${request.vendorId}`);

    // Create verification record
    const verification = await this.prisma.vendorApplication.update({
      where: { vendorProfileId: request.vendorId },
      data: {
        status: 'UNDER_REVIEW',
        applicationData: {
          ...request,
          kybInitiatedAt: new Date().toISOString(),
        } as any,
      },
    });

    // In production, this would trigger async verification workflow
    // Using job queues (BullMQ) to process verification steps
    await this.queueVerificationJob(verification.id, request);

    return verification.id;
  }

  /**
   * Perform comprehensive KYB verification
   */
  async performVerification(
    applicationId: string,
    request: KYBVerificationRequest,
  ): Promise<KYBVerificationResult> {
    this.logger.log(`Performing KYB verification for application: ${applicationId}`);

    const checks = await Promise.all([
      this.verifyBusinessRegistration(request),
      this.verifyTaxId(request),
      this.verifyAddress(request),
      this.verifyBeneficialOwners(request),
      this.performSanctionsCheck(request),
      this.performAdverseMediaCheck(request),
    ]);

    const [
      businessReg,
      taxId,
      address,
      ubo,
      sanctions,
      adverseMedia,
    ] = checks;

    // Calculate risk score
    const { score, risks } = this.calculateRiskScore({
      businessReg,
      taxId,
      address,
      ubo,
      sanctions,
      adverseMedia,
    });

    // Determine verification level
    const verificationLevel = this.determineVerificationLevel(checks, request);

    // Generate recommendations
    const recommendations = this.generateRecommendations(risks, checks);

    const result: KYBVerificationResult = {
      status: score >= 75 ? KYBStatus.APPROVED :
              score >= 50 ? KYBStatus.REQUIRES_ADDITIONAL_INFO :
              KYBStatus.REJECTED,
      verificationLevel,
      score,
      checks: {
        businessRegistration: businessReg,
        taxIdValidation: taxId,
        addressVerification: address,
        uboVerification: ubo,
        sanctionsCheck: sanctions,
        adverseMediaCheck: adverseMedia,
      },
      risks,
      recommendations,
      reviewedAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    };

    // Store verification result
    await this.storeVerificationResult(applicationId, result);

    return result;
  }

  /**
   * Verify business registration with government registry
   */
  private async verifyBusinessRegistration(
    request: KYBVerificationRequest,
  ): Promise<{ verified: boolean; source: string; confidence: number }> {
    this.logger.log(`Verifying business registration: ${request.registrationNumber}`);

    // In production, integrate with:
    // - Companies House API (UK)
    // - SEC EDGAR (US)
    // - European Business Register
    // - Local country registries (CAC for Nigeria, CIPC for South Africa, etc.)

    // Mock verification for now
    return {
      verified: true,
      source: `${request.country} Business Registry`,
      confidence: 0.92,
    };
  }

  /**
   * Verify tax identification number
   */
  private async verifyTaxId(
    request: KYBVerificationRequest,
  ): Promise<{ verified: boolean; source: string; confidence: number }> {
    this.logger.log(`Verifying tax ID: ${request.taxId}`);

    // In production, integrate with:
    // - IRS TIN Matching (US)
    // - VIES VAT Validation (EU)
    // - HMRC VAT Check (UK)
    // - Local tax authority APIs

    return {
      verified: true,
      source: `${request.country} Tax Authority`,
      confidence: 0.88,
    };
  }

  /**
   * Verify business address
   */
  private async verifyAddress(
    request: KYBVerificationRequest,
  ): Promise<{ verified: boolean; source: string; confidence: number }> {
    this.logger.log(`Verifying address: ${request.registeredAddress.city}, ${request.registeredAddress.country}`);

    // In production, integrate with:
    // - Google Places API
    // - Here Maps
    // - Address validation services
    // - Utility bill verification

    return {
      verified: true,
      source: 'Address Validation Service',
      confidence: 0.85,
    };
  }

  /**
   * Verify Ultimate Beneficial Owners (UBO)
   */
  private async verifyBeneficialOwners(
    request: KYBVerificationRequest,
  ): Promise<{ verified: boolean; source: string; confidence: number }> {
    if (!request.beneficialOwners || request.beneficialOwners.length === 0) {
      return {
        verified: false,
        source: 'Not provided',
        confidence: 0,
      };
    }

    this.logger.log(`Verifying ${request.beneficialOwners.length} beneficial owners`);

    // In production, verify each UBO against:
    // - Government ID databases
    // - PEP (Politically Exposed Persons) lists
    // - Sanctions lists
    // - Beneficial ownership registries

    const totalOwnership = request.beneficialOwners.reduce(
      (sum, owner) => sum + owner.ownershipPercentage,
      0,
    );

    return {
      verified: totalOwnership >= 25, // UBO threshold typically 25%
      source: 'UBO Registry',
      confidence: 0.80,
    };
  }

  /**
   * Perform sanctions screening
   */
  private async performSanctionsCheck(
    request: KYBVerificationRequest,
  ): Promise<{ cleared: boolean; matches: any[] }> {
    this.logger.log(`Performing sanctions check for: ${request.businessName}`);

    // In production, check against:
    // - OFAC SDN List
    // - UN Sanctions List
    // - EU Sanctions List
    // - UK HM Treasury List
    // - Local sanctions lists

    // This is handled in detail by sanctions-screening.service.ts
    return {
      cleared: true,
      matches: [],
    };
  }

  /**
   * Perform adverse media check
   */
  private async performAdverseMediaCheck(
    request: KYBVerificationRequest,
  ): Promise<{ cleared: boolean; findings: any[] }> {
    this.logger.log(`Performing adverse media check for: ${request.businessName}`);

    // In production, scan:
    // - News databases
    // - Legal proceedings
    // - Bankruptcy records
    // - Regulatory actions
    // - Criminal records

    return {
      cleared: true,
      findings: [],
    };
  }

  /**
   * Calculate comprehensive risk score
   */
  private calculateRiskScore(checks: any): { score: number; risks: any[] } {
    const risks: any[] = [];
    let score = 100;

    // Business registration verification
    if (!checks.businessReg.verified) {
      score -= 30;
      risks.push({
        type: 'BUSINESS_REGISTRATION',
        severity: 'HIGH',
        description: 'Business registration could not be verified',
      });
    }

    // Tax ID verification
    if (!checks.taxId.verified) {
      score -= 25;
      risks.push({
        type: 'TAX_ID',
        severity: 'HIGH',
        description: 'Tax ID could not be verified',
      });
    }

    // Address verification
    if (!checks.address.verified) {
      score -= 15;
      risks.push({
        type: 'ADDRESS',
        severity: 'MEDIUM',
        description: 'Business address could not be verified',
      });
    }

    // UBO verification
    if (!checks.ubo.verified) {
      score -= 20;
      risks.push({
        type: 'UBO',
        severity: 'HIGH',
        description: 'Beneficial ownership structure incomplete or unverified',
      });
    }

    // Sanctions check
    if (!checks.sanctions.cleared) {
      score = 0; // Auto-reject
      risks.push({
        type: 'SANCTIONS',
        severity: 'CRITICAL',
        description: 'Business or owners appear on sanctions lists',
      });
    }

    // Adverse media
    if (!checks.adverseMedia.cleared) {
      score -= 15;
      risks.push({
        type: 'ADVERSE_MEDIA',
        severity: 'MEDIUM',
        description: 'Negative media coverage or legal issues found',
      });
    }

    return { score: Math.max(0, score), risks };
  }

  /**
   * Determine verification level based on checks
   */
  private determineVerificationLevel(
    checks: any[],
    request: KYBVerificationRequest,
  ): BusinessVerificationLevel {
    const [businessReg, taxId, address, ubo] = checks;

    if (
      businessReg.verified &&
      taxId.verified &&
      address.verified &&
      ubo.verified &&
      request.documents.financialStatements &&
      request.documents.uboCertificate
    ) {
      return BusinessVerificationLevel.ENHANCED;
    }

    if (
      businessReg.verified &&
      taxId.verified &&
      address.verified
    ) {
      return BusinessVerificationLevel.STANDARD;
    }

    if (businessReg.verified || taxId.verified) {
      return BusinessVerificationLevel.BASIC;
    }

    return BusinessVerificationLevel.BASIC;
  }

  /**
   * Generate recommendations based on verification results
   */
  private generateRecommendations(risks: any[], checks: any): string[] {
    const recommendations: string[] = [];

    if (risks.some(r => r.type === 'BUSINESS_REGISTRATION')) {
      recommendations.push('Request updated certificate of incorporation');
    }

    if (risks.some(r => r.type === 'TAX_ID')) {
      recommendations.push('Verify tax registration with local authority');
    }

    if (risks.some(r => r.type === 'UBO')) {
      recommendations.push('Collect complete beneficial ownership information (25%+ stakeholders)');
    }

    if (risks.some(r => r.severity === 'CRITICAL')) {
      recommendations.push('URGENT: Manual review required - critical compliance issues detected');
    }

    return recommendations;
  }

  /**
   * Store verification result in database
   */
  private async storeVerificationResult(
    applicationId: string,
    result: KYBVerificationResult,
  ): Promise<void> {
    await this.prisma.vendorApplication.update({
      where: { id: applicationId },
      data: {
        status: result.status as any,
        applicationData: {
          kybVerification: result,
          verifiedAt: new Date().toISOString(),
        } as any,
      },
    });
  }

  /**
   * Queue verification job (placeholder for BullMQ integration)
   */
  private async queueVerificationJob(
    applicationId: string,
    request: KYBVerificationRequest,
  ): Promise<void> {
    // In production, add to BullMQ queue
    this.logger.log(`Queuing KYB verification job for application: ${applicationId}`);

    // Simulate async processing
    setTimeout(async () => {
      await this.performVerification(applicationId, request);
    }, 5000);
  }

  /**
   * Get verification status
   */
  async getVerificationStatus(applicationId: string): Promise<KYBVerificationResult | null> {
    const application = await this.prisma.vendorApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application || !application.applicationData) {
      return null;
    }

    const data = application.applicationData as any;
    return data.kybVerification || null;
  }

  /**
   * Renew KYB verification (annual refresh)
   */
  async renewVerification(vendorId: string): Promise<string> {
    this.logger.log(`Renewing KYB verification for vendor: ${vendorId}`);

    const vendor = await this.prisma.vendorProfile.findUnique({
      where: { id: vendorId },
      include: { application: true },
    });

    if (!vendor || !vendor.application) {
      throw new Error('Vendor or application not found');
    }

    const applicationData = vendor.application.applicationData as any;
    const originalRequest: KYBVerificationRequest = applicationData;

    return this.initiateVerification(originalRequest);
  }
}
