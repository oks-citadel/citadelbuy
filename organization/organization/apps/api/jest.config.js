const isCI = process.env.CI === 'true';

module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*.spec.ts$',
  transform: {
    '^.+.(t|j)s$': ['ts-jest', {
      isolatedModules: true,
    }],
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/../jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/common/(.*)$': '<rootDir>/common/$1',
    '^@/modules/(.*)$': '<rootDir>/modules/$1',
    '^@/config/(.*)$': '<rootDir>/config/$1',
  },
  // Parallel execution with memory optimization
  // Use 2 workers for CI (GitHub Actions has 2 cores), 50% locally
  maxWorkers: isCI ? 2 : '50%',
  workerIdleMemoryLimit: '512MB',
  // Detect open handles only in non-CI for faster CI runs
  detectOpenHandles: !isCI,
  // Force exit after tests complete (prevents hanging)
  forceExit: true,
  // Test timeout - 15 seconds should be plenty for unit tests
  testTimeout: 15000,
  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  // CI-specific optimizations
  ...(isCI && {
    // Fail fast on CI - stop after first test failure
    bail: 1,
    // Reduce verbosity on CI
    verbose: false,
    // Cache test results for faster subsequent runs
    cache: true,
    cacheDirectory: '<rootDir>/../.jest-cache',
  }),
};
