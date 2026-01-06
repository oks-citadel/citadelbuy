import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, timeout, catchError } from 'rxjs';
import { RedisService } from '../redis/redis.service';
import {
  GoogleRecaptchaResponse,
  RecaptchaVerificationResult,
  RecaptchaConfig,
  RecaptchaLogEntry,
  RecaptchaVersion,
  RecaptchaAction,
} from './recaptcha.dto';

/**
 * reCAPTCHA Service
 *
 * Provides verification of reCAPTCHA tokens (v2 and v3) via Google's API.
 * Features:
 * - Support for both reCAPTCHA v2 (checkbox/invisible) and v3 (score-based)
 * - Caching of verification results to prevent duplicate API calls
 * - Comprehensive logging for security auditing
 * - Configurable score threshold for bot detection
 * - IP-based exemptions for internal services
 *
 * Environment Variables Required:
 * - RECAPTCHA_SITE_KEY: Public site key from Google reCAPTCHA console
 * - RECAPTCHA_SECRET_KEY: Secret key from Google reCAPTCHA console
 * - RECAPTCHA_SCORE_THRESHOLD: Minimum score to pass (0.0-1.0, default 0.5)
 * - RECAPTCHA_ENABLED: Enable/disable reCAPTCHA verification (default true)
 * - RECAPTCHA_EXEMPT_IPS: Comma-separated list of exempt IP addresses
 * - RECAPTCHA_CACHE_TTL: Cache TTL in seconds (default 300)
 */
@Injectable()
export class RecaptchaService implements OnModuleInit {
  private readonly logger = new Logger(RecaptchaService.name);
  private config: RecaptchaConfig;

  // Google reCAPTCHA verification endpoint
  private readonly GOOGLE_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

