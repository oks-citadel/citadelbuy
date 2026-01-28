import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as dns from 'dns';
import * as crypto from 'crypto';

/**
 * Result of a DNS verification check
 */
export interface DnsVerificationResult {
  success: boolean;
  txtRecordFound: boolean;
  cnameRecordFound: boolean;
  txtRecords: string[];
  cnameRecords: string[];
  errors: string[];
}

/**
 * DNS configuration instructions for a domain
 */
export interface DnsConfiguration {
  host: string;
  txtRecord: {
    name: string;
    type: 'TXT';
    value: string;
    ttl: number;
  };
  cnameRecord: {
    name: string;
    type: 'CNAME';
    value: string;
    ttl: number;
  };
  aRecord?: {
    name: string;
    type: 'A';
    value: string[];
    ttl: number;
  };
}

/**
 * Service for domain DNS verification
 * Handles TXT and CNAME record verification for custom domains
 */
@Injectable()
export class DomainVerificationService {
  private readonly logger = new Logger(DomainVerificationService.name);
  private readonly dnsResolver: dns.promises.Resolver;

  // Platform configuration
  private readonly verificationPrefix = 'bx-verify';
  private readonly cnameTarget: string;
  private readonly platformIps: string[];

  constructor(private readonly configService: ConfigService) {
    // Create DNS resolver with custom settings
    this.dnsResolver = new dns.promises.Resolver();

    // Use reliable public DNS servers
    this.dnsResolver.setServers([
      '8.8.8.8',       // Google Primary
      '8.8.4.4',       // Google Secondary
      '1.1.1.1',       // Cloudflare Primary
      '1.0.0.1',       // Cloudflare Secondary
    ]);

    // Load configuration
    this.cnameTarget = this.configService.get<string>(
      'DOMAIN_CNAME_TARGET',
      'domains.broxiva.com',
    );

    this.platformIps = this.configService.get<string>(
      'PLATFORM_IPS',
      '10.0.0.1,10.0.0.2', // Default placeholder IPs
    ).split(',').map(ip => ip.trim());
  }

  /**
   * Generate a unique verification token for a domain
   * Format: bx-verify=<32-character-hex-token>
   */
  generateVerificationToken(): string {
    const token = crypto.randomBytes(16).toString('hex');
    return token;
  }

  /**
   * Get the full TXT record value that should be set
   */
  getExpectedTxtValue(token: string): string {
    return `${this.verificationPrefix}=${token}`;
  }

  /**
   * Get DNS configuration instructions for a domain
   */
  getDnsConfiguration(host: string, verificationToken: string): DnsConfiguration {
    // Extract the apex domain for the verification subdomain
    const hostParts = host.split('.');
    const isApexDomain = hostParts.length === 2;

    return {
      host,
      txtRecord: {
        name: `_broxiva-verification.${host}`,
        type: 'TXT',
        value: this.getExpectedTxtValue(verificationToken),
        ttl: 300, // 5 minutes
      },
      cnameRecord: {
        name: host,
        type: 'CNAME',
        value: this.cnameTarget,
        ttl: 300,
      },
      // For apex domains, provide A record alternative
      aRecord: isApexDomain ? {
        name: host,
        type: 'A',
        value: this.platformIps,
        ttl: 300,
      } : undefined,
    };
  }

  /**
   * Verify a domain's DNS configuration
   * Checks both TXT record (ownership) and CNAME/A record (routing)
   */
  async verifyDomain(
    host: string,
    verificationToken: string,
  ): Promise<DnsVerificationResult> {
    const result: DnsVerificationResult = {
      success: false,
      txtRecordFound: false,
      cnameRecordFound: false,
      txtRecords: [],
      cnameRecords: [],
      errors: [],
    };

    // Check TXT record for domain ownership verification
    const txtResult = await this.verifyTxtRecord(host, verificationToken);
    result.txtRecordFound = txtResult.found;
    result.txtRecords = txtResult.records;
    if (!txtResult.found && txtResult.error) {
      result.errors.push(txtResult.error);
    }

    // Check CNAME/A record for routing verification
    const routingResult = await this.verifyRoutingRecord(host);
    result.cnameRecordFound = routingResult.found;
    result.cnameRecords = routingResult.records;
    if (!routingResult.found && routingResult.error) {
      result.errors.push(routingResult.error);
    }

    // Domain is verified if both checks pass
    result.success = result.txtRecordFound && result.cnameRecordFound;

    this.logger.log(
      `Domain verification for ${host}: TXT=${result.txtRecordFound}, CNAME=${result.cnameRecordFound}, Success=${result.success}`,
    );

    return result;
  }

  /**
   * Verify TXT record for domain ownership
   */
  private async verifyTxtRecord(
    host: string,
    verificationToken: string,
  ): Promise<{ found: boolean; records: string[]; error?: string }> {
    const txtHost = `_broxiva-verification.${host}`;
    const expectedValue = this.getExpectedTxtValue(verificationToken);

    try {
      const records = await this.dnsResolver.resolveTxt(txtHost);
      // TXT records come as arrays of strings (chunks)
      const flatRecords = records.map(record => record.join(''));

      this.logger.debug(`TXT records for ${txtHost}: ${JSON.stringify(flatRecords)}`);

      const found = flatRecords.some(record =>
        record.trim() === expectedValue.trim(),
      );

      if (!found && flatRecords.length > 0) {
        return {
          found: false,
          records: flatRecords,
          error: `TXT record found but value doesn't match. Expected: ${expectedValue}`,
        };
      }

      return {
        found,
        records: flatRecords,
        error: found ? undefined : `No TXT record found at ${txtHost}`,
      };
    } catch (error) {
      if (error.code === 'ENODATA' || error.code === 'ENOTFOUND') {
        return {
          found: false,
          records: [],
          error: `No TXT record found at ${txtHost}. Please add: ${expectedValue}`,
        };
      }

      this.logger.error(`DNS TXT lookup failed for ${txtHost}: ${error.message}`);
      return {
        found: false,
        records: [],
        error: `DNS lookup failed: ${error.message}`,
      };
    }
  }

