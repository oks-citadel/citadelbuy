import { Injectable, Logger } from '@nestjs/common';
import { CertificationType } from './certification.service';

export enum BadgeType {
  VERIFIED_BUSINESS = 'VERIFIED_BUSINESS',
  TRUSTED_SELLER = 'TRUSTED_SELLER',
  TOP_RATED = 'TOP_RATED',
  COMPLIANCE_CERTIFIED = 'COMPLIANCE_CERTIFIED',
  SECURITY_VERIFIED = 'SECURITY_VERIFIED',
  QUALITY_ASSURED = 'QUALITY_ASSURED',
  ECO_FRIENDLY = 'ECO_FRIENDLY',
  FAIR_TRADE = 'FAIR_TRADE',
  HALAL_CERTIFIED = 'HALAL_CERTIFIED',
  ORGANIC_CERTIFIED = 'ORGANIC_CERTIFIED',
}

export interface ComplianceBadge {
  id: string;
  vendorId: string;
  type: BadgeType;
  name: string;
  description: string;
  iconUrl: string;
  color: string;
  earnedDate: Date;
  expiryDate?: Date;
  requirements: string[];
  certifications: CertificationType[];
  displayPriority: number;
}

/**
 * Badge Service
 *
 * Generates and manages compliance badges for vendors:
 * - Visual trust indicators
 * - Certification-based badges
 * - Performance-based badges
 * - Time-based badges (Established Vendor)
 * - Badge display rules and priorities
 */
@Injectable()
export class BadgeService {
  private readonly logger = new Logger(BadgeService.name);

  // Badge definitions
  private readonly badgeDefinitions: Map<BadgeType, Partial<ComplianceBadge>> = new Map([
    [
      BadgeType.VERIFIED_BUSINESS,
      {
        type: BadgeType.VERIFIED_BUSINESS,
        name: 'Verified Business',
        description: 'Business registration and identity verified',
        iconUrl: '/badges/verified-business.svg',
        color: '#4CAF50',
        displayPriority: 100,
      },
    ],
    [
      BadgeType.SECURITY_VERIFIED,
      {
        type: BadgeType.SECURITY_VERIFIED,
        name: 'Security Verified',
        description: 'SOC 2 Type II or ISO 27001 certified',
        iconUrl: '/badges/security-verified.svg',
        color: '#2196F3',
        displayPriority: 90,
        certifications: [CertificationType.SOC2_TYPE_II, CertificationType.ISO_27001],
      },
    ],
    [
      BadgeType.QUALITY_ASSURED,
      {
        type: BadgeType.QUALITY_ASSURED,
        name: 'Quality Assured',
        description: 'ISO 9001 certified quality management',
        iconUrl: '/badges/quality-assured.svg',
        color: '#FF9800',
        displayPriority: 80,
        certifications: [CertificationType.ISO_9001],
      },
    ],
    [
      BadgeType.HALAL_CERTIFIED,
      {
        type: BadgeType.HALAL_CERTIFIED,
        name: 'Halal Certified',
        description: 'Products certified Halal by recognized authority',
        iconUrl: '/badges/halal.svg',
        color: '#8BC34A',
        displayPriority: 70,
        certifications: [CertificationType.HALAL],
      },
    ],
    [
      BadgeType.TOP_RATED,
      {
        type: BadgeType.TOP_RATED,
        name: 'Top Rated',
        description: '4.8+ average rating with 100+ reviews',
        iconUrl: '/badges/top-rated.svg',
        color: '#FFD700',
        displayPriority: 85,
      },
    ],
    [
      BadgeType.TRUSTED_SELLER,
      {
        type: BadgeType.TRUSTED_SELLER,
        name: 'Trusted Seller',
        description: '1000+ successful orders',
        iconUrl: '/badges/trusted-seller.svg',
        color: '#9C27B0',
        displayPriority: 75,
      },
    ],
  ]);