  // Cache key prefixes
  private readonly CACHE_PREFIX = 'recaptcha:';
  private readonly LOG_PREFIX = 'recaptcha_log:';

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly redisService: RedisService,
  ) {}

  onModuleInit() {
    this.loadConfiguration();
    this.logger.log('reCAPTCHA Service initialized');

    if (!this.config.enabled) {
      this.logger.warn('reCAPTCHA verification is DISABLED');
    }

    if (!this.config.secretKey && this.config.enabled) {
      this.logger.error('RECAPTCHA_SECRET_KEY is not configured but reCAPTCHA is enabled!');
    }
  }

  /**
   * Load configuration from environment variables
   */
  private loadConfiguration(): void {
    const exemptIpsStr = this.configService.get<string>('RECAPTCHA_EXEMPT_IPS', '');
    const exemptIps = exemptIpsStr
      ? exemptIpsStr.split(',').map((ip) => ip.trim()).filter(Boolean)
      : [];

    // Always exempt common internal IPs
    const defaultExemptIps = [
      '127.0.0.1',
      '::1',
      'localhost',
    ];

    this.config = {
      siteKey: this.configService.get<string>('RECAPTCHA_SITE_KEY', ''),
      secretKey: this.configService.get<string>('RECAPTCHA_SECRET_KEY', ''),
      scoreThreshold: this.configService.get<number>('RECAPTCHA_SCORE_THRESHOLD', 0.5),
      enabled: this.configService.get<string>('RECAPTCHA_ENABLED', 'true') === 'true',
      exemptIps: [...new Set([...defaultExemptIps, ...exemptIps])],
      verifyUrl: this.GOOGLE_VERIFY_URL,
      cacheTtl: this.configService.get<number>('RECAPTCHA_CACHE_TTL', 300), // 5 minutes default
    };

    this.logger.debug(`reCAPTCHA config loaded: enabled=${this.config.enabled}, threshold=${this.config.scoreThreshold}`);
  }

  /**
   * Verify a reCAPTCHA token
   *
   * @param token - The reCAPTCHA token from the client
   * @param remoteIp - The client's IP address
   * @param expectedAction - Expected action for v3 verification
   * @param version - The reCAPTCHA version used
   * @returns Verification result
   */
  async verifyToken(
    token: string,
    remoteIp: string,
    expectedAction?: RecaptchaAction,
    version: RecaptchaVersion = RecaptchaVersion.V3,
  ): Promise<RecaptchaVerificationResult> {
    const startTime = Date.now();

    // Check if reCAPTCHA is enabled
    if (!this.config.enabled) {
      this.logger.debug('reCAPTCHA verification skipped (disabled)');
      return this.createSuccessResult(version);
    }

    // Check if IP is exempt
    if (this.isIpExempt(remoteIp)) {
      this.logger.debug(`reCAPTCHA verification skipped for exempt IP: ${remoteIp}`);
      return this.createSuccessResult(version);
    }

    // Validate token format
    if (!token || typeof token !== 'string' || token.length < 20) {
      this.logger.warn(`Invalid reCAPTCHA token format from IP: ${remoteIp}`);
      return this.createFailureResult(version, ['invalid-input-response']);
    }

    // Check cache for recent verification
    const cachedResult = await this.getCachedVerification(token);
    if (cachedResult) {
      this.logger.debug('Returning cached reCAPTCHA verification result');
      return cachedResult;
    }

    try {
      // Call Google's verification API
      const googleResponse = await this.callGoogleVerifyApi(token, remoteIp);

      // Process the response
      const result = this.processGoogleResponse(googleResponse, expectedAction, version);

      // Cache the result
      await this.cacheVerification(token, result);

      // Log the verification attempt
      await this.logVerificationAttempt({
        timestamp: new Date(),
        ip: remoteIp,
        token: this.hashToken(token),
        action: expectedAction,
        version,
        success: result.success,
        score: result.score,
        isBot: result.isBot,
        errorCodes: result.errorCodes,
      });

      const duration = Date.now() - startTime;
      this.logger.log(
        `reCAPTCHA verification completed: success=${result.success}, score=${result.score}, isBot=${result.isBot}, duration=${duration}ms`,
      );

      return result;
    } catch (error) {
      this.logger.error(`reCAPTCHA verification failed: ${error.message}`, error.stack);

      // Log the failed attempt
      await this.logVerificationAttempt({
        timestamp: new Date(),
        ip: remoteIp,
        token: this.hashToken(token),
        action: expectedAction,
        version,
        success: false,
        isBot: true,
        errorCodes: ['verification-error'],
      });

      return this.createFailureResult(version, ['verification-error']);
    }
  }

  /**
   * Call Google's reCAPTCHA verification API
   */
  private async callGoogleVerifyApi(
    token: string,
    remoteIp: string,
  ): Promise<GoogleRecaptchaResponse> {
    const params = new URLSearchParams();
    params.append('secret', this.config.secretKey);
    params.append('response', token);
    params.append('remoteip', remoteIp);

    try {
      const response = await firstValueFrom(
        this.httpService
          .post<GoogleRecaptchaResponse>(this.config.verifyUrl, params.toString(), {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            timeout: 5000,
          })
          .pipe(
            timeout(6000),
            catchError((error) => {
              throw new Error(`Google API call failed: ${error.message}`);
            }),
          ),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Google reCAPTCHA API error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process Google's verification response
   */
  private processGoogleResponse(
    response: GoogleRecaptchaResponse,
    expectedAction?: RecaptchaAction,
    version: RecaptchaVersion = RecaptchaVersion.V3,
  ): RecaptchaVerificationResult {
    const result: RecaptchaVerificationResult = {
      success: response.success,
      score: response.score,
      action: response.action,
      hostname: response.hostname,
      challengeTimestamp: response.challenge_ts,
      errorCodes: response['error-codes'],
      isBot: false,
      version,
    };

    // For v3, check score threshold
    if (version === RecaptchaVersion.V3) {
      const score = response.score ?? 0;
      result.isBot = score < this.config.scoreThreshold;

      // Verify action matches expected action
      if (expectedAction && response.action !== expectedAction) {
        this.logger.warn(
          `reCAPTCHA action mismatch: expected=${expectedAction}, received=${response.action}`,
        );
        result.success = false;
        result.isBot = true;
        result.errorCodes = [...(result.errorCodes || []), 'action-mismatch'];
      }

      // Log detailed score information
      this.logger.debug(
        `reCAPTCHA v3 score: ${score} (threshold: ${this.config.scoreThreshold}), action: ${response.action}`,
      );
    } else {
      // For v2, bot detection is based on success only
      result.isBot = !response.success;
    }

    // Overall success requires Google success AND passing bot check
    result.success = response.success && !result.isBot;

    return result;
  }

  /**
   * Check if an IP address is exempt from reCAPTCHA verification
   */
  isIpExempt(ip: string): boolean {
    if (!ip) return false;

    // Normalize IP address
    const normalizedIp = ip.replace('::ffff:', '');

    return this.config.exemptIps.some((exemptIp) => {
      // Support CIDR notation for IP ranges
      if (exemptIp.includes('/')) {
        return this.isIpInCidr(normalizedIp, exemptIp);
      }
      return normalizedIp === exemptIp;
    });
  }

  /**
   * Check if an IP is within a CIDR range
   */
  private isIpInCidr(ip: string, cidr: string): boolean {
    try {
      const [range, bits] = cidr.split('/');
      const mask = parseInt(bits, 10);

      // Simple IPv4 check
      const ipParts = ip.split('.').map(Number);
      const rangeParts = range.split('.').map(Number);

      if (ipParts.length !== 4 || rangeParts.length !== 4) {
        return false;
      }

      const ipNum =
        (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];
      const rangeNum =
        (rangeParts[0] << 24) | (rangeParts[1] << 16) | (rangeParts[2] << 8) | rangeParts[3];
      const maskNum = ~((1 << (32 - mask)) - 1);

      return (ipNum & maskNum) === (rangeNum & maskNum);
    } catch (error) {
      this.logger.warn(`Invalid CIDR notation: ${cidr}`);
      return false;
    }
  }

  /**
   * Get cached verification result
   */
  private async getCachedVerification(
    token: string,
  ): Promise<RecaptchaVerificationResult | null> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}${this.hashToken(token)}`;
      return await this.redisService.get<RecaptchaVerificationResult>(cacheKey);
    } catch (error) {
      this.logger.debug(`Cache lookup failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Cache verification result
   */
  private async cacheVerification(
    token: string,
    result: RecaptchaVerificationResult,
  ): Promise<void> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}${this.hashToken(token)}`;
      await this.redisService.set(cacheKey, result, this.config.cacheTtl);
    } catch (error) {
      this.logger.debug(`Cache storage failed: ${error.message}`);
    }
  }

  /**
   * Log verification attempt for security auditing
   */
  private async logVerificationAttempt(entry: RecaptchaLogEntry): Promise<void> {
    try {
      // Store in Redis sorted set for time-based queries
      const logKey = `${this.LOG_PREFIX}${entry.ip}`;
      const logEntry = JSON.stringify(entry);

      await this.redisService.zadd(logKey, entry.timestamp.getTime(), logEntry);

      // Set TTL on the log key (keep logs for 24 hours)
      await this.redisService.expire(logKey, 86400);

      // Also emit an event for external log aggregation
      this.logger.log(
        `[SECURITY_AUDIT] reCAPTCHA verification: ip=${entry.ip}, success=${entry.success}, ` +
        `score=${entry.score}, isBot=${entry.isBot}, action=${entry.action}, version=${entry.version}`,
      );
    } catch (error) {
      this.logger.error(`Failed to log verification attempt: ${error.message}`);
    }
  }

  /**
   * Get verification logs for an IP address
   */
  async getVerificationLogs(
    ip: string,
    limit: number = 100,
  ): Promise<RecaptchaLogEntry[]> {
    try {
      const logKey = `${this.LOG_PREFIX}${ip}`;
      const entries = await this.redisService.zrange(logKey, -limit, -1);

      return entries.map((entry) => {
        try {
          return JSON.parse(entry);
        } catch {
          return null;
        }
      }).filter(Boolean) as RecaptchaLogEntry[];
    } catch (error) {
      this.logger.error(`Failed to get verification logs: ${error.message}`);
      return [];
    }
  }

  /**
   * Get bot detection statistics
   */
  async getBotDetectionStats(): Promise<{
    total: number;
    blocked: number;
    passed: number;
    blockRate: string;
  }> {
    try {
      const keys = await this.redisService.keys(`${this.LOG_PREFIX}*`);
      let total = 0;
      let blocked = 0;

      for (const key of keys) {
        const entries = await this.redisService.zrange(key, 0, -1);
        for (const entry of entries) {
          try {
            const log = JSON.parse(entry) as RecaptchaLogEntry;
            total++;
            if (log.isBot) blocked++;
          } catch {
            // Skip invalid entries
          }
        }
      }

      const passed = total - blocked;
      const blockRate = total > 0 ? ((blocked / total) * 100).toFixed(2) : '0.00';

      return { total, blocked, passed, blockRate: `${blockRate}%` };
    } catch (error) {
      this.logger.error(`Failed to get bot detection stats: ${error.message}`);
      return { total: 0, blocked: 0, passed: 0, blockRate: '0.00%' };
    }
  }

  /**
   * Create a success result (for exempt IPs or disabled verification)
   */
  private createSuccessResult(version: RecaptchaVersion): RecaptchaVerificationResult {
    return {
      success: true,
      score: 1.0,
      isBot: false,
      version,
    };
  }

  /**
   * Create a failure result
   */
  private createFailureResult(
    version: RecaptchaVersion,
    errorCodes: string[],
  ): RecaptchaVerificationResult {
    return {
      success: false,
      score: 0,
      isBot: true,
      version,
      errorCodes,
    };
  }

  /**
   * Hash token for cache key and logging (don't store raw tokens)
   */
  private hashToken(token: string): string {
    // Use a simple hash for cache keys
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      const char = token.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get the current configuration (for debugging/admin)
   */
  getConfiguration(): Omit<RecaptchaConfig, 'secretKey'> {
    return {
      siteKey: this.config.siteKey,
      scoreThreshold: this.config.scoreThreshold,
      enabled: this.config.enabled,
      exemptIps: this.config.exemptIps,
      verifyUrl: this.config.verifyUrl,
      cacheTtl: this.config.cacheTtl,
    };
  }

  /**
   * Update score threshold at runtime
   */
  setScoreThreshold(threshold: number): void {
    if (threshold < 0 || threshold > 1) {
      throw new Error('Score threshold must be between 0 and 1');
    }
    this.config.scoreThreshold = threshold;
    this.logger.log(`reCAPTCHA score threshold updated to: ${threshold}`);
  }

  /**
   * Add an IP to the exempt list at runtime
   */
  addExemptIp(ip: string): void {
    if (!this.config.exemptIps.includes(ip)) {
      this.config.exemptIps.push(ip);
      this.logger.log(`Added IP to reCAPTCHA exempt list: ${ip}`);
    }
  }

  /**
   * Remove an IP from the exempt list at runtime
   */
  removeExemptIp(ip: string): void {
    const index = this.config.exemptIps.indexOf(ip);
    if (index > -1) {
      this.config.exemptIps.splice(index, 1);
      this.logger.log(`Removed IP from reCAPTCHA exempt list: ${ip}`);
    }
  }

  /**
   * Enable or disable reCAPTCHA verification at runtime
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    this.logger.log(`reCAPTCHA verification ${enabled ? 'enabled' : 'disabled'}`);
  }
}
