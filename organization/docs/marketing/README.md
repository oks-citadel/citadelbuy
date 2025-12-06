# CitadelBuy Marketing & Growth Engine Documentation

## Overview

This directory contains the complete global marketing, advertising, and growth engine strategy for CitadelBuy - the premier B2B enterprise marketplace connecting African exporters with international buyers.

**Created:** December 2025
**Status:** Production Ready
**Owner:** Chief Marketing Officer / Head of Growth

---

## Quick Navigation

### Strategic Documentation

| Document | Description | Word Count | Status |
|----------|-------------|------------|--------|
| [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) | Executive overview and implementation roadmap | 4,500 | ✅ Complete |
| [GLOBAL_GTM_STRATEGY.md](./GLOBAL_GTM_STRATEGY.md) | Go-to-Market strategy for all regions | 19,000 | ✅ Complete |
| [ENTERPRISE_SALES_PLAYBOOK.md](./ENTERPRISE_SALES_PLAYBOOK.md) | High-ticket enterprise sales processes | 12,000 | ✅ Complete |
| [SEO_CONTENT_STRATEGY.md](./SEO_CONTENT_STRATEGY.md) | Multi-language SEO and content plan | 9,000 | ✅ Complete |

**Total Documentation:** 44,500 words

---

## What's Included

### 1. Strategic Planning Documents

#### GLOBAL_GTM_STRATEGY.md
**Purpose:** Comprehensive go-to-market plan for all regions

**Covers:**
- Africa market entry (Nigeria, South Africa, Kenya, Egypt, Ghana)
- U.S. enterprise buyer acquisition
- Europe, Middle East, Asia-Pacific expansion
- Partner ecosystem strategy
- Regional campaign calendars
- Marketing budget ($2.4M Year 1)
- KPIs and success metrics
- Competitive positioning
- Risk mitigation

**Use Cases:**
- Executive team strategic planning
- Investor presentations
- Board updates
- Regional market entry planning
- Partnership discussions

---

#### ENTERPRISE_SALES_PLAYBOOK.md
**Purpose:** Complete sales process for high-ticket B2B deals

**Covers:**
- Sales funnel and conversion rates
- BANT/MEDDIC qualification frameworks
- 6-stage enterprise deal process
- Cross-border deal management
- RFQ response templates (5 templates)
- Pricing and negotiation guidelines
- Sales team structure
- Tools and technology stack

**Use Cases:**
- Sales team training
- New hire onboarding
- Deal reviews and forecasting
- Sales process optimization
- Compensation planning

---

#### SEO_CONTENT_STRATEGY.md
**Purpose:** Multi-language content marketing and SEO roadmap

**Covers:**
- Topic cluster strategy (5 pillars)
- 200+ target keywords
- Multi-language approach (5 languages)
- Content calendar (120+ pieces in Year 1)
- Whitepaper roadmap (6 per year)
- Case study framework
- Technical SEO requirements
- Backlink acquisition strategy
- Content team structure

**Use Cases:**
- Content team planning
- SEO optimization
- Editorial calendar management
- Content production workflows
- Performance tracking

---

### 2. Web Content & Templates

**Location:** `C:/Users/citad/OneDrive/Documents/citadelbuy-master/organization/apps/web/src/content/`

#### Landing Pages

| File | Target Audience | Primary Keywords | Status |
|------|----------------|------------------|--------|
| [africa-suppliers-us.tsx](../../apps/web/src/content/landing-pages/africa-suppliers-us.tsx) | U.S. Buyers | "african suppliers", "import from africa" | ✅ Ready |
| [exporters-africa.tsx](../../apps/web/src/content/landing-pages/exporters-africa.tsx) | African Exporters | "export to usa", "find buyers" | ✅ Ready |

**Features:**
- SEO-optimized React components
- Mobile-responsive design
- Conversion-focused CTAs
- Testimonials and social proof
- FAQ sections
- Multi-language support ready

---

#### Email Templates

| File | Purpose | Variables | Status |
|------|---------|-----------|--------|
| [enterprise-demo-request.hbs](../../apps/web/src/content/email-templates/enterprise-demo-request.hbs) | Demo confirmation | 15+ personalization fields | ✅ Ready |

**Features:**
- Handlebars templating
- Fully responsive HTML
- Calendar integration
- Account manager details
- Resource links
- Unsubscribe functionality

