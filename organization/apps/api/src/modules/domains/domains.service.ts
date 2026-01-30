import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CacheService } from '@/common/redis/cache.service';
import { DomainVerificationService, DnsConfiguration } from './domain-verification.service';
import {
  CreateDomainDto,
  CreateSubdomainDto,
  UpdateDomainDto,
  DomainQueryDto,
  DomainType,
  DomainStatusFilter,
  DomainTypeFilter,
  DomainSortField,
  SortOrder,
} from './dto';

/**
 * Domain status enum matching Prisma schema
 */
export enum DomainStatus {
  PENDING = 'PENDING',
  VERIFYING = 'VERIFYING',
  VERIFIED = 'VERIFIED',
  FAILED = 'FAILED',
  SUSPENDED = 'SUSPENDED',
  EXPIRED = 'EXPIRED',
}

/**
 * SSL status enum matching Prisma schema
 */
export enum SslStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  FAILED = 'FAILED',
  RENEWING = 'RENEWING',
}

/**
 * Tenant domain entity interface
 */
export interface TenantDomain {
  id: string;
  host: string;
  tenantId: string;
  domainType: string;
  status: string;
  verificationToken: string | null;
  cnameTarget: string | null;
  verifiedAt: Date | null;
  sslStatus: string | null;
  sslExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  tenant?: {
    id: string;
    name: string;
    slug: string;
    status: string;
    logoUrl?: string | null;
    primaryColor?: string | null;
  };
}

/**
 * Paginated response interface
 */
interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Domain resolution result for tenant lookup
 */
export interface DomainResolution {
  tenantId: string;
  host: string;
  domainType: string;
  tenant?: {
    id: string;
    name: string;
    slug: string;
    status: string;
    logoUrl?: string;
    primaryColor?: string;
  };
}

/**
 * Service for managing tenant domains
 * Handles domain creation, verification, and tenant resolution
 */
