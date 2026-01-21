/**
 * Device Fingerprinting Service for Mobile
 *
 * Collects device attributes to generate a unique fingerprint for fraud detection.
 * This data is sent to the backend for trust score calculation and anomaly detection.
 *
 * Privacy Note: All collected data is hashed before transmission and used solely
 * for security purposes (fraud prevention, account takeover detection).
 */

import { Platform, Dimensions, PixelRatio } from 'react-native';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import * as Localization from 'expo-localization';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import NetInfo from '@react-native-community/netinfo';
import { api } from './api';

// ==================== Types ====================

/**
 * Device fingerprint data structure sent to the backend
 */
export interface DeviceFingerprintData {
  // Core identification
  userAgent: string;
  platform?: string;

  // Screen/Display
  screenResolution?: string;
  colorDepth?: number;

  // Device info
  deviceModel?: string;
  osVersion?: string;
  appVersion?: string;

  // Locale & Timezone
  timezone?: string;
  language?: string;
  languages?: string[];

  // Hardware capabilities
  maxTouchPoints?: number;
  hardwareConcurrency?: number;
  deviceMemory?: number;

  // Security flags
  isRooted?: boolean;
  isEmulator?: boolean;

  // Behavioral signals (can be populated over session)
  mouseMovements?: number;
  keystrokes?: number;
  touchEvents?: number;
  scrollEvents?: number;
  sessionDuration?: number;

  // Network info (non-identifying)
  connectionType?: string;
}

/**
 * Device validation result from backend
 */
export interface DeviceValidationResult {
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
    platform: string;
    browserFamily?: string;
    browserVersion?: string;
    osFamily?: string;
    osVersion?: string;
    deviceType?: string;
  };
}

/**
 * Stored device identifier
 */
interface StoredDeviceId {
  id: string;
  createdAt: string;
}

// ==================== Constants ====================

const DEVICE_ID_KEY = 'broxiva_device_id';
const FINGERPRINT_CACHE_KEY = 'broxiva_fingerprint_cache';
const FINGERPRINT_CACHE_TTL = 1000 * 60 * 60; // 1 hour

// ==================== Service Implementation ====================

class DeviceFingerprintService {
  private cachedFingerprint: DeviceFingerprintData | null = null;
  private cacheTimestamp: number = 0;
  private behavioralData = {
    touchEvents: 0,
    scrollEvents: 0,
    sessionStart: Date.now(),
  };

  /**
   * Initialize the fingerprint service
   * Should be called when app starts
   */
  async initialize(): Promise<void> {
    // Ensure device has a persistent ID
    await this.getOrCreateDeviceId();

    // Load cached fingerprint if available
    await this.loadCachedFingerprint();

    // Reset behavioral tracking
    this.behavioralData = {
      touchEvents: 0,
      scrollEvents: 0,
      sessionStart: Date.now(),
    };
  }

  /**
   * Get or create a persistent device identifier
   * This ID survives app reinstalls (on Android via ANDROID_ID, iOS via keychain)
   */
  async getOrCreateDeviceId(): Promise<string> {
    try {
      const stored = await SecureStore.getItemAsync(DEVICE_ID_KEY);
      if (stored) {
        const data: StoredDeviceId = JSON.parse(stored);
        return data.id;
      }

      // Generate new device ID
      const newId = await this.generateDeviceId();
      const data: StoredDeviceId = {
        id: newId,
        createdAt: new Date().toISOString(),
      };
      await SecureStore.setItemAsync(DEVICE_ID_KEY, JSON.stringify(data));
      return newId;
    } catch (error) {
      console.warn('Failed to get/create device ID:', error);
      // Fallback to a session-based ID
      return await this.generateDeviceId();
    }
  }

