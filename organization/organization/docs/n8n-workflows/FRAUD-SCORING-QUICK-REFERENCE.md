# Fraud Detection - Risk Scoring Quick Reference

## Risk Level Matrix

| Level | Score | Color | Action | SLA |
|-------|-------|-------|--------|-----|
| LOW | 0-30 | 🟢 Green | Auto-approve | Immediate |
| MEDIUM | 31-60 | 🟡 Yellow | Hold for review | 24 hours |
| HIGH | 61-85 | 🟠 Orange | Manual review | 4 hours |
| CRITICAL | 86-100 | 🔴 Red | Auto-cancel + Block | Immediate |

## Risk Factors Cheat Sheet

| Risk Factor | Points | Trigger Condition |
|-------------|--------|-------------------|
| **Customer Profile** |
| New Customer (First Order) | +15 | `totalOrders === 0` |
| Free Email Domain | +5 | gmail, yahoo, hotmail, etc. |
| Disposable Email | +30 | tempmail, mailinator, etc. |
| Multiple Failed Payments | +10 each | Max +30 total |
| **Order Characteristics** |
| High Value Order | +5 to +25 | >$500 (scaled) |
| Order Velocity | +25 | >2 orders in 24h |
| Express Shipping (First Order) | +10 | First order + express |
| **Geographic Signals** |
| Address Mismatch | +20 | Billing ≠ Shipping |
| IP/Shipping Country Mismatch | +15 | IP country ≠ Ship country |
| High-Risk Shipping Country | +20 | See country list below |
| **Payment Signals** |
| Stripe Radar: Elevated | +15 | Stripe ML detection |
| Stripe Radar: Highest | +30 | Stripe ML detection |
| Stripe Risk Score >75 | Variable | `(score - 75) / 5` |

## High-Risk Countries

### West Africa
```
NG - Nigeria          (+20)
GH - Ghana           (+20)
CI - Ivory Coast     (+20)
CM - Cameroon        (+20)
BJ - Benin           (+20)
```

### Asia
```
ID - Indonesia       (+20)
PK - Pakistan        (+20)
BD - Bangladesh      (+20)
VN - Vietnam         (+20)
```

### Eastern Europe
```
RU - Russia          (+20)
UA - Ukraine         (+20)
BY - Belarus         (+20)
MD - Moldova         (+20)
```

### South America
```
VE - Venezuela       (+20)
CO - Colombia        (+20)
BO - Bolivia         (+20)
```

### North Africa
```
EG - Egypt           (+20)
MA - Morocco         (+20)
DZ - Algeria         (+20)
```

## Disposable Email Domains (Partial List)

```
mailinator.com       (+30)
tempmail.com         (+30)
guerrillamail.com    (+30)
10minutemail.com     (+30)
throwaway.email      (+30)
temp-mail.org        (+30)
sharklasers.com      (+30)
yopmail.com          (+30)
maildrop.cc          (+30)
getnada.com          (+30)
trashmail.com        (+30)
fakeinbox.com        (+30)
```

## Free Email Domains

```
gmail.com            (+5)
yahoo.com            (+5)
hotmail.com          (+5)
outlook.com          (+5)
aol.com              (+5)
icloud.com           (+5)
mail.com             (+5)
protonmail.com       (+5)
```

## Scoring Examples

### Example 1: Low Risk (Score: 15)
```
✅ Existing customer with 10+ orders
✅ Corporate email (@company.com)
✅ Matching addresses (US → US)
✅ Order value: $149.99
✅ Standard shipping
✅ Normal order velocity
✅ Stripe Radar: Normal

Risk Factors:
• None

Total: 0 points → LOW RISK
Action: Auto-approve
```

