import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * State Transition Definition
 */
export interface StateTransition<TState = string> {
  from: TState | TState[];
  to: TState;
  event: string;
  guards?: GuardFunction<TState>[];
  hooks?: {
    before?: TransitionHook<TState>[];
    after?: TransitionHook<TState>[];
  };
  metadata?: Record<string, any>;
}

/**
 * Guard Function - Returns true if transition is allowed
 */
export type GuardFunction<TState = string> = (
  context: WorkflowContext<TState>,
) => boolean | Promise<boolean>;

/**
 * Transition Hook - Executed before/after state transition
 */
export type TransitionHook<TState = string> = (
  context: WorkflowContext<TState>,
) => void | Promise<void>;

/**
 * Workflow Context - Contains state and metadata for transitions
 */
export interface WorkflowContext<TState = string> {
  entityId: string;
  entityType: string;
  currentState: TState;
  targetState: TState;
  event: string;
  data?: Record<string, any>;
  userId?: string;
  timestamp: Date;
}

/**
 * Workflow Definition
 */
export interface WorkflowDefinition<TState = string> {
  name: string;
  entityType: string;
  initialState: TState;
  states: TState[];
  transitions: StateTransition<TState>[];
  metadata?: Record<string, any>;
}

/**
 * Workflow Instance - Represents a running workflow
 */
