import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { FraudDetectionService } from './fraud-detection.service';
import { TransactionAnalysisService } from './transaction-analysis.service';
import { AccountSecurityService } from './account-security.service';

@ApiTags('AI - Fraud Detection')
@Controller('ai/fraud-detection')
export class FraudDetectionController {
  constructor(
    private readonly fraudDetectionService: FraudDetectionService,
    private readonly transactionAnalysisService: TransactionAnalysisService,
    private readonly accountSecurityService: AccountSecurityService,
  ) {}

  @Post('analyze-transaction')
  @ApiOperation({ summary: 'Analyze transaction for fraud risk' })
  async analyzeTransaction(@Body() data: {
    transactionId: string;
    userId: string;
    amount: number;
    paymentMethod: string;
    ipAddress: string;
    deviceFingerprint?: string;
    billingAddress?: any;
    shippingAddress?: any;
  }) {
    return this.transactionAnalysisService.analyzeTransaction(data);
  }

  @Post('detect-account-takeover')
  @ApiOperation({ summary: 'Detect potential account takeover attempts' })
  async detectAccountTakeover(@Body() data: {
    userId: string;
    loginAttempt: {
      ipAddress: string;
      deviceFingerprint: string;
      location?: { lat: number; lng: number };
      timestamp: string;
    };
  }) {
    return this.accountSecurityService.detectAccountTakeover(data);
  }

  @Post('analyze-review')
  @ApiOperation({ summary: 'Detect fake or fraudulent reviews' })
  async analyzeFakeReview(@Body() data: {
    reviewId: string;
    userId: string;
    productId: string;
    rating: number;
    content: string;
    verified: boolean;
  }) {
    return this.fraudDetectionService.analyzeFakeReview(data);
  }

  @Post('detect-return-fraud')
  @ApiOperation({ summary: 'Analyze return request for fraud patterns' })
  async detectReturnFraud(@Body() data: {
    orderId: string;
    userId: string;
    returnReason: string;
    items: Array<{ productId: string; quantity: number; price: number }>;
  }) {
    return this.fraudDetectionService.detectReturnFraud(data);
  }

  @Get('risk-score/:userId')
  @ApiOperation({ summary: 'Get user risk score and profile' })
  async getUserRiskScore(@Param('userId') userId: string) {
    return this.fraudDetectionService.getUserRiskScore(userId);
  }

  @Post('velocity-check')
  @ApiOperation({ summary: 'Check for velocity fraud patterns' })
  async velocityCheck(@Body() data: {
    userId: string;
    action: 'login' | 'purchase' | 'password_reset' | 'address_change';
    timeWindow: number; // minutes
  }) {
    return this.transactionAnalysisService.velocityCheck(data);
  }

  @Get('fraud-alerts')
  @ApiOperation({ summary: 'Get recent fraud alerts' })
  async getFraudAlerts(@Query('severity') severity?: string) {
    return this.fraudDetectionService.getFraudAlerts(severity);
  }

  @Post('chargeback-risk')
  @ApiOperation({ summary: 'Assess chargeback risk for transaction' })
  async assessChargebackRisk(@Body() data: {
    transactionId: string;
    userId: string;
    amount: number;
    productCategory: string;
  }) {
    return this.transactionAnalysisService.assessChargebackRisk(data);
  }
}