@Injectable()
export class DomainsService {
  private readonly logger = new Logger(DomainsService.name);
  private readonly platformDomain: string;
  private readonly cacheTtl = 300; // 5 minutes cache for domain lookups

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
    private readonly verificationService: DomainVerificationService,
  ) {
    this.platformDomain = this.configService.get<string>(
      'PLATFORM_DOMAIN',
      'broxiva.com',
    );
  }

  /**
   * Create a new custom domain for a tenant
   */
  async create(
    dto: CreateDomainDto,
    userId?: string,
  ): Promise<TenantDomain> {
    const { host, tenantId, domainType } = dto;

    // Normalize host
    const normalizedHost = host.toLowerCase().trim();

    // Validate host format
    const hostValidation = this.verificationService.isValidHost(normalizedHost);
    if (!hostValidation.valid) {
      throw new BadRequestException(hostValidation.error);
    }

    // Check if tenant exists
    const tenant = await this.prisma.organization.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException(`Organization with ID ${tenantId} not found`);
    }

    // Check if domain is already registered
    const existingDomain = await this.prisma.tenantDomain.findUnique({
      where: { host: normalizedHost },
    });

    if (existingDomain) {
      if (existingDomain.tenantId === tenantId) {
        throw new ConflictException('This domain is already registered for your organization');
      }
      throw new ConflictException('This domain is already registered by another organization');
    }

    // Check domain availability (reserved names, etc.)
    const availability = await this.verificationService.checkDomainAvailability(normalizedHost);
    if (!availability.available) {
      throw new BadRequestException(availability.reason);
    }

    // Determine domain type if not specified
    const resolvedDomainType = domainType || (
      normalizedHost.endsWith(`.${this.platformDomain}`)
        ? DomainType.SUBDOMAIN
        : DomainType.CUSTOM
    );

    // Generate verification token
    const verificationToken = this.verificationService.generateVerificationToken();
    const cnameTarget = this.configService.get<string>(
      'DOMAIN_CNAME_TARGET',
      'domains.broxiva.com',
    );

    // Create the domain record
    const domain = await this.prisma.tenantDomain.create({
      data: {
        host: normalizedHost,
        tenantId,
        domainType: resolvedDomainType,
        status: resolvedDomainType === DomainType.SUBDOMAIN
          ? DomainStatus.VERIFIED // Subdomains are auto-verified
          : DomainStatus.PENDING,
        verificationToken,
        cnameTarget,
        sslStatus: SslStatus.PENDING,
        verifiedAt: resolvedDomainType === DomainType.SUBDOMAIN
          ? new Date()
          : null,
      },
    });

    this.logger.log(
      `Created domain ${normalizedHost} for tenant ${tenantId} (type: ${resolvedDomainType})`,
    );

    // Invalidate cache
    await this.invalidateDomainCache(normalizedHost);

    return domain as TenantDomain;
  }

  /**
   * Create a subdomain under the platform domain
   */
  async createSubdomain(
    dto: CreateSubdomainDto,
    userId?: string,
  ): Promise<TenantDomain> {
    const { subdomain, tenantId } = dto;

    // Construct the full host
    const host = `${subdomain.toLowerCase()}.${this.platformDomain}`;

    return this.create(
      {
        host,
        tenantId,
        domainType: DomainType.SUBDOMAIN,
      },
      userId,
    );
  }

  /**
   * Get a domain by ID
   */
  async findOne(id: string): Promise<TenantDomain> {
    const domain = await this.prisma.tenantDomain.findUnique({
      where: { id },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            logoUrl: true,
            primaryColor: true,
          },
        },
      },
    });

    if (!domain) {
      throw new NotFoundException(`Domain with ID ${id} not found`);
    }

    return domain as TenantDomain;
  }

  /**
   * Get a domain by host
   */
  async findByHost(host: string): Promise<TenantDomain | null> {
    const normalizedHost = host.toLowerCase().trim();

    const domain = await this.prisma.tenantDomain.findUnique({
      where: { host: normalizedHost },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            logoUrl: true,
            primaryColor: true,
          },
        },
      },
    });

    return domain as TenantDomain | null;
  }

  /**
   * List domains with filtering and pagination
   */
  async findAll(query: DomainQueryDto): Promise<PaginatedResponse<TenantDomain>> {
    const {
      tenantId,
      status = DomainStatusFilter.ALL,
      domainType = DomainTypeFilter.ALL,
      search,
      sortBy = DomainSortField.CREATED_AT,
      sortOrder = SortOrder.DESC,
      page = 1,
      limit = 20,
    } = query;

    // Build where clause
    const where: any = {};

    if (tenantId) {
      where.tenantId = tenantId;
    }

    if (status && status !== DomainStatusFilter.ALL) {
      where.status = status;
    }

    if (domainType && domainType !== DomainTypeFilter.ALL) {
      where.domainType = domainType;
    }

    if (search) {
      where.host = { contains: search, mode: 'insensitive' };
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute queries in parallel
    const [domains, total] = await Promise.all([
      this.prisma.tenantDomain.findMany({
        where,
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.tenantDomain.count({ where }),
    ]);

    return {
      data: domains as TenantDomain[],
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update a domain
   */
  async update(id: string, dto: UpdateDomainDto): Promise<TenantDomain> {
    const domain = await this.findOne(id);

    // Cannot change status of unverified domain to VERIFIED
    if (dto.status === 'VERIFIED' && domain.status === DomainStatus.PENDING) {
      throw new BadRequestException(
        'Cannot activate domain before verification. Please verify the domain first.',
      );
    }

    const updated = await this.prisma.tenantDomain.update({
      where: { id },
      data: { status: dto.status },
    });

    // Invalidate cache
    await this.invalidateDomainCache(domain.host);

    return updated as TenantDomain;
  }

  /**
   * Delete a domain
   */
  async remove(id: string, tenantId?: string): Promise<void> {
    const domain = await this.findOne(id);

    // If tenantId provided, verify ownership
    if (tenantId && domain.tenantId !== tenantId) {
      throw new ForbiddenException('You do not have permission to delete this domain');
    }

    await this.prisma.tenantDomain.delete({
      where: { id },
    });

    // Invalidate cache
    await this.invalidateDomainCache(domain.host);

    this.logger.log(`Deleted domain ${domain.host} (ID: ${id})`);
  }

  /**
   * Trigger verification for a domain
   */
  async verify(id: string, force = false): Promise<{
    success: boolean;
    status: DomainStatus;
    details: {
      txtVerified: boolean;
      cnameVerified: boolean;
      sslStatus?: SslStatus;
    };
    errors: string[];
    dnsInstructions?: DnsConfiguration;
  }> {
    const domain = await this.findOne(id);

    // Skip verification for subdomains
    if (domain.domainType === DomainType.SUBDOMAIN) {
      return {
        success: true,
        status: DomainStatus.VERIFIED,
        details: {
          txtVerified: true,
          cnameVerified: true,
          sslStatus: domain.sslStatus || SslStatus.ACTIVE,
        },
        errors: [],
      };
    }

    // Check if already verified and not forcing re-verification
    if (domain.status === DomainStatus.VERIFIED && !force) {
      return {
        success: true,
        status: DomainStatus.VERIFIED,
        details: {
          txtVerified: true,
          cnameVerified: true,
          sslStatus: domain.sslStatus || undefined,
        },
        errors: [],
      };
    }

    // Perform DNS verification
    const verificationResult = await this.verificationService.verifyDomain(
      domain.host,
      domain.verificationToken || '',
    );

    let newStatus = domain.status as DomainStatus;
    let sslStatus = domain.sslStatus;

    if (verificationResult.success) {
      newStatus = DomainStatus.VERIFIED;
      sslStatus = SslStatus.PENDING; // Trigger SSL provisioning

      // Update domain status
      await this.prisma.tenantDomain.update({
        where: { id },
        data: {
          status: newStatus,
          sslStatus,
          verifiedAt: new Date(),
        },
      });

      this.logger.log(`Domain ${domain.host} verified successfully`);
    } else if (verificationResult.txtRecordFound && !verificationResult.cnameRecordFound) {
      // Ownership verified but routing not set up
      newStatus = DomainStatus.VERIFIED;
      await this.prisma.tenantDomain.update({
        where: { id },
        data: {
          status: newStatus,
          verifiedAt: new Date(),
        },
      });
    }

    // Invalidate cache
    await this.invalidateDomainCache(domain.host);

    // Get DNS instructions if not fully verified
    const dnsInstructions = !verificationResult.success
      ? this.verificationService.getDnsConfiguration(
          domain.host,
          domain.verificationToken || '',
        )
      : undefined;

    return {
      success: verificationResult.success,
      status: newStatus,
      details: {
        txtVerified: verificationResult.txtRecordFound,
        cnameVerified: verificationResult.cnameRecordFound,
        sslStatus: sslStatus || undefined,
      },
      errors: verificationResult.errors,
      dnsInstructions,
    };
  }

  /**
   * Get DNS configuration instructions for a domain
   */
  async getDnsInstructions(id: string): Promise<DnsConfiguration> {
    const domain = await this.findOne(id);

    return this.verificationService.getDnsConfiguration(
      domain.host,
      domain.verificationToken || '',
    );
  }

  /**
   * Resolve a tenant from a host header
   * Used by the tenant context middleware
   */
  async resolveTenant(host: string): Promise<DomainResolution | null> {
    const normalizedHost = host.toLowerCase().trim();

    // Remove port if present
    const hostWithoutPort = normalizedHost.split(':')[0];

    // Check cache first
    const cacheKey = `tenant:domain:${hostWithoutPort}`;
    const cached = await this.cacheService.get<DomainResolution>(cacheKey);
    if (cached) {
      return cached;
    }

    // Look up domain
    const domain = await this.prisma.tenantDomain.findFirst({
      where: {
        host: hostWithoutPort,
        status: DomainStatus.VERIFIED,
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            logoUrl: true,
            primaryColor: true,
          },
        },
      },
    });

    if (!domain || !domain.tenant) {
      return null;
    }

    // Check if organization is active
    if (domain.tenant.status !== 'ACTIVE') {
      this.logger.warn(
        `Domain ${hostWithoutPort} resolved but tenant ${domain.tenantId} is not active (status: ${domain.tenant.status})`,
      );
      return null;
    }

    const resolution: DomainResolution = {
      tenantId: domain.tenantId,
      host: domain.host,
      domainType: domain.domainType,
      tenant: {
        id: domain.tenant.id,
        name: domain.tenant.name,
        slug: domain.tenant.slug,
        status: domain.tenant.status,
        logoUrl: domain.tenant.logoUrl || undefined,
        primaryColor: domain.tenant.primaryColor || undefined,
      },
    };

    // Cache the resolution
    await this.cacheService.set(cacheKey, resolution, this.cacheTtl);

    return resolution;
  }

  /**
   * Get all active domains for a tenant
   */
  async getTenantDomains(tenantId: string): Promise<TenantDomain[]> {
    const domains = await this.prisma.tenantDomain.findMany({
      where: {
        tenantId,
        status: DomainStatus.VERIFIED,
      },
      orderBy: [
        { createdAt: 'asc' },
      ],
    });

    return domains as TenantDomain[];
  }

  /**
   * Invalidate domain cache
   */
  private async invalidateDomainCache(host: string): Promise<void> {
    const normalizedHost = host.toLowerCase().trim();
    const cacheKey = `tenant:domain:${normalizedHost}`;
    await this.cacheService.del(cacheKey);
  }
}
