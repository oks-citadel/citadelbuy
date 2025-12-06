import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface TradeRestriction {
  type: 'EXPORT_CONTROL' | 'IMPORT_RESTRICTION' | 'EMBARGO' | 'DUAL_USE' | 'SANCTIONED_GOODS';
  sourceCountry: string;
  destinationCountry: string;
  productCategory: string;
  hsCode?: string; // Harmonized System Code
  restriction: string;
  authority: string;
  legalReference: string;
  severity: 'PROHIBITED' | 'RESTRICTED' | 'CONTROLLED' | 'PERMITTED';
}

export interface TradeComplianceCheck {
  shipment: {
    id: string;
    exporter: {
      name: string;
      country: string;
      licenseNumber?: string;
    };
    importer: {
      name: string;
      country: string;
      licenseNumber?: string;
    };
    goods: Array<{
      description: string;
      hsCode: string;
      category: string;
      value: number;
      currency: string;
      isDualUse: boolean;
      isControlled: boolean;
    }>;
  };
  result: {
    approved: boolean;
    restrictions: TradeRestriction[];
    requiredLicenses: string[];
    requiredDocuments: string[];
    customsRequirements: string[];
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'PROHIBITED';
    recommendation: string;
  };
  checkedAt: Date;
}

/**
 * Trade Compliance Service
 *
 * Ensures compliance with international trade regulations:
 * - Export controls (EAR, ITAR, Wassenaar Arrangement)
 * - Import restrictions
 * - Customs regulations
 * - HS Code classification
 * - Dual-use goods controls
 * - Country-specific embargoes
 * - Trade agreement compliance (AFCFTA, USMCA, EU, etc.)
 */
@Injectable()
export class TradeComplianceService {
  private readonly logger = new Logger(TradeComplianceService.name);

  // Export control regimes
  private readonly exportControlRegimes = {
    US_EAR: 'Export Administration Regulations',
    US_ITAR: 'International Traffic in Arms Regulations',
    WASSENAAR: 'Wassenaar Arrangement',
    EU_DUAL_USE: 'EU Dual-Use Regulation',
    NSG: 'Nuclear Suppliers Group',
    AG: 'Australia Group',
    MTCR: 'Missile Technology Control Regime',
  };

  // Embargoed countries (sample - update based on current sanctions)
  private readonly embargoedCountries = new Set([
    'KP', // North Korea
    'SY', // Syria
    'IR', // Iran (partial)
    'CU', // Cuba (partial)
  ]);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Check trade compliance for cross-border transaction
   */
  async checkTradeCompliance(shipment: {
    exporterCountry: string;
    importerCountry: string;
    goods: Array<{
      description: string;
      hsCode: string;
      value: number;
      currency: string;
    }>;
  }): Promise<{
    compliant: boolean;
    restrictions: TradeRestriction[];
    requiredDocuments: string[];
    estimatedDuty: number;
  }> {
    this.logger.log(
      `Checking trade compliance: ${shipment.exporterCountry} -> ${shipment.importerCountry}`,
    );

    const restrictions: TradeRestriction[] = [];

    // Check for embargoes
    if (this.embargoedCountries.has(shipment.importerCountry)) {
      restrictions.push({
        type: 'EMBARGO',
        sourceCountry: shipment.exporterCountry,
        destinationCountry: shipment.importerCountry,
        productCategory: 'ALL',
        restriction: 'Full trade embargo in effect',
        authority: 'OFAC/UN Security Council',
        legalReference: 'Executive Order 13722',
        severity: 'PROHIBITED',
      });
    }

    // Check export controls for each product
    for (const good of shipment.goods) {
      const exportRestrictions = await this.checkExportControls(
        good,
        shipment.exporterCountry,
        shipment.importerCountry,
      );
      restrictions.push(...exportRestrictions);
    }

    // Check import restrictions
    const importRestrictions = await this.checkImportRestrictions(
      shipment.goods,
      shipment.importerCountry,
    );
    restrictions.push(...importRestrictions);

    // Determine required documents
    const requiredDocuments = this.getRequiredDocuments(
      shipment.exporterCountry,
      shipment.importerCountry,
      restrictions,
    );

    // Calculate estimated duty
    const estimatedDuty = await this.calculateDuty(
      shipment.goods,
      shipment.importerCountry,
    );

    const compliant =
      !restrictions.some((r) => r.severity === 'PROHIBITED') &&
      restrictions.length === 0;

    return {
      compliant,
      restrictions,
      requiredDocuments,
      estimatedDuty,
    };
  }

