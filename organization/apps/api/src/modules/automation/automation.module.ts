import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { WorkflowEngineService } from './workflow-engine.service';
import { AutomationRulesService } from './automation-rules.service';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * Automation Module
 *
 * Provides workflow engine and automation rules capabilities:
 * - State machine workflow engine for managing entity state transitions
 * - Rule-based automation engine for event-driven actions
 * - Integration with the event system for reactive automation
 *
 * Services exported:
 * - WorkflowEngineService: Generic state machine for workflows
 * - AutomationRulesService: Rule engine for conditional automation
 *
 * Usage in other modules:
 * ```typescript
 * @Module({
 *   imports: [AutomationModule],
 *   // ... other configuration
 * })
 * export class OrdersModule {
 *   constructor(
 *     private workflowEngine: WorkflowEngineService,
 *     private automationRules: AutomationRulesService,
 *   ) {
 *     // Define order workflow
 *     this.workflowEngine.defineWorkflow({
 *       name: 'order-processing',
 *       entityType: 'order',
 *       initialState: 'PENDING',
 *       states: ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED'],
 *       transitions: [
 *         { from: 'PENDING', to: 'PROCESSING', event: 'process' },
 *         { from: 'PROCESSING', to: 'SHIPPED', event: 'ship' },
 *         { from: 'SHIPPED', to: 'DELIVERED', event: 'deliver' }
 *       ]
 *     });
 *
 *     // Create automation rule
 *     this.automationRules.createRule({
 *       name: 'High-value order alert',
 *       enabled: true,
 *       priority: 10,
 *       trigger: { type: 'event', event: 'order.created' },
 *       conditions: {
 *         operator: 'AND',
 *         conditions: [
 *           { field: 'total', operator: 'greater_than', value: 1000 }
 *         ]
 *       },
 *       actions: [
 *         { type: 'emit_event', params: { event: 'order.high_value' } }
 *       ]
 *     });
 *   }
 * }
 * ```
 */
@Module({
  imports: [
    EventEmitterModule.forRoot({
      // Use wildcards to allow dynamic event names
      wildcard: true,
      // Set the delimiter used to segment namespaces
      delimiter: '.',
      // Set this to true if you want to emit the newListener event
      newListener: false,
      // Set this to true if you want to emit the removeListener event
      removeListener: false,
      // The maximum amount of listeners that can be assigned to an event
      maxListeners: 20,
      // Show event name in memory leak message when more than maximum amount of listeners is assigned
      verboseMemoryLeak: true,
      // Disable throwing uncaughtException if an error event is emitted and it has no listeners
      ignoreErrors: false,
    }),
    ScheduleModule.forRoot(),
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
  ],
  providers: [
    PrismaService,
    WorkflowEngineService,
    AutomationRulesService,
  ],
  exports: [
    WorkflowEngineService,
    AutomationRulesService,
  ],
})
export class AutomationModule {}
