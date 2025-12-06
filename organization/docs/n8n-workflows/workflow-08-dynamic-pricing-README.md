# CitadelBuy Dynamic Pricing & Competitor Monitoring Workflow

## Overview

**Workflow ID:** workflow-08-dynamic-pricing
**Version:** 1.0.0
**Schedule:** Daily at 6:00 AM EST
**Purpose:** Monitor competitor pricing, analyze market position, generate automated pricing recommendations, and alert pricing team of opportunities and threats.

## Features

### 1. Multi-Source Competitor Monitoring
- **Amazon:** Via Rainforest API (reliable product data)
- **Walmart:** Via Walmart Open API
- **Target:** Via Target's public API
- **Direct Competitors:** Web scraping via ScraperAPI

### 2. Intelligent Price Analysis
- Product matching with confidence scores
- Historical trend analysis
- Market position assessment
- Margin protection rules
- Opportunity detection (out-of-stock competitors)

### 3. Automated Recommendations
- **Price Match:** When competitor 10%+ lower
- **Margin Protection:** When below 20% margin
- **Opportunity Pricing:** When competitors out of stock
- **Competitive Adjustments:** Fine-tune positioning
- **Premium Opportunities:** Identify underpriced products

### 4. Multi-Channel Alerts
- Urgent Slack alerts for critical price changes (>15% undercut)
- Daily summary reports to #pricing-team
- Dashboard data push to Mixpanel and Looker

## Database Schema Requirements

### Required Tables

```sql
-- Products table (extended)
ALTER TABLE products ADD COLUMN IF NOT EXISTS competitor_tracking_enabled BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS min_price DECIMAL(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS max_price DECIMAL(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS target_margin DECIMAL(5,4);
ALTER TABLE products ADD COLUMN IF NOT EXISTS upc VARCHAR(50);

-- Competitor configurations
CREATE TABLE IF NOT EXISTS competitor_configs (
  id SERIAL PRIMARY KEY,
  competitor_name VARCHAR(100) NOT NULL UNIQUE,
  competitor_url_template TEXT,
  requires_scraping BOOLEAN DEFAULT false,
  api_enabled BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 1,
  enabled BOOLEAN DEFAULT true,
  scraping_selectors JSONB,
  rate_limit_per_hour INTEGER DEFAULT 1000,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Competitor price history
CREATE TABLE IF NOT EXISTS competitor_price_history (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  competitor VARCHAR(100) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  url TEXT,
  in_stock BOOLEAN DEFAULT true,
  match_score DECIMAL(3,2),
  scraped_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(product_id, competitor, scraped_at::date)
);

CREATE INDEX idx_competitor_price_history_product ON competitor_price_history(product_id, scraped_at DESC);
CREATE INDEX idx_competitor_price_history_competitor ON competitor_price_history(competitor, scraped_at DESC);

-- Pricing recommendations
CREATE TABLE IF NOT EXISTS pricing_recommendations (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  recommendation_type VARCHAR(50) NOT NULL,
  priority VARCHAR(20) NOT NULL,
  current_price DECIMAL(10,2) NOT NULL,
  recommended_price DECIMAL(10,2) NOT NULL,
  price_change_amount DECIMAL(10,2),
  price_change_percent DECIMAL(5,2),
  new_margin DECIMAL(5,2),
  reason TEXT,
  expected_impact TEXT,
  requires_approval BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'pending',
  competitor_data JSONB,
  approved_by INTEGER REFERENCES users(id),
  approved_at TIMESTAMP,
  applied_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pricing_recommendations_status ON pricing_recommendations(status, created_at DESC);
CREATE INDEX idx_pricing_recommendations_product ON pricing_recommendations(product_id, created_at DESC);

-- Pricing analysis summary
CREATE TABLE IF NOT EXISTS pricing_analysis_summary (
  id SERIAL PRIMARY KEY,
  report_date DATE NOT NULL UNIQUE,
  total_products_tracked INTEGER,
  products_with_competitor_data INTEGER,
  total_recommendations INTEGER,
  urgent_alerts INTEGER,
  pending_approvals INTEGER,
  price_positions JSONB,
  recommendations_by_type JSONB,
  alerts_by_severity JSONB,
  market_insights JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pricing_analysis_date ON pricing_analysis_summary(report_date DESC);
```

