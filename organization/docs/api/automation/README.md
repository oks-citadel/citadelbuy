# Automation Module

A comprehensive workflow engine and automation rules system for the Broxiva platform.

## Features

### Workflow Engine
- **State Machine**: Define and manage entity state transitions
- **Validation**: Automatic validation of state transitions
- **Guards**: Conditional logic for transitions (must pass before transition)
- **Hooks**: Pre/post transition callbacks
- **Events**: Automatic event emission on state changes
- **History**: Complete audit trail of state transitions

### Automation Rules
- **Event Triggers**: React to system events automatically
- **Condition Evaluation**: Complex conditional logic with AND/OR operators
- **Action Execution**: Execute multiple actions when rules match
- **Prioritization**: Rules execute in priority order
- **Extensibility**: Register custom action handlers

## Installation

Import the `AutomationModule` in your module:

```typescript
import { Module } from '@nestjs/common';
import { AutomationModule } from '../automation';

@Module({
  imports: [AutomationModule],
  // ...
})
export class YourModule {}
```

## Workflow Engine

### Defining a Workflow

```typescript
import { WorkflowEngineService } from '@modules/automation';

// In your service constructor or onModuleInit
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
          // Check if payment is completed
          const order = await this.ordersService.findById(ctx.entityId);
          return order.paymentStatus === 'PAID';
        }
      ],
      hooks: {
        before: [
          async (ctx) => {
            console.log(`Starting to process order ${ctx.entityId}`);
            // Send notification
            await this.notificationService.send({
              type: 'order_processing_started',
              orderId: ctx.entityId
            });
          }
        ],
        after: [
          async (ctx) => {
            // Update inventory
            await this.inventoryService.reserve(ctx.entityId);
          }
        ]
      }
    },
    {
      from: 'PROCESSING',
      to: 'SHIPPED',
      event: 'ship',
      guards: [
        async (ctx) => {
          // Ensure items are in stock
          return await this.inventoryService.hasStock(ctx.entityId);
        }
      ],
      hooks: {
        after: [
          async (ctx) => {
            // Generate tracking number
            await this.shippingService.createShipment(ctx.entityId);
          }
        ]
      }
    },
    {
      from: 'SHIPPED',
      to: 'DELIVERED',
      event: 'deliver',
      hooks: {
        after: [
          async (ctx) => {
            // Send delivery confirmation
            await this.emailService.sendDeliveryConfirmation(ctx.entityId);
          }
        ]
      }
    },
    {
      from: ['PENDING', 'PROCESSING'],
      to: 'CANCELLED',
      event: 'cancel',
      hooks: {
        after: [
          async (ctx) => {
            // Release inventory and refund
            await this.inventoryService.release(ctx.entityId);
            await this.paymentService.refund(ctx.entityId);
          }
        ]
      }
    }
  ]
});
```

### Creating a Workflow Instance

```typescript
// Create instance when order is created
const instance = await this.workflowEngine.createInstance(
  'order-processing',
  order.id,
  { customerId: order.userId, priority: 'high' },
  userId
);
```

### Executing Transitions

```typescript
// Transition to next state
await this.workflowEngine.transition(
  'order-processing',
  orderId,
  'start_processing',
  {
    userId: 'user-123',
    data: { notes: 'Rush order' }
  }
);

// Force transition (skip guards)
await this.workflowEngine.transition(
  'order-processing',
  orderId,
  'ship',
  {
    userId: 'admin-456',
    force: true
  }
);
```

### Checking Available Transitions

```typescript
// Get available transitions for current state
const transitions = this.workflowEngine.getAvailableTransitions(
  'order-processing',
  orderId
);

// Check if specific transition is allowed
const canShip = await this.workflowEngine.canTransition(
  'order-processing',
  orderId,
  'ship'
);
```

### Workflow History

```typescript
// Get complete state transition history
const history = this.workflowEngine.getHistory('order-processing', orderId);

// History entries include:
// - from: previous state
// - to: new state
// - event: event that triggered transition
// - timestamp: when transition occurred
// - userId: who triggered it
// - data: additional data passed
```

## Automation Rules

### Creating Rules

```typescript
import { AutomationRulesService } from '@modules/automation';

// High-value order notification
await this.automationRules.createRule({
  name: 'High-value order notification',
  description: 'Send notification when order total exceeds $1000',
  enabled: true,
  priority: 10,
  trigger: {
    type: 'event',
    event: 'order.created'
  },
  conditions: {
    operator: 'AND',
    conditions: [
      { field: 'order.total', operator: 'greater_than', value: 1000 },
      { field: 'order.status', operator: 'equals', value: 'PENDING' }
    ]
  },
  actions: [
    {
      type: 'emit_event',
      params: {
        event: 'order.high_value',
        payload: { priority: 'high' }
      }
    },
    {
      type: 'log',
      params: {
        level: 'info',
        message: 'High-value order detected',
        data: { orderId: '{{order.id}}', total: '{{order.total}}' }
      }
    }
  ],
  metadata: {
    department: 'sales',
    category: 'notifications'
  }
});
```

