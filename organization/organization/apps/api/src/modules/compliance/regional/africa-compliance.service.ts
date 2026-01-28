import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AFCFTACompliance {
  country: string;
  afcftaMember: boolean;
  tradeAgreementCompliance: {
    certificateOfOrigin: boolean;
    customsDeclaration: boolean;
    rulesOfOriginMet: boolean;
  };
  regionalRequirements: {
    ecowasCompliance?: boolean; // West Africa
    eacCompliance?: boolean; // East Africa
    sadcCompliance?: boolean; // Southern Africa
    comesaCompliance?: boolean; // Common Market for Eastern and Southern Africa
  };
}

export interface NigeriaCompliance {
  cacRegistration: boolean; // Corporate Affairs Commission
  firsRegistration: boolean; // Federal Inland Revenue Service
  nafdacRegistration?: boolean; // National Agency for Food and Drug Administration and Control
  ndprCompliance: boolean; // Nigeria Data Protection Regulation
  cbnCompliance?: boolean; // Central Bank of Nigeria (for financial services)
  sonCertification?: boolean; // Standards Organization of Nigeria
}

export interface SouthAfricaCompliance {
  cipcRegistration: boolean; // Companies and Intellectual Property Commission
  sarsTaxClearance: boolean; // South African Revenue Service
  popiaCompliance: boolean; // Protection of Personal Information Act
  beeCertification?: boolean; // Broad-Based Black Economic Empowerment
  nccrCompliance?: boolean; // National Credit Regulator (for credit providers)
}

export interface KenyaCompliance {
  registrationNumber: boolean; // Registrar of Companies
  kraPinNumber: boolean; // Kenya Revenue Authority
  eacCertificate: boolean; // East African Community
  dataProtectionCompliance: boolean; // Kenya Data Protection Act
  nemaApproval?: boolean; // National Environment Management Authority
}

/**
 * Africa Compliance Service
 *
 * Manages compliance requirements across African countries:
 * - AFCFTA (African Continental Free Trade Area) compliance
 * - Regional economic communities (ECOWAS, EAC, SADC, COMESA)
 * - Country-specific regulations (Nigeria, South Africa, Kenya, Egypt, etc.)
 * - Local business registration requirements
 * - Data protection and privacy laws
 * - Tax and customs compliance
 */
@Injectable()
export class AfricaComplianceService {
  private readonly logger = new Logger(AfricaComplianceService.name);

  // AFCFTA member states
  private readonly afcftaMembers = new Set([
    'DZ', 'AO', 'BJ', 'BW', 'BF', 'BI', 'CM', 'CV', 'CF', 'TD',
    'KM', 'CG', 'CD', 'CI', 'DJ', 'EG', 'GQ', 'ER', 'ET', 'GA',
    'GM', 'GH', 'GN', 'GW', 'KE', 'LS', 'LR', 'LY', 'MG', 'MW',
    'ML', 'MR', 'MU', 'MA', 'MZ', 'NA', 'NE', 'NG', 'RW', 'ST',
    'SN', 'SC', 'SL', 'SO', 'ZA', 'SS', 'SD', 'SZ', 'TZ', 'TG',
    'TN', 'UG', 'ZM', 'ZW',
  ]);

  // Regional economic communities
  private readonly regionalBlocs = {
    ECOWAS: new Set(['BJ', 'BF', 'CV', 'CI', 'GM', 'GH', 'GN', 'GW', 'LR', 'ML', 'NE', 'NG', 'SN', 'SL', 'TG']),
    EAC: new Set(['BI', 'KE', 'RW', 'SS', 'TZ', 'UG']),
    SADC: new Set(['AO', 'BW', 'KM', 'CD', 'SZ', 'LS', 'MG', 'MW', 'MU', 'MZ', 'NA', 'SC', 'ZA', 'TZ', 'ZM', 'ZW']),
    COMESA: new Set(['BI', 'KM', 'CD', 'DJ', 'EG', 'ER', 'ET', 'KE', 'LY', 'MG', 'MW', 'MU', 'RW', 'SC', 'SD', 'SZ', 'TN', 'UG', 'ZM', 'ZW']),
  };

  constructor(private readonly configService: ConfigService) {}

  /**
   * Verify AFCFTA compliance
   */
  async verifyAFCFTACompliance(
    vendorCountry: string,
    destinationCountry: string,
    certificateOfOrigin: boolean,
  ): Promise<AFCFTACompliance> {
    this.logger.log(`Verifying AFCFTA compliance: ${vendorCountry} -> ${destinationCountry}`);

    const isMember = this.afcftaMembers.has(vendorCountry);
    const destinationIsMember = this.afcftaMembers.has(destinationCountry);

    return {
      country: vendorCountry,
      afcftaMember: isMember,
      tradeAgreementCompliance: {
        certificateOfOrigin: certificateOfOrigin && isMember && destinationIsMember,
        customsDeclaration: true,
        rulesOfOriginMet: this.checkRulesOfOrigin(vendorCountry),
      },
      regionalRequirements: {
        ecowasCompliance: this.regionalBlocs.ECOWAS.has(vendorCountry),
        eacCompliance: this.regionalBlocs.EAC.has(vendorCountry),
        sadcCompliance: this.regionalBlocs.SADC.has(vendorCountry),
        comesaCompliance: this.regionalBlocs.COMESA.has(vendorCountry),
      },
    };
  }