## API Configuration

### 1. Rainforest API (Amazon)

**Service:** https://www.rainforestapi.com/
**Cost:** $0.005-0.01 per request
**Rate Limits:** Varies by plan

```bash
# Environment Variables
RAINFOREST_API_KEY=your_api_key_here
```

**n8n Credential Setup:**
1. Go to Settings > Credentials
2. Create new "HTTP Request" credential
3. Name: "Rainforest API (Amazon)"
4. Authentication: Header Auth
5. Header Name: `api_key`
6. Header Value: Your API key

### 2. Walmart Open API

**Service:** https://developer.walmart.com/
**Cost:** Free (with rate limits)
**Rate Limits:** 5 requests/second

```bash
# Environment Variables
WALMART_API_KEY=your_api_key_here
```

**n8n Credential Setup:**
1. Register at Walmart Developer Portal
2. Create application and get API key
3. In n8n: Create "HTTP Request" credential
4. Name: "Walmart API"
5. Authentication: Query Parameter
6. Parameter Name: `apiKey`
7. Parameter Value: Your API key

### 3. Target API

**Service:** Target's public API (no authentication required)
**Cost:** Free
**Rate Limits:** Be respectful (recommended: 1 request/second)

**Note:** Uses public endpoints. Monitor for API changes.

### 4. ScraperAPI (Direct Competitors)

**Service:** https://www.scraperapi.com/
**Cost:** $0.001-0.0015 per request
**Rate Limits:** Varies by plan

```bash
# Environment Variables
SCRAPER_API_KEY=your_api_key_here
```

**n8n Credential Setup:**
1. Register at ScraperAPI
2. Create "HTTP Request" credential
3. Name: "ScraperAPI"
4. Authentication: Query Parameter
5. Parameter Name: `api_key`
6. Parameter Value: Your API key

## Competitor Configuration

### Setting Up Competitors

```sql
-- Insert competitor configurations
INSERT INTO competitor_configs
  (competitor_name, competitor_url_template, requires_scraping, api_enabled, priority, scraping_selectors)
VALUES
  -- API-based competitors (handled by dedicated nodes)
  ('Amazon', 'https://www.amazon.com/s?k={search_query}', false, true, 1, NULL),
  ('Walmart', 'https://www.walmart.com/search?q={search_query}', false, true, 2, NULL),
  ('Target', 'https://www.target.com/s?searchTerm={search_query}', false, true, 3, NULL),

  -- Direct competitors requiring scraping
  ('Best Buy', 'https://www.bestbuy.com/site/searchpage.jsp?st={search_query}', true, false, 4,
   '{"price": ".priceView-hero-price span", "title": ".sku-header h1", "stock": ".fulfillment-add-to-cart-button"}'::jsonb),

  ('Newegg', 'https://www.newegg.com/p/pl?d={search_query}', true, false, 5,
   '{"price": ".price-current strong", "title": ".item-title", "stock": ".item-button-area button"}'::jsonb),

  ('B&H Photo', 'https://www.bhphotovideo.com/c/search?Ntt={search_query}', true, false, 6,
   '{"price": "[data-selenium=\"pricePrimary\"]", "title": "[data-selenium=\"itemTitle\"]", "stock": "[data-selenium=\"addToCartButton\"]"}'::jsonb);

-- Enable tracking for products
UPDATE products
SET
  competitor_tracking_enabled = true,
  min_price = cost_price * 1.1,  -- Minimum 10% margin
  max_price = current_price * 1.5,  -- Max 50% above current
  target_margin = 0.25  -- Target 25% margin
WHERE
  status = 'active'
  AND stock_quantity > 0
  AND category_id IN (SELECT id FROM categories WHERE track_pricing = true);
```

### Custom Competitor Scraping Setup

For competitors requiring web scraping, you'll need to configure CSS selectors:

```javascript
// Example scraping_selectors JSONB structure
{
  "price": ".product-price .amount",           // CSS selector for price
  "title": ".product-title h1",                // CSS selector for product name
  "stock": ".availability",                     // CSS selector for stock status
  "currency": ".price-currency",                // Optional: currency indicator
  "rating": ".star-rating",                     // Optional: product rating
  "reviews": ".review-count",                   // Optional: review count
  "stock_available_text": ["In Stock", "Available"],  // Text indicating in stock
  "stock_unavailable_text": ["Out of Stock", "Unavailable"]  // Text indicating OOS
}
```

