import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { DevicePlatform } from '@prisma/client';
import { createHash } from 'crypto';

/**
 * Device fingerprint data sent from the frontend
 */
export interface DeviceFingerprintData {
  // Browser fingerprinting components
  canvas?: string;           // Canvas fingerprint hash
  webgl?: string;            // WebGL renderer/vendor hash
  audio?: string;            // Audio context fingerprint
  fonts?: string[];          // Available fonts
  plugins?: string[];        // Browser plugins

  // Device characteristics
  screenResolution?: string; // e.g., "1920x1080"
  colorDepth?: number;
  timezone?: string;
  language?: string;
  languages?: string[];
  platform?: string;         // navigator.platform

  // Browser info
  userAgent: string;
  cookiesEnabled?: boolean;
  doNotTrack?: boolean;

  // Hardware
  hardwareConcurrency?: number;
  deviceMemory?: number;
  maxTouchPoints?: number;

  // WebGL details
  webglVendor?: string;
  webglRenderer?: string;

  // Additional signals for bot detection
  hasWebdriver?: boolean;
  hasAutomation?: boolean;
  hasPhantom?: boolean;
  hasNightmare?: boolean;
  hasSelenium?: boolean;
  hasCypressDriver?: boolean;

  // Behavioral signals
  mouseMovements?: number;
  keystrokes?: number;
  touchEvents?: number;
  scrollEvents?: number;
  sessionDuration?: number;  // milliseconds

  // Mobile-specific
  deviceModel?: string;
  osVersion?: string;
  appVersion?: string;
  isRooted?: boolean;
  isEmulator?: boolean;
}

/**
 * Result of device fingerprint validation
 */
export interface DeviceFingerprintValidationResult {
  isValid: boolean;
  fingerprintHash: string;
  trustScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  isNewDevice: boolean;
  isBot: boolean;
  isEmulator: boolean;
  isTrusted: boolean;
  isBlocked: boolean;
  blockReason?: string;
  warnings: string[];
  recommendations: string[];
  deviceInfo: {
    platform: DevicePlatform;
    browserFamily?: string;
    browserVersion?: string;
    osFamily?: string;
    osVersion?: string;
    deviceType?: string;
  };
}

/**
 * Trust score adjustment factors
 */
interface TrustScoreFactors {
  baseScore: number;
  deviceAgeBonus: number;
  successfulLoginsBonus: number;
  verificationBonus: number;
  consistentLocationBonus: number;
  botPenalty: number;
  emulatorPenalty: number;
  suspiciousActivityPenalty: number;
  failedLoginsPenalty: number;
  multiUserPenalty: number;
  fraudIncidentPenalty: number;
}

@Injectable()
export class DeviceFingerprintService {
  private readonly logger = new Logger(DeviceFingerprintService.name);

  // Bot/automation detection signatures
  private readonly BOT_SIGNATURES = {
    userAgentPatterns: [
      /bot/i, /crawler/i, /spider/i, /scraper/i,
      /headless/i, /phantom/i, /selenium/i,
      /puppeteer/i, /playwright/i, /cypress/i,
      /wget/i, /curl/i, /python-requests/i,
      /axios/i, /node-fetch/i, /http-client/i,
    ],
    webdriverSignatures: [
      'webdriver', 'driver', '__webdriver_script_fn',
      '__driver_evaluate', '__webdriver_evaluate',
      '__selenium_evaluate', '__fxdriver_evaluate',
      '__driver_unwrapped', '__webdriver_unwrapped',
      '__selenium_unwrapped', '__fxdriver_unwrapped',
    ],
    automationFlags: [
      'callPhantom', '_phantom', 'phantom',
      '__nightmare', 'domAutomation', 'domAutomationController',
      '_Selenium_IDE_Recorder', '_selenium', 'calledSelenium',
    ],
  };

