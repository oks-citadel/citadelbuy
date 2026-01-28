# Automation Module

A comprehensive automation and workflow engine for Broxiva that provides rule-based automation and state machine workflow capabilities.

## Features

### Automation Rules Service

The `AutomationRulesService` provides a powerful rule engine with the following capabilities:

- **Event-based triggers**: React to system events in real-time
- **Scheduled triggers**: Execute rules on cron schedules
- **Complex condition evaluation**: Support for nested conditions with AND/OR operators
- **Multiple action types**: HTTP requests, emails, notifications, database operations, webhooks
- **Priority-based execution**: Rules execute in priority order
- **Detailed execution tracking**: Track rule executions with timing and results
- **Error handling**: Comprehensive error handling with retry logic for HTTP requests

#### Supported Condition Operators

- `equals`, `not_equals`
- `greater_than`, `greater_than_or_equal`, `less_than`, `less_than_or_equal`
- `contains`, `not_contains`, `starts_with`, `ends_with`
- `in`, `not_in`
- `is_null`, `is_not_null`
- `between` (for numeric ranges)
- `regex` (for pattern matching)

#### Built-in Action Handlers

1. **emit_event**: Emit custom events
2. **log**: Log messages at different levels
3. **http_request**: Make HTTP requests with retry logic
4. **send_email**: Send emails via event emission
5. **send_notification**: Send push notifications
6. **send_sms**: Send SMS messages
7. **create_record**: Create database records
8. **update_record**: Update database records
9. **webhook**: Send webhooks with custom payloads
10. **set_metadata**: Update rule execution context metadata
11. **delay**: Pause execution for specified duration

### Workflow Engine Service

The `WorkflowEngineService` provides a generic state machine for managing entity state transitions:

- **State management**: Define states and valid transitions
- **Guard functions**: Conditional checks before allowing transitions
- **Transition hooks**: Execute code before/after state changes
- **Event emission**: Automatic events on state changes
- **State history**: Complete audit trail of state transitions
- **Multiple from states**: Support transitions from multiple states

## Usage Examples

### Creating an Automation Rule

```typescript
import { AutomationRulesService } from './automation/automation-rules.service';

// Inject the service
constructor(private automationRules: AutomationRulesService) {}

// Create a rule
const rule = await this.automationRules.createRule({
  name: 'High-value order notification',
  description: 'Send notification when order exceeds $1000',
  enabled: true,
  priority: 10,
  trigger: {
    type: 'event',
    event: 'order.created',
  },
  conditions: {
    operator: 'AND',
    conditions: [
      { field: 'total', operator: 'greater_than', value: 1000 },
      { field: 'status', operator: 'equals', value: 'PENDING' }
    ]
  },
  actions: [
    {
      type: 'send_notification',
      params: {
        userId: '{{userId}}',
        title: 'High-Value Order',
        body: 'Order total: ${{total}}',
        category: 'ORDER'
      }
    },
    {
      type: 'webhook',
      params: {
        url: 'https://api.example.com/webhooks/high-value-order',
        method: 'POST'
      }
    }
  ]
});
```

### Creating a Scheduled Rule

```typescript
const scheduledRule = await this.automationRules.createRule({
  name: 'Daily inventory check',
  description: 'Check low stock items daily at 2 AM',
  enabled: true,
  priority: 5,
  trigger: {
    type: 'schedule',
    schedule: '0 2 * * *', // Cron expression: Daily at 2 AM
  },
  conditions: {
    operator: 'AND',
    conditions: []
  },
  actions: [
    {
      type: 'http_request',
      params: {
        url: 'https://api.example.com/inventory/check-low-stock',
        method: 'GET',
        retries: 3
      }
    }
  ]
});
```

### Defining a Workflow

