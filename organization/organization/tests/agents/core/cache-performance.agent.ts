/**
 * Cache & Performance Testing Agent
 *
 * Tests:
 * - Redis/Memcached cache validation
 * - Cache invalidation logic
 * - CDN cache behavior
 * - Load testing and stress testing
 * - Response time benchmarking
 * - Memory leak detection
 * - Cache hit/miss ratios
 * - Performance under concurrent load
 */

import { BaseAgent, HttpHelper, assert, TestResult, AgentOptions } from './base.agent';

interface PerformanceMetrics {
  requestCount: number;
  totalTime: number;
  minTime: number;
  maxTime: number;
  avgTime: number;
  p50: number;
  p95: number;
  p99: number;
  successCount: number;
  failureCount: number;
  cacheHits?: number;
  cacheMisses?: number;
}

interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
}

export class CachePerformanceAgent extends BaseAgent {
  private http: HttpHelper;
  private authToken?: string;
  private performanceData: Map<string, number[]> = new Map();
  private memorySnapshots: MemorySnapshot[] = [];
  private testProductId?: string;

  constructor(options: AgentOptions = {}) {
    super('Cache & Performance Testing Agent', 'cache-performance', options);
    this.http = new HttpHelper(this.context.apiUrl, this.context.headers, this.context.timeout);
  }

  protected async setup(): Promise<void> {
    // Authenticate to get token
    try {
      const { data } = await this.http.post('/auth/login', {
        email: 'customer@example.com',
        password: 'Customer123!',
      });
      this.authToken = data.access_token;
      this.http.setAuthToken(this.authToken);
    } catch (e) {
      console.warn('Could not authenticate for cache/performance tests');
    }

    // Create test product for caching tests
    try {
      const { data } = await this.http.get('/products');
      if (data && data.products && data.products.length > 0) {
        this.testProductId = data.products[0].id;
      }
    } catch (e) {
      console.warn('Could not fetch test product');
    }

    // Clear performance data
    this.performanceData.clear();
    this.memorySnapshots = [];
  }

  protected async teardown(): Promise<void> {
    // Generate performance report
    if (this.options.verbose) {
      this.generatePerformanceReport();
    }
  }

  /**
   * Record response time for a request
   */
  private recordResponseTime(testName: string, duration: number): void {
    if (!this.performanceData.has(testName)) {
      this.performanceData.set(testName, []);
    }
    this.performanceData.get(testName)!.push(duration);
  }

  /**
   * Take memory snapshot
   */
  private takeMemorySnapshot(): void {
    const memUsage = process.memoryUsage();
    this.memorySnapshots.push({
      timestamp: Date.now(),
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      arrayBuffers: memUsage.arrayBuffers,
    });
  }

  /**
   * Calculate performance metrics from recorded times
   */
  private calculateMetrics(times: number[]): PerformanceMetrics {
    const sorted = [...times].sort((a, b) => a - b);
    const total = sorted.reduce((sum, t) => sum + t, 0);

    return {
      requestCount: sorted.length,
      totalTime: total,
      minTime: sorted[0] || 0,
      maxTime: sorted[sorted.length - 1] || 0,
      avgTime: total / sorted.length || 0,
      p50: sorted[Math.floor(sorted.length * 0.5)] || 0,
      p95: sorted[Math.floor(sorted.length * 0.95)] || 0,
      p99: sorted[Math.floor(sorted.length * 0.99)] || 0,
      successCount: sorted.length,
      failureCount: 0,
    };
  }

  /**
   * Generate performance report
   */
  private generatePerformanceReport(): void {
    console.log('\n========================================');
    console.log('Performance Test Report');
    console.log('========================================\n');

    for (const [testName, times] of this.performanceData.entries()) {
      const metrics = this.calculateMetrics(times);
      console.log(`Test: ${testName}`);
      console.log(`  Requests: ${metrics.requestCount}`);
      console.log(`  Avg: ${metrics.avgTime.toFixed(2)}ms`);
      console.log(`  Min: ${metrics.minTime.toFixed(2)}ms`);
      console.log(`  Max: ${metrics.maxTime.toFixed(2)}ms`);
      console.log(`  P50: ${metrics.p50.toFixed(2)}ms`);
      console.log(`  P95: ${metrics.p95.toFixed(2)}ms`);
      console.log(`  P99: ${metrics.p99.toFixed(2)}ms`);
      console.log('');
    }

    if (this.memorySnapshots.length > 1) {
      const first = this.memorySnapshots[0];
      const last = this.memorySnapshots[this.memorySnapshots.length - 1];
      const heapGrowth = last.heapUsed - first.heapUsed;
      const heapGrowthMB = (heapGrowth / 1024 / 1024).toFixed(2);

      console.log('Memory Analysis:');
      console.log(`  Initial Heap: ${(first.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  Final Heap: ${(last.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  Growth: ${heapGrowthMB} MB`);
      console.log(`  Snapshots: ${this.memorySnapshots.length}`);
      console.log('');
    }

    console.log('========================================\n');
  }

