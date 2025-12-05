# Abandoned Cart Recovery Workflow - Documentation Index

## Overview

This directory contains the complete n8n workflow implementation for CitadelBuy's abandoned cart recovery system, including a multi-stage email sequence, AI-powered product recommendations, exclusion rules, and comprehensive analytics tracking.

---

## Quick Links

### Primary Files

1. **[workflow-04-abandoned-cart.json](./workflow-04-abandoned-cart.json)** - Main n8n workflow file (IMPORT THIS)
2. **[README-abandoned-cart.md](./README-abandoned-cart.md)** - Complete documentation and setup guide
3. **[config-abandoned-cart.json](./config-abandoned-cart.json)** - Configuration template and settings

### Reference Guides

4. **[RECOVERY-SEQUENCE-GUIDE.md](./RECOVERY-SEQUENCE-GUIDE.md)** - Quick reference for recovery stages and timing
5. **[TESTING-GUIDE-abandoned-cart.md](./TESTING-GUIDE-abandoned-cart.md)** - Comprehensive testing procedures
6. **[ARCHITECTURE-abandoned-cart.md](./ARCHITECTURE-abandoned-cart.md)** - Technical architecture and data flow

---

## File Descriptions

### 1. workflow-04-abandoned-cart.json
**Type:** n8n Workflow JSON
**Size:** ~15 KB
**Purpose:** Importable n8n workflow definition

**Contents:**
- 18 nodes including trigger, API calls, filters, and code
- Complete recovery sequence (Stages 1-4)
- Exclusion rule logic (orders, suppression, tickets)
- Email sending via Klaviyo
- Analytics tracking via Mixpanel
- Error handling and execution summary

**How to Use:**
```bash
# Import via n8n UI
Settings → Import from file → Select workflow-04-abandoned-cart.json

# Or via CLI
n8n import:workflow --input=workflow-04-abandoned-cart.json
```

---

### 2. README-abandoned-cart.md
**Type:** Markdown Documentation
**Size:** ~25 KB
**Purpose:** Main documentation and setup guide

**Sections:**
1. Overview and architecture diagram
2. Recovery sequence timing (1h, 24h, 72h, 7d)
3. Exclusion rules (orders, suppression, tickets)
4. Configuration and environment variables
5. Klaviyo email template HTML (4 templates)
6. Customization options (timing, discounts)
7. Monitoring and analytics setup
8. API endpoints and integration details
9. Troubleshooting guide
10. Compliance (GDPR, CAN-SPAM)

**Start Here If:**
- Setting up workflow for first time
- Need to create Klaviyo email templates
- Configuring environment variables
- Understanding how recovery stages work

---

### 3. config-abandoned-cart.json
**Type:** JSON Configuration
**Size:** ~8 KB
**Purpose:** Centralized configuration template

**Sections:**
- Recovery stage definitions (timing, templates, discounts)
- Exclusion rule toggles
- Personalization settings
- API endpoint configurations
- Analytics tracking options
- Error handling settings
- Performance tuning
- Testing mode flags
- Compliance settings

**How to Use:**
```javascript
// Load configuration
const config = require('./config-abandoned-cart.json');

// Access stage settings
const stage1Delay = config.recovery_stages.stage_1.delay_hours; // 1

// Toggle exclusion rule
config.exclusion_rules.check_cart_value.enabled = true;
config.exclusion_rules.check_cart_value.min_value = 50.00;
```

---

### 4. RECOVERY-SEQUENCE-GUIDE.md
**Type:** Markdown Quick Reference
**Size:** ~15 KB
**Purpose:** Visual timeline and stage breakdown

**Contents:**
- Visual ASCII timeline diagram
- Detailed breakdown of each recovery stage
- Expected conversion rates
- Email content examples
- Exclusion rule quick reference
- Timing customization examples
- Industry-specific timing recommendations
- Discount strategy alternatives
- Performance benchmarks
- A/B testing ideas
- Quick commands cheat sheet