```typescript
import { WorkflowEngineService } from './automation/workflow-engine.service';

// Inject the service
constructor(private workflowEngine: WorkflowEngineService) {}

// Define workflow
await this.workflowEngine.defineWorkflow({
  name: 'order-processing',
  entityType: 'order',
  initialState: 'PENDING',
  states: ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
  transitions: [
    {
      from: 'PENDING',
      to: 'PROCESSING',
      event: 'start_processing',
      guards: [
        async (ctx) => {
          // Check if order has payment
          return await this.hasPayment(ctx.entityId);
        }
      ],
      hooks: {
        before: [
          async (ctx) => {
            // Reserve inventory
            await this.inventoryService.reserve(ctx.entityId);
          }
        ],
        after: [
          async (ctx) => {
            // Send notification
            await this.notificationService.sendOrderProcessing(ctx.entityId);
          }
        ]
      }
    },
    {
      from: 'PROCESSING',
      to: 'SHIPPED',
      event: 'ship',
      hooks: {
        after: [
          async (ctx) => {
            await this.sendShippingNotification(ctx.entityId);
          }
        ]
      }
    }
  ]
});
```

### Using Workflows

```typescript
// Create workflow instance
await this.workflowEngine.createInstance(
  'order-processing',
  orderId,
  { userId, total },
  userId
);

// Execute transition
await this.workflowEngine.transition(
  'order-processing',
  orderId,
  'start_processing',
  { userId }
);

// Check if transition is allowed
const canShip = await this.workflowEngine.canTransition(
  'order-processing',
  orderId,
  'ship'
);

// Get available transitions
const availableActions = this.workflowEngine.getAvailableTransitions(
  'order-processing',
  orderId
);

// Get workflow history
const history = this.workflowEngine.getHistory(
  'order-processing',
  orderId
);
```

### Complex Condition Example

```typescript
// Nested conditions with OR logic
conditions: {
  operator: 'OR',
  conditions: [
    {
      operator: 'AND',
      conditions: [
        { field: 'total', operator: 'greater_than', value: 5000 },
        { field: 'customer.accountAge', operator: 'less_than', value: 7 }
      ]
    },
    {
      operator: 'AND',
      conditions: [
        { field: 'shippingCountry', operator: 'not_equals', value: 'billingCountry' },
        { field: 'total', operator: 'greater_than', value: 2000 }
      ]
    }
  ]
}
```

### Custom Action Handler

```typescript
// Register a custom action handler
this.automationRules.registerActionHandler('custom_action', async (params, context) => {
  // Your custom logic here
  const result = await this.myCustomService.doSomething(params);
  return { success: true, result };
});

// Use it in a rule
actions: [
  {
    type: 'custom_action',
    params: {
      customParam: 'value'
    }
  }
]
```

### Testing Rules

```typescript
// Test a rule against sample data
const testResult = await this.automationRules.testRule(ruleId, {
  total: 1500,
  status: 'PENDING',
  userId: 'user-123'
});

console.log('Matched:', testResult.matched);
console.log('Condition Results:', testResult.conditionResults);
```

### Managing Scheduled Rules

```typescript
// Get all scheduled rules
const scheduledRules = this.automationRules.getScheduledRules();

// Get schedule status
const status = this.automationRules.getScheduledJobStatus(ruleId);
console.log('Running:', status.running);
console.log('Next execution:', status.nextDate);

// Manually trigger a scheduled rule
await this.automationRules.triggerScheduledRule(ruleId);
```

## Events Emitted

### Automation Rules Events

- `automation.rule.created` - When a rule is created
- `automation.rule.updated` - When a rule is updated
- `automation.rule.deleted` - When a rule is deleted
- `automation.rule.executed` - When a rule is executed
- `automation.send_email` - When a rule triggers email sending
- `automation.send_notification` - When a rule triggers notification sending
- `automation.send_sms` - When a rule triggers SMS sending

### Workflow Events

- `workflow.defined` - When a workflow is defined
- `workflow.instance.created` - When a workflow instance is created
- `workflow.instance.reset` - When a workflow instance is reset
- `workflow.instance.deleted` - When a workflow instance is deleted
- `workflow.transition` - When a state transition occurs
- `workflow.{workflowName}.{stateName}` - When entering a specific state