### Example 2: Medium Risk (Score: 50)
```
⚠️ New customer (first order)          +15
⚠️ Free email (gmail.com)               +5
⚠️ High value order ($749.99)          +10
⚠️ Address mismatch (US → Canada)      +20
✅ IP matches shipping country
✅ Standard shipping
✅ Stripe Radar: Normal

Risk Factors: 4
Total: 50 points → MEDIUM RISK
Action: Hold for review
Notification: Slack #fraud-review
```

### Example 3: High Risk (Score: 75)
```
🔶 New customer (first order)          +15
🔶 Free email (yahoo.com)               +5
🔶 High value order ($1,299.99)        +25
🔶 Address mismatch                    +20
🔶 IP/Ship country mismatch            +15
🔶 Express shipping (first order)      +10
✅ Not high-risk country
✅ Stripe Radar: Normal

Risk Factors: 6
Total: 75 points → HIGH RISK
Action: Manual review required
Notification: Slack urgent + Zendesk ticket
SLA: 4 hours
```

### Example 4: Critical Risk (Score: 115 → capped at 100)
```
🚫 New customer (first order)          +15
🚫 Disposable email (tempmail.com)     +30
🚫 High value order ($2,499.99)        +25
🚫 Address mismatch                    +20
🚫 High-risk country (Nigeria)         +20
🚫 IP/Ship country mismatch            +15
🚫 Express shipping (first order)      +10
🚫 Order velocity (3 orders/24h)       +25
🚫 Stripe Radar: Highest               +30
🚫 2 failed payment attempts           +20

Risk Factors: 10
Total: 210 points → capped at 100 → CRITICAL RISK
Action: Auto-cancel + Block customer
Notification: Slack critical alert + Email customer
```

## Decision Tree

```
Order Created
    ↓
Calculate Risk Score
    ↓
    ├─ Score 0-30?
    │   └─→ ✅ APPROVE → Process to fulfillment
    │
    ├─ Score 31-60?
    │   └─→ ⏸️ HOLD → Slack alert → Manual review in 24h
    │
    ├─ Score 61-85?
    │   └─→ ⚠️ REVIEW → Zendesk ticket → Manual review in 4h
    │
    └─ Score 86-100?
        └─→ 🛑 CANCEL → Block customer → Refund → Alert management
```

## Quick Actions by Risk Level

### LOW RISK (0-30)
- ✅ Auto-approve order
- ✅ Process to fulfillment
- ✅ Log decision (audit only)
- ⏱️ Processing time: <5 seconds

### MEDIUM RISK (31-60)
- ⏸️ Hold order (status: fraud_review)
- 📧 Email customer (verification required)
- 💬 Slack alert to #fraud-review
- 📊 Log decision
- 👤 Manual review within 24 hours
- ⏱️ Processing time: <10 seconds

### HIGH RISK (61-85)
- ⏸️ Hold order (status: fraud_review, priority: urgent)
- 🎫 Create Zendesk ticket (priority: urgent)
- 💬 Slack alert to #fraud-alerts (urgent)
- 📊 Log decision
- 👤 Manual review within 4 hours
- 📞 May require customer contact
- ⏱️ Processing time: <15 seconds

### CRITICAL RISK (86-100)
- 🛑 Cancel order immediately
- 💳 Automatic refund
- 🚫 Block customer account (permanent)
- 📊 Add to fraud blacklist
- 💬 Slack critical alert to @management
- 📧 Email customer (order cancelled)
- 📊 Log decision + create fraud case
- ⏱️ Processing time: <20 seconds

## Response Templates

### Approve Order (Low Risk)
```json
{
  "action": "APPROVE",
  "riskLevel": "LOW",
  "riskScore": 15,
  "proceedToFulfillment": true,
  "message": "Order approved - low fraud risk"
}
```

### Hold Order (Medium Risk)
```json
{
  "action": "HOLD",
  "riskLevel": "MEDIUM",
  "riskScore": 50,
  "proceedToFulfillment": false,
  "requiresReview": true,
  "reviewSLA": "24 hours",
  "message": "Order held for fraud review"
}
```

