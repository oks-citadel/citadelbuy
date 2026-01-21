import { Injectable, Logger } from '@nestjs/common';

/**
 * US Compliance Service
 *
 * Manages US federal and state compliance requirements:
 * - SOC 2 Type II certification
 * - Federal procurement requirements (SAM.gov, DUNS)
 * - State business licenses
 * - CCPA/CPRA (California)
 * - Industry-specific regulations (HIPAA, PCI-DSS)
 * - Export controls (EAR, ITAR)
 * - FTC compliance for e-commerce
 */
@Injectable()
export class USComplianceService {
  private readonly logger = new Logger(USComplianceService.name);

  /**
   * Verify federal procurement eligibility
   */
  async verifyFederalProcurement(
    vendorId: string,
    samRegistration: boolean,
    dunsNumber?: string,
  ): Promise<{
    eligible: boolean;
    samRegistered: boolean;
    dunsVerified: boolean;
    requirements: string[];
  }> {
    this.logger.log(`Verifying federal procurement eligibility for vendor: ${vendorId}`);

    return {
      eligible: samRegistration && !!dunsNumber,
      samRegistered: samRegistration,
      dunsVerified: !!dunsNumber,
      requirements: [
        'Active SAM.gov registration',
        'DUNS number from Dun & Bradstreet',
        'NAICS code classification',
        'Cage Code (for defense contracts)',
        'Compliance with FAR (Federal Acquisition Regulation)',
      ],
    };
  }

  /**
   * Verify SOC 2 compliance requirements
   */
  async verifySOC2Compliance(): Promise<{
    required: boolean;
    type: 'Type I' | 'Type II';
    trustServiceCriteria: string[];
    auditRequired: boolean;
  }> {
    return {
      required: true,
      type: 'Type II',
      trustServiceCriteria: [
        'Security',
        'Availability',
        'Processing Integrity',
        'Confidentiality',
        'Privacy',
      ],
      auditRequired: true,
    };
  }

  /**
   * Verify CCPA/CPRA compliance
   */
  async verifyCCPACompliance(
    vendorId: string,
    revenueThreshold: number,
  ): Promise<{
    applicable: boolean;
    requirements: string[];
    rightsToImplement: string[];
  }> {
    // CCPA applies to businesses with:
    // - Annual gross revenue > $25M, OR
    // - Processes data of 100,000+ CA consumers, OR
    // - Derives 50%+ revenue from selling personal information

    const applicable = revenueThreshold > 25000000;

    return {
      applicable,
      requirements: [
        'Privacy policy with CCPA disclosures',
        'Do Not Sell My Personal Information link',
        'Respond to consumer rights requests within 45 days',
        'Implement reasonable security measures',
        'Train employees on CCPA compliance',
        'Maintain data inventory and processing records',
      ],
      rightsToImplement: [
        'Right to Know',
        'Right to Delete',
        'Right to Opt-Out of Sale',
        'Right to Non-Discrimination',
        'Right to Correct (CPRA)',
        'Right to Limit Use of Sensitive Information (CPRA)',
      ],
    };
  }

  /**
   * Get state-specific requirements
   */
  getStateRequirements(state: string): {
    businessLicense: boolean;
    salesTaxRegistration: boolean;
    privacyLaws: string[];
    additionalRequirements: string[];
  } {
    const stateRequirements: { [key: string]: any } = {
      CA: {
        businessLicense: true,
        salesTaxRegistration: true,
        privacyLaws: ['CCPA', 'CPRA'],
        additionalRequirements: [
          'California Resale Certificate',
          'Sellers permit from CDTFA',
        ],
      },
      NY: {
        businessLicense: true,
        salesTaxRegistration: true,
        privacyLaws: ['SHIELD Act'],
        additionalRequirements: ['Certificate of Authority', 'Workers Compensation'],
      },
      TX: {
        businessLicense: true,
        salesTaxRegistration: true,
        privacyLaws: [],
        additionalRequirements: ['Texas Sales and Use Tax Permit'],
      },
    };

    return stateRequirements[state] || {
      businessLicense: true,
      salesTaxRegistration: true,
      privacyLaws: [],
      additionalRequirements: [],
    };
  }
}
