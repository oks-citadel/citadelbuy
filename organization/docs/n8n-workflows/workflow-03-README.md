# Broxiva Inventory Management & Alerts - Workflow 3

## Overview

This n8n workflow provides comprehensive inventory management and automated alerting for the Broxiva e-commerce platform. It monitors stock levels, predicts restocking needs, identifies dead stock, and sends multi-channel notifications based on configurable thresholds.

## Features

### Core Functionality
- **Dual Trigger System**: Scheduled runs every 4 hours + webhook for `order.fulfilled` events
- **Multi-Threshold Alerting**: Warning, Critical, and Out-of-Stock alerts
- **Predictive Restocking**: Calculates reorder quantities based on sales velocity and lead times
- **Dead Stock Identification**: Flags products with no sales in 90+ days
- **Automated Actions**: Product disabling, PO draft creation, customer notifications
- **Daily Summary Reports**: Comprehensive HTML email reports and Slack summaries
- **Multi-Channel Notifications**: Slack, Email, Klaviyo integration

### Alert Thresholds

| Threshold | Condition | Action |
|-----------|-----------|--------|
| **Out of Stock** | `available_stock = 0` | Disable product, notify waitlist via Klaviyo |
| **Critical** | `available_stock < 10 units` | Slack @channel alert to #inventory-alerts |
| **Warning** | `stock_health_pct < 20%` | Email purchasing team, create Notion PO draft |
| **Reorder Needed** | `days_remaining <= lead_time_days` | Email + Notion PO |
| **Dead Stock** | No sales 90+ days + stock > 0 | Slack optimization alert |

### Calculated Metrics

The workflow calculates these key metrics for each product:

```javascript
{
  daysOfStockRemaining: available_stock / sales_velocity,
  stockHealthPct: (available_stock / reorder_point) * 100,
  recommendedOrderQty: (projected_demand + safety_stock) - (available_stock + reserved_stock),
  projectedDemand: sales_velocity * (lead_time_days + 30),
  estimatedOrderCost: recommendedOrderQty * cost_per_unit,
  daysSinceLastSale: days_since_last_sale,
  isDeadStock: daysSinceLastSale >= 90 && current_stock > 0
}
```

## Installation

### Prerequisites

1. **n8n Instance**: Running n8n version 1.0+
2. **API Access**: Broxiva API credentials
3. **Integrations**:
   - Slack OAuth2 credentials
   - SMTP email account
   - Klaviyo API credentials
   - Notion OAuth2 credentials

### Step 1: Import Workflow

1. Open n8n interface
2. Navigate to **Workflows**
3. Click **Import from File**
4. Select `workflow-03-inventory-management.json`
5. Click **Import**

### Step 2: Configure Credentials

#### Broxiva API
1. Go to **Credentials** → **New**
2. Select **Header Auth** type
3. Configure:
   - **Name**: `broxivaBuyApi`
   - **Header Name**: `Authorization`
   - **Header Value**: `Bearer YOUR_API_KEY`

#### Slack
1. Go to **Credentials** → **New**
2. Select **Slack OAuth2 API**
3. Follow OAuth flow to connect your Slack workspace
4. Ensure bot has permissions for:
   - `chat:write`
   - `chat:write.public`
   - `channels:read`

#### SMTP Email
1. Go to **Credentials** → **New**
2. Select **SMTP**
3. Configure your email server:
   ```
   Host: smtp.yourdomain.com
   Port: 587
   Secure: TLS
   User: inventory@broxiva.com
   Password: YOUR_PASSWORD
   ```

#### Klaviyo
1. Go to **Credentials** → **New**
2. Select **Klaviyo OAuth2 API**
3. Follow OAuth flow
4. Ensure you have a "waitlist" list created

#### Notion
1. Go to **Credentials** → **New**
2. Select **Notion OAuth2 API**
3. Follow OAuth flow
4. Share your PO database with the integration

### Step 3: Environment Variables

Set these environment variables in your n8n instance:

```bash
# Notion PO Database ID
NOTION_PO_DATABASE_ID=your_database_id_here
```

To find your Notion database ID:
1. Open your Notion database
2. Copy the URL: `https://notion.so/workspace/DATABASE_ID?v=...`
3. Extract the 32-character ID

### Step 4: Configure Notion Database

Create a Notion database with these properties:

| Property Name | Type | Options |
|--------------|------|---------|
| Title | Title | - |
| Status | Select | Draft, Pending, Approved, Ordered |
| Product SKU | Text | - |
| Product Name | Text | - |
| Supplier ID | Text | - |
| Quantity | Number | - |
| Estimated Cost | Number | - |
| Lead Time (Days) | Number | - |
| Current Stock | Number | - |
| Stock Health % | Number | - |
| Priority | Select | Low, Medium, High |
| Auto Generated | Checkbox | - |
| Created Date | Date | - |

