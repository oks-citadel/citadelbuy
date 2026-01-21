import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

export interface UserProfile {
  userId: string;
  demographics: Record<string, any>;
  interests: string[];
  behavior: Record<string, any>;
  purchaseHistory: Record<string, any>;
  segments: string[];
  score: number;
  lastUpdated: Date;
}

export interface NextBestAction {
  type: string;
  confidence: number;
  params: Record<string, any>;
  reason: string;
}

export interface PersonalizationRule {
  id: string;
  name: string;
  organizationId?: string;
  conditions: Array<{ field: string; operator: string; value: any }>;
  conditionLogic: 'AND' | 'OR';
  action: { type: string; params: Record<string, any> };
  priority: number;
  isActive: boolean;
  timesTriggered: number;
  createdAt: Date;
}

@Injectable()
export class MarketingPersonalizationService {
  private readonly logger = new Logger(MarketingPersonalizationService.name);

  private profiles: Map<string, UserProfile> = new Map();
  private rules: Map<string, PersonalizationRule> = new Map();

  constructor(private readonly prisma: PrismaService) {}

  async getUserProfile(userId: string): Promise<UserProfile> {
    let profile = this.profiles.get(userId);
    if (!profile) {
      profile = {
        userId,
        demographics: {},
        interests: [],
        behavior: {},
        purchaseHistory: {},
        segments: [],
        score: 50,
        lastUpdated: new Date(),
      };
      this.profiles.set(userId, profile);
    }
    return profile;
  }

  async updateUserProfile(userId: string, data: Partial<UserProfile>): Promise<UserProfile> {
    const profile = await this.getUserProfile(userId);
    const updated = {
      ...profile,
      ...data,
      lastUpdated: new Date(),
    };
    this.profiles.set(userId, updated);
    return updated;
  }

  async trackBehavior(userId: string, behaviorType: string, data?: Record<string, any>): Promise<void> {
    this.logger.log(`Tracking behavior ${behaviorType} for user ${userId}`);
    const profile = await this.getUserProfile(userId);

    profile.behavior[behaviorType] = profile.behavior[behaviorType] || [];
    profile.behavior[behaviorType].push({
      ...data,
      timestamp: new Date(),
    });

    this.profiles.set(userId, profile);
  }

  async getNextBestActions(
    userId: string,
    context?: string,
    availableActions?: string[],
    limit?: number,
  ): Promise<NextBestAction[]> {
    this.logger.log(`Getting next best actions for user ${userId}`);

    const profile = await this.getUserProfile(userId);
    const actions: NextBestAction[] = [];

    // Mock NBA logic
    if (profile.purchaseHistory?.lastOrderDays > 30) {
      actions.push({
        type: 'REACTIVATE',
        confidence: 0.85,
        params: { discount: 15, message: 'We miss you!' },
        reason: 'User inactive for 30+ days',
      });
    }

    actions.push({
      type: 'SHOW_PRODUCT',
      confidence: 0.72,
      params: { productIds: ['prod-1', 'prod-2'] },
      reason: 'Based on browsing history',
    });

    actions.push({
      type: 'CROSS_SELL',
      confidence: 0.68,
      params: { productIds: ['prod-3'] },
      reason: 'Frequently bought together',
    });

    return actions.slice(0, limit || 5);
  }

  async createRule(data: {
    name: string;
    organizationId?: string;
    conditions: Array<{ field: string; operator: string; value: any }>;
    conditionLogic?: 'AND' | 'OR';
    action: { type: string; params: Record<string, any> };
    priority?: number;
    isActive?: boolean;
  }): Promise<PersonalizationRule> {
    const id = `rule-${Date.now()}`;

    const rule: PersonalizationRule = {
      id,
      name: data.name,
      organizationId: data.organizationId,
      conditions: data.conditions,
      conditionLogic: data.conditionLogic || 'AND',
      action: data.action,
      priority: data.priority || 0,
      isActive: data.isActive !== false,
      timesTriggered: 0,
      createdAt: new Date(),
    };

    this.rules.set(id, rule);
    return rule;
  }

  async getRules(organizationId: string): Promise<PersonalizationRule[]> {
    return Array.from(this.rules.values())
      .filter((r) => r.organizationId === organizationId)
      .sort((a, b) => b.priority - a.priority);
  }

  async updateRule(id: string, data: Partial<PersonalizationRule>): Promise<PersonalizationRule> {
    const rule = this.rules.get(id);
    if (!rule) {
      throw new NotFoundException(`Rule ${id} not found`);
    }
    const updated = { ...rule, ...data };
    this.rules.set(id, updated);
    return updated;
  }

  async deleteRule(id: string): Promise<void> {
    this.rules.delete(id);
  }

  async evaluateRules(
    userId: string,
    context?: Record<string, any>,
    ruleIds?: string[],
  ): Promise<Array<{ rule: PersonalizationRule; matched: boolean; action?: any }>> {
    const profile = await this.getUserProfile(userId);
    let rules = Array.from(this.rules.values()).filter((r) => r.isActive);

    if (ruleIds?.length) {
      rules = rules.filter((r) => ruleIds.includes(r.id));
    }

    return rules
      .sort((a, b) => b.priority - a.priority)
      .map((rule) => {
        // Simple mock evaluation
        const matched = Math.random() > 0.5;
        if (matched) {
          rule.timesTriggered++;
          this.rules.set(rule.id, rule);
        }
        return {
          rule,
          matched,
          action: matched ? rule.action : undefined,
        };
      });
  }
}
