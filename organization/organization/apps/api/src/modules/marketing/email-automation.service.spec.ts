import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EmailAutomationService, EmailAutomationRule, EmailSequence, EmailSequenceStep } from './email-automation.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('EmailAutomationService', () => {
  let service: EmailAutomationService;
  let prisma: PrismaService;

  const mockPrismaService = {
    emailAutomationRule: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    emailSequence: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    emailSequenceEnrollment: {
      create: jest.fn(),
    },
    emailQueue: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockAutomationRule = {
    id: 'rule-123',
    name: 'Welcome Email',
    trigger: 'USER_SIGNUP',
    conditions: { verified: true },
    emailTemplateId: 'template-123',
    delay: 0,
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    template: {
      id: 'template-123',
      name: 'Welcome Template',
      subject: 'Welcome to our platform!',
      body: 'Hello {{name}}, welcome!',
    },
  };

  const mockEmailSequence = {
    id: 'sequence-123',
    name: 'Onboarding Sequence',
    description: 'Email sequence for new users',
    trigger: 'USER_SIGNUP',
    steps: [
      { order: 1, templateId: 'template-1', delayDays: 0 },
      { order: 2, templateId: 'template-2', delayDays: 3 },
      { order: 3, templateId: 'template-3', delayDays: 7 },
    ],
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockEnrollment = {
    id: 'enrollment-123',
    sequenceId: 'sequence-123',
    userId: 'user-123',
    currentStep: 0,
    status: 'ACTIVE',
    enrollmentData: { source: 'signup' },
    createdAt: new Date(),
  };

  const mockQueuedEmail = {
    id: 'queue-123',
    to: 'test@example.com',
    subject: 'Welcome to our platform!',
    templateId: 'template-123',
    templateData: { name: 'John' },
    scheduledFor: new Date(),
    status: 'PENDING',
    automationRuleId: 'rule-123',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailAutomationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<EmailAutomationService>(EmailAutomationService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createAutomationRule', () => {
    it('should create a new automation rule', async () => {
      const createData: Omit<EmailAutomationRule, 'id'> = {
        name: 'Welcome Email',
        trigger: 'USER_SIGNUP',
        conditions: { verified: true },
        emailTemplateId: 'template-123',
        delay: 0,
        enabled: true,
      };

      mockPrismaService.emailAutomationRule.create.mockResolvedValue(mockAutomationRule);

      const result = await service.createAutomationRule(createData);

      expect(result).toEqual(mockAutomationRule);
      expect(mockPrismaService.emailAutomationRule.create).toHaveBeenCalledWith({
        data: {
          name: createData.name,
          trigger: createData.trigger,
          conditions: createData.conditions,
          emailTemplateId: createData.emailTemplateId,
          delay: createData.delay,
          enabled: createData.enabled,
        },
      });
    });

    it('should create rule with optional delay', async () => {
      const createData: Omit<EmailAutomationRule, 'id'> = {
        name: 'Cart Abandonment',
        trigger: 'CART_ABANDONED',
        emailTemplateId: 'template-456',
        delay: 60, // 60 minutes
        enabled: true,
      };

      mockPrismaService.emailAutomationRule.create.mockResolvedValue({
        ...mockAutomationRule,
        ...createData,
      });

      await service.createAutomationRule(createData);

      expect(mockPrismaService.emailAutomationRule.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            delay: 60,
          }),
        })
      );
    });
  });

  describe('getAutomationRules', () => {
    it('should return all automation rules without filters', async () => {
      const mockRules = [mockAutomationRule];
      mockPrismaService.emailAutomationRule.findMany.mockResolvedValue(mockRules);

      const result = await service.getAutomationRules();

      expect(result).toEqual(mockRules);
      expect(mockPrismaService.emailAutomationRule.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          template: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return rules filtered by enabled status', async () => {
      mockPrismaService.emailAutomationRule.findMany.mockResolvedValue([mockAutomationRule]);

      await service.getAutomationRules({ enabled: true });

      expect(mockPrismaService.emailAutomationRule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            enabled: true,
          }),
        })
      );
    });

    it('should return rules filtered by trigger', async () => {
      mockPrismaService.emailAutomationRule.findMany.mockResolvedValue([mockAutomationRule]);

      await service.getAutomationRules({ trigger: 'USER_SIGNUP' });

      expect(mockPrismaService.emailAutomationRule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            trigger: 'USER_SIGNUP',
          }),
        })
      );
    });
  });

  describe('updateAutomationRule', () => {
    it('should update an automation rule', async () => {
      const updates: Partial<EmailAutomationRule> = {
        name: 'Updated Welcome Email',
        enabled: false,
      };
      const updatedRule = { ...mockAutomationRule, ...updates };

      mockPrismaService.emailAutomationRule.findUnique.mockResolvedValue(mockAutomationRule);
      mockPrismaService.emailAutomationRule.update.mockResolvedValue(updatedRule);

      const result = await service.updateAutomationRule('rule-123', updates);

      expect(result).toEqual(updatedRule);
      expect(mockPrismaService.emailAutomationRule.update).toHaveBeenCalledWith({
        where: { id: 'rule-123' },
        data: {
          name: updates.name,
          trigger: undefined,
          conditions: undefined,
          emailTemplateId: undefined,
          delay: undefined,
          enabled: updates.enabled,
        },
      });
    });

    it('should throw NotFoundException when rule not found', async () => {
      mockPrismaService.emailAutomationRule.findUnique.mockResolvedValue(null);

      await expect(service.updateAutomationRule('non-existent', { name: 'Test' })).rejects.toThrow(NotFoundException);
      await expect(service.updateAutomationRule('non-existent', { name: 'Test' })).rejects.toThrow(
        'Automation rule non-existent not found'
      );
    });
  });

  describe('deleteAutomationRule', () => {
    it('should delete an automation rule', async () => {
      mockPrismaService.emailAutomationRule.delete.mockResolvedValue(mockAutomationRule);

      const result = await service.deleteAutomationRule('rule-123');

      expect(result).toEqual({ success: true });
      expect(mockPrismaService.emailAutomationRule.delete).toHaveBeenCalledWith({
        where: { id: 'rule-123' },
      });
    });
  });

  describe('createEmailSequence', () => {
    it('should create a new email sequence', async () => {
      const createData: Omit<EmailSequence, 'id'> = {
        name: 'Onboarding Sequence',
        description: 'Email sequence for new users',
        trigger: 'USER_SIGNUP',
        steps: [
          { order: 1, templateId: 'template-1', delayDays: 0 },
          { order: 2, templateId: 'template-2', delayDays: 3 },
        ],
        enabled: true,
      };

      mockPrismaService.emailSequence.create.mockResolvedValue(mockEmailSequence);

      const result = await service.createEmailSequence(createData);

      expect(result).toEqual(mockEmailSequence);
      expect(mockPrismaService.emailSequence.create).toHaveBeenCalledWith({
        data: {
          name: createData.name,
          description: createData.description,
          trigger: createData.trigger,
          steps: createData.steps,
          enabled: createData.enabled,
        },
      });
    });
  });

  describe('getEmailSequences', () => {
    it('should return all email sequences without filters', async () => {
      const mockSequences = [mockEmailSequence];
      mockPrismaService.emailSequence.findMany.mockResolvedValue(mockSequences);

      const result = await service.getEmailSequences();

      expect(result).toEqual(mockSequences);
      expect(mockPrismaService.emailSequence.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return sequences filtered by enabled status', async () => {
      mockPrismaService.emailSequence.findMany.mockResolvedValue([mockEmailSequence]);

      await service.getEmailSequences({ enabled: true });

      expect(mockPrismaService.emailSequence.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            enabled: true,
          }),
        })
      );
    });
  });

  describe('updateEmailSequence', () => {
    it('should update an email sequence', async () => {
      const updates: Partial<EmailSequence> = {
        name: 'Updated Onboarding',
        enabled: false,
      };
      const updatedSequence = { ...mockEmailSequence, ...updates };

      mockPrismaService.emailSequence.findUnique.mockResolvedValue(mockEmailSequence);
      mockPrismaService.emailSequence.update.mockResolvedValue(updatedSequence);

      const result = await service.updateEmailSequence('sequence-123', updates);

      expect(result).toEqual(updatedSequence);
    });

    it('should throw NotFoundException when sequence not found', async () => {
      mockPrismaService.emailSequence.findUnique.mockResolvedValue(null);

      await expect(service.updateEmailSequence('non-existent', { name: 'Test' })).rejects.toThrow(NotFoundException);
      await expect(service.updateEmailSequence('non-existent', { name: 'Test' })).rejects.toThrow(
        'Email sequence non-existent not found'
      );
    });
  });

  describe('enrollInSequence', () => {
    it('should enroll a user in an enabled sequence', async () => {
      mockPrismaService.emailSequence.findUnique.mockResolvedValue(mockEmailSequence);
      mockPrismaService.emailSequenceEnrollment.create.mockResolvedValue(mockEnrollment);

      const result = await service.enrollInSequence('sequence-123', 'user-123', { source: 'signup' });

      expect(result).toEqual(mockEnrollment);
      expect(mockPrismaService.emailSequenceEnrollment.create).toHaveBeenCalledWith({
        data: {
          sequenceId: 'sequence-123',
          userId: 'user-123',
          currentStep: 0,
          status: 'ACTIVE',
          enrollmentData: { source: 'signup' },
        },
      });
    });

    it('should not enroll user in disabled sequence', async () => {
      const disabledSequence = { ...mockEmailSequence, enabled: false };
      mockPrismaService.emailSequence.findUnique.mockResolvedValue(disabledSequence);

      const result = await service.enrollInSequence('sequence-123', 'user-123');

      expect(result).toEqual({ success: false, reason: 'Sequence is disabled' });
      expect(mockPrismaService.emailSequenceEnrollment.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when sequence not found', async () => {
      mockPrismaService.emailSequence.findUnique.mockResolvedValue(null);

      await expect(service.enrollInSequence('non-existent', 'user-123')).rejects.toThrow(NotFoundException);
      await expect(service.enrollInSequence('non-existent', 'user-123')).rejects.toThrow(
        'Email sequence non-existent not found'
      );
    });
  });

  describe('processTrigger', () => {
    it('should process trigger and queue emails for matching rules', async () => {
      const context = {
        email: 'test@example.com',
        name: 'John',
        verified: true,
      };

      mockPrismaService.emailAutomationRule.findMany.mockResolvedValue([mockAutomationRule]);
      mockPrismaService.emailQueue.create.mockResolvedValue(mockQueuedEmail);

      const result = await service.processTrigger('USER_SIGNUP', context);

      expect(result).toHaveLength(1);
      expect(mockPrismaService.emailAutomationRule.findMany).toHaveBeenCalledWith({
        where: {
          trigger: 'USER_SIGNUP',
          enabled: true,
        },
        include: {
          template: true,
        },
      });
      expect(mockPrismaService.emailQueue.create).toHaveBeenCalledWith({
        data: {
          to: 'test@example.com',
          subject: 'Welcome to our platform!',
          templateId: 'template-123',
          templateData: context,
          scheduledFor: expect.any(Date),
          status: 'PENDING',
          automationRuleId: 'rule-123',
        },
      });
    });

    it('should skip rules with unmet conditions', async () => {
      const ruleWithConditions = {
        ...mockAutomationRule,
        conditions: { verified: true, premium: true },
      };
      const context = {
        email: 'test@example.com',
        verified: true,
        premium: false, // Does not match condition
      };

      mockPrismaService.emailAutomationRule.findMany.mockResolvedValue([ruleWithConditions]);

      const result = await service.processTrigger('USER_SIGNUP', context);

      expect(result).toHaveLength(0);
      expect(mockPrismaService.emailQueue.create).not.toHaveBeenCalled();
    });

    it('should schedule email with delay', async () => {
      const ruleWithDelay = {
        ...mockAutomationRule,
        delay: 60, // 60 minutes
      };
      const context = {
        email: 'test@example.com',
        verified: true,
      };

      mockPrismaService.emailAutomationRule.findMany.mockResolvedValue([ruleWithDelay]);
      mockPrismaService.emailQueue.create.mockResolvedValue(mockQueuedEmail);

      const beforeCall = Date.now();
      await service.processTrigger('USER_SIGNUP', context);
      const afterCall = Date.now();

      expect(mockPrismaService.emailQueue.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          scheduledFor: expect.any(Date),
        }),
      });

      // Verify the scheduled time is approximately 60 minutes in the future
      const callArg = mockPrismaService.emailQueue.create.mock.calls[0][0];
      const scheduledTime = callArg.data.scheduledFor.getTime();
      const expectedMinTime = beforeCall + 60 * 60000 - 1000; // 60 minutes - 1 second buffer
      const expectedMaxTime = afterCall + 60 * 60000 + 1000; // 60 minutes + 1 second buffer

      expect(scheduledTime).toBeGreaterThanOrEqual(expectedMinTime);
      expect(scheduledTime).toBeLessThanOrEqual(expectedMaxTime);
    });

    it('should skip rules without template', async () => {
      const ruleWithoutTemplate = {
        ...mockAutomationRule,
        template: null,
      };
      const context = {
        email: 'test@example.com',
        verified: true,
      };

      mockPrismaService.emailAutomationRule.findMany.mockResolvedValue([ruleWithoutTemplate]);

      const result = await service.processTrigger('USER_SIGNUP', context);

      expect(result).toHaveLength(0);
      expect(mockPrismaService.emailQueue.create).not.toHaveBeenCalled();
    });

    it('should return empty array when no matching rules', async () => {
      mockPrismaService.emailAutomationRule.findMany.mockResolvedValue([]);

      const result = await service.processTrigger('USER_SIGNUP', { email: 'test@example.com' });

      expect(result).toHaveLength(0);
    });
  });

  describe('getAutomationAnalytics', () => {
    it('should return analytics for an automation rule', async () => {
      const mockEmails = [
        { ...mockQueuedEmail, status: 'SENT' },
        { ...mockQueuedEmail, status: 'SENT' },
        { ...mockQueuedEmail, status: 'FAILED' },
        { ...mockQueuedEmail, status: 'PENDING' },
      ];

      mockPrismaService.emailAutomationRule.findUnique.mockResolvedValue(mockAutomationRule);
      mockPrismaService.emailQueue.findMany.mockResolvedValue(mockEmails);

      const result = await service.getAutomationAnalytics('rule-123');

      expect(result).toEqual({
        ruleId: 'rule-123',
        ruleName: 'Welcome Email',
        totalEmails: 4,
        sent: 2,
        failed: 1,
        pending: 1,
        successRate: 50, // (2/4) * 100
      });
    });

    it('should return zero success rate when no emails', async () => {
      mockPrismaService.emailAutomationRule.findUnique.mockResolvedValue(mockAutomationRule);
      mockPrismaService.emailQueue.findMany.mockResolvedValue([]);

      const result = await service.getAutomationAnalytics('rule-123');

      expect(result.successRate).toBe(0);
      expect(result.totalEmails).toBe(0);
    });

    it('should throw NotFoundException when rule not found', async () => {
      mockPrismaService.emailAutomationRule.findUnique.mockResolvedValue(null);

      await expect(service.getAutomationAnalytics('non-existent')).rejects.toThrow(NotFoundException);
      await expect(service.getAutomationAnalytics('non-existent')).rejects.toThrow(
        'Automation rule non-existent not found'
      );
    });
  });

  describe('condition evaluation', () => {
    it('should match all conditions correctly', async () => {
      const ruleWithMultipleConditions = {
        ...mockAutomationRule,
        conditions: {
          verified: true,
          tier: 'premium',
          country: 'US',
        },
      };
      const matchingContext = {
        email: 'test@example.com',
        verified: true,
        tier: 'premium',
        country: 'US',
      };

      mockPrismaService.emailAutomationRule.findMany.mockResolvedValue([ruleWithMultipleConditions]);
      mockPrismaService.emailQueue.create.mockResolvedValue(mockQueuedEmail);

      const result = await service.processTrigger('USER_SIGNUP', matchingContext);

      expect(result).toHaveLength(1);
    });

    it('should reject if any condition does not match', async () => {
      const ruleWithMultipleConditions = {
        ...mockAutomationRule,
        conditions: {
          verified: true,
          tier: 'premium',
          country: 'US',
        },
      };
      const partialMatchContext = {
        email: 'test@example.com',
        verified: true,
        tier: 'free', // Does not match
        country: 'US',
      };

      mockPrismaService.emailAutomationRule.findMany.mockResolvedValue([ruleWithMultipleConditions]);

      const result = await service.processTrigger('USER_SIGNUP', partialMatchContext);

      expect(result).toHaveLength(0);
    });
  });
});
