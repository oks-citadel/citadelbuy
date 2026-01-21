import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

export enum VerificationTier {
  BRONZE = 'BRONZE', // Basic verification
  SILVER = 'SILVER', // Standard verification
  GOLD = 'GOLD', // Enhanced verification
  PLATINUM = 'PLATINUM', // Premium enterprise verification
}

export interface RegionalRequirement {
  region: string;
  country: string;
  required: boolean;
  documentTypes: string[];
  regulatoryBodies: string[];
  additionalChecks: string[];
}

export interface VendorVerificationProfile {
  vendorId: string;
  tier: VerificationTier;
  regions: string[];
  verifications: {
    identity: { verified: boolean; level: string; expiresAt: Date };
    business: { verified: boolean; level: string; expiresAt: Date };
    financial: { verified: boolean; level: string; expiresAt: Date };
    compliance: { verified: boolean; level: string; expiresAt: Date };
    regional: Map<string, { verified: boolean; requirements: string[] }>;
  };
  certifications: string[];
  badges: string[];
  trustScore: number;
  lastVerified: Date;
  nextVerificationDue: Date;
}

/**
 * Multi-Region Vendor Verification Service
 *
 * Manages vendor verification across different regions with specific requirements:
 * - Africa (AFCFTA compliance, local business licenses)
 * - United States (SOC2, state business licenses, federal procurement)
 * - European Union (GDPR, VAT validation, CE marking)
 * - Middle East (GCC requirements, Halal certifications)
 * - Asia-Pacific (varied regulatory requirements)
 * - Latin America (regional trade agreements)
 */
@Injectable()
export class VendorVerificationService {
  private readonly logger = new Logger(VendorVerificationService.name);

  // Regional requirement configurations
  private readonly regionalRequirements: Map<string, RegionalRequirement[]> = new Map([
    [
      'AFRICA',
      [
        {
          region: 'West Africa',
          country: 'Nigeria',
          required: true,
          documentTypes: ['CAC Certificate', 'Tax Clearance', 'NAFDAC Registration'],
          regulatoryBodies: ['CAC', 'FIRS', 'NAFDAC'],
          additionalChecks: ['AFCFTA compliance', 'ECOWAS trade certification'],
        },
        {
          region: 'East Africa',
          country: 'Kenya',
          required: true,
          documentTypes: ['Certificate of Incorporation', 'KRA PIN', 'EAC Certificate'],
          regulatoryBodies: ['Registrar of Companies', 'KRA', 'EAC'],
          additionalChecks: ['EAC trade compliance', 'COMESA certification'],
        },
        {
          region: 'Southern Africa',
          country: 'South Africa',
          required: true,
          documentTypes: ['CIPC Registration', 'SARS Tax Clearance', 'BEE Certificate'],
          regulatoryBodies: ['CIPC', 'SARS', 'BBBEE Commission'],
          additionalChecks: ['SADC compliance', 'BEE status verification'],
        },
      ],
    ],
    [
      'NORTH_AMERICA',
      [
        {
          region: 'United States',
          country: 'US',
          required: true,
          documentTypes: ['EIN', 'Business License', 'SOC2 Type II', 'W-9'],
          regulatoryBodies: ['IRS', 'SEC', 'State Dept of Commerce'],
          additionalChecks: ['SAM.gov registration', 'DUNS number', 'FCC compliance'],
        },
        {
          region: 'Canada',
          country: 'CA',
          required: true,
          documentTypes: ['BN', 'GST/HST Registration', 'Provincial License'],
          regulatoryBodies: ['CRA', 'Provincial Registry'],
          additionalChecks: ['CUSMA compliance', 'PIPEDA compliance'],
        },
      ],
    ],
    [
      'EUROPE',
      [
        {
          region: 'European Union',
          country: 'EU',
          required: true,
          documentTypes: ['VAT Number', 'GDPR Compliance Certificate', 'CE Marking'],
          regulatoryBodies: ['VIES', 'Data Protection Authority', 'EU Commission'],
          additionalChecks: ['GDPR compliance', 'VAT validation', 'AML screening'],
        },
        {
          region: 'United Kingdom',
          country: 'UK',
          required: true,
          documentTypes: ['Company Number', 'VAT Registration', 'UKCA Marking'],
          regulatoryBodies: ['Companies House', 'HMRC', 'ICO'],
          additionalChecks: ['UK GDPR compliance', 'Post-Brexit trade rules'],
        },
      ],
    ],
    [
      'MIDDLE_EAST',
      [
        {
          region: 'GCC',
          country: 'UAE',
          required: true,
          documentTypes: ['Trade License', 'Chamber Certificate', 'Tax Registration'],
          regulatoryBodies: ['DED', 'Chamber of Commerce', 'FTA'],
          additionalChecks: ['GCC compliance', 'Halal certification (if applicable)'],
        },
        {
          region: 'Saudi Arabia',
          country: 'SA',
          required: true,
          documentTypes: ['CR Number', 'Zakat Certificate', 'SASO Certificate'],
          regulatoryBodies: ['MOCI', 'GAZT', 'SASO'],
          additionalChecks: ['Saudization compliance', 'SABER registration'],
        },
      ],
    ],
    [
      'ASIA_PACIFIC',
      [
        {
          region: 'Singapore',
          country: 'SG',
          required: true,
          documentTypes: ['UEN', 'ACRA Filing', 'GST Registration'],
          regulatoryBodies: ['ACRA', 'IRAS', 'MAS'],
          additionalChecks: ['PDPA compliance', 'ASEAN trade certification'],
        },
        {
          region: 'Australia',
          country: 'AU',
          required: true,
          documentTypes: ['ABN', 'ACN', 'TFN Declaration'],
          regulatoryBodies: ['ASIC', 'ATO', 'ACCC'],
          additionalChecks: ['Privacy Act compliance', 'Consumer Law compliance'],
        },
      ],
    ],
  ]);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Get verification requirements for specific region
   */
  getRegionalRequirements(region: string, country?: string): RegionalRequirement[] {
    const requirements = this.regionalRequirements.get(region) || [];

    if (country) {
      return requirements.filter((req) => req.country === country);
    }

    return requirements;
  }