**Start Here If:**
- Need quick reference for stage timing
- Want to see example email content
- Looking for conversion benchmarks
- Customizing recovery sequence
- Training team on workflow

---

### 5. TESTING-GUIDE-abandoned-cart.md
**Type:** Markdown Testing Documentation
**Size:** ~20 KB
**Purpose:** Comprehensive testing procedures

**Sections:**
1. Pre-testing setup (environment, test data)
2. 14 detailed test cases:
   - Stage calculation logic
   - Exclusion rules (orders, suppression, tickets)
   - Algolia product recommendations
   - Email personalization
   - Klaviyo email sending
   - Cart recovery stage updates
   - Mixpanel event tracking
   - Stage 3 discount code
   - Full sequence end-to-end
   - Error handling
   - Batch processing
   - Execution summary
3. Automated testing script (JavaScript)
4. Manual testing checklist
5. Monitoring after launch (daily, weekly, monthly)
6. Rollback plan
7. Common issues and solutions

**Start Here If:**
- Testing workflow before production
- Validating changes after modifications
- Troubleshooting issues
- Creating test data
- Setting up automated tests

---

### 6. ARCHITECTURE-abandoned-cart.md
**Type:** Markdown Technical Documentation
**Size:** ~18 KB
**Purpose:** Detailed technical architecture

**Contents:**
1. High-level architecture diagram (ASCII)
2. Node-by-node breakdown (all 18 nodes)
3. Data flow example (cart journey)
4. Error handling strategy
5. Performance characteristics
6. Integration patterns (CitadelBuy, Klaviyo, Algolia, Zendesk, Mixpanel)
7. Scalability considerations
8. Security architecture
9. Monitoring and observability
10. Version control and deployment
11. Future enhancements

**Start Here If:**
- Understanding technical implementation
- Debugging workflow issues
- Planning architecture changes
- Scaling for higher volume
- Integrating with new services
- Contributing to development

---

## Getting Started - 5 Minute Setup

### Step 1: Import Workflow (1 minute)
```bash
# In n8n UI
1. Settings → Import from file
2. Select: workflow-04-abandoned-cart.json
3. Click "Import"
```

### Step 2: Configure Credentials (2 minutes)
```bash
# Create credentials in n8n:
1. CitadelBuy API Key (HTTP Header Auth)
   - Header: Authorization
   - Value: Bearer YOUR_API_KEY

2. Klaviyo API Key (HTTP Header Auth)
   - Header: Authorization
   - Value: Klaviyo-API-Key YOUR_KEY

3. Zendesk API Token (HTTP Header Auth)
   - Header: Authorization
   - Value: Basic BASE64_ENCODED_CREDENTIALS
```

### Step 3: Set Environment Variables (1 minute)
```bash
# In n8n settings or .env file:
CITADELBUY_API_KEY=your_key
KLAVIYO_PUBLIC_API_KEY=pk_xxx
KLAVIYO_PRIVATE_API_KEY=pk_xxx
KLAVIYO_SUPPRESSION_LIST_ID=list_xxx
ALGOLIA_APP_ID=app_xxx
ALGOLIA_API_KEY=key_xxx
MIXPANEL_PROJECT_TOKEN=token_xxx
ZENDESK_SUBDOMAIN=citadelbuy
ZENDESK_EMAIL=support@citadelbuy.com
ZENDESK_API_TOKEN=token_xxx
```