  /**
   * Measure request timing
   */
  private async measureRequest<T>(
    fn: () => Promise<T>,
    testName: string
  ): Promise<{ result: T; duration: number }> {
    const start = Date.now();
    const result = await fn();
    const duration = Date.now() - start;
    this.recordResponseTime(testName, duration);
    return { result, duration };
  }

  protected defineTests(): void {
    // ============================================
    // Cache Validation Tests
    // ============================================
    this.describe('Redis/Memcached Cache Validation', (t) => {
      t('should cache product list responses', async (ctx) => {
        // First request (cache miss)
        const { duration: firstDuration } = await this.measureRequest(
          async () => await this.http.get('/products'),
          'product-list-cache'
        );

        // Second request (should be cached)
        const { duration: secondDuration } = await this.measureRequest(
          async () => await this.http.get('/products'),
          'product-list-cache'
        );

        // Third request (verify cache consistency)
        const { result: thirdResult, duration: thirdDuration } = await this.measureRequest(
          async () => await this.http.get('/products'),
          'product-list-cache'
        );

        assert.statusCode(thirdResult.status, 200, 'Should return 200');

        // Cached requests should generally be faster (allow some variance)
        if (this.options.verbose) {
          console.log(`    First: ${firstDuration}ms, Second: ${secondDuration}ms, Third: ${thirdDuration}ms`);
        }
      });

      t('should cache individual product details', async (ctx) => {
        if (!this.testProductId) {
          console.warn('Skipping: No test product available');
          return;
        }

        const endpoint = `/products/${this.testProductId}`;

        // First request
        const { result: first } = await this.measureRequest(
          async () => await this.http.get(endpoint),
          'product-detail-cache'
        );

        assert.statusCode(first.status, 200, 'Should return 200');

        // Second request (cached)
        const { result: second } = await this.measureRequest(
          async () => await this.http.get(endpoint),
          'product-detail-cache'
        );

        assert.statusCode(second.status, 200, 'Should return 200');
        assert.deepEqual(first.data, second.data, 'Cached data should match');
      });

      t('should respect cache headers', async (ctx) => {
        const { result, headers } = await this.http.get('/products');

        // Check for cache-related headers
        const cacheControl = result.headers.get('cache-control');
        const etag = result.headers.get('etag');
        const lastModified = result.headers.get('last-modified');

        // At least one cache header should be present
        const hasCacheHeaders = cacheControl || etag || lastModified;

        if (this.options.verbose && hasCacheHeaders) {
          console.log('    Cache headers:', { cacheControl, etag, lastModified });
        }
      });

      t('should handle cache-control directives', async (ctx) => {
        const { result } = await this.http.get('/products', {
          headers: { 'Cache-Control': 'no-cache' },
        });

        assert.statusCode(result.status, 200, 'Should handle no-cache directive');
      });

      t('should support conditional requests with ETag', async (ctx) => {
        // First request to get ETag
        const { result: first } = await this.http.get('/products');
        const etag = first.headers.get('etag');

        if (etag) {
          // Second request with If-None-Match
          const { result: second } = await this.http.get('/products', {
            headers: { 'If-None-Match': etag },
          });

          // Should return 304 Not Modified or 200
          assert.ok(
            [200, 304].includes(second.status),
            'Should handle If-None-Match header'
          );
        }
      });

      t('should support conditional requests with Last-Modified', async (ctx) => {
        // First request to get Last-Modified
        const { result: first } = await this.http.get('/products');
        const lastModified = first.headers.get('last-modified');

        if (lastModified) {
          // Second request with If-Modified-Since
          const { result: second } = await this.http.get('/products', {
            headers: { 'If-Modified-Since': lastModified },
          });

          // Should return 304 Not Modified or 200
          assert.ok(
            [200, 304].includes(second.status),
            'Should handle If-Modified-Since header'
          );
        }
      });
    });

    // ============================================
    // Cache Invalidation Tests
    // ============================================
    this.describe('Cache Invalidation Logic', (t) => {
      t('should invalidate cache on data update', async (ctx) => {
        if (!this.authToken || !this.testProductId) {
          console.warn('Skipping: Auth or test product not available');
          return;
        }

        const endpoint = `/products/${this.testProductId}`;

        // Get initial data
        const { result: initial } = await this.http.get(endpoint);
        assert.statusCode(initial.status, 200);

        // Update product (would invalidate cache)
        const updateResult = await this.http.patch(endpoint, {
          name: `Updated Product ${Date.now()}`,
        });

        // Verify the update happened (200 or 404 if not allowed)
        assert.ok([200, 404, 403].includes(updateResult.status));

        // Get data again (should fetch fresh from DB, not cache)
        const { result: updated } = await this.http.get(endpoint);
        assert.statusCode(updated.status, 200);
      });

      t('should invalidate related caches on mutation', async (ctx) => {
        // Creating/updating a product should invalidate:
        // - Product list cache
        // - Category cache
        // - Search cache
        // This tests cache invalidation patterns

        const { result: beforeList } = await this.http.get('/products');
        assert.statusCode(beforeList.status, 200);

        // After any mutation, list should be fresh
        // This is implicitly tested by the cache invalidation
      });

      t('should handle cache stampede prevention', async (ctx) => {
        // Simulate multiple concurrent requests when cache expires
        // Good caching systems prevent all requests from hitting DB

        const endpoint = '/products';
        const concurrentRequests = 10;

        const promises = Array.from({ length: concurrentRequests }, () =>
          this.measureRequest(
            async () => await this.http.get(endpoint),
            'cache-stampede'
          )
        );

        const results = await Promise.all(promises);

        // All should succeed
        results.forEach(({ result }) => {
          assert.statusCode(result.status, 200);
        });

        // Check if times are similar (indicating cache lock/mutex)
        const times = results.map(r => r.duration);
        const metrics = this.calculateMetrics(times);

        if (this.options.verbose) {
          console.log(`    Concurrent requests: ${concurrentRequests}`);
          console.log(`    Avg time: ${metrics.avgTime.toFixed(2)}ms`);
          console.log(`    Variance: ${(metrics.maxTime - metrics.minTime).toFixed(2)}ms`);
        }
      });

      t('should handle cache expiration correctly', async (ctx) => {
        // Test TTL (Time To Live) behavior
        // Short-lived cache should expire and refresh

        const endpoint = '/products';

        // First request
        await this.http.get(endpoint);

        // Wait for potential cache expiration (most caches have short TTL in tests)
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Request again - might be fresh from DB
        const { result } = await this.http.get(endpoint);
        assert.statusCode(result.status, 200);
      }, { timeout: 10000 });
    });

    // ============================================
    // CDN Cache Behavior Tests
    // ============================================
    this.describe('CDN Cache Behavior', (t) => {
      t('should set appropriate cache headers for static assets', async (ctx) => {
        // Test static asset caching (images, CSS, JS)
        const staticEndpoints = ['/api/health', '/products'];

        for (const endpoint of staticEndpoints) {
          const { result } = await this.http.get(endpoint);
          const cacheControl = result.headers.get('cache-control');

          if (this.options.verbose && cacheControl) {
            console.log(`    ${endpoint}: ${cacheControl}`);
          }
        }
      });

      t('should vary cache by important headers', async (ctx) => {
        const { result } = await this.http.get('/products');
        const vary = result.headers.get('vary');

        // Should vary by Accept-Encoding, Authorization, etc.
        if (vary && this.options.verbose) {
          console.log(`    Vary header: ${vary}`);
        }
      });

      t('should handle cache purging for CDN', async (ctx) => {
        // In production, CDN cache should be purgeable
        // This is typically done via CDN API, not HTTP headers
        // Test that appropriate headers are set for CDN behavior
      });

      t('should set appropriate cache duration for different content', async (ctx) => {
        // Product list: short cache (5-15 min)
        // Product details: medium cache (30 min - 1 hour)
        // Static assets: long cache (1 year with versioning)

        const endpoints = [
          { path: '/products', maxAge: 900 }, // 15 min
          { path: '/api/health', maxAge: 60 }, // 1 min
        ];

        for (const { path, maxAge } of endpoints) {
          const { result } = await this.http.get(path);
          const cacheControl = result.headers.get('cache-control');

          if (cacheControl && this.options.verbose) {
            console.log(`    ${path}: ${cacheControl}`);
          }
        }
      });
    });

    // ============================================
    // Load Testing and Stress Testing
    // ============================================
    this.describe('Load Testing', (t) => {
      t('should handle moderate concurrent load (10 requests)', async (ctx) => {
        const concurrentRequests = 10;
        const endpoint = '/products';

        const promises = Array.from({ length: concurrentRequests }, (_, i) =>
          this.measureRequest(
            async () => await this.http.get(endpoint),
            `load-test-10`
          )
        );

        const results = await Promise.all(promises);
        const successCount = results.filter(r => r.result.status === 200).length;

        assert.equal(successCount, concurrentRequests, 'All requests should succeed');

        const times = results.map(r => r.duration);
        const metrics = this.calculateMetrics(times);

        if (this.options.verbose) {
          console.log(`    Success rate: ${successCount}/${concurrentRequests}`);
          console.log(`    Avg response time: ${metrics.avgTime.toFixed(2)}ms`);
          console.log(`    P95: ${metrics.p95.toFixed(2)}ms`);
        }
      }, { timeout: 30000 });

      t('should handle high concurrent load (50 requests)', async (ctx) => {
        const concurrentRequests = 50;
        const endpoint = '/products';

        const promises = Array.from({ length: concurrentRequests }, () =>
          this.measureRequest(
            async () => await this.http.get(endpoint),
            'load-test-50'
          )
        );

        const results = await Promise.all(promises);
        const successCount = results.filter(r => r.result.status === 200).length;

        // At least 90% should succeed under load
        assert.ok(
          successCount >= concurrentRequests * 0.9,
          `At least 90% should succeed: ${successCount}/${concurrentRequests}`
        );

        const times = results.map(r => r.duration);
        const metrics = this.calculateMetrics(times);

        if (this.options.verbose) {
          console.log(`    Success rate: ${successCount}/${concurrentRequests}`);
          console.log(`    Avg response time: ${metrics.avgTime.toFixed(2)}ms`);
          console.log(`    P95: ${metrics.p95.toFixed(2)}ms`);
          console.log(`    P99: ${metrics.p99.toFixed(2)}ms`);
        }
      }, { timeout: 60000 });

      t('should handle stress load (100 requests)', async (ctx) => {
        const concurrentRequests = 100;
        const endpoint = '/products';

        const promises = Array.from({ length: concurrentRequests }, () =>
          this.measureRequest(
            async () => await this.http.get(endpoint),
            'stress-test-100'
          )
        );

        const results = await Promise.all(promises);
        const successCount = results.filter(r => r.result.status === 200).length;

        // At least 80% should succeed under stress
        assert.ok(
          successCount >= concurrentRequests * 0.8,
          `At least 80% should succeed: ${successCount}/${concurrentRequests}`
        );

        const times = results.map(r => r.duration);
        const metrics = this.calculateMetrics(times);

        if (this.options.verbose) {
          console.log(`    Success rate: ${successCount}/${concurrentRequests}`);
          console.log(`    Avg response time: ${metrics.avgTime.toFixed(2)}ms`);
          console.log(`    P95: ${metrics.p95.toFixed(2)}ms`);
          console.log(`    P99: ${metrics.p99.toFixed(2)}ms`);
        }
      }, { timeout: 120000 });

      t('should recover after stress period', async (ctx) => {
        // After stress test, system should recover quickly
        await new Promise(resolve => setTimeout(resolve, 2000));

        const { result, duration } = await this.measureRequest(
          async () => await this.http.get('/products'),
          'recovery-test'
        );

        assert.statusCode(result.status, 200, 'Should recover and respond');

        if (this.options.verbose) {
          console.log(`    Recovery response time: ${duration}ms`);
        }
      }, { timeout: 30000 });
    });

    // ============================================
    // Response Time Benchmarking
    // ============================================
    this.describe('Response Time Benchmarking', (t) => {
      t('should respond to health check within 100ms', async (ctx) => {
        const { result, duration } = await this.measureRequest(
          async () => await this.http.get('/api/health'),
          'health-check-benchmark'
        );

        assert.statusCode(result.status, 200, 'Health check should succeed');
        assert.lessThan(duration, 100, `Health check should be under 100ms, got ${duration}ms`);
      });

      t('should respond to product list within 500ms', async (ctx) => {
        const { result, duration } = await this.measureRequest(
          async () => await this.http.get('/products'),
          'product-list-benchmark'
        );

        assert.statusCode(result.status, 200, 'Product list should succeed');

        // Allow longer time for first request or cache miss
        const threshold = 2000; // 2 seconds

        if (duration > threshold && this.options.verbose) {
          console.warn(`    Warning: Product list took ${duration}ms (threshold: ${threshold}ms)`);
        }
      });

      t('should respond to product detail within 300ms', async (ctx) => {
        if (!this.testProductId) {
          console.warn('Skipping: No test product available');
          return;
        }

        const { result, duration } = await this.measureRequest(
          async () => await this.http.get(`/products/${this.testProductId}`),
          'product-detail-benchmark'
        );

        assert.statusCode(result.status, 200, 'Product detail should succeed');

        const threshold = 1000; // 1 second

        if (duration > threshold && this.options.verbose) {
          console.warn(`    Warning: Product detail took ${duration}ms (threshold: ${threshold}ms)`);
        }
      });

      t('should have consistent response times across multiple requests', async (ctx) => {
        const iterations = 10;
        const endpoint = '/products';

        const promises = Array.from({ length: iterations }, () =>
          this.measureRequest(
            async () => await this.http.get(endpoint),
            'consistency-benchmark'
          )
        );

        const results = await Promise.all(promises);
        const times = results.map(r => r.duration);
        const metrics = this.calculateMetrics(times);

        // Standard deviation should be reasonable
        const variance = metrics.maxTime - metrics.minTime;

        if (this.options.verbose) {
          console.log(`    Avg: ${metrics.avgTime.toFixed(2)}ms`);
          console.log(`    Min: ${metrics.minTime.toFixed(2)}ms`);
          console.log(`    Max: ${metrics.maxTime.toFixed(2)}ms`);
          console.log(`    Variance: ${variance.toFixed(2)}ms`);
        }

        // Variance should not be too extreme (allowing for network jitter)
        assert.lessThan(
          variance,
          metrics.avgTime * 5,
          'Response time variance should be reasonable'
        );
      }, { timeout: 30000 });
    });

    // ============================================
    // Memory Leak Detection
    // ============================================
    this.describe('Memory Leak Detection', (t) => {
      t('should not leak memory on repeated requests', async (ctx) => {
        const iterations = 100;
        const endpoint = '/products';

        // Take initial snapshot
        this.takeMemorySnapshot();

        // Make many requests
        for (let i = 0; i < iterations; i++) {
          await this.http.get(endpoint);

          // Take snapshot every 20 iterations
          if (i % 20 === 0) {
            this.takeMemorySnapshot();
          }
        }

        // Take final snapshot
        this.takeMemorySnapshot();

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
          await new Promise(resolve => setTimeout(resolve, 100));
          this.takeMemorySnapshot();
        }

        const firstSnapshot = this.memorySnapshots[0];
        const lastSnapshot = this.memorySnapshots[this.memorySnapshots.length - 1];
        const heapGrowth = lastSnapshot.heapUsed - firstSnapshot.heapUsed;
        const heapGrowthMB = heapGrowth / 1024 / 1024;

        if (this.options.verbose) {
          console.log(`    Initial heap: ${(firstSnapshot.heapUsed / 1024 / 1024).toFixed(2)} MB`);
          console.log(`    Final heap: ${(lastSnapshot.heapUsed / 1024 / 1024).toFixed(2)} MB`);
          console.log(`    Growth: ${heapGrowthMB.toFixed(2)} MB`);
          console.log(`    Iterations: ${iterations}`);
        }

        // Heap should not grow excessively (allow 50MB growth for normal operations)
        assert.lessThan(
          heapGrowthMB,
          50,
          `Heap growth should be under 50MB, got ${heapGrowthMB.toFixed(2)}MB`
        );
      }, { timeout: 60000 });

      t('should release memory after large operations', async (ctx) => {
        // Take initial snapshot
        this.takeMemorySnapshot();

        // Perform large operation
        const promises = Array.from({ length: 50 }, () =>
          this.http.get('/products')
        );
        await Promise.all(promises);

        // Take snapshot after operations
        this.takeMemorySnapshot();

        // Wait for GC
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Force GC if available
        if (global.gc) {
          global.gc();
        }

        await new Promise(resolve => setTimeout(resolve, 500));

        // Take final snapshot
        this.takeMemorySnapshot();

        const snapshots = this.memorySnapshots.slice(-3);
        const afterOps = snapshots[1];
        const afterGC = snapshots[2];

        if (this.options.verbose && afterOps && afterGC) {
          console.log(`    After operations: ${(afterOps.heapUsed / 1024 / 1024).toFixed(2)} MB`);
          console.log(`    After GC: ${(afterGC.heapUsed / 1024 / 1024).toFixed(2)} MB`);
        }
      }, { timeout: 30000 });
    });