### Testing Scraping Configuration

```bash
# Test with ScraperAPI
curl "https://api.scraperapi.com/?api_key=YOUR_KEY&url=https://competitor.com/product-page&render=true"
```

## Pricing Rules Configuration

### Rule Priority (Applied in Order)

1. **Margin Protection** (CRITICAL)
   - Ensures minimum 15% margin
   - Recommended: 20% minimum
   - Overrides all other rules

2. **Price Match** (HIGH)
   - Triggered when competitor 10%+ lower
   - Only if maintains minimum margin
   - Requires approval if margin < 20%

3. **Opportunity Pricing** (MEDIUM)
   - Triggered when 50%+ competitors OOS
   - Increase up to 5% above market average
   - Caps at product max_price

4. **Competitive Adjustment** (LOW)
   - Fine-tune pricing (5-10% difference)
   - Position just below market average
   - No approval required

5. **Premium Opportunity** (LOW)
   - Identify underpriced products
   - Current price >10% below competitors
   - Suggest increase while staying competitive

### Customizing Rules

Edit the "Generate Pricing Recommendations" code node to adjust:

```javascript
// Adjust thresholds
const PRICE_MATCH_THRESHOLD = 0.10;  // 10% lower triggers price match
const URGENT_ALERT_THRESHOLD = 0.15;  // 15% lower triggers urgent alert
const MIN_MARGIN = 0.15;              // 15% absolute minimum
const TARGET_MARGIN = 0.20;           // 20% recommended minimum
const LOW_MARGIN_THRESHOLD = 0.20;    // Below 20% triggers warning
const OPPORTUNITY_OOS_PERCENT = 0.5;  // 50% OOS triggers opportunity
const COMPETITIVE_RANGE = [0.05, 0.10]; // 5-10% difference range
```

## Slack Integration

### Channel Setup

1. Create channels in Slack:
   - `#pricing-team` - Daily summaries and urgent alerts
   - `#pricing-approvals` - Recommendations requiring approval

2. Add n8n Slack bot to channels:
```bash
/invite @n8n-bot
```

3. Get Channel IDs:
```bash
# In Slack, right-click channel > View channel details > Copy ID
# Update workflow node "channelId" values
```

### Customizing Notifications

Edit Slack message nodes to customize:
- Alert thresholds
- Message formatting
- Mention specific team members (@pricing-manager)
- Add additional channels

```javascript
// Example: Mention team for critical alerts
text: `:rotating_light: <!subteam^S12345> *CRITICAL PRICING ALERT*\n...`
```

## Dashboard Integration

### Mixpanel Events

**Event Name:** `Daily Pricing Analysis`

**Properties Tracked:**
- `total_products_tracked`
- `products_with_data`
- `total_recommendations`
- `urgent_alerts`
- `competitive_products`
- `overpriced_products`
- `avg_price_difference`

### Looker Dashboard

**Required Views:**
- `pricing_metrics` - Historical pricing data
- `competitor_analysis` - Competitor price trends
- `margin_analysis` - Profit margin tracking

**Sample LookML:**
```lookml
view: pricing_metrics {
  sql_table_name: public.pricing_analysis_summary ;;

  dimension: report_date {
    type: date
    sql: ${TABLE}.report_date ;;
  }

  measure: avg_price_difference {
    type: average
    sql: (${TABLE}.market_insights->>'avg_price_difference')::float ;;
    value_format: "0.00%"
  }

  measure: competitive_position_score {
    type: number
    sql:
      (${TABLE}.price_positions->>'competitive')::int::float /
      NULLIF(${TABLE}.total_products_tracked, 0) * 100 ;;
    value_format: "0.0\"%\""
  }
}
```

## Workflow Configuration

### Environment Variables

