# Broxiva n8n Workflow - Quick Start Guide

## 5-Minute Setup

### Prerequisites
- n8n instance running (Docker or self-hosted)
- Node.js 16+ installed
- Broxiva API access token
- Slack workspace access
- SendGrid API key
- Notion workspace

### Step 1: Install n8n (if not already installed)

**Option A: Docker (Recommended)**
```bash
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

**Option B: npm**
```bash
npm install -g n8n
n8n start
```

Access n8n at: http://localhost:5678

### Step 2: Import Workflow

1. Open n8n web interface
2. Click **Workflows** → **Import from File**
3. Select `workflow-01-order-processing.json`
4. Click **Import**

### Step 3: Quick Credential Setup

Create these credentials in n8n:

**Broxiva API**
```
Type: Header Auth
Name: Authorization
Value: Bearer YOUR_API_TOKEN
```

**Slack**
```
Type: OAuth2
Grant Type: Authorization Code
Scopes: chat:write, channels:read
```

**SendGrid**
```
Type: Header Auth
Name: Authorization
Value: Bearer YOUR_SENDGRID_API_KEY
```

**Notion**
```
Type: Header Auth
Name: Authorization
Value: Bearer YOUR_NOTION_TOKEN
```

### Step 4: Set Environment Variables

Create `.env` file:
```bash
BROXIVA_WEBHOOK_SECRET=$(openssl rand -hex 32)
SENDGRID_ORDER_CONFIRMATION_TEMPLATE_ID=d-your-template-id
NOTION_FULFILLMENT_DB_ID=your-database-id
N8N_WEBHOOK_URL=http://localhost:5678/webhook/broxiva-order-webhook
```

Load variables:
```bash
source .env  # Linux/Mac
# or
set -a; source .env; set +a  # Linux/Mac (exports all)
```

### Step 5: Test the Workflow

**Generate test signature:**
```bash
npm install  # Install dependencies
node generate-signature.js test-payloads.json
```

**Run test suite:**
```bash
node test-workflow.js
```

**Manual test:**
```bash
# Copy signature from generate-signature.js output
curl -X POST 'http://localhost:5678/webhook/broxiva-order-webhook' \
  -H 'Content-Type: application/json' \
  -H 'X-Broxiva-Signature: YOUR_GENERATED_SIGNATURE' \
  -d @test-payloads.json
```

### Step 6: Activate Workflow

1. In n8n, open the imported workflow
2. Click toggle at top right to **Activate**
3. Status should show as **Active** (green)

### Step 7: Configure Broxiva Backend

Add webhook configuration to your backend:

**In Broxiva API configuration:**
```javascript
// config/webhooks.js
module.exports = {
  endpoints: {
    orderCreated: process.env.N8N_WEBHOOK_URL,
  },
  secret: process.env.BROXIVA_WEBHOOK_SECRET,
  events: ['order.created']
};
```

**In order creation handler:**
```javascript
// When order is created
await webhookService.trigger('order.created', {
  event: 'order.created',
  timestamp: new Date().toISOString(),
  data: {
    order_id: order.id,
    order_number: order.number,
    customer: { /* ... */ },
    // ... rest of order data
  }
});
```

### Step 8: Verify Integration

1. Create a test order in Broxiva
2. Check n8n **Executions** tab for new execution
3. Verify Slack notification received
4. Check SendGrid for sent email
5. Verify Notion task created

## Troubleshooting

### Webhook not triggering
```bash
# Test webhook manually
curl -X POST http://localhost:5678/webhook-test/broxiva-order-webhook
```

### HMAC signature fails
```bash
# Verify secret matches on both sides
echo $BROXIVA_WEBHOOK_SECRET

# Test signature generation
node generate-signature.js test-payloads.json
```

### Credentials not working
1. Check credential permissions in respective services
2. Regenerate API keys if needed
3. Verify OAuth scopes for Slack

### Notion integration fails
1. Share database with integration
2. Check database ID is correct
3. Verify property names match exactly

## Next Steps

1. **Customize routing rules** - Edit "Route Order" node
2. **Add custom notifications** - Duplicate Slack nodes
3. **Extend with new services** - Add nodes to workflow
4. **Set up monitoring** - Configure error alerts
5. **Read full documentation** - See README-workflow-01.md

## Common Commands

```bash
# Generate signatures
node generate-signature.js test-payloads.json

# Run all tests
node test-workflow.js

# Run specific test
node test-workflow.js --scenario=standard_order

# Verbose output
node test-workflow.js --verbose

# Skip concurrency tests
node test-workflow.js --no-concurrency
```

## Production Checklist

- [ ] Replace default webhook secret with secure random value (32+ chars)
- [ ] Use HTTPS for webhook URL
- [ ] Configure proper error alerting
- [ ] Set up monitoring and logging
- [ ] Test all scenarios thoroughly
- [ ] Document custom changes
- [ ] Set up backup for workflows
- [ ] Configure rate limiting
- [ ] Review security settings
- [ ] Test disaster recovery

## Support

- **Documentation**: README-workflow-01.md
- **Test Data**: test-payloads.json
- **Signature Tool**: generate-signature.js
- **Test Suite**: test-workflow.js

## Quick Reference

### Webhook URL Format
```
http://localhost:5678/webhook/broxiva-order-webhook
```

### Required Headers
```
Content-Type: application/json
X-Broxiva-Signature: HMAC-SHA256-SIGNATURE
```

### Signature Calculation
```javascript
const signature = crypto
  .createHmac('sha256', secret)
  .update(JSON.stringify(payload))
  .digest('hex');
```

### Expected Response
```json
{
  "success": true,
  "order_id": "ORD-CB-12345",
  "message": "Order processed successfully",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Success Indicators

✅ Workflow shows as **Active** in n8n
✅ Test webhook returns 200 status
✅ Slack notifications appear in channels
✅ Emails sent via SendGrid
✅ Notion tasks created automatically
✅ Audit logs recorded in Broxiva
✅ Order status updated correctly

---

**Ready to go!** Create a test order and watch the automation in action. 🚀
