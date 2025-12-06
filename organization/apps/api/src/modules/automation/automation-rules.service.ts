import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * Rule Condition - Evaluates to true/false
 */
export interface RuleCondition {
  field: string;
  operator: ConditionOperator;
  value: any;
  type?: 'string' | 'number' | 'boolean' | 'date' | 'array';
}

/**
 * Condition Operators
 */
export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'greater_than_or_equal'
  | 'less_than'
  | 'less_than_or_equal'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'in'
  | 'not_in'
  | 'is_null'
  | 'is_not_null'
  | 'between'
  | 'regex';

/**
 * Logical Operator for combining conditions
 */
export type LogicalOperator = 'AND' | 'OR';

/**
 * Condition Group
 */
export interface ConditionGroup {
  operator: LogicalOperator;
  conditions: (RuleCondition | ConditionGroup)[];
}

/**
 * Rule Action - What to do when rule matches
 */
export interface RuleAction {
  type: string;
  params: Record<string, any>;
  async?: boolean;
}

/**
 * Rule Trigger - When to evaluate the rule
 */
export interface RuleTrigger {
  type: 'event' | 'schedule' | 'webhook';
  event?: string;
  schedule?: string; // Cron expression
  webhookPath?: string;
}

/**
 * Automation Rule Definition
 */
export interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  priority: number;
  trigger: RuleTrigger;
  conditions: ConditionGroup;
  actions: RuleAction[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

/**
 * Rule Execution Context
 */
export interface RuleExecutionContext {
  ruleId: string;
  trigger: RuleTrigger;
  event?: string;
  payload: any;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Rule Execution Result
 */
export interface RuleExecutionResult {
  ruleId: string;
  ruleName: string;
  matched: boolean;
  executed: boolean;
  actions: {
    type: string;
    success: boolean;
    error?: string;
    result?: any;
  }[];
  duration: number;
  timestamp: Date;
}

/**
 * Automation Rules Service
 *
 * A rule engine that can:
 * - Define trigger conditions (event-based triggers)
 * - Define condition evaluators (if X then Y)
 * - Execute actions when rules match
 * - Support rule prioritization and chaining
 *
 * Usage:
 * ```typescript
 * // Create a rule
 * const rule = await automationRules.createRule({
 *   name: 'High-value order notification',
 *   enabled: true,
 *   priority: 10,
 *   trigger: {
 *     type: 'event',
 *     event: 'order.created'
 *   },
 *   conditions: {
 *     operator: 'AND',
 *     conditions: [
 *       { field: 'total', operator: 'greater_than', value: 1000 },
 *       { field: 'status', operator: 'equals', value: 'PENDING' }
 *     ]
 *   },
 *   actions: [
 *     { type: 'send_email', params: { template: 'high-value-order' } },
 *     { type: 'create_task', params: { assignee: 'sales-team' } }
 *   ]
 * });
 * ```
 */
@Injectable()
export class AutomationRulesService {
  private readonly logger = new Logger(AutomationRulesService.name);
  private rules: Map<string, AutomationRule> = new Map();
  private actionHandlers: Map<string, ActionHandler> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.logger.log('Automation Rules Service initialized');
    this.registerDefaultActionHandlers();
  }

  /**
   * Create a new automation rule
   */
  async createRule(
    definition: Omit<AutomationRule, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<AutomationRule> {
    const rule: AutomationRule = {
      ...definition,
      id: this.generateRuleId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Validate rule
    this.validateRule(rule);

    // Store rule
    this.rules.set(rule.id, rule);

    this.logger.log(`Rule created: ${rule.name} (${rule.id})`);

    // Emit rule created event
    this.eventEmitter.emit('automation.rule.created', {
      rule,
      timestamp: new Date(),
    });

    return rule;
  }

  /**
   * Update an existing rule
   */
  async updateRule(
    ruleId: string,
    updates: Partial<Omit<AutomationRule, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<AutomationRule> {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new BadRequestException(`Rule not found: ${ruleId}`);
    }

    const updatedRule: AutomationRule = {
      ...rule,
      ...updates,
      updatedAt: new Date(),
    };

    // Validate updated rule
    this.validateRule(updatedRule);

    this.rules.set(ruleId, updatedRule);

    this.logger.log(`Rule updated: ${updatedRule.name} (${ruleId})`);

    // Emit rule updated event
    this.eventEmitter.emit('automation.rule.updated', {
      rule: updatedRule,
      timestamp: new Date(),
    });

    return updatedRule;
  }

  /**
   * Delete a rule
   */
  async deleteRule(ruleId: string): Promise<void> {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new BadRequestException(`Rule not found: ${ruleId}`);
    }

    this.rules.delete(ruleId);

    this.logger.log(`Rule deleted: ${rule.name} (${ruleId})`);

    // Emit rule deleted event
    this.eventEmitter.emit('automation.rule.deleted', {
      ruleId,
      timestamp: new Date(),
    });
  }

  /**
   * Get a rule by ID
   */
  getRule(ruleId: string): AutomationRule | null {
    return this.rules.get(ruleId) || null;
  }

  /**
   * Get all rules
   */
  getAllRules(filters?: { enabled?: boolean; trigger?: string }): AutomationRule[] {
    let rules = Array.from(this.rules.values());

    if (filters?.enabled !== undefined) {
      rules = rules.filter((rule) => rule.enabled === filters.enabled);
    }

    if (filters?.trigger) {
      rules = rules.filter((rule) => rule.trigger.event === filters.trigger);
    }

    // Sort by priority (higher priority first)
    return rules.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Enable a rule
   */
  async enableRule(ruleId: string): Promise<AutomationRule> {
    return this.updateRule(ruleId, { enabled: true });
  }

  /**
   * Disable a rule
   */
  async disableRule(ruleId: string): Promise<AutomationRule> {
    return this.updateRule(ruleId, { enabled: false });
  }

  /**
   * Evaluate rules for an event
   */
  @OnEvent('**', { async: true })
  async handleEvent(payload: any, event?: string): Promise<void> {
    // Get event name from metadata if not provided
    const eventName = event || payload?.event;
    if (!eventName) {
      return;
    }

    // Find rules triggered by this event
    const triggeredRules = this.getAllRules({
      enabled: true,
      trigger: eventName,
    });

    if (triggeredRules.length === 0) {
      return;
    }

    this.logger.debug(`Evaluating ${triggeredRules.length} rules for event: ${eventName}`);

    // Execute rules in priority order
    for (const rule of triggeredRules) {
      try {
        await this.executeRule(rule, payload, eventName);
      } catch (error) {
        this.logger.error(`Error executing rule ${rule.name}:`, error);
      }
    }
  }

  /**
   * Execute a specific rule
   */
  async executeRule(
    rule: AutomationRule,
    payload: any,
    event?: string,
  ): Promise<RuleExecutionResult> {
    const startTime = Date.now();
    const context: RuleExecutionContext = {
      ruleId: rule.id,
      trigger: rule.trigger,
      event: event || rule.trigger.event,
      payload,
      timestamp: new Date(),
    };

    this.logger.debug(`Executing rule: ${rule.name}`);

    // Evaluate conditions
    const matched = await this.evaluateConditions(rule.conditions, payload);

    const result: RuleExecutionResult = {
      ruleId: rule.id,
      ruleName: rule.name,
      matched,
      executed: false,
      actions: [],
      duration: 0,
      timestamp: new Date(),
    };

    if (!matched) {
      this.logger.debug(`Rule conditions not met: ${rule.name}`);
      result.duration = Date.now() - startTime;
      return result;
    }

    // Execute actions
    this.logger.log(`Rule matched: ${rule.name} - Executing ${rule.actions.length} actions`);
    result.executed = true;

    for (const action of rule.actions) {
      try {
        const actionResult = await this.executeAction(action, context);
        result.actions.push({
          type: action.type,
          success: true,
          result: actionResult,
        });
      } catch (error) {
        this.logger.error(`Action execution failed (${action.type}):`, error);
        result.actions.push({
          type: action.type,
          success: false,
          error: error.message,
        });
      }
    }

    result.duration = Date.now() - startTime;

    // Emit execution result event
    this.eventEmitter.emit('automation.rule.executed', {
      result,
      context,
      timestamp: new Date(),
    });

    return result;
  }

  /**
   * Test a rule against sample data
   */
  async testRule(
    ruleId: string,
    samplePayload: any,
  ): Promise<{
    matched: boolean;
    conditionResults: Record<string, boolean>;
  }> {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new BadRequestException(`Rule not found: ${ruleId}`);
    }

    const matched = await this.evaluateConditions(rule.conditions, samplePayload);

    return {
      matched,
      conditionResults: {}, // TODO: Implement detailed condition results
    };
  }

  /**
   * Register a custom action handler
   */
  registerActionHandler(actionType: string, handler: ActionHandler): void {
    this.actionHandlers.set(actionType, handler);
    this.logger.log(`Action handler registered: ${actionType}`);
  }

  /**
   * Private helper methods
   */

  private generateRuleId(): string {
    return `rule_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private validateRule(rule: AutomationRule): void {
    if (!rule.name) {
      throw new BadRequestException('Rule name is required');
    }

    if (!rule.trigger || !rule.trigger.type) {
      throw new BadRequestException('Rule trigger is required');
    }

    if (rule.trigger.type === 'event' && !rule.trigger.event) {
      throw new BadRequestException('Event trigger requires event name');
    }

    if (!rule.conditions) {
      throw new BadRequestException('Rule conditions are required');
    }

    if (!rule.actions || rule.actions.length === 0) {
      throw new BadRequestException('At least one action is required');
    }
  }

  private async evaluateConditions(
    group: ConditionGroup,
    payload: any,
  ): Promise<boolean> {
    if (!group.conditions || group.conditions.length === 0) {
      return true;
    }

    const results: boolean[] = [];

    for (const condition of group.conditions) {
      if (this.isConditionGroup(condition)) {
        // Recursive evaluation for nested groups
        results.push(await this.evaluateConditions(condition, payload));
      } else {
        results.push(this.evaluateCondition(condition, payload));
      }
    }

    // Apply logical operator
    if (group.operator === 'AND') {
      return results.every((r) => r === true);
    } else {
      return results.some((r) => r === true);
    }
  }

  private isConditionGroup(
    condition: RuleCondition | ConditionGroup,
  ): condition is ConditionGroup {
    return 'operator' in condition && 'conditions' in condition;
  }

  private evaluateCondition(condition: RuleCondition, payload: any): boolean {
    const fieldValue = this.getFieldValue(payload, condition.field);

    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;

      case 'not_equals':
        return fieldValue !== condition.value;

      case 'greater_than':
        return Number(fieldValue) > Number(condition.value);

      case 'greater_than_or_equal':
        return Number(fieldValue) >= Number(condition.value);

      case 'less_than':
        return Number(fieldValue) < Number(condition.value);

      case 'less_than_or_equal':
        return Number(fieldValue) <= Number(condition.value);

      case 'contains':
        return String(fieldValue).includes(String(condition.value));

      case 'not_contains':
        return !String(fieldValue).includes(String(condition.value));

      case 'starts_with':
        return String(fieldValue).startsWith(String(condition.value));

      case 'ends_with':
        return String(fieldValue).endsWith(String(condition.value));

      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);

      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(fieldValue);

      case 'is_null':
        return fieldValue === null || fieldValue === undefined;

      case 'is_not_null':
        return fieldValue !== null && fieldValue !== undefined;

      case 'between':
        if (Array.isArray(condition.value) && condition.value.length === 2) {
          const numValue = Number(fieldValue);
          return numValue >= condition.value[0] && numValue <= condition.value[1];
        }
        return false;

      case 'regex':
        try {
          const regex = new RegExp(condition.value);
          return regex.test(String(fieldValue));
        } catch {
          return false;
        }

      default:
        this.logger.warn(`Unknown operator: ${condition.operator}`);
        return false;
    }
  }

  private getFieldValue(payload: any, field: string): any {
    // Support nested field access with dot notation (e.g., "order.total")
    const parts = field.split('.');
    let value = payload;

    for (const part of parts) {
      if (value === null || value === undefined) {
        return undefined;
      }
      value = value[part];
    }

    return value;
  }

  private async executeAction(
    action: RuleAction,
    context: RuleExecutionContext,
  ): Promise<any> {
    const handler = this.actionHandlers.get(action.type);
    if (!handler) {
      throw new Error(`No handler registered for action type: ${action.type}`);
    }

    return handler(action.params, context);
  }

  private registerDefaultActionHandlers(): void {
    // Emit Event Action
    this.registerActionHandler('emit_event', async (params, context) => {
      const eventName = params.event || `automation.${context.ruleId}`;
      this.eventEmitter.emit(eventName, {
        ...params.payload,
        triggeredBy: context.ruleId,
        timestamp: new Date(),
      });
      return { event: eventName };
    });

    // Log Action
    this.registerActionHandler('log', async (params, context) => {
      const level = params.level || 'info';
      const message = params.message || 'Automation rule triggered';
      const logMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : level === 'debug' ? 'debug' : 'log';
      (this.logger as any)[logMethod](`[Rule: ${context.ruleId}] ${message}`, params.data);
      return { logged: true };
    });

    // HTTP Request Action
    this.registerActionHandler('http_request', async (params, context) => {
      // TODO: Implement HTTP request using axios
      this.logger.log(`HTTP Request action: ${params.method || 'POST'} ${params.url}`);
      return { status: 'pending' };
    });

    // Set Metadata Action
    this.registerActionHandler('set_metadata', async (params, context) => {
      if (!context.metadata) {
        context.metadata = {};
      }
      Object.assign(context.metadata, params.metadata || {});
      return { metadata: context.metadata };
    });

    // Delay Action
    this.registerActionHandler('delay', async (params, context) => {
      const duration = params.duration || 1000;
      await new Promise((resolve) => setTimeout(resolve, duration));
      return { delayed: duration };
    });
  }

  /**
   * Get rule execution statistics
   */
  getRuleStats(ruleId: string): {
    rule: AutomationRule | null;
    enabled: boolean;
  } {
    const rule = this.rules.get(ruleId) || null;
    return {
      rule,
      enabled: rule?.enabled || false,
    };
  }

  /**
   * Export all rules as JSON
   */
  exportRules(): string {
    const rules = Array.from(this.rules.values());
    return JSON.stringify(rules, null, 2);
  }

  /**
   * Import rules from JSON
   */
  async importRules(rulesJson: string): Promise<AutomationRule[]> {
    const rules = JSON.parse(rulesJson) as AutomationRule[];
    const imported: AutomationRule[] = [];

    for (const rule of rules) {
      try {
        const created = await this.createRule({
          name: rule.name,
          description: rule.description,
          enabled: rule.enabled,
          priority: rule.priority,
          trigger: rule.trigger,
          conditions: rule.conditions,
          actions: rule.actions,
          metadata: rule.metadata,
          createdBy: rule.createdBy,
        });
        imported.push(created);
      } catch (error) {
        this.logger.error(`Failed to import rule ${rule.name}:`, error);
      }
    }

    return imported;
  }
}

/**
 * Action Handler Type
 */
export type ActionHandler = (
  params: Record<string, any>,
  context: RuleExecutionContext,
) => Promise<any> | any;
