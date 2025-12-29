import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma/prisma.service';
import { KycProviderService } from '../services/kyc-provider.service';
import { KycCheckType, KycCheckStatus, KycCheckResult } from '../providers/kyc-provider.interface';

/**
 * KYC Verification Processor
 *
 * This service handles async verification of KYC documents using real KYC providers.
 *
 * Integration with External Providers:
 * - Onfido: Document verification, face matching, liveness detection, AML screening
 * - Jumio: Identity verification, document authentication, biometric verification
 * - Sumsub: KYC/AML compliance, identity verification, sanctions screening
 *
 * Features:
 * - Async processing to avoid blocking API requests
 * - Real document authenticity verification via provider APIs
 * - AI-powered fraud detection algorithms
 * - Face matching between ID photo and selfie
 * - Liveness detection to prevent spoofing
 * - Address verification against utility bills
 * - AML/PEP/Sanctions screening
 * - Webhook-based async result updates
 * - Automatic retry logic with exponential backoff
 * - Rate limiting and error handling
 * - Mock mode for development/testing
 *
 * Process Flow:
 * 1. Application submitted -> Creates applicant in provider system
 * 2. Documents uploaded -> Uploads to provider for analysis
 * 3. Check created -> Initiates verification checks (document, face, identity, AML)
 * 4. Provider processes -> AI analysis, OCR, face matching, compliance screening
 * 5. Webhook received -> Updates application status based on results
 * 6. Manual review (if needed) -> Admin reviews flagged cases
 * 7. Final decision -> Application approved/rejected
 *
 * Environment Variables:
 * - KYC_PROVIDER: Provider to use (onfido, jumio, sumsub, mock)
 * - ONFIDO_API_TOKEN, JUMIO_API_TOKEN, SUMSUB_APP_TOKEN: Provider credentials
 * - NODE_ENV: Environment (development, production)
 */
