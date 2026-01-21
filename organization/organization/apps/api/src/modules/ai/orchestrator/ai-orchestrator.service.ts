/**
 * AI Orchestrator Service
 *
 * Coordinates multiple AI services into intelligent workflows.
 * Supports chaining, parallel execution, conditional branching,
 * caching, and graceful error handling.
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { RedisService } from '@/common/redis/redis.service';
import { FeatureFlagsService } from '@/common/feature-flags';
import {
  AIWorkflow,
  AIWorkflowStep,
  AIServiceType,
  WorkflowContext,
  WorkflowResult,
  StepResult,
  StepStatus,
  WorkflowStatus,
  ExecutionOptions,
  StepCondition,
  WORKFLOW_TEMPLATES,
} from './ai-orchestrator.interface';

// Import AI services
import { PersonalizationService } from '../personalization/personalization.service';
import { ChatbotService } from '../chatbot/chatbot.service';
import { ContentGenerationService } from '../content-generation/content-generation.service';
import { DemandForecastingService } from '../demand-forecasting/demand-forecasting.service';
import { FraudDetectionService } from '../fraud-detection/fraud-detection.service';
import { PricingEngineService } from '../pricing-engine/pricing-engine.service';
import { SmartSearchService } from '../smart-search/smart-search.service';
import { CartAbandonmentService } from '../cart-abandonment/cart-abandonment.service';
import { ConversationalService } from '../conversational/conversational.service';

@Injectable()
export class AIOrchestratorService implements OnModuleInit {
  private readonly logger = new Logger(AIOrchestratorService.name);
  private readonly CACHE_PREFIX = 'ai-workflow:';
  private readonly workflows: Map<string, AIWorkflow> = new Map();
  private readonly activeExecutions: Map<string, WorkflowContext> = new Map();

  constructor(
    private readonly redis: RedisService,
    private readonly featureFlags: FeatureFlagsService,
    private readonly personalization: PersonalizationService,
    private readonly chatbot: ChatbotService,
    private readonly contentGeneration: ContentGenerationService,
    private readonly demandForecasting: DemandForecastingService,
    private readonly fraudDetection: FraudDetectionService,
    private readonly pricingEngine: PricingEngineService,
    private readonly smartSearch: SmartSearchService,
    private readonly cartAbandonment: CartAbandonmentService,
    private readonly conversational: ConversationalService,
  ) {}

  async onModuleInit(): Promise<void> {
    // Register built-in workflow templates
    this.registerBuiltInWorkflows();
    this.logger.log('AI Orchestrator initialized with built-in workflows');
  }

  /**
   * Execute a workflow by ID or template name
   */
  async executeWorkflow(
    workflowIdOrTemplate: string,
    input: Record<string, unknown>,
    options?: ExecutionOptions,
  ): Promise<WorkflowResult> {
    const startedAt = new Date();
    const executionId = uuidv4();

    try {
      // Get workflow definition
      const workflow = this.workflows.get(workflowIdOrTemplate);
      if (!workflow) {
        throw new Error(`Workflow not found: ${workflowIdOrTemplate}`);
      }

      // Check feature flag if configured
      if (await this.isWorkflowGated(workflow, options?.featureFlagContext)) {
        return this.createSkippedResult(workflow.id, executionId, startedAt, 'Feature flag disabled');
      }

      // Create execution context
      const context: WorkflowContext = {
        workflowId: workflow.id,
        executionId,
        userId: input.userId as string | undefined,
        sessionId: input.sessionId as string | undefined,
        organizationId: input.organizationId as string | undefined,
        startedAt,
        input,
        stepResults: new Map(),
        variables: {},
      };

      this.activeExecutions.set(executionId, context);

      // Execute with timeout if specified
      const timeout = options?.timeout || workflow.timeout || 30000;
      const result = await this.executeWithTimeout(
        () => this.runWorkflow(workflow, context, options),
        timeout,
      );

      return result;
    } catch (error) {
      this.logger.error(`Workflow execution failed: ${error.message}`, error.stack);
      return this.createFailedResult(workflowIdOrTemplate, executionId, startedAt, error);
    } finally {
      this.activeExecutions.delete(executionId);
    }
  }

  /**
   * Execute multiple services in parallel
   */
  async parallel<T>(
    tasks: Array<{ service: AIServiceType; action: string; input: Record<string, unknown> }>,
  ): Promise<T[]> {
    const promises = tasks.map(task =>
      this.invokeService(task.service, task.action, task.input),
    );
    return Promise.all(promises) as Promise<T[]>;
  }

  /**
   * Chain multiple services sequentially, passing output to next input
   */
  async chain<T>(
    steps: Array<{
      service: AIServiceType;
      action: string;
      inputTransform?: (prevOutput: unknown) => Record<string, unknown>;
    }>,
    initialInput: Record<string, unknown>,
  ): Promise<T> {
    let currentOutput: unknown = initialInput;

    for (const step of steps) {
      const input = step.inputTransform
        ? step.inputTransform(currentOutput)
        : (currentOutput as Record<string, unknown>);

      currentOutput = await this.invokeService(step.service, step.action, input);
    }

    return currentOutput as T;
  }

  /**
   * Register a custom workflow
   */
  registerWorkflow(workflow: AIWorkflow): void {
    if (this.workflows.has(workflow.id)) {
      this.logger.warn(`Overwriting existing workflow: ${workflow.id}`);
    }
    this.workflows.set(workflow.id, workflow);
    this.logger.log(`Workflow registered: ${workflow.id}`);
  }

  /**
   * Get all registered workflows
   */
  getRegisteredWorkflows(): AIWorkflow[] {
    return Array.from(this.workflows.values());
  }

  /**
   * Get workflow execution status
   */
  getExecutionStatus(executionId: string): WorkflowContext | null {
    return this.activeExecutions.get(executionId) || null;
  }

  // Private implementation methods

  private async runWorkflow(
    workflow: AIWorkflow,
    context: WorkflowContext,
    options?: ExecutionOptions,
  ): Promise<WorkflowResult> {
    const stepResults: StepResult[] = [];
    let currentStepId: string | undefined = workflow.steps[0]?.id;
    let finalOutput: unknown;

    while (currentStepId) {
      const step = workflow.steps.find(s => s.id === currentStepId);
      if (!step) break;

      // Check conditions
      if (step.conditions && !this.evaluateConditions(step.conditions, context)) {
        const skipResult = this.createStepResult(step.id, 'skipped');
        stepResults.push(skipResult);
        context.stepResults.set(step.id, skipResult);
        currentStepId = step.onSuccess;
        continue;
      }

      // Execute step (with parallel support)
      let stepResult: StepResult;
      if (step.parallel && step.parallel.length > 0) {
        stepResult = await this.executeParallelSteps(step, workflow, context);
      } else {
        stepResult = await this.executeStep(step, context);
      }

      stepResults.push(stepResult);
      context.stepResults.set(step.id, stepResult);

      // Determine next step
      if (stepResult.status === 'completed') {
        finalOutput = stepResult.output;
        currentStepId = step.onSuccess;
      } else if (stepResult.status === 'failed') {
        if (step.onFailure) {
          currentStepId = step.onFailure;
        } else if (workflow.errorHandling?.defaultAction === 'skip') {
          currentStepId = step.onSuccess;
        } else {
          break; // Stop workflow on unhandled error
        }
      } else {
        currentStepId = step.onSuccess;
      }
    }

    const completedAt = new Date();
    const hasFailure = stepResults.some(r => r.status === 'failed');

    return {
      workflowId: workflow.id,
      executionId: context.executionId,
      status: hasFailure && !workflow.errorHandling?.defaultAction ? 'failed' : 'completed',
      output: finalOutput,
      stepResults,
      startedAt: context.startedAt,
      completedAt,
      duration: completedAt.getTime() - context.startedAt.getTime(),
    };
  }

  private async executeStep(
    step: AIWorkflowStep,
    context: WorkflowContext,
  ): Promise<StepResult> {
    const startedAt = new Date();
    let attempts = 0;
    const maxAttempts = step.retry?.maxAttempts || 1;

    while (attempts < maxAttempts) {
      attempts++;

      try {
        // Check cache
        if (step.cache?.enabled) {
          const cached = await this.getCachedResult(step, context);
          if (cached) {
            return {
              stepId: step.id,
              status: 'completed',
              output: cached,
              startedAt,
              completedAt: new Date(),
              cached: true,
            };
          }
        }

        // Build input
        const input = await this.buildStepInput(step, context);

        // Execute service
        const output = await this.invokeService(step.service, step.action, input);

        // Cache result
        if (step.cache?.enabled) {
          await this.cacheResult(step, context, output);
        }

        const completedAt = new Date();
        return {
          stepId: step.id,
          status: 'completed',
          output,
          startedAt,
          completedAt,
          duration: completedAt.getTime() - startedAt.getTime(),
          attempts,
        };
      } catch (error) {
        if (attempts >= maxAttempts) {
          return {
            stepId: step.id,
            status: 'failed',
            error: {
              code: 'STEP_EXECUTION_ERROR',
              message: error.message,
              stack: error.stack,
            },
            startedAt,
            completedAt: new Date(),
            attempts,
          };
        }

        // Wait before retry
        const backoff = step.retry?.backoffMs || 1000;
        const multiplier = step.retry?.backoffMultiplier || 2;
        await this.sleep(backoff * Math.pow(multiplier, attempts - 1));
      }
    }

    return this.createStepResult(step.id, 'failed');
  }

  private async executeParallelSteps(
    step: AIWorkflowStep,
    workflow: AIWorkflow,
    context: WorkflowContext,
  ): Promise<StepResult> {
    const startedAt = new Date();
    const parallelStepIds = [step.id, ...(step.parallel || [])];

    const parallelSteps = parallelStepIds
      .map(id => workflow.steps.find(s => s.id === id))
      .filter((s): s is AIWorkflowStep => s !== undefined);

    const results = await Promise.all(
      parallelSteps.map(s => this.executeStep(s, context)),
    );

    // Store all results
    results.forEach((result, index) => {
      context.stepResults.set(parallelStepIds[index], result);
    });

    const completedAt = new Date();
    const hasFailure = results.some(r => r.status === 'failed');

    return {
      stepId: step.id,
      status: hasFailure ? 'failed' : 'completed',
      output: results.map(r => r.output),
      startedAt,
      completedAt,
      duration: completedAt.getTime() - startedAt.getTime(),
    };
  }

  private async invokeService(
    service: AIServiceType,
    action: string,
    input: Record<string, unknown>,
  ): Promise<unknown> {
    const serviceInstance = this.getServiceInstance(service);
    if (!serviceInstance) {
      throw new Error(`Unknown AI service: ${service}`);
    }

    const method = (serviceInstance as Record<string, unknown>)[action];
    if (typeof method !== 'function') {
      throw new Error(`Unknown action ${action} on service ${service}`);
    }

    return method.call(serviceInstance, input);
  }

  private getServiceInstance(service: AIServiceType): unknown {
    const serviceMap: Record<AIServiceType, unknown> = {
      personalization: this.personalization,
      chatbot: this.chatbot,
      recommendations: this.personalization, // Alias
      contentGeneration: this.contentGeneration,
      demandForecasting: this.demandForecasting,
      fraudDetection: this.fraudDetection,
      pricingEngine: this.pricingEngine,
      smartSearch: this.smartSearch,
      visualSearch: null, // May not be injected
      arTryon: null, // May not be injected
      cartAbandonment: this.cartAbandonment,
      conversational: this.conversational,
      subscriptionIntelligence: null, // May not be injected
      revenueOptimization: null, // May not be injected
    };

    return serviceMap[service];
  }

  private async buildStepInput(
    step: AIWorkflowStep,
    context: WorkflowContext,
  ): Promise<Record<string, unknown>> {
    const input: Record<string, unknown> = {};

    // Add static input
    if (step.input?.static) {
      Object.assign(input, step.input.static);
    }

    // Add from workflow input
    if (step.input?.fromContext) {
      const contextValue = context.input[step.input.fromContext];
      if (contextValue !== undefined) {
        Object.assign(input, { [step.input.fromContext]: contextValue });
      }
    }

    // Add from previous step
    if (step.input?.fromStep) {
      const previousResult = context.stepResults.get(step.input.fromStep);
      if (previousResult?.output) {
        Object.assign(input, previousResult.output as Record<string, unknown>);
      }
    }

    // Add common context values
    if (context.userId) input.userId = context.userId;
    if (context.sessionId) input.sessionId = context.sessionId;
    if (context.organizationId) input.organizationId = context.organizationId;

    return input;
  }

  private evaluateConditions(
    conditions: StepCondition[],
    context: WorkflowContext,
  ): boolean {
    if (conditions.length === 0) return true;

    let result = true;
    let currentOperator: 'and' | 'or' = 'and';

    for (const condition of conditions) {
      const fieldValue = this.getFieldValue(condition.field, context);
      const conditionResult = this.evaluateCondition(condition, fieldValue);

      if (currentOperator === 'and') {
        result = result && conditionResult;
      } else {
        result = result || conditionResult;
      }

      currentOperator = condition.logicalOperator || 'and';
    }

    return result;
  }

  private getFieldValue(field: string, context: WorkflowContext): unknown {
    const parts = field.split('.');

    if (parts[0] === 'input') {
      return this.getNestedValue(context.input, parts.slice(1));
    } else if (parts[0] === 'step') {
      const stepResult = context.stepResults.get(parts[1]);
      if (stepResult?.output) {
        return this.getNestedValue(stepResult.output as Record<string, unknown>, parts.slice(2));
      }
    } else if (parts[0] === 'variables') {
      return this.getNestedValue(context.variables, parts.slice(1));
    }

    return undefined;
  }

  private getNestedValue(obj: Record<string, unknown>, path: string[]): unknown {
    let current: unknown = obj;
    for (const key of path) {
      if (current === null || current === undefined) return undefined;
      current = (current as Record<string, unknown>)[key];
    }
    return current;
  }

  private evaluateCondition(condition: StepCondition, fieldValue: unknown): boolean {
    const { operator, value } = condition;

    switch (operator) {
      case 'equals':
        return fieldValue === value;
      case 'notEquals':
        return fieldValue !== value;
      case 'contains':
        return String(fieldValue).includes(String(value));
      case 'notContains':
        return !String(fieldValue).includes(String(value));
      case 'greaterThan':
        return Number(fieldValue) > Number(value);
      case 'lessThan':
        return Number(fieldValue) < Number(value);
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null;
      case 'notExists':
        return fieldValue === undefined || fieldValue === null;
      case 'in':
        return Array.isArray(value) && value.includes(fieldValue);
      case 'notIn':
        return Array.isArray(value) && !value.includes(fieldValue);
      default:
        return false;
    }
  }

  private async isWorkflowGated(
    workflow: AIWorkflow,
    featureFlagContext?: Record<string, unknown>,
  ): Promise<boolean> {
    const flagTrigger = workflow.triggers?.find(t => t.type === 'featureFlag');
    if (!flagTrigger) return false;

    const flagKey = flagTrigger.config.flagKey as string;
    if (!flagKey) return false;

    const isEnabled = await this.featureFlags.isEnabled(flagKey, featureFlagContext);
    return !isEnabled;
  }

  private async getCachedResult(
    step: AIWorkflowStep,
    context: WorkflowContext,
  ): Promise<unknown | null> {
    if (!step.cache?.enabled) return null;

    const cacheKey = this.buildCacheKey(step, context);
    return this.redis.get(cacheKey);
  }

  private async cacheResult(
    step: AIWorkflowStep,
    context: WorkflowContext,
    result: unknown,
  ): Promise<void> {
    if (!step.cache?.enabled) return;

    const cacheKey = this.buildCacheKey(step, context);
    const ttl = step.cache.ttlSeconds || 300;
    await this.redis.set(cacheKey, result, ttl);
  }

  private buildCacheKey(step: AIWorkflowStep, context: WorkflowContext): string {
    const prefix = step.cache?.keyPrefix || this.CACHE_PREFIX;
    const userPart = context.userId || 'anonymous';
    return `${prefix}${step.id}:${userPart}:${context.workflowId}`;
  }

  private createStepResult(stepId: string, status: StepStatus): StepResult {
    return {
      stepId,
      status,
      startedAt: new Date(),
      completedAt: new Date(),
    };
  }

  private createSkippedResult(
    workflowId: string,
    executionId: string,
    startedAt: Date,
    reason: string,
  ): WorkflowResult {
    const completedAt = new Date();
    return {
      workflowId,
      executionId,
      status: 'cancelled',
      stepResults: [],
      startedAt,
      completedAt,
      duration: completedAt.getTime() - startedAt.getTime(),
      error: {
        code: 'WORKFLOW_SKIPPED',
        message: reason,
      },
    };
  }

  private createFailedResult(
    workflowId: string,
    executionId: string,
    startedAt: Date,
    error: Error,
  ): WorkflowResult {
    const completedAt = new Date();
    return {
      workflowId,
      executionId,
      status: 'failed',
      stepResults: [],
      startedAt,
      completedAt,
      duration: completedAt.getTime() - startedAt.getTime(),
      error: {
        code: 'WORKFLOW_ERROR',
        message: error.message,
        stack: error.stack,
      },
    };
  }

  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number,
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Workflow execution timed out')), timeoutMs),
      ),
    ]);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private registerBuiltInWorkflows(): void {
    // Shopping Assistant Workflow
    this.registerWorkflow({
      id: WORKFLOW_TEMPLATES.SHOPPING_ASSISTANT,
      name: 'Shopping Assistant',
      description: 'AI-powered shopping assistant combining search, personalization, and chat',
      version: '1.0.0',
      steps: [
        {
          id: 'analyze-intent',
          name: 'Analyze User Intent',
          service: 'chatbot',
          action: 'analyzeIntent',
          input: { fromContext: 'message' },
          onSuccess: 'get-recommendations',
        },
        {
          id: 'get-recommendations',
          name: 'Get Personalized Recommendations',
          service: 'personalization',
          action: 'getPersonalizedRecommendations',
          input: { fromContext: 'userId' },
          onSuccess: 'generate-response',
        },
        {
          id: 'generate-response',
          name: 'Generate Response',
          service: 'conversational',
          action: 'generateResponse',
          input: { fromStep: 'get-recommendations' },
        },
      ],
      timeout: 10000,
    });

    // Cart Recovery Workflow
    this.registerWorkflow({
      id: WORKFLOW_TEMPLATES.CART_RECOVERY,
      name: 'Cart Recovery',
      description: 'AI-powered abandoned cart recovery workflow',
      version: '1.0.0',
      steps: [
        {
          id: 'detect-abandonment',
          name: 'Detect Cart Abandonment',
          service: 'cartAbandonment',
          action: 'detectAbandonedCart',
          input: { fromContext: 'userId' },
          onSuccess: 'generate-incentive',
        },
        {
          id: 'generate-incentive',
          name: 'Generate Recovery Incentive',
          service: 'pricingEngine',
          action: 'generateRecoveryDiscount',
          input: { fromStep: 'detect-abandonment' },
          conditions: [
            { field: 'step.detect-abandonment.isAbandoned', operator: 'equals', value: true },
          ],
          onSuccess: 'personalize-message',
        },
        {
          id: 'personalize-message',
          name: 'Personalize Recovery Message',
          service: 'contentGeneration',
          action: 'generateRecoveryEmail',
          input: { fromStep: 'generate-incentive' },
        },
      ],
      triggers: [
        { type: 'featureFlag', config: { flagKey: 'ai-cart-recovery' } },
      ],
      timeout: 15000,
    });

    // Personalized Feed Workflow
    this.registerWorkflow({
      id: WORKFLOW_TEMPLATES.PERSONALIZED_FEED,
      name: 'Personalized Feed',
      description: 'Generate personalized product feed for user',
      version: '1.0.0',
      steps: [
        {
          id: 'get-user-profile',
          name: 'Get User Profile',
          service: 'personalization',
          action: 'getPersonalizedHomepage',
          input: { fromContext: 'userId' },
          cache: { enabled: true, ttlSeconds: 300 },
          onSuccess: 'get-trending',
        },
        {
          id: 'get-trending',
          name: 'Get Trending Products',
          service: 'smartSearch',
          action: 'getTrendingProducts',
          parallel: ['get-user-profile'],
          cache: { enabled: true, ttlSeconds: 600 },
          onSuccess: 'merge-results',
        },
        {
          id: 'merge-results',
          name: 'Merge and Rank Results',
          service: 'personalization',
          action: 'rankProducts',
          input: { fromStep: 'get-trending' },
        },
      ],
      timeout: 8000,
    });

    // Fraud Check Workflow
    this.registerWorkflow({
      id: WORKFLOW_TEMPLATES.FRAUD_CHECK,
      name: 'Fraud Check',
      description: 'Multi-layer fraud detection workflow',
      version: '1.0.0',
      steps: [
        {
          id: 'device-check',
          name: 'Device Fingerprint Check',
          service: 'fraudDetection',
          action: 'analyzeDevice',
          input: { fromContext: 'deviceInfo' },
          onSuccess: 'behavior-check',
          onFailure: 'high-risk-flag',
        },
        {
          id: 'behavior-check',
          name: 'Behavior Analysis',
          service: 'fraudDetection',
          action: 'analyzeBehavior',
          input: { fromContext: 'userId' },
          onSuccess: 'risk-score',
          onFailure: 'high-risk-flag',
        },
        {
          id: 'risk-score',
          name: 'Calculate Risk Score',
          service: 'fraudDetection',
          action: 'calculateRiskScore',
          input: { fromStep: 'behavior-check' },
        },
        {
          id: 'high-risk-flag',
          name: 'Flag High Risk',
          service: 'fraudDetection',
          action: 'flagHighRisk',
          input: { fromContext: 'userId' },
        },
      ],
      errorHandling: {
        defaultAction: 'fallback',
        notifyOnError: true,
      },
      timeout: 5000,
    });
  }
}
