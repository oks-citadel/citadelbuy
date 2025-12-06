import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export enum DataClassification {
  PUBLIC = 'PUBLIC',
  INTERNAL = 'INTERNAL',
  CONFIDENTIAL = 'CONFIDENTIAL',
  RESTRICTED = 'RESTRICTED',
  PII = 'PERSONALLY_IDENTIFIABLE_INFORMATION',
  FINANCIAL = 'FINANCIAL_DATA',
  HEALTH = 'HEALTH_DATA',
}

export interface DataResidencyRequirement {
  region: string;
  country: string;
  regulation: string;
  requirements: {
    localStorageRequired: boolean;
    allowedRegions: string[];
    prohibitedRegions: string[];
    encryptionRequired: boolean;
    dataLocalizationRequired: boolean;
    crossBorderTransferRestrictions: string[];
  };
  dataTypes: DataClassification[];
  penalties: {
    violation: string;
    maximumFine: string;
    legalReference: string;
  };
}

export interface DataStorageLocation {
  id: string;
  region: string;
  country: string;
  provider: string;
  dataCenter: string;
  certifications: string[];
  compliance: string[];
}

export interface DataResidencyPolicy {
  userId: string;
  userRegion: string;
  userCountry: string;
  dataClassifications: DataClassification[];
  storageLocations: DataStorageLocation[];
  crossBorderTransfers: Array<{
    fromRegion: string;
    toRegion: string;
    dataType: DataClassification;
    mechanism: string; // SCC, BCR, Adequacy Decision
    approved: boolean;
  }>;
  complianceStatus: {
    gdpr: boolean;
    ccpa: boolean;
    regionalCompliance: Map<string, boolean>;
  };
}

/**
 * Data Residency Service
 *
 * Manages data storage location compliance for different regions:
 * - GDPR (Europe) - Data must stay within EU/EEA
 * - CCPA/CPRA (California) - Privacy rights and data restrictions
 * - LGPD (Brazil) - Local data storage requirements
 * - PDPA (Singapore) - Cross-border transfer restrictions
 * - POPIA (South Africa) - Data protection requirements
 * - Data Localization Laws (Russia, China, India, etc.)
 *
 * Ensures compliance with:
 * - Local data storage requirements
 * - Cross-border data transfer regulations
 * - Data sovereignty laws
 * - Industry-specific regulations (financial, healthcare)
 */
@Injectable()
export class DataResidencyService {
  private readonly logger = new Logger(DataResidencyService.name);