### Step 5: Configure Webhook

1. In n8n, open the workflow
2. Click on **Webhook: Order Fulfilled** node
3. Copy the **Production URL**
4. In your Broxiva backend, configure webhook:

```javascript
// Example webhook configuration
{
  "event": "order.fulfilled",
  "url": "https://your-n8n-instance.com/webhook/broxiva-inventory-webhook",
  "method": "POST",
  "headers": {
    "Content-Type": "application/json"
  }
}
```

### Step 6: Configure Slack Channels

Create these Slack channels:
- `#inventory-alerts` - Critical and out-of-stock alerts
- `#inventory-reports` - Daily summary reports
- `#inventory-optimization` - Dead stock alerts
- `#system-alerts` - Workflow errors

### Step 7: Activate Workflow

1. Test the workflow with **Execute Workflow** button
2. Verify all credentials work correctly
3. Toggle **Active** switch to enable

## Threshold Configuration

### Customizing Alert Thresholds

Edit the **Calculate Inventory Metrics** node to customize thresholds:

```javascript
// Current thresholds (lines 60-75 in the Code node)

// Out of Stock
if (available_stock === 0) {
  urgency = 'out_of_stock';
  alertType = 'OUT_OF_STOCK';
}

// Critical - Change the "10" to your desired threshold
else if (available_stock < 10) {
  urgency = 'critical';
  alertType = 'CRITICAL';
}

// Warning - Change the "20" to adjust percentage
else if (stockHealthPct < 20) {  // 20% of reorder point
  urgency = 'warning';
  alertType = 'WARNING';
}

// Reorder based on lead time
else if (daysOfStockRemaining <= lead_time_days) {
  urgency = 'warning';
  alertType = 'REORDER_NEEDED';
}
```

### Recommended Threshold Configurations

#### Conservative (Risk-Averse)
```javascript
// Higher thresholds = more early warnings
if (available_stock < 20) urgency = 'critical';      // 20 units
if (stockHealthPct < 30) urgency = 'warning';        // 30% of reorder
if (daysOfStockRemaining <= (lead_time_days * 1.5)) // 1.5x lead time
```

#### Balanced (Recommended)
```javascript
// Default configuration
if (available_stock < 10) urgency = 'critical';      // 10 units
if (stockHealthPct < 20) urgency = 'warning';        // 20% of reorder
if (daysOfStockRemaining <= lead_time_days)          // 1x lead time
```

#### Aggressive (Minimal Alerts)
```javascript
// Lower thresholds = fewer alerts
if (available_stock < 5) urgency = 'critical';       // 5 units
if (stockHealthPct < 10) urgency = 'warning';        // 10% of reorder
if (daysOfStockRemaining <= (lead_time_days * 0.5))  // 0.5x lead time
```

### Dead Stock Configuration

Adjust the dead stock identification period:

```javascript
// Current: 90 days (line 48)
const daysSinceLastSale = last_sale_date
  ? Math.floor((now - new Date(last_sale_date)) / (1000 * 60 * 60 * 24))
  : 999;
const isDeadStock = daysSinceLastSale >= 90 && current_stock > 0;

// Conservative (60 days)
const isDeadStock = daysSinceLastSale >= 60 && current_stock > 0;

// Aggressive (120 days)
const isDeadStock = daysSinceLastSale >= 120 && current_stock > 0;
```

### Reorder Quantity Calculation

Customize the reorder calculation logic:

```javascript
// Current formula (line 78)
const projectedDemand = sales_velocity * (lead_time_days + 30); // Lead time + 1 month

// Conservative (2 month buffer)
const projectedDemand = sales_velocity * (lead_time_days + 60);

// Aggressive (2 week buffer)
const projectedDemand = sales_velocity * (lead_time_days + 14);

const recommendedOrderQty = Math.max(
  0,
  Math.ceil(projectedDemand + safety_stock - available_stock - reserved_stock)
);
```

## Notification Customization

### Email Recipients

Edit the **Email: Low Stock Warning** node:
```javascript
// Current recipients
toEmail: "purchasing@broxiva.com"

// Multiple recipients
toEmail: "purchasing@broxiva.com, manager@broxiva.com, ops@broxiva.com"
```

### Slack Mentions