  // Known emulator signatures
  private readonly EMULATOR_SIGNATURES = {
    models: [
      'sdk_gphone', 'emulator', 'android sdk',
      'goldfish', 'ranchu', 'generic',
      'vbox86p', 'genymotion', 'unknown',
    ],
    osFingerprints: [
      'google_sdk', 'sdk', 'sdk_x86', 'vbox86p',
    ],
    webglRenderers: [
      'swiftshader', 'llvmpipe', 'mesa', 'virtualbox',
      'vmware', 'parallels', 'software',
    ],
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Validate a device fingerprint and return trust assessment
   */
  async validateFingerprint(
    data: DeviceFingerprintData,
    userId?: string,
    ipAddress?: string,
  ): Promise<DeviceFingerprintValidationResult> {
    this.logger.log('Validating device fingerprint');

    // Generate fingerprint hash from components
    const fingerprintHash = this.generateFingerprintHash(data);

    // Parse user agent for device info
    const deviceInfo = this.parseUserAgent(data.userAgent, data.platform);

    // Check for bot signals
    const botDetection = this.detectBot(data);

    // Check for emulator signals
    const emulatorDetection = this.detectEmulator(data, deviceInfo);

    // Initialize warnings and recommendations
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Look up existing device fingerprint
    let existingDevice = await this.prisma.deviceFingerprint.findUnique({
      where: { fingerprintHash },
      include: {
        fraudIncidents: {
          where: { status: { not: 'resolved' } },
        },
      },
    });

    const isNewDevice = !existingDevice;

    // Check if device is blocked
    if (existingDevice?.isBlocked) {
      return {
        isValid: false,
        fingerprintHash,
        trustScore: 0,
        riskLevel: 'critical',
        isNewDevice: false,
        isBot: existingDevice.isBot,
        isEmulator: existingDevice.isEmulator,
        isTrusted: false,
        isBlocked: true,
        blockReason: existingDevice.blockReason || 'Device is blocked due to previous fraud activity',
        warnings: ['Device has been blocked'],
        recommendations: ['Contact support if you believe this is an error'],
        deviceInfo,
      };
    }

    // Calculate trust score
    const trustScoreResult = await this.calculateTrustScoreInternal(
      existingDevice,
      userId,
      botDetection,
      emulatorDetection,
      isNewDevice,
    );

    // Collect warnings
    if (botDetection.isBot) {
      warnings.push(...botDetection.signals);
    }
    if (emulatorDetection.isEmulator) {
      warnings.push(...emulatorDetection.signals);
    }
    if (isNewDevice) {
      warnings.push('New device detected');
    }

    // Determine risk level
    const riskLevel = this.determineRiskLevel(trustScoreResult.score, botDetection, emulatorDetection);

    // Generate recommendations based on risk
    if (riskLevel === 'critical') {
      recommendations.push('Block action', 'Require identity verification', 'Flag for manual review');
    } else if (riskLevel === 'high') {
      recommendations.push('Require MFA', 'Send verification email', 'Log security event');
    } else if (riskLevel === 'medium') {
      recommendations.push('Request additional verification', 'Monitor session closely');
    } else if (isNewDevice) {
      recommendations.push('Send new device notification to user');
    }

    // Create or update device fingerprint record
    if (isNewDevice) {
      await this.createDeviceFingerprint(
        fingerprintHash,
        data,
        deviceInfo,
        botDetection,
        emulatorDetection,
        trustScoreResult.score,
        riskLevel,
        userId,
        ipAddress,
      );
    } else {
      await this.updateDeviceFingerprint(
        fingerprintHash,
        trustScoreResult.score,
        riskLevel,
        botDetection,
        emulatorDetection,
        userId,
        ipAddress,
      );
    }

    // If user is provided, update user-device association
    if (userId) {
      await this.updateUserDeviceAssociation(userId, fingerprintHash, ipAddress);
    }

    return {
      isValid: !botDetection.isBot && riskLevel !== 'critical',
      fingerprintHash,
      trustScore: trustScoreResult.score,
      riskLevel,
      isNewDevice,
      isBot: botDetection.isBot,
      isEmulator: emulatorDetection.isEmulator,
      isTrusted: trustScoreResult.score >= 70,
      isBlocked: false,
      warnings,
      recommendations,
      deviceInfo,
    };
  }

  /**
   * Generate a unique hash from fingerprint components
   */
  private generateFingerprintHash(data: DeviceFingerprintData): string {
    // Combine stable fingerprint components
    const components = [
      data.canvas || '',
      data.webgl || '',
      data.audio || '',
      (data.fonts || []).sort().join(','),
      data.screenResolution || '',
      data.colorDepth?.toString() || '',
      data.timezone || '',
      data.language || '',
      data.platform || '',
      data.hardwareConcurrency?.toString() || '',
      data.webglVendor || '',
      data.webglRenderer || '',
    ];

    const combinedString = components.join('|');
    return createHash('sha256').update(combinedString).digest('hex');
  }

  /**
   * Parse user agent string to extract device information
   */
  private parseUserAgent(
    userAgent: string,
    platform?: string,
  ): DeviceFingerprintValidationResult['deviceInfo'] {
    const ua = userAgent.toLowerCase();

    // Determine platform
    let devicePlatform: DevicePlatform = DevicePlatform.WEB;
    if (ua.includes('android')) {
      devicePlatform = DevicePlatform.ANDROID;
    } else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
      devicePlatform = DevicePlatform.IOS;
    }

    // Parse browser family and version
    let browserFamily: string | undefined;
    let browserVersion: string | undefined;

    if (ua.includes('chrome') && !ua.includes('edg')) {
      browserFamily = 'Chrome';
      const match = ua.match(/chrome\/(\d+)/);
      browserVersion = match?.[1];
    } else if (ua.includes('firefox')) {
      browserFamily = 'Firefox';
      const match = ua.match(/firefox\/(\d+)/);
      browserVersion = match?.[1];
    } else if (ua.includes('safari') && !ua.includes('chrome')) {
      browserFamily = 'Safari';
      const match = ua.match(/version\/(\d+)/);
      browserVersion = match?.[1];
    } else if (ua.includes('edg')) {
      browserFamily = 'Edge';
      const match = ua.match(/edg\/(\d+)/);
      browserVersion = match?.[1];
    }

    // Parse OS family and version
    let osFamily: string | undefined;
    let osVersion: string | undefined;

    if (ua.includes('windows')) {
      osFamily = 'Windows';
      if (ua.includes('windows nt 10')) osVersion = '10';
      else if (ua.includes('windows nt 11')) osVersion = '11';
      else if (ua.includes('windows nt 6.3')) osVersion = '8.1';
      else if (ua.includes('windows nt 6.2')) osVersion = '8';
      else if (ua.includes('windows nt 6.1')) osVersion = '7';
    } else if (ua.includes('mac os x')) {
      osFamily = 'macOS';
      const match = ua.match(/mac os x (\d+[._]\d+)/);
      osVersion = match?.[1]?.replace('_', '.');
    } else if (ua.includes('android')) {
      osFamily = 'Android';
      const match = ua.match(/android (\d+\.?\d*)/);
      osVersion = match?.[1];
    } else if (ua.includes('iphone') || ua.includes('ipad')) {
      osFamily = 'iOS';
      const match = ua.match(/os (\d+[._]\d+)/);
      osVersion = match?.[1]?.replace('_', '.');
    } else if (ua.includes('linux')) {
      osFamily = 'Linux';
    }

    // Determine device type
    let deviceType: string = 'desktop';
    if (ua.includes('mobile') || ua.includes('android') && !ua.includes('tablet')) {
      deviceType = 'mobile';
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      deviceType = 'tablet';
    }

    return {
      platform: devicePlatform,
      browserFamily,
      browserVersion,
      osFamily,
      osVersion,
      deviceType,
    };
  }

  /**
   * Detect bot/automation signals
   */
  private detectBot(data: DeviceFingerprintData): { isBot: boolean; confidence: number; signals: string[] } {
    const signals: string[] = [];
    let botScore = 0;

    // Check user agent for bot patterns
    for (const pattern of this.BOT_SIGNATURES.userAgentPatterns) {
      if (pattern.test(data.userAgent)) {
        signals.push(`Bot signature detected in user agent: ${pattern.source}`);
        botScore += 30;
        break;
      }
    }

    // Check explicit bot flags from frontend
    if (data.hasWebdriver) {
      signals.push('WebDriver detected');
      botScore += 40;
    }
    if (data.hasAutomation) {
      signals.push('Automation framework detected');
      botScore += 40;
    }
    if (data.hasPhantom) {
      signals.push('PhantomJS detected');
      botScore += 50;
    }
    if (data.hasNightmare) {
      signals.push('Nightmare detected');
      botScore += 50;
    }
    if (data.hasSelenium) {
      signals.push('Selenium detected');
      botScore += 50;
    }
    if (data.hasCypressDriver) {
      signals.push('Cypress driver detected');
      botScore += 30;
    }

    // Check for missing fingerprint components (common in headless browsers)
    if (!data.canvas) {
      signals.push('Missing canvas fingerprint');
      botScore += 15;
    }
    if (!data.webgl) {
      signals.push('Missing WebGL fingerprint');
      botScore += 15;
    }
    if (!data.audio) {
      signals.push('Missing audio fingerprint');
      botScore += 10;
    }

    // Check for unrealistic hardware specs
    if (data.hardwareConcurrency === 0) {
      signals.push('Invalid hardware concurrency');
      botScore += 20;
    }

    // Check behavioral signals (lack of interaction is suspicious)
    if (data.sessionDuration !== undefined) {
      const hasNoInteraction =
        (data.mouseMovements || 0) === 0 &&
        (data.keystrokes || 0) === 0 &&
        (data.touchEvents || 0) === 0 &&
        (data.scrollEvents || 0) === 0;

      if (hasNoInteraction && data.sessionDuration > 5000) {
        signals.push('No user interaction detected during session');
        botScore += 25;
      }
    }

    // Check plugins (headless browsers often have none)
    if (data.plugins && data.plugins.length === 0) {
      signals.push('No browser plugins detected');
      botScore += 10;
    }

    // Check for suspicious screen resolution
    if (data.screenResolution === '0x0' || data.screenResolution === '1x1') {
      signals.push('Invalid screen resolution');
      botScore += 30;
    }

    const confidence = Math.min(botScore / 100, 1);
    const isBot = botScore >= 50;

    return { isBot, confidence, signals };
  }