```bash
# Add to n8n environment or .env file
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=citadelbuy
POSTGRES_USER=citadelbuy_user
POSTGRES_PASSWORD=your_password

RAINFOREST_API_KEY=your_key
WALMART_API_KEY=your_key
SCRAPER_API_KEY=your_key

SLACK_OAUTH_TOKEN=xoxb-your-token
MIXPANEL_PROJECT_TOKEN=your_token
LOOKER_CLIENT_ID=your_client_id
LOOKER_CLIENT_SECRET=your_secret
```

### Credentials Setup in n8n

1. **PostgreSQL** → "CitadelBuy PostgreSQL"
2. **Rainforest API** → "Rainforest API (Amazon)"
3. **Walmart API** → "Walmart API"
4. **ScraperAPI** → "ScraperAPI"
5. **Slack OAuth** → "Slack OAuth2"
6. **Mixpanel** → "Mixpanel API"
7. **Looker** → "Looker API"

### Importing the Workflow

```bash
# Via n8n UI
1. Open n8n
2. Click "Add Workflow"
3. Import from file: workflow-08-dynamic-pricing.json

# Via n8n CLI
n8n import:workflow --input=workflow-08-dynamic-pricing.json

# Via API
curl -X POST http://localhost:5678/rest/workflows \
  -H "Content-Type: application/json" \
  -H "X-N8N-API-KEY: your_api_key" \
  -d @workflow-08-dynamic-pricing.json
```

## Testing & Validation

### 1. Test Individual Competitor Nodes

```bash
# Test Amazon API
curl "https://api.rainforestapi.com/request?api_key=YOUR_KEY&type=search&amazon_domain=amazon.com&search_term=iPhone%2014"

# Test Walmart API
curl "https://api.walmartlabs.com/v1/search?apiKey=YOUR_KEY&query=iPhone%2014"

# Test Target API
curl "https://redsky.target.com/redsky_aggregations/v1/web/plp_search_v2?key=9f36aeafbe60771e321a7cc95a78140772ab3e96&keyword=iPhone%2014"
```

### 2. Test with Sample Products

```sql
-- Insert test products
INSERT INTO products
  (name, sku, current_price, cost_price, upc, brand, category_id, competitor_tracking_enabled, status, stock_quantity)
VALUES
  ('iPhone 14 Pro 128GB', 'TEST-IP14-128', 999.99, 800.00, '194253397717', 'Apple', 1, true, 'active', 10),
  ('Samsung Galaxy S23', 'TEST-SGS23', 799.99, 650.00, '887276661506', 'Samsung', 1, true, 'active', 15);
```

### 3. Manual Workflow Test

1. Open workflow in n8n
2. Click "Execute Workflow" button
3. Monitor execution in real-time
4. Check each node's output
5. Verify database inserts
6. Confirm Slack notifications sent

### 4. Validate Recommendations

```sql
-- Check generated recommendations
SELECT
  pr.id,
  p.name,
  pr.recommendation_type,
  pr.current_price,
  pr.recommended_price,
  pr.reason,
  pr.requires_approval
FROM pricing_recommendations pr
JOIN products p ON pr.product_id = p.id
WHERE pr.created_at >= CURRENT_DATE
ORDER BY pr.priority DESC, pr.created_at DESC;
```

## Monitoring & Maintenance

### Workflow Health Checks

```sql
-- Check daily execution success
SELECT
  report_date,
  total_products_tracked,
  products_with_competitor_data,
  (products_with_competitor_data::float / NULLIF(total_products_tracked, 0) * 100) as data_coverage_percent
FROM pricing_analysis_summary
ORDER BY report_date DESC
LIMIT 7;

-- Competitor API success rates
SELECT
  competitor,
  COUNT(*) as total_checks,
  COUNT(*) FILTER (WHERE price IS NOT NULL) as successful_checks,
  (COUNT(*) FILTER (WHERE price IS NOT NULL)::float / COUNT(*) * 100) as success_rate
FROM competitor_price_history
WHERE scraped_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY competitor
ORDER BY success_rate DESC;
```

### Common Issues & Solutions

**Issue:** Low competitor data coverage
**Solution:**
- Check API credentials
- Verify rate limits not exceeded
- Update scraping selectors if competitors changed site structure

**Issue:** Too many false matches
**Solution:**
- Increase `match_score` threshold in "Parse Competitor Data"
- Improve search query generation
- Add UPC/EAN matching for exact matches

