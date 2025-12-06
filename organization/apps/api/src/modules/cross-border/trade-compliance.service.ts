import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface ComplianceCheck {
  productId: string;
  originCountry: string;
  destinationCountry: string;
  hsCode?: string;
  result: 'APPROVED' | 'RESTRICTED' | 'PROHIBITED' | 'REQUIRES_LICENSE';
  restrictions?: string[];
  licenses?: string[];
  notes?: string;
}

export interface SanctionCheck {
  entityName: string;
  country: string;
  result: 'CLEAR' | 'MATCH' | 'POTENTIAL_MATCH';
  matchedLists?: string[];
  riskScore: number;
}

@Injectable()
export class TradeComplianceService {
  private readonly logger = new Logger(TradeComplianceService.name);

  // Simplified restricted countries list
  private readonly restrictedCountries = [
    'KP', // North Korea
    'SY', // Syria
    'IR', // Iran
    'CU', // Cuba
  ];

  // Simplified sanctioned entities (would be from actual databases)
  private readonly sanctionedEntities = new Set([
    'SANCTIONED_ENTITY_1',
    'SANCTIONED_ENTITY_2',
  ]);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check trade compliance for a product shipment
   */
  async checkCompliance(params: {
    productId: string;
    originCountry: string;
    destinationCountry: string;
    hsCode?: string;
    value?: number;
  }): Promise<ComplianceCheck> {
    this.logger.log(
      `Checking compliance: ${params.productId} from ${params.originCountry} to ${params.destinationCountry}`,
    );

    const restrictions: string[] = [];
    const licenses: string[] = [];
    let result: 'APPROVED' | 'RESTRICTED' | 'PROHIBITED' | 'REQUIRES_LICENSE' = 'APPROVED';

    // Check for embargoed countries
    if (this.restrictedCountries.includes(params.destinationCountry)) {
      result = 'PROHIBITED';
      restrictions.push('Destination country is under trade embargo');
    }

    // Check product category restrictions
    const product = await this.prisma.product.findUnique({
      where: { id: params.productId },
    });

    if (product) {
      const categoryRestrictions = await this.checkCategoryRestrictions(
        product.categoryId,
        params.destinationCountry,
      );

      if (categoryRestrictions.length > 0) {
        result = 'RESTRICTED';
        restrictions.push(...categoryRestrictions);
      }
    }

    // Check HS code restrictions
    if (params.hsCode) {
      const hsRestrictions = await this.checkHSCodeRestrictions(
        params.hsCode,
        params.destinationCountry,
      );

      if (hsRestrictions.length > 0) {
        result = 'RESTRICTED';
        restrictions.push(...hsRestrictions);
      }
    }

    // Check if licenses are required
    if (params.value && params.value > 100000) {
      result = 'REQUIRES_LICENSE';
      licenses.push('EXPORT_LICENSE');
    }

    // Log compliance check
    await this.prisma.complianceCheck.create({
      data: {
        productId: params.productId,
        originCountry: params.originCountry,
        destinationCountry: params.destinationCountry,
        hsCode: params.hsCode,
        result,
        restrictions: restrictions as any,
        licenses: licenses as any,
      },
    });

    return {
      productId: params.productId,
      originCountry: params.originCountry,
      destinationCountry: params.destinationCountry,
      hsCode: params.hsCode,
      result,
      restrictions,
      licenses,
      notes: restrictions.length > 0 ? 'See restrictions list' : 'No restrictions found',
    };
  }

  /**
   * Check entity against sanction lists
   */
  async checkSanctions(params: {
    entityName: string;
    country: string;
    entityType: 'INDIVIDUAL' | 'ORGANIZATION';
  }): Promise<SanctionCheck> {
    this.logger.log(`Checking sanctions for: ${params.entityName} (${params.country})`);

    let result: 'CLEAR' | 'MATCH' | 'POTENTIAL_MATCH' = 'CLEAR';
    const matchedLists: string[] = [];
    let riskScore = 0;

    // Check against sanctioned entities list
    const normalizedName = params.entityName.toUpperCase().replace(/\s+/g, '_');

    if (this.sanctionedEntities.has(normalizedName)) {
      result = 'MATCH';
      matchedLists.push('OFAC_SDN');
      riskScore = 100;
    }

    // Check country risk
    if (this.restrictedCountries.includes(params.country)) {
      riskScore += 50;
      if (result === 'CLEAR') {
        result = 'POTENTIAL_MATCH';
      }
      matchedLists.push('RESTRICTED_COUNTRY');
    }

    // Log sanction check
    await this.prisma.sanctionCheck.create({
      data: {
        entityName: params.entityName,
        country: params.country,
        entityType: params.entityType,
        result,
        matchedLists: matchedLists as any,
        riskScore,
      },
    });

    return {
      entityName: params.entityName,
      country: params.country,
      result,
      matchedLists,
      riskScore,
    };
  }