---

#### Case Study Templates

| File | Purpose | Status |
|------|---------|--------|
| [template-success-story.md](../../apps/web/src/content/case-studies/template-success-story.md) | Standard case study format | ✅ Ready |

**Includes:**
- 10-section structure
- Quantifiable metrics table
- Stakeholder quote formats
- Example use cases
- SEO metadata guidelines
- Related resources section

---

### 3. Marketing Automation & Campaigns

**Location:** `C:/Users/citad/OneDrive/Documents/citadelbuy-master/organization/apps/api/src/modules/marketing/templates/`

#### Campaign Templates

**File:** [campaign-templates.json](../../apps/api/src/modules/marketing/templates/campaign-templates.json)

**Includes 6 Pre-Built Campaigns:**

1. **New Buyer Welcome** (14 days, 7 steps)
   - Email, in-app, SMS
   - Goal: First RFQ submission (40% target)

2. **New Exporter Welcome** (21 days, 10 steps)
   - Email, in-app, SMS, WhatsApp
   - Multi-language (EN, FR)
   - Goal: First product listing (60% target)

3. **RFQ Nurture** (30 days, 5 steps)
   - Event-triggered
   - Goal: RFQ to order conversion (25% target)

4. **Cart Abandonment** (7 days, 3 steps)
   - Goal: Cart recovery (15% target)

5. **Post-Purchase** (60 days, 5 steps)
   - Goal: Reviews (40%) and repeat purchase (30%)

6. **Seasonal Q4 Promo** (30 days, 4 steps)
   - Multi-channel (Email, LinkedIn, Display)
   - Goal: 40% GMV increase vs. Q3

**Each Campaign Includes:**
- Trigger events
- Workflow steps with timing
- Email templates
- Conditional logic
- KPIs and metrics
- A/B test variants

---

#### Email Sequences

**File:** [email-sequences.json](../../apps/api/src/modules/marketing/templates/email-sequences.json)

**Includes 3 Cold Outreach Sequences:**

1. **U.S. Enterprise Buyers** (6-touch, 21 days)
   - Email channel
   - 3 A/B test variants (cost savings, diversification, sustainability)
   - Expected: 5% reply rate, 2% meeting booking

2. **African Exporters** (5-touch, 14 days)
   - Email + WhatsApp
   - Multi-language (EN, FR)
   - Expected: 15% WhatsApp reply, 8% sign-up

3. **Long-Term Nurture** (12-month)
   - Monthly emails
   - Goal: 5% annual conversion to MQL

**Each Sequence Includes:**
- Subject lines
- Body structure
- Personalization variables
- Timing specifications
- Best practices
- Performance targets

---

#### Ad Creative Templates

**File:** [ad-creatives.json](../../apps/api/src/modules/marketing/templates/ad-creatives.json)

**Includes 7 Platform-Specific Templates:**

1. **Google Search** (U.S. Buyers)
   - 5 headlines, 3 descriptions
   - Budget: $60K/month
   - Target CPA: $144

2. **LinkedIn Sponsored Content** (Enterprise Buyers)
   - 3 variants (image, carousel, video)
   - Budget: $30K/month
   - Expected conversion: 12%

3. **Google Display** (African Exporters)
   - 3 ad sizes
   - Budget: $15K/month

4. **Facebook Carousel** (U.S. SMB Buyers)
   - 5-card carousel
   - Budget: $9K/month

5. **YouTube Pre-Roll** (African Exporters)
   - 30-second video with script
   - Budget: $6K/month

6. **Twitter/X Promoted Tweet**
   - Infographic ad
   - Budget: $4.5K/month

7. **Retargeting** (Website Visitors)
   - Multi-platform
   - Budget: $12K/month
   - Target ROAS: 400%

**Regional Variations:**
- Europe (EN, FR, DE)
- Middle East (EN, AR)
- Africa (EN, FR, AR)

**Performance Targets by Platform:**
- Google Search: 3-5% CTR, $100-$200 CPA
- LinkedIn: 2-3% CTR, $150-$250 CPA
- Facebook: 2-4% CTR, $80-$150 CPA
- YouTube: 35-50% view rate
- Retargeting: 15-20% conversion

---

## Implementation Roadmap