  // Regional data residency requirements
  private readonly residencyRequirements: Map<string, DataResidencyRequirement[]> = new Map([
    [
      'EU',
      [
        {
          region: 'European Union',
          country: 'EU',
          regulation: 'General Data Protection Regulation (GDPR)',
          requirements: {
            localStorageRequired: false,
            allowedRegions: ['EU', 'EEA', 'UK', 'Adequacy Countries'],
            prohibitedRegions: [],
            encryptionRequired: true,
            dataLocalizationRequired: false,
            crossBorderTransferRestrictions: [
              'Standard Contractual Clauses (SCC) required for non-adequate countries',
              'Binding Corporate Rules (BCR) for intra-group transfers',
              'EU-US Data Privacy Framework for US transfers',
            ],
          },
          dataTypes: [DataClassification.PII, DataClassification.FINANCIAL, DataClassification.HEALTH],
          penalties: {
            violation: 'Administrative fine',
            maximumFine: '€20 million or 4% of global annual turnover',
            legalReference: 'GDPR Article 83',
          },
        },
      ],
    ],
    [
      'US',
      [
        {
          region: 'California',
          country: 'US',
          regulation: 'California Consumer Privacy Act (CCPA/CPRA)',
          requirements: {
            localStorageRequired: false,
            allowedRegions: ['US', 'Global'],
            prohibitedRegions: [],
            encryptionRequired: true,
            dataLocalizationRequired: false,
            crossBorderTransferRestrictions: [
              'Disclosure of international data transfers required',
              'Consumer right to know data storage locations',
            ],
          },
          dataTypes: [DataClassification.PII, DataClassification.FINANCIAL],
          penalties: {
            violation: 'Civil penalty',
            maximumFine: '$7,500 per intentional violation',
            legalReference: 'CCPA Section 1798.155',
          },
        },
      ],
    ],
    [
      'AFRICA',
      [
        {
          region: 'South Africa',
          country: 'ZA',
          regulation: 'Protection of Personal Information Act (POPIA)',
          requirements: {
            localStorageRequired: false,
            allowedRegions: ['ZA', 'Adequate Countries'],
            prohibitedRegions: [],
            encryptionRequired: true,
            dataLocalizationRequired: false,
            crossBorderTransferRestrictions: [
              'Transfer only to countries with adequate protection',
              'Data subject consent required for transfers',
            ],
          },
          dataTypes: [DataClassification.PII],
          penalties: {
            violation: 'Fine or imprisonment',
            maximumFine: 'R10 million or 10 years imprisonment',
            legalReference: 'POPIA Section 107',
          },
        },
        {
          region: 'Nigeria',
          country: 'NG',
          regulation: 'Nigeria Data Protection Regulation (NDPR)',
          requirements: {
            localStorageRequired: true,
            allowedRegions: ['NG'],
            prohibitedRegions: [],
            encryptionRequired: true,
            dataLocalizationRequired: true,
            crossBorderTransferRestrictions: [
              'Primary data storage must be in Nigeria',
              'Cross-border transfers require approval',
            ],
          },
          dataTypes: [DataClassification.PII, DataClassification.FINANCIAL],
          penalties: {
            violation: 'Fine',
            maximumFine: '2% of annual gross revenue or ₦10 million',
            legalReference: 'NDPR Article 2.11',
          },
        },
      ],
    ],
    [
      'ASIA',
      [
        {
          region: 'Singapore',
          country: 'SG',
          regulation: 'Personal Data Protection Act (PDPA)',
          requirements: {
            localStorageRequired: false,
            allowedRegions: ['SG', 'Global'],
            prohibitedRegions: [],
            encryptionRequired: true,
            dataLocalizationRequired: false,
            crossBorderTransferRestrictions: [
              'Ensure comparable protection in destination country',
              'Obtain consent for transfers to countries without adequate protection',
            ],
          },
          dataTypes: [DataClassification.PII],
          penalties: {
            violation: 'Financial penalty',
            maximumFine: 'S$1 million',
            legalReference: 'PDPA Section 48J',
          },
        },
        {
          region: 'China',
          country: 'CN',
          regulation: 'Personal Information Protection Law (PIPL)',
          requirements: {
            localStorageRequired: true,
            allowedRegions: ['CN'],
            prohibitedRegions: [],
            encryptionRequired: true,
            dataLocalizationRequired: true,
            crossBorderTransferRestrictions: [
              'Critical information infrastructure data must stay in China',
              'Security assessment required for cross-border transfers',
              'Standard contracts or certification required',
            ],
          },
          dataTypes: [DataClassification.PII, DataClassification.FINANCIAL],
          penalties: {
            violation: 'Fine and business suspension',
            maximumFine: '¥50 million or 5% of annual revenue',
            legalReference: 'PIPL Article 66',
          },
        },
      ],
    ],
    [
      'RUSSIA',
      [
        {
          region: 'Russian Federation',
          country: 'RU',
          regulation: 'Federal Law 242-FZ (Data Localization Law)',
          requirements: {
            localStorageRequired: true,
            allowedRegions: ['RU'],
            prohibitedRegions: [],
            encryptionRequired: true,
            dataLocalizationRequired: true,
            crossBorderTransferRestrictions: [
              'Personal data of Russian citizens must be stored on servers in Russia',
              'Primary database must be located in Russia',
            ],
          },
          dataTypes: [DataClassification.PII],
          penalties: {
            violation: 'Fine and service blocking',
            maximumFine: '₽6 million and website blocking',
            legalReference: 'Federal Law 242-FZ',
          },
        },
      ],
    ],
  ]);

  // Data storage locations (multi-region infrastructure)
  private readonly storageLocations: DataStorageLocation[] = [
    {
      id: 'eu-west-1',
      region: 'Europe',
      country: 'Ireland',
      provider: 'AWS',
      dataCenter: 'eu-west-1',
      certifications: ['ISO 27001', 'SOC 2 Type II', 'GDPR Compliant'],
      compliance: ['GDPR', 'eIDAS'],
    },
    {
      id: 'us-east-1',
      region: 'North America',
      country: 'United States',
      provider: 'AWS',
      dataCenter: 'us-east-1',
      certifications: ['ISO 27001', 'SOC 2 Type II', 'HIPAA'],
      compliance: ['CCPA', 'HIPAA', 'SOC 2'],
    },
    {
      id: 'af-south-1',
      region: 'Africa',
      country: 'South Africa',
      provider: 'AWS',
      dataCenter: 'af-south-1',
      certifications: ['ISO 27001', 'SOC 2 Type II'],
      compliance: ['POPIA'],
    },
    {
      id: 'me-south-1',
      region: 'Middle East',
      country: 'UAE',
      provider: 'AWS',
      dataCenter: 'me-south-1',
      certifications: ['ISO 27001', 'SOC 2 Type II'],
      compliance: ['UAE Data Protection Law'],
    },
    {
      id: 'ap-southeast-1',
      region: 'Asia Pacific',
      country: 'Singapore',
      provider: 'AWS',
      dataCenter: 'ap-southeast-1',
      certifications: ['ISO 27001', 'SOC 2 Type II', 'MTCS Tier 3'],
      compliance: ['PDPA'],
    },
  ];

