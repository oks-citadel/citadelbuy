import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RobotsService } from './robots.service';
import { CacheService, CacheTTL } from '@/common/redis/cache.service';

describe('RobotsService', () => {
  let service: RobotsService;
  let cacheService: CacheService;

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    deletePattern: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('https://example.com'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RobotsService,
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<RobotsService>(RobotsService);
    cacheService = module.get<CacheService>(CacheService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateRobotsTxt', () => {
    it('should return cached robots.txt if available', async () => {
      const cachedContent = 'User-agent: *\nDisallow: /admin/';
      mockCacheService.get.mockResolvedValue(cachedContent);

      const result = await service.generateRobotsTxt();

      expect(result).toBe(cachedContent);
      expect(mockCacheService.set).not.toHaveBeenCalled();
    });

    it('should generate and cache robots.txt when not cached', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);

      const result = await service.generateRobotsTxt();

      expect(result).toContain('User-agent:');
      expect(result).toContain('Disallow:');
      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it('should include sitemap URL in robots.txt', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);

      const result = await service.generateRobotsTxt();

      expect(result).toContain('Sitemap:');
      expect(result).toContain('https://example.com');
    });

    it('should include Host directive', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);

      const result = await service.generateRobotsTxt();

      expect(result).toContain('Host:');
    });

    it('should include header comments', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);

      const result = await service.generateRobotsTxt();

      expect(result).toContain('# robots.txt');
      expect(result).toContain('Generated:');
    });
  });

  describe('getConfig', () => {
    it('should return current robots configuration', async () => {
      const config = await service.getConfig();

      expect(config).toBeDefined();
      expect(config.directives).toBeInstanceOf(Array);
      expect(config.sitemaps).toBeInstanceOf(Array);
    });

    it('should include default directives', async () => {
      const config = await service.getConfig();

      expect(config.directives.some((d) => d.userAgent === '*')).toBe(true);
    });

    it('should include Googlebot directives', async () => {
      const config = await service.getConfig();

      expect(config.directives.some((d) => d.userAgent === 'Googlebot')).toBe(true);
    });

    it('should block AI crawlers by default', async () => {
      const config = await service.getConfig();

      const gptBot = config.directives.find((d) => d.userAgent === 'GPTBot');
      expect(gptBot).toBeDefined();
      expect(gptBot?.disallow).toContain('/');
    });
  });

  describe('updateConfig', () => {
    it('should update directives', async () => {
      mockCacheService.delete.mockResolvedValue(undefined);

      const updateDto = {
        directives: [
          {
            userAgent: 'CustomBot',
            allow: ['/'],
            disallow: ['/private/'],
          },
        ],
      };

      const result = await service.updateConfig(updateDto);

      expect(result.directives).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ userAgent: 'CustomBot' }),
        ]),
      );
      expect(mockCacheService.delete).toHaveBeenCalled();
    });

    it('should update sitemaps', async () => {
      mockCacheService.delete.mockResolvedValue(undefined);

      const updateDto = {
        sitemaps: [
          'https://example.com/sitemap1.xml',
          'https://example.com/sitemap2.xml',
        ],
      };

      const result = await service.updateConfig(updateDto);

      expect(result.sitemaps).toContain('https://example.com/sitemap1.xml');
      expect(result.sitemaps).toContain('https://example.com/sitemap2.xml');
    });

    it('should update custom content', async () => {
      mockCacheService.delete.mockResolvedValue(undefined);

      const updateDto = {
        customContent: '# Custom rules\nDisallow: /temp/',
      };

      const result = await service.updateConfig(updateDto);

      expect(result.customContent).toBe('# Custom rules\nDisallow: /temp/');
    });

    it('should invalidate cache after update', async () => {
      mockCacheService.delete.mockResolvedValue(undefined);

      await service.updateConfig({ sitemaps: ['https://example.com/new-sitemap.xml'] });

      expect(mockCacheService.delete).toHaveBeenCalledWith('seo:robots:txt');
    });
  });

  describe('checkAccess', () => {
    it('should return allowed for publicly accessible paths', () => {
      const result = service.checkAccess({
        path: '/products/test-product',
        userAgent: 'Googlebot',
      });

      expect(result.allowed).toBe(true);
    });

    it('should return disallowed for blocked paths', () => {
      const result = service.checkAccess({
        path: '/admin/dashboard',
        userAgent: '*',
      });

      expect(result.allowed).toBe(false);
    });

    it('should check disallow rules for wildcard user agent', () => {
      const result = service.checkAccess({
        path: '/api/users',
        userAgent: '*',
      });

      expect(result.allowed).toBe(false);
      expect(result.matchedRule).toContain('Disallow');
    });

    it('should use wildcard when user agent not found', () => {
      const result = service.checkAccess({
        path: '/checkout/',
        userAgent: 'UnknownBot',
      });

      expect(result.allowed).toBe(false);
    });

    it('should default to wildcard user agent when not provided', () => {
      const result = service.checkAccess({
        path: '/admin/',
      });

      expect(result.userAgent).toBe('*');
    });

    it('should handle paths with query parameters', () => {
      const result = service.checkAccess({
        path: '/products?sort=price',
        userAgent: '*',
      });

      expect(result).toBeDefined();
    });

    it('should allow everything when no matching directive exists', async () => {
      mockCacheService.delete.mockResolvedValue(undefined);

      // Update to empty config
      await service.updateConfig({ directives: [] });

      const result = service.checkAccess({
        path: '/any/path',
        userAgent: 'SomeBot',
      });

      expect(result.allowed).toBe(true);
    });
  });

  describe('invalidateCache', () => {
    it('should delete cached robots.txt', async () => {
      mockCacheService.delete.mockResolvedValue(undefined);

      await service.invalidateCache();

      expect(mockCacheService.delete).toHaveBeenCalledWith('seo:robots:txt');
    });
  });

  describe('getBlockedPaths', () => {
    it('should return blocked paths for all user agents', () => {
      const result = service.getBlockedPaths();

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('userAgent');
      expect(result[0]).toHaveProperty('paths');
    });

    it('should include paths blocked for wildcard user agent', () => {
      const result = service.getBlockedPaths();

      const wildcardEntry = result.find((e) => e.userAgent === '*');
      expect(wildcardEntry).toBeDefined();
      expect(wildcardEntry?.paths).toContain('/admin/');
    });
  });

  describe('addDisallowPath', () => {
    it('should add path to existing user agent directive', async () => {
      mockCacheService.delete.mockResolvedValue(undefined);

      await service.addDisallowPath('*', '/new-blocked-path/');

      const config = await service.getConfig();
      const wildcardDirective = config.directives.find((d) => d.userAgent === '*');

      expect(wildcardDirective?.disallow).toContain('/new-blocked-path/');
    });

    it('should create new directive if user agent does not exist', async () => {
      mockCacheService.delete.mockResolvedValue(undefined);

      await service.addDisallowPath('NewBot', '/blocked/');

      const config = await service.getConfig();
      const newBotDirective = config.directives.find((d) => d.userAgent === 'NewBot');

      expect(newBotDirective).toBeDefined();
      expect(newBotDirective?.disallow).toContain('/blocked/');
    });

    it('should not duplicate paths', async () => {
      mockCacheService.delete.mockResolvedValue(undefined);

      await service.addDisallowPath('*', '/admin/');
      await service.addDisallowPath('*', '/admin/');

      const config = await service.getConfig();
      const wildcardDirective = config.directives.find((d) => d.userAgent === '*');
      const adminCount = wildcardDirective?.disallow?.filter((p) => p === '/admin/').length || 0;

      expect(adminCount).toBe(1);
    });

    it('should invalidate cache after adding path', async () => {
      mockCacheService.delete.mockResolvedValue(undefined);

      await service.addDisallowPath('*', '/temp/');

      expect(mockCacheService.delete).toHaveBeenCalled();
    });
  });

  describe('removeDisallowPath', () => {
    it('should remove path from user agent directive', async () => {
      mockCacheService.delete.mockResolvedValue(undefined);

      // First add a path
      await service.addDisallowPath('*', '/temp-path/');

      // Then remove it
      await service.removeDisallowPath('*', '/temp-path/');

      const config = await service.getConfig();
      const wildcardDirective = config.directives.find((d) => d.userAgent === '*');

      expect(wildcardDirective?.disallow).not.toContain('/temp-path/');
    });

    it('should handle removing non-existent path gracefully', async () => {
      mockCacheService.delete.mockResolvedValue(undefined);

      await expect(
        service.removeDisallowPath('*', '/nonexistent-path/'),
      ).resolves.not.toThrow();
    });

    it('should handle removing from non-existent user agent gracefully', async () => {
      mockCacheService.delete.mockResolvedValue(undefined);

      await expect(
        service.removeDisallowPath('NonExistentBot', '/some-path/'),
      ).resolves.not.toThrow();
    });

    it('should invalidate cache after removing path', async () => {
      mockCacheService.delete.mockResolvedValue(undefined);

      await service.removeDisallowPath('*', '/api/');

      expect(mockCacheService.delete).toHaveBeenCalled();
    });
  });

  describe('configuration', () => {
    it('should work with default APP_URL when not configured', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          RobotsService,
          {
            provide: CacheService,
            useValue: mockCacheService,
          },
          {
            provide: ConfigService,
            useValue: { get: jest.fn().mockReturnValue(undefined) },
          },
        ],
      }).compile();

      const newService = module.get<RobotsService>(RobotsService);
      expect(newService).toBeDefined();
    });
  });
});
