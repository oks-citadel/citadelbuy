import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface EmailAutomationRule {
  id: string;
  name: string;
  trigger: 'USER_SIGNUP' | 'CART_ABANDONED' | 'ORDER_PLACED' | 'ORDER_SHIPPED' | 'CUSTOM';
  conditions?: Record<string, any>;
  emailTemplateId: string;
  delay?: number; // in minutes
  enabled: boolean;
}

export interface EmailSequence {
  id: string;
  name: string;
  description?: string;
  steps: EmailSequenceStep[];
  trigger: string;
  enabled: boolean;
}

export interface EmailSequenceStep {
  order: number;
  templateId: string;
  delayDays: number;
  conditions?: Record<string, any>;
}

@Injectable()
export class EmailAutomationService {
  private readonly logger = new Logger(EmailAutomationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create email automation rule
   */
  async createAutomationRule(rule: Omit<EmailAutomationRule, 'id'>) {
    this.logger.log(`Creating email automation rule: ${rule.name}`);

    const created = await this.prisma.emailAutomationRule.create({
      data: {
        name: rule.name,
        trigger: rule.trigger,
        conditions: rule.conditions as any,
        emailTemplateId: rule.emailTemplateId,
        delay: rule.delay,
        enabled: rule.enabled,
      },
    });

    return created;
  }

  /**
   * Get all automation rules
   */
  async getAutomationRules(filters?: { enabled?: boolean; trigger?: string }) {
    const where: any = {};

    if (filters?.enabled !== undefined) {
      where.enabled = filters.enabled;
    }

    if (filters?.trigger) {
      where.trigger = filters.trigger;
    }

    return this.prisma.emailAutomationRule.findMany({
      where,
      include: {
        template: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update automation rule
   */
  async updateAutomationRule(id: string, updates: Partial<EmailAutomationRule>) {
    const rule = await this.prisma.emailAutomationRule.findUnique({
      where: { id },
    });

    if (!rule) {
      throw new NotFoundException(`Automation rule ${id} not found`);
    }

    return this.prisma.emailAutomationRule.update({
      where: { id },
      data: {
        name: updates.name,
        trigger: updates.trigger,
        conditions: updates.conditions as any,
        emailTemplateId: updates.emailTemplateId,
        delay: updates.delay,
        enabled: updates.enabled,
      },
    });
  }

  /**
   * Delete automation rule
   */
  async deleteAutomationRule(id: string) {
    await this.prisma.emailAutomationRule.delete({
      where: { id },
    });

    this.logger.log(`Automation rule deleted: ${id}`);
    return { success: true };
  }

  /**
   * Create email sequence
   */
  async createEmailSequence(sequence: Omit<EmailSequence, 'id'>) {
    this.logger.log(`Creating email sequence: ${sequence.name}`);

    const created = await this.prisma.emailSequence.create({
      data: {
        name: sequence.name,
        description: sequence.description,
        trigger: sequence.trigger,
        steps: sequence.steps as any,
        enabled: sequence.enabled,
      },
    });

    return created;
  }

  /**
   * Get email sequences
   */
  async getEmailSequences(filters?: { enabled?: boolean }) {
    const where: any = {};

    if (filters?.enabled !== undefined) {
      where.enabled = filters.enabled;
    }

    return this.prisma.emailSequence.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update email sequence
   */
  async updateEmailSequence(id: string, updates: Partial<EmailSequence>) {
    const sequence = await this.prisma.emailSequence.findUnique({
      where: { id },
    });

    if (!sequence) {
      throw new NotFoundException(`Email sequence ${id} not found`);
    }

    return this.prisma.emailSequence.update({
      where: { id },
      data: {
        name: updates.name,
        description: updates.description,
        steps: updates.steps as any,
        enabled: updates.enabled,
      },
    });
  }

  /**
   * Enroll user in email sequence
   */
  async enrollInSequence(sequenceId: string, userId: string, data?: Record<string, any>) {
    const sequence = await this.prisma.emailSequence.findUnique({
      where: { id: sequenceId },
    });

    if (!sequence) {
      throw new NotFoundException(`Email sequence ${sequenceId} not found`);
    }

    if (!sequence.enabled) {
      this.logger.warn(`Cannot enroll in disabled sequence: ${sequenceId}`);
      return { success: false, reason: 'Sequence is disabled' };
    }

    const enrollment = await this.prisma.emailSequenceEnrollment.create({
      data: {
        sequenceId,
        userId,
        currentStep: 0,
        status: 'ACTIVE',
        enrollmentData: data as any,
      },
    });

    this.logger.log(`User ${userId} enrolled in sequence ${sequenceId}`);
    return enrollment;
  }

  /**
   * Process email automation triggers
   */
  async processTrigger(trigger: string, context: Record<string, any>) {
    this.logger.log(`Processing trigger: ${trigger}`);

    const rules = await this.prisma.emailAutomationRule.findMany({
      where: {
        trigger,
        enabled: true,
      },
      include: {
        template: true,
      },
    });

    const results = [];

    for (const rule of rules) {
      // Check if conditions are met
      if (rule.conditions && !this.evaluateConditions(rule.conditions as any, context)) {
        continue;
      }

      // Schedule email based on delay
      // Ensure template is loaded
      if (!rule.template) {
        this.logger.warn(`Template not found for rule ${rule.id}, skipping`);
        continue;
      }

      const sendAt = rule.delay
        ? new Date(Date.now() + rule.delay * 60000)
        : new Date();

      // Queue the email
      const queued = await this.prisma.emailQueue.create({
        data: {
          to: context.email,
          subject: rule.template.subject,
          templateId: rule.emailTemplateId,
          templateData: context,
          scheduledFor: sendAt,
          status: 'PENDING',
          automationRuleId: rule.id,
        },
      });

      results.push(queued);
    }

    this.logger.log(`Trigger ${trigger} processed: ${results.length} emails queued`);
    return results;
  }

  /**
   * Evaluate automation conditions
   */
  private evaluateConditions(conditions: Record<string, any>, context: Record<string, any>): boolean {
    for (const [key, value] of Object.entries(conditions)) {
      if (context[key] !== value) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get automation analytics
   */
  async getAutomationAnalytics(ruleId: string) {
    const rule = await this.prisma.emailAutomationRule.findUnique({
      where: { id: ruleId },
    });

    if (!rule) {
      throw new NotFoundException(`Automation rule ${ruleId} not found`);
    }

    const emails = await this.prisma.emailQueue.findMany({
      where: { automationRuleId: ruleId },
    });

    const sent = emails.filter((e) => e.status === 'SENT').length;
    const failed = emails.filter((e) => e.status === 'FAILED').length;
    const pending = emails.filter((e) => e.status === 'PENDING').length;

    return {
      ruleId,
      ruleName: rule.name,
      totalEmails: emails.length,
      sent,
      failed,
      pending,
      successRate: emails.length > 0 ? (sent / emails.length) * 100 : 0,
    };
  }
}