  /**
   * Detect emulator signals
   */
  private detectEmulator(
    data: DeviceFingerprintData,
    deviceInfo: DeviceFingerprintValidationResult['deviceInfo'],
  ): { isEmulator: boolean; confidence: number; signals: string[] } {
    const signals: string[] = [];
    let emulatorScore = 0;

    // Check explicit emulator flag from frontend
    if (data.isEmulator) {
      signals.push('Emulator flag set by client');
      emulatorScore += 50;
    }

    // Check for rooted device (common in emulators)
    if (data.isRooted) {
      signals.push('Rooted/jailbroken device detected');
      emulatorScore += 20;
    }

    // Check device model for emulator signatures
    const deviceModel = (data.deviceModel || '').toLowerCase();
    for (const emulatorModel of this.EMULATOR_SIGNATURES.models) {
      if (deviceModel.includes(emulatorModel)) {
        signals.push(`Emulator model detected: ${emulatorModel}`);
        emulatorScore += 40;
        break;
      }
    }

    // Check WebGL renderer for emulator signatures
    const webglRenderer = (data.webglRenderer || '').toLowerCase();
    for (const renderer of this.EMULATOR_SIGNATURES.webglRenderers) {
      if (webglRenderer.includes(renderer)) {
        signals.push(`Emulator/VM graphics detected: ${renderer}`);
        emulatorScore += 35;
        break;
      }
    }

    // Check for inconsistent platform/device combination
    if (deviceInfo.platform === DevicePlatform.ANDROID || deviceInfo.platform === DevicePlatform.IOS) {
      // Mobile platform but desktop-like characteristics
      if (data.maxTouchPoints === 0 && !data.userAgent.toLowerCase().includes('tablet')) {
        signals.push('Mobile platform without touch support');
        emulatorScore += 25;
      }
    }

    // Check for generic/missing device info on mobile
    if (deviceInfo.platform !== DevicePlatform.WEB) {
      if (!data.deviceModel || data.deviceModel.toLowerCase() === 'unknown') {
        signals.push('Missing device model on mobile platform');
        emulatorScore += 20;
      }
    }

    const confidence = Math.min(emulatorScore / 100, 1);
    const isEmulator = emulatorScore >= 50;

    return { isEmulator, confidence, signals };
  }

