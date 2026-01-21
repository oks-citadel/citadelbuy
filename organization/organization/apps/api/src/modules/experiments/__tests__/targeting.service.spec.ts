import { Test, TestingModule } from '@nestjs/testing';
import { TargetingService } from '../services/targeting.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { TargetingRuleOperator } from '../dto/experiment.dto';

describe('TargetingService', () => {
  let service: TargetingService;
  let prisma: PrismaService;

  const mockPrismaService = {
    userSegment: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TargetingService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<TargetingService>(TargetingService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('evaluateRules', () => {
    it('should return true when no rules provided', () => {
      const result = service.evaluateRules([], { userId: 'user1' });
      expect(result).toBe(true);
    });

    it('should return true when all rules match (AND logic)', () => {
      const rules = [
        { attribute: 'country', operator: TargetingRuleOperator.EQUALS, value: 'US', priority: 0 },
        { attribute: 'plan', operator: TargetingRuleOperator.EQUALS, value: 'premium', priority: 0 },
      ];
      const context = { userId: 'user1', country: 'US', plan: 'premium' };

      const result = service.evaluateRules(rules, context);
      expect(result).toBe(true);
    });

    it('should return false when any rule does not match', () => {
      const rules = [
        { attribute: 'country', operator: TargetingRuleOperator.EQUALS, value: 'US', priority: 0 },
        { attribute: 'plan', operator: TargetingRuleOperator.EQUALS, value: 'premium', priority: 0 },
      ];
      const context = { userId: 'user1', country: 'US', plan: 'free' };

      const result = service.evaluateRules(rules, context);
      expect(result).toBe(false);
    });
  });

  describe('evaluateRule - EQUALS operator', () => {
    it('should match equal strings (case insensitive)', () => {
      const rule = { attribute: 'country', operator: TargetingRuleOperator.EQUALS, value: 'us' };
      const context = { userId: 'user1', country: 'US' };

      const result = service.evaluateRule(rule, context);
      expect(result).toBe(true);
    });

    it('should not match different strings', () => {
      const rule = { attribute: 'country', operator: TargetingRuleOperator.EQUALS, value: 'UK' };
      const context = { userId: 'user1', country: 'US' };

      const result = service.evaluateRule(rule, context);
      expect(result).toBe(false);
    });

    it('should match equal numbers', () => {
      const rule = { attribute: 'age', operator: TargetingRuleOperator.EQUALS, value: 25 };
      const context = { userId: 'user1', age: 25 };

      const result = service.evaluateRule(rule, context);
      expect(result).toBe(true);
    });
  });

  describe('evaluateRule - NOT_EQUALS operator', () => {
    it('should return true for different values', () => {
      const rule = { attribute: 'country', operator: TargetingRuleOperator.NOT_EQUALS, value: 'UK' };
      const context = { userId: 'user1', country: 'US' };

      const result = service.evaluateRule(rule, context);
      expect(result).toBe(true);
    });

    it('should return false for equal values', () => {
      const rule = { attribute: 'country', operator: TargetingRuleOperator.NOT_EQUALS, value: 'US' };
      const context = { userId: 'user1', country: 'US' };

      const result = service.evaluateRule(rule, context);
      expect(result).toBe(false);
    });
  });

  describe('evaluateRule - CONTAINS operator', () => {
    it('should match when string contains substring', () => {
      const rule = { attribute: 'email', operator: TargetingRuleOperator.CONTAINS, value: '@gmail' };
      const context = { userId: 'user1', email: 'test@gmail.com' };

      const result = service.evaluateRule(rule, context);
      expect(result).toBe(true);
    });

    it('should match when array contains value', () => {
      const rule = { attribute: 'tags', operator: TargetingRuleOperator.CONTAINS, value: 'premium' };
      const context = { userId: 'user1', tags: ['premium', 'active'] };

      const result = service.evaluateRule(rule, context);
      expect(result).toBe(true);
    });
  });

  describe('evaluateRule - GREATER_THAN operator', () => {
    it('should return true for greater numbers', () => {
      const rule = { attribute: 'orderCount', operator: TargetingRuleOperator.GREATER_THAN, value: 10 };
      const context = { userId: 'user1', orderCount: 15 };

      const result = service.evaluateRule(rule, context);
      expect(result).toBe(true);
    });

    it('should return false for lesser or equal numbers', () => {
      const rule = { attribute: 'orderCount', operator: TargetingRuleOperator.GREATER_THAN, value: 10 };
      const context = { userId: 'user1', orderCount: 10 };

      const result = service.evaluateRule(rule, context);
      expect(result).toBe(false);
    });

    it('should handle date comparison', () => {
      const rule = {
        attribute: 'signupDate',
        operator: TargetingRuleOperator.GREATER_THAN,
        value: '2024-01-01',
      };
      const context = { userId: 'user1', signupDate: '2024-06-15' };

      const result = service.evaluateRule(rule, context);
      expect(result).toBe(true);
    });
  });

  describe('evaluateRule - IN operator', () => {
    it('should return true when value is in array', () => {
      const rule = {
        attribute: 'country',
        operator: TargetingRuleOperator.IN,
        value: ['US', 'UK', 'CA'],
      };
      const context = { userId: 'user1', country: 'UK' };

      const result = service.evaluateRule(rule, context);
      expect(result).toBe(true);
    });

    it('should return false when value is not in array', () => {
      const rule = {
        attribute: 'country',
        operator: TargetingRuleOperator.IN,
        value: ['US', 'UK', 'CA'],
      };
      const context = { userId: 'user1', country: 'DE' };

      const result = service.evaluateRule(rule, context);
      expect(result).toBe(false);
    });
  });

  describe('evaluateRule - REGEX operator', () => {
    it('should match regex pattern', () => {
      const rule = {
        attribute: 'email',
        operator: TargetingRuleOperator.REGEX,
        value: '@company\\.com$',
      };
      const context = { userId: 'user1', email: 'test@company.com' };

      const result = service.evaluateRule(rule, context);
      expect(result).toBe(true);
    });

    it('should not match when pattern does not match', () => {
      const rule = {
        attribute: 'email',
        operator: TargetingRuleOperator.REGEX,
        value: '@company\\.com$',
      };
      const context = { userId: 'user1', email: 'test@gmail.com' };

      const result = service.evaluateRule(rule, context);
      expect(result).toBe(false);
    });
  });

  describe('evaluateRule - EXISTS operator', () => {
    it('should return true when attribute exists', () => {
      const rule = { attribute: 'referralCode', operator: TargetingRuleOperator.EXISTS, value: null };
      const context = { userId: 'user1', referralCode: 'ABC123' };

      const result = service.evaluateRule(rule, context);
      expect(result).toBe(true);
    });

    it('should return false when attribute is undefined', () => {
      const rule = { attribute: 'referralCode', operator: TargetingRuleOperator.EXISTS, value: null };
      const context = { userId: 'user1' };

      const result = service.evaluateRule(rule, context);
      expect(result).toBe(false);
    });

    it('should return false when attribute is null', () => {
      const rule = { attribute: 'referralCode', operator: TargetingRuleOperator.EXISTS, value: null };
      const context = { userId: 'user1', referralCode: null };

      const result = service.evaluateRule(rule, context);
      expect(result).toBe(false);
    });
  });

  describe('evaluateRule - nested paths', () => {
    it('should handle nested attribute paths', () => {
      const rule = {
        attribute: 'profile.address.country',
        operator: TargetingRuleOperator.EQUALS,
        value: 'US',
      };
      const context = {
        userId: 'user1',
        profile: {
          address: { country: 'US' },
        },
      };

      const result = service.evaluateRule(rule, context);
      expect(result).toBe(true);
    });

    it('should return false for missing nested path', () => {
      const rule = {
        attribute: 'profile.address.country',
        operator: TargetingRuleOperator.EQUALS,
        value: 'US',
      };
      const context = {
        userId: 'user1',
        profile: {},
      };

      const result = service.evaluateRule(rule, context);
      expect(result).toBe(false);
    });
  });
});
