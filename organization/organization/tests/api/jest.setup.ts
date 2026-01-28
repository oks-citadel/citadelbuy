/**
 * Jest Setup for API Integration Tests
 */

// Extend test timeout for integration tests
jest.setTimeout(30000);

// Global error handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Log test environment
console.log('API Integration Tests');
console.log(`API_BASE_URL: ${process.env.API_BASE_URL || 'http://localhost:4000'}`);
console.log(`Environment: ${process.env.NODE_ENV || 'test'}`);
