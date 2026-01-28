import { Injectable, Logger } from '@nestjs/common';
import { DeviceFingerprintService, DeviceFingerprintData } from './device-fingerprint.service';

interface LoginAttempt {
  userId: string;
  ipAddress: string;
  deviceFingerprint: string;
  location?: { lat: number; lng: number };
  timestamp: string;
  success: boolean;
}

@Injectable()
export class AccountSecurityService {
  private readonly logger = new Logger(AccountSecurityService.name);
  private loginHistory: Map<string, LoginAttempt[]> = new Map();

  constructor(
    private readonly deviceFingerprintService: DeviceFingerprintService,
  ) {}

  async detectAccountTakeover(data: {
    userId: string;
    loginAttempt: {
      ipAddress: string;
      deviceFingerprint: string;
      location?: { lat: number; lng: number };
      timestamp: string;
    };
  }) {
    try {
      this.logger.log(`Analyzing login attempt for user ${data.userId}`);

      // Account takeover detection signals:
      // - Location anomaly (impossible travel)
      // - New device fingerprint
      // - IP address changes
      // - Behavioral changes (typing speed, mouse patterns)
      // - Time of day anomalies
      // - Multiple failed attempts
      // - Credential stuffing patterns

      const suspiciousIndicators = [];
      let threatScore = 0;

      // Get user's login history
      const history = this.loginHistory.get(data.userId) || [];

      // Check for impossible travel
      if (history.length > 0 && data.loginAttempt.location) {
        const lastLogin = history[history.length - 1];
        if (lastLogin.location) {
          const travelDetection = this.detectImpossibleTravel(
            lastLogin.location,
            data.loginAttempt.location,
            new Date(lastLogin.timestamp),
            new Date(data.loginAttempt.timestamp),
          );

          if (travelDetection.isImpossible) {
            suspiciousIndicators.push(
              `Impossible travel: ${travelDetection.distance}km in ${travelDetection.timeDiff} minutes`,
            );
            threatScore += 50;
          }
        }
      }

      // Check for new device
      const knownDevices = history
        .map(h => h.deviceFingerprint)
        .filter((v, i, a) => a.indexOf(v) === i);
      if (
        !knownDevices.includes(data.loginAttempt.deviceFingerprint) &&
        history.length > 0
      ) {
        suspiciousIndicators.push('Login from new device');
        threatScore += 25;
      }

      // Check for IP address change
      const recentIPs = history
        .slice(-5)
        .map(h => h.ipAddress)
        .filter((v, i, a) => a.indexOf(v) === i);
      if (!recentIPs.includes(data.loginAttempt.ipAddress) && history.length > 0) {
        suspiciousIndicators.push('Login from new IP address');
        threatScore += 15;
      }

      // Check for unusual time of access
      const loginHour = new Date(data.loginAttempt.timestamp).getHours();
      const typicalHours = this.getTypicalLoginHours(history);
      if (!typicalHours.includes(loginHour) && typicalHours.length > 0) {
        suspiciousIndicators.push('Login at unusual time');
        threatScore += 10;
      }

      // Check for multiple recent failed attempts
      const recentFailedAttempts = history.filter(
        h =>
          !h.success &&
          new Date(h.timestamp).getTime() > Date.now() - 30 * 60000, // Last 30 minutes
      );
      if (recentFailedAttempts.length >= 3) {
        suspiciousIndicators.push('Multiple recent failed login attempts');
        threatScore += 35;
      }

      // Check for credential stuffing pattern (rapid attempts from different IPs)
      const last10Minutes = history.filter(
        h => new Date(h.timestamp).getTime() > Date.now() - 10 * 60000,
      );
      const uniqueIPs = [...new Set(last10Minutes.map(h => h.ipAddress))];
      if (uniqueIPs.length >= 5) {
        suspiciousIndicators.push('Possible credential stuffing attack');
        threatScore += 60;
      }

      const isAccountTakeover = threatScore >= 50;
      const action =
        threatScore >= 70
          ? 'block'
          : threatScore >= 50
          ? 'challenge'
          : threatScore >= 25
          ? 'mfa_required'
          : 'allow';

      // Record this login attempt
      this.recordLoginAttempt({
        userId: data.userId,
        ipAddress: data.loginAttempt.ipAddress,
        deviceFingerprint: data.loginAttempt.deviceFingerprint,
        location: data.loginAttempt.location,
        timestamp: data.loginAttempt.timestamp,
        success: action !== 'block',
      });

      return {
        success: true,
        userId: data.userId,
        isAccountTakeover,
        threatScore,
        action,
        suspiciousIndicators,
        recommendations:
          action === 'block'
            ? [
                'Block login attempt',
                'Send security alert to user email/SMS',
                'Force password reset',
                'Review recent account activity',
              ]
            : action === 'challenge'
            ? [
                'Require CAPTCHA',
                'Send verification code to registered email/phone',
                'Ask security questions',
              ]
            : action === 'mfa_required'
            ? ['Require multi-factor authentication', 'Log security event']
            : ['Allow with standard monitoring'],
        securityActions: {
          notifyUser: action !== 'allow',
          forcePasswordReset: action === 'block',
          requireMFA: action === 'mfa_required' || action === 'challenge',
          temporaryLock: action === 'block',
          lockDuration: action === 'block' ? 30 : 0, // minutes
        },
      };
    } catch (error) {
      this.logger.error('Account takeover detection failed', error);
      throw error;
    }
  }