## API Reference

### AutomationRulesService

#### Methods

- `createRule(definition)` - Create a new automation rule
- `updateRule(ruleId, updates)` - Update an existing rule
- `deleteRule(ruleId)` - Delete a rule
- `getRule(ruleId)` - Get a rule by ID
- `getAllRules(filters?)` - Get all rules with optional filters
- `enableRule(ruleId)` - Enable a rule
- `disableRule(ruleId)` - Disable a rule
- `executeRule(rule, payload, event?)` - Execute a specific rule
- `testRule(ruleId, samplePayload)` - Test a rule with sample data
- `registerActionHandler(type, handler)` - Register custom action handler
- `getScheduledRules()` - Get all scheduled rules
- `getScheduledJobStatus(ruleId)` - Get scheduled job status
- `triggerScheduledRule(ruleId)` - Manually trigger a scheduled rule
- `exportRules()` - Export all rules as JSON
- `importRules(rulesJson)` - Import rules from JSON

### WorkflowEngineService

#### Methods

- `defineWorkflow(definition)` - Define a new workflow
- `getWorkflow(workflowName)` - Get workflow definition
- `getAllWorkflows()` - Get all workflow definitions
- `createInstance(workflowName, entityId, initialData?, userId?)` - Create workflow instance
- `getInstance(workflowName, entityId)` - Get workflow instance
- `transition(workflowName, entityId, event, options?)` - Execute state transition
- `canTransition(workflowName, entityId, event)` - Check if transition is valid
- `getAvailableTransitions(workflowName, entityId)` - Get available transitions
- `getHistory(workflowName, entityId)` - Get state transition history
- `resetInstance(workflowName, entityId, userId?)` - Reset instance to initial state
- `deleteInstance(workflowName, entityId)` - Delete workflow instance
- `getWorkflowStats(workflowName)` - Get workflow statistics
- `exportWorkflow(workflowName)` - Export workflow as JSON

## Configuration

The automation module is configured in `automation.module.ts`:

```typescript
@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 20,
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
```

## Best Practices

1. **Rule Priority**: Use priority values to control execution order (higher = executes first)
2. **Error Handling**: Always handle errors in custom action handlers
3. **Guard Functions**: Keep guard functions simple and fast
4. **Hooks**: Use hooks for side effects, not for validation (use guards for that)
5. **Testing**: Test rules with sample data before enabling in production
6. **Scheduling**: Use cron expressions for scheduled rules (https://crontab.guru/)
7. **Monitoring**: Listen to execution events for monitoring and debugging

## Performance Considerations

- Rules execute asynchronously by default
- Failed actions don't stop other actions from executing
- HTTP requests have automatic retry logic with exponential backoff
- Scheduled jobs are managed by the NestJS scheduler
- All scheduled jobs are stopped on module destruction

## Security

- Validate webhook URLs before using them in rules
- Sanitize user input in rule conditions
- Use environment variables for sensitive configuration
- Limit the number of retries for HTTP requests
- Implement rate limiting for webhook actions

## Troubleshooting

### Rule not executing

1. Check if the rule is enabled
2. Verify the event name matches exactly
3. Test the rule conditions with sample data
4. Check logs for error messages

### Scheduled rule not running

1. Verify the cron expression is valid
2. Check if the rule is enabled
3. Use `getScheduledJobStatus()` to verify the job is registered
4. Check logs for scheduling errors

### Workflow transition fails

1. Verify the transition exists for the current state
2. Check if guard functions are passing
3. Ensure the workflow instance exists
4. Review hook execution errors in logs

## Examples

See `examples/order-automation.example.ts` for a complete working example of integrating workflows and automation rules.

## Contributing

When adding new action handlers:
1. Implement proper error handling
2. Add logging for debugging
3. Document parameters in code comments
4. Update this README with usage examples

## License

Internal use only - Broxiva Platform