  /**
   * Verify CNAME or A record for routing
   */
  private async verifyRoutingRecord(
    host: string,
  ): Promise<{ found: boolean; records: string[]; error?: string }> {
    // First try CNAME
    try {
      const cnameRecords = await this.dnsResolver.resolveCname(host);
      this.logger.debug(`CNAME records for ${host}: ${JSON.stringify(cnameRecords)}`);

      const found = cnameRecords.some(record =>
        record.toLowerCase() === this.cnameTarget.toLowerCase() ||
        record.toLowerCase().endsWith(`.${this.cnameTarget.toLowerCase()}`),
      );

      if (found) {
        return { found: true, records: cnameRecords };
      }

      return {
        found: false,
        records: cnameRecords,
        error: `CNAME found but points to wrong target. Expected: ${this.cnameTarget}, Found: ${cnameRecords.join(', ')}`,
      };
    } catch (cnameError) {
      // CNAME not found, try A record (for apex domains)
      if (cnameError.code === 'ENODATA' || cnameError.code === 'ENOTFOUND') {
        return this.verifyARecord(host);
      }

      this.logger.error(`DNS CNAME lookup failed for ${host}: ${cnameError.message}`);
      return {
        found: false,
        records: [],
        error: `DNS lookup failed: ${cnameError.message}`,
      };
    }
  }

  /**
   * Verify A record as alternative to CNAME (for apex domains)
   */
  private async verifyARecord(
    host: string,
  ): Promise<{ found: boolean; records: string[]; error?: string }> {
    try {
      const aRecords = await this.dnsResolver.resolve4(host);
      this.logger.debug(`A records for ${host}: ${JSON.stringify(aRecords)}`);

      // Check if any of our platform IPs are present
      const found = aRecords.some(ip => this.platformIps.includes(ip));

      if (found) {
        return { found: true, records: aRecords };
      }

      return {
        found: false,
        records: aRecords,
        error: `A record found but doesn't point to platform IPs. Expected one of: ${this.platformIps.join(', ')}`,
      };
    } catch (error) {
      if (error.code === 'ENODATA' || error.code === 'ENOTFOUND') {
        return {
          found: false,
          records: [],
          error: `No CNAME or A record found. Please add CNAME pointing to: ${this.cnameTarget}`,
        };
      }

      this.logger.error(`DNS A record lookup failed for ${host}: ${error.message}`);
      return {
        found: false,
        records: [],
        error: `DNS lookup failed: ${error.message}`,
      };
    }
  }

  /**
   * Check if a domain is already configured for another tenant
   * This prevents domain hijacking
   */
  async checkDomainAvailability(host: string): Promise<{
    available: boolean;
    reason?: string;
  }> {
    // Reserved subdomains that cannot be used
    const reservedSubdomains = [
      'www',
      'api',
      'admin',
      'dashboard',
      'app',
      'mail',
      'smtp',
      'pop',
      'imap',
      'ftp',
      'sftp',
      'ssh',
      'git',
      'cdn',
      'static',
      'assets',
      'media',
      'images',
      'docs',
      'help',
      'support',
      'status',
      'blog',
      'shop',
      'store',
      'pay',
      'payments',
      'checkout',
      'auth',
      'login',
      'signup',
      'register',
      'account',
      'billing',
      'console',
      'portal',
    ];

    // Check if it's a reserved subdomain of broxiva.com
    const broxivaDomain = this.configService.get<string>(
      'PLATFORM_DOMAIN',
      'broxiva.com',
    );

    if (host.endsWith(`.${broxivaDomain}`)) {
      const subdomain = host.replace(`.${broxivaDomain}`, '');
      if (reservedSubdomains.includes(subdomain.toLowerCase())) {
        return {
          available: false,
          reason: `The subdomain "${subdomain}" is reserved and cannot be used.`,
        };
      }
    }

    // Additional checks can be added here (e.g., check against known malicious domains)

    return { available: true };
  }

  /**
   * Validate that a host is properly formatted
   */
  isValidHost(host: string): { valid: boolean; error?: string } {
    // Basic format validation
    const hostRegex = /^(?!-)[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

    if (!hostRegex.test(host)) {
      return {
        valid: false,
        error: 'Invalid hostname format. Use format like "shop.example.com"',
      };
    }

    // Check length constraints
    if (host.length > 253) {
      return {
        valid: false,
        error: 'Hostname too long. Maximum 253 characters allowed.',
      };
    }

    // Check individual label lengths
    const labels = host.split('.');
    for (const label of labels) {
      if (label.length > 63) {
        return {
          valid: false,
          error: `Label "${label}" too long. Maximum 63 characters per label.`,
        };
      }
    }

    return { valid: true };
  }
}