### Manual Review (High Risk)
```json
{
  "action": "MANUAL_REVIEW",
  "riskLevel": "HIGH",
  "riskScore": 75,
  "proceedToFulfillment": false,
  "requiresUrgentReview": true,
  "reviewSLA": "4 hours",
  "zendeskTicketId": "12345",
  "message": "High-risk order - urgent manual review required"
}
```

### Cancel Order (Critical Risk)
```json
{
  "action": "CANCEL_AND_BLOCK",
  "riskLevel": "CRITICAL",
  "riskScore": 95,
  "proceedToFulfillment": false,
  "blockCustomer": true,
  "orderCancelled": true,
  "refundIssued": true,
  "message": "Order auto-cancelled - critical fraud risk detected"
}
```

## Notification Channels

| Risk Level | Slack Channel | Email | Zendesk | Urgency |
|------------|---------------|-------|---------|---------|
| LOW | - | - | - | - |
| MEDIUM | #fraud-review | Customer | - | Normal |
| HIGH | #fraud-alerts | - | Yes (urgent) | High |
| CRITICAL | #fraud-alerts | Customer | Yes (critical) | Critical |

## Performance Metrics

### Target SLAs
```
Low Risk:     < 5 seconds (auto-approve)
Medium Risk:  < 10 seconds (hold + alert)
High Risk:    < 15 seconds (ticket + urgent alert)
Critical:     < 20 seconds (cancel + block + alerts)
```

### Accuracy Targets
```
True Positive Rate:   >90% (catch real fraud)
False Positive Rate:  <5% (don't block good customers)
False Negative Rate:  <10% (minimize missed fraud)
```

### Review SLAs
```
Medium Risk:  24 hours
High Risk:    4 hours
Critical:     Immediate (auto-action)
```

## Escalation Matrix

| Score | Team | Response Time | Authority |
|-------|------|---------------|-----------|
| 0-30 | Automated | Immediate | System |
| 31-60 | Fraud Analyst | 24 hours | Can approve/reject |
| 61-85 | Senior Analyst | 4 hours | Can approve/reject |
| 86-100 | Automated + Security | Immediate | Auto-cancel (review later) |

## API Quick Reference

### Update Order Status
```bash
PUT /v1/orders/{orderId}/status
{
  "status": "fraud_review",
  "fraudCheckPassed": false,
  "riskScore": 75,
  "holdReason": "High fraud risk"
}
```

### Block Customer
```bash
POST /v1/customers/{customerId}/block
{
  "reason": "fraud_detected",
  "riskScore": 95,
  "blockType": "permanent"
}
```

### Audit Log
```bash
POST /v1/audit/fraud-decisions
{
  "orderId": "ORD-12345",
  "action": "CANCEL_AND_BLOCK",
  "riskLevel": "CRITICAL",
  "riskScore": 95,
  "riskFactors": [...]
}
```

## Testing Quick Commands

```bash
# Low risk test
curl -X POST https://n8n.broxiva.com/webhook/fraud-detection \
  -d '{"orderId":"TEST-001","customerId":"EXISTING","total":99.99}'

# Medium risk test
curl -X POST https://n8n.broxiva.com/webhook/fraud-detection \
  -d '{"orderId":"TEST-002","customerId":"NEW","total":599.99,"billingAddress":{"country":"US"},"shippingAddress":{"country":"CA"}}'

# High risk test
curl -X POST https://n8n.broxiva.com/webhook/fraud-detection \
  -d '{"orderId":"TEST-003","customerId":"NEW","total":1299.99,"shippingAddress":{"country":"NG"}}'

# Critical risk test
curl -X POST https://n8n.broxiva.com/webhook/fraud-detection \
  -d '{"orderId":"TEST-004","customerEmail":"test@tempmail.com","total":2499.99,"shippingAddress":{"country":"NG"}}'
```

---

**Print this reference card for quick access during fraud reviews**

**Last Updated:** 2025-12-03