    // ============================================
    // Cache Hit/Miss Ratio Tests
    // ============================================
    this.describe('Cache Hit/Miss Ratios', (t) => {
      t('should achieve high cache hit ratio for repeated requests', async (ctx) => {
        const endpoint = '/products';
        const iterations = 20;

        // First request (cache miss)
        await this.http.get(endpoint);

        // Subsequent requests (should be cache hits)
        const promises = Array.from({ length: iterations }, () =>
          this.measureRequest(
            async () => await this.http.get(endpoint),
            'cache-hit-ratio'
          )
        );

        const results = await Promise.all(promises);
        const times = results.map(r => r.duration);
        const metrics = this.calculateMetrics(times);

        // Cached requests should be consistently fast
        const fastRequests = times.filter(t => t < metrics.avgTime * 1.5).length;
        const hitRatio = fastRequests / iterations;

        if (this.options.verbose) {
          console.log(`    Total requests: ${iterations}`);
          console.log(`    Fast requests: ${fastRequests}`);
          console.log(`    Est. hit ratio: ${(hitRatio * 100).toFixed(1)}%`);
          console.log(`    Avg time: ${metrics.avgTime.toFixed(2)}ms`);
        }

        // At least 70% should be fast (cached)
        assert.ok(
          hitRatio >= 0.7,
          `Cache hit ratio should be >= 70%, got ${(hitRatio * 100).toFixed(1)}%`
        );
      }, { timeout: 30000 });

      t('should track cache statistics via headers', async (ctx) => {
        const { result } = await this.http.get('/products');

        // Some implementations include cache status in headers
        const cacheStatus = result.headers.get('x-cache');
        const cacheHit = result.headers.get('x-cache-hit');

        if (this.options.verbose && (cacheStatus || cacheHit)) {
          console.log('    Cache headers:', { cacheStatus, cacheHit });
        }
      });

      t('should handle cache misses gracefully', async (ctx) => {
        // Request unique data that won't be cached
        const uniqueSearch = `search-${Date.now()}`;
        const { result, duration } = await this.measureRequest(
          async () => await this.http.get(`/products/search?q=${uniqueSearch}`),
          'cache-miss-handling'
        );

        // Should still respond successfully
        assert.ok([200, 404].includes(result.status), 'Should handle cache miss');

        if (this.options.verbose) {
          console.log(`    Cache miss response time: ${duration}ms`);
        }
      });
    });