### Phase 1: Q1 2026 (Months 1-3) - Foundation
- Hire sales and marketing teams
- Set up tech stack
- Launch website and landing pages
- Publish first 10 blog posts
- Launch Google and LinkedIn ads
- Onboard first 75 customers

**Q1 Goals:** 200 MQLs, 50 customers, $1M GMV, 10K organic visits/month

---

### Phase 2: Q2 2026 (Months 4-6) - Growth
- Expand content production (30 more posts)
- Launch Facebook/YouTube ads
- Attend 2 trade shows
- Sign logistics and finance partners
- Launch French content hub

**Q2 Goals:** 600 MQLs, 200 customers, $5M GMV, 30K organic visits/month

---

### Phase 3: Q3-Q4 2026 (Months 7-12) - Scale
- Launch Europe and Middle East
- Launch Arabic content
- Publish all 5 pillar pages
- Complete 12 case studies
- Run seasonal Q4 campaign

**Q3-Q4 Goals:** 6,000 MQLs, 1,000 customers, $40M GMV, 150K organic visits/month

---

## Key Metrics & Targets

### Year 1 Goals

| Metric | Target |
|--------|--------|
| **ARR** | $12M |
| **GMV** | $50M |
| **Total Customers** | 1,400 (1,000 exporters, 400 buyers) |
| **MQLs** | 10,000 |
| **Organic Traffic** | 150K/month |
| **CAC** | $160 (blended) |
| **LTV:CAC** | 4:1+ |
| **Marketing ROI** | 4:1 |
| **Domain Authority** | 40 |
| **Top 10 Keywords** | 50+ |

---

## Budget Summary

**Total Year 1 Marketing Budget:** $2.4M

| Channel | Annual | % of Total |
|---------|--------|------------|
| Google Ads | $720K | 30% |
| LinkedIn Ads | $420K | 17.5% |
| Content Marketing | $300K | 12.5% |
| Trade Shows | $360K | 15% |
| PR & Media | $180K | 7.5% |
| Partnerships | $240K | 10% |
| Marketing Ops | $180K | 7.5% |

---

## Technology Stack

### Marketing Tools
- **CRM:** Salesforce
- **Marketing Automation:** HubSpot
- **SEO:** Ahrefs, SEMrush
- **Analytics:** Google Analytics 4
- **Email:** SendGrid, HubSpot
- **Ads:** Google Ads, LinkedIn, Meta

### Sales Tools
- **Engagement:** Outreach.io
- **Intelligence:** LinkedIn Sales Navigator, ZoomInfo
- **Call Recording:** Gong.io
- **Proposals:** PandaDoc

---

## Getting Started

### For Marketing Team
1. Read [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) for overview
2. Review [GLOBAL_GTM_STRATEGY.md](./GLOBAL_GTM_STRATEGY.md) for strategic context
3. Use [SEO_CONTENT_STRATEGY.md](./SEO_CONTENT_STRATEGY.md) for content planning
4. Reference campaign templates for automation setup

### For Sales Team
1. Start with [ENTERPRISE_SALES_PLAYBOOK.md](./ENTERPRISE_SALES_PLAYBOOK.md)
2. Review email sequences for outbound prospecting
3. Use RFQ templates for customer communication
4. Follow BANT/MEDDIC qualification frameworks

### For Content Team
1. Review [SEO_CONTENT_STRATEGY.md](./SEO_CONTENT_STRATEGY.md)
2. Use case study template for customer stories
3. Follow editorial calendar in SEO strategy doc
4. Reference keyword lists for optimization

### For Product/Engineering
1. Implement landing page templates
2. Set up email template infrastructure
3. Integrate campaign automation workflows
4. Configure tracking and analytics

---

## Support & Questions

**Questions about implementation?**
- Strategic questions: CMO / Head of Growth
- Content questions: Head of Content Marketing
- Sales questions: VP of Sales
- Technical questions: VP of Engineering

**Document Updates:**
- Review cycle: Quarterly
- Last updated: December 2025
- Next review: March 2026 (post-Q1 results)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | Dec 2025 | Initial creation - complete marketing system | Marketing Agent |

---

**Ready to Execute:** All documentation, templates, and configurations are production-ready and can be implemented immediately.

Start with the [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) for your comprehensive overview and next steps.