### Step 4: Create Klaviyo Email Templates (5-10 minutes)
See [README-abandoned-cart.md](./README-abandoned-cart.md#klaviyo-email-templates) for HTML templates:
1. `abandoned_cart_stage_1` - Initial Reminder
2. `abandoned_cart_stage_2` - Urgency + Recommendations
3. `abandoned_cart_stage_3` - Discount Offer
4. `abandoned_cart_stage_4` - Final Attempt

### Step 5: Test & Activate (1 minute)
```bash
# Test workflow
1. Create test cart via API
2. Execute workflow manually
3. Verify email received
4. Activate workflow (Schedule enabled)
```

**Total Setup Time:** ~15 minutes

---

## Recovery Sequence Overview

### Timeline
```
Cart Abandoned (T=0)
    │
    ├─── 1 Hour ─────► Stage 1: Reminder (25% conversion)
    │
    ├─── 24 Hours ───► Stage 2: Urgency + AI Recommendations (12% conversion)
    │
    ├─── 72 Hours ───► Stage 3: 10% Discount (COMEBACK10) (18% conversion)
    │
    └─── 7 Days ─────► Stage 4: Final Attempt + Alternatives (7% conversion)
```

**Overall Recovery Rate:** 40-50%
**Average Revenue Recovery:** ~$65,000/month (per 1,000 carts at $150 avg)

---

## Key Features

### Multi-Stage Recovery
- ✅ 4 automated email stages
- ✅ Progressive urgency messaging
- ✅ Discount incentive at Stage 3
- ✅ AI-powered product recommendations

### Intelligent Exclusions
- ✅ Skip customers who already ordered
- ✅ Respect Klaviyo suppression list
- ✅ Avoid customers with open support tickets
- ✅ Stop after maximum stages reached

### Personalization
- ✅ Customer first name
- ✅ Product images from CDN
- ✅ Related products via Algolia
- ✅ Dynamic discount codes
- ✅ Urgency timers

### Analytics & Tracking
- ✅ Mixpanel event tracking
- ✅ Email open/click tracking (Klaviyo)
- ✅ Revenue attribution
- ✅ Exclusion reason logging
- ✅ Execution summaries

---

## Environment Requirements

### Required Services
- **n8n:** v0.200.0 or higher
- **CitadelBuy API:** v1
- **Klaviyo:** Account with email templates
- **Algolia:** Search index with products
- **Mixpanel:** Project for analytics
- **Zendesk:** (Optional) For support ticket checks

### API Rate Limits
- CitadelBuy: 1,000 requests/min
- Klaviyo: 300 requests/min
- Algolia: 10,000 requests/min
- Zendesk: 700 requests/min
- Mixpanel: Unlimited

### Recommended Resources
- **n8n Instance:** 2 CPU, 4GB RAM
- **Execution Time:** ~1.5 seconds per cart
- **Daily Capacity:** 4,800-9,600 carts (30-min schedule)

---

## Success Metrics

### Email Performance
- **Open Rate:** 35-45%
- **Click-Through Rate:** 12-18%
- **Conversion Rate:** 40-50% (overall)
- **Unsubscribe Rate:** <0.5%

### Revenue Impact
- **Potential Lost Revenue:** $150,000/month (1,000 carts @ $150 avg)
- **Recovered Revenue:** $67,500/month (45% recovery)
- **Discount Cost:** $1,688/month (10% on 25% of recoveries)
- **Net Recovery:** $65,812/month

### Operational Metrics
- **Workflow Success Rate:** >99%
- **Average Execution Time:** <2 minutes
- **Exclusion Rate:** 15-25%
- **API Error Rate:** <1%

---

## Common Customizations

### Change Timing
See [RECOVERY-SEQUENCE-GUIDE.md](./RECOVERY-SEQUENCE-GUIDE.md#timing-customization) for:
- Fast fashion timing (30min, 6h, 24h, 3d)
- High-ticket timing (2h, 48h, 5d, 10d)
- Subscription timing (1h, 12h, 2d, 7d)

### Modify Discount
Edit Stage 3 in `Calculate Recovery Stage` node:
```javascript
discountCode = 'WELCOME15';  // Change from COMEBACK10
discount_percentage = 15;     // Change from 10%
```

### Add Exclusion Rules
See [README-abandoned-cart.md](./README-abandoned-cart.md#customization-options) for:
- High-value cart exclusions
- Cart value minimums
- Business hours sending
- Weekend exclusions

### Customize Email Templates
See [README-abandoned-cart.md](./README-abandoned-cart.md#klaviyo-email-templates) for full HTML

---

## Troubleshooting

### Quick Fixes

**No emails sending?**
→ Check Klaviyo credentials and template IDs

**Wrong stage triggered?**
→ Verify cart `updated_at` timestamp and `recovery_stage` value

**Missing product recommendations?**
→ Check Algolia index and API credentials

**High exclusion rate?**
→ Review exclusion rules in `Merge Exclusion Checks` node

**Workflow timing out?**
→ Reduce batch size or increase n8n timeout setting

See [TESTING-GUIDE-abandoned-cart.md](./TESTING-GUIDE-abandoned-cart.md#troubleshooting) for detailed solutions

---

## Support & Maintenance

### Documentation Updates
- Update this index when adding/removing files
- Maintain version numbers in all documents
- Document breaking changes in README

### Workflow Versioning
```bash
# Export before changes
n8n export:workflow --id={ID} --output=backup-v1.0.0.json

# After changes
n8n export:workflow --id={ID} --output=workflow-04-abandoned-cart.json
git commit -m "feat: Add SMS notification for Stage 3"
git tag v1.1.0
```

### Contact
- **Email:** devops@citadelbuy.com
- **Slack:** #n8n-workflows
- **Docs:** https://docs.citadelbuy.com/automation/abandoned-cart
- **Issues:** https://github.com/citadelbuy/workflows/issues

---

## Related Workflows

### Other CitadelBuy n8n Workflows
1. **Workflow 01:** Order Confirmation Emails
2. **Workflow 02:** Shipping Notifications
3. **Workflow 03:** Customer Feedback Collection
4. **Workflow 04:** Abandoned Cart Recovery (this workflow)
5. **Workflow 05:** Inventory Alerts
6. **Workflow 06:** Price Drop Notifications

### Integration Dependencies
- **Email Marketing:** Klaviyo flows and templates
- **Search:** Algolia product index
- **Analytics:** Mixpanel dashboards
- **Support:** Zendesk ticket API
- **Backend:** CitadelBuy cart and order APIs

---

## Document History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0.0 | 2024-01-15 | Initial release | DevOps Team |
| 1.0.1 | TBD | Add SMS notifications | TBD |
| 1.1.0 | TBD | Implement ML send time optimization | TBD |

---

## License & Usage

**License:** Internal use only - CitadelBuy E-commerce Platform
**Confidentiality:** Contains proprietary business logic and API integrations
**Distribution:** Authorized CitadelBuy team members only

---

## Quick Reference Card

```
╔══════════════════════════════════════════════════════════════╗
║          ABANDONED CART RECOVERY - QUICK REFERENCE          ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  📅 Schedule: Every 30 minutes                               ║
║  🎯 Recovery Rate: 40-50%                                    ║
║  💰 Avg Revenue Recovery: $65,000/month                      ║
║                                                              ║
║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
║                                                              ║
║  STAGES:                                                     ║
║  ┌────────────────────────────────────────────────────┐     ║
║  │ Stage 1 │  1 Hour  │ Reminder      │ 25% convert │     ║
║  │ Stage 2 │ 24 Hours │ Urgency + AI  │ 12% convert │     ║
║  │ Stage 3 │ 72 Hours │ 10% Discount  │ 18% convert │     ║
║  │ Stage 4 │  7 Days  │ Final Attempt │  7% convert │     ║
║  └────────────────────────────────────────────────────┘     ║
║                                                              ║
║  EXCLUSIONS:                                                 ║
║  ✗ Recent order placed                                       ║
║  ✗ Email suppressed in Klaviyo                              ║
║  ✗ Open support ticket                                       ║
║  ✗ Maximum stages reached (4)                                ║
║                                                              ║
║  KEY FILES:                                                  ║
║  • workflow-04-abandoned-cart.json  ← Import this           ║
║  • README-abandoned-cart.md         ← Setup guide           ║
║  • RECOVERY-SEQUENCE-GUIDE.md       ← Quick reference       ║
║                                                              ║
║  SUPPORT: devops@citadelbuy.com                             ║
╚══════════════════════════════════════════════════════════════╝
```

---

**Last Updated:** 2024-01-15
**Document Version:** 1.0.0
**Maintained By:** CitadelBuy DevOps Team