export interface WorkflowInstance<TState = string> {
  id: string;
  workflowName: string;
  entityId: string;
  entityType: string;
  currentState: TState;
  history: WorkflowHistoryEntry<TState>[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Workflow History Entry
 */
export interface WorkflowHistoryEntry<TState = string> {
  from: TState;
  to: TState;
  event: string;
  timestamp: Date;
  userId?: string;
  data?: Record<string, any>;
}

/**
 * Workflow Engine Service
 *
 * A generic state machine workflow engine that can:
 * - Define workflow states and transitions
 * - Validate state transitions
 * - Execute pre/post transition hooks
 * - Emit events on transitions
 * - Support guards (conditions for transitions)
 *
 * Usage:
 * ```typescript
 * // Define a workflow
 * const orderWorkflow = await workflowEngine.defineWorkflow({
 *   name: 'order-processing',
 *   entityType: 'order',
 *   initialState: 'PENDING',
 *   states: ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
 *   transitions: [
 *     {
 *       from: 'PENDING',
 *       to: 'PROCESSING',
 *       event: 'start_processing',
 *       guards: [async (ctx) => await hasPayment(ctx.entityId)],
 *       hooks: {
 *         before: [async (ctx) => await sendNotification(ctx)],
 *         after: [async (ctx) => await updateInventory(ctx)]
 *       }
 *     }
 *   ]
 * });
 *
 * // Execute a transition
 * await workflowEngine.transition('order-processing', 'order-123', 'start_processing', {
 *   userId: 'user-456',
 *   data: { notes: 'Rush order' }
 * });
 * ```
 */
@Injectable()
export class WorkflowEngineService {
  private readonly logger = new Logger(WorkflowEngineService.name);
  private workflows: Map<string, WorkflowDefinition<string>> = new Map();
  private instances: Map<string, WorkflowInstance<string>> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.logger.log('Workflow Engine initialized');
  }

  /**
   * Define a new workflow
   */
  async defineWorkflow<TState extends string = string>(
    definition: WorkflowDefinition<TState>,
  ): Promise<WorkflowDefinition<TState>> {
    // Validate workflow definition
    this.validateWorkflowDefinition(definition as WorkflowDefinition<string>);

    // Store workflow definition
    this.workflows.set(definition.name, definition as unknown as WorkflowDefinition<string>);

    this.logger.log(`Workflow '${definition.name}' defined with ${definition.states.length} states`);

    // Emit workflow defined event
    this.eventEmitter.emit('workflow.defined', {
      workflow: definition,
      timestamp: new Date(),
    });

    return definition;
  }

  /**
   * Get workflow definition
   */
  getWorkflow(workflowName: string): WorkflowDefinition | null {
    return this.workflows.get(workflowName) || null;
  }

  /**
   * Get all workflows
   */
  getAllWorkflows(): WorkflowDefinition[] {
    return Array.from(this.workflows.values());
  }

  /**
   * Create a new workflow instance
   */
  async createInstance<TState = string>(
    workflowName: string,
    entityId: string,
    initialData?: Record<string, any>,
    userId?: string,
  ): Promise<WorkflowInstance<TState>> {
    const workflow = this.workflows.get(workflowName);
    if (!workflow) {
      throw new BadRequestException(`Workflow '${workflowName}' not found`);
    }

    const instanceKey = `${workflowName}:${entityId}`;
    const existingInstance = this.instances.get(instanceKey);

    if (existingInstance) {
      this.logger.warn(`Workflow instance already exists for ${instanceKey}`);
      return existingInstance as WorkflowInstance<TState>;
    }

    const instance: WorkflowInstance<TState> = {
      id: instanceKey,
      workflowName,
      entityId,
      entityType: workflow.entityType,
      currentState: workflow.initialState as TState,
      history: [
        {
          from: null as any,
          to: workflow.initialState as TState,
          event: 'init',
          timestamp: new Date(),
          userId,
          data: initialData,
        },
      ],
      metadata: initialData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.instances.set(instanceKey, instance as WorkflowInstance);

    this.logger.log(`Workflow instance created: ${instanceKey} in state ${workflow.initialState}`);

    // Emit instance created event
    this.eventEmitter.emit('workflow.instance.created', {
      instance,
      timestamp: new Date(),
    });

    return instance;
  }

  /**
   * Get workflow instance
   */
  getInstance<TState = string>(
    workflowName: string,
    entityId: string,
  ): WorkflowInstance<TState> | null {
    const instanceKey = `${workflowName}:${entityId}`;
    const instance = this.instances.get(instanceKey);
    return instance ? (instance as WorkflowInstance<TState>) : null;
  }

  /**
   * Execute a state transition
   */
  async transition<TState = string>(
    workflowName: string,
    entityId: string,
    event: string,
    options?: {
      userId?: string;
      data?: Record<string, any>;
      force?: boolean;
    },
  ): Promise<WorkflowInstance<TState>> {
    const workflow = this.workflows.get(workflowName);
    if (!workflow) {
      throw new BadRequestException(`Workflow '${workflowName}' not found`);
    }

    const instanceKey = `${workflowName}:${entityId}`;
    let instance = this.instances.get(instanceKey);

    // Auto-create instance if it doesn't exist
    if (!instance) {
      instance = await this.createInstance(workflowName, entityId, options?.data, options?.userId);
    }

    const currentState = instance.currentState as TState;

    // Find applicable transition
    const transition = this.findTransition(workflow, currentState, event);
    if (!transition) {
      throw new BadRequestException(
        `No transition found for event '${event}' from state '${currentState}'`,
      );
    }

    // Create context
    const context: WorkflowContext<TState> = {
      entityId,
      entityType: workflow.entityType,
      currentState,
      targetState: transition.to as TState,
      event,
      data: options?.data,
      userId: options?.userId,
      timestamp: new Date(),
    };

    // Execute guards unless force flag is set
    if (!options?.force) {
      const guardsPass = await this.executeGuards(transition, context);
      if (!guardsPass) {
        throw new BadRequestException(
          `Transition guards failed for event '${event}' from state '${currentState}' to '${transition.to}'`,
        );
      }
    }

    // Execute before hooks
    await this.executeHooks(transition.hooks?.before, context as WorkflowContext<string>, 'before');

    // Update state
    const previousState = instance.currentState;
    (instance as WorkflowInstance<string>).currentState = transition.to;
    instance.updatedAt = new Date();
    (instance.history as WorkflowHistoryEntry<string>[]).push({
      from: previousState as string,
      to: transition.to as string,
      event,
      timestamp: new Date(),
      userId: options?.userId,
      data: options?.data,
    });

    // Merge metadata if provided
    if (options?.data) {
      instance.metadata = {
        ...instance.metadata,
        ...options.data,
      };
    }

    this.logger.log(
      `Transition executed: ${workflowName}:${entityId} | ${previousState} -> ${transition.to} (${event})`,
    );

    // Emit transition event
    this.eventEmitter.emit('workflow.transition', {
      instance,
      transition: {
        from: previousState,
        to: transition.to,
        event,
      },
      context,
      timestamp: new Date(),
    });

    // Execute after hooks
    await this.executeHooks(transition.hooks?.after, context as WorkflowContext<string>, 'after');

    // Emit state-specific events
    this.eventEmitter.emit(`workflow.${workflowName}.${transition.to}`, {
      instance,
      context,
      timestamp: new Date(),
    });

    return instance as WorkflowInstance<TState>;
  }

  /**
   * Check if a transition is valid
   */
  async canTransition<TState = string>(
    workflowName: string,
    entityId: string,
    event: string,
  ): Promise<boolean> {
    const workflow = this.workflows.get(workflowName);
    if (!workflow) {
      return false;
    }

    const instance = this.getInstance<TState>(workflowName, entityId);
    if (!instance) {
      return false;
    }

    const transition = this.findTransition(workflow, instance.currentState, event);
    if (!transition) {
      return false;
    }

    const context: WorkflowContext<TState> = {
      entityId,
      entityType: workflow.entityType,
      currentState: instance.currentState,
      targetState: transition.to as TState,
      event,
      timestamp: new Date(),
    };

    return await this.executeGuards(transition, context);
  }

  /**
   * Get available transitions for current state
   */
  getAvailableTransitions<TState = string>(
    workflowName: string,
    entityId: string,
  ): StateTransition<TState>[] {
    const workflow = this.workflows.get(workflowName);
    if (!workflow) {
      return [];
    }

    const instance = this.getInstance<TState>(workflowName, entityId);
    if (!instance) {
      return [];
    }

    return workflow.transitions.filter((transition) => {
      const fromStates = Array.isArray(transition.from) ? transition.from : [transition.from];
      return fromStates.includes(instance.currentState as any);
    }) as StateTransition<TState>[];
  }

  /**
   * Get workflow instance history
   */
  getHistory<TState = string>(
    workflowName: string,
    entityId: string,
  ): WorkflowHistoryEntry<TState>[] {
    const instance = this.getInstance<TState>(workflowName, entityId);
    return instance?.history || [];
  }

  /**
   * Reset workflow instance to initial state
   */
  async resetInstance<TState = string>(
    workflowName: string,
    entityId: string,
    userId?: string,
  ): Promise<WorkflowInstance<TState>> {
    const workflow = this.workflows.get(workflowName);
    if (!workflow) {
      throw new BadRequestException(`Workflow '${workflowName}' not found`);
    }

    const instanceKey = `${workflowName}:${entityId}`;
    const instance = this.instances.get(instanceKey);

    if (!instance) {
      throw new BadRequestException(`Workflow instance not found: ${instanceKey}`);
    }

    const previousState = instance.currentState;
    (instance as WorkflowInstance<string>).currentState = workflow.initialState;
    instance.updatedAt = new Date();
    (instance.history as WorkflowHistoryEntry<string>[]).push({
      from: previousState as string,
      to: workflow.initialState as string,
      event: 'reset',
      timestamp: new Date(),
      userId,
    });

    this.logger.log(`Workflow instance reset: ${instanceKey} -> ${workflow.initialState}`);

    // Emit reset event
    this.eventEmitter.emit('workflow.instance.reset', {
      instance,
      timestamp: new Date(),
    });

    return instance as WorkflowInstance<TState>;
  }

  /**
   * Delete workflow instance
   */
  async deleteInstance(workflowName: string, entityId: string): Promise<void> {
    const instanceKey = `${workflowName}:${entityId}`;
    const deleted = this.instances.delete(instanceKey);

    if (deleted) {
      this.logger.log(`Workflow instance deleted: ${instanceKey}`);
      this.eventEmitter.emit('workflow.instance.deleted', {
        workflowName,
        entityId,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Private helper methods
   */

  private validateWorkflowDefinition(definition: WorkflowDefinition): void {
    if (!definition.name) {
      throw new BadRequestException('Workflow name is required');
    }

    if (!definition.entityType) {
      throw new BadRequestException('Entity type is required');
    }

    if (!definition.initialState) {
      throw new BadRequestException('Initial state is required');
    }

    if (!definition.states || definition.states.length === 0) {
      throw new BadRequestException('At least one state is required');
    }

    if (!definition.states.includes(definition.initialState as any)) {
      throw new BadRequestException('Initial state must be in states list');
    }

    // Validate transitions
    for (const transition of definition.transitions) {
      const fromStates = Array.isArray(transition.from) ? transition.from : [transition.from];

      for (const fromState of fromStates) {
        if (!definition.states.includes(fromState as any)) {
          throw new BadRequestException(`Invalid from state in transition: ${fromState}`);
        }
      }

      if (!definition.states.includes(transition.to as any)) {
        throw new BadRequestException(`Invalid to state in transition: ${transition.to}`);
      }
    }
  }

  private findTransition<TState = string>(
    workflow: WorkflowDefinition,
    currentState: TState,
    event: string,
  ): StateTransition | null {
    return workflow.transitions.find((transition) => {
      const fromStates = Array.isArray(transition.from) ? transition.from : [transition.from];
      return fromStates.includes(currentState as any) && transition.event === event;
    }) || null;
  }

  private async executeGuards<TState = string>(
    transition: StateTransition,
    context: WorkflowContext<TState>,
  ): Promise<boolean> {
    if (!transition.guards || transition.guards.length === 0) {
      return true;
    }

    try {
      for (const guard of transition.guards) {
        const result = await guard(context as any);
        if (!result) {
          this.logger.debug(
            `Guard failed for transition ${context.currentState} -> ${context.targetState}`,
          );
          return false;
        }
      }
      return true;
    } catch (error) {
      this.logger.error('Guard execution error:', error);
      return false;
    }
  }

  private async executeHooks<TState = string>(
    hooks: TransitionHook<TState>[] | undefined,
    context: WorkflowContext<TState>,
    phase: 'before' | 'after',
  ): Promise<void> {
    if (!hooks || hooks.length === 0) {
      return;
    }

    try {
      for (const hook of hooks) {
        await hook(context);
      }
    } catch (error) {
      this.logger.error(`Hook execution error (${phase}):`, error);
      throw error;
    }
  }

  /**
   * Get workflow statistics
   */
  getWorkflowStats(workflowName: string): {
    totalInstances: number;
    stateDistribution: Record<string, number>;
  } | null {
    const workflow = this.workflows.get(workflowName);
    if (!workflow) {
      return null;
    }

    const instances = Array.from(this.instances.values()).filter(
      (instance) => instance.workflowName === workflowName,
    );

    const stateDistribution: Record<string, number> = {};
    for (const instance of instances) {
      const state = String(instance.currentState);
      stateDistribution[state] = (stateDistribution[state] || 0) + 1;
    }

    return {
      totalInstances: instances.length,
      stateDistribution,
    };
  }

  /**
   * Export workflow definition as JSON
   */
  exportWorkflow(workflowName: string): string | null {
    const workflow = this.workflows.get(workflowName);
    if (!workflow) {
      return null;
    }

    // Create a serializable version (without function references)
    const exportable = {
      ...workflow,
      transitions: workflow.transitions.map((t) => ({
        from: t.from,
        to: t.to,
        event: t.event,
        metadata: t.metadata,
        hasGuards: !!(t.guards && t.guards.length > 0),
        hasBeforeHooks: !!(t.hooks?.before && t.hooks.before.length > 0),
        hasAfterHooks: !!(t.hooks?.after && t.hooks.after.length > 0),
      })),
    };

    return JSON.stringify(exportable, null, 2);
  }
}
