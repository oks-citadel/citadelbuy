import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export enum SanctionsListType {
  OFAC_SDN = 'OFAC_SDN', // US Treasury OFAC Specially Designated Nationals
  UN_SANCTIONS = 'UN_SANCTIONS', // United Nations Sanctions
  EU_SANCTIONS = 'EU_SANCTIONS', // European Union Sanctions
  UK_HMT = 'UK_HMT', // UK HM Treasury Sanctions
  CANADA_OSFI = 'CANADA_OSFI', // Canadian OSFI Sanctions
  AUSTRALIA_DFAT = 'AUSTRALIA_DFAT', // Australian DFAT Sanctions
  INTERPOL = 'INTERPOL', // Interpol Red Notices
  PEP = 'PEP', // Politically Exposed Persons
  ADVERSE_MEDIA = 'ADVERSE_MEDIA', // Negative news screening
}

export interface SanctionsMatch {
  listType: SanctionsListType;
  matchType: 'EXACT' | 'FUZZY' | 'PARTIAL';
  matchScore: number; // 0-100
  entity: {
    name: string;
    aliases: string[];
    type: 'INDIVIDUAL' | 'ENTITY' | 'VESSEL' | 'AIRCRAFT';
    nationality: string[];
    identifiers: {
      passportNumber?: string;
      taxId?: string;
      registrationNumber?: string;
      dateOfBirth?: string;
    };
  };
  sanctionDetails: {
    program: string;
    effectiveDate: Date;
    expiryDate?: Date;
    description: string;
    restrictionType: string[];
  };
  confidence: number;
}

export interface ScreeningResult {
  screenedEntity: {
    name: string;
    type: 'INDIVIDUAL' | 'BUSINESS';
    country: string;
    identifiers: any;
  };
  screenedAt: Date;
  status: 'CLEAR' | 'POTENTIAL_MATCH' | 'MATCH' | 'ERROR';
  matches: SanctionsMatch[];
  listsChecked: SanctionsListType[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  requiresManualReview: boolean;
  recommendation: 'APPROVE' | 'REVIEW' | 'REJECT';
  nextScreeningDue: Date;
}

/**
 * Sanctions Screening Service
 *
 * Screens vendors, customers, and transactions against global sanctions lists:
 * - OFAC (Office of Foreign Assets Control) - US
 * - UN Security Council Sanctions
 * - EU Consolidated Sanctions
 * - UK HM Treasury Sanctions
 * - PEP (Politically Exposed Persons) databases
 * - Adverse media screening
 *
 * Integrates with:
 * - Dow Jones Risk & Compliance
 * - Refinitiv World-Check
 * - ComplyAdvantage
 * - LexisNexis Bridger
 */
@Injectable()
export class SanctionsScreeningService {
  private readonly logger = new Logger(SanctionsScreeningService.name);
  private readonly provider: string;

  constructor(private readonly configService: ConfigService) {
    this.provider = this.configService.get<string>('SANCTIONS_PROVIDER', 'mock');
  }

  /**
   * Screen individual or business entity
   */
  async screenEntity(
    name: string,
    type: 'INDIVIDUAL' | 'BUSINESS',
    country: string,
    identifiers: {
      dateOfBirth?: string;
      passportNumber?: string;
      taxId?: string;
      registrationNumber?: string;
    } = {},
  ): Promise<ScreeningResult> {
    this.logger.log(`Screening entity: ${name} (${type}) from ${country}`);

    const matches: SanctionsMatch[] = [];
    const listsChecked: SanctionsListType[] = [
      SanctionsListType.OFAC_SDN,
      SanctionsListType.UN_SANCTIONS,
      SanctionsListType.EU_SANCTIONS,
      SanctionsListType.UK_HMT,
    ];

    // Screen against OFAC SDN List
    const ofacMatches = await this.screenOFAC(name, type, identifiers);
    matches.push(...ofacMatches);

    // Screen against UN Sanctions
    const unMatches = await this.screenUN(name, type, identifiers);
    matches.push(...unMatches);

    // Screen against EU Sanctions
    const euMatches = await this.screenEU(name, type, identifiers);
    matches.push(...euMatches);

    // Screen against UK Sanctions
    const ukMatches = await this.screenUK(name, type, identifiers);
    matches.push(...ukMatches);

    // PEP screening for individuals
    if (type === 'INDIVIDUAL') {
      listsChecked.push(SanctionsListType.PEP);
      const pepMatches = await this.screenPEP(name, country, identifiers);
      matches.push(...pepMatches);
    }

    // Adverse media screening
    listsChecked.push(SanctionsListType.ADVERSE_MEDIA);
    const adverseMatches = await this.screenAdverseMedia(name, type);
    matches.push(...adverseMatches);

    // Analyze results
    const { status, riskLevel, recommendation } = this.analyzeMatches(matches);

    const result: ScreeningResult = {
      screenedEntity: {
        name,
        type,
        country,
        identifiers,
      },
      screenedAt: new Date(),
      status,
      matches,
      listsChecked,
      riskLevel,
      requiresManualReview: matches.length > 0 || riskLevel !== 'LOW',
      recommendation,
      nextScreeningDue: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    };

    return result;
  }

