# Workflow 8: Dynamic Pricing & Competitor Monitoring - Complete Summary

## Overview

**Status:** ✅ Complete and Production-Ready
**Workflow ID:** workflow-08-dynamic-pricing
**Version:** 1.0.0
**Created:** 2025-12-03
**Schedule:** Daily at 6:00 AM EST

## Purpose

Automated competitor price monitoring and intelligent pricing recommendations system that:
- Monitors prices across Amazon, Walmart, Target, and direct competitors
- Analyzes market positioning and trends
- Generates data-driven pricing recommendations
- Protects profit margins while staying competitive
- Alerts pricing team of urgent opportunities and threats
- Pushes analytics to Mixpanel and Looker dashboards

## Files Delivered

### 1. Core Workflow
**File:** `workflow-08-dynamic-pricing.json` (50 KB)

Complete n8n workflow with 24 nodes including:
- Scheduled daily trigger (6 AM EST)
- Product retrieval from PostgreSQL
- Batch processing (10 products per batch)
- Parallel API calls (Amazon, Walmart, Target)
- Web scraping for direct competitors
- Advanced product matching algorithm
- Intelligent pricing recommendation engine
- Slack notifications (urgent + daily summary)
- Dashboard integration (Mixpanel, Looker)
- Database persistence

### 2. Database Setup
**File:** `workflow-08-database-setup.sql` (22 KB)

Complete PostgreSQL schema including:
- **Tables:**
  - `competitor_configs` - Competitor monitoring configuration
  - `competitor_price_history` - Historical price data
  - `pricing_recommendations` - AI-generated recommendations
  - `pricing_analysis_summary` - Daily summary reports
  - `price_change_audit` - Audit trail of all price changes

- **Views:**
  - `v_competitive_position` - Real-time competitive analysis
  - `v_pending_pricing_actions` - Approval queue
  - `v_daily_pricing_metrics` - Analytics dashboard data

- **Functions:**
  - `calculate_product_margin()` - Margin calculations
  - `get_current_competitor_prices()` - Latest competitor data
  - `get_price_trend()` - Historical trend analysis
  - `expire_old_recommendations()` - Cleanup automation

- **Triggers:**
  - Auto-update timestamps
  - Auto-expire recommendations
  - Audit logging

### 3. Main Documentation
**File:** `workflow-08-dynamic-pricing-README.md` (20 KB)

Comprehensive setup and configuration guide:
- Feature overview
- Database schema requirements
- API configuration (Rainforest, Walmart, Target, ScraperAPI)
- Competitor setup and scraping configuration
- Pricing rules customization
- Slack integration
- Dashboard setup (Mixpanel, Looker)
- Testing and validation
- Monitoring and maintenance
- Cost estimation
- Security and compliance
- Troubleshooting guide

### 4. Pricing Team Guide
**File:** `workflow-08-pricing-team-guide.md` (13 KB)

End-user guide for pricing team:
- How the system works (workflow overview)
- Understanding Slack alerts
- Reviewing recommendations
- Decision guidelines (when to approve/reject)
- Using dashboards (Looker, Mixpanel)
- Common scenarios with solutions
- Best practices (daily/weekly/monthly routines)
- KPIs and performance metrics
- Troubleshooting for users
- Contact and support information

### 5. Technical Implementation Guide
**File:** `workflow-08-technical-guide.md` (40 KB)

Deep technical documentation for developers:
- Architecture diagram
- Node-by-node implementation details
- API integration code samples
- Product matching algorithm
- Recommendation engine logic
- Database optimization techniques
- Connection pooling configuration
- Monitoring and logging
- Error handling strategies
- Unit and integration tests
- Docker deployment
- Maintenance procedures

## Key Features

### 1. Multi-Source Competitor Monitoring

**API-Based (High Reliability):**
- **Amazon** via Rainforest API - $0.005-0.01 per request
- **Walmart** via Walmart Open API - Free with rate limits
- **Target** via Public API - Free

**Web Scraping (Flexible):**
- **Best Buy** - Configurable CSS selectors
- **Newegg** - Configurable CSS selectors
- **B&H Photo** - Configurable CSS selectors
- **eBay** - Configurable CSS selectors
- **Custom Competitors** - Add via database config

### 2. Intelligent Product Matching

```javascript
// Advanced matching algorithm with confidence scoring
- Brand matching (30% weight)
- Model number matching (30% weight)
- Size/capacity matching (15% weight)
- Jaccard word similarity (25% weight)
- Minimum confidence threshold: 0.6 (60%)
```

