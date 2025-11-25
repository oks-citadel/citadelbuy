const { TestEnvironment } = require('jest-environment-node');
const { tmpdir } = require('os');
const { join } = require('path');
const { mkdirSync } = require('fs');

class CustomEnvironment extends TestEnvironment {
  constructor(config, context) {
    // Create a temp directory for localStorage
    const tempDir = join(tmpdir(), 'jest-localstorage');
    try {
      mkdirSync(tempDir, { recursive: true });
    } catch (e) {
      // Directory might already exist
    }

    // Add localStorage file path to config to prevent SecurityError
    const customConfig = {
      ...config,
      projectConfig: {
        ...config.projectConfig,
        testEnvironmentOptions: {
          ...config.projectConfig.testEnvironmentOptions,
          'localstorage-file': join(tempDir, `${Date.now()}-${Math.random()}.db`),
        },
      },
    };

    super(customConfig, context);
  }

  async setup() {
    await super.setup();
  }

  async teardown() {
    await super.teardown();
  }
}

module.exports = CustomEnvironment;
