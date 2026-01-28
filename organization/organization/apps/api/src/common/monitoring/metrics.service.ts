import { Injectable, Logger } from '@nestjs/common';
import { Counter, Histogram, Registry, Gauge } from 'prom-client';

/**
 * Prometheus Metrics Service
 * Tracks business metrics and system performance
 */
@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private readonly registry: Registry;

  // HTTP Metrics
  private readonly httpRequestsTotal: Counter;
  private readonly httpRequestDuration: Histogram;
  private readonly httpRequestsInProgress: Gauge;

  // Business Metrics - Orders
  private readonly ordersTotal: Counter;
  private readonly ordersValue: Counter;
  private readonly ordersFailed: Counter;

  // Business Metrics - Payments
  private readonly paymentsTotal: Counter;
  private readonly paymentsValue: Counter;
  private readonly paymentsFailed: Counter;

  // Business Metrics - Products
  private readonly productViews: Counter;
  private readonly productSearches: Counter;
  private readonly cartAdditions: Counter;
  private readonly cartAbandonments: Counter;

  // Business Metrics - Users
  private readonly userRegistrations: Counter;
  private readonly userLogins: Counter;
  private readonly userLoginsFailedCounter: Counter;

  // System Metrics
  private readonly errorsTotal: Counter;
  private readonly databaseQueryDuration: Histogram;
  private readonly cacheHits: Counter;
  private readonly cacheMisses: Counter;

  constructor() {
    this.registry = new Registry();

    // HTTP Metrics
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.5, 1, 2, 5, 10],
      registers: [this.registry],
    });

    this.httpRequestsInProgress = new Gauge({
      name: 'http_requests_in_progress',
      help: 'Number of HTTP requests currently being processed',
      labelNames: ['method', 'route'],
      registers: [this.registry],
    });

    // Business Metrics - Orders
    this.ordersTotal = new Counter({
      name: 'orders_total',
      help: 'Total number of orders created',
      labelNames: ['status', 'payment_method'],
      registers: [this.registry],
    });

    this.ordersValue = new Counter({
      name: 'orders_value_total',
      help: 'Total value of orders in USD',
      labelNames: ['status', 'payment_method'],
      registers: [this.registry],
    });

    this.ordersFailed = new Counter({
      name: 'orders_failed_total',
      help: 'Total number of failed orders',
      labelNames: ['reason'],
      registers: [this.registry],
    });

    // Business Metrics - Payments
    this.paymentsTotal = new Counter({
      name: 'payments_total',
      help: 'Total number of payment transactions',
      labelNames: ['provider', 'status', 'method'],
      registers: [this.registry],
    });

    this.paymentsValue = new Counter({
      name: 'payments_value_total',
      help: 'Total value of payments processed in USD',
      labelNames: ['provider', 'status'],
      registers: [this.registry],
    });

    this.paymentsFailed = new Counter({
      name: 'payments_failed_total',
      help: 'Total number of failed payments',
      labelNames: ['provider', 'reason'],
      registers: [this.registry],
    });

    // Business Metrics - Products
    this.productViews = new Counter({
      name: 'product_views_total',
      help: 'Total number of product views',
      labelNames: ['category'],
      registers: [this.registry],
    });

    this.productSearches = new Counter({
      name: 'product_searches_total',
      help: 'Total number of product searches',
      labelNames: ['search_provider'],
      registers: [this.registry],
    });

    this.cartAdditions = new Counter({
      name: 'cart_additions_total',
      help: 'Total number of products added to cart',
      registers: [this.registry],
    });

    this.cartAbandonments = new Counter({
      name: 'cart_abandonments_total',
      help: 'Total number of abandoned carts',
      registers: [this.registry],
    });

    // Business Metrics - Users
    this.userRegistrations = new Counter({
      name: 'user_registrations_total',
      help: 'Total number of user registrations',
      labelNames: ['method'],
      registers: [this.registry],
    });

    this.userLogins = new Counter({
      name: 'user_logins_total',
      help: 'Total number of successful user logins',
      labelNames: ['method'],
      registers: [this.registry],
    });

    this.userLoginsFailedCounter = new Counter({
      name: 'user_logins_failed_total',
      help: 'Total number of failed login attempts',
      labelNames: ['reason'],
      registers: [this.registry],
    });

    // System Metrics
    this.errorsTotal = new Counter({
      name: 'errors_total',
      help: 'Total number of errors',
      labelNames: ['type', 'severity'],
      registers: [this.registry],
    });

    this.databaseQueryDuration = new Histogram({
      name: 'database_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['operation', 'table'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
      registers: [this.registry],
    });

    this.cacheHits = new Counter({
      name: 'cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['cache_name'],
      registers: [this.registry],
    });

    this.cacheMisses = new Counter({
      name: 'cache_misses_total',
      help: 'Total number of cache misses',
      labelNames: ['cache_name'],
      registers: [this.registry],
    });

    this.logger.log('Metrics service initialized');
  }

  // HTTP Tracking
  trackHttpRequest(method: string, route: string, statusCode: number, duration: number): void {
    this.httpRequestsTotal.inc({ method, route, status_code: statusCode });
    this.httpRequestDuration.observe({ method, route, status_code: statusCode }, duration);
  }

  incrementHttpRequestsInProgress(method: string, route: string): void {
    this.httpRequestsInProgress.inc({ method, route });
  }

  decrementHttpRequestsInProgress(method: string, route: string): void {
    this.httpRequestsInProgress.dec({ method, route });
  }

  // Order Tracking
  trackOrder(status: string, paymentMethod: string, value: number): void {
    this.ordersTotal.inc({ status, payment_method: paymentMethod });
    this.ordersValue.inc({ status, payment_method: paymentMethod }, value);
  }

  trackOrderFailure(reason: string): void {
    this.ordersFailed.inc({ reason });
  }

  // Payment Tracking
  trackPayment(provider: string, status: string, method: string, value: number): void {
    this.paymentsTotal.inc({ provider, status, method });
    this.paymentsValue.inc({ provider, status }, value);
  }

  trackPaymentFailure(provider: string, reason: string): void {
    this.paymentsFailed.inc({ provider, reason });
  }

  // Product Tracking
  trackProductView(category: string): void {
    this.productViews.inc({ category });
  }

  trackProductSearch(searchProvider: string): void {
    this.productSearches.inc({ search_provider: searchProvider });
  }

  trackCartAddition(): void {
    this.cartAdditions.inc();
  }

  trackCartAbandonment(): void {
    this.cartAbandonments.inc();
  }

  // User Tracking
  trackUserRegistration(method: string): void {
    this.userRegistrations.inc({ method });
  }

  trackUserLogin(method: string): void {
    this.userLogins.inc({ method });
  }

  trackLoginFailure(reason: string): void {
    this.userLoginsFailedCounter.inc({ reason });
  }

  // System Tracking
  trackError(type: string, severity: string): void {
    this.errorsTotal.inc({ type, severity });
  }

  trackDatabaseQuery(operation: string, table: string, duration: number): void {
    this.databaseQueryDuration.observe({ operation, table }, duration);
  }

  trackCacheHit(cacheName: string): void {
    this.cacheHits.inc({ cache_name: cacheName });
  }

  trackCacheMiss(cacheName: string): void {
    this.cacheMisses.inc({ cache_name: cacheName });
  }

  // Get metrics for Prometheus scraping
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  // Get content type for Prometheus
  getContentType(): string {
    return this.registry.contentType;
  }

  // Get registry for advanced usage
  getRegistry(): Registry {
    return this.registry;
  }
}