  /**
   * Generate badges for vendor based on certifications and performance
   */
  async generateBadges(
    vendorId: string,
    certifications: CertificationType[],
    metrics: {
      isVerified: boolean;
      totalOrders: number;
      averageRating: number;
      totalReviews: number;
      accountAgeMonths: number;
    },
  ): Promise<ComplianceBadge[]> {
    this.logger.log(`Generating badges for vendor: ${vendorId}`);

    const badges: ComplianceBadge[] = [];
    const now = new Date();

    // Verified Business badge
    if (metrics.isVerified) {
      badges.push(this.createBadge(vendorId, BadgeType.VERIFIED_BUSINESS, now));
    }

    // Security Verified badge
    if (
      certifications.includes(CertificationType.SOC2_TYPE_II) ||
      certifications.includes(CertificationType.ISO_27001)
    ) {
      badges.push(this.createBadge(vendorId, BadgeType.SECURITY_VERIFIED, now));
    }

    // Quality Assured badge
    if (certifications.includes(CertificationType.ISO_9001)) {
      badges.push(this.createBadge(vendorId, BadgeType.QUALITY_ASSURED, now));
    }

    // Halal Certified badge
    if (certifications.includes(CertificationType.HALAL)) {
      badges.push(this.createBadge(vendorId, BadgeType.HALAL_CERTIFIED, now));
    }

    // Top Rated badge (performance-based)
    if (metrics.averageRating >= 4.8 && metrics.totalReviews >= 100) {
      badges.push(this.createBadge(vendorId, BadgeType.TOP_RATED, now));
    }

    // Trusted Seller badge (order-based)
    if (metrics.totalOrders >= 1000) {
      badges.push(this.createBadge(vendorId, BadgeType.TRUSTED_SELLER, now));
    }

    // Sort by display priority
    badges.sort((a, b) => b.displayPriority - a.displayPriority);

    return badges;
  }

  /**
   * Create badge instance
   */
  private createBadge(
    vendorId: string,
    type: BadgeType,
    earnedDate: Date,
  ): ComplianceBadge {
    const definition = this.badgeDefinitions.get(type)!;

    return {
      id: `badge_${vendorId}_${type}_${Date.now()}`,
      vendorId,
      type,
      name: definition.name!,
      description: definition.description!,
      iconUrl: definition.iconUrl!,
      color: definition.color!,
      earnedDate,
      expiryDate: undefined, // Most badges don't expire
      requirements: definition.requirements || [],
      certifications: definition.certifications || [],
      displayPriority: definition.displayPriority!,
    };
  }

  /**
   * Get badge eligibility status
   */
  async checkBadgeEligibility(
    vendorId: string,
    badgeType: BadgeType,
    certifications: CertificationType[],
    metrics: any,
  ): Promise<{
    eligible: boolean;
    missingRequirements: string[];
  }> {
    const definition = this.badgeDefinitions.get(badgeType);

    if (!definition) {
      return {
        eligible: false,
        missingRequirements: ['Badge type not found'],
      };
    }

    const missing: string[] = [];

    // Check certification requirements
    if (definition.certifications && definition.certifications.length > 0) {
      const hasRequired = definition.certifications.some((cert) =>
        certifications.includes(cert),
      );

      if (!hasRequired) {
        missing.push(
          `Required certification: ${definition.certifications.join(' or ')}`,
        );
      }
    }

    // Check performance requirements
    if (badgeType === BadgeType.TOP_RATED) {
      if (metrics.averageRating < 4.8) {
        missing.push('Need 4.8+ average rating');
      }
      if (metrics.totalReviews < 100) {
        missing.push('Need 100+ reviews');
      }
    }

    if (badgeType === BadgeType.TRUSTED_SELLER) {
      if (metrics.totalOrders < 1000) {
        missing.push('Need 1000+ successful orders');
      }
    }

    return {
      eligible: missing.length === 0,
      missingRequirements: missing,
    };
  }

  /**
   * Get badge SVG for display
   */
  generateBadgeSVG(badge: ComplianceBadge): string {
    // In production, generate actual SVG or return URL to pre-designed badge
    return `<svg>Badge: ${badge.name}</svg>`;
  }

  /**
   * Get all available badges with requirements
   */
  getAllBadgeTypes(): Array<{
    type: BadgeType;
    name: string;
    description: string;
    requirements: string[];
  }> {
    const badges: Array<{
      type: BadgeType;
      name: string;
      description: string;
      requirements: string[];
    }> = [];

    this.badgeDefinitions.forEach((definition, type) => {
      badges.push({
        type,
        name: definition.name!,
        description: definition.description!,
        requirements: definition.requirements || [],
      });
    });

    return badges;
  }
}
