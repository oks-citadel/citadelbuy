/// <reference types="jest" />
/**
 * Feature Flags Unit Tests
 *
 * Tests for the feature flags configuration and utility functions
 */

import {
  FeatureFlag,
  isFeatureEnabled,
  getEnabledFeatures,
  getAllFeatureStates,
  getFeatureFlagConfig,
  isValidFeatureFlag,
} from '../feature-flags';

describe('Feature Flags', () => {
  describe('isFeatureEnabled', () => {
    it('should return true for enabled features', () => {
      expect(isFeatureEnabled(FeatureFlag.AI_RECOMMENDATIONS)).toBe(true);
      expect(isFeatureEnabled(FeatureFlag.SOCIAL_LOGIN)).toBe(true);
      expect(isFeatureEnabled(FeatureFlag.BNPL_PAYMENTS)).toBe(true);
    });

    it('should return false for disabled features', () => {
      expect(isFeatureEnabled(FeatureFlag.VIRTUAL_TRYON)).toBe(false);
      expect(isFeatureEnabled(FeatureFlag.OFFLINE_MODE)).toBe(false);
    });

    it('should respect environment variable overrides', () => {
      // Set environment variable
      process.env.NEXT_PUBLIC_FEATURE_VIRTUAL_TRYON = 'true';

      expect(isFeatureEnabled(FeatureFlag.VIRTUAL_TRYON)).toBe(true);

      // Clean up
      delete process.env.NEXT_PUBLIC_FEATURE_VIRTUAL_TRYON;
    });

    it('should handle user-specific enablement', () => {
      // This would require modifying the config to test
      // For now, just verify it accepts the userId parameter
      expect(() => {
        isFeatureEnabled(FeatureFlag.AI_RECOMMENDATIONS, 'user123');
      }).not.toThrow();
    });
  });

  describe('getEnabledFeatures', () => {
    it('should return array of enabled features', () => {
      const enabledFeatures = getEnabledFeatures();

      expect(Array.isArray(enabledFeatures)).toBe(true);
      expect(enabledFeatures).toContain(FeatureFlag.AI_RECOMMENDATIONS);
      expect(enabledFeatures).toContain(FeatureFlag.SOCIAL_LOGIN);
      expect(enabledFeatures).toContain(FeatureFlag.BNPL_PAYMENTS);
    });

    it('should not include disabled features', () => {
      const enabledFeatures = getEnabledFeatures();

      expect(enabledFeatures).not.toContain(FeatureFlag.VIRTUAL_TRYON);
      expect(enabledFeatures).not.toContain(FeatureFlag.OFFLINE_MODE);
    });

    it('should accept userId parameter', () => {
      expect(() => {
        getEnabledFeatures('user123');
      }).not.toThrow();
    });
  });

  describe('getAllFeatureStates', () => {
    it('should return object with all feature flags', () => {
      const states = getAllFeatureStates();

      expect(typeof states).toBe('object');
      expect(states).toHaveProperty(FeatureFlag.AI_RECOMMENDATIONS);
      expect(states).toHaveProperty(FeatureFlag.SOCIAL_LOGIN);
      expect(states).toHaveProperty(FeatureFlag.BNPL_PAYMENTS);
      expect(states).toHaveProperty(FeatureFlag.VIRTUAL_TRYON);
      expect(states).toHaveProperty(FeatureFlag.CHAT_SUPPORT);
      expect(states).toHaveProperty(FeatureFlag.OFFLINE_MODE);
    });

    it('should have boolean values for all flags', () => {
      const states = getAllFeatureStates();

      Object.values(states).forEach((value) => {
        expect(typeof value).toBe('boolean');
      });
    });
  });

  describe('getFeatureFlagConfig', () => {
    it('should return config for valid flag', () => {
      const config = getFeatureFlagConfig(FeatureFlag.AI_RECOMMENDATIONS);

      expect(config).toBeDefined();
      expect(config?.key).toBe(FeatureFlag.AI_RECOMMENDATIONS);
      expect(config?.description).toBeDefined();
      expect(typeof config?.enabled).toBe('boolean');
    });

    it('should have all required config properties', () => {
      const config = getFeatureFlagConfig(FeatureFlag.SOCIAL_LOGIN);

      expect(config).toHaveProperty('key');
      expect(config).toHaveProperty('enabled');
      expect(config).toHaveProperty('description');
    });

    it('should return undefined for invalid flag', () => {
      const config = getFeatureFlagConfig('INVALID_FLAG' as FeatureFlag);

      expect(config).toBeUndefined();
    });
  });

  describe('isValidFeatureFlag', () => {
    it('should return true for valid feature flags', () => {
      expect(isValidFeatureFlag('AI_RECOMMENDATIONS')).toBe(true);
      expect(isValidFeatureFlag('SOCIAL_LOGIN')).toBe(true);
      expect(isValidFeatureFlag('BNPL_PAYMENTS')).toBe(true);
    });

    it('should return false for invalid feature flags', () => {
      expect(isValidFeatureFlag('INVALID_FLAG')).toBe(false);
      expect(isValidFeatureFlag('random_string')).toBe(false);
      expect(isValidFeatureFlag('')).toBe(false);
    });
  });

  describe('Environment restrictions', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalEnv,
        writable: true,
        configurable: true,
      });
    });

    it('should respect environment restrictions', () => {
      // OFFLINE_MODE is only enabled in development
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'production',
        writable: true,
        configurable: true,
      });
      expect(isFeatureEnabled(FeatureFlag.OFFLINE_MODE)).toBe(false);

      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'development',
        writable: true,
        configurable: true,
      });
      // Still false because base enabled is false
      // But it would be enabled if we set enabled: true in config
    });
  });

  describe('Rollout percentage', () => {
    it('should handle 100% rollout', () => {
      // Features with 100% rollout should always be enabled (if base enabled is true)
      const config = getFeatureFlagConfig(FeatureFlag.AI_RECOMMENDATIONS);
      expect(config?.rolloutPercentage).toBe(100);
      expect(isFeatureEnabled(FeatureFlag.AI_RECOMMENDATIONS)).toBe(true);
    });

    it('should handle 0% rollout', () => {
      // Features with 0% rollout should be disabled
      const config = getFeatureFlagConfig(FeatureFlag.VIRTUAL_TRYON);
      expect(config?.rolloutPercentage).toBe(0);
      expect(isFeatureEnabled(FeatureFlag.VIRTUAL_TRYON)).toBe(false);
    });
  });

  describe('Feature flag metadata', () => {
    it('should have descriptions for all flags', () => {
      Object.values(FeatureFlag).forEach((flag) => {
        const config = getFeatureFlagConfig(flag);
        expect(config?.description).toBeDefined();
        expect(typeof config?.description).toBe('string');
        expect(config?.description.length).toBeGreaterThan(0);
      });
    });

    it('should have valid environment arrays', () => {
      Object.values(FeatureFlag).forEach((flag) => {
        const config = getFeatureFlagConfig(flag);
        if (config?.environments) {
          expect(Array.isArray(config.environments)).toBe(true);
          config.environments.forEach((env) => {
            expect(['development', 'staging', 'production']).toContain(env);
          });
        }
      });
    });

    it('should have valid rollout percentages', () => {
      Object.values(FeatureFlag).forEach((flag) => {
        const config = getFeatureFlagConfig(flag);
        if (config?.rolloutPercentage !== undefined) {
          expect(config.rolloutPercentage).toBeGreaterThanOrEqual(0);
          expect(config.rolloutPercentage).toBeLessThanOrEqual(100);
        }
      });
    });
  });
});
