import { Test, TestingModule } from '@nestjs/testing';
import { AssignmentService } from '../services/assignment.service';
import { ExperimentsService } from '../services/experiments.service';
import { TargetingService } from '../services/targeting.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { createHash } from 'crypto';

describe('AssignmentService', () => {
  let service: AssignmentService;
  let experimentsService: ExperimentsService;

  const mockPrismaService = {
    experimentAssignment: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    delPattern: jest.fn(),
  };

  const mockExperimentsService = {
    findOne: jest.fn(),
    getRunningExperiments: jest.fn(),
  };

  const mockTargetingService = {
    evaluateRules: jest.fn(),
  };

  const mockExperiment = {
    id: 'exp-1',
    name: 'Test Experiment',
    status: 'RUNNING',
    trafficAllocation: 100,
    isExclusive: false,
    mutualExclusionGroupId: null,
    variants: [
      { id: 'var-1', name: 'Control', weight: 50, isControl: true, payload: null },
      { id: 'var-2', name: 'Treatment', weight: 50, isControl: false, payload: { color: 'blue' } },
    ],
    targetingRules: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssignmentService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: ExperimentsService, useValue: mockExperimentsService },
        { provide: TargetingService, useValue: mockTargetingService },
      ],
    }).compile();

    service = module.get<AssignmentService>(AssignmentService);
    experimentsService = module.get<ExperimentsService>(ExperimentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Deterministic assignment', () => {
    it('should assign same user to same variant consistently', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.experimentAssignment.findUnique.mockResolvedValue(null);
      mockExperimentsService.findOne.mockResolvedValue(mockExperiment);
      mockTargetingService.evaluateRules.mockReturnValue(true);
      mockPrismaService.experimentAssignment.create.mockImplementation(async (data) => ({
        id: 'assign-1',
        ...data.data,
        variant: mockExperiment.variants.find(v => v.id === data.data.variantId),
        experiment: { name: mockExperiment.name },
        assignedAt: new Date(),
      }));

      // Run assignment multiple times for same user
      const userId = 'user-test-123';
      const results: string[] = [];

      for (let i = 0; i < 10; i++) {
        // Reset mocks for fresh assignment
        mockPrismaService.experimentAssignment.findUnique.mockResolvedValue(null);
        mockRedisService.get.mockResolvedValue(null);

        const result = await service.assignUser('exp-1', { userId, context: {} });
        if (result) {
          results.push(result.variantId);
        }
      }

      // All assignments should be to the same variant
      const uniqueVariants = [...new Set(results)];
      expect(uniqueVariants.length).toBe(1);
    });

    it('should distribute users across variants based on weights', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.experimentAssignment.findUnique.mockResolvedValue(null);
      mockExperimentsService.findOne.mockResolvedValue(mockExperiment);
      mockTargetingService.evaluateRules.mockReturnValue(true);

      const assignments = new Map<string, number>();
      assignments.set('var-1', 0);
      assignments.set('var-2', 0);

      // Simulate 1000 users
      for (let i = 0; i < 1000; i++) {
        const userId = `user-${i}`;
        mockPrismaService.experimentAssignment.create.mockImplementation(async (data) => ({
          id: `assign-${i}`,
          ...data.data,
          variant: mockExperiment.variants.find(v => v.id === data.data.variantId),
          experiment: { name: mockExperiment.name },
          assignedAt: new Date(),
        }));

        const result = await service.assignUser('exp-1', { userId, context: {} });
        if (result) {
          const count = assignments.get(result.variantId) || 0;
          assignments.set(result.variantId, count + 1);
        }

        // Reset for next iteration
        mockPrismaService.experimentAssignment.findUnique.mockResolvedValue(null);
        mockRedisService.get.mockResolvedValue(null);
      }

      // With 50/50 weight, expect roughly equal distribution (within 10% margin)
      const controlCount = assignments.get('var-1') || 0;
      const treatmentCount = assignments.get('var-2') || 0;

      expect(controlCount).toBeGreaterThan(400);
      expect(controlCount).toBeLessThan(600);
      expect(treatmentCount).toBeGreaterThan(400);
      expect(treatmentCount).toBeLessThan(600);
    });
  });

  describe('Traffic allocation', () => {
    it('should respect traffic allocation percentage', async () => {
      const limitedExperiment = {
        ...mockExperiment,
        trafficAllocation: 50, // Only 50% of traffic
      };

      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.experimentAssignment.findUnique.mockResolvedValue(null);
      mockExperimentsService.findOne.mockResolvedValue(limitedExperiment);
      mockTargetingService.evaluateRules.mockReturnValue(true);

      let included = 0;
      let excluded = 0;

      // Simulate 1000 users
      for (let i = 0; i < 1000; i++) {
        const userId = `user-traffic-${i}`;

        mockPrismaService.experimentAssignment.create.mockImplementation(async (data) => ({
          id: `assign-${i}`,
          ...data.data,
          variant: limitedExperiment.variants.find(v => v.id === data.data.variantId),
          experiment: { name: limitedExperiment.name },
          assignedAt: new Date(),
        }));

        const result = await service.assignUser('exp-1', { userId, context: {} });

        if (result) {
          included++;
        } else {
          excluded++;
        }

        // Reset for next iteration
        mockPrismaService.experimentAssignment.findUnique.mockResolvedValue(null);
        mockRedisService.get.mockResolvedValue(null);
      }

      // With 50% traffic allocation, expect roughly 50% inclusion (within 15% margin)
      expect(included).toBeGreaterThan(350);
      expect(included).toBeLessThan(650);
    });
  });

  describe('Existing assignment handling', () => {
    it('should return existing assignment without creating new one', async () => {
      const existingAssignment = {
        id: 'assign-existing',
        experimentId: 'exp-1',
        variantId: 'var-1',
        userId: 'user-123',
        assignedAt: new Date(),
        variant: mockExperiment.variants[0],
        experiment: { name: mockExperiment.name },
      };

      mockRedisService.get.mockResolvedValue(existingAssignment);

      const result = await service.assignUser('exp-1', {
        userId: 'user-123',
        context: {},
      });

      expect(result).toBeDefined();
      expect(result?.id).toBe('assign-existing');
      expect(mockPrismaService.experimentAssignment.create).not.toHaveBeenCalled();
    });
  });

  describe('Experiment status validation', () => {
    it('should reject assignment to non-running experiment', async () => {
      const pausedExperiment = { ...mockExperiment, status: 'PAUSED' };

      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.experimentAssignment.findUnique.mockResolvedValue(null);
      mockExperimentsService.findOne.mockResolvedValue(pausedExperiment);

      await expect(
        service.assignUser('exp-1', { userId: 'user-123', context: {} }),
      ).rejects.toThrow('Cannot assign to experiment in PAUSED status');
    });
  });

  describe('Hash key generation', () => {
    it('should generate consistent hash keys', () => {
      const userId = 'test-user';
      const experimentId = 'test-exp';

      // Access private method through prototype
      const hashKey1 = (service as any).generateHashKey(userId, experimentId);
      const hashKey2 = (service as any).generateHashKey(userId, experimentId);

      expect(hashKey1).toBe(hashKey2);
      expect(hashKey1.length).toBe(64); // SHA-256 hex string length
    });

    it('should generate different hash keys for different inputs', () => {
      const hashKey1 = (service as any).generateHashKey('user1', 'exp1');
      const hashKey2 = (service as any).generateHashKey('user2', 'exp1');
      const hashKey3 = (service as any).generateHashKey('user1', 'exp2');

      expect(hashKey1).not.toBe(hashKey2);
      expect(hashKey1).not.toBe(hashKey3);
      expect(hashKey2).not.toBe(hashKey3);
    });
  });

  describe('Variant selection', () => {
    it('should select variant based on hash and weights', () => {
      // The selectVariant method uses deterministic hashing
      const variant1 = (service as any).selectVariant(
        'user-abc',
        'exp-1',
        mockExperiment.variants,
      );
      const variant2 = (service as any).selectVariant(
        'user-abc',
        'exp-1',
        mockExperiment.variants,
      );

      // Same user + experiment should get same variant
      expect(variant1.id).toBe(variant2.id);
    });
  });
});