### Condition Operators

Available operators:
- `equals`: Exact match
- `not_equals`: Not equal to
- `greater_than`: Numeric comparison
- `greater_than_or_equal`: Numeric comparison
- `less_than`: Numeric comparison
- `less_than_or_equal`: Numeric comparison
- `contains`: String contains substring
- `not_contains`: String doesn't contain substring
- `starts_with`: String starts with
- `ends_with`: String ends with
- `in`: Value in array
- `not_in`: Value not in array
- `is_null`: Value is null/undefined
- `is_not_null`: Value exists
- `between`: Numeric value in range [min, max]
- `regex`: Regular expression match

### Nested Conditions

```typescript
conditions: {
  operator: 'OR',
  conditions: [
    {
      operator: 'AND',
      conditions: [
        { field: 'order.total', operator: 'greater_than', value: 1000 },
        { field: 'customer.tier', operator: 'equals', value: 'VIP' }
      ]
    },
    {
      operator: 'AND',
      conditions: [
        { field: 'order.total', operator: 'greater_than', value: 5000 },
        { field: 'customer.tier', operator: 'in', value: ['PREMIUM', 'VIP'] }
      ]
    }
  ]
}
```

### Built-in Action Types

1. **emit_event**: Emit a custom event
```typescript
{
  type: 'emit_event',
  params: {
    event: 'custom.event.name',
    payload: { key: 'value' }
  }
}
```

2. **log**: Write to application logs
```typescript
{
  type: 'log',
  params: {
    level: 'info', // debug, info, warn, error
    message: 'Something happened',
    data: { additional: 'context' }
  }
}
```

3. **http_request**: Make HTTP request (planned)
```typescript
{
  type: 'http_request',
  params: {
    method: 'POST',
    url: 'https://api.example.com/webhook',
    headers: { 'Authorization': 'Bearer token' },
    body: { event: 'order.created' }
  }
}
```

4. **set_metadata**: Update context metadata
```typescript
{
  type: 'set_metadata',
  params: {
    metadata: { processed: true, timestamp: new Date() }
  }
}
```

5. **delay**: Wait before next action
```typescript
{
  type: 'delay',
  params: {
    duration: 5000 // milliseconds
  }
}
```

### Custom Action Handlers

Register your own action types:

```typescript
this.automationRules.registerActionHandler(
  'send_email',
  async (params, context) => {
    await this.emailService.send({
      to: params.recipient,
      template: params.template,
      data: context.payload
    });
    return { sent: true, timestamp: new Date() };
  }
);

// Now you can use it in rules:
{
  type: 'send_email',
  params: {
    recipient: 'admin@example.com',
    template: 'high-value-order'
  }
}
```

### Testing Rules

```typescript
// Test a rule against sample data
const result = await this.automationRules.testRule(
  ruleId,
  {
    order: {
      id: 'test-123',
      total: 1500,
      status: 'PENDING'
    }
  }
);

console.log(result.matched); // true/false
```

### Managing Rules

```typescript
// Get all rules
const allRules = this.automationRules.getAllRules();

// Get enabled rules for specific event
const orderRules = this.automationRules.getAllRules({
  enabled: true,
  trigger: 'order.created'
});

// Enable/disable rules
await this.automationRules.enableRule(ruleId);
await this.automationRules.disableRule(ruleId);

// Update rule
await this.automationRules.updateRule(ruleId, {
  priority: 20,
  enabled: false
});

// Delete rule
await this.automationRules.deleteRule(ruleId);
```

## Events

The automation module emits the following events:

### Workflow Events
- `workflow.defined`: When a workflow is defined
- `workflow.instance.created`: When a workflow instance is created
- `workflow.transition`: When a state transition occurs
- `workflow.instance.reset`: When an instance is reset
- `workflow.instance.deleted`: When an instance is deleted
- `workflow.{workflowName}.{state}`: When entering a specific state

### Rule Events
- `automation.rule.created`: When a rule is created
- `automation.rule.updated`: When a rule is updated
- `automation.rule.deleted`: When a rule is deleted
- `automation.rule.executed`: When a rule is executed

### Listening to Events

