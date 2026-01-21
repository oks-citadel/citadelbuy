# Workflow 01: Order Processing & Fulfillment - Visual Diagram

## High-Level Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     Broxiva Order Created                            │
│                           (Webhook Event)                                │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    1. Webhook Receiver (n8n)                            │
│  • Receives POST request                                                │
│  • Captures raw body                                                    │
│  • Extracts headers                                                     │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                  2. HMAC-SHA256 Verification                            │
│  • Extract X-Broxiva-Signature header                                │
│  • Reconstruct payload                                                  │
│  • Calculate expected signature                                         │
│  • Timing-safe comparison                                               │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
                Valid?             Invalid
                    │                 │
                    ▼                 ▼
         ┌──────────────────┐   ┌─────────────────┐
         │ Continue         │   │ Return 401      │
         │ Processing       │   │ Unauthorized    │
         └────────┬─────────┘   └─────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     3. Data Validation                                   │
│  ✓ Required fields present                                              │
│  ✓ Customer email valid                                                 │
│  ✓ Shipping address complete                                            │
│  ✓ Line items not empty                                                 │
│  ✓ Total amount positive                                                │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
                Valid?             Invalid
                    │                 │
                    ▼                 ▼
         ┌──────────────────┐   ┌─────────────────┐
         │ Continue         │   │ Return 400      │
         │ Processing       │   │ Bad Request     │
         └────────┬─────────┘   └─────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                  4. Inventory Check (API Call)                          │
│  GET /v1/inventory/check?order_id={id}                                  │
│  • Verify stock availability                                            │
│  • Check reserved quantities                                            │
│  • Get estimated fulfillment time                                       │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        5. Order Routing Logic                           │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ IF total > $500         → Priority Queue + #priority-orders      │  │
│  │ IF tier = gold/platinum → VIP Queue + High Priority              │  │
│  │ IF country ≠ US         → International Queue + #international   │  │
│  │ IF shipping = express   → Expedited Queue + Urgent Priority      │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  Output: { queue, priority, channels[], SLA deadline }                  │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
           ┌─────────────────┴─────────────────┐
           │                                   │
           │      Parallel Execution           │
           │                                   │
    ┌──────▼──────┐                    ┌──────▼──────┐
    │   6. Notion │                    │ 7. SendGrid │
    │   Task      │                    │ Email       │
    │   Creation  │                    │ Confirm     │
    └──────┬──────┘                    └──────┬──────┘
           │                                   │
           └─────────────────┬─────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              8. Update Order Status (PATCH /orders/{id})                │
│  • status: "processing"                                                 │
│  • fulfillment_queue: assigned queue                                    │
│  • priority: calculated priority                                        │
│  • sla_deadline: calculated deadline                                    │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    9. Slack Notifications                                │
│                                                                          │
│  Primary: #fulfillment (all orders)                                     │
│  ├─ Order details                                                       │
│  ├─ Customer info                                                       │
│  ├─ Priority & SLA                                                      │
│  └─ Link to order                                                       │
│                                                                          │
│  Conditional Channels:                                                  │
│  ├─ #priority-orders (high-value/VIP)                                   │
│  └─ #international-fulfillment (non-US)                                 │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     10. Audit Log (POST /audit-log)                     │
│  • event_type: "order.processed"                                        │
│  • order_id, user_id                                                    │
│  • metadata: all actions taken                                          │
│  • timestamp, IP address                                                │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   11. Success Response (200 OK)                         │
│  {                                                                       │
│    "success": true,                                                     │
│    "order_id": "ORD-CB-12345",                                          │
│    "message": "Order processed successfully",                           │
│    "timestamp": "2024-01-15T10:30:00Z"                                  │
│  }                                                                       │
└─────────────────────────────────────────────────────────────────────────┘
```

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Any Node Failure                                │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       Error Handler Node                                │
│  • Capture error details                                                │
│  • Extract order information                                            │
│  • Log error with context                                               │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Slack Error Alert (#alerts)                          │
│  @channel notification with:                                            │
│  • Error type & message                                                 │
│  • Order ID & customer                                                  │
│  • Stack trace                                                          │
│  • Node that failed                                                     │
│  • Link to execution                                                    │
└─────────────────────────────────────────────────────────────────────────┘
```

## Routing Decision Tree

```
                        Order Received
                              │
                ┌─────────────┴─────────────┐
                │                           │
         Shipping = Express?          Total > $500?
                │                           │
             Yes│                        Yes│
                ▼                           ▼
         ┌─────────────┐             ┌─────────────┐
         │ Queue:      │             │ Queue:      │
         │ EXPEDITED   │             │ PRIORITY    │
         │ Priority:   │             │ Priority:   │
         │ URGENT      │             │ HIGH        │
         │ SLA: 4h     │             │ SLA: 12h    │
         └─────────────┘             └─────────────┘
                │                           │
                └─────────────┬─────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
             Tier = VIP?         Country ≠ US?
                    │                   │
                 Yes│                Yes│
                    ▼                   ▼
            ┌─────────────┐     ┌──────────────┐
            │ Queue: VIP  │     │ Add Channel: │
            │ Priority:   │     │ #intl-fulfill│
            │ HIGH        │     └──────────────┘
            │ SLA: 12h    │
            └─────────────┘
                    │
                    ▼
            ┌─────────────┐
            │ Default:    │
            │ Queue:      │
            │ STANDARD    │
            │ Priority:   │
            │ NORMAL      │
            │ SLA: 24h    │
            └─────────────┘
```

