import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { TargetingRuleOperator } from '../dto/experiment.dto';
import { UserContext } from '../interfaces/experiment.interface';

@Injectable()
export class TargetingService {
  private readonly logger = new Logger(TargetingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Evaluate targeting rules against user context
   * Returns true if user matches all rules (AND logic)
   */
  evaluateRules(rules: any[], context: UserContext): boolean {
    if (!rules || rules.length === 0) {
      return true;
    }

    // Sort rules by priority (higher priority first)
    const sortedRules = [...rules].sort((a, b) => b.priority - a.priority);

    // All rules must pass (AND logic)
    return sortedRules.every(rule => this.evaluateRule(rule, context));
  }

  /**
   * Evaluate a single targeting rule
   */
  evaluateRule(rule: any, context: UserContext): boolean {
    const { attribute, operator, value } = rule;
    const contextValue = this.getContextValue(attribute, context);

    try {
      return this.compare(contextValue, operator, value);
    } catch (error) {
      this.logger.warn(
        `Error evaluating rule: attribute=${attribute}, operator=${operator}, error=${error.message}`,
      );
      return false;
    }
  }

  /**
   * Get value from context, supporting nested paths
   */
  private getContextValue(attribute: string, context: UserContext): any {
    // Handle nested paths like "profile.country"
    const parts = attribute.split('.');
    let value: any = context;

    for (const part of parts) {
      if (value === null || value === undefined) {
        return undefined;
      }
      value = value[part];
    }

    return value;
  }

  /**
   * Compare context value with rule value using operator
   */
  private compare(
    contextValue: any,
    operator: TargetingRuleOperator,
    ruleValue: any,
  ): boolean {
    switch (operator) {
      case TargetingRuleOperator.EQUALS:
        return this.equals(contextValue, ruleValue);

      case TargetingRuleOperator.NOT_EQUALS:
        return !this.equals(contextValue, ruleValue);

      case TargetingRuleOperator.CONTAINS:
        return this.contains(contextValue, ruleValue);

      case TargetingRuleOperator.NOT_CONTAINS:
        return !this.contains(contextValue, ruleValue);

      case TargetingRuleOperator.GREATER_THAN:
        return this.greaterThan(contextValue, ruleValue);

      case TargetingRuleOperator.LESS_THAN:
        return this.lessThan(contextValue, ruleValue);

      case TargetingRuleOperator.IN:
        return this.inArray(contextValue, ruleValue);

      case TargetingRuleOperator.NOT_IN:
        return !this.inArray(contextValue, ruleValue);

      case TargetingRuleOperator.REGEX:
        return this.matchesRegex(contextValue, ruleValue);

      case TargetingRuleOperator.EXISTS:
        return contextValue !== undefined && contextValue !== null;

      case TargetingRuleOperator.NOT_EXISTS:
        return contextValue === undefined || contextValue === null;

      default:
        this.logger.warn(`Unknown operator: ${operator}`);
        return false;
    }
  }

  private equals(contextValue: any, ruleValue: any): boolean {
    // Type-insensitive comparison for strings
    if (typeof contextValue === 'string' && typeof ruleValue === 'string') {
      return contextValue.toLowerCase() === ruleValue.toLowerCase();
    }

    // Date comparison
    if (this.isDate(contextValue) && this.isDate(ruleValue)) {
      return new Date(contextValue).getTime() === new Date(ruleValue).getTime();
    }

    return contextValue === ruleValue;
  }

  private contains(contextValue: any, ruleValue: any): boolean {
    if (typeof contextValue === 'string' && typeof ruleValue === 'string') {
      return contextValue.toLowerCase().includes(ruleValue.toLowerCase());
    }

    if (Array.isArray(contextValue)) {
      return contextValue.some(v => this.equals(v, ruleValue));
    }

    return false;
  }

  private greaterThan(contextValue: any, ruleValue: any): boolean {
    // Date comparison
    if (this.isDate(contextValue) && this.isDate(ruleValue)) {
      return new Date(contextValue).getTime() > new Date(ruleValue).getTime();
    }

    // Numeric comparison
    const numContext = parseFloat(contextValue);
    const numRule = parseFloat(ruleValue);

    if (!isNaN(numContext) && !isNaN(numRule)) {
      return numContext > numRule;
    }

    return false;
  }

  private lessThan(contextValue: any, ruleValue: any): boolean {
    // Date comparison
    if (this.isDate(contextValue) && this.isDate(ruleValue)) {
      return new Date(contextValue).getTime() < new Date(ruleValue).getTime();
    }

    // Numeric comparison
    const numContext = parseFloat(contextValue);
    const numRule = parseFloat(ruleValue);

    if (!isNaN(numContext) && !isNaN(numRule)) {
      return numContext < numRule;
    }

    return false;
  }

  private inArray(contextValue: any, ruleValue: any): boolean {
    const array = Array.isArray(ruleValue) ? ruleValue : [ruleValue];
    return array.some(v => this.equals(contextValue, v));
  }

  private matchesRegex(contextValue: any, ruleValue: any): boolean {
    if (typeof contextValue !== 'string' || typeof ruleValue !== 'string') {
      return false;
    }

    try {
      const regex = new RegExp(ruleValue, 'i');
      return regex.test(contextValue);
    } catch {
      this.logger.warn(`Invalid regex pattern: ${ruleValue}`);
      return false;
    }
  }

  private isDate(value: any): boolean {
    if (!value) return false;
    if (value instanceof Date) return true;
    if (typeof value === 'string') {
      const parsed = Date.parse(value);
      return !isNaN(parsed);
    }
    return false;
  }

  /**
   * Check if user belongs to a segment
   */
  async isUserInSegment(segmentId: string, context: UserContext): Promise<boolean> {
    const segment = await this.prisma.userSegment.findUnique({
      where: { id: segmentId },
    });

    if (!segment) {
      this.logger.warn(`Segment not found: ${segmentId}`);
      return false;
    }

    const rules = segment.rules as any[];
    return this.evaluateRules(rules, context);
  }

  /**
   * Create or update a user segment
   */
  async createSegment(data: {
    key: string;
    name: string;
    description?: string;
    rules: any[];
    createdById?: string;
  }) {
    return this.prisma.userSegment.upsert({
      where: { key: data.key },
      create: {
        key: data.key,
        name: data.name,
        description: data.description,
        rules: data.rules,
        createdById: data.createdById,
      },
      update: {
        name: data.name,
        description: data.description,
        rules: data.rules,
      },
    });
  }

  /**
   * Get all segments
   */
  async getSegments() {
    return this.prisma.userSegment.findMany({
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get segment by key
   */
  async getSegment(key: string) {
    return this.prisma.userSegment.findUnique({
      where: { key },
    });
  }

  /**
   * Delete segment
   */
  async deleteSegment(key: string) {
    return this.prisma.userSegment.delete({
      where: { key },
    });
  }
}