```typescript
import { OnEvent } from '@nestjs/event-emitter';

@OnEvent('workflow.transition')
async handleWorkflowTransition(payload: any) {
  console.log('Workflow transitioned:', payload);
}

@OnEvent('workflow.order-processing.SHIPPED')
async handleOrderShipped(payload: any) {
  // Order entered SHIPPED state
  await this.sendShippingNotification(payload.instance.entityId);
}

@OnEvent('automation.rule.executed')
async handleRuleExecution(payload: any) {
  console.log('Rule executed:', payload.result);
}
```

## Examples

### Example 1: Return/Refund Workflow

```typescript
await this.workflowEngine.defineWorkflow({
  name: 'return-processing',
  entityType: 'return',
  initialState: 'REQUESTED',
  states: ['REQUESTED', 'APPROVED', 'REJECTED', 'RECEIVED', 'REFUNDED'],
  transitions: [
    {
      from: 'REQUESTED',
      to: 'APPROVED',
      event: 'approve',
      guards: [
        async (ctx) => {
          // Check if return window is valid
          const returnRequest = await this.returnsService.findById(ctx.entityId);
          const daysSincePurchase = daysBetween(returnRequest.orderDate, new Date());
          return daysSincePurchase <= 30;
        }
      ]
    },
    {
      from: 'REQUESTED',
      to: 'REJECTED',
      event: 'reject'
    },
    {
      from: 'APPROVED',
      to: 'RECEIVED',
      event: 'receive_item',
      hooks: {
        after: [
          async (ctx) => {
            // Inspect item quality
            await this.qualityService.inspect(ctx.entityId);
          }
        ]
      }
    },
    {
      from: 'RECEIVED',
      to: 'REFUNDED',
      event: 'refund',
      hooks: {
        before: [
          async (ctx) => {
            // Process refund
            await this.paymentService.processRefund(ctx.entityId);
          }
        ],
        after: [
          async (ctx) => {
            // Update inventory
            await this.inventoryService.addStock(ctx.entityId);
          }
        ]
      }
    }
  ]
});
```

### Example 2: Abandoned Cart Recovery

```typescript
await this.automationRules.createRule({
  name: 'Abandoned cart recovery',
  enabled: true,
  priority: 5,
  trigger: {
    type: 'event',
    event: 'cart.abandoned'
  },
  conditions: {
    operator: 'AND',
    conditions: [
      { field: 'cart.items.length', operator: 'greater_than', value: 0 },
      { field: 'cart.total', operator: 'greater_than', value: 50 },
      { field: 'user.email', operator: 'is_not_null', value: null }
    ]
  },
  actions: [
    {
      type: 'delay',
      params: { duration: 3600000 } // Wait 1 hour
    },
    {
      type: 'send_email',
      params: {
        template: 'abandoned-cart',
        recipient: '{{user.email}}'
      }
    },
    {
      type: 'log',
      params: {
        level: 'info',
        message: 'Abandoned cart recovery email sent'
      }
    }
  ]
});
```

### Example 3: Low Stock Alert

```typescript
await this.automationRules.createRule({
  name: 'Low stock alert',
  enabled: true,
  priority: 15,
  trigger: {
    type: 'event',
    event: 'inventory.updated'
  },
  conditions: {
    operator: 'AND',
    conditions: [
      { field: 'quantity', operator: 'less_than_or_equal', value: 10 },
      { field: 'quantity', operator: 'greater_than', value: 0 }
    ]
  },
  actions: [
    {
      type: 'emit_event',
      params: {
        event: 'inventory.low_stock',
        payload: { productId: '{{productId}}', quantity: '{{quantity}}' }
      }
    },
    {
      type: 'send_email',
      params: {
        recipient: 'inventory@example.com',
        template: 'low-stock-alert'
      }
    }
  ]
});
```

## Best Practices

1. **Workflow Design**
   - Keep states simple and clear
   - Use descriptive event names
   - Implement guards for validation
   - Use hooks for side effects
   - Emit events for auditability

2. **Rule Design**
   - Use descriptive rule names
   - Set appropriate priorities
   - Test conditions thoroughly
   - Keep actions focused
   - Use metadata for organization

3. **Performance**
   - Avoid heavy operations in guards
   - Use async actions when possible
   - Be mindful of rule priorities
   - Monitor event emission frequency

4. **Error Handling**
   - Guards should fail gracefully
   - Hooks should handle errors
   - Actions should be idempotent
   - Log failures for debugging

## API Reference

See the service files for complete API documentation:
- [WorkflowEngineService](./workflow-engine.service.ts)
- [AutomationRulesService](./automation-rules.service.ts)
- [DTOs](./dto/create-workflow.dto.ts)