Edit the **Slack: Critical Alert** node:
```javascript
// Current: @channel mention
text: "🚨 *CRITICAL STOCK ALERT* @channel\n..."

// Specific user mentions
text: "🚨 *CRITICAL STOCK ALERT* <@USER_ID> <@MANAGER_ID>\n..."

// No mentions (quieter)
text: "🚨 *CRITICAL STOCK ALERT*\n..."
```

### Daily Report Recipients

Edit the **Email: Daily Summary Report** node:
```javascript
// Current recipients
toEmail: "management@broxiva.com, purchasing@broxiva.com, operations@broxiva.com"

// Add or remove recipients as needed
```

## Schedule Configuration

### Adjusting Run Frequency

Edit the **Schedule Every 4 Hours** trigger:

1. Click on the node
2. Modify the interval:

```
Every 2 hours: hoursInterval: 2
Every 4 hours: hoursInterval: 4 (default)
Every 6 hours: hoursInterval: 6
Daily at 9 AM: Use Cron expression: 0 9 * * *
```

### Daily Report Timing

To send the daily report at a specific time, add a second schedule trigger:

1. Add new **Schedule Trigger** node
2. Set to: `0 8 * * *` (8 AM daily)
3. Connect to **Fetch Full Inventory**
4. Update **Is Scheduled Run?** logic to check for this trigger

## API Endpoints

The workflow uses these Broxiva API endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/inventory` | GET | Fetch all inventory data |
| `/v1/products/low-stock` | GET | Pre-flagged low stock items |
| `/v1/products/{sku}` | PATCH | Disable out-of-stock products |
| `/v1/products/{sku}/waitlist` | GET | Get waitlist customers |

### Expected API Response Format

```json
{
  "products": [
    {
      "sku": "CB-PROD-001",
      "product_name": "Premium Widget",
      "current_stock": 45,
      "reserved_stock": 5,
      "available_stock": 40,
      "reorder_point": 50,
      "safety_stock": 20,
      "supplier_id": "SUP-001",
      "lead_time_days": 7,
      "sales_30d": 120,
      "sales_velocity": 4.0,
      "last_sale_date": "2025-12-01T10:00:00Z",
      "cost_per_unit": 25.50
    }
  ]
}
```

## Testing

### Manual Test Execution

1. Click **Execute Workflow** button
2. Monitor execution in the UI
3. Check that each node completes successfully
4. Verify notifications in Slack/Email
5. Check Notion for draft POs

### Test with Mock Data

Create a test endpoint that returns mock low-stock data:

```json
{
  "products": [
    {
      "sku": "TEST-001",
      "product_name": "Test Product - Critical",
      "current_stock": 5,
      "available_stock": 5,
      "reserved_stock": 0,
      "reorder_point": 50,
      "safety_stock": 20,
      "supplier_id": "SUP-TEST",
      "lead_time_days": 7,
      "sales_30d": 100,
      "sales_velocity": 3.3,
      "cost_per_unit": 10.00
    },
    {
      "sku": "TEST-002",
      "product_name": "Test Product - Out of Stock",
      "current_stock": 0,
      "available_stock": 0,
      "reserved_stock": 0,
      "reorder_point": 30,
      "safety_stock": 10,
      "supplier_id": "SUP-TEST",
      "lead_time_days": 5,
      "sales_30d": 50,
      "sales_velocity": 1.67,
      "cost_per_unit": 15.00
    }
  ]
}
```

### Webhook Testing

Use curl to test the webhook trigger:

```bash
curl -X POST https://your-n8n-instance.com/webhook/broxiva-inventory-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "order.fulfilled",
    "order_id": "TEST-ORDER-001",
    "timestamp": "2025-12-03T10:00:00Z"
  }'
```

## Monitoring

### Execution History

1. Navigate to **Executions** in n8n
2. Filter by workflow name
3. Review success/failure rates
4. Check execution times

### Error Handling

The workflow includes error handling:
- **Error Handler** node catches failures
- **Slack: Error Notification** sends alerts to `#system-alerts`
- Errors include full context for debugging

### Performance Metrics

Monitor these metrics:
- **Execution Time**: Should be < 2 minutes for 1000 products
- **Success Rate**: Target > 99%
- **Alert Accuracy**: Validate threshold triggers
- **API Response Times**: Monitor Broxiva API performance

## Troubleshooting

### Common Issues

#### 1. API Authentication Failures
```
Error: 401 Unauthorized
```
**Solution**: Verify Broxiva API credentials are correct and active

#### 2. Slack Notifications Not Sending
```
Error: channel_not_found
```
**Solution**:
- Verify Slack channels exist
- Ensure bot is invited to channels
- Check OAuth scopes include `chat:write`

#### 3. Notion PO Creation Fails
```
Error: Database not found
```
**Solution**:
- Verify `NOTION_PO_DATABASE_ID` environment variable
- Share database with Notion integration
- Check property names match exactly