**Issue:** Incorrect price recommendations
**Solution:**
- Review pricing rules thresholds
- Update product `min_price` and `max_price` bounds
- Adjust `target_margin` per category

**Issue:** Slack notifications not sending
**Solution:**
- Verify Slack token hasn't expired
- Check bot has permission to post in channel
- Confirm channel ID is correct

## Performance Optimization

### Batch Processing

The workflow processes products in batches of 10 to:
- Avoid rate limits
- Manage memory usage
- Enable parallel API calls

Adjust batch size in "Split Products (Batch 10)" node:
```javascript
batchSize: 10  // Increase for faster processing (if APIs allow)
```

### Rate Limiting

Implement delays between API calls if needed:

```javascript
// Add to product processing loop
await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
```

### Caching

Consider implementing Redis cache for:
- Frequently checked products
- Recent competitor data (within same day)
- API responses (short TTL)

## Cost Estimation

### API Costs (per 1,000 products)

- **Rainforest API (Amazon):** $5-10
- **Walmart API:** Free (rate limited)
- **Target API:** Free
- **ScraperAPI:** $1-2 per competitor

**Total:** ~$6-12 per day for 1,000 products

### Optimization Tips

1. **Prioritize Products:**
   ```sql
   -- Only track high-value or competitive categories
   WHERE competitor_tracking_enabled = true
     AND (sales_rank <= 100 OR margin < 0.25)
   ```

2. **Reduce Frequency:**
   - High-priority products: Daily
   - Medium-priority: 3x per week
   - Low-priority: Weekly

3. **Smart Scraping:**
   - Only scrape when API data insufficient
   - Cache results for 24 hours
   - Use cheaper data sources first

## Security Best Practices

1. **API Keys:**
   - Store in n8n credentials, never in workflow
   - Rotate regularly
   - Use environment-specific keys

2. **Database Access:**
   - Use read-only credentials where possible
   - Limit connection pool size
   - Enable SSL/TLS for connections

3. **Rate Limiting:**
   - Implement exponential backoff
   - Monitor API usage dashboards
   - Set up alerts for quota warnings

4. **Data Privacy:**
   - Anonymize competitor data if required
   - Comply with terms of service
   - Respect robots.txt and rate limits

## Compliance & Ethics

### Web Scraping Guidelines

1. **Respect robots.txt:**
   ```bash
   curl https://competitor.com/robots.txt
   ```

2. **Rate Limiting:**
   - Maximum 1 request per second per domain
   - Implement random delays
   - Use rotating proxies (via ScraperAPI)

3. **Terms of Service:**
   - Review each competitor's ToS
   - Ensure scraping is permitted
   - Consider API partnerships for major retailers

4. **Data Usage:**
   - Only use for internal pricing decisions
   - Don't republish competitor data
   - Maintain confidentiality

## Support & Resources

### Documentation
- n8n Docs: https://docs.n8n.io/
- Rainforest API: https://docs.rainforestapi.com/
- Walmart API: https://developer.walmart.com/doc/
- ScraperAPI: https://www.scraperapi.com/documentation/

### Workflow Support
- **Issues:** Create ticket in CitadelBuy JIRA
- **Questions:** #pricing-tech Slack channel
- **Updates:** Check workflow version notes

### Version History

**v1.0.0** (2025-12-03)
- Initial release
- Support for Amazon, Walmart, Target
- Basic pricing rules and recommendations
- Slack integration
- Dashboard push (Mixpanel, Looker)

## Future Enhancements

### Planned Features

1. **Machine Learning Integration:**
   - Price elasticity prediction
   - Demand forecasting
   - Automated A/B testing

2. **Advanced Competitor Analysis:**
   - Shipping cost comparison
   - Bundle pricing analysis
   - Promotional detection

3. **Multi-Currency Support:**
   - International competitor monitoring
   - Currency conversion
   - Regional pricing strategies

4. **Real-Time Monitoring:**
   - Webhook-based price changes
   - Instant alerts (< 1 minute)
   - Live dashboard updates

5. **Enhanced Automation:**
   - Auto-approve low-risk changes
   - Dynamic pricing based on inventory
   - Time-based pricing (seasonal, hourly)

## License

Copyright 2025 CitadelBuy. Internal use only.