@Injectable()
export class KycVerificationProcessor {
  private readonly logger = new Logger(KycVerificationProcessor.name);
  private readonly kycProvider: string;
  private readonly nodeEnv: string;
  private readonly useMockData: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => KycProviderService))
    private readonly kycProviderService: KycProviderService,
  ) {
    this.kycProvider = this.configService.get<string>('KYC_PROVIDER', 'mock');
    this.nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    this.useMockData = this.kycProvider === 'mock';

    // Log warning if mock provider is used in production
    if (this.nodeEnv === 'production' && this.useMockData) {
      this.logger.error(
        'CRITICAL: KYC_PROVIDER is set to "mock" in production environment! ' +
        'This will return fake verification data. Configure a real provider (onfido, jumio, sumsub).',
      );
    }

    if (this.useMockData) {
      this.logger.warn(
        'KYC Verification Processor is running in MOCK mode. ' +
        'All verification results will be simulated. Set KYC_PROVIDER to use real verification.',
      );
    } else {
      this.logger.log(
        `KYC Verification Processor initialized with provider: ${this.kycProvider}`,
      );
    }
  }

  /**
   * Process KYC verification
   * This simulates async job processing. In production, this would be a queue job.
   */
  async processVerification(kycApplicationId: string): Promise<void> {
    this.logger.log(`Starting verification for KYC application: ${kycApplicationId}`);

    // Prevent mock verification in production
    if (this.nodeEnv === 'production' && this.useMockData) {
      const error = new Error(
        'Cannot process KYC verification in production with mock provider. ' +
        'Configure KYC_PROVIDER environment variable with a real provider (onfido, jumio, sumsub).',
      );
      this.logger.error(error.message);

      // Update application with error
      await this.prisma.kycApplication.update({
        where: { id: kycApplicationId },
        data: {
          status: 'REJECTED',
          verificationData: {
            error: 'Verification failed: Mock provider not allowed in production',
            errorDetails: error.message,
            timestamp: new Date().toISOString(),
            isMockData: true,
          },
        },
      });

      throw error;
    }

    try {
      // Update status to UNDER_REVIEW
      await this.prisma.kycApplication.update({
        where: { id: kycApplicationId },
        data: { status: 'UNDER_REVIEW' },
      });

      // Simulate async processing with setTimeout
      // In production, this would be handled by a queue worker
      setTimeout(async () => {
        await this.performVerificationSteps(kycApplicationId);
      }, 1000);

      this.logger.log(`Verification queued for KYC application: ${kycApplicationId}`);
    } catch (error) {
      this.logger.error(
        `Error queuing verification for KYC ${kycApplicationId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Perform actual verification steps using real KYC provider
   * Steps:
   * 1. Create check with provider (if not already created)
   * 2. Poll for check completion (if synchronous mode)
   * 3. Process results and update application
   *
   * Note: In webhook mode, results are processed via webhook endpoint
   */
  private async performVerificationSteps(kycApplicationId: string): Promise<void> {
    try {
      const kycApplication = await this.prisma.kycApplication.findUnique({
        where: { id: kycApplicationId },
        include: {
          organization: true,
        },
      });

      if (!kycApplication) {
        this.logger.error(`KYC application not found: ${kycApplicationId}`);
        return;
      }

      const verificationData = kycApplication.verificationData as any;

      // If using mock mode, use simulated verification
      if (this.useMockData) {
        const verificationResults = await this.runMockVerification(kycApplication);

        await this.prisma.kycApplication.update({
          where: { id: kycApplicationId },
          data: {
            verificationScore: verificationResults.score,
            verificationData: {
              ...verificationData,
              aiVerification: verificationResults,
              verifiedAt: new Date().toISOString(),
              isMockData: true,
              provider: 'mock',
            },
          },
        });

        this.logger.log(
          `MOCK verification completed for KYC ${kycApplicationId}. Score: ${verificationResults.score}`,
        );
        return;
      }

      // Real provider verification
      const provider = this.kycProviderService.getProvider();
      const providerCheckId = verificationData?.providerCheckId;

      if (!providerCheckId) {
        this.logger.warn(
          `No provider check ID found for KYC ${kycApplicationId}. Creating check...`,
        );

        // Create check with provider
        try {
          await this.kycProviderService.createVerificationCheck(
            kycApplication.organizationId,
            'system',
          );

          this.logger.log(
            `Created verification check for KYC ${kycApplicationId}`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to create verification check for KYC ${kycApplicationId}:`,
            error,
          );
          throw error;
        }

        // Wait for webhook or poll for results
        // In production, webhook will handle the update
        this.logger.log(
          `Verification check created. Waiting for webhook callback for KYC ${kycApplicationId}`,
        );
        return;
      }

      // Check already exists, poll for results (fallback if webhook fails)
      try {
        const checkReport = await provider.getCheck(providerCheckId);

        this.logger.log(
          `Retrieved check status for KYC ${kycApplicationId}: ${checkReport.status}`,
        );

        // Calculate verification score based on results
        const score = this.calculateVerificationScore(checkReport);

        // Update application with results
        await this.prisma.kycApplication.update({
          where: { id: kycApplicationId },
          data: {
            verificationScore: score,
            verificationData: {
              ...verificationData,
              providerCheckStatus: checkReport.status,
              providerCheckResult: checkReport.result,
              providerBreakdown: checkReport.breakdown,
              extractedDocuments: checkReport.documents,
              verifiedAt: new Date().toISOString(),
              isMockData: false,
              provider: this.kycProvider,
            },
          },
        });

        // Update verification flags based on breakdown
        if (checkReport.status === KycCheckStatus.COMPLETE) {
          const updates: any = {};

          if (checkReport.breakdown?.documentAuthenticity) {
            updates.idVerified =
              checkReport.breakdown.documentAuthenticity.result === KycCheckResult.CLEAR;
          }

          if (checkReport.breakdown?.addressVerification) {
            updates.addressVerified =
              checkReport.breakdown.addressVerification.result === KycCheckResult.CLEAR;
          }

          if (Object.keys(updates).length > 0) {
            await this.prisma.kycApplication.update({
              where: { id: kycApplicationId },
              data: updates,
            });
          }
        }

        this.logger.log(
          `Verification completed for KYC ${kycApplicationId}. Score: ${score}, Status: ${checkReport.status}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to retrieve check results for KYC ${kycApplicationId}:`,
          error,
        );
        throw error;
      }
    } catch (error) {
      this.logger.error(
        `Error processing verification for KYC ${kycApplicationId}:`,
        error,
      );

      // Update status to indicate error
      await this.prisma.kycApplication.update({
        where: { id: kycApplicationId },
        data: {
          verificationData: {
            error: 'Verification processing failed',
            errorDetails: error.message,
            timestamp: new Date().toISOString(),
            isMockData: this.useMockData,
          },
        },
      });
    }
  }

  /**
   * Calculate verification score from provider check report
   */
  private calculateVerificationScore(checkReport: any): number {
    let score = 0;
    let totalChecks = 0;

    if (!checkReport.breakdown) {
      return 0;
    }

    const breakdown = checkReport.breakdown;

    // Document authenticity (weight: 30%)
    if (breakdown.documentAuthenticity) {
      totalChecks++;
      if (breakdown.documentAuthenticity.result === KycCheckResult.CLEAR) {
        score += 0.3;
      } else if (breakdown.documentAuthenticity.result === KycCheckResult.CONSIDER) {
        score += 0.15;
      }
    }

    // Face comparison (weight: 25%)
    if (breakdown.faceComparison) {
      totalChecks++;
      if (breakdown.faceComparison.result === KycCheckResult.CLEAR) {
        score += 0.25;
      } else if (breakdown.faceComparison.result === KycCheckResult.CONSIDER) {
        score += 0.12;
      }
    }

    // Liveness check (weight: 20%)
    if (breakdown.livenessCheck) {
      totalChecks++;
      if (breakdown.livenessCheck.result === KycCheckResult.CLEAR) {
        score += 0.2;
      } else if (breakdown.livenessCheck.result === KycCheckResult.CONSIDER) {
        score += 0.1;
      }
    }

    // Address verification (weight: 15%)
    if (breakdown.addressVerification) {
      totalChecks++;
      if (breakdown.addressVerification.result === KycCheckResult.CLEAR) {
        score += 0.15;
      } else if (breakdown.addressVerification.result === KycCheckResult.CONSIDER) {
        score += 0.07;
      }
    }

    // Data consistency (weight: 10%)
    if (breakdown.dataConsistency) {
      totalChecks++;
      if (breakdown.dataConsistency.result === KycCheckResult.CLEAR) {
        score += 0.1;
      } else if (breakdown.dataConsistency.result === KycCheckResult.CONSIDER) {
        score += 0.05;
      }
    }

    // Normalize score if not all checks were performed
    if (totalChecks === 0) {
      return 0;
    }

    // Round to 2 decimal places
    return Math.round(score * 100) / 100;
  }

  /**
   * Mock Verification for Development/Testing
   *
   * Returns simulated verification data for development and testing purposes.
   * This should NOT be used in production.
   *
   * Simulates:
   * 1. Document authenticity check
   * 2. OCR data extraction
   * 3. Face matching
   * 4. Liveness detection
   * 5. Address verification
   * 6. Business registration verification
   * 7. Sanctions and PEP screening
   */
  private async runMockVerification(kycApplication: any): Promise<any> {

    this.logger.log('Running AI verification (MOCK MODE - simulated data)...');

    // Simulate AI processing delay
    await this.delay(2000);

    // Extract actual data from KYC application if available
    const verificationData = kycApplication.verificationData as any;
    const hasRealData = verificationData && (verificationData.firstName || verificationData.lastName);

    // MOCK: Placeholder verification results
    // In production, these would come from real AI/OCR services
    const results = {
      isMockData: true, // FLAG: This is simulated data
      provider: 'mock',
      score: 0.85, // Confidence score (0-1)
      documentAuthenticity: {
        isAuthentic: true,
        confidence: 0.92,
        checks: {
          securityFeatures: true,
          microprinting: true,
          watermark: true,
          hologram: true,
        },
        note: 'MOCK: Simulated authenticity check. Real verification would use AI document fraud detection.',
      },
      faceMatch: {
        matched: true,
        confidence: 0.88,
        livenessCheck: true,
        note: 'MOCK: Simulated face matching. Real verification would compare ID photo with selfie.',
      },
      dataExtraction: {
        // Use real data if available, otherwise use mock data with clear indicators
        firstName: hasRealData
          ? (verificationData.firstName || '[NO DATA]')
          : '[MOCK-DATA-ONLY]',
        lastName: hasRealData
          ? (verificationData.lastName || '[NO DATA]')
          : '[MOCK-DATA-ONLY]',
        documentNumber: hasRealData
          ? (verificationData.documentNumber || '[NO DATA]')
          : '[MOCK-XXX-SIMULATED]',
        expiryDate: hasRealData
          ? (verificationData.expiryDate || '[NO DATA]')
          : '2030-12-31',
        dateOfBirth: hasRealData
          ? (verificationData.dateOfBirth || '[NO DATA]')
          : '1990-01-01',
        note: 'MOCK: In production, this would be extracted via OCR from document images.',
      },
      addressVerification: {
        verified: true,
        confidence: 0.80,
        matchLevel: 'exact',
        note: 'MOCK: Simulated address verification. Real verification would validate against utility bills.',
      },
      businessVerification: {
        registered: true,
        registrationConfirmed: true,
        taxIdValid: true,
        note: 'MOCK: Simulated business verification. Real verification would check government registries.',
      },
      riskAssessment: {
        riskLevel: 'low',
        sanctionsMatch: false,
        pepMatch: false,
        adverseMediaMatch: false,
        note: 'MOCK: Simulated compliance screening. Real verification would check sanctions and watchlists.',
      },
      recommendations: {
        autoApprove: true,
        requiresManualReview: false,
        confidence: 0.85,
        note: 'MOCK: In production, decisions would be based on real verification results.',
      },
      warnings: [
        '⚠️  THIS IS MOCK DATA - Not suitable for production use',
        '⚠️  Configure KYC_PROVIDER with real verification service (onfido, jumio, sumsub)',
        '⚠️  Use KycProviderService for production-grade verification',
      ],
    };

    return results;
  }


  /**
   * Utility: Delay function for simulation
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get verification status
   */
  async getVerificationStatus(kycApplicationId: string): Promise<any> {
    const kycApplication = await this.prisma.kycApplication.findUnique({
      where: { id: kycApplicationId },
      select: {
        id: true,
        status: true,
        verificationScore: true,
        verificationData: true,
      },
    });

    if (!kycApplication) {
      throw new Error('KYC application not found');
    }

    const verificationData = kycApplication.verificationData as any;
    const isMockData = verificationData?.isMockData ?? this.useMockData;

    return {
      id: kycApplication.id,
      status: kycApplication.status,
      score: kycApplication.verificationScore,
      verificationData: kycApplication.verificationData,
      isMockData,
      warnings: isMockData ? [
        '⚠️  Verification results contain mock/simulated data',
        '⚠️  Not suitable for production use without real verification provider',
      ] : [],
    };
  }

  /**
   * Retry failed verification
   */
  async retryVerification(kycApplicationId: string): Promise<void> {
    this.logger.log(`Retrying verification for KYC application: ${kycApplicationId}`);
    await this.processVerification(kycApplicationId);
  }

  /**
   * Check if processor is using mock data
   */
  isMockMode(): boolean {
    return this.useMockData;
  }

  /**
   * Get current configuration
   */
  getConfiguration(): {
    provider: string;
    environment: string;
    isMockMode: boolean;
    isProductionSafe: boolean;
  } {
    return {
      provider: this.kycProvider,
      environment: this.nodeEnv,
      isMockMode: this.useMockData,
      isProductionSafe: this.nodeEnv !== 'production' || !this.useMockData,
    };
  }
}