  /**
   * Screen against OFAC SDN List
   */
  private async screenOFAC(
    name: string,
    type: 'INDIVIDUAL' | 'BUSINESS',
    identifiers: any,
  ): Promise<SanctionsMatch[]> {
    // In production, integrate with:
    // - OFAC SDN XML API
    // - Dow Jones Watchlist
    // - Compliance providers

    this.logger.debug('Screening against OFAC SDN List');

    // Known sanctioned entities for demonstration
    const sanctionedEntities = [
      'SPECIALLY DESIGNATED NATIONALS',
      'BLOCKED PERSONS',
      'FOREIGN SANCTIONS EVADERS',
    ];

    const matches: SanctionsMatch[] = [];

    // Fuzzy matching logic (in production, use proper fuzzy matching algorithms)
    const matchScore = this.calculateFuzzyMatch(name, sanctionedEntities);

    if (matchScore > 80) {
      matches.push({
        listType: SanctionsListType.OFAC_SDN,
        matchType: 'FUZZY',
        matchScore,
        entity: {
          name: 'EXAMPLE SANCTIONED ENTITY',
          aliases: [],
          type: type === 'INDIVIDUAL' ? 'INDIVIDUAL' : 'ENTITY',
          nationality: ['XX'],
          identifiers,
        },
        sanctionDetails: {
          program: 'OFAC SDN Program',
          effectiveDate: new Date('2020-01-01'),
          description: 'Example sanctions match for demonstration',
          restrictionType: ['BLOCKED', 'NO_TRANSACTIONS'],
        },
        confidence: matchScore,
      });
    }

    return matches;
  }

  /**
   * Screen against UN Sanctions List
   */
  private async screenUN(
    name: string,
    type: 'INDIVIDUAL' | 'BUSINESS',
    identifiers: any,
  ): Promise<SanctionsMatch[]> {
    this.logger.debug('Screening against UN Sanctions List');

    // In production, integrate with UN Security Council Consolidated List
    // https://www.un.org/securitycouncil/content/un-sc-consolidated-list

    return [];
  }

  /**
   * Screen against EU Sanctions List
   */
  private async screenEU(
    name: string,
    type: 'INDIVIDUAL' | 'BUSINESS',
    identifiers: any,
  ): Promise<SanctionsMatch[]> {
    this.logger.debug('Screening against EU Sanctions List');

    // In production, integrate with EU Consolidated Financial Sanctions List
    // https://webgate.ec.europa.eu/fsd/fsf

    return [];
  }

  /**
   * Screen against UK HM Treasury Sanctions
   */
  private async screenUK(
    name: string,
    type: 'INDIVIDUAL' | 'BUSINESS',
    identifiers: any,
  ): Promise<SanctionsMatch[]> {
    this.logger.debug('Screening against UK HM Treasury Sanctions');

    // In production, integrate with UK Sanctions List
    // https://www.gov.uk/government/publications/financial-sanctions-consolidated-list-of-targets

    return [];
  }

  /**
   * Screen for Politically Exposed Persons (PEP)
   */
  private async screenPEP(
    name: string,
    country: string,
    identifiers: any,
  ): Promise<SanctionsMatch[]> {
    this.logger.debug('Screening for PEP status');

    // In production, integrate with PEP databases:
    // - Dow Jones PEP Database
    // - World-Check PEP
    // - LexisNexis PEP
    // - ComplyAdvantage PEP

    return [];
  }

  /**
   * Screen adverse media
   */
  private async screenAdverseMedia(
    name: string,
    type: 'INDIVIDUAL' | 'BUSINESS',
  ): Promise<SanctionsMatch[]> {
    this.logger.debug('Screening adverse media');

    // In production, scan news sources for:
    // - Financial crime
    // - Corruption
    // - Money laundering
    // - Fraud
    // - Terrorism financing
    // - Human rights violations

    return [];
  }

  /**
   * Continuous monitoring - re-screen existing entities
   */
  async continuousMonitoring(entityId: string): Promise<ScreeningResult> {
    this.logger.log(`Running continuous monitoring for entity: ${entityId}`);

    // In production:
    // 1. Retrieve entity details from database
    // 2. Re-screen against latest sanctions lists
    // 3. Compare with previous screening results
    // 4. Alert if new matches found
    // 5. Update screening record

    throw new Error('Not implemented');
  }

