import { Injectable, Logger, BadRequestException, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { SchedulerRegistry } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../../common/prisma/prisma.service';
import { firstValueFrom, timeout, catchError } from 'rxjs';
import { CronJob } from 'cron';

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
export class AutomationRulesService implements OnModuleDestroy {
  private readonly logger = new Logger(AutomationRulesService.name);
  private rules: Map<string, AutomationRule> = new Map();
  private actionHandlers: Map<string, ActionHandler> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly httpService: HttpService,
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

    // Setup scheduled trigger if applicable
    if (rule.enabled && rule.trigger.type === 'schedule' && rule.trigger.schedule) {
      try {
        this.setupScheduledRule(rule);
      } catch (error) {
        this.logger.error(`Failed to setup scheduled rule ${rule.id}:`, error);
        throw new BadRequestException(`Invalid schedule configuration: ${error.message}`);
      }
    }

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

    // Remove old scheduled job if trigger changed
    if (rule.trigger.type === 'schedule' && rule.trigger.schedule) {
      this.removeScheduledRule(ruleId);
    }

    // Setup new scheduled job if needed
    if (
      updatedRule.enabled &&
      updatedRule.trigger.type === 'schedule' &&
      updatedRule.trigger.schedule
    ) {
      try {
        this.setupScheduledRule(updatedRule);
      } catch (error) {
        this.logger.error(`Failed to setup scheduled rule ${ruleId}:`, error);
        throw new BadRequestException(`Invalid schedule configuration: ${error.message}`);
      }
    }

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

    // Remove scheduled job if exists
    if (rule.trigger.type === 'schedule' && rule.trigger.schedule) {
      this.removeScheduledRule(ruleId);
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
    try {
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
          this.logger.error(
            `Error executing rule ${rule.name} (${rule.id}):`,
            error.stack || error.message || error,
          );
          // Continue with other rules even if one fails
        }
      }
    } catch (error) {
      this.logger.error('Critical error in event handler:', error.stack || error.message || error);
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

    const result: RuleExecutionResult = {
      ruleId: rule.id,
      ruleName: rule.name,
      matched: false,
      executed: false,
      actions: [],
      duration: 0,
      timestamp: new Date(),
    };

    try {
      this.logger.debug(`Executing rule: ${rule.name} (${rule.id})`);

      // Evaluate conditions with error handling
      let matched = false;
      try {
        matched = await this.evaluateConditions(rule.conditions, payload);
        result.matched = matched;
      } catch (error) {
        this.logger.error(
          `Error evaluating conditions for rule ${rule.name}:`,
          error.stack || error.message || error,
        );
        result.duration = Date.now() - startTime;
        return result;
      }

      if (!matched) {
        this.logger.debug(`Rule conditions not met: ${rule.name}`);
        result.duration = Date.now() - startTime;
        return result;
      }

      // Execute actions
      this.logger.log(`Rule matched: ${rule.name} - Executing ${rule.actions.length} actions`);
      result.executed = true;

      for (const action of rule.actions) {
        const actionStartTime = Date.now();
        try {
          const actionResult = await this.executeAction(action, context);
          const actionDuration = Date.now() - actionStartTime;

          result.actions.push({
            type: action.type,
            success: true,
            result: actionResult,
          });

          this.logger.debug(
            `Action ${action.type} completed successfully in ${actionDuration}ms`,
          );
        } catch (error) {
          const actionDuration = Date.now() - actionStartTime;
          this.logger.error(
            `Action execution failed (${action.type}) after ${actionDuration}ms:`,
            error.stack || error.message || error,
          );

          result.actions.push({
            type: action.type,
            success: false,
            error: error.message || 'Unknown error',
          });

          // Continue with other actions even if one fails
        }
      }

      result.duration = Date.now() - startTime;

      // Emit execution result event
      try {
        this.eventEmitter.emit('automation.rule.executed', {
          result,
          context,
          timestamp: new Date(),
        });
      } catch (error) {
        this.logger.error(
          `Error emitting rule execution event:`,
          error.stack || error.message || error,
        );
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Critical error executing rule ${rule.name}:`,
        error.stack || error.message || error,
      );
      result.duration = Date.now() - startTime;
      return result;
    }
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

    const conditionResults: Record<string, boolean> = {};
    const matched = await this.evaluateConditionsWithTracking(
      rule.conditions,
      samplePayload,
      conditionResults,
      '',
    );

    return {
      matched,
      conditionResults,
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
    try {
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
          if (fieldValue === null || fieldValue === undefined) return false;
          return String(fieldValue).includes(String(condition.value));

        case 'not_contains':
          if (fieldValue === null || fieldValue === undefined) return true;
          return !String(fieldValue).includes(String(condition.value));

        case 'starts_with':
          if (fieldValue === null || fieldValue === undefined) return false;
          return String(fieldValue).startsWith(String(condition.value));

        case 'ends_with':
          if (fieldValue === null || fieldValue === undefined) return false;
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
            if (isNaN(numValue)) return false;
            return numValue >= condition.value[0] && numValue <= condition.value[1];
          }
          return false;

        case 'regex':
          try {
            if (fieldValue === null || fieldValue === undefined) return false;
            const regex = new RegExp(condition.value);
            return regex.test(String(fieldValue));
          } catch (error) {
            this.logger.warn(
              `Invalid regex pattern: ${condition.value}`,
              error.message || error,
            );
            return false;
          }

        default:
          this.logger.warn(`Unknown operator: ${condition.operator}`);
          return false;
      }
    } catch (error) {
      this.logger.error(
        `Error evaluating condition (${condition.field} ${condition.operator} ${JSON.stringify(condition.value)}):`,
        error.stack || error.message || error,
      );
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
      try {
        const {
          url,
          method = 'POST',
          headers = {},
          body,
          timeout: requestTimeout = 10000,
          retries = 0,
          validateStatus,
        } = params;

        if (!url) {
          throw new Error('URL is required for HTTP request action');
        }

        this.logger.log(`HTTP Request action: ${method} ${url}`);

        // Merge context data into request if specified
        const requestBody = body || context.payload;
        const requestHeaders = {
          'Content-Type': 'application/json',
          'User-Agent': 'CitadelBuy-Automation/1.0',
          ...headers,
        };

        let lastError: any;
        for (let attempt = 0; attempt <= retries; attempt++) {
          try {
            const response = await firstValueFrom(
              this.httpService
                .request({
                  url,
                  method: method.toUpperCase(),
                  headers: requestHeaders,
                  data: requestBody,
                  timeout: requestTimeout,
                  validateStatus: validateStatus || ((status) => status >= 200 && status < 300),
                })
                .pipe(
                  timeout(requestTimeout + 1000),
                  catchError((error) => {
                    throw error;
                  }),
                ),
            );

            this.logger.log(
              `HTTP Request successful: ${method} ${url} - Status: ${response.status}`,
            );

            return {
              success: true,
              status: response.status,
              statusText: response.statusText,
              data: response.data,
              headers: response.headers,
            };
          } catch (error) {
            lastError = error;
            if (attempt < retries) {
              const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
              this.logger.warn(
                `HTTP Request failed (attempt ${attempt + 1}/${retries + 1}), retrying in ${delay}ms: ${error.message}`,
              );
              await new Promise((resolve) => setTimeout(resolve, delay));
            }
          }
        }

        // All retries failed
        throw lastError;
      } catch (error) {
        this.logger.error(`HTTP Request action failed: ${error.message}`, error.stack);
        throw new Error(`HTTP request failed: ${error.message}`);
      }
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

    // Send Email Action
    this.registerActionHandler('send_email', async (params, context) => {
      try {
        const { to, subject, template, data, from } = params;

        if (!to && !params.userId) {
          throw new Error('Email recipient (to or userId) is required');
        }

        let emailAddress = to;

        // If userId is provided, fetch user email
        if (params.userId && !to) {
          try {
            const user = await this.prisma.user.findUnique({
              where: { id: params.userId },
              select: { email: true },
            });
            if (!user) {
              throw new Error(`User not found: ${params.userId}`);
            }
            emailAddress = user.email;
          } catch (error) {
            this.logger.error(`Failed to fetch user email: ${error.message}`);
            throw error;
          }
        }

        this.logger.log(`Send Email action: ${emailAddress} - Template: ${template || 'custom'}`);

        // Emit email event to be handled by email service
        this.eventEmitter.emit('automation.send_email', {
          to: emailAddress,
          from: from || process.env.SMTP_FROM || 'noreply@citadelbuy.com',
          subject: subject || 'Notification from CitadelBuy',
          template: template || 'generic',
          templateData: data || context.payload,
          ruleId: context.ruleId,
          timestamp: new Date(),
        });

        return {
          success: true,
          recipient: emailAddress,
          template,
        };
      } catch (error) {
        this.logger.error(`Send Email action failed: ${error.message}`, error.stack);
        throw new Error(`Email sending failed: ${error.message}`);
      }
    });

    // Send Push Notification Action
    this.registerActionHandler('send_notification', async (params, context) => {
      try {
        const { userId, title, body, category, data, priority } = params;

        if (!userId) {
          throw new Error('userId is required for push notification');
        }

        this.logger.log(`Send Notification action: User ${userId} - ${title}`);

        // Emit notification event to be handled by notification service
        this.eventEmitter.emit('automation.send_notification', {
          userId,
          title: title || 'Notification',
          body: body || '',
          category: category || 'GENERAL',
          priority: priority || 'NORMAL',
          data: data || context.payload,
          ruleId: context.ruleId,
          timestamp: new Date(),
        });

        return {
          success: true,
          userId,
          title,
        };
      } catch (error) {
        this.logger.error(`Send Notification action failed: ${error.message}`, error.stack);
        throw new Error(`Notification sending failed: ${error.message}`);
      }
    });

    // Send SMS Action
    this.registerActionHandler('send_sms', async (params, context) => {
      try {
        const { userId, phoneNumber, message, smsType } = params;

        if (!userId && !phoneNumber) {
          throw new Error('userId or phoneNumber is required for SMS');
        }

        this.logger.log(`Send SMS action: ${phoneNumber || `User ${userId}`}`);

        // Emit SMS event to be handled by SMS service
        this.eventEmitter.emit('automation.send_sms', {
          userId,
          phoneNumber,
          message: message || 'You have a notification from CitadelBuy',
          smsType: smsType || 'general',
          ruleId: context.ruleId,
          timestamp: new Date(),
        });

        return {
          success: true,
          recipient: phoneNumber || userId,
        };
      } catch (error) {
        this.logger.error(`Send SMS action failed: ${error.message}`, error.stack);
        throw new Error(`SMS sending failed: ${error.message}`);
      }
    });

    // Create Database Record Action
    this.registerActionHandler('create_record', async (params, context) => {
      try {
        const { model, data } = params;

        if (!model || !data) {
          throw new Error('model and data are required for create_record action');
        }

        this.logger.log(`Create Record action: ${model}`);

        // Use Prisma to create record
        if (!(this.prisma as any)[model]) {
          throw new Error(`Invalid Prisma model: ${model}`);
        }

        const record = await (this.prisma as any)[model].create({
          data: {
            ...data,
            // Add metadata about automation
            ...(data.metadata
              ? {
                  metadata: {
                    ...data.metadata,
                    createdByAutomation: true,
                    automationRuleId: context.ruleId,
                  },
                }
              : {}),
          },
        });

        this.logger.log(`Record created in ${model}: ${record.id || 'unknown'}`);

        return {
          success: true,
          model,
          recordId: record.id,
          record,
        };
      } catch (error) {
        this.logger.error(`Create Record action failed: ${error.message}`, error.stack);
        throw new Error(`Database operation failed: ${error.message}`);
      }
    });

    // Update Database Record Action
    this.registerActionHandler('update_record', async (params, context) => {
      try {
        const { model, where, data } = params;

        if (!model || !where || !data) {
          throw new Error('model, where, and data are required for update_record action');
        }

        this.logger.log(`Update Record action: ${model}`);

        // Use Prisma to update record
        if (!(this.prisma as any)[model]) {
          throw new Error(`Invalid Prisma model: ${model}`);
        }

        const record = await (this.prisma as any)[model].update({
          where,
          data,
        });

        this.logger.log(`Record updated in ${model}: ${record.id || 'unknown'}`);

        return {
          success: true,
          model,
          recordId: record.id,
          record,
        };
      } catch (error) {
        this.logger.error(`Update Record action failed: ${error.message}`, error.stack);
        throw new Error(`Database operation failed: ${error.message}`);
      }
    });

    // Webhook Action
    this.registerActionHandler('webhook', async (params, context) => {
      try {
        const { url, method = 'POST', headers = {}, payload } = params;

        if (!url) {
          throw new Error('URL is required for webhook action');
        }

        const webhookPayload = payload || {
          event: context.event,
          ruleId: context.ruleId,
          timestamp: context.timestamp,
          data: context.payload,
        };

        this.logger.log(`Webhook action: ${method} ${url}`);

        const response = await firstValueFrom(
          this.httpService
            .request({
              url,
              method: method.toUpperCase(),
              headers: {
                'Content-Type': 'application/json',
                'X-Automation-Rule-Id': context.ruleId,
                'X-Automation-Event': context.event || 'unknown',
                ...headers,
              },
              data: webhookPayload,
              timeout: 15000,
            })
            .pipe(
              timeout(16000),
              catchError((error) => {
                throw error;
              }),
            ),
        );

        this.logger.log(`Webhook successful: ${method} ${url} - Status: ${response.status}`);

        return {
          success: true,
          status: response.status,
          response: response.data,
        };
      } catch (error) {
        this.logger.error(`Webhook action failed: ${error.message}`, error.stack);
        throw new Error(`Webhook failed: ${error.message}`);
      }
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

  /**
   * Setup scheduled rule using cron
   */
  private setupScheduledRule(rule: AutomationRule): void {
    if (!rule.trigger.schedule) {
      throw new Error('Schedule is required for scheduled rules');
    }

    try {
      const job = new CronJob(rule.trigger.schedule, async () => {
        this.logger.debug(`Scheduled rule triggered: ${rule.name} (${rule.id})`);
        try {
          await this.executeRule(rule, {
            scheduledAt: new Date(),
            ruleId: rule.id,
            ruleName: rule.name,
          });
        } catch (error) {
          this.logger.error(
            `Error executing scheduled rule ${rule.name} (${rule.id}):`,
            error,
          );
        }
      });

      this.schedulerRegistry.addCronJob(rule.id, job);
      job.start();

      this.logger.log(
        `Scheduled rule setup: ${rule.name} (${rule.id}) - Schedule: ${rule.trigger.schedule}`,
      );
    } catch (error) {
      this.logger.error(`Failed to setup scheduled rule ${rule.id}:`, error);
      throw error;
    }
  }

  /**
   * Remove scheduled rule
   */
  private removeScheduledRule(ruleId: string): void {
    try {
      if (this.schedulerRegistry.getCronJob(ruleId)) {
        const job = this.schedulerRegistry.getCronJob(ruleId);
        job.stop();
        this.schedulerRegistry.deleteCronJob(ruleId);
        this.logger.log(`Scheduled rule removed: ${ruleId}`);
      }
    } catch (error) {
      // Job might not exist, which is fine
      this.logger.debug(`No scheduled job found for rule ${ruleId}`);
    }
  }

  /**
   * Evaluate conditions with detailed tracking for testing
   */
  private async evaluateConditionsWithTracking(
    group: ConditionGroup,
    payload: any,
    results: Record<string, boolean>,
    path: string,
  ): Promise<boolean> {
    if (!group.conditions || group.conditions.length === 0) {
      return true;
    }

    const conditionResults: boolean[] = [];
    let conditionIndex = 0;

    for (const condition of group.conditions) {
      const currentPath = path ? `${path}.${conditionIndex}` : `${conditionIndex}`;

      if (this.isConditionGroup(condition)) {
        // Recursive evaluation for nested groups
        const result = await this.evaluateConditionsWithTracking(
          condition,
          payload,
          results,
          currentPath,
        );
        conditionResults.push(result);
        results[`${currentPath}[${condition.operator}]`] = result;
      } else {
        const result = this.evaluateCondition(condition, payload);
        conditionResults.push(result);
        results[`${currentPath}[${condition.field} ${condition.operator} ${JSON.stringify(condition.value)}]`] = result;
      }

      conditionIndex++;
    }

    // Apply logical operator
    const groupResult =
      group.operator === 'AND'
        ? conditionResults.every((r) => r === true)
        : conditionResults.some((r) => r === true);

    results[`${path || 'root'}[${group.operator}]`] = groupResult;

    return groupResult;
  }

  /**
   * Get all scheduled rules
   */
  getScheduledRules(): AutomationRule[] {
    return Array.from(this.rules.values()).filter(
      (rule) => rule.trigger.type === 'schedule' && rule.enabled,
    );
  }

  /**
   * Get scheduled job status
   */
  getScheduledJobStatus(ruleId: string): {
    exists: boolean;
    running?: boolean;
    nextDate?: Date;
  } {
    try {
      const job = this.schedulerRegistry.getCronJob(ruleId);
      return {
        exists: true,
        running: job.running,
        nextDate: job.nextDate()?.toJSDate(),
      };
    } catch (error) {
      return {
        exists: false,
      };
    }
  }

  /**
   * Manually trigger a scheduled rule
   */
  async triggerScheduledRule(ruleId: string): Promise<RuleExecutionResult> {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new BadRequestException(`Rule not found: ${ruleId}`);
    }

    if (rule.trigger.type !== 'schedule') {
      throw new BadRequestException(`Rule ${ruleId} is not a scheduled rule`);
    }

    this.logger.log(`Manually triggering scheduled rule: ${rule.name} (${ruleId})`);

    return this.executeRule(rule, {
      manualTrigger: true,
      triggeredAt: new Date(),
      ruleId: rule.id,
      ruleName: rule.name,
    });
  }

  /**
   * Cleanup - stop all scheduled jobs
   */
  async onModuleDestroy() {
    this.logger.log('Stopping all scheduled automation rules...');
    const scheduledRules = this.getScheduledRules();
    for (const rule of scheduledRules) {
      this.removeScheduledRule(rule.id);
    }
    this.logger.log('All scheduled automation rules stopped');
  }
}

/**
 * Action Handler Type
 */
export type ActionHandler = (
  params: Record<string, any>,
  context: RuleExecutionContext,
) => Promise<any> | any;