  /**
   * Calculate trust score for a device (internal method)
   */
  private async calculateTrustScoreInternal(
    existingDevice: any,
    userId: string | undefined,
    botDetection: { isBot: boolean; confidence: number },
    emulatorDetection: { isEmulator: boolean; confidence: number },
    isNewDevice: boolean,
  ): Promise<{ score: number; factors: TrustScoreFactors }> {
    const factors: TrustScoreFactors = {
      baseScore: 50,
      deviceAgeBonus: 0,
      successfulLoginsBonus: 0,
      verificationBonus: 0,
      consistentLocationBonus: 0,
      botPenalty: 0,
      emulatorPenalty: 0,
      suspiciousActivityPenalty: 0,
      failedLoginsPenalty: 0,
      multiUserPenalty: 0,
      fraudIncidentPenalty: 0,
    };

    if (isNewDevice) {
      // New devices start with lower trust
      factors.baseScore = 30;
    } else if (existingDevice) {
      // Calculate bonuses for existing devices
      const deviceAgeDays = Math.floor(
        (Date.now() - new Date(existingDevice.firstSeenAt).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Device age bonus (max 15 points for 90+ days)
      factors.deviceAgeBonus = Math.min(15, Math.floor(deviceAgeDays / 6));

      // Successful logins bonus (max 15 points)
      factors.successfulLoginsBonus = Math.min(15, existingDevice.loginCount);

      // Already trusted device bonus
      if (existingDevice.isTrusted) {
        factors.verificationBonus = 10;
      }

      // Penalty for failed logins
      if (existingDevice.failedLoginCount > 5) {
        factors.failedLoginsPenalty = -Math.min(20, existingDevice.failedLoginCount * 2);
      }

      // Penalty for suspicious activity
      if (existingDevice.suspiciousActivityCount > 0) {
        factors.suspiciousActivityPenalty = -Math.min(30, existingDevice.suspiciousActivityCount * 10);
      }

      // Penalty for multiple users (potential shared/compromised device)
      if (existingDevice.associatedUserIds && existingDevice.associatedUserIds.length > 3) {
        factors.multiUserPenalty = -Math.min(20, (existingDevice.associatedUserIds.length - 3) * 5);
      }

      // Major penalty for fraud incidents
      if (existingDevice.fraudIncidents && existingDevice.fraudIncidents.length > 0) {
        factors.fraudIncidentPenalty = -Math.min(50, existingDevice.fraudIncidents.length * 25);
      }
    }

    // Bot penalty
    if (botDetection.isBot) {
      factors.botPenalty = -Math.floor(50 * botDetection.confidence);
    }

    // Emulator penalty (less severe than bot)
    if (emulatorDetection.isEmulator) {
      factors.emulatorPenalty = -Math.floor(30 * emulatorDetection.confidence);
    }

    // Check user-device association if user is provided
    if (userId && !isNewDevice) {
      const association = await this.prisma.userDeviceAssociation.findUnique({
        where: {
          userId_fingerprintHash: {
            userId,
            fingerprintHash: existingDevice.fingerprintHash,
          },
        },
      });

      if (association) {
        // Bonus for verified device
        if (association.isVerified) {
          factors.verificationBonus += 15;
        }

        // Bonus for consistent usage
        if (association.useCount > 10) {
          factors.consistentLocationBonus = Math.min(10, Math.floor(association.useCount / 5));
        }
      }
    }

    // Calculate final score
    const totalScore =
      factors.baseScore +
      factors.deviceAgeBonus +
      factors.successfulLoginsBonus +
      factors.verificationBonus +
      factors.consistentLocationBonus +
      factors.botPenalty +
      factors.emulatorPenalty +
      factors.suspiciousActivityPenalty +
      factors.failedLoginsPenalty +
      factors.multiUserPenalty +
      factors.fraudIncidentPenalty;

    // Clamp between 0 and 100
    const score = Math.max(0, Math.min(100, totalScore));

    return { score, factors };
  }

  /**
   * Determine risk level based on trust score and detection results
   */
  private determineRiskLevel(
    trustScore: number,
    botDetection: { isBot: boolean; confidence: number },
    emulatorDetection: { isEmulator: boolean; confidence: number },
  ): 'low' | 'medium' | 'high' | 'critical' {
    // Confirmed bot is always critical
    if (botDetection.isBot && botDetection.confidence >= 0.8) {
      return 'critical';
    }

    // Very low trust score
    if (trustScore < 20) {
      return 'critical';
    }

    // Likely bot or very low trust
    if (botDetection.isBot || trustScore < 35) {
      return 'high';
    }

    // Emulator detected or low trust
    if (emulatorDetection.isEmulator || trustScore < 50) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Create a new device fingerprint record
   */
  private async createDeviceFingerprint(
    fingerprintHash: string,
    data: DeviceFingerprintData,
    deviceInfo: DeviceFingerprintValidationResult['deviceInfo'],
    botDetection: { isBot: boolean; confidence: number; signals: string[] },
    emulatorDetection: { isEmulator: boolean; confidence: number; signals: string[] },
    trustScore: number,
    riskLevel: string,
    userId?: string,
    ipAddress?: string,
  ) {
    const components = {
      canvas: data.canvas,
      webgl: data.webgl,
      audio: data.audio,
      fonts: data.fonts,
      plugins: data.plugins,
      colorDepth: data.colorDepth,
      hardwareConcurrency: data.hardwareConcurrency,
      deviceMemory: data.deviceMemory,
      maxTouchPoints: data.maxTouchPoints,
      webglVendor: data.webglVendor,
      webglRenderer: data.webglRenderer,
    };

    return this.prisma.deviceFingerprint.create({
      data: {
        fingerprintHash,
        components,
        platform: deviceInfo.platform,
        browserFamily: deviceInfo.browserFamily,
        browserVersion: deviceInfo.browserVersion,
        osFamily: deviceInfo.osFamily,
        osVersion: deviceInfo.osVersion,
        deviceType: deviceInfo.deviceType,
        screenResolution: data.screenResolution,
        timezone: data.timezone,
        language: data.language,
        trustScore,
        riskLevel,
        isTrusted: trustScore >= 70,
        isBot: botDetection.isBot,
        isEmulator: emulatorDetection.isEmulator,
        botConfidence: botDetection.confidence,
        detectionSignals: [...botDetection.signals, ...emulatorDetection.signals],
        associatedUserIds: userId ? [userId] : [],
        ipAddresses: ipAddress ? [ipAddress] : [],
        loginCount: 1,
      },
    });
  }

  /**
   * Update an existing device fingerprint record
   */
  private async updateDeviceFingerprint(
    fingerprintHash: string,
    trustScore: number,
    riskLevel: string,
    botDetection: { isBot: boolean; confidence: number; signals: string[] },
    emulatorDetection: { isEmulator: boolean; confidence: number; signals: string[] },
    userId?: string,
    ipAddress?: string,
  ) {
    const updateData: any = {
      lastSeenAt: new Date(),
      trustScore,
      riskLevel,
      isTrusted: trustScore >= 70,
      isBot: botDetection.isBot,
      isEmulator: emulatorDetection.isEmulator,
      botConfidence: botDetection.confidence,
      detectionSignals: [...botDetection.signals, ...emulatorDetection.signals],
      loginCount: { increment: 1 },
    };

    // Add user ID to association if not already present
    if (userId) {
      const existing = await this.prisma.deviceFingerprint.findUnique({
        where: { fingerprintHash },
        select: { associatedUserIds: true },
      });

      if (existing && !existing.associatedUserIds.includes(userId)) {
        updateData.associatedUserIds = {
          push: userId,
        };
      }
    }

    // Add IP address if not already present
    if (ipAddress) {
      const existing = await this.prisma.deviceFingerprint.findUnique({
        where: { fingerprintHash },
        select: { ipAddresses: true },
      });

      if (existing && !existing.ipAddresses.includes(ipAddress)) {
        // Keep only last 20 IP addresses
        const updatedIps = [...existing.ipAddresses, ipAddress].slice(-20);
        updateData.ipAddresses = updatedIps;
      }
    }

    return this.prisma.deviceFingerprint.update({
      where: { fingerprintHash },
      data: updateData,
    });
  }

  /**
   * Update or create user-device association
   */
  private async updateUserDeviceAssociation(
    userId: string,
    fingerprintHash: string,
    ipAddress?: string,
  ) {
    const existingAssociation = await this.prisma.userDeviceAssociation.findUnique({
      where: {
        userId_fingerprintHash: {
          userId,
          fingerprintHash,
        },
      },
    });

    if (existingAssociation) {
      // Update existing association
      await this.prisma.userDeviceAssociation.update({
        where: {
          userId_fingerprintHash: {
            userId,
            fingerprintHash,
          },
        },
        data: {
          lastUsedAt: new Date(),
          useCount: { increment: 1 },
          lastIpAddress: ipAddress,
          // Upgrade trust level based on usage
          trustLevel: existingAssociation.useCount >= 10
            ? 'trusted'
            : existingAssociation.useCount >= 3
              ? 'recognized'
              : 'new',
        },
      });
    } else {
      // Create new association
      await this.prisma.userDeviceAssociation.create({
        data: {
          userId,
          fingerprintHash,
          trustLevel: 'new',
          lastIpAddress: ipAddress,
        },
      });
    }
  }

  /**
   * Record a successful login for a device
   */
  async recordSuccessfulLogin(
    fingerprintHash: string,
    userId: string,
    ipAddress?: string,
  ): Promise<void> {
    // Update device fingerprint
    await this.prisma.deviceFingerprint.update({
      where: { fingerprintHash },
      data: {
        lastSeenAt: new Date(),
        loginCount: { increment: 1 },
      },
    });

    // Update user-device association
    await this.prisma.userDeviceAssociation.updateMany({
      where: {
        userId,
        fingerprintHash,
      },
      data: {
        lastUsedAt: new Date(),
        useCount: { increment: 1 },
        successfulLogins: { increment: 1 },
        lastIpAddress: ipAddress,
      },
    });
  }

  /**
   * Record a failed login attempt for a device
   */
  async recordFailedLogin(
    fingerprintHash: string,
    userId?: string,
    ipAddress?: string,
  ): Promise<void> {
    // Update device fingerprint
    await this.prisma.deviceFingerprint.update({
      where: { fingerprintHash },
      data: {
        lastSeenAt: new Date(),
        failedLoginCount: { increment: 1 },
      },
    });

    // Update user-device association if user is known
    if (userId) {
      await this.prisma.userDeviceAssociation.updateMany({
        where: {
          userId,
          fingerprintHash,
        },
        data: {
          lastUsedAt: new Date(),
          failedLogins: { increment: 1 },
          lastIpAddress: ipAddress,
        },
      });
    }
  }

  /**
   * Record suspicious activity for a device
   */
  async recordSuspiciousActivity(
    fingerprintHash: string,
    activityType: string,
    description: string,
    userId?: string,
    ipAddress?: string,
    evidence?: any,
  ): Promise<void> {
    // Update device suspicious activity count
    await this.prisma.deviceFingerprint.update({
      where: { fingerprintHash },
      data: {
        suspiciousActivityCount: { increment: 1 },
      },
    });

    // Create fraud incident
    await this.prisma.deviceFraudIncident.create({
      data: {
        fingerprintHash,
        userId,
        incidentType: activityType,
        severity: 'medium',
        description,
        evidence,
        ipAddress,
      },
    });
  }

  /**
   * Block a device
   */
  async blockDevice(
    fingerprintHash: string,
    reason: string,
    userId?: string,
    evidence?: any,
  ): Promise<void> {
    await this.prisma.deviceFingerprint.update({
      where: { fingerprintHash },
      data: {
        isBlocked: true,
        blockReason: reason,
        trustScore: 0,
        riskLevel: 'critical',
      },
    });

    // Create fraud incident
    await this.prisma.deviceFraudIncident.create({
      data: {
        fingerprintHash,
        userId,
        incidentType: 'device_blocked',
        severity: 'critical',
        description: `Device blocked: ${reason}`,
        evidence,
      },
    });

    this.logger.warn(`Device blocked: ${fingerprintHash} - Reason: ${reason}`);
  }

  /**
   * Unblock a device
   */
  async unblockDevice(
    fingerprintHash: string,
    resolvedBy: string,
    resolution: string,
  ): Promise<void> {
    await this.prisma.deviceFingerprint.update({
      where: { fingerprintHash },
      data: {
        isBlocked: false,
        blockReason: null,
        trustScore: 30, // Reset to cautious trust level
        riskLevel: 'medium',
      },
    });

    // Resolve all open fraud incidents for this device
    await this.prisma.deviceFraudIncident.updateMany({
      where: {
        fingerprintHash,
        status: { not: 'resolved' },
      },
      data: {
        status: 'resolved',
        resolvedAt: new Date(),
        resolvedBy,
        resolution,
      },
    });

    this.logger.log(`Device unblocked: ${fingerprintHash} - Resolution: ${resolution}`);
  }

  /**
   * Get device trust score for a user
   */
  async getDeviceTrustForUser(
    userId: string,
    fingerprintHash: string,
  ): Promise<{
    trustScore: number;
    trustLevel: string;
    isKnownDevice: boolean;
    isVerified: boolean;
    deviceAge: number;
    useCount: number;
  }> {
    const device = await this.prisma.deviceFingerprint.findUnique({
      where: { fingerprintHash },
    });

    const association = await this.prisma.userDeviceAssociation.findUnique({
      where: {
        userId_fingerprintHash: {
          userId,
          fingerprintHash,
        },
      },
    });

    if (!device) {
      return {
        trustScore: 0,
        trustLevel: 'unknown',
        isKnownDevice: false,
        isVerified: false,
        deviceAge: 0,
        useCount: 0,
      };
    }

    const deviceAge = Math.floor(
      (Date.now() - new Date(device.firstSeenAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      trustScore: device.trustScore,
      trustLevel: association?.trustLevel || 'unknown',
      isKnownDevice: !!association,
      isVerified: association?.isVerified || false,
      deviceAge,
      useCount: association?.useCount || 0,
    };
  }

  /**
   * Verify a device for a user (e.g., after email/SMS verification)
   */
  async verifyDevice(
    userId: string,
    fingerprintHash: string,
    verificationMethod: string,
  ): Promise<void> {
    await this.prisma.userDeviceAssociation.update({
      where: {
        userId_fingerprintHash: {
          userId,
          fingerprintHash,
        },
      },
      data: {
        isVerified: true,
        verifiedAt: new Date(),
        verificationMethod,
        trustLevel: 'trusted',
      },
    });

    // Also update device trust score
    await this.prisma.deviceFingerprint.update({
      where: { fingerprintHash },
      data: {
        isTrusted: true,
        trustScore: { increment: 15 },
      },
    });
  }

  /**
   * Get all devices for a user
   */
  async getUserDevices(userId: string): Promise<any[]> {
    const associations = await this.prisma.userDeviceAssociation.findMany({
      where: { userId },
      orderBy: { lastUsedAt: 'desc' },
    });

    const devices = await Promise.all(
      associations.map(async (assoc) => {
        const device = await this.prisma.deviceFingerprint.findUnique({
          where: { fingerprintHash: assoc.fingerprintHash },
        });

        return {
          fingerprintHash: assoc.fingerprintHash,
          deviceNickname: assoc.deviceNickname,
          trustLevel: assoc.trustLevel,
          isVerified: assoc.isVerified,
          firstUsedAt: assoc.firstUsedAt,
          lastUsedAt: assoc.lastUsedAt,
          useCount: assoc.useCount,
          lastIpAddress: assoc.lastIpAddress,
          platform: device?.platform,
          browserFamily: device?.browserFamily,
          osFamily: device?.osFamily,
          deviceType: device?.deviceType,
          isBot: device?.isBot,
          isEmulator: device?.isEmulator,
        };
      })
    );

    return devices;
  }

  /**
   * Remove a device from user's trusted devices
   */
  async removeUserDevice(userId: string, fingerprintHash: string): Promise<void> {
    await this.prisma.userDeviceAssociation.delete({
      where: {
        userId_fingerprintHash: {
          userId,
          fingerprintHash,
        },
      },
    });

    // Remove user from device's associated users
    const device = await this.prisma.deviceFingerprint.findUnique({
      where: { fingerprintHash },
      select: { associatedUserIds: true },
    });

    if (device) {
      const updatedUserIds = device.associatedUserIds.filter(id => id !== userId);
      await this.prisma.deviceFingerprint.update({
        where: { fingerprintHash },
        data: { associatedUserIds: updatedUserIds },
      });
    }
  }

  /**
   * Calculate trust score for a device fingerprint
   * Returns 0-100 score based on device history and risk indicators
   */
  async calculateTrustScore(
    fingerprint: DeviceFingerprintData,
    userId?: string,
  ): Promise<DeviceTrustScoreResult> {
    this.logger.log('Calculating trust score for device');

    // Generate fingerprint hash
    const fingerprintHash = this.generateFingerprintHash(fingerprint);

    // Look up existing device
    const existingDevice = await this.prisma.deviceFingerprint.findUnique({
      where: { fingerprintHash },
      include: {
        fraudIncidents: {
          where: { status: { not: 'resolved' } },
        },
      },
    });

    const isNewDevice = !existingDevice;
    const deviceInfo = this.parseUserAgent(fingerprint.userAgent, fingerprint.platform);
    const botDetection = this.detectBot(fingerprint);
    const emulatorDetection = this.detectEmulator(fingerprint, deviceInfo);

    // Calculate trust score using internal method
    const { score, factors } = await this.calculateTrustScoreInternal(
      existingDevice,
      userId,
      botDetection,
      emulatorDetection,
      isNewDevice,
    );

    // Determine risk indicators
    const riskIndicators: string[] = [];
    if (botDetection.isBot) riskIndicators.push(...botDetection.signals);
    if (emulatorDetection.isEmulator) riskIndicators.push(...emulatorDetection.signals);
    if (existingDevice?.fraudIncidents && existingDevice.fraudIncidents.length > 0) {
      riskIndicators.push(`${existingDevice.fraudIncidents.length} unresolved fraud incidents`);
    }
    if (existingDevice?.associatedUserIds && existingDevice.associatedUserIds.length > 5) {
      riskIndicators.push('Device associated with multiple users');
    }

    return {
      fingerprintHash,
      trustScore: score,
      riskIndicators,
      isBot: botDetection.isBot,
      isEmulator: emulatorDetection.isEmulator,
      isProxy: false, // Would require IP intelligence service
      isVpn: false, // Would require IP intelligence service
      isTor: false, // Would require IP intelligence service
      firstSeenAt: existingDevice?.firstSeenAt || new Date(),
      lastSeenAt: existingDevice?.lastSeenAt || new Date(),
      associatedUsers: existingDevice?.associatedUserIds || [],
      loginCount: existingDevice?.loginCount || 0,
      fraudReportCount: existingDevice?.fraudIncidents?.length || 0,
      factors,
    };
  }

  /**
   * Get device history including all activity and associations
   */
  async getDeviceHistory(fingerprintHash: string): Promise<DeviceHistoryResult> {
    this.logger.log(`Getting device history for: ${fingerprintHash}`);

    const device = await this.prisma.deviceFingerprint.findUnique({
      where: { fingerprintHash },
      include: {
        fraudIncidents: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!device) {
      return {
        fingerprintHash,
        exists: false,
        device: null,
        userAssociations: [],
        fraudIncidents: [],
        ipAddresses: [],
        activityTimeline: [],
      };
    }

    // Get all user associations
    const userAssociations = await this.prisma.userDeviceAssociation.findMany({
      where: { fingerprintHash },
      orderBy: { lastUsedAt: 'desc' },
    });

    // Build activity timeline from available data
    const activityTimeline: DeviceActivityEvent[] = [];

    // Add device creation event
    activityTimeline.push({
      timestamp: device.firstSeenAt,
      eventType: 'device_first_seen',
      description: 'Device first detected',
    });

    // Add user association events
    for (const assoc of userAssociations) {
      activityTimeline.push({
        timestamp: assoc.firstUsedAt,
        eventType: 'user_associated',
        description: `Associated with user`,
        userId: assoc.userId,
      });
      if (assoc.isVerified && assoc.verifiedAt) {
        activityTimeline.push({
          timestamp: assoc.verifiedAt,
          eventType: 'device_verified',
          description: `Device verified via ${assoc.verificationMethod}`,
          userId: assoc.userId,
        });
      }
    }

    // Add fraud incidents to timeline
    for (const incident of device.fraudIncidents) {
      activityTimeline.push({
        timestamp: incident.createdAt,
        eventType: 'fraud_incident',
        description: `${incident.incidentType}: ${incident.description}`,
        severity: incident.severity,
        userId: incident.userId || undefined,
      });
      if (incident.resolvedAt) {
        activityTimeline.push({
          timestamp: incident.resolvedAt,
          eventType: 'incident_resolved',
          description: `Incident resolved: ${incident.resolution}`,
        });
      }
    }

    // Sort timeline by timestamp descending
    activityTimeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return {
      fingerprintHash,
      exists: true,
      device: {
        id: device.id,
        platform: device.platform,
        browserFamily: device.browserFamily,
        browserVersion: device.browserVersion,
        osFamily: device.osFamily,
        osVersion: device.osVersion,
        deviceType: device.deviceType,
        screenResolution: device.screenResolution,
        timezone: device.timezone,
        language: device.language,
        trustScore: device.trustScore,
        riskLevel: device.riskLevel,
        isTrusted: device.isTrusted,
        isBlocked: device.isBlocked,
        blockReason: device.blockReason,
        isBot: device.isBot,
        isEmulator: device.isEmulator,
        botConfidence: device.botConfidence,
        loginCount: device.loginCount,
        transactionCount: device.transactionCount,
        failedLoginCount: device.failedLoginCount,
        suspiciousActivityCount: device.suspiciousActivityCount,
        firstSeenAt: device.firstSeenAt,
        lastSeenAt: device.lastSeenAt,
      },
      userAssociations: userAssociations.map(assoc => ({
        userId: assoc.userId,
        trustLevel: assoc.trustLevel,
        deviceNickname: assoc.deviceNickname,
        isVerified: assoc.isVerified,
        verifiedAt: assoc.verifiedAt,
        verificationMethod: assoc.verificationMethod,
        firstUsedAt: assoc.firstUsedAt,
        lastUsedAt: assoc.lastUsedAt,
        useCount: assoc.useCount,
        successfulLogins: assoc.successfulLogins,
        failedLogins: assoc.failedLogins,
        lastIpAddress: assoc.lastIpAddress,
      })),
      fraudIncidents: device.fraudIncidents.map(incident => ({
        id: incident.id,
        incidentType: incident.incidentType,
        severity: incident.severity,
        description: incident.description,
        status: incident.status,
        createdAt: incident.createdAt,
        resolvedAt: incident.resolvedAt,
        resolution: incident.resolution,
      })),
      ipAddresses: device.ipAddresses,
      activityTimeline,
    };
  }

  /**
   * Link a device to a user (creates or updates association)
   */
  async linkDeviceToUser(
    fingerprintHash: string,
    userId: string,
    options?: {
      ipAddress?: string;
      deviceNickname?: string;
      markAsVerified?: boolean;
      verificationMethod?: string;
    },
  ): Promise<{
    success: boolean;
    isNewAssociation: boolean;
    trustLevel: string;
  }> {
    this.logger.log(`Linking device ${fingerprintHash} to user ${userId}`);

    // Check if device exists
    const device = await this.prisma.deviceFingerprint.findUnique({
      where: { fingerprintHash },
    });

    if (!device) {
      throw new Error(`Device with fingerprint ${fingerprintHash} not found`);
    }

    // Check for existing association
    const existingAssociation = await this.prisma.userDeviceAssociation.findUnique({
      where: {
        userId_fingerprintHash: {
          userId,
          fingerprintHash,
        },
      },
    });

    const isNewAssociation = !existingAssociation;

    if (isNewAssociation) {
      // Create new association
      const newAssociation = await this.prisma.userDeviceAssociation.create({
        data: {
          userId,
          fingerprintHash,
          trustLevel: options?.markAsVerified ? 'trusted' : 'new',
          deviceNickname: options?.deviceNickname,
          isVerified: options?.markAsVerified || false,
          verifiedAt: options?.markAsVerified ? new Date() : null,
          verificationMethod: options?.verificationMethod,
          lastIpAddress: options?.ipAddress,
        },
      });

      // Add user to device's associated users if not already present
      if (!device.associatedUserIds.includes(userId)) {
        await this.prisma.deviceFingerprint.update({
          where: { fingerprintHash },
          data: {
            associatedUserIds: {
              push: userId,
            },
          },
        });
      }

      return {
        success: true,
        isNewAssociation: true,
        trustLevel: newAssociation.trustLevel,
      };
    } else {
      // Update existing association
      const updateData: any = {
        lastUsedAt: new Date(),
        useCount: { increment: 1 },
      };

      if (options?.ipAddress) {
        updateData.lastIpAddress = options.ipAddress;
      }
      if (options?.deviceNickname) {
        updateData.deviceNickname = options.deviceNickname;
      }
      if (options?.markAsVerified) {
        updateData.isVerified = true;
        updateData.verifiedAt = new Date();
        updateData.verificationMethod = options.verificationMethod;
        updateData.trustLevel = 'trusted';
      }

      const updatedAssociation = await this.prisma.userDeviceAssociation.update({
        where: {
          userId_fingerprintHash: {
            userId,
            fingerprintHash,
          },
        },
        data: updateData,
      });

      return {
        success: true,
        isNewAssociation: false,
        trustLevel: updatedAssociation.trustLevel,
      };
    }
  }

  /**
   * Detect anomalies in device behavior for a specific user
   */
  async detectAnomalies(
    fingerprint: DeviceFingerprintData,
    userId: string,
  ): Promise<DeviceAnomalyResult> {
    this.logger.log(`Detecting anomalies for user ${userId}`);

    const anomalies: DeviceAnomaly[] = [];
    let anomalyScore = 0;

    const fingerprintHash = this.generateFingerprintHash(fingerprint);
    const deviceInfo = this.parseUserAgent(fingerprint.userAgent, fingerprint.platform);

    // Get device and user association
    const device = await this.prisma.deviceFingerprint.findUnique({
      where: { fingerprintHash },
    });

    const association = await this.prisma.userDeviceAssociation.findUnique({
      where: {
        userId_fingerprintHash: {
          userId,
          fingerprintHash,
        },
      },
    });

    // Get user's device history
    const userDevices = await this.prisma.userDeviceAssociation.findMany({
      where: { userId },
      orderBy: { lastUsedAt: 'desc' },
    });

    // Anomaly 1: New device for established user
    if (!association && userDevices.length > 0) {
      anomalies.push({
        type: 'new_device',
        severity: 'medium',
        description: 'Login from a new device not previously associated with this user',
        score: 25,
      });
      anomalyScore += 25;
    }

    // Anomaly 2: Device is associated with many users
    if (device && device.associatedUserIds.length > 5) {
      anomalies.push({
        type: 'multi_user_device',
        severity: 'high',
        description: `Device is associated with ${device.associatedUserIds.length} different users`,
        score: 35,
      });
      anomalyScore += 35;
    }

    // Anomaly 3: Device has previous fraud incidents
    if (device) {
      const openIncidents = await this.prisma.deviceFraudIncident.count({
        where: {
          fingerprintHash,
          status: { not: 'resolved' },
        },
      });
      if (openIncidents > 0) {
        anomalies.push({
          type: 'fraud_history',
          severity: 'critical',
          description: `Device has ${openIncidents} unresolved fraud incidents`,
          score: 50,
        });
        anomalyScore += 50;
      }
    }

    // Anomaly 4: Platform mismatch (user usually uses different platform)
    if (userDevices.length >= 3) {
      const platforms = await Promise.all(
        userDevices.slice(0, 5).map(async (assoc) => {
          const d = await this.prisma.deviceFingerprint.findUnique({
            where: { fingerprintHash: assoc.fingerprintHash },
            select: { platform: true },
          });
          return d?.platform;
        }),
      );
      const mostCommonPlatform = this.getMostCommon(platforms.filter(p => p));
      if (mostCommonPlatform && deviceInfo.platform !== mostCommonPlatform) {
        anomalies.push({
          type: 'platform_change',
          severity: 'low',
          description: `User typically uses ${mostCommonPlatform}, now using ${deviceInfo.platform}`,
          score: 10,
        });
        anomalyScore += 10;
      }
    }

    // Anomaly 5: Timezone mismatch (if user has consistent timezone)
    if (association && fingerprint.timezone) {
      const lastLocation = association.lastLocation as any;
      if (lastLocation?.timezone && lastLocation.timezone !== fingerprint.timezone) {
        anomalies.push({
          type: 'timezone_change',
          severity: 'low',
          description: `Timezone changed from ${lastLocation.timezone} to ${fingerprint.timezone}`,
          score: 15,
        });
        anomalyScore += 15;
      }
    }

    // Anomaly 6: Bot/emulator detection
    const botDetection = this.detectBot(fingerprint);
    const emulatorDetection = this.detectEmulator(fingerprint, deviceInfo);

    if (botDetection.isBot) {
      anomalies.push({
        type: 'bot_detected',
        severity: 'critical',
        description: `Bot activity detected: ${botDetection.signals.slice(0, 3).join(', ')}`,
        score: 60,
      });
      anomalyScore += 60;
    }

    if (emulatorDetection.isEmulator) {
      anomalies.push({
        type: 'emulator_detected',
        severity: 'high',
        description: `Emulator detected: ${emulatorDetection.signals.slice(0, 3).join(', ')}`,
        score: 40,
      });
      anomalyScore += 40;
    }

    // Anomaly 7: Device blocked
    if (device?.isBlocked) {
      anomalies.push({
        type: 'blocked_device',
        severity: 'critical',
        description: `Device is blocked: ${device.blockReason}`,
        score: 100,
      });
      anomalyScore += 100;
    }

    // Anomaly 8: High failed login count
    if (device && device.failedLoginCount > 10) {
      anomalies.push({
        type: 'high_failed_logins',
        severity: 'high',
        description: `Device has ${device.failedLoginCount} failed login attempts`,
        score: 30,
      });
      anomalyScore += 30;
    }

    // Determine overall risk
    const riskLevel: 'low' | 'medium' | 'high' | 'critical' =
      anomalyScore >= 80 ? 'critical' :
      anomalyScore >= 50 ? 'high' :
      anomalyScore >= 25 ? 'medium' :
      'low';

    // Generate recommendations based on anomalies
    const recommendations: string[] = [];
    if (riskLevel === 'critical') {
      recommendations.push('Block this login attempt');
      recommendations.push('Require identity verification');
      recommendations.push('Alert security team');
    } else if (riskLevel === 'high') {
      recommendations.push('Require MFA verification');
      recommendations.push('Send security notification to user');
    } else if (riskLevel === 'medium') {
      recommendations.push('Request additional verification');
      recommendations.push('Monitor session closely');
    } else if (anomalies.some(a => a.type === 'new_device')) {
      recommendations.push('Send new device notification');
    }

    return {
      userId,
      fingerprintHash,
      anomalyScore,
      riskLevel,
      anomalies,
      recommendations,
      shouldBlock: anomalyScore >= 80,
      requireMfa: anomalyScore >= 40,
      requireVerification: anomalyScore >= 25,
    };
  }

  /**
   * Check if a device is suspicious (bot, emulator, proxy, or has fraud history)
   */
  async isSuspiciousDevice(fingerprint: DeviceFingerprintData): Promise<{
    isSuspicious: boolean;
    suspicionLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
    reasons: string[];
    details: {
      isBot: boolean;
      botConfidence: number;
      botSignals: string[];
      isEmulator: boolean;
      emulatorConfidence: number;
      emulatorSignals: string[];
      isBlocked: boolean;
      blockReason?: string;
      hasFraudHistory: boolean;
      fraudIncidentCount: number;
    };
  }> {
    this.logger.log('Checking if device is suspicious');

    const reasons: string[] = [];
    let suspicionScore = 0;

    const fingerprintHash = this.generateFingerprintHash(fingerprint);
    const deviceInfo = this.parseUserAgent(fingerprint.userAgent, fingerprint.platform);

    // Check for bot
    const botDetection = this.detectBot(fingerprint);
    if (botDetection.isBot) {
      reasons.push(`Bot detected (${Math.round(botDetection.confidence * 100)}% confidence)`);
      suspicionScore += 50 * botDetection.confidence;
    }

    // Check for emulator
    const emulatorDetection = this.detectEmulator(fingerprint, deviceInfo);
    if (emulatorDetection.isEmulator) {
      reasons.push(`Emulator detected (${Math.round(emulatorDetection.confidence * 100)}% confidence)`);
      suspicionScore += 30 * emulatorDetection.confidence;
    }

    // Check existing device record
    const device = await this.prisma.deviceFingerprint.findUnique({
      where: { fingerprintHash },
      include: {
        fraudIncidents: {
          where: { status: { not: 'resolved' } },
        },
      },
    });

    let isBlocked = false;
    let blockReason: string | undefined;
    let fraudIncidentCount = 0;

    if (device) {
      // Check if blocked
      if (device.isBlocked) {
        isBlocked = true;
        blockReason = device.blockReason || 'Device is blocked';
        reasons.push(`Device is blocked: ${blockReason}`);
        suspicionScore += 100;
      }

      // Check fraud history
      fraudIncidentCount = device.fraudIncidents.length;
      if (fraudIncidentCount > 0) {
        reasons.push(`Device has ${fraudIncidentCount} unresolved fraud incidents`);
        suspicionScore += 20 * Math.min(fraudIncidentCount, 5);
      }

      // Check suspicious activity count
      if (device.suspiciousActivityCount > 0) {
        reasons.push(`Device has ${device.suspiciousActivityCount} suspicious activities recorded`);
        suspicionScore += 10 * Math.min(device.suspiciousActivityCount, 5);
      }

      // Check low trust score
      if (device.trustScore < 30) {
        reasons.push(`Low trust score: ${device.trustScore}`);
        suspicionScore += 20;
      }
    }

    // Determine suspicion level
    const suspicionLevel: 'none' | 'low' | 'medium' | 'high' | 'critical' =
      suspicionScore >= 80 ? 'critical' :
      suspicionScore >= 50 ? 'high' :
      suspicionScore >= 25 ? 'medium' :
      suspicionScore > 0 ? 'low' :
      'none';

    return {
      isSuspicious: suspicionScore >= 25,
      suspicionLevel,
      reasons,
      details: {
        isBot: botDetection.isBot,
        botConfidence: botDetection.confidence,
        botSignals: botDetection.signals,
        isEmulator: emulatorDetection.isEmulator,
        emulatorConfidence: emulatorDetection.confidence,
        emulatorSignals: emulatorDetection.signals,
        isBlocked,
        blockReason,
        hasFraudHistory: fraudIncidentCount > 0,
        fraudIncidentCount,
      },
    };
  }

  /**
   * Helper to get most common element in array
   */
  private getMostCommon<T>(arr: T[]): T | null {
    if (arr.length === 0) return null;
    const counts = new Map<T, number>();
    for (const item of arr) {
      counts.set(item, (counts.get(item) || 0) + 1);
    }
    let maxCount = 0;
    let mostCommon: T | null = null;
    for (const [item, count] of counts) {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = item;
      }
    }
    return mostCommon;
  }
}

// ============================================
// INTERFACES FOR NEW METHODS
// ============================================

/**
 * Result of trust score calculation
 */
export interface DeviceTrustScoreResult {
  fingerprintHash: string;
  trustScore: number;
  riskIndicators: string[];
  isBot: boolean;
  isEmulator: boolean;
  isProxy: boolean;
  isVpn: boolean;
  isTor: boolean;
  firstSeenAt: Date;
  lastSeenAt: Date;
  associatedUsers: string[];
  loginCount: number;
  fraudReportCount: number;
  factors: TrustScoreFactors;
}

/**
 * Result of device history query
 */
export interface DeviceHistoryResult {
  fingerprintHash: string;
  exists: boolean;
  device: {
    id: string;
    platform: string;
    browserFamily: string | null;
    browserVersion: string | null;
    osFamily: string | null;
    osVersion: string | null;
    deviceType: string | null;
    screenResolution: string | null;
    timezone: string | null;
    language: string | null;
    trustScore: number;
    riskLevel: string;
    isTrusted: boolean;
    isBlocked: boolean;
    blockReason: string | null;
    isBot: boolean;
    isEmulator: boolean;
    botConfidence: number;
    loginCount: number;
    transactionCount: number;
    failedLoginCount: number;
    suspiciousActivityCount: number;
    firstSeenAt: Date;
    lastSeenAt: Date;
  } | null;
  userAssociations: Array<{
    userId: string;
    trustLevel: string;
    deviceNickname: string | null;
    isVerified: boolean;
    verifiedAt: Date | null;
    verificationMethod: string | null;
    firstUsedAt: Date;
    lastUsedAt: Date;
    useCount: number;
    successfulLogins: number;
    failedLogins: number;
    lastIpAddress: string | null;
  }>;
  fraudIncidents: Array<{
    id: string;
    incidentType: string;
    severity: string;
    description: string;
    status: string;
    createdAt: Date;
    resolvedAt: Date | null;
    resolution: string | null;
  }>;
  ipAddresses: string[];
  activityTimeline: DeviceActivityEvent[];
}

/**
 * Activity event in device timeline
 */
export interface DeviceActivityEvent {
  timestamp: Date;
  eventType: string;
  description: string;
  userId?: string;
  severity?: string;
}

/**
 * Result of anomaly detection
 */
export interface DeviceAnomalyResult {
  userId: string;
  fingerprintHash: string;
  anomalyScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  anomalies: DeviceAnomaly[];
  recommendations: string[];
  shouldBlock: boolean;
  requireMfa: boolean;
  requireVerification: boolean;
}

/**
 * Individual anomaly detected
 */
export interface DeviceAnomaly {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  score: number;
}
