import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService, CacheTTL } from '@/common/redis/cache.service';
import { RobotsConfig, RobotsDirective } from '../interfaces/seo.interfaces';
import { UpdateRobotsDto, CrawlAccessCheckDto } from '../dto/robots.dto';

@Injectable()
export class RobotsService {
  private readonly logger = new Logger(RobotsService.name);
  private readonly baseUrl: string;
  private readonly cacheKey = 'seo:robots:txt';

  // Default configuration
  private defaultConfig: RobotsConfig = {
    directives: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/products/',
          '/categories/',
          '/blog/',
          '/deals/',
        ],
        disallow: [
          '/api/',
          '/admin/',
          '/admin/*',
          '/checkout/',
          '/cart/',
          '/account/',
          '/account/*',
          '/login',
          '/register',
          '/reset-password',
          '/verify-email',
          '/private/',
          '/*?*sessionid=',
          '/*?*session_id=',
          '/*?*sid=',
          '/*?*token=',
          '/*?*utm_*',
          '/*?*ref=',
          '/*?*sort=',
          '/*?*filter=',
          '/*?*page=',
          '/search?*',
          '/*.json$',
          '/*.xml$',
          '/api-docs',
          '/api/docs',
          '/swagger',
          '/graphql',
          '/webhooks/',
          '/_next/',
          '/static/admin/',
        ],
        crawlDelay: 1,
      },
      {
        userAgent: 'Googlebot',
        allow: [
          '/',
          '/products/',
          '/categories/',
          '/blog/',
          '/deals/',
          '/*.js',
          '/*.css',
        ],
        disallow: [
          '/api/',
          '/admin/',
          '/checkout/',
          '/cart/',
          '/account/',
          '/login',
          '/register',
        ],
      },
      {
        userAgent: 'Googlebot-Image',
        allow: ['/images/', '/media/', '/uploads/'],
        disallow: ['/api/', '/admin/'],
      },
      {
        userAgent: 'Bingbot',
        allow: ['/', '/products/', '/categories/'],
        disallow: ['/api/', '/admin/', '/checkout/', '/cart/', '/account/'],
        crawlDelay: 2,
      },
      {
        userAgent: 'GPTBot',
        disallow: ['/'], // Block AI crawlers by default
      },
      {
        userAgent: 'CCBot',
        disallow: ['/'], // Block Common Crawl
      },
      {
        userAgent: 'anthropic-ai',
        disallow: ['/'], // Block Anthropic crawler
      },
      {
        userAgent: 'ChatGPT-User',
        disallow: ['/'], // Block ChatGPT
      },
    ],
    sitemaps: [],
  };

  constructor(
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('APP_URL') || 'https://example.com';
    // Add dynamic sitemap URLs
    this.defaultConfig.sitemaps = [
      `${this.baseUrl}/api/seo/sitemap.xml`,
    ];
  }

  /**
   * Generate robots.txt content
   */
  async generateRobotsTxt(): Promise<string> {
    const cached = await this.cacheService.get<string>(this.cacheKey);
    if (cached) {
      return cached;
    }

    const config = await this.getConfig();
    const content = this.buildRobotsTxt(config);

    await this.cacheService.set(this.cacheKey, content, { ttl: CacheTTL.DAY });

    return content;
  }

  /**
   * Get current robots configuration
   */
  async getConfig(): Promise<RobotsConfig> {
    // In a production system, this might be stored in the database
    // For now, return the default config
    return this.defaultConfig;
  }

  /**
   * Update robots configuration
   */
  async updateConfig(updateDto: UpdateRobotsDto): Promise<RobotsConfig> {
    // Merge with existing config
    if (updateDto.directives) {
      this.defaultConfig.directives = updateDto.directives.map((d) => ({
        userAgent: d.userAgent,
        allow: d.allow,
        disallow: d.disallow,
        crawlDelay: d.crawlDelay,
      }));
    }

    if (updateDto.sitemaps) {
      this.defaultConfig.sitemaps = updateDto.sitemaps;
    }

    if (updateDto.customContent) {
      this.defaultConfig.customContent = updateDto.customContent;
    }

    // Invalidate cache
    await this.cacheService.delete(this.cacheKey);

    this.logger.log('Robots.txt configuration updated');

    return this.defaultConfig;
  }

  /**
   * Check if a path is allowed for a user agent
   */
  checkAccess(dto: CrawlAccessCheckDto): {
    allowed: boolean;
    matchedRule?: string;
    userAgent: string;
  } {
    const userAgent = dto.userAgent || '*';
    const path = dto.path;

    // Find matching directive
    let directive = this.defaultConfig.directives.find(
      (d) => d.userAgent.toLowerCase() === userAgent.toLowerCase(),
    );

    // Fall back to wildcard
    if (!directive) {
      directive = this.defaultConfig.directives.find((d) => d.userAgent === '*');
    }

    if (!directive) {
      return { allowed: true, userAgent };
    }

    // Check disallow rules first (more specific)
    if (directive.disallow) {
      for (const rule of directive.disallow) {
        if (this.matchesRule(path, rule)) {
          // Check if there's a more specific allow rule
          if (directive.allow) {
            for (const allowRule of directive.allow) {
              if (this.matchesRule(path, allowRule) && allowRule.length > rule.length) {
                return { allowed: true, matchedRule: `Allow: ${allowRule}`, userAgent };
              }
            }
          }
          return { allowed: false, matchedRule: `Disallow: ${rule}`, userAgent };
        }
      }
    }

    // Check allow rules
    if (directive.allow) {
      for (const rule of directive.allow) {
        if (this.matchesRule(path, rule)) {
          return { allowed: true, matchedRule: `Allow: ${rule}`, userAgent };
        }
      }
    }

    // Default allow
    return { allowed: true, userAgent };
  }

  /**
   * Build robots.txt content from config
   */
  private buildRobotsTxt(config: RobotsConfig): string {
    let content = '';

    // Add header comment
    content += '# robots.txt for Broxiva E-Commerce Platform\n';
    content += `# Generated: ${new Date().toISOString()}\n`;
    content += '#\n';
    content += '# Please respect our crawl guidelines.\n';
    content += '# For issues, contact: seo@broxiva.com\n\n';

    // Add directives
    for (const directive of config.directives) {
      content += `User-agent: ${directive.userAgent}\n`;

      if (directive.allow) {
        for (const path of directive.allow) {
          content += `Allow: ${path}\n`;
        }
      }

      if (directive.disallow) {
        for (const path of directive.disallow) {
          content += `Disallow: ${path}\n`;
        }
      }

      if (directive.crawlDelay !== undefined) {
        content += `Crawl-delay: ${directive.crawlDelay}\n`;
      }

      content += '\n';
    }

    // Add sitemaps
    if (config.sitemaps && config.sitemaps.length > 0) {
      content += '# Sitemaps\n';
      for (const sitemap of config.sitemaps) {
        content += `Sitemap: ${sitemap}\n`;
      }
      content += '\n';
    }

    // Add custom content
    if (config.customContent) {
      content += '# Custom Rules\n';
      content += config.customContent;
      content += '\n';
    }

    // Add host directive
    content += `# Host\nHost: ${this.baseUrl.replace(/^https?:\/\//, '')}\n`;

    return content;
  }

  /**
   * Check if path matches a robots.txt rule
   */
  private matchesRule(path: string, rule: string): boolean {
    // Handle empty rule
    if (!rule || rule === '') {
      return false;
    }

    // Convert rule to regex
    let pattern = rule
      .replace(/\*/g, '.*') // * matches anything
      .replace(/\$/g, '$') // $ matches end of URL
      .replace(/\?/g, '\\?'); // Escape ?

    // If rule doesn't start with /, add it
    if (!pattern.startsWith('/')) {
      pattern = '/' + pattern;
    }

    // If rule ends with $, match exactly
    const matchEnd = pattern.endsWith('$');
    if (!matchEnd) {
      // Otherwise, match prefix
      pattern = '^' + pattern;
    } else {
      pattern = '^' + pattern.slice(0, -1) + '$';
    }

    try {
      const regex = new RegExp(pattern);
      return regex.test(path);
    } catch {
      // If regex fails, do simple prefix match
      return path.startsWith(rule);
    }
  }

  /**
   * Invalidate robots.txt cache
   */
  async invalidateCache(): Promise<void> {
    await this.cacheService.delete(this.cacheKey);
    this.logger.log('Robots.txt cache invalidated');
  }

  /**
   * Get blocked paths summary
   */
  getBlockedPaths(): { userAgent: string; paths: string[] }[] {
    return this.defaultConfig.directives.map((d) => ({
      userAgent: d.userAgent,
      paths: d.disallow || [],
    }));
  }

  /**
   * Add a path to disallow list
   */
  async addDisallowPath(userAgent: string, path: string): Promise<void> {
    const directive = this.defaultConfig.directives.find(
      (d) => d.userAgent === userAgent,
    );

    if (directive) {
      if (!directive.disallow) {
        directive.disallow = [];
      }
      if (!directive.disallow.includes(path)) {
        directive.disallow.push(path);
      }
    } else {
      this.defaultConfig.directives.push({
        userAgent,
        disallow: [path],
      });
    }

    await this.invalidateCache();
  }

  /**
   * Remove a path from disallow list
   */
  async removeDisallowPath(userAgent: string, path: string): Promise<void> {
    const directive = this.defaultConfig.directives.find(
      (d) => d.userAgent === userAgent,
    );

    if (directive && directive.disallow) {
      directive.disallow = directive.disallow.filter((p) => p !== path);
    }

    await this.invalidateCache();
  }
}