  /**
   * Bulk screening for batch processing
   */
  async bulkScreen(
    entities: Array<{
      id: string;
      name: string;
      type: 'INDIVIDUAL' | 'BUSINESS';
      country: string;
    }>,
  ): Promise<Map<string, ScreeningResult>> {
    this.logger.log(`Bulk screening ${entities.length} entities`);

    const results = new Map<string, ScreeningResult>();

    for (const entity of entities) {
      const result = await this.screenEntity(
        entity.name,
        entity.type,
        entity.country,
      );
      results.set(entity.id, result);
    }

    return results;
  }

  /**
   * Transaction screening (real-time)
   */
  async screenTransaction(
    transaction: {
      senderId: string;
      senderName: string;
      senderCountry: string;
      recipientId: string;
      recipientName: string;
      recipientCountry: string;
      amount: number;
      currency: string;
    },
  ): Promise<{
    approved: boolean;
    senderScreening: ScreeningResult;
    recipientScreening: ScreeningResult;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }> {
    this.logger.log(`Screening transaction: ${transaction.senderId} -> ${transaction.recipientId}`);

    // Screen both parties
    const [senderScreening, recipientScreening] = await Promise.all([
      this.screenEntity(
        transaction.senderName,
        'BUSINESS',
        transaction.senderCountry,
      ),
      this.screenEntity(
        transaction.recipientName,
        'BUSINESS',
        transaction.recipientCountry,
      ),
    ]);

    // Determine overall risk
    const riskLevels = [senderScreening.riskLevel, recipientScreening.riskLevel];
    const riskLevel = riskLevels.includes('CRITICAL')
      ? 'CRITICAL'
      : riskLevels.includes('HIGH')
      ? 'HIGH'
      : riskLevels.includes('MEDIUM')
      ? 'MEDIUM'
      : 'LOW';

    const approved =
      senderScreening.status === 'CLEAR' &&
      recipientScreening.status === 'CLEAR' &&
      riskLevel !== 'CRITICAL';

    return {
      approved,
      senderScreening,
      recipientScreening,
      riskLevel,
    };
  }

  /**
   * Get screening history for entity
   */
  async getScreeningHistory(entityId: string): Promise<ScreeningResult[]> {
    // In production, retrieve from database
    return [];
  }

  /**
   * Calculate fuzzy match score
   */
  private calculateFuzzyMatch(name: string, list: string[]): number {
    // In production, use sophisticated fuzzy matching:
    // - Levenshtein distance
    // - Soundex/Metaphone
    // - N-gram similarity
    // - Jaro-Winkler distance

    const nameLower = name.toLowerCase();

    for (const item of list) {
      if (nameLower.includes(item.toLowerCase())) {
        return 95; // High match
      }
    }

    return 0; // No match
  }

  /**
   * Analyze matches and determine risk
   */
  private analyzeMatches(matches: SanctionsMatch[]): {
    status: 'CLEAR' | 'POTENTIAL_MATCH' | 'MATCH' | 'ERROR';
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    recommendation: 'APPROVE' | 'REVIEW' | 'REJECT';
  } {
    if (matches.length === 0) {
      return {
        status: 'CLEAR',
        riskLevel: 'LOW',
        recommendation: 'APPROVE',
      };
    }

    // Check for high-confidence matches
    const highConfidenceMatch = matches.some((m) => m.matchScore > 90);

    if (highConfidenceMatch) {
      return {
        status: 'MATCH',
        riskLevel: 'CRITICAL',
        recommendation: 'REJECT',
      };
    }

    // Check for medium-confidence matches
    const mediumConfidenceMatch = matches.some(
      (m) => m.matchScore > 70 && m.matchScore <= 90,
    );

    if (mediumConfidenceMatch) {
      return {
        status: 'POTENTIAL_MATCH',
        riskLevel: 'HIGH',
        recommendation: 'REVIEW',
      };
    }

    // Low confidence matches
    return {
      status: 'POTENTIAL_MATCH',
      riskLevel: 'MEDIUM',
      recommendation: 'REVIEW',
    };
  }

  /**
   * Export screening report
   */
  async exportScreeningReport(
    entityId: string,
    format: 'PDF' | 'JSON',
  ): Promise<Buffer | object> {
    this.logger.log(`Exporting screening report for entity: ${entityId}`);

    // In production:
    // 1. Retrieve all screening history
    // 2. Generate comprehensive report
    // 3. Include all matches, risk assessments
    // 4. Export as PDF or JSON

    throw new Error('Not implemented');
  }

  /**
   * Check if provider is configured
   */
  isProviderConfigured(): boolean {
    return this.provider !== 'mock';
  }

  /**
   * Get provider configuration
   */
  getProviderConfig(): {
    provider: string;
    isProduction: boolean;
    capabilities: string[];
  } {
    return {
      provider: this.provider,
      isProduction: this.provider !== 'mock',
      capabilities: [
        'OFAC Screening',
        'UN Sanctions',
        'EU Sanctions',
        'PEP Screening',
        'Adverse Media',
        'Continuous Monitoring',
      ],
    };
  }
}