  private detectImpossibleTravel(
    location1: { lat: number; lng: number },
    location2: { lat: number; lng: number },
    time1: Date,
    time2: Date,
  ) {
    // Calculate distance using Haversine formula
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(location2.lat - location1.lat);
    const dLng = this.toRad(location2.lng - location1.lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(location1.lat)) *
        Math.cos(this.toRad(location2.lat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    // Calculate time difference in minutes
    const timeDiff = (time2.getTime() - time1.getTime()) / 60000;

    // Average commercial flight speed: ~800 km/h = 13.3 km/min
    // Consider anything requiring > 900 km/h as impossible
    const requiredSpeed = distance / timeDiff; // km/min
    const maxReasonableSpeed = 15; // km/min (900 km/h)

    return {
      distance: Math.round(distance),
      timeDiff: Math.round(timeDiff),
      requiredSpeed: Math.round(requiredSpeed * 60), // km/h
      isImpossible: requiredSpeed > maxReasonableSpeed && distance > 100,
    };
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private getTypicalLoginHours(history: LoginAttempt[]): number[] {
    if (history.length === 0) return [];

    // Get hours from successful logins
    const loginHours = history
      .filter(h => h.success)
      .map(h => new Date(h.timestamp).getHours());

    // Find most common hours
    const hourCounts: Record<number, number> = {};
    loginHours.forEach(hour => {
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    // Return hours that appear at least twice
    return Object.entries(hourCounts)
      .filter(([_, count]) => count >= 2)
      .map(([hour, _]) => parseInt(hour));
  }

  private recordLoginAttempt(attempt: LoginAttempt) {
    const existing = this.loginHistory.get(attempt.userId) || [];
    existing.push(attempt);
    // Keep last 100 login attempts per user
    if (existing.length > 100) {
      existing.shift();
    }
    this.loginHistory.set(attempt.userId, existing);
  }

  /**
   * Detect account takeover with full device fingerprint validation
   */
  async detectAccountTakeoverWithFingerprint(data: {
    userId: string;
    loginAttempt: {
      ipAddress: string;
      deviceFingerprint: DeviceFingerprintData;
      location?: { lat: number; lng: number };
      timestamp: string;
    };
  }) {
    try {
      this.logger.log(`Analyzing login attempt with device fingerprint for user ${data.userId}`);

      const suspiciousIndicators: string[] = [];
      let threatScore = 0;

      // Validate device fingerprint
      const deviceValidation = await this.deviceFingerprintService.validateFingerprint(
        data.loginAttempt.deviceFingerprint,
        data.userId,
        data.loginAttempt.ipAddress,
      );

      // Device-based threat indicators
      if (deviceValidation.isBlocked) {
        suspiciousIndicators.push('Login from blocked device');
        threatScore += 100;
      }
      if (deviceValidation.isBot) {
        suspiciousIndicators.push('Bot activity detected');
        threatScore += 60;
      }
      if (deviceValidation.isEmulator) {
        suspiciousIndicators.push('Emulator/VM detected');
        threatScore += 30;
      }
      if (deviceValidation.isNewDevice) {
        suspiciousIndicators.push('Login from new device');
        threatScore += 20;
      }
      if (deviceValidation.trustScore < 30) {
        suspiciousIndicators.push(`Very low device trust score: ${deviceValidation.trustScore}`);
        threatScore += 25;
      } else if (deviceValidation.trustScore < 50) {
        suspiciousIndicators.push(`Low device trust score: ${deviceValidation.trustScore}`);
        threatScore += 10;
      }

      // Add warnings from device validation
      for (const warning of deviceValidation.warnings) {
        if (!suspiciousIndicators.includes(warning)) {
          suspiciousIndicators.push(warning);
        }
      }

      // Get user's login history for additional checks
      const history = this.loginHistory.get(data.userId) || [];

      // Check for impossible travel
      if (history.length > 0 && data.loginAttempt.location) {
        const lastLogin = history[history.length - 1];
        if (lastLogin.location) {
          const travelDetection = this.detectImpossibleTravel(
            lastLogin.location,
            data.loginAttempt.location,
            new Date(lastLogin.timestamp),
            new Date(data.loginAttempt.timestamp),
          );

          if (travelDetection.isImpossible) {
            suspiciousIndicators.push(
              `Impossible travel: ${travelDetection.distance}km in ${travelDetection.timeDiff} minutes`,
            );
            threatScore += 50;
          }
        }
      }

      // Check for IP address change (only suspicious for new devices)
      if (deviceValidation.isNewDevice) {
        const recentIPs = history
          .slice(-5)
          .map(h => h.ipAddress)
          .filter((v, i, a) => a.indexOf(v) === i);
        if (!recentIPs.includes(data.loginAttempt.ipAddress) && history.length > 0) {
          suspiciousIndicators.push('New device from new IP address');
          threatScore += 10;
        }
      }

      // Check for unusual time of access
      const loginHour = new Date(data.loginAttempt.timestamp).getHours();
      const typicalHours = this.getTypicalLoginHours(history);
      if (!typicalHours.includes(loginHour) && typicalHours.length > 0) {
        suspiciousIndicators.push('Login at unusual time');
        threatScore += 10;
      }

      // Check for multiple recent failed attempts
      const recentFailedAttempts = history.filter(
        h =>
          !h.success &&
          new Date(h.timestamp).getTime() > Date.now() - 30 * 60000,
      );
      if (recentFailedAttempts.length >= 3) {
        suspiciousIndicators.push('Multiple recent failed login attempts');
        threatScore += 35;
      }

      // Check for credential stuffing pattern
      const last10Minutes = history.filter(
        h => new Date(h.timestamp).getTime() > Date.now() - 10 * 60000,
      );
      const uniqueIPs = [...new Set(last10Minutes.map(h => h.ipAddress))];
      if (uniqueIPs.length >= 5) {
        suspiciousIndicators.push('Possible credential stuffing attack');
        threatScore += 60;

        // Record suspicious activity for the device
        await this.deviceFingerprintService.recordSuspiciousActivity(
          deviceValidation.fingerprintHash,
          'credential_stuffing',
          'Multiple IPs detected in short time window',
          data.userId,
          data.loginAttempt.ipAddress,
        );
      }

      const isAccountTakeover = threatScore >= 50;
      const action =
        threatScore >= 70
          ? 'block'
          : threatScore >= 50
          ? 'challenge'
          : threatScore >= 25
          ? 'mfa_required'
          : 'allow';

      // Record this login attempt
      this.recordLoginAttempt({
        userId: data.userId,
        ipAddress: data.loginAttempt.ipAddress,
        deviceFingerprint: deviceValidation.fingerprintHash,
        location: data.loginAttempt.location,
        timestamp: data.loginAttempt.timestamp,
        success: action !== 'block',
      });

      // Update device fingerprint based on result
      if (action === 'block') {
        await this.deviceFingerprintService.recordFailedLogin(
          deviceValidation.fingerprintHash,
          data.userId,
          data.loginAttempt.ipAddress,
        );

        // Record suspicious activity
        await this.deviceFingerprintService.recordSuspiciousActivity(
          deviceValidation.fingerprintHash,
          'account_takeover',
          `Login blocked: ${suspiciousIndicators.join(', ')}`,
          data.userId,
          data.loginAttempt.ipAddress,
          { threatScore, indicators: suspiciousIndicators },
        );
      } else if (action === 'allow') {
        await this.deviceFingerprintService.recordSuccessfulLogin(
          deviceValidation.fingerprintHash,
          data.userId,
          data.loginAttempt.ipAddress,
        );
      }

      return {
        success: true,
        userId: data.userId,
        isAccountTakeover,
        threatScore,
        action,
        suspiciousIndicators,
        deviceValidation: {
          fingerprintHash: deviceValidation.fingerprintHash,
          trustScore: deviceValidation.trustScore,
          riskLevel: deviceValidation.riskLevel,
          isNewDevice: deviceValidation.isNewDevice,
          isBot: deviceValidation.isBot,
          isEmulator: deviceValidation.isEmulator,
          isTrusted: deviceValidation.isTrusted,
          isBlocked: deviceValidation.isBlocked,
        },
        recommendations:
          action === 'block'
            ? [
                'Block login attempt',
                'Send security alert to user email/SMS',
                'Force password reset',
                'Review recent account activity',
              ]
            : action === 'challenge'
            ? [
                'Require CAPTCHA',
                'Send verification code to registered email/phone',
                'Ask security questions',
              ]
            : action === 'mfa_required'
            ? ['Require multi-factor authentication', 'Log security event']
            : deviceValidation.isNewDevice
            ? ['Allow with new device notification to user', 'Log security event']
            : ['Allow with standard monitoring'],
        securityActions: {
          notifyUser: action !== 'allow' || deviceValidation.isNewDevice,
          forcePasswordReset: action === 'block',
          requireMFA: action === 'mfa_required' || action === 'challenge',
          temporaryLock: action === 'block',
          lockDuration: action === 'block' ? 30 : 0,
          deviceVerificationRequired: deviceValidation.isNewDevice && action !== 'block',
        },
      };
    } catch (error) {
      this.logger.error('Account takeover detection with fingerprint failed', error);
      throw error;
    }
  }

  /**
   * Get user's trusted devices
   */
  async getUserTrustedDevices(userId: string) {
    return this.deviceFingerprintService.getUserDevices(userId);
  }

  /**
   * Verify a device for a user after successful verification
   */
  async verifyUserDevice(
    userId: string,
    fingerprintHash: string,
    verificationMethod: string,
  ) {
    return this.deviceFingerprintService.verifyDevice(
      userId,
      fingerprintHash,
      verificationMethod,
    );
  }

  /**
   * Remove a device from user's trusted devices
   */
  async removeUserDevice(userId: string, fingerprintHash: string) {
    return this.deviceFingerprintService.removeUserDevice(userId, fingerprintHash);
  }

  /**
   * Get device trust score for a specific user-device pair
   */
  async getDeviceTrustScore(userId: string, fingerprintHash: string) {
    return this.deviceFingerprintService.getDeviceTrustForUser(userId, fingerprintHash);
  }
}
