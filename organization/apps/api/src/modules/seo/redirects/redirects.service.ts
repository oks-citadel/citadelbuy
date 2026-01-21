import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CacheService, CacheTTL } from '@/common/redis/cache.service';
import {
  CreateRedirectDto,
  UpdateRedirectDto,
  RedirectDto,
  RedirectQueryDto,
  RedirectBulkImportDto,
  RedirectChainDto,
  RedirectAnalyticsDto,
  RedirectValidationResultDto,
  RedirectType,
  RedirectStatus,
} from '../dto/redirects.dto';

@Injectable()
export class RedirectsService {
  private readonly logger = new Logger(RedirectsService.name);
  private readonly cachePrefix = 'seo:redirects:';
  private readonly CACHE_TTL = CacheTTL.MEDIUM;

  // In-memory storage for redirects (in production, use database)
  private redirects: Map<string, RedirectDto> = new Map();
  private redirectAnalytics: Map<string, { hits: number; lastHit: Date }> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {
    this.initializeDefaultRedirects();
  }

  /**
   * Initialize with common default redirects
   */
  private initializeDefaultRedirects(): void {
    // Common redirects for trailing slashes, www normalization, etc.
    const defaults: CreateRedirectDto[] = [
      {
        source: '/home',
        destination: '/',
        type: RedirectType.PERMANENT,
        isRegex: false,
        preserveQueryString: true,
      },
      {
        source: '/index.html',
        destination: '/',
        type: RedirectType.PERMANENT,
        isRegex: false,
        preserveQueryString: false,
      },
      {
        source: '/index.php',
        destination: '/',
        type: RedirectType.PERMANENT,
        isRegex: false,
        preserveQueryString: false,
      },
    ];

    for (const redirect of defaults) {
      const id = this.generateId();
      this.redirects.set(id, {
        id,
        source: redirect.source,
        destination: redirect.destination,
        type: redirect.type,
        isRegex: redirect.isRegex ?? false,
        preserveQueryString: redirect.preserveQueryString ?? true,
        hitCount: 0,
        status: RedirectStatus.ACTIVE,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  /**
   * Get all redirects with filtering and pagination
   */
  async getRedirects(query: RedirectQueryDto): Promise<{
    redirects: RedirectDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const cacheKey = `${this.cachePrefix}list:${JSON.stringify(query)}`;
    const cached = await this.cacheService.get<any>(cacheKey);
    if (cached) return cached;

    let redirects = Array.from(this.redirects.values());

    // Apply filters
    if (query.status) {
      redirects = redirects.filter(r => r.status === query.status);
    }

    if (query.type) {
      redirects = redirects.filter(r => r.type === query.type);
    }

    if (query.search) {
      const searchLower = query.search.toLowerCase();
      redirects = redirects.filter(r =>
        r.source.toLowerCase().includes(searchLower) ||
        r.destination.toLowerCase().includes(searchLower)
      );
    }

    // Sort
    const sortField = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';
    redirects.sort((a, b) => {
      const aVal = a[sortField as keyof RedirectDto];
      const bVal = b[sortField as keyof RedirectDto];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });

    // Pagination
    const page = query.page || 1;
    const limit = query.limit || 50;
    const total = redirects.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paginatedRedirects = redirects.slice(start, start + limit);

    const result = {
      redirects: paginatedRedirects,
      total,
      page,
      limit,
      totalPages,
    };

    await this.cacheService.set(cacheKey, result, { ttl: this.CACHE_TTL });

    return result;
  }

  /**
   * Get a single redirect by ID
   */
  async getRedirect(id: string): Promise<RedirectDto> {
    const redirect = this.redirects.get(id);
    if (!redirect) {
      throw new NotFoundException(`Redirect with ID ${id} not found`);
    }
    return redirect;
  }

  /**
   * Create a new redirect
   */
  async createRedirect(dto: CreateRedirectDto): Promise<RedirectDto> {
    // Check for existing redirect with same source
    for (const [, redirect] of this.redirects) {
      if (redirect.source === dto.source && redirect.status === RedirectStatus.ACTIVE) {
        throw new ConflictException(`A redirect for source "${dto.source}" already exists`);
      }
    }

    // Validate redirect (no loops, etc.)
    const validation = await this.validateRedirect(dto.source, dto.destination);
    if (!validation.isValid) {
      throw new ConflictException(validation.errors?.join(', '));
    }

    const id = this.generateId();
    const redirect: RedirectDto = {
      id,
      source: dto.source,
      destination: dto.destination,
      type: dto.type,
      isRegex: dto.isRegex ?? false,
      preserveQueryString: dto.preserveQueryString ?? true,
      hitCount: 0,
      status: RedirectStatus.ACTIVE,
      expiresAt: dto.expiresAt,
      notes: dto.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.redirects.set(id, redirect);
    await this.invalidateCache();

    this.logger.log(`Created redirect: ${dto.source} -> ${dto.destination} (${dto.type})`);

    return redirect;
  }

  /**
   * Update an existing redirect
   */
  async updateRedirect(id: string, dto: UpdateRedirectDto): Promise<RedirectDto> {
    const existing = this.redirects.get(id);
    if (!existing) {
      throw new NotFoundException(`Redirect with ID ${id} not found`);
    }

    // Validate if destination is changing
    if (dto.destination && dto.destination !== existing.destination) {
      const validation = await this.validateRedirect(
        dto.source || existing.source,
        dto.destination
      );
      if (!validation.isValid) {
        throw new ConflictException(validation.errors?.join(', '));
      }
    }

    const updated: RedirectDto = {
      ...existing,
      ...dto,
      updatedAt: new Date().toISOString(),
    };

    this.redirects.set(id, updated);
    await this.invalidateCache();

    this.logger.log(`Updated redirect ${id}`);

    return updated;
  }

  /**
   * Delete a redirect
   */
  async deleteRedirect(id: string): Promise<void> {
    if (!this.redirects.has(id)) {
      throw new NotFoundException(`Redirect with ID ${id} not found`);
    }

    this.redirects.delete(id);
    this.redirectAnalytics.delete(id);
    await this.invalidateCache();

    this.logger.log(`Deleted redirect ${id}`);
  }

  /**
   * Bulk import redirects
   */
  async bulkImport(dto: RedirectBulkImportDto): Promise<{
    imported: number;
    skipped: number;
    errors: string[];
  }> {
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const item of dto.redirects) {
      try {
        // Check for existing
        let exists = false;
        for (const [, redirect] of this.redirects) {
          if (redirect.source === item.source && redirect.status === RedirectStatus.ACTIVE) {
            if (dto.skipExisting) {
              skipped++;
              exists = true;
              break;
            } else if (dto.overwriteExisting) {
              // Delete existing
              for (const [id, r] of this.redirects) {
                if (r.source === item.source && r.status === RedirectStatus.ACTIVE) {
                  this.redirects.delete(id);
                  break;
                }
              }
            }
          }
        }

        if (!exists || dto.overwriteExisting) {
          await this.createRedirect({
            source: item.source,
            destination: item.destination,
            type: item.type || RedirectType.PERMANENT,
            isRegex: false,
            preserveQueryString: true,
          });
          imported++;
        }
      } catch (error) {
        errors.push(`${item.source}: ${(error as Error).message}`);
      }
    }

    await this.invalidateCache();

    this.logger.log(`Bulk import: ${imported} imported, ${skipped} skipped, ${errors.length} errors`);

    return { imported, skipped, errors };
  }

  /**
   * Find redirect for a given URL
   */
  async findRedirectForUrl(url: string): Promise<RedirectDto | null> {
    const cacheKey = `${this.cachePrefix}lookup:${url}`;
    const cached = await this.cacheService.get<RedirectDto>(cacheKey);
    if (cached) {
      // Record hit
      this.recordHit(cached.id);
      return cached;
    }

    // Find matching redirect
    for (const [, redirect] of this.redirects) {
      if (redirect.status !== RedirectStatus.ACTIVE) continue;

      let matches = false;

      if (redirect.isRegex) {
        try {
          const regex = new RegExp(redirect.source);
          matches = regex.test(url);
        } catch {
          // Invalid regex, skip
          continue;
        }
      } else {
        // Exact match or pattern match
        matches = url === redirect.source || url.startsWith(redirect.source);
      }

      if (matches) {
        await this.cacheService.set(cacheKey, redirect, { ttl: CacheTTL.LONG });
        this.recordHit(redirect.id);
        return redirect;
      }
    }

    return null;
  }

  /**
   * Detect redirect chains
   */
  async detectRedirectChains(): Promise<RedirectChainDto[]> {
    const chains: RedirectChainDto[] = [];
    const visited = new Set<string>();

    for (const [, redirect] of this.redirects) {
      if (redirect.status !== RedirectStatus.ACTIVE) continue;
      if (visited.has(redirect.source)) continue;

      const chain: string[] = [redirect.source];
      let current = redirect.destination;
      visited.add(redirect.source);

      // Follow the chain
      while (true) {
        const nextRedirect = await this.findRedirectBySource(current);
        if (!nextRedirect || chain.includes(current)) {
          break;
        }

        chain.push(current);
        visited.add(current);
        current = nextRedirect.destination;
      }

      chain.push(current); // Final destination

      if (chain.length > 2) {
        // More than one hop
        chains.push({
          startUrl: chain[0],
          endUrl: chain[chain.length - 1],
          chain,
          chainLength: chain.length - 1,
          isLoop: chain[0] === chain[chain.length - 1],
        });
      }
    }

    return chains;
  }

  /**
   * Validate a redirect
   */
  async validateRedirect(source: string, destination: string): Promise<RedirectValidationResultDto> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for self-redirect
    if (source === destination) {
      errors.push('Source and destination cannot be the same (self-redirect)');
    }

    // Check for redirect loops
    const chain = await this.buildChain(source, destination, 10);
    if (chain.includes(source)) {
      errors.push('This redirect would create a redirect loop');
    }

    // Check chain length
    if (chain.length > 3) {
      warnings.push(`This redirect creates a chain of ${chain.length} hops. Consider direct redirect.`);
    }

    // Validate URL format
    if (!source.startsWith('/') && !source.startsWith('http')) {
      errors.push('Source must be a path starting with "/" or a full URL');
    }

    if (!destination.startsWith('/') && !destination.startsWith('http')) {
      errors.push('Destination must be a path starting with "/" or a full URL');
    }

    // Check for common mistakes
    if (source.endsWith('/') && !destination.endsWith('/')) {
      warnings.push('Source has trailing slash but destination does not - may cause issues');
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      chainLength: chain.length,
    };
  }

  /**
   * Get redirect analytics
   */
  async getAnalytics(id?: string): Promise<RedirectAnalyticsDto | RedirectAnalyticsDto[]> {
    if (id) {
      const redirect = this.redirects.get(id);
      if (!redirect) {
        throw new NotFoundException(`Redirect with ID ${id} not found`);
      }

      const analytics = this.redirectAnalytics.get(id);
      return {
        redirectId: id,
        source: redirect.source,
        destination: redirect.destination,
        hitCount: analytics?.hits || redirect.hitCount,
        lastHitAt: analytics?.lastHit?.toISOString(),
        hitsByDay: [], // Would come from time-series data
      };
    }

    // Return all analytics
    const results: RedirectAnalyticsDto[] = [];
    for (const [id, redirect] of this.redirects) {
      const analytics = this.redirectAnalytics.get(id);
      results.push({
        redirectId: id,
        source: redirect.source,
        destination: redirect.destination,
        hitCount: analytics?.hits || redirect.hitCount,
        lastHitAt: analytics?.lastHit?.toISOString(),
      });
    }

    return results.sort((a, b) => b.hitCount - a.hitCount);
  }

  /**
   * Test a redirect
   */
  async testRedirect(url: string): Promise<{
    url: string;
    redirectFound: boolean;
    redirect?: RedirectDto;
    finalDestination?: string;
    chain?: string[];
    statusCode?: number;
  }> {
    const redirect = await this.findRedirectForUrl(url);

    if (!redirect) {
      return {
        url,
        redirectFound: false,
      };
    }

    // Build full chain
    const chain = await this.buildChain(url, redirect.destination, 10);

    return {
      url,
      redirectFound: true,
      redirect,
      finalDestination: chain[chain.length - 1],
      chain,
      statusCode: redirect.type === RedirectType.PERMANENT ? 301 : 302,
    };
  }

  /**
   * Export redirects
   */
  async exportRedirects(format: 'json' | 'csv' | 'htaccess' | 'nginx'): Promise<string> {
    const redirects = Array.from(this.redirects.values()).filter(
      r => r.status === RedirectStatus.ACTIVE
    );

    switch (format) {
      case 'json':
        return JSON.stringify(redirects, null, 2);

      case 'csv':
        const headers = 'source,destination,type\n';
        const rows = redirects.map(r => `"${r.source}","${r.destination}","${r.type}"`).join('\n');
        return headers + rows;

      case 'htaccess':
        return redirects.map(r => {
          const code = r.type === RedirectType.PERMANENT ? 'R=301' : 'R=302';
          if (r.isRegex) {
            return `RewriteRule ^${r.source}$ ${r.destination} [${code},L]`;
          }
          return `Redirect ${r.type === RedirectType.PERMANENT ? '301' : '302'} ${r.source} ${r.destination}`;
        }).join('\n');

      case 'nginx':
        return redirects.map(r => {
          const code = r.type === RedirectType.PERMANENT ? 'permanent' : 'redirect';
          if (r.isRegex) {
            return `rewrite ^${r.source}$ ${r.destination} ${code};`;
          }
          return `location = ${r.source} { return ${r.type === RedirectType.PERMANENT ? '301' : '302'} ${r.destination}; }`;
        }).join('\n');

      default:
        return JSON.stringify(redirects, null, 2);
    }
  }

  // Helper methods

  private generateId(): string {
    return 'redir_' + Math.random().toString(36).substring(2, 15);
  }

  private async findRedirectBySource(source: string): Promise<RedirectDto | null> {
    for (const [, redirect] of this.redirects) {
      if (redirect.source === source && redirect.status === RedirectStatus.ACTIVE) {
        return redirect;
      }
    }
    return null;
  }

  private async buildChain(source: string, initialDest: string, maxDepth: number): Promise<string[]> {
    const chain = [source, initialDest];
    let current = initialDest;
    let depth = 0;

    while (depth < maxDepth) {
      const nextRedirect = await this.findRedirectBySource(current);
      if (!nextRedirect) break;
      if (chain.includes(nextRedirect.destination)) {
        chain.push(nextRedirect.destination); // Show loop
        break;
      }
      chain.push(nextRedirect.destination);
      current = nextRedirect.destination;
      depth++;
    }

    return chain;
  }

  private recordHit(redirectId: string): void {
    const redirect = this.redirects.get(redirectId);
    if (redirect) {
      redirect.hitCount++;
      this.redirectAnalytics.set(redirectId, {
        hits: redirect.hitCount,
        lastHit: new Date(),
      });
    }
  }

  private async invalidateCache(): Promise<void> {
    await this.cacheService.deletePattern(`${this.cachePrefix}*`);
  }
}