  /**
   * Verify Nigeria-specific compliance
   */
  async verifyNigeriaCompliance(
    vendorId: string,
    documents: {
      cacCertificate?: string;
      taxClearance?: string;
      nafdacCertificate?: string;
    },
  ): Promise<NigeriaCompliance> {
    this.logger.log(`Verifying Nigeria compliance for vendor: ${vendorId}`);

    // In production, integrate with:
    // - CAC database for business registration
    // - FIRS for tax verification
    // - NAFDAC for product registration
    // - NITDA for data protection compliance

    return {
      cacRegistration: !!documents.cacCertificate,
      firsRegistration: !!documents.taxClearance,
      nafdacRegistration: !!documents.nafdacCertificate,
      ndprCompliance: true, // Verify NDPR compliance
      cbnCompliance: false, // For financial services
      sonCertification: false, // For product standards
    };
  }

  /**
   * Verify South Africa-specific compliance
   */
  async verifySouthAfricaCompliance(
    vendorId: string,
    documents: {
      cipcRegistration?: string;
      taxClearance?: string;
      beeCertificate?: string;
    },
  ): Promise<SouthAfricaCompliance> {
    this.logger.log(`Verifying South Africa compliance for vendor: ${vendorId}`);

    // In production, integrate with:
    // - CIPC database
    // - SARS for tax verification
    // - BBBEE Commission for BEE status
    // - Information Regulator for POPIA compliance

    return {
      cipcRegistration: !!documents.cipcRegistration,
      sarsTaxClearance: !!documents.taxClearance,
      popiaCompliance: true, // Verify POPIA compliance
      beeCertification: !!documents.beeCertificate,
      nccrCompliance: false, // For credit providers
    };
  }

  /**
   * Verify Kenya-specific compliance
   */
  async verifyKenyaCompliance(
    vendorId: string,
    documents: {
      certificateOfIncorporation?: string;
      kraPin?: string;
      eacCertificate?: string;
    },
  ): Promise<KenyaCompliance> {
    this.logger.log(`Verifying Kenya compliance for vendor: ${vendorId}`);

    // In production, integrate with:
    // - Registrar of Companies
    // - Kenya Revenue Authority (KRA)
    // - EAC for trade certificates
    // - Office of the Data Protection Commissioner

    return {
      registrationNumber: !!documents.certificateOfIncorporation,
      kraPinNumber: !!documents.kraPin,
      eacCertificate: !!documents.eacCertificate,
      dataProtectionCompliance: true, // Verify Kenya DPA compliance
      nemaApproval: false, // For environmental compliance
    };
  }

  /**
   * Get country-specific compliance requirements
   */
  getCountryRequirements(countryCode: string): {
    country: string;
    requiredDocuments: string[];
    regulatoryBodies: string[];
    dataProtectionLaw: string;
    regionalBlocs: string[];
  } {
    const countryRequirements: { [key: string]: any } = {
      NG: {
        country: 'Nigeria',
        requiredDocuments: [
          'CAC Certificate of Incorporation',
          'FIRS Tax Clearance Certificate',
          'NAFDAC Registration (for food/drugs)',
          'SON Certification (for products)',
        ],
        regulatoryBodies: ['CAC', 'FIRS', 'NAFDAC', 'SON', 'NITDA'],
        dataProtectionLaw: 'Nigeria Data Protection Regulation (NDPR)',
        regionalBlocs: ['AFCFTA', 'ECOWAS'],
      },
      ZA: {
        country: 'South Africa',
        requiredDocuments: [
          'CIPC Registration Certificate',
          'SARS Tax Clearance',
          'BEE Certificate (optional but recommended)',
          'POPIA Compliance Certificate',
        ],
        regulatoryBodies: ['CIPC', 'SARS', 'BBBEE Commission', 'Information Regulator'],
        dataProtectionLaw: 'Protection of Personal Information Act (POPIA)',
        regionalBlocs: ['AFCFTA', 'SADC'],
      },
      KE: {
        country: 'Kenya',
        requiredDocuments: [
          'Certificate of Incorporation',
          'KRA PIN Certificate',
          'EAC Certificate of Origin',
          'Data Protection Compliance Certificate',
        ],
        regulatoryBodies: ['Registrar of Companies', 'KRA', 'EAC', 'Data Protection Commissioner'],
        dataProtectionLaw: 'Kenya Data Protection Act',
        regionalBlocs: ['AFCFTA', 'EAC', 'COMESA'],
      },
      EG: {
        country: 'Egypt',
        requiredDocuments: [
          'Commercial Registration',
          'Tax Card',
          'Import/Export License',
        ],
        regulatoryBodies: ['GAFI', 'Egyptian Tax Authority', 'COMESA'],
        dataProtectionLaw: 'Egypt Data Protection Law (Draft)',
        regionalBlocs: ['AFCFTA', 'COMESA'],
      },
      GH: {
        country: 'Ghana',
        requiredDocuments: [
          'Certificate of Incorporation',
          'TIN (Tax Identification Number)',
          'Ghana Standards Authority Certificate',
        ],
        regulatoryBodies: ['Registrar General', 'Ghana Revenue Authority', 'GSA'],
        dataProtectionLaw: 'Ghana Data Protection Act',
        regionalBlocs: ['AFCFTA', 'ECOWAS'],
      },
    };

    return countryRequirements[countryCode] || {
      country: 'Unknown',
      requiredDocuments: ['Business Registration', 'Tax Certificate'],
      regulatoryBodies: [],
      dataProtectionLaw: 'To be determined',
      regionalBlocs: ['AFCFTA'],
    };
  }