  /**
   * Check export controls (EAR, ITAR, dual-use)
   */
  private async checkExportControls(
    good: { description: string; hsCode: string; value: number },
    exporterCountry: string,
    importerCountry: string,
  ): Promise<TradeRestriction[]> {
    const restrictions: TradeRestriction[] = [];

    // Check if item is dual-use
    const isDualUse = await this.isDualUseGood(good.hsCode);

    if (isDualUse) {
      restrictions.push({
        type: 'DUAL_USE',
        sourceCountry: exporterCountry,
        destinationCountry: importerCountry,
        productCategory: good.description,
        hsCode: good.hsCode,
        restriction: 'Dual-use item requires export license',
        authority: 'Bureau of Industry and Security (BIS)',
        legalReference: 'EAR Part 744',
        severity: 'CONTROLLED',
      });
    }

    // Check military/defense items (ITAR)
    const isMilitary = await this.isMilitaryGood(good.hsCode);

    if (isMilitary) {
      restrictions.push({
        type: 'EXPORT_CONTROL',
        sourceCountry: exporterCountry,
        destinationCountry: importerCountry,
        productCategory: good.description,
        hsCode: good.hsCode,
        restriction: 'Defense article requires State Department license',
        authority: 'Directorate of Defense Trade Controls (DDTC)',
        legalReference: 'ITAR 22 CFR 120-130',
        severity: 'CONTROLLED',
      });
    }

    return restrictions;
  }

  /**
   * Check import restrictions for destination country
   */
  private async checkImportRestrictions(
    goods: Array<{ description: string; hsCode: string }>,
    importerCountry: string,
  ): Promise<TradeRestriction[]> {
    const restrictions: TradeRestriction[] = [];

    // Country-specific import restrictions
    const countryRestrictions = this.getCountryImportRestrictions(importerCountry);

    for (const good of goods) {
      const restricted = countryRestrictions.find((r) =>
        this.matchesRestriction(good.hsCode, r.hsCodes),
      );

      if (restricted) {
        restrictions.push({
          type: 'IMPORT_RESTRICTION',
          sourceCountry: 'ANY',
          destinationCountry: importerCountry,
          productCategory: good.description,
          hsCode: good.hsCode,
          restriction: restricted.description,
          authority: restricted.authority,
          legalReference: restricted.reference,
          severity: restricted.severity,
        });
      }
    }

    return restrictions;
  }

  /**
   * Get required trade documents
   */
  private getRequiredDocuments(
    exporterCountry: string,
    importerCountry: string,
    restrictions: TradeRestriction[],
  ): string[] {
    const documents = new Set<string>([
      'Commercial Invoice',
      'Packing List',
      'Bill of Lading / Air Waybill',
    ]);

    // Add certificate of origin
    documents.add('Certificate of Origin');

    // If dual-use or controlled items
    if (restrictions.some((r) => r.type === 'DUAL_USE' || r.type === 'EXPORT_CONTROL')) {
      documents.add('Export License');
      documents.add('End-User Certificate');
    }

    // Region-specific documents
    if (this.isEUCountry(importerCountry)) {
      documents.add('EUR.1 Movement Certificate');
      documents.add('EORI Number');
    }

    if (this.isAFCFTAMember(exporterCountry) && this.isAFCFTAMember(importerCountry)) {
      documents.add('AFCFTA Certificate of Origin');
    }

    if (exporterCountry === 'US' || importerCountry === 'US') {
      documents.add('ISF (Importer Security Filing)');
      documents.add('Automated Export System (AES) Filing');
    }

    // Specific product categories
    if (restrictions.some((r) => r.productCategory.toLowerCase().includes('food'))) {
      documents.add('Health Certificate');
      documents.add('Sanitary Certificate');
    }

    return Array.from(documents);
  }

  /**
   * Calculate import duty
   */
  private async calculateDuty(
    goods: Array<{ hsCode: string; value: number; currency: string }>,
    importerCountry: string,
  ): Promise<number> {
    let totalDuty = 0;

    for (const good of goods) {
      const dutyRate = await this.getDutyRate(good.hsCode, importerCountry);
      const dutyAmount = good.value * (dutyRate / 100);
      totalDuty += dutyAmount;
    }

    return totalDuty;
  }

  /**
   * Get duty rate for HS code in specific country
   */
  private async getDutyRate(hsCode: string, country: string): Promise<number> {
    // In production, integrate with:
    // - WTO Tariff Database
    // - National customs databases
    // - Trade agreement databases (FTA preferential rates)

    // Default duty rates (sample)
    const defaultRates: { [key: string]: number } = {
      US: 3.5,
      EU: 4.0,
      UK: 3.5,
      CA: 3.0,
      NG: 10.0,
      ZA: 8.0,
      KE: 12.0,
    };

    return defaultRates[country] || 5.0;
  }

  /**
   * Check if item is dual-use
   */
  private async isDualUseGood(hsCode: string): Promise<boolean> {
    // In production, check against:
    // - Commerce Control List (CCL)
    // - EU Dual-Use Regulation Annex I
    // - Wassenaar Arrangement Munitions List

    const dualUseCategories = [
      '85', // Electrical machinery (some items)
      '84', // Nuclear reactors, machinery (some items)
      '90', // Optical, photographic, measuring instruments (some items)
    ];

    return dualUseCategories.some((cat) => hsCode.startsWith(cat));
  }

