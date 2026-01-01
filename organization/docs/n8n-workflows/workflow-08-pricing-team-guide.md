# Dynamic Pricing System - Pricing Team Quick Guide

## Overview

The Dynamic Pricing & Competitor Monitoring workflow runs daily at 6 AM EST, analyzing competitor prices and generating pricing recommendations for your review.

## How It Works

```
Daily 6 AM EST
    ↓
Monitor Competitors (Amazon, Walmart, Target, etc.)
    ↓
Analyze Price Positioning
    ↓
Generate Recommendations
    ↓
Send Alerts to #pricing-team Slack
    ↓
Dashboard Updates (Mixpanel/Looker)
```

## Understanding Slack Alerts

### Daily Summary (Every Morning)

You'll receive a comprehensive report with:
- Total products tracked
- Price position breakdown (competitive, higher, lower)
- Recommendations summary
- Top opportunities and warnings

**Example:**
```
📈 Daily Pricing Summary - 2025-12-03

Overview
• Products Tracked: 1,250
• With Competitor Data: 1,180
• Total Recommendations: 87
• Urgent Alerts: 5
• Pending Approvals: 12

Price Positioning
• Competitive: 825 (70%)
• Slightly Higher: 280 (24%)
• Significantly Higher: 45 (4%)
• Significantly Lower: 30 (2%)
```

### Urgent Alerts (As Needed)

Sent immediately when:
- Competitor undercuts price by >15%
- Product margin falls below 20%
- Major competitor out of stock

**Example:**
```
🚨 URGENT PRICING ALERT

Product: Apple iPhone 14 Pro 128GB
SKU: IP14-PRO-128
Current Price: $999.99
Current Margin: 19.8%

PRICE_UNDERCUT: Competitor pricing 18.5% lower (Amazon)
Action: Immediate price review required

Recommendations:
• Price Match: $999.99 → $849.99 (-15.0%)
  Reason: Competitor pricing 18.5% lower. Price match recommended.
  ⚠️ Requires approval

Competitor Pricing:
• Amazon: $849.99 ✓
• Walmart: $879.99 ✓
• Target: $899.99 ✓

[Review & Take Action]
```

## Reviewing Recommendations

### 1. Access Admin Dashboard

Navigate to: `https://admin.broxiva.com/pricing/approvals`

### 2. Recommendation Types

#### Price Match (High Priority)
**When:** Competitor is 10%+ cheaper
**Action:** Match or beat competitor price
**Approval:** Required if margin drops below 20%

**Example Decision Matrix:**
| Current Price | Competitor | New Margin | Action |
|--------------|------------|------------|---------|
| $100 | $85 | 22% | ✅ Auto-approve |
| $100 | $80 | 18% | ⚠️ Review required |
| $100 | $75 | 15% | ❌ Reject or renegotiate cost |

#### Margin Protection (Critical)
**When:** Current margin below 20%
**Action:** Increase price to restore profitability
**Approval:** Always required

**Example:**
```
Product: Samsung TV 55"
Current: $599 (16% margin)
Recommended: $649 (20% margin)
Impact: May reduce sales volume, but restores profitability
```

#### Opportunity Pricing (Medium Priority)
**When:** 50%+ competitors out of stock
**Action:** Increase price to capture demand
**Approval:** Not required (within limits)

**Example:**
```
Product: Sony Headphones WH-1000XM5
Current: $349 (25% margin)
Recommended: $379 (30% margin)
Opportunity: 3 of 4 competitors out of stock
Impact: Capture demand at premium pricing
```

#### Competitive Adjustment (Low Priority)
**When:** Price is 5-10% off market average
**Action:** Fine-tune to stay competitive
**Approval:** Not required

#### Premium Opportunity (Low Priority)
**When:** Priced >10% below competitors
**Action:** Increase to market rate
**Approval:** Not required

### 3. Approval Workflow

```sql
-- View pending recommendations
SELECT
  pr.id,
  p.name,
  pr.recommendation_type,
  pr.current_price,
  pr.recommended_price,
  pr.reason,
  pr.expires_at
FROM pricing_recommendations pr
JOIN products p ON pr.product_id = p.id
WHERE pr.status = 'pending'
  AND pr.requires_approval = true
ORDER BY pr.priority DESC, pr.created_at DESC;
```

