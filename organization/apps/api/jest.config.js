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
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/common/(.*)$': '<rootDir>/common/$1',
    '^@/modules/(.*)$': '<rootDir>/modules/$1',
    '^@/config/(.*)$': '<rootDir>/config/$1',
  },
  // Memory optimization
  maxWorkers: 2,
  workerIdleMemoryLimit: '512MB',
  detectOpenHandles: true,
  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};