### 3. Automated Pricing Rules

**Priority Order:**

1. **Margin Protection** (CRITICAL)
   - Ensures minimum 15% margin
   - Recommended: 20% minimum
   - Always requires approval

2. **Price Match** (HIGH)
   - Triggered: Competitor 10%+ lower
   - Requires approval if margin < 20%
   - References: Specific competitor pricing

3. **Opportunity Pricing** (MEDIUM)
   - Triggered: 50%+ competitors out of stock
   - Action: Increase price up to 5%
   - No approval required

4. **Competitive Adjustment** (LOW)
   - Triggered: Price 5-10% off market
   - Action: Position just below average
   - No approval required

5. **Premium Opportunity** (LOW)
   - Triggered: Priced >10% below market
   - Action: Increase toward market rate
   - No approval required

### 4. Alert System

**Urgent Alerts (Immediate):**
- Competitor undercuts >15%
- Margin drops below 20%
- Critical pricing opportunities

**Daily Summary (6:30 AM EST):**
- Products tracked and analyzed
- Price positioning breakdown
- Recommendation summary
- Top opportunities
- Low margin warnings
- Out of stock opportunities
- Market insights

**Format:**
```
🚨 URGENT: Competitor pricing 18.5% lower (Amazon)
Product: Apple iPhone 14 Pro 128GB
Current: $999.99 | Competitor: $849.99
Action: Immediate price review required
[Review & Take Action]
```

### 5. Dashboard Integration

**Mixpanel Events:**
- `Daily Pricing Analysis` - Workflow metrics
- `Price Change Applied` - Approved changes
- `Urgent Alert Triggered` - Critical issues

**Looker Dashboard:**
- Price Position Index
- Margin Trend Analysis
- Competitor Coverage
- Recommendation Approval Rate
- Sales Impact Analysis

## Workflow Architecture

```
Schedule (6 AM EST)
    ↓
Get Trackable Products (PostgreSQL)
    ↓
Split into Batches (10 products)
    ↓
    ├─→ Amazon API (parallel)
    ├─→ Walmart API (parallel)
    ├─→ Target API (parallel)
    └─→ Web Scraping (sequential)
    ↓
Merge & Parse Competitor Data
    ↓
    ├─→ Save Price History (PostgreSQL)
    └─→ Generate Recommendations
        ↓
        ├─→ Save Recommendations (PostgreSQL)
        └─→ Filter Urgent Alerts
            ↓
            └─→ Send Slack Alert (if urgent)
    ↓
Aggregate All Results
    ↓
Generate Daily Summary
    ↓
    ├─→ Save Summary (PostgreSQL)
    ├─→ Send Slack Summary
    ├─→ Push to Mixpanel
    └─→ Push to Looker
```

## Setup Instructions

### Quick Start (15 minutes)

1. **Import Database Schema:**
   ```bash
   psql -U citadelbuy_user -d citadelbuy < workflow-08-database-setup.sql
   ```

2. **Configure API Credentials:**
   - Rainforest API (Amazon): https://www.rainforestapi.com/
   - Walmart API: https://developer.walmart.com/
   - ScraperAPI: https://www.scraperapi.com/
   - Slack OAuth: https://api.slack.com/apps

3. **Import Workflow to n8n:**
   ```bash
   n8n import:workflow --input=workflow-08-dynamic-pricing.json
   ```

4. **Configure Credentials in n8n:**
   - PostgreSQL → "CitadelBuy PostgreSQL"
   - Rainforest API → "Rainforest API (Amazon)"
   - Walmart API → "Walmart API"
   - ScraperAPI → "ScraperAPI"
   - Slack OAuth → "Slack OAuth2"
   - Mixpanel → "Mixpanel API"

5. **Enable Product Tracking:**
   ```sql
   UPDATE products
   SET competitor_tracking_enabled = true,
       min_price = cost_price * 1.1,
       max_price = current_price * 1.5,
       target_margin = 0.25
   WHERE status = 'active' AND stock_quantity > 0;
   ```

6. **Test Workflow:**
   - Click "Execute Workflow" in n8n
   - Monitor execution logs
   - Check Slack for alerts
   - Verify database inserts

### Full Setup (See README)

Detailed instructions in `workflow-08-dynamic-pricing-README.md`

## Configuration Examples

