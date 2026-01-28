/** @type {import('jest').Config} */
const baseConfig = require('../../jest.config.base.js');

module.exports = {
  ...baseConfig,
  displayName: '@broxiva/utils',
  rootDir: '.',
  roots: ['<rootDir>/src'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
