import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Secret pattern definition
 */
interface SecretPattern {
  name: string;
  pattern: RegExp;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
}

/**
 * Scan result interface
 */
export interface SecretScanResult {
  hasSecrets: boolean;
  findings: Array<{
    patternName: string;
    severity: string;
    location: string;
    redacted: boolean;
  }>;
  scannedAt: Date;
}

/**
 * Secret Scanner Service
 *
 * Prevents secrets from leaking in logs, error messages, and API responses.
 *
 * SECURITY REQUIREMENTS:
 * - Scan all outgoing logs for potential secrets
 * - Scan error messages before sending to clients
 * - Redact any detected secrets with masked value
 * - Alert on critical secret exposure attempts
 */
@Injectable()
export class SecretScannerService implements OnModuleInit {
  private readonly logger = new Logger(SecretScannerService.name);
  private patterns: SecretPattern[] = [];
  private customPatterns: SecretPattern[] = [];

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.initializePatterns();
  }

  /**
   * Initialize secret detection patterns
   */
  private initializePatterns(): void {
    this.patterns = [
      // API Keys - Generic
      {
        name: 'generic_api_key',
        pattern: /api[_-]?key['":\s]*[=:]\s*['"]?([a-zA-Z0-9_-]{20,})['"]?/gi,
        severity: 'high',
        description: 'Generic API key pattern',
      },

      // Stripe Keys
      {
        name: 'stripe_secret_key',
        pattern: /sk_(live|test)_[a-zA-Z0-9]{24,}/g,
        severity: 'critical',
        description: 'Stripe secret API key',
      },
      {
        name: 'stripe_publishable_key',
        pattern: /pk_(live|test)_[a-zA-Z0-9]{24,}/g,
        severity: 'medium',
        description: 'Stripe publishable key (less sensitive)',
      },
      {
        name: 'stripe_restricted_key',
        pattern: /rk_(live|test)_[a-zA-Z0-9]{24,}/g,
        severity: 'high',
        description: 'Stripe restricted API key',
      },

      // AWS Credentials
      {
        name: 'aws_access_key',
        pattern: /AKIA[A-Z0-9]{16}/g,
        severity: 'critical',
        description: 'AWS access key ID',
      },
      {
        name: 'aws_secret_key',
        pattern: /(?<![\w])[a-zA-Z0-9/+=]{40}(?![\w])/g,
        severity: 'critical',
        description: 'Potential AWS secret access key',
      },

      // Google Cloud
      {
        name: 'google_api_key',
        pattern: /AIza[a-zA-Z0-9_-]{35}/g,
        severity: 'high',
        description: 'Google API key',
      },
      {
        name: 'google_oauth_client_id',
        pattern: /[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com/gi,
        severity: 'medium',
        description: 'Google OAuth client ID',
      },

      // GitHub
      {
        name: 'github_token',
        pattern: /gh[pousr]_[a-zA-Z0-9]{36,}/g,
        severity: 'critical',
        description: 'GitHub personal access token',
      },
      {
        name: 'github_oauth',
        pattern: /gho_[a-zA-Z0-9]{36,}/g,
        severity: 'high',
        description: 'GitHub OAuth access token',
      },

      // JWT Tokens
      {
        name: 'jwt_token',
        pattern: /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,
        severity: 'high',
        description: 'JWT token',
      },

      // Private Keys
      {
        name: 'private_key_rsa',
        pattern: /-----BEGIN RSA PRIVATE KEY-----[\s\S]*?-----END RSA PRIVATE KEY-----/g,
        severity: 'critical',
        description: 'RSA private key',
      },
      {
        name: 'private_key_ec',
        pattern: /-----BEGIN EC PRIVATE KEY-----[\s\S]*?-----END EC PRIVATE KEY-----/g,
        severity: 'critical',
        description: 'EC private key',
      },
      {
        name: 'private_key_generic',
        pattern: /-----BEGIN PRIVATE KEY-----[\s\S]*?-----END PRIVATE KEY-----/g,
        severity: 'critical',
        description: 'Generic private key',
      },

      // Database Connection Strings
      {
        name: 'postgres_uri',
        pattern: /postgres(?:ql)?:\/\/[^:]+:[^@]+@[^\/]+\/[^\s'"]+/gi,
        severity: 'critical',
        description: 'PostgreSQL connection string with credentials',
      },
      {
        name: 'mysql_uri',
        pattern: /mysql:\/\/[^:]+:[^@]+@[^\/]+\/[^\s'"]+/gi,
        severity: 'critical',
        description: 'MySQL connection string with credentials',
      },
      {
        name: 'mongodb_uri',
        pattern: /mongodb(\+srv)?:\/\/[^:]+:[^@]+@[^\s'"]+/gi,
        severity: 'critical',
        description: 'MongoDB connection string with credentials',
      },
      {
        name: 'redis_uri',
        pattern: /redis:\/\/[^:]*:[^@]+@[^\s'"]+/gi,
        severity: 'high',
        description: 'Redis connection string with credentials',
      },

      // Passwords in Common Formats
      {
        name: 'password_assignment',
        pattern: /password['":\s]*[=:]\s*['"]([^'"]{8,})['"]?/gi,
        severity: 'high',
        description: 'Password assignment',
      },
      {
        name: 'secret_assignment',
        pattern: /secret['":\s]*[=:]\s*['"]([^'"]{8,})['"]?/gi,
        severity: 'high',
        description: 'Secret assignment',
      },

      // PayPal
      {
        name: 'paypal_access_token',
        pattern: /A21AA[a-zA-Z0-9_-]+/g,
        severity: 'critical',
        description: 'PayPal access token',
      },

      // Shopify
      {
        name: 'shopify_access_token',
        pattern: /shpat_[a-zA-Z0-9]{32,}/g,
        severity: 'critical',
        description: 'Shopify access token',
      },
      {
        name: 'shopify_api_key',
        pattern: /shpss_[a-zA-Z0-9]{32,}/g,
        severity: 'high',
        description: 'Shopify API shared secret',
      },

      // Twilio
      {
        name: 'twilio_api_key',
        pattern: /SK[a-fA-F0-9]{32}/g,
        severity: 'high',
        description: 'Twilio API key',
      },

      // SendGrid
      {
        name: 'sendgrid_api_key',
        pattern: /SG\.[a-zA-Z0-9_-]{22,}\.[a-zA-Z0-9_-]{22,}/g,
        severity: 'high',
        description: 'SendGrid API key',
      },

      // Slack
      {
        name: 'slack_token',
        pattern: /xox[baprs]-[a-zA-Z0-9-]+/g,
        severity: 'high',
        description: 'Slack token',
      },

      // PII Patterns
      {
        name: 'credit_card_number',
        pattern: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,
        severity: 'critical',
        description: 'Credit card number',
      },
      {
        name: 'ssn',
        pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
        severity: 'critical',
        description: 'Social Security Number',
      },

      // Email with Password
      {
        name: 'email_password_combo',
        pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}:[^\s'"]+/g,
        severity: 'critical',
        description: 'Email:password combination',
      },
    ];

    // Add any custom patterns from config
    const customPatternsConfig = this.configService.get<string>('SECRET_SCANNER_CUSTOM_PATTERNS');
    if (customPatternsConfig) {
      try {
        this.customPatterns = JSON.parse(customPatternsConfig);
        this.logger.log(`Loaded ${this.customPatterns.length} custom secret patterns`);
      } catch (error) {
        this.logger.error('Failed to parse custom secret patterns', error);
      }
    }
  }

  /**
   * Scan a string for potential secrets
   */
  scan(content: string): SecretScanResult {
    const findings: SecretScanResult['findings'] = [];
    const allPatterns = [...this.patterns, ...this.customPatterns];

    for (const pattern of allPatterns) {
      const matches = content.match(pattern.pattern);
      if (matches && matches.length > 0) {
        findings.push({
          patternName: pattern.name,
          severity: pattern.severity,
          location: `Found ${matches.length} match(es)`,
          redacted: false,
        });
      }
    }

    return {
      hasSecrets: findings.length > 0,
      findings,
      scannedAt: new Date(),
    };
  }

  /**
   * Scan and redact secrets from content
   */
  scanAndRedact(content: string): { content: string; result: SecretScanResult } {
    let redactedContent = content;
    const findings: SecretScanResult['findings'] = [];
    const allPatterns = [...this.patterns, ...this.customPatterns];

    for (const pattern of allPatterns) {
      const matches = content.match(pattern.pattern);
      if (matches && matches.length > 0) {
        // Redact each match
        for (const match of matches) {
          const redacted = this.createRedactedValue(match, pattern.name);
          redactedContent = redactedContent.replace(match, redacted);
        }

        findings.push({
          patternName: pattern.name,
          severity: pattern.severity,
          location: `Redacted ${matches.length} match(es)`,
          redacted: true,
        });
      }
    }

    // Log critical findings
    const criticalFindings = findings.filter((f) => f.severity === 'critical');
    if (criticalFindings.length > 0) {
      this.logger.error({
        message: 'CRITICAL: Secrets detected and redacted',
        findings: criticalFindings.map((f) => f.patternName),
        count: criticalFindings.length,
      });
    }

    return {
      content: redactedContent,
      result: {
        hasSecrets: findings.length > 0,
        findings,
        scannedAt: new Date(),
      },
    };
  }

  /**
   * Create a redacted version of a secret
   */
  private createRedactedValue(secret: string, patternName: string): string {
    if (secret.length <= 8) {
      return `***[${patternName}]***`;
    }

    // Keep first 2 and last 2 characters for identification
    const prefix = secret.substring(0, 2);
    const suffix = secret.substring(secret.length - 2);
    const redactedLength = Math.min(secret.length - 4, 20);

    return `${prefix}${'*'.repeat(redactedLength)}${suffix}[${patternName}]`;
  }

  /**
   * Scan an object recursively for secrets
   */
  scanObject(obj: any): SecretScanResult {
    const jsonString = JSON.stringify(obj, null, 0);
    return this.scan(jsonString);
  }

  /**
   * Scan and redact secrets from an object
   */
  scanAndRedactObject(obj: any): { obj: any; result: SecretScanResult } {
    const jsonString = JSON.stringify(obj);
    const { content, result } = this.scanAndRedact(jsonString);

    try {
      return {
        obj: JSON.parse(content),
        result,
      };
    } catch {
      // If parsing fails, return original with warning
      this.logger.warn('Failed to parse redacted JSON, returning original');
      return { obj, result };
    }
  }

  /**
   * Create a safe logger wrapper that scans output
   */
  createSafeLogger(context: string): SafeLogger {
    return new SafeLogger(this, context);
  }

  /**
   * Scan error message before sending to client
   */
  sanitizeErrorMessage(error: Error | string): string {
    const message = typeof error === 'string' ? error : error.message;
    const { content } = this.scanAndRedact(message);
    return content;
  }

  /**
   * Check if a specific string looks like a secret
   */
  looksLikeSecret(value: string): boolean {
    // Quick heuristics
    if (value.length < 8) return false;

    // Check entropy (simplified)
    const entropy = this.calculateEntropy(value);
    if (entropy > 4.5) return true; // High entropy suggests randomness

    // Check against patterns
    const result = this.scan(value);
    return result.hasSecrets;
  }

  /**
   * Calculate Shannon entropy of a string
   */
  private calculateEntropy(str: string): number {
    const charCounts: Record<string, number> = {};
    for (const char of str) {
      charCounts[char] = (charCounts[char] || 0) + 1;
    }

    let entropy = 0;
    const len = str.length;
    for (const count of Object.values(charCounts)) {
      const freq = count / len;
      entropy -= freq * Math.log2(freq);
    }

    return entropy;
  }

  /**
   * Add a custom pattern at runtime
   */
  addCustomPattern(pattern: SecretPattern): void {
    this.customPatterns.push(pattern);
    this.logger.log(`Added custom pattern: ${pattern.name}`);
  }

  /**
   * Get all loaded patterns (for testing/debugging)
   */
  getPatterns(): Array<{ name: string; severity: string }> {
    return [...this.patterns, ...this.customPatterns].map((p) => ({
      name: p.name,
      severity: p.severity,
    }));
  }
}

/**
 * Safe Logger wrapper that scans output for secrets
 */
export class SafeLogger {
  private readonly logger: Logger;

  constructor(
    private readonly scanner: SecretScannerService,
    context: string,
  ) {
    this.logger = new Logger(context);
  }

  log(message: any, ...optionalParams: any[]): void {
    const safeMessage = this.sanitize(message);
    const safeParams = optionalParams.map((p) => this.sanitize(p));
    this.logger.log(safeMessage, ...safeParams);
  }

  error(message: any, ...optionalParams: any[]): void {
    const safeMessage = this.sanitize(message);
    const safeParams = optionalParams.map((p) => this.sanitize(p));
    this.logger.error(safeMessage, ...safeParams);
  }

  warn(message: any, ...optionalParams: any[]): void {
    const safeMessage = this.sanitize(message);
    const safeParams = optionalParams.map((p) => this.sanitize(p));
    this.logger.warn(safeMessage, ...safeParams);
  }

  debug(message: any, ...optionalParams: any[]): void {
    const safeMessage = this.sanitize(message);
    const safeParams = optionalParams.map((p) => this.sanitize(p));
    this.logger.debug(safeMessage, ...safeParams);
  }

  verbose(message: any, ...optionalParams: any[]): void {
    const safeMessage = this.sanitize(message);
    const safeParams = optionalParams.map((p) => this.sanitize(p));
    this.logger.verbose(safeMessage, ...safeParams);
  }

  private sanitize(value: any): any {
    if (typeof value === 'string') {
      const { content } = this.scanner.scanAndRedact(value);
      return content;
    }

    if (typeof value === 'object' && value !== null) {
      const { obj } = this.scanner.scanAndRedactObject(value);
      return obj;
    }

    return value;
  }
}