#### 4. Klaviyo Notifications Fail
```
Error: List not found
```
**Solution**:
- Create a "waitlist" list in Klaviyo
- Verify OAuth credentials
- Check customer email format

#### 5. Empty Inventory Response
```
No products found
```
**Solution**:
- Verify API endpoint is correct
- Check API returns expected JSON format
- Ensure products array exists in response

### Debug Mode

Enable debug logging by adding a **Set** node after **Calculate Inventory Metrics**:

```javascript
{
  "debug_summary": "={{ JSON.stringify($json.summary, null, 2) }}",
  "debug_product_count": "={{ $json.allProducts.length }}",
  "debug_timestamp": "={{ $now.toISO() }}"
}
```

## Best Practices

### 1. Threshold Tuning
- Start with conservative thresholds
- Monitor false positive rates
- Adjust based on business needs
- Document threshold changes

### 2. Alert Fatigue Prevention
- Don't set thresholds too high
- Consolidate similar alerts
- Use daily summaries instead of real-time for low-priority items
- Implement alert suppression for known issues

### 3. Data Quality
- Ensure accurate `sales_velocity` calculations
- Keep `reorder_point` updated
- Maintain accurate `cost_per_unit` data
- Update `lead_time_days` regularly

### 4. Performance Optimization
- Use pagination for large inventories (1000+ products)
- Cache frequently accessed data
- Run heavy calculations during off-peak hours
- Monitor execution times

### 5. Security
- Rotate API credentials regularly
- Use environment variables for sensitive data
- Limit webhook access with authentication
- Audit notification recipients

## Advanced Customization

### Adding Custom Metrics

Edit the **Calculate Inventory Metrics** node to add custom calculations:

```javascript
// Add after line 90
const customMetric = {
  stockoutRisk: (available_stock / reorder_point) < 0.3 ? 'high' : 'low',
  inventoryValue: current_stock * cost_per_unit,
  turnoverRate: sales_30d / current_stock,
  profitMargin: (selling_price - cost_per_unit) / selling_price * 100
};

return {
  ...product,
  ...customMetric,
  // ... existing metrics
};
```

### Multi-Warehouse Support

Add warehouse filtering:

```javascript
// In Calculate Inventory Metrics
const warehouse = product.warehouse_id;
const warehouseMetrics = warehouses[warehouse] || {};

// Group by warehouse in report
const byWarehouse = enrichedProducts.reduce((acc, p) => {
  acc[p.warehouse_id] = acc[p.warehouse_id] || [];
  acc[p.warehouse_id].push(p);
  return acc;
}, {});
```

### Seasonal Adjustments

Account for seasonal demand:

```javascript
// Add seasonal multiplier
const seasonalMultiplier = getSeasonalMultiplier(product.category, now.getMonth());
const adjustedVelocity = sales_velocity * seasonalMultiplier;
const projectedDemand = adjustedVelocity * (lead_time_days + 30);
```

## Integration with Other Workflows

### Workflow 1: Order Fulfillment
- Triggers Workflow 3 via webhook when orders are fulfilled
- Ensures real-time inventory updates

### Workflow 2: Price Optimization
- Uses dead stock data for clearance pricing
- Adjusts prices for slow-moving inventory

### Future Workflows
- **Supplier Management**: Auto-send POs to suppliers
- **Demand Forecasting**: ML-based prediction models
- **Multi-Channel Sync**: Sync inventory across platforms

## Maintenance

### Weekly Tasks
- [ ] Review alert accuracy
- [ ] Check for false positives
- [ ] Verify Notion PO creation
- [ ] Monitor execution success rate

### Monthly Tasks
- [ ] Audit threshold effectiveness
- [ ] Update seasonal factors
- [ ] Review dead stock list
- [ ] Analyze inventory turnover
- [ ] Update supplier lead times

### Quarterly Tasks
- [ ] Full workflow audit
- [ ] Credential rotation
- [ ] Performance optimization review
- [ ] Update documentation

## Support

For issues or questions:
- **Email**: devops@broxiva.com
- **Slack**: #n8n-workflows
- **Documentation**: https://docs.broxiva.com/workflows

## Changelog

### Version 1.0.0 (2025-12-03)
- Initial release
- Multi-threshold alerting system
- Predictive restocking calculations
- Dead stock identification
- Daily summary reports
- Multi-channel notifications (Slack, Email, Klaviyo, Notion)
- Dual trigger system (Schedule + Webhook)
- Error handling and monitoring

## License

Internal use only - Broxiva E-commerce Platform