  /**
   * Check AFCFTA rules of origin
   */
  private checkRulesOfOrigin(country: string): boolean {
    // AFCFTA rules of origin require:
    // - Product must be wholly obtained in member state, OR
    // - Product must have sufficient value addition (30-45%) in member state

    // In production, verify:
    // 1. Product origin documentation
    // 2. Value addition calculations
    // 3. Certificate of origin authentication

    return this.afcftaMembers.has(country);
  }

  /**
   * Calculate AFCFTA tariff benefits
   */
  async calculateAFCFTATariff(
    hsCode: string,
    originCountry: string,
    destinationCountry: string,
  ): Promise<{
    standardTariff: number;
    afcftaTariff: number;
    savings: number;
    category: string;
  }> {
    if (!this.afcftaMembers.has(originCountry) || !this.afcftaMembers.has(destinationCountry)) {
      return {
        standardTariff: 0,
        afcftaTariff: 0,
        savings: 0,
        category: 'Not applicable',
      };
    }

    // AFCFTA tariff liberalization schedule:
    // Category A: 90% of tariff lines - liberalized immediately to 5 years
    // Category B: 7% of tariff lines - liberalized from 5 to 10 years
    // Category C: 3% of tariff lines - sensitive products, longer liberalization

    const standardTariff = 10.0; // Example standard tariff
    const afcftaTariff = 0.0; // Most goods duty-free under AFCFTA

    return {
      standardTariff,
      afcftaTariff,
      savings: standardTariff - afcftaTariff,
      category: 'Category A - Immediate liberalization',
    };
  }

  /**
   * Verify regional bloc membership and benefits
   */
  getRegionalBlocMembership(country: string): {
    afcfta: boolean;
    ecowas: boolean;
    eac: boolean;
    sadc: boolean;
    comesa: boolean;
    benefits: string[];
  } {
    return {
      afcfta: this.afcftaMembers.has(country),
      ecowas: this.regionalBlocs.ECOWAS.has(country),
      eac: this.regionalBlocs.EAC.has(country),
      sadc: this.regionalBlocs.SADC.has(country),
      comesa: this.regionalBlocs.COMESA.has(country),
      benefits: this.getRegionalBenefits(country),
    };
  }

  /**
   * Get regional trade benefits
   */
  private getRegionalBenefits(country: string): string[] {
    const benefits: string[] = [];

    if (this.afcftaMembers.has(country)) {
      benefits.push('AFCFTA: 90% tariff elimination on intra-African trade');
      benefits.push('AFCFTA: Preferential market access to 1.3 billion people');
    }

    if (this.regionalBlocs.ECOWAS.has(country)) {
      benefits.push('ECOWAS: Free movement of goods within West Africa');
      benefits.push('ECOWAS: Common External Tariff (CET)');
    }

    if (this.regionalBlocs.EAC.has(country)) {
      benefits.push('EAC: Customs Union with free internal trade');
      benefits.push('EAC: Common market with free movement of labor and capital');
    }

    if (this.regionalBlocs.SADC.has(country)) {
      benefits.push('SADC: Free Trade Area covering Southern Africa');
      benefits.push('SADC: 85% of intra-SADC trade duty-free');
    }

    if (this.regionalBlocs.COMESA.has(country)) {
      benefits.push('COMESA: Free Trade Area covering Eastern and Southern Africa');
      benefits.push('COMESA: Zero tariffs on qualifying goods');
    }

    return benefits;
  }

  /**
   * Generate Africa compliance report
   */
  async generateComplianceReport(vendorId: string, country: string): Promise<{
    country: string;
    complianceScore: number;
    requirements: any;
    status: 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT';
    missingDocuments: string[];
    recommendations: string[];
  }> {
    const requirements = this.getCountryRequirements(country);

    // In production, check actual vendor documents and compliance status

    return {
      country,
      complianceScore: 75,
      requirements,
      status: 'PARTIAL',
      missingDocuments: [],
      recommendations: [
        'Complete AFCFTA certificate of origin registration',
        'Ensure data protection compliance with local laws',
        'Obtain regional trade certifications',
      ],
    };
  }
}