**In Admin Dashboard:**
1. Review recommendation details
2. Check competitor pricing data
3. Review historical trends
4. Approve, Reject, or Modify
5. Add approval notes

**Approval Actions:**
- **Approve:** Apply recommended price immediately
- **Approve with Modification:** Adjust price manually
- **Reject:** Keep current price, add reason
- **Snooze:** Review again in 24 hours

## Decision Guidelines

### When to Approve Price Match

✅ **Yes - Approve:**
- Margin stays above 20%
- High-volume product
- Reliable competitor (Amazon, Walmart)
- Price match within 5% of current

❌ **No - Reject:**
- Margin drops below 15%
- Competitor may be clearing inventory
- Product being discontinued
- Price change > 20% of current

⚠️ **Review Further:**
- Margin 15-20%
- Competitor unknown/unreliable
- Recent price volatility
- High return rate product

### When to Approve Margin Protection

✅ **Always Approve If:**
- Margin below 15% (critical)
- Can't negotiate lower cost
- Product is profitable at higher price

❌ **Consider Alternatives:**
- Negotiate with supplier first
- Bundle with accessories
- Add value (free shipping, warranty)
- Phase out low-margin product

### When to Approve Opportunity Pricing

✅ **Approve If:**
- Multiple competitors OOS
- Peak demand season
- Limited inventory (scarcity)
- Premium brand positioning

❌ **Be Cautious If:**
- Temporary stockout (restock soon)
- May damage brand reputation
- Customer price sensitivity high
- Long-term customer relationships

## Using the Dashboard

### Looker Dashboard

**URL:** `https://looker.broxiva.com/dashboards/pricing`

**Key Metrics:**
- **Price Position Index:** % of products competitively priced
- **Avg Margin Trend:** Track profitability over time
- **Competitor Coverage:** % products with competitor data
- **Recommendation Approval Rate:** Team efficiency

**Useful Reports:**
1. **Price Position by Category**
   - See which categories are competitive
   - Identify categories needing attention

2. **Margin Analysis**
   - Products below target margin
   - High-margin opportunities

3. **Competitor Trends**
   - Track competitor pricing patterns
   - Identify aggressive competitors

4. **Recommendation Outcomes**
   - Sales impact of price changes
   - ROI of recommendations

### Mixpanel Analytics

**URL:** `https://mixpanel.com/project/broxiva`

**Events Tracked:**
- `Daily Pricing Analysis` - Daily workflow execution
- `Price Change Applied` - When recommendation approved
- `Urgent Alert Triggered` - Critical pricing issues

**Insights to Monitor:**
- Daily recommendation volume trends
- Approval rate by recommendation type
- Time to approve recommendations
- Alert frequency by category

## Common Scenarios

### Scenario 1: Aggressive Competitor Pricing

**Situation:** Amazon drops price 20% below market

**Analysis:**
1. Check if temporary promotion (Lightning Deal, Prime Day)
2. Review Amazon inventory levels
3. Check our inventory position
4. Assess customer loyalty vs. price sensitivity

**Response Options:**
- **Match Price:** If promotion temporary, match for duration
- **Partial Match:** Split difference (10% reduction)
- **Don't Match:** If margin too low, focus on value-adds
- **Bundle Deal:** Create bundle to compete on value

### Scenario 2: Low Margin Product

**Situation:** Product margin consistently below 20%

**Actions:**
1. **Immediate:** Increase price to restore margin
2. **Short-term:** Negotiate better cost with supplier
3. **Medium-term:** Add value (bundle, warranty, support)
4. **Long-term:** Consider discontinuing if unprofitable

### Scenario 3: All Competitors Out of Stock

**Situation:** High-demand product, everyone else OOS

**Opportunity:**
- Increase price 5-10%
- Maximize profit on limited inventory
- Capture market demand
- Build customer acquisition

**Caution:**
- Don't gouge (damages reputation)
- Ensure you can fulfill orders
- Monitor restock dates
- Prepare for price normalization

### Scenario 4: New Competitor Enters Market

**Situation:** New competitor with aggressive pricing

**Analysis:**
1. Research competitor (legitimate business?)
2. Check product authenticity (gray market?)
3. Assess their sustainability (can they maintain price?)
4. Review their service quality

**Response:**
- **Monitor:** Don't react immediately
- **Differentiate:** Emphasize your value-adds
- **Selective Match:** On key products only
- **Long-term:** Focus on customer loyalty