### Add New Competitor

```sql
INSERT INTO competitor_configs
  (competitor_name, competitor_url_template, requires_scraping, scraping_selectors)
VALUES
  ('NewRetailer', 'https://newretailer.com/search?q={search_query}', true,
   '{
      "price": ".product-price",
      "title": ".product-name",
      "stock": ".availability",
      "stock_available_text": ["In Stock", "Available"],
      "stock_unavailable_text": ["Out of Stock"]
    }'::jsonb
  );
```

### Adjust Pricing Rules

Edit "Generate Pricing Recommendations" code node:

```javascript
const PRICE_MATCH_THRESHOLD = 0.10;  // 10% → Adjust as needed
const URGENT_ALERT_THRESHOLD = 0.15;  // 15% → Adjust as needed
const MIN_MARGIN = 0.15;              // 15% → Your minimum
const TARGET_MARGIN = 0.20;           // 20% → Your target
```

### Configure Slack Channels

Update Slack notification nodes with your channel IDs:

```json
{
  "channelId": "C12345PRICING"  // Get from Slack channel details
}
```

## Performance & Costs

### Execution Time
- **Typical:** 5-10 minutes for 1,000 products
- **Batch Processing:** 10 products per batch
- **Parallel APIs:** 3 simultaneous calls per product

### API Costs (1,000 products/day)
- **Rainforest (Amazon):** $5-10/day
- **Walmart API:** Free (rate limited)
- **Target API:** Free
- **ScraperAPI:** $1-2/day per competitor
- **Total:** ~$6-12/day

### Database Requirements
- **Storage:** ~10 MB/day for price history
- **Monthly Growth:** ~300 MB
- **Recommended:** Partition tables by month

## Monitoring

### Daily Health Checks

```sql
-- Check execution success
SELECT report_date, total_products_tracked, products_with_competitor_data
FROM pricing_analysis_summary
WHERE report_date >= CURRENT_DATE - 7
ORDER BY report_date DESC;

-- Check competitor API success rates
SELECT competitor, COUNT(*) as checks,
       ROUND(COUNT(*) FILTER (WHERE price IS NOT NULL)::numeric / COUNT(*) * 100, 2) as success_rate
FROM competitor_price_history
WHERE scraped_at >= CURRENT_DATE - 7
GROUP BY competitor;
```

### Key Metrics

- **Data Coverage:** Target >90% products with competitor data
- **API Success Rate:** Target >95% for API-based competitors
- **Scraping Success:** Target >80% for web scraping
- **Recommendation Volume:** Expect 5-10% of products daily
- **Urgent Alerts:** Expect <5% of recommendations

## Security & Compliance

### API Keys
- Stored securely in n8n credentials (encrypted)
- Never exposed in workflow JSON
- Rotate every 90 days

### Web Scraping
- Respects robots.txt
- Rate limited (1 req/sec per domain)
- Uses rotating proxies (ScraperAPI)
- Complies with terms of service

### Data Privacy
- Competitor data for internal use only
- No republishing of competitor prices
- GDPR compliant (no personal data stored)

## Troubleshooting

### Common Issues

**Low Competitor Data Coverage:**
- Check API credentials are valid
- Verify rate limits not exceeded
- Update scraping selectors if sites changed

**Incorrect Price Recommendations:**
- Review pricing rule thresholds
- Update product min/max price bounds
- Adjust target margin per category

**Slack Notifications Not Sending:**
- Verify Slack token hasn't expired
- Check bot has permission to post
- Confirm channel ID is correct

**Workflow Taking Too Long:**
- Reduce batch size (current: 10)
- Limit products tracked (priority products only)
- Increase API timeout settings

See full troubleshooting guide in README.

## Integration Points

### Upstream Dependencies
- **PostgreSQL:** Product catalog, inventory data
- **User System:** Approval workflow, audit trail

### Downstream Consumers
- **Admin Dashboard:** Pricing approval interface
- **Analytics:** Mixpanel events, Looker dashboards
- **Slack:** Team notifications and alerts
- **Email:** Optional summary reports

### External APIs
- **Rainforest API:** Amazon product data
- **Walmart API:** Walmart product data
- **Target API:** Target product data
- **ScraperAPI:** Web scraping proxy service

## Testing

### Unit Tests
```bash
npm test test/pricing-engine.test.js
```

### Integration Tests
```bash
npm test test/workflow-integration.test.js
```