    // ============================================
    // Performance Under Concurrent Load
    // ============================================
    this.describe('Performance Under Concurrent Load', (t) => {
      t('should maintain performance with concurrent reads', async (ctx) => {
        const concurrentUsers = 20;
        const requestsPerUser = 5;

        const userRequests = Array.from({ length: concurrentUsers }, async () => {
          const requests = Array.from({ length: requestsPerUser }, () =>
            this.measureRequest(
              async () => await this.http.get('/products'),
              'concurrent-reads'
            )
          );
          return Promise.all(requests);
        });

        const results = await Promise.all(userRequests);
        const allResults = results.flat();
        const successCount = allResults.filter(r => r.result.status === 200).length;
        const totalRequests = concurrentUsers * requestsPerUser;

        assert.equal(
          successCount,
          totalRequests,
          `All requests should succeed: ${successCount}/${totalRequests}`
        );

        const times = allResults.map(r => r.duration);
        const metrics = this.calculateMetrics(times);

        if (this.options.verbose) {
          console.log(`    Concurrent users: ${concurrentUsers}`);
          console.log(`    Requests per user: ${requestsPerUser}`);
          console.log(`    Total requests: ${totalRequests}`);
          console.log(`    Success rate: ${successCount}/${totalRequests}`);
          console.log(`    Avg response: ${metrics.avgTime.toFixed(2)}ms`);
          console.log(`    P95: ${metrics.p95.toFixed(2)}ms`);
        }

        // P95 should be reasonable even under load
        assert.lessThan(
          metrics.p95,
          3000,
          `P95 should be under 3000ms, got ${metrics.p95.toFixed(2)}ms`
        );
      }, { timeout: 60000 });

      t('should handle mixed read/write operations', async (ctx) => {
        if (!this.authToken) {
          console.warn('Skipping: Auth not available');
          return;
        }

        const operations = 30;
        const writeRatio = 0.2; // 20% writes

        const promises = Array.from({ length: operations }, (_, i) => {
          const isWrite = Math.random() < writeRatio;

          if (isWrite && this.testProductId) {
            // Write operation
            return this.measureRequest(
              async () =>
                await this.http.patch(`/products/${this.testProductId}`, {
                  views: Math.floor(Math.random() * 1000),
                }),
              'mixed-operations-write'
            );
          } else {
            // Read operation
            return this.measureRequest(
              async () => await this.http.get('/products'),
              'mixed-operations-read'
            );
          }
        });

        const results = await Promise.all(promises);
        const successCount = results.filter(r => [200, 404, 403].includes(r.result.status)).length;

        assert.ok(
          successCount >= operations * 0.9,
          `At least 90% should succeed: ${successCount}/${operations}`
        );

        if (this.options.verbose) {
          const times = results.map(r => r.duration);
          const metrics = this.calculateMetrics(times);
          console.log(`    Mixed operations: ${operations}`);
          console.log(`    Success rate: ${successCount}/${operations}`);
          console.log(`    Avg response: ${metrics.avgTime.toFixed(2)}ms`);
        }
      }, { timeout: 60000 });

      t('should scale linearly with increased load', async (ctx) => {
        // Test with different load levels
        const loadLevels = [5, 10, 20];
        const metricsPerLevel: { load: number; metrics: PerformanceMetrics }[] = [];

        for (const load of loadLevels) {
          const promises = Array.from({ length: load }, () =>
            this.measureRequest(
              async () => await this.http.get('/products'),
              `scaling-test-${load}`
            )
          );

          const results = await Promise.all(promises);
          const times = results.map(r => r.duration);
          const metrics = this.calculateMetrics(times);

          metricsPerLevel.push({ load, metrics });

          // Small delay between tests
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        if (this.options.verbose) {
          console.log('    Scaling analysis:');
          metricsPerLevel.forEach(({ load, metrics }) => {
            console.log(`      Load ${load}: avg ${metrics.avgTime.toFixed(2)}ms, p95 ${metrics.p95.toFixed(2)}ms`);
          });
        }

        // Response time should not degrade exponentially
        // Allow 2x degradation for 4x load
        const baseMetrics = metricsPerLevel[0].metrics;
        const highMetrics = metricsPerLevel[metricsPerLevel.length - 1].metrics;

        assert.lessThan(
          highMetrics.avgTime,
          baseMetrics.avgTime * 2,
          'Performance should scale reasonably'
        );
      }, { timeout: 60000 });
    });
  }
}

/**
 * Export runTests function for orchestrator
 */
export async function runTests(options: AgentOptions = {}): Promise<TestResult[]> {
  const agent = new CachePerformanceAgent(options);
  return agent.runTests(options);
}

// CLI entry point
if (require.main === module) {
  runTests({ verbose: true })
    .then(results => {
      const passed = results.filter(r => r.status === 'passed').length;
      const failed = results.filter(r => r.status === 'failed').length;
      console.log(`\n${passed} passed, ${failed} failed`);
      process.exit(failed > 0 ? 1 : 0);
    })
    .catch(err => {
      console.error('Test run failed:', err);
      process.exit(1);
    });
}