  /**
   * Check if item is military/defense article
   */
  private async isMilitaryGood(hsCode: string): Promise<boolean> {
    // In production, check against:
    // - USML (United States Munitions List)
    // - EU Common Military List

    const militaryCategories = [
      '93', // Arms and ammunition
    ];

    return militaryCategories.some((cat) => hsCode.startsWith(cat));
  }

  /**
   * Get country-specific import restrictions
   */
  private getCountryImportRestrictions(country: string): Array<{
    hsCodes: string[];
    description: string;
    authority: string;
    reference: string;
    severity: 'PROHIBITED' | 'RESTRICTED' | 'CONTROLLED' | 'PERMITTED';
  }> {
    // Sample restrictions - in production, maintain comprehensive database
    const restrictions: { [key: string]: any[] } = {
      SA: [
        // Saudi Arabia
        {
          hsCodes: ['2208'], // Alcoholic beverages
          description: 'Alcohol prohibited',
          authority: 'Saudi Customs',
          reference: 'Saudi Customs Law',
          severity: 'PROHIBITED',
        },
      ],
      AE: [
        // UAE
        {
          hsCodes: ['2208'], // Alcoholic beverages
          description: 'Alcohol requires special license',
          authority: 'UAE Customs',
          reference: 'UAE Federal Law No. 4 of 2002',
          severity: 'RESTRICTED',
        },
      ],
    };

    return restrictions[country] || [];
  }

  /**
   * Check if HS code matches restriction
   */
  private matchesRestriction(hsCode: string, restrictedCodes: string[]): boolean {
    return restrictedCodes.some((code) => hsCode.startsWith(code));
  }

  /**
   * Check if country is EU member
   */
  private isEUCountry(country: string): boolean {
    const euCountries = new Set([
      'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
      'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
      'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
    ]);

    return euCountries.has(country);
  }

  /**
   * Check if country is AFCFTA member
   */
  private isAFCFTAMember(country: string): boolean {
    // African Continental Free Trade Area members
    const afcftaCountries = new Set([
      'DZ', 'AO', 'BJ', 'BW', 'BF', 'BI', 'CM', 'CV', 'CF', 'TD',
      'KM', 'CG', 'CD', 'CI', 'DJ', 'EG', 'GQ', 'ER', 'ET', 'GA',
      'GM', 'GH', 'GN', 'GW', 'KE', 'LS', 'LR', 'LY', 'MG', 'MW',
      'ML', 'MR', 'MU', 'MA', 'MZ', 'NA', 'NE', 'NG', 'RW', 'ST',
      'SN', 'SC', 'SL', 'SO', 'ZA', 'SS', 'SD', 'SZ', 'TZ', 'TG',
      'TN', 'UG', 'ZM', 'ZW',
    ]);

    return afcftaCountries.has(country);
  }

  /**
   * Classify goods using HS code
   */
  async classifyGoods(description: string): Promise<{
    hsCode: string;
    description: string;
    category: string;
    confidence: number;
  }> {
    // In production, use AI-powered HS code classification:
    // - Machine learning models
    // - WCO HS nomenclature database
    // - Customs classification databases

    this.logger.log(`Classifying goods: ${description}`);

    return {
      hsCode: '9999.99.99',
      description: 'Unclassified',
      category: 'Other',
      confidence: 0.5,
    };
  }

  /**
   * Get trade agreement benefits
   */
  async getTradeAgreementBenefits(
    exporterCountry: string,
    importerCountry: string,
  ): Promise<{
    agreement: string;
    benefits: string[];
    dutyReduction: number;
    requiredDocuments: string[];
  } | null> {
    // Check for applicable FTAs
    const fta = this.getFTA(exporterCountry, importerCountry);

    if (!fta) {
      return null;
    }

    return {
      agreement: fta.name,
      benefits: fta.benefits,
      dutyReduction: fta.dutyReduction,
      requiredDocuments: fta.requiredDocuments,
    };
  }

  /**
   * Get Free Trade Agreement between countries
   */
  private getFTA(
    country1: string,
    country2: string,
  ): {
    name: string;
    benefits: string[];
    dutyReduction: number;
    requiredDocuments: string[];
  } | null {
    // AFCFTA
    if (this.isAFCFTAMember(country1) && this.isAFCFTAMember(country2)) {
      return {
        name: 'African Continental Free Trade Area (AFCFTA)',
        benefits: [
          'Preferential tariff rates',
          'Simplified customs procedures',
          'Duty-free access for 90% of goods',
        ],
        dutyReduction: 90,
        requiredDocuments: ['AFCFTA Certificate of Origin'],
      };
    }

    // USMCA (US-Mexico-Canada)
    if (
      ['US', 'CA', 'MX'].includes(country1) &&
      ['US', 'CA', 'MX'].includes(country2)
    ) {
      return {
        name: 'United States-Mexico-Canada Agreement (USMCA)',
        benefits: [
          'Duty-free access for qualifying goods',
          'Rules of origin verification',
          'Enhanced labor and environmental protections',
        ],
        dutyReduction: 100,
        requiredDocuments: ['USMCA Certificate of Origin'],
      };
    }

    return null;
  }
}