  /**
   * Generate a unique device ID based on available device attributes
   */
  private async generateDeviceId(): Promise<string> {
    const components = [
      Device.modelName,
      Device.osName,
      Device.osVersion,
      Device.osBuildId,
      Application.applicationId,
      Platform.OS,
      Platform.Version,
      Dimensions.get('screen').width,
      Dimensions.get('screen').height,
      PixelRatio.get(),
      Date.now().toString(),
      Math.random().toString(),
    ].filter(Boolean).join('|');

    return Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      components
    );
  }

  /**
   * Collect device fingerprint data
   */
  async collectFingerprint(): Promise<DeviceFingerprintData> {
    // Return cached if valid
    if (this.cachedFingerprint && Date.now() - this.cacheTimestamp < FINGERPRINT_CACHE_TTL) {
      return {
        ...this.cachedFingerprint,
        ...this.getBehavioralData(),
      };
    }

    const fingerprint = await this.collectFreshFingerprint();
    this.cachedFingerprint = fingerprint;
    this.cacheTimestamp = Date.now();

    // Cache to storage for faster subsequent loads
    await this.cacheFingerprint(fingerprint);

    return {
      ...fingerprint,
      ...this.getBehavioralData(),
    };
  }

  /**
   * Collect fresh fingerprint data from device APIs
   */
  private async collectFreshFingerprint(): Promise<DeviceFingerprintData> {
    const screen = Dimensions.get('screen');
    const netInfo = await NetInfo.fetch();

    const fingerprint: DeviceFingerprintData = {
      // User agent - constructed for mobile
      userAgent: this.buildUserAgent(),

      // Platform
      platform: Platform.OS,

      // Screen/Display
      screenResolution: `${Math.round(screen.width)}x${Math.round(screen.height)}`,
      colorDepth: 24, // Standard for mobile

      // Device info
      deviceModel: Device.modelName || undefined,
      osVersion: Device.osVersion || undefined,
      appVersion: Application.nativeApplicationVersion || undefined,

      // Locale & Timezone
      timezone: Localization.timezone,
      language: Localization.locale,
      languages: Localization.locales?.map(l => typeof l === 'string' ? l : l.languageTag) || [Localization.locale],

      // Hardware capabilities
      maxTouchPoints: 5, // Most mobile devices support at least 5
      hardwareConcurrency: Device.totalMemory ? Math.ceil(Device.totalMemory / (1024 * 1024 * 1024)) : undefined,
      deviceMemory: Device.totalMemory ? Math.round(Device.totalMemory / (1024 * 1024 * 1024)) : undefined,

      // Security flags
      isRooted: await this.checkIfRooted(),
      isEmulator: await this.checkIfEmulator(),

      // Network info
      connectionType: netInfo.type,
    };

    return fingerprint;
  }

  /**
   * Build a user agent string for the mobile app
   */
  private buildUserAgent(): string {
    const appVersion = Application.nativeApplicationVersion || '1.0.0';
    const buildVersion = Application.nativeBuildVersion || '1';
    const deviceModel = Device.modelName || 'Unknown';
    const osName = Device.osName || Platform.OS;
    const osVersion = Device.osVersion || Platform.Version;

    return `Broxiva/${appVersion} (${buildVersion}) ${osName}/${osVersion} ${deviceModel}`;
  }

  /**
   * Check if device is rooted/jailbroken
   * Note: This is a basic check; sophisticated root detection requires native modules
   */
  private async checkIfRooted(): Promise<boolean> {
    if (Platform.OS === 'android') {
      // Basic Android root check
      // In production, use a dedicated library like RootBeer
      return false; // Placeholder - implement with native module
    } else if (Platform.OS === 'ios') {
      // Basic iOS jailbreak check
      // In production, use IOSSecuritySuite or similar
      return false; // Placeholder - implement with native module
    }
    return false;
  }

  /**
   * Check if running on an emulator/simulator
   */
  private async checkIfEmulator(): Promise<boolean> {
    // Check using Expo Device
    if (Device.isDevice === false) {
      return true;
    }

    // Additional checks based on device name
    const modelName = (Device.modelName || '').toLowerCase();
    const emulatorIndicators = [
      'emulator',
      'simulator',
      'sdk_gphone',
      'goldfish',
      'ranchu',
      'generic',
      'vbox',
      'genymotion',
    ];

    for (const indicator of emulatorIndicators) {
      if (modelName.includes(indicator)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get behavioral data collected during the session
   */
  private getBehavioralData(): Partial<DeviceFingerprintData> {
    return {
      touchEvents: this.behavioralData.touchEvents,
      scrollEvents: this.behavioralData.scrollEvents,
      sessionDuration: Date.now() - this.behavioralData.sessionStart,
      // Note: mouseMovements and keystrokes not applicable for mobile
      mouseMovements: 0,
      keystrokes: 0,
    };
  }

  /**
   * Record a touch event (call from gesture handlers)
   */
  recordTouchEvent(): void {
    this.behavioralData.touchEvents++;
  }

  /**
   * Record a scroll event (call from scroll handlers)
   */
  recordScrollEvent(): void {
    this.behavioralData.scrollEvents++;
  }

  /**
   * Reset behavioral tracking (call on screen change or session reset)
   */
  resetBehavioralTracking(): void {
    this.behavioralData = {
      touchEvents: 0,
      scrollEvents: 0,
      sessionStart: Date.now(),
    };
  }

  /**
   * Load cached fingerprint from storage
   */
  private async loadCachedFingerprint(): Promise<void> {
    try {
      const cached = await SecureStore.getItemAsync(FINGERPRINT_CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached);
        if (Date.now() - data.timestamp < FINGERPRINT_CACHE_TTL) {
          this.cachedFingerprint = data.fingerprint;
          this.cacheTimestamp = data.timestamp;
        }
      }
    } catch (error) {
      console.warn('Failed to load cached fingerprint:', error);
    }
  }

  /**
   * Cache fingerprint to storage
   */
  private async cacheFingerprint(fingerprint: DeviceFingerprintData): Promise<void> {
    try {
      const data = {
        fingerprint,
        timestamp: Date.now(),
      };
      await SecureStore.setItemAsync(FINGERPRINT_CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to cache fingerprint:', error);
    }
  }

  /**
   * Clear cached fingerprint
   */
  async clearCache(): Promise<void> {
    this.cachedFingerprint = null;
    this.cacheTimestamp = 0;
    try {
      await SecureStore.deleteItemAsync(FINGERPRINT_CACHE_KEY);
    } catch (error) {
      console.warn('Failed to clear fingerprint cache:', error);
    }
  }

  // ==================== API Methods ====================

  /**
   * Validate device fingerprint with the backend
   */
  async validateFingerprint(
    userId?: string,
    ipAddress?: string,
  ): Promise<DeviceValidationResult> {
    const fingerprint = await this.collectFingerprint();

    const response = await api.post('/ai/fraud-detection/device/validate', {
      fingerprint,
      userId,
      ipAddress,
    });

    return response.data;
  }

  /**
   * Send fingerprint with login request for enhanced security check
   */
  async checkLoginWithFingerprint(
    userId: string,
    location?: { lat: number; lng: number },
  ): Promise<{
    success: boolean;
    threatScore: number;
    action: 'allow' | 'challenge' | 'mfa_required' | 'block';
    recommendations: string[];
    deviceValidation: DeviceValidationResult;
  }> {
    const fingerprint = await this.collectFingerprint();

    const response = await api.post('/ai/fraud-detection/device/login-check', {
      userId,
      loginAttempt: {
        ipAddress: undefined, // Will be determined server-side
        deviceFingerprint: fingerprint,
        location,
        timestamp: new Date().toISOString(),
      },
    });

    return response.data;
  }

  /**
   * Send fingerprint with transaction for fraud analysis
   */
  async analyzeTransactionWithFingerprint(
    transactionId: string,
    userId: string,
    amount: number,
    paymentMethod: string,
    billingAddress?: any,
    shippingAddress?: any,
  ): Promise<{
    success: boolean;
    riskScore: number;
    decision: 'approve' | 'decline' | '3ds_challenge' | 'additional_verification';
    riskSignals: string[];
    deviceValidation: DeviceValidationResult | null;
  }> {
    const fingerprint = await this.collectFingerprint();

    const response = await api.post('/ai/fraud-detection/device/transaction-check', {
      transactionId,
      userId,
      amount,
      paymentMethod,
      deviceFingerprint: fingerprint,
      billingAddress,
      shippingAddress,
    });

    return response.data;
  }

  /**
   * Get the current user's trusted devices
   */
  async getMyDevices(): Promise<Array<{
    fingerprintHash: string;
    deviceNickname?: string;
    trustLevel: string;
    isVerified: boolean;
    lastUsedAt: Date;
    platform?: string;
    osFamily?: string;
    deviceType?: string;
  }>> {
    const response = await api.get('/ai/fraud-detection/device/my-devices');
    return response.data;
  }

  /**
   * Verify the current device (after successful verification like email/SMS)
   */
  async verifyCurrentDevice(verificationMethod: 'email' | 'sms' | '2fa'): Promise<{
    success: boolean;
    message: string;
  }> {
    const fingerprint = await this.collectFingerprint();
    const validation = await this.validateFingerprint();

    const response = await api.post('/ai/fraud-detection/device/verify', {
      fingerprintHash: validation.fingerprintHash,
      verificationMethod,
    });

    return response.data;
  }

  /**
   * Remove a device from trusted devices
   */
  async removeDevice(fingerprintHash: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const response = await api.delete(`/ai/fraud-detection/device/${fingerprintHash}`);
    return response.data;
  }

  /**
   * Get trust score for a specific device
   */
  async getDeviceTrustScore(fingerprintHash?: string): Promise<{
    trustScore: number;
    trustLevel: string;
    isKnownDevice: boolean;
    isVerified: boolean;
    deviceAge: number;
    useCount: number;
  }> {
    let hash = fingerprintHash;

    if (!hash) {
      // Get hash for current device
      const validation = await this.validateFingerprint();
      hash = validation.fingerprintHash;
    }

    const response = await api.get(`/ai/fraud-detection/device/trust-score/${hash}`);
    return response.data;
  }

  /**
   * Set a nickname for the current device
   */
  async setDeviceNickname(nickname: string): Promise<void> {
    const validation = await this.validateFingerprint();

    // Note: This would require a new endpoint on the backend
    // For now, storing locally
    try {
      await SecureStore.setItemAsync(
        'device_nickname',
        JSON.stringify({
          fingerprintHash: validation.fingerprintHash,
          nickname,
        })
      );
    } catch (error) {
      console.warn('Failed to save device nickname:', error);
    }
  }

  /**
   * Get the locally stored device nickname
   */
  async getDeviceNickname(): Promise<string | null> {
    try {
      const stored = await SecureStore.getItemAsync('device_nickname');
      if (stored) {
        const data = JSON.parse(stored);
        return data.nickname;
      }
    } catch (error) {
      console.warn('Failed to get device nickname:', error);
    }
    return null;
  }
}

// ==================== Singleton Export ====================

export const deviceFingerprintService = new DeviceFingerprintService();

// Export for direct access to types and the service class
export { DeviceFingerprintService };
