import { Controller, Post, Get, Body, Param, Query, UseGuards, Delete, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { FraudDetectionService } from './fraud-detection.service';
import { TransactionAnalysisService } from './transaction-analysis.service';
import { AccountSecurityService } from './account-security.service';
import { DeviceFingerprintService } from './device-fingerprint.service';
import {
  ValidateDeviceFingerprintDto,
  BlockDeviceDto,
  UnblockDeviceDto,
  VerifyDeviceDto,
  RecordSuspiciousActivityDto,
  DeviceValidationResponseDto,
  UserDeviceDto,
} from './dto/device-fingerprint.dto';

@ApiTags('AI - Fraud Detection')
@Controller('ai/fraud-detection')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class FraudDetectionController {
  constructor(
    private readonly fraudDetectionService: FraudDetectionService,
    private readonly transactionAnalysisService: TransactionAnalysisService,
    private readonly accountSecurityService: AccountSecurityService,
    private readonly deviceFingerprintService: DeviceFingerprintService,
  ) {}

  @Post('analyze-transaction')
  @Roles(UserRole.ADMIN, UserRole.VENDOR)
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
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get user risk score and profile (Admin only)' })
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
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get recent fraud alerts (Admin only)' })
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

  // ============================================
  // DEVICE FINGERPRINTING ENDPOINTS
  // ============================================

  @Post('device/validate')
  @ApiOperation({
    summary: 'Validate a device fingerprint',
    description: 'Validates device fingerprint data and returns trust assessment with bot/emulator detection',
  })
  @ApiResponse({ status: 200, description: 'Device validation result', type: DeviceValidationResponseDto })
  async validateDeviceFingerprint(
    @Body() dto: ValidateDeviceFingerprintDto,
    @Req() req: any,
  ) {
    const ipAddress = dto.ipAddress || req.ip || req.connection?.remoteAddress;
    return this.deviceFingerprintService.validateFingerprint(
      dto.fingerprint,
      dto.userId,
      ipAddress,
    );
  }

  @Post('device/login-check')
  @ApiOperation({
    summary: 'Check login attempt with device fingerprint',
    description: 'Performs comprehensive account takeover detection using device fingerprint',
  })
  async checkLoginWithFingerprint(@Body() data: {
    userId: string;
    loginAttempt: {
      ipAddress: string;
      deviceFingerprint: any;
      location?: { lat: number; lng: number };
      timestamp?: string;
    };
  }) {
    return this.accountSecurityService.detectAccountTakeoverWithFingerprint({
      userId: data.userId,
      loginAttempt: {
        ...data.loginAttempt,
        timestamp: data.loginAttempt.timestamp || new Date().toISOString(),
      },
    });
  }

  @Post('device/transaction-check')
  @ApiOperation({
    summary: 'Analyze transaction with device fingerprint',
    description: 'Performs fraud detection on transaction including device trust assessment',
  })
  async analyzeTransactionWithFingerprint(@Body() data: {
    transactionId: string;
    userId: string;
    amount: number;
    paymentMethod: string;
    ipAddress: string;
    deviceFingerprint?: any;
    billingAddress?: any;
    shippingAddress?: any;
  }) {
    return this.transactionAnalysisService.analyzeTransactionWithFingerprint(data);
  }

  @Get('device/my-devices')
  @ApiOperation({
    summary: 'Get current user\'s trusted devices',
    description: 'Returns list of devices associated with the current user',
  })
  @ApiResponse({ status: 200, description: 'List of user devices', type: [UserDeviceDto] })
  async getMyDevices(@CurrentUser() user: any) {
    return this.accountSecurityService.getUserTrustedDevices(user.sub || user.id);
  }

  @Get('device/user/:userId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get a user\'s devices (Admin only)',
    description: 'Returns list of devices associated with a specific user',
  })
  @ApiResponse({ status: 200, description: 'List of user devices', type: [UserDeviceDto] })
  async getUserDevices(@Param('userId') userId: string) {
    return this.accountSecurityService.getUserTrustedDevices(userId);
  }

  @Post('device/verify')
  @ApiOperation({
    summary: 'Verify a device for the current user',
    description: 'Marks a device as verified after successful verification (email, SMS, 2FA)',
  })
  async verifyMyDevice(
    @CurrentUser() user: any,
    @Body() dto: VerifyDeviceDto,
  ) {
    const userId = user.sub || user.id;
    return this.accountSecurityService.verifyUserDevice(
      userId,
      dto.fingerprintHash,
      dto.verificationMethod,
    );
  }

  @Delete('device/:fingerprintHash')
  @ApiOperation({
    summary: 'Remove a device from current user\'s trusted devices',
    description: 'Removes the association between the current user and a device',
  })
  async removeMyDevice(
    @CurrentUser() user: any,
    @Param('fingerprintHash') fingerprintHash: string,
  ) {
    const userId = user.sub || user.id;
    await this.accountSecurityService.removeUserDevice(userId, fingerprintHash);
    return { success: true, message: 'Device removed successfully' };
  }

  @Get('device/trust-score/:fingerprintHash')
  @ApiOperation({
    summary: 'Get device trust score for current user',
    description: 'Returns trust score and device details for a specific device',
  })
  async getDeviceTrustScore(
    @CurrentUser() user: any,
    @Param('fingerprintHash') fingerprintHash: string,
  ) {
    const userId = user.sub || user.id;
    return this.accountSecurityService.getDeviceTrustScore(userId, fingerprintHash);
  }

  @Post('device/block')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Block a device (Admin only)',
    description: 'Blocks a device from being used across the platform',
  })
  async blockDevice(
    @Body() dto: BlockDeviceDto,
    @CurrentUser() user: any,
  ) {
    const adminId = user.sub || user.id;
    await this.deviceFingerprintService.blockDevice(
      dto.fingerprintHash,
      dto.reason,
      dto.userId,
      { ...dto.evidence, blockedBy: adminId },
    );
    return { success: true, message: 'Device blocked successfully' };
  }

  @Post('device/unblock')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Unblock a device (Admin only)',
    description: 'Unblocks a previously blocked device',
  })
  async unblockDevice(
    @Body() dto: UnblockDeviceDto,
    @CurrentUser() user: any,
  ) {
    const adminId = user.sub || user.id;
    await this.deviceFingerprintService.unblockDevice(
      dto.fingerprintHash,
      adminId,
      dto.resolution,
    );
    return { success: true, message: 'Device unblocked successfully' };
  }

  @Post('device/suspicious-activity')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Record suspicious activity for a device (Admin only)',
    description: 'Manually records suspicious activity associated with a device',
  })
  async recordSuspiciousActivity(@Body() dto: RecordSuspiciousActivityDto) {
    await this.deviceFingerprintService.recordSuspiciousActivity(
      dto.fingerprintHash,
      dto.activityType,
      dto.description,
      dto.userId,
      dto.ipAddress,
      dto.evidence,
    );
    return { success: true, message: 'Suspicious activity recorded' };
  }

  @Get('device/incidents/:fingerprintHash')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get fraud incidents for a device (Admin only)',
    description: 'Returns all fraud incidents associated with a device',
  })
  async getDeviceIncidents(@Param('fingerprintHash') fingerprintHash: string) {
    // This would typically be a separate method in the service
    // For now, returning through the device trust info
    const deviceTrust = await this.deviceFingerprintService.getDeviceTrustForUser('', fingerprintHash);
    return deviceTrust;
  }
}