  constructor(private readonly configService: ConfigService) {}

  /**
   * Get data residency requirements for region/country
   */
  getResidencyRequirements(region: string, country?: string): DataResidencyRequirement[] {
    const requirements = this.residencyRequirements.get(region) || [];

    if (country) {
      return requirements.filter((req) => req.country === country);
    }

    return requirements;
  }

  /**
   * Determine appropriate storage location for user data
   */
  async determineStorageLocation(
    userCountry: string,
    dataClassification: DataClassification,
  ): Promise<DataStorageLocation[]> {
    this.logger.log(`Determining storage location for ${userCountry} - ${dataClassification}`);

    const region = this.getRegionFromCountry(userCountry);
    const requirements = this.getResidencyRequirements(region, userCountry);

    // If no specific requirements, use default location
    if (requirements.length === 0) {
      return [this.getDefaultStorageLocation(region)];
    }

    const suitableLocations: DataStorageLocation[] = [];

    for (const req of requirements) {
      if (req.dataTypes.includes(dataClassification)) {
        // Find storage locations in allowed regions
        for (const location of this.storageLocations) {
          if (req.requirements.localStorageRequired) {
            // Must be in same country
            if (location.country === userCountry) {
              suitableLocations.push(location);
            }
          } else if (req.requirements.allowedRegions.includes(location.region)) {
            suitableLocations.push(location);
          }
        }
      }
    }

    return suitableLocations.length > 0
      ? suitableLocations
      : [this.getDefaultStorageLocation(region)];
  }

  /**
   * Validate cross-border data transfer
   */
  async validateCrossBorderTransfer(
    sourceCountry: string,
    destinationCountry: string,
    dataClassification: DataClassification,
  ): Promise<{
    allowed: boolean;
    mechanism: string;
    requirements: string[];
    risks: string[];
  }> {
    this.logger.log(
      `Validating cross-border transfer: ${sourceCountry} -> ${destinationCountry}`,
    );

    const sourceRegion = this.getRegionFromCountry(sourceCountry);
    const requirements = this.getResidencyRequirements(sourceRegion, sourceCountry);

    if (requirements.length === 0) {
      return {
        allowed: true,
        mechanism: 'No specific restrictions',
        requirements: [],
        risks: [],
      };
    }

    const applicableReq = requirements.find((req) =>
      req.dataTypes.includes(dataClassification),
    );

    if (!applicableReq) {
      return {
        allowed: true,
        mechanism: 'Not regulated for this data type',
        requirements: [],
        risks: [],
      };
    }

    // Check if destination is in allowed regions
    const destRegion = this.getRegionFromCountry(destinationCountry);
    const allowed = applicableReq.requirements.allowedRegions.includes(destRegion);

    // Determine transfer mechanism
    let mechanism = 'Standard Contractual Clauses (SCC)';
    const requirements: string[] = [];

    if (sourceRegion === 'EU') {
      if (this.isAdequacyCountry(destinationCountry)) {
        mechanism = 'EU Adequacy Decision';
      } else {
        mechanism = 'Standard Contractual Clauses (SCC)';
        requirements.push('Execute SCC with data importer');
        requirements.push('Conduct Transfer Impact Assessment');
        requirements.push('Document the transfer in Records of Processing Activities');
      }
    }

    if (applicableReq.requirements.dataLocalizationRequired) {
      return {
        allowed: false,
        mechanism: 'PROHIBITED',
        requirements: ['Data must remain in ' + sourceCountry],
        risks: [
          'Violation of data localization law',
          applicableReq.penalties.violation,
        ],
      };
    }

    return {
      allowed,
      mechanism,
      requirements: [
        ...requirements,
        ...applicableReq.requirements.crossBorderTransferRestrictions,
      ],
      risks: allowed ? [] : ['Regulatory non-compliance', 'Potential penalties'],
    };
  }