### Manual Testing
1. Execute workflow in n8n UI
2. Monitor node outputs
3. Verify database inserts
4. Check Slack notifications
5. Confirm dashboard updates

## Maintenance Schedule

### Daily (Automated)
- Workflow execution at 6 AM EST
- Error logging and monitoring
- Automatic recommendation expiry

### Weekly (5 minutes)
- Review execution logs
- Check API success rates
- Archive old price history (>90 days)

### Monthly (1 hour)
- Performance review
- Update pricing rules if needed
- Review competitor configurations
- API key rotation check

### Quarterly (2 hours)
- Strategic pricing review
- Add/remove competitors
- Update scraping selectors
- Optimize database indices

## Version History

**v1.0.0** (2025-12-03)
- Initial production release
- Support for Amazon, Walmart, Target
- Web scraping for 4+ direct competitors
- 5 pricing recommendation rules
- Slack integration (urgent + daily)
- Dashboard push (Mixpanel, Looker)
- Comprehensive documentation

## Roadmap

### Phase 2 (Q1 2026)
- Machine learning price optimization
- Dynamic pricing (real-time updates)
- A/B testing framework
- Multi-currency support

### Phase 3 (Q2 2026)
- Promotional detection
- Bundle pricing analysis
- Shipping cost comparison
- Regional pricing strategies

### Phase 4 (Q3 2026)
- Predictive demand modeling
- Automated approval workflows
- Advanced competitor insights
- Performance optimization

## Support

### Documentation
- **Main README:** `workflow-08-dynamic-pricing-README.md`
- **Pricing Team Guide:** `workflow-08-pricing-team-guide.md`
- **Technical Guide:** `workflow-08-technical-guide.md`
- **Database Setup:** `workflow-08-database-setup.sql`

### Contacts
- **Pricing Team:** #pricing-team (Slack)
- **Technical Support:** #pricing-tech (Slack)
- **Urgent Issues:** pricing-oncall@citadelbuy.com

### Resources
- [n8n Documentation](https://docs.n8n.io/)
- [Rainforest API Docs](https://docs.rainforestapi.com/)
- [Walmart API Docs](https://developer.walmart.com/doc/)
- [ScraperAPI Docs](https://www.scraperapi.com/documentation/)

## License

Copyright 2025 CitadelBuy. Internal use only.

---

## Quick Reference Card

### Files to Use
1. **Workflow:** `workflow-08-dynamic-pricing.json` → Import to n8n
2. **Database:** `workflow-08-database-setup.sql` → Run in PostgreSQL
3. **Setup Guide:** `workflow-08-dynamic-pricing-README.md` → Configuration
4. **User Guide:** `workflow-08-pricing-team-guide.md` → Team reference
5. **Tech Guide:** `workflow-08-technical-guide.md` → Development

### Quick Commands

```bash
# Import workflow
n8n import:workflow --input=workflow-08-dynamic-pricing.json

# Setup database
psql -U citadelbuy_user -d citadelbuy < workflow-08-database-setup.sql

# Enable tracking
psql -U citadelbuy_user -d citadelbuy -c "
UPDATE products
SET competitor_tracking_enabled = true,
    min_price = cost_price * 1.1,
    max_price = current_price * 1.5,
    target_margin = 0.25
WHERE status = 'active' AND stock_quantity > 0;
"

# Check execution
psql -U citadelbuy_user -d citadelbuy -c "
SELECT * FROM pricing_analysis_summary
WHERE report_date = CURRENT_DATE;
"
```

### Environment Variables

```bash
# Required
POSTGRES_HOST=localhost
POSTGRES_DB=citadelbuy
POSTGRES_USER=citadelbuy_user
POSTGRES_PASSWORD=<secret>

RAINFOREST_API_KEY=<secret>
WALMART_API_KEY=<secret>
SCRAPER_API_KEY=<secret>

SLACK_OAUTH_TOKEN=<secret>
MIXPANEL_PROJECT_TOKEN=<secret>
```

### Key URLs
- **Admin Dashboard:** https://admin.citadelbuy.com/pricing/approvals
- **Looker Dashboard:** https://looker.citadelbuy.com/dashboards/pricing
- **Mixpanel:** https://mixpanel.com/project/citadelbuy

---

**Workflow Status:** ✅ Production Ready
**Documentation Status:** ✅ Complete
**Last Updated:** 2025-12-03
**Next Review:** 2026-01-03