## Best Practices

### Daily Routine (15 minutes)

**6:00 AM** - Workflow runs automatically

**8:00 AM** - Review Slack summary
1. Check urgent alerts (if any)
2. Note unusual patterns
3. Flag items for deeper review

**9:00 AM** - Review approvals queue
1. Process critical/high priority items
2. Approve straightforward recommendations
3. Flag complex cases for team discussion

**5:00 PM** - End of day review
1. Check sales impact of price changes
2. Monitor competitor responses
3. Update notes for next day

### Weekly Review (1 hour)

**Monday Morning:**
1. Review last week's pricing outcomes
2. Analyze sales impact of changes
3. Identify categories needing attention
4. Plan week's pricing strategy

**Friday Afternoon:**
1. Review week's performance
2. Check margin trends
3. Prepare weekend staffing for urgent alerts
4. Document lessons learned

### Monthly Strategy (2-4 hours)

1. **Performance Review:**
   - Recommendation accuracy
   - Sales impact analysis
   - Margin trend analysis
   - Competitor pattern analysis

2. **Process Improvement:**
   - Update pricing rules
   - Adjust approval thresholds
   - Add/remove competitors
   - Refine product tracking

3. **Strategic Planning:**
   - Seasonal pricing adjustments
   - Category-level strategies
   - Competitor response plans
   - Margin improvement initiatives

## Key Performance Indicators (KPIs)

### Team Performance
- **Approval Response Time:** Target < 4 hours for urgent
- **Approval Rate:** Target 60-70% (shows good recommendations)
- **Override Rate:** Target < 10% (modifications needed)

### Business Impact
- **Competitive Products:** Target > 70% within 5% of market
- **Average Margin:** Target > 25%
- **Low-Margin Products:** Target < 5% below 20%

### Operational
- **Data Coverage:** Target > 90% products with competitor data
- **Recommendation Volume:** 5-10% of products daily
- **Urgent Alerts:** Target < 5% of recommendations

## Troubleshooting

### Issue: Not Receiving Slack Alerts

**Solutions:**
1. Check you're in #pricing-team channel
2. Verify Slack notifications enabled
3. Check workflow execution logs
4. Contact technical team if workflow failed

### Issue: Competitor Prices Seem Wrong

**Solutions:**
1. Click through to competitor URL
2. Check product match score (should be >0.6)
3. Verify it's the same product (model, specs)
4. Report incorrect matches to tech team

### Issue: Too Many Alerts

**Solutions:**
1. Adjust urgent alert threshold (currently 15%)
2. Reduce tracked product count (focus on key items)
3. Update product min/max price bounds
4. Tune recommendation rules

### Issue: Recommendations Not Showing Impact

**Solutions:**
1. Allow 7-14 days for sales data
2. Consider external factors (seasonality, promotions)
3. Review attribution methodology
4. Check if price changes were actually applied

## Contact & Support

### Slack Channels
- **#pricing-team** - Daily alerts and discussions
- **#pricing-tech** - Technical issues and workflow support
- **#pricing-strategy** - Strategic planning and analysis

### Support Team
- **Pricing Manager:** @sarah.johnson
- **Technical Lead:** @mike.chen
- **Data Analyst:** @emily.rodriguez

### Emergency Contacts
- **Off-hours Urgent Issues:** pricing-oncall@broxiva.com
- **Workflow Failures:** n8n-support@broxiva.com
- **Dashboard Issues:** analytics-team@broxiva.com

## Resources

### Documentation
- [Full Workflow README](./workflow-08-dynamic-pricing-README.md)
- [Database Schema](./workflow-08-database-setup.sql)
- [Admin Dashboard Guide](https://docs.broxiva.com/pricing/dashboard)

### Training
- [Pricing Strategy 101](https://learn.broxiva.com/pricing-basics)
- [Competitive Analysis](https://learn.broxiva.com/competitor-analysis)
- [Dashboard Workshop](https://learn.broxiva.com/looker-pricing)

### Tools
- [Price Calculator](https://tools.broxiva.com/margin-calculator)
- [Competitor Research](https://tools.broxiva.com/competitor-lookup)
- [Historical Trends](https://looker.broxiva.com/pricing-trends)

---

**Document Version:** 1.0.0
**Last Updated:** 2025-12-03
**Next Review:** 2026-01-03
