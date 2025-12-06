import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma/prisma.service';

/**
 * KYC Verification Processor
 *
 * This service handles async verification of KYC documents.
 * In a production environment, this would be integrated with:
 * - Bull/BullMQ queue system for job processing
 * - AI-powered document verification services (e.g., Onfido, Jumio, AWS Rekognition)
 * - Identity verification APIs
 * - OCR services for document data extraction
 *
 * Security Features:
 * - Async processing to avoid blocking API requests
 * - Document authenticity verification
 * - Fraud detection algorithms
 * - Face matching between ID and selfie
 * - Address verification against utility bills
 *
 * IMPORTANT: This processor uses mock data unless a real KYC provider is configured.
 * Set KYC_PROVIDER environment variable to 'onfido', 'jumio', or 'sumsub' for production.
 * Use KycProviderService for production integrations with external verification providers.
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
  ) {
    this.kycProvider = this.configService.get<string>('KYC_PROVIDER', 'mock');
    this.nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    this.useMockData = this.kycProvider === 'mock';

    // Log warning if mock provider is used in production
    if (this.nodeEnv === 'production' && this.useMockData) {
      this.logger.error(
        '❌ CRITICAL: KYC_PROVIDER is set to "mock" in production environment! ' +
        'This will return fake verification data. Configure a real provider (onfido, jumio, sumsub).',
      );
    }

    if (this.useMockData) {
      this.logger.warn(
        '⚠️  KYC Verification Processor is running in MOCK mode. ' +
        'All verification results will be simulated. Set KYC_PROVIDER to use real verification.',
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
   * Perform actual verification steps
   * This is a placeholder for integration with verification services
   */
  private async performVerificationSteps(kycApplicationId: string): Promise<void> {
    try {
      const kycApplication = await this.prisma.kycApplication.findUnique({
        where: { id: kycApplicationId },
      });

      if (!kycApplication) {
        this.logger.error(`KYC application not found: ${kycApplicationId}`);
        return;
      }

      // Placeholder for AI verification steps
      const verificationResults = await this.runAIVerification(kycApplication);

      // Update KYC application with verification results
      await this.prisma.kycApplication.update({
        where: { id: kycApplicationId },
        data: {
          verificationScore: verificationResults.score,
          verificationData: {
            ...(kycApplication.verificationData as object),
            aiVerification: verificationResults,
            verifiedAt: new Date().toISOString(),
            isMockData: this.useMockData,
            provider: this.kycProvider,
          },
        },
      });

      this.logger.log(
        `Verification completed for KYC ${kycApplicationId}. Score: ${verificationResults.score} (Mock: ${this.useMockData})`,
      );
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
   * AI Document Verification
   *
   * MOCK MODE: Returns simulated data with isMockData flag set to true.
   *
   * In production with real provider, this would integrate with services like:
   * - Onfido: Document and identity verification
   * - Jumio: KYC and AML compliance
   * - AWS Rekognition: Face detection and matching
   * - Google Cloud Vision: OCR and document analysis
   * - Stripe Identity: Identity verification
   *
   * Verification steps:
   * 1. Document authenticity check (detect forgeries)
   * 2. OCR data extraction from ID documents
   * 3. Face matching (ID photo vs selfie)
   * 4. Liveness detection (ensure real person)
   * 5. Address verification
   * 6. Business registration verification
   * 7. Sanctions and PEP screening
   * 8. Watchlist screening
   */
  private async runAIVerification(kycApplication: any): Promise<any> {
    if (!this.useMockData) {
      throw new Error(
        'Real KYC provider integration not implemented in this processor. ' +
        'Use KycProviderService for production verification with external providers.',
      );
    }

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
   * Process document with OCR
   * MOCK: Placeholder for OCR integration
   */
  private async extractDocumentData(documentUrl: string): Promise<any> {
    if (!this.useMockData) {
      throw new Error(
        'Real OCR integration not implemented in this processor. ' +
        'Use KycProviderService with configured OCR provider.',
      );
    }

    // In production, integrate with:
    // - AWS Textract
    // - Google Cloud Vision OCR
    // - Azure Computer Vision
    // - Tesseract OCR

    return {
      isMockData: true,
      extractedText: '[MOCK-EXTRACTED-TEXT]',
      confidence: 0.90,
      warning: 'This is simulated OCR data. Configure real OCR provider for production.',
    };
  }

  /**
   * Verify face match between ID and selfie
   * MOCK: Placeholder for face verification
   */
  private async verifyFaceMatch(
    idPhotoUrl: string,
    selfieUrl: string,
  ): Promise<any> {
    if (!this.useMockData) {
      throw new Error(
        'Real face verification not implemented in this processor. ' +
        'Use KycProviderService with configured face verification provider.',
      );
    }

    // In production, integrate with:
    // - AWS Rekognition
    // - Azure Face API
    // - Face++
    // - Kairos

    return {
      isMockData: true,
      matched: true,
      similarity: 0.88,
      livenessCheck: true,
      warning: 'This is simulated face matching data. Configure real face verification for production.',
    };
  }

  /**
   * Check document authenticity
   * MOCK: Placeholder for document fraud detection
   */
  private async checkDocumentAuthenticity(documentUrl: string): Promise<any> {
    if (!this.useMockData) {
      throw new Error(
        'Real document verification not implemented in this processor. ' +
        'Use KycProviderService with configured document verification provider.',
      );
    }

    // In production, integrate with:
    // - Onfido Document Verification
    // - Jumio Document Verification
    // - Acuant

    return {
      isMockData: true,
      isAuthentic: true,
      confidence: 0.92,
      forgeryIndicators: [],
      warning: 'This is simulated authenticity check. Configure real document verification for production.',
    };
  }

  /**
   * Screen against sanctions and watchlists
   * MOCK: Placeholder for compliance screening
   */
  private async performComplianceScreening(
    personalData: any,
  ): Promise<any> {
    if (!this.useMockData) {
      throw new Error(
        'Real compliance screening not implemented in this processor. ' +
        'Use KycProviderService with configured compliance provider.',
      );
    }

    // In production, integrate with:
    // - ComplyAdvantage
    // - Refinitiv World-Check
    // - Dow Jones Risk & Compliance
    // - LexisNexis

    return {
      isMockData: true,
      sanctionsMatch: false,
      pepMatch: false,
      adverseMediaMatch: false,
      riskLevel: 'low',
      warning: 'This is simulated compliance screening. Configure real compliance provider for production.',
    };
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
