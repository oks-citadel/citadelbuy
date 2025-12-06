/**
 * Core Testing Agents Index
 *
 * Exports all 20 testing agents and their types for the CitadelBuy platform.
 */

// Base Agent
export { BaseAgent, HttpHelper, assert } from './base.agent';
export type { TestContext, TestCase, TestResult, AgentOptions } from './base.agent';

// Core Business Agents
export { AuthenticationAgent, runTests as runAuthenticationTests } from './authentication.agent';
export { ProductCatalogAgent, runTests as runProductCatalogTests } from './product-catalog.agent';
export { CartCheckoutAgent, runTests as runCartCheckoutTests } from './cart-checkout.agent';
export { PaymentProcessingAgent, runTests as runPaymentProcessingTests } from './payment-processing.agent';
export { OrderManagementAgent, runTests as runOrderManagementTests } from './order-management.agent';
export { ShippingLogisticsAgent, runTests as runShippingLogisticsTests } from './shipping-logistics.agent';
export { VendorPortalAgent, runTests as runVendorPortalTests } from './vendor-portal.agent';
export { SecurityAgent, runTests as runSecurityTests } from './security.agent';

// Technical Testing Agents
export { ApiGatewayAgent, runTests as runApiGatewayTests } from './api-gateway.agent';
export { SearchDiscoveryAgent, runTests as runSearchDiscoveryTests } from './search-discovery.agent';
export { NotificationAgent, runTests as runNotificationTests } from './notification.agent';
export { AnalyticsTrackingAgent, runTests as runAnalyticsTrackingTests } from './analytics-tracking.agent';
export { AdminDashboardAgent, runTests as runAdminDashboardTests } from './admin-dashboard.agent';
export { MobilePwaAgent, runTests as runMobilePwaTests } from './mobile-pwa.agent';
export { FrontendUiAgent, runTests as runFrontendUiTests } from './frontend-ui.agent';
export { UserAccountAgent, runTests as runUserAccountTests } from './user-account.agent';
export { DatabaseIntegrityAgent, runTests as runDatabaseIntegrityTests } from './database-integrity.agent';
export { CachePerformanceAgent, runTests as runCachePerformanceTests } from './cache-performance.agent';

// Agent factory for dynamic loading
export const agentFactory = {
  // Core Business Agents
  'authentication': () => import('./authentication.agent'),
  'product-catalog': () => import('./product-catalog.agent'),
  'cart-checkout': () => import('./cart-checkout.agent'),
  'payment-processing': () => import('./payment-processing.agent'),
  'order-management': () => import('./order-management.agent'),
  'shipping-logistics': () => import('./shipping-logistics.agent'),
  'vendor-portal': () => import('./vendor-portal.agent'),
  'security': () => import('./security.agent'),

  // Technical Testing Agents
  'api-gateway': () => import('./api-gateway.agent'),
  'search-discovery': () => import('./search-discovery.agent'),
  'notification': () => import('./notification.agent'),
  'analytics-tracking': () => import('./analytics-tracking.agent'),
  'admin-dashboard': () => import('./admin-dashboard.agent'),
  'mobile-pwa': () => import('./mobile-pwa.agent'),
  'frontend-ui': () => import('./frontend-ui.agent'),
  'user-account': () => import('./user-account.agent'),
  'database-integrity': () => import('./database-integrity.agent'),
  'cache-performance': () => import('./cache-performance.agent'),
};

// Export all agent types
export const CORE_AGENTS = [
  // Core Business Agents (1-10)
  'authentication',
  'product-catalog',
  'cart-checkout',
  'payment-processing',
  'order-management',
  'shipping-logistics',
  'vendor-portal',
  'user-account',
  'admin-dashboard',
  'security',

  // Technical Testing Agents (11-20)
  'api-gateway',
  'database-integrity',
  'cache-performance',
  'notification',
  'search-discovery',
  'analytics-tracking',
  'frontend-ui',
  'mobile-pwa',
] as const;

export type CoreAgentType = typeof CORE_AGENTS[number];