  /**
   * Get export documentation requirements
   */
  async getExportDocumentation(params: {
    originCountry: string;
    destinationCountry: string;
    productValue: number;
    hsCode?: string;
  }) {
    this.logger.log(
      `Getting export documentation for ${params.originCountry} -> ${params.destinationCountry}`,
    );

    const documents: string[] = [
      'COMMERCIAL_INVOICE',
      'PACKING_LIST',
    ];

    // Customs declaration required for all international shipments
    if (params.originCountry !== params.destinationCountry) {
      documents.push('CUSTOMS_DECLARATION');
    }

    // Certificate of origin for high-value shipments
    if (params.productValue > 10000) {
      documents.push('CERTIFICATE_OF_ORIGIN');
    }

    // Export license for restricted countries
    if (this.restrictedCountries.includes(params.destinationCountry)) {
      documents.push('EXPORT_LICENSE');
    }

    // Additional documentation for specific HS codes
    if (params.hsCode && this.requiresSpecialDocumentation(params.hsCode)) {
      documents.push('SPECIAL_PERMIT');
      documents.push('PRODUCT_CERTIFICATION');
    }

    return {
      originCountry: params.originCountry,
      destinationCountry: params.destinationCountry,
      requiredDocuments: documents,
      estimatedProcessingDays: this.estimateProcessingTime(documents.length),
    };
  }

  /**
   * Validate import/export license
   */
  async validateLicense(licenseNumber: string, country: string) {
    // In production, this would integrate with government databases
    this.logger.log(`Validating license: ${licenseNumber} for ${country}`);

    const license = await this.prisma.tradeLicense.findUnique({
      where: { licenseNumber },
    });

    if (!license) {
      return {
        valid: false,
        reason: 'License not found',
      };
    }

    if (license.country !== country) {
      return {
        valid: false,
        reason: 'License country mismatch',
      };
    }

    if (license.expiryDate && new Date(license.expiryDate) < new Date()) {
      return {
        valid: false,
        reason: 'License expired',
      };
    }

    return {
      valid: true,
      license,
    };
  }

  /**
   * Check category restrictions for destination
   */
  private async checkCategoryRestrictions(
    categoryId: string,
    destinationCountry: string,
  ): Promise<string[]> {
    const restrictions: string[] = [];

    // Check database for category restrictions
    const categoryRestrictions = await this.prisma.categoryRestriction.findMany({
      where: {
        categoryId,
        country: destinationCountry,
      },
    });

    for (const restriction of categoryRestrictions) {
      restrictions.push(restriction.description || 'Category restricted');
    }

    return restrictions;
  }

  /**
   * Check HS code restrictions
   */
  private async checkHSCodeRestrictions(
    hsCode: string,
    destinationCountry: string,
  ): Promise<string[]> {
    const restrictions: string[] = [];

    // In production, integrate with tariff databases
    const hsRestrictions = await this.prisma.hSCodeRestriction.findMany({
      where: {
        hsCode,
        country: destinationCountry,
      },
    });

    for (const restriction of hsRestrictions) {
      restrictions.push(restriction.description || 'HS code restricted');
    }

    return restrictions;
  }

  /**
   * Check if HS code requires special documentation
   */
  private requiresSpecialDocumentation(hsCode: string): boolean {
    // Simplified - in production, check against actual database
    const specialCategories = ['8471', '8528', '9999']; // Electronics, etc.
    return specialCategories.some((cat) => hsCode.startsWith(cat));
  }

  /**
   * Estimate processing time based on document count
   */
  private estimateProcessingTime(documentCount: number): number {
    return Math.max(1, Math.ceil(documentCount / 2));
  }

  /**
   * Get compliance analytics
   */
  async getComplianceAnalytics(params?: {
    startDate?: Date;
    endDate?: Date;
    country?: string;
  }) {
    const where: any = {};

    if (params?.startDate) {
      where.createdAt = { gte: params.startDate };
    }

    if (params?.endDate) {
      where.createdAt = { ...where.createdAt, lte: params.endDate };
    }

    if (params?.country) {
      where.destinationCountry = params.country;
    }

    const total = await this.prisma.complianceCheck.count({ where });
    const approved = await this.prisma.complianceCheck.count({
      where: { ...where, result: 'APPROVED' },
    });
    const restricted = await this.prisma.complianceCheck.count({
      where: { ...where, result: 'RESTRICTED' },
    });
    const prohibited = await this.prisma.complianceCheck.count({
      where: { ...where, result: 'PROHIBITED' },
    });
    const requiresLicense = await this.prisma.complianceCheck.count({
      where: { ...where, result: 'REQUIRES_LICENSE' },
    });

    return {
      total,
      approved,
      restricted,
      prohibited,
      requiresLicense,
      approvalRate: total > 0 ? (approved / total) * 100 : 0,
    };
  }
}