## Data Flow

```
┌──────────────┐
│   Webhook    │
│   Payload    │
└──────┬───────┘
       │
       │ {
       │   "event": "order.created",
       │   "data": {
       │     "order_id": "ORD-CB-12345",
       │     "customer": {...},
       │     "total": 118.72,
       │     ...
       │   }
       │ }
       ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   Verify     │ ---> │   Validate   │ ---> │   Enrich     │
│   Signature  │      │   Structure  │      │   with       │
│              │      │              │      │   Routing    │
└──────┬───────┘      └──────┬───────┘      └──────┬───────┘
       │                     │                     │
       │ validSignature      │ validation:         │ routing:
       │ = true              │ { isValid: true }   │ { queue, sla }
       ▼                     ▼                     ▼
┌────────────────────────────────────────────────────────────┐
│                    Enriched Order Data                     │
│  {                                                         │
│    ...original_data,                                       │
│    validation: { isValid: true, errors: [] },             │
│    routing: {                                              │
│      queue: "priority",                                    │
│      priority: "high",                                     │
│      slackChannels: ["#fulfillment", "#priority-orders"], │
│      slaDeadline: "2024-01-15T22:30:00Z"                  │
│    }                                                       │
│  }                                                         │
└────────────────────┬───────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│  Notion  │  │ SendGrid │  │  Slack   │
│  Task    │  │  Email   │  │  Alert   │
└──────────┘  └──────────┘  └──────────┘
```

## Integration Points

```
┌─────────────────────────────────────────────────────────────┐
│                      n8n Workflow                           │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │                    Webhook Trigger                    │ │
│  └──────────────────┬────────────────────────────────────┘ │
│                     │                                       │
│                     ▼                                       │
│  ┌───────────────────────────────────────────────────────┐ │
│  │              Processing Nodes                         │ │
│  │  • Verification                                       │ │
│  │  • Validation                                         │ │
│  │  • Routing                                            │ │
│  └──────┬──────────────┬──────────────┬─────────────────┘ │
│         │              │              │                    │
└─────────┼──────────────┼──────────────┼────────────────────┘
          │              │              │
          ▼              ▼              ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ Broxiva  │  │   Notion    │  │  SendGrid   │
│     API     │  │     API     │  │     API     │
│             │  │             │  │             │
│ /inventory  │  │ POST        │  │ POST        │
│ /orders     │  │ /pages      │  │ /mail/send  │
│ /audit-log  │  │             │  │             │
└─────────────┘  └─────────────┘  └─────────────┘
                                          │
                                          ▼
                                  ┌─────────────┐
                                  │   Slack     │
                                  │     API     │
                                  │             │
                                  │ POST        │
                                  │ /messages   │
                                  └─────────────┘
```

## Node Execution Timeline

```
Time (ms)  │  Node                         │  Action
───────────┼───────────────────────────────┼──────────────────────────
0          │  Webhook Trigger              │  Receive request
50         │  HMAC Verification            │  Validate signature
100        │  Data Validation              │  Check structure
150        │  ─ Decision: Valid?           │  Route to continue
200        │  Inventory Check (API)        │  GET request (500ms)
700        │  Order Routing                │  Calculate routing
750        │  ┬─ Notion Task Create        │  POST request (800ms)
750        │  ├─ SendGrid Email            │  POST request (600ms)
1550       │  ├─ Update Order Status       │  PATCH request (400ms)
1950       │  ├─ Slack Notification        │  POST request (300ms)
2250       │  └─ Audit Log                 │  POST request (200ms)
2450       │  Success Response             │  Return 200 OK
───────────┴───────────────────────────────┴──────────────────────────

Total Duration: ~2.5 seconds
Parallel Operations: Notion, SendGrid (saves ~800ms)
```

## Priority Matrix

```
              │  Express  │  Standard  │  International
──────────────┼───────────┼────────────┼────────────────
High Value    │  URGENT   │    HIGH    │     HIGH
(> $500)      │   4h SLA  │   12h SLA  │    12h SLA
              │           │            │
──────────────┼───────────┼────────────┼────────────────
VIP Tier      │  URGENT   │    HIGH    │     HIGH
(Gold/Plat)   │   4h SLA  │   12h SLA  │    12h SLA
              │           │            │
──────────────┼───────────┼────────────┼────────────────
Standard      │  URGENT   │   NORMAL   │    NORMAL
              │   4h SLA  │   24h SLA  │    24h SLA
──────────────┴───────────┴────────────┴────────────────

Legend:
URGENT  = Immediate attention, 4-hour SLA
HIGH    = Priority handling, 12-hour SLA
NORMAL  = Standard processing, 24-hour SLA
```

## Notification Channels

```
┌─────────────────────────────────────────────────────────┐
│                    All Orders                           │
│                  #fulfillment                           │
│  ✓ Order details                                        │
│  ✓ Customer info                                        │
│  ✓ Shipping address                                     │
│  ✓ Priority & SLA                                       │
└─────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ #priority-   │  │ #intl-       │  │ #alerts      │
│  orders      │  │  fulfillment │  │              │
│              │  │              │  │  (Errors     │
│ IF:          │  │ IF:          │  │   Only)      │
│ • Value>$500 │  │ • Country≠US │  │              │
│ • VIP tier   │  │              │  │ • Failures   │
│ • Express    │  │              │  │ • Timeouts   │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

**Last Updated**: 2024-12-03
**Version**: 1.0.0
