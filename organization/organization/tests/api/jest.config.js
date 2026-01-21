/**
 * Jest Configuration for API Integration Tests
 */

const isCI = process.env.CI === 'true';

module.exports = {
  displayName: 'API Integration Tests',
  testEnvironment: 'node',
  testMatch: ['**/*.api.spec.ts', '**/*.integration.spec.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      isolatedModules: true,
      diagnostics: false, // Disable TypeScript diagnostics for faster runs
    }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  rootDir: '.',
  testTimeout: 30000, // 30 seconds for integration tests
  setupFilesAfterEnv: ['./jest.setup.ts'],

  // Parallel execution
  maxWorkers: isCI ? 2 : '50%',

  // CI optimizations
  ...(isCI && {
    bail: 1,
    verbose: false,
    cache: true,
    cacheDirectory: './.jest-cache',
  }),

  // Coverage settings
  collectCoverageFrom: [
    '**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/jest.*.ts',
  ],
  coverageDirectory: './coverage',
  coverageReporters: ['text', 'lcov', 'json'],

  // Reporters
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: './results',
        outputName: 'junit.xml',
        suiteName: 'API Integration Tests',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' > ',
      },
    ],
  ],

  // Skip global setup/teardown for now
  // globalSetup: './global-setup.ts',
  // globalTeardown: './global-teardown.ts',
};