  /**
   * Create data residency policy for user
   */
  async createDataResidencyPolicy(
    userId: string,
    userCountry: string,
  ): Promise<DataResidencyPolicy> {
    const region = this.getRegionFromCountry(userCountry);

    // Determine storage locations for different data types
    const piiLocations = await this.determineStorageLocation(
      userCountry,
      DataClassification.PII,
    );
    const financialLocations = await this.determineStorageLocation(
      userCountry,
      DataClassification.FINANCIAL,
    );

    const policy: DataResidencyPolicy = {
      userId,
      userRegion: region,
      userCountry,
      dataClassifications: [
        DataClassification.PII,
        DataClassification.FINANCIAL,
        DataClassification.INTERNAL,
      ],
      storageLocations: [...new Set([...piiLocations, ...financialLocations])],
      crossBorderTransfers: [],
      complianceStatus: {
        gdpr: region === 'EU',
        ccpa: userCountry === 'US',
        regionalCompliance: new Map([
          ['POPIA', userCountry === 'ZA'],
          ['PDPA', userCountry === 'SG'],
          ['NDPR', userCountry === 'NG'],
        ]),
      },
    };

    return policy;
  }

  /**
   * Get region from country code
   */
  private getRegionFromCountry(countryCode: string): string {
    const euCountries = new Set([
      'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
      'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
      'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
    ]);

    const africanCountries = new Set([
      'DZ', 'AO', 'BJ', 'BW', 'BF', 'BI', 'CM', 'CV', 'CF', 'TD',
      'KM', 'CG', 'CD', 'CI', 'DJ', 'EG', 'GQ', 'ER', 'ET', 'GA',
      'GM', 'GH', 'GN', 'GW', 'KE', 'LS', 'LR', 'LY', 'MG', 'MW',
      'ML', 'MR', 'MU', 'MA', 'MZ', 'NA', 'NE', 'NG', 'RW', 'ST',
      'SN', 'SC', 'SL', 'SO', 'ZA', 'SS', 'SD', 'SZ', 'TZ', 'TG',
      'TN', 'UG', 'ZM', 'ZW',
    ]);

    const asianCountries = new Set([
      'AF', 'AM', 'AZ', 'BH', 'BD', 'BT', 'BN', 'KH', 'CN', 'GE',
      'HK', 'IN', 'ID', 'IR', 'IQ', 'IL', 'JP', 'JO', 'KZ', 'KW',
      'KG', 'LA', 'LB', 'MO', 'MY', 'MV', 'MN', 'MM', 'NP', 'KP',
      'OM', 'PK', 'PS', 'PH', 'QA', 'SA', 'SG', 'KR', 'LK', 'SY',
      'TW', 'TJ', 'TH', 'TL', 'TR', 'TM', 'AE', 'UZ', 'VN', 'YE',
    ]);

    if (euCountries.has(countryCode) || countryCode === 'UK') return 'EU';
    if (africanCountries.has(countryCode)) return 'AFRICA';
    if (asianCountries.has(countryCode)) return 'ASIA';
    if (countryCode === 'RU') return 'RUSSIA';
    if (['US', 'CA', 'MX'].includes(countryCode)) return 'US';

    return 'GLOBAL';
  }

  /**
   * Check if country has EU adequacy decision
   */
  private isAdequacyCountry(countryCode: string): boolean {
    const adequacyCountries = new Set([
      'AD', 'AR', 'CA', 'FO', 'GG', 'IL', 'IM', 'JP', 'JE', 'NZ',
      'CH', 'UK', 'UY', 'KR',
    ]);

    return adequacyCountries.has(countryCode);
  }

  /**
   * Get default storage location for region
   */
  private getDefaultStorageLocation(region: string): DataStorageLocation {
    const regionMap: { [key: string]: string } = {
      EU: 'eu-west-1',
      US: 'us-east-1',
      AFRICA: 'af-south-1',
      ASIA: 'ap-southeast-1',
      RUSSIA: 'eu-west-1', // Needs Russia-specific datacenter in production
    };

    const locationId = regionMap[region] || 'us-east-1';
    return this.storageLocations.find((loc) => loc.id === locationId)!;
  }

  /**
   * Get all available storage locations
   */
  getStorageLocations(): DataStorageLocation[] {
    return this.storageLocations;
  }

  /**
   * Audit data storage compliance
   */
  async auditDataStorageCompliance(userId: string): Promise<{
    compliant: boolean;
    violations: string[];
    recommendations: string[];
  }> {
    this.logger.log(`Auditing data storage compliance for user: ${userId}`);

    // In production:
    // 1. Retrieve user's country and data classification
    // 2. Check actual storage locations of user data
    // 3. Verify against residency requirements
    // 4. Identify any violations
    // 5. Generate compliance report

    return {
      compliant: true,
      violations: [],
      recommendations: [],
    };
  }
}