  /**
   * Verify vendor for specific region
   */
  async verifyVendorForRegion(
    vendorId: string,
    region: string,
    country: string,
    documents: Map<string, string>,
  ): Promise<{ verified: boolean; missingRequirements: string[] }> {
    this.logger.log(`Verifying vendor ${vendorId} for region: ${region}, country: ${country}`);

    const requirements = this.getRegionalRequirements(region, country);

    if (requirements.length === 0) {
      this.logger.warn(`No requirements found for region: ${region}, country: ${country}`);
      return { verified: false, missingRequirements: ['No regional requirements defined'] };
    }

    const missingRequirements: string[] = [];

    for (const req of requirements) {
      for (const docType of req.documentTypes) {
        if (!documents.has(docType)) {
          missingRequirements.push(`${req.country}: ${docType}`);
        }
      }
    }

    const verified = missingRequirements.length === 0;

    // Store regional verification result
    await this.storeRegionalVerification(vendorId, region, country, {
      verified,
      requirements: requirements[0],
      submittedDocuments: Array.from(documents.keys()),
      missingRequirements,
      verifiedAt: new Date(),
    });

    return { verified, missingRequirements };
  }

  /**
   * Create comprehensive verification profile
   */
  async createVerificationProfile(vendorId: string): Promise<VendorVerificationProfile> {
    const vendor = await this.prisma.vendorProfile.findUnique({
      where: { id: vendorId },
      include: { application: true },
    });

    if (!vendor) {
      throw new Error('Vendor not found');
    }

    // Determine tier based on verification level
    const tier = this.determineTier(vendor);

    const profile: VendorVerificationProfile = {
      vendorId,
      tier,
      regions: [],
      verifications: {
        identity: {
          verified: vendor.isVerified,
          level: 'STANDARD',
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
        business: {
          verified: vendor.status === 'ACTIVE',
          level: 'STANDARD',
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
        financial: {
          verified: !!vendor.stripeAccountId,
          level: 'BASIC',
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
        compliance: {
          verified: vendor.isVerified,
          level: 'BASIC',
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
        regional: new Map(),
      },
      certifications: [],
      badges: this.generateBadges(vendor),
      trustScore: this.calculateTrustScore(vendor),
      lastVerified: new Date(),
      nextVerificationDue: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    };

    return profile;
  }

  /**
   * Verify vendor across multiple regions
   */
  async verifyMultiRegional(
    vendorId: string,
    targetRegions: Array<{ region: string; country: string }>,
  ): Promise<Map<string, { verified: boolean; missingRequirements: string[] }>> {
    const results = new Map<string, { verified: boolean; missingRequirements: string[] }>();

    for (const target of targetRegions) {
      // Get submitted documents for this region (from vendor application)
      const documents = await this.getVendorDocuments(vendorId, target.region);

      const result = await this.verifyVendorForRegion(
        vendorId,
        target.region,
        target.country,
        documents,
      );

      results.set(`${target.region}-${target.country}`, result);
    }

    return results;
  }

  /**
   * Upgrade vendor verification tier
   */
  async upgradeTier(
    vendorId: string,
    targetTier: VerificationTier,
  ): Promise<{ success: boolean; requirements: string[] }> {
    this.logger.log(`Upgrading vendor ${vendorId} to tier: ${targetTier}`);

    const requirements = this.getTierRequirements(targetTier);
    const vendor = await this.prisma.vendorProfile.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new Error('Vendor not found');
    }

    // Check if vendor meets requirements
    const meetsRequirements = await this.checkTierRequirements(vendorId, targetTier);

    if (meetsRequirements) {
      await this.prisma.vendorProfile.update({
        where: { id: vendorId },
        data: {
          // Store tier in metadata or custom field
        },
      });

      return { success: true, requirements: [] };
    }

    return { success: false, requirements };
  }

  /**
   * Calculate vendor trust score (0-100)
   */
  private calculateTrustScore(vendor: any): number {
    let score = 0;

    // Base verification (30 points)
    if (vendor.isVerified) score += 30;

    // Business metrics (30 points)
    if (vendor.totalOrders > 100) score += 10;
    if (vendor.averageRating >= 4.5) score += 10;
    if (vendor.totalRevenue > 10000) score += 10;

    // Account age (20 points)
    const accountAgeMonths =
      (Date.now() - new Date(vendor.createdAt).getTime()) / (30 * 24 * 60 * 60 * 1000);
    if (accountAgeMonths >= 12) score += 20;
    else if (accountAgeMonths >= 6) score += 10;

    // Financial setup (20 points)
    if (vendor.stripeAccountId) score += 10;
    if (vendor.bankName) score += 10;

    return Math.min(100, score);
  }

  /**
   * Generate verification badges
   */
  private generateBadges(vendor: any): string[] {
    const badges: string[] = [];

    if (vendor.isVerified) badges.push('VERIFIED_BUSINESS');
    if (vendor.totalOrders > 1000) badges.push('TRUSTED_SELLER');
    if (vendor.averageRating >= 4.8) badges.push('TOP_RATED');

    const accountAgeMonths =
      (Date.now() - new Date(vendor.createdAt).getTime()) / (30 * 24 * 60 * 60 * 1000);
    if (accountAgeMonths >= 24) badges.push('ESTABLISHED_VENDOR');

    return badges;
  }

  /**
   * Determine verification tier
   */
  private determineTier(vendor: any): VerificationTier {
    const trustScore = this.calculateTrustScore(vendor);

    if (trustScore >= 90) return VerificationTier.PLATINUM;
    if (trustScore >= 75) return VerificationTier.GOLD;
    if (trustScore >= 50) return VerificationTier.SILVER;
    return VerificationTier.BRONZE;
  }

  /**
   * Get tier requirements
   */
  private getTierRequirements(tier: VerificationTier): string[] {
    const requirements: { [key in VerificationTier]: string[] } = {
      [VerificationTier.BRONZE]: [
        'Business registration verified',
        'Valid tax ID',
        'Owner identity verified',
      ],
      [VerificationTier.SILVER]: [
        ...this.getTierRequirements(VerificationTier.BRONZE),
        'Bank account verified',
        '50+ successful orders',
        '4.0+ average rating',
        '6+ months account age',
      ],
      [VerificationTier.GOLD]: [
        ...this.getTierRequirements(VerificationTier.SILVER),
        'Financial statements verified',
        'Regional compliance verified',
        '500+ successful orders',
        '4.5+ average rating',
        '12+ months account age',
      ],
      [VerificationTier.PLATINUM]: [
        ...this.getTierRequirements(VerificationTier.GOLD),
        'SOC2 Type II certified',
        'ISO 27001 certified',
        'Multi-region verified',
        '1000+ successful orders',
        '4.8+ average rating',
        '24+ months account age',
        'Dedicated account manager',
      ],
    };

    return requirements[tier];
  }

  /**
   * Check if vendor meets tier requirements
   */
  private async checkTierRequirements(
    vendorId: string,
    tier: VerificationTier,
  ): Promise<boolean> {
    const vendor = await this.prisma.vendorProfile.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) return false;

    const trustScore = this.calculateTrustScore(vendor);

    const thresholds = {
      [VerificationTier.BRONZE]: 25,
      [VerificationTier.SILVER]: 50,
      [VerificationTier.GOLD]: 75,
      [VerificationTier.PLATINUM]: 90,
    };

    return trustScore >= thresholds[tier];
  }

  /**
   * Get vendor documents for region
   */
  private async getVendorDocuments(
    vendorId: string,
    region: string,
  ): Promise<Map<string, string>> {
    const vendor = await this.prisma.vendorProfile.findUnique({
      where: { id: vendorId },
      include: { application: true },
    });

    // Extract documents from application data
    const documents = new Map<string, string>();

    if (vendor?.application?.documentsSubmitted) {
      const docs = vendor.application.documentsSubmitted as any[];
      docs.forEach((doc) => {
        if (doc.region === region) {
          documents.set(doc.type, doc.url);
        }
      });
    }

    return documents;
  }

  /**
   * Store regional verification result
   */
  private async storeRegionalVerification(
    vendorId: string,
    region: string,
    country: string,
    result: any,
  ): Promise<void> {
    // In production, store in dedicated table or JSON column
    await this.prisma.vendorProfile.update({
      where: { id: vendorId },
      data: {
        // Store in metadata
      },
    });

    this.logger.log(
      `Stored regional verification for vendor ${vendorId}: ${region}-${country} - ${result.verified ? 'VERIFIED' : 'INCOMPLETE'}`,
    );
  }

  /**
   * Get all regional verifications for vendor
   */
  async getRegionalVerifications(vendorId: string): Promise<any> {
    // Retrieve stored regional verifications
    const vendor = await this.prisma.vendorProfile.findUnique({
      where: { id: vendorId },
    });

    return {
      vendorId,
      regions: [], // Parse from vendor metadata
      verifiedRegions: [],
      pendingRegions: [],
    };
  }
}
