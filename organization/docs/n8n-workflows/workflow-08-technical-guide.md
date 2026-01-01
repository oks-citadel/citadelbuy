# Dynamic Pricing Workflow - Technical Implementation Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Daily Trigger (6 AM EST)                    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              PostgreSQL: Get Trackable Products                 │
│  WHERE competitor_tracking_enabled = true AND status = 'active' │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Split into Batches (10 products)               │
└────────────────────────────┬────────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
    ┌──────────────────┐          ┌──────────────────┐
    │  API Competitors │          │ Scrape Competitors│
    │  (Parallel)      │          │  (Sequential)    │
    │  - Amazon        │          │  - Best Buy      │
    │  - Walmart       │          │  - Newegg        │
    │  - Target        │          │  - B&H Photo     │
    └────────┬─────────┘          └────────┬─────────┘
             │                             │
             └──────────────┬──────────────┘
                            │
                            ▼
              ┌──────────────────────────┐
              │  Merge & Parse Responses │
              │  - Match products        │
              │  - Calculate scores      │
              │  - Filter by confidence  │
              └────────────┬─────────────┘
                           │
          ┌────────────────┴────────────────┐
          │                                 │
          ▼                                 ▼
┌──────────────────────┐        ┌──────────────────────┐
│ Save Price History   │        │ Generate Recommendations│
│ (PostgreSQL)         │        │ - Price match rules    │
└──────────────────────┘        │ - Margin protection    │
                                │ - Opportunity alerts   │
                                └──────────┬───────────┘
                                           │
                    ┌──────────────────────┴──────────────┐
                    │                                     │
                    ▼                                     ▼
          ┌──────────────────┐                 ┌──────────────────┐
          │ Save to Database │                 │ Filter Urgent    │
          └──────────────────┘                 │ Send Slack Alert │
                                               └────────┬─────────┘
                                                        │
                                                        ▼
                                          ┌──────────────────────┐
                                          │ Aggregate Results    │
                                          │ Generate Summary     │
                                          └──────────┬───────────┘
                                                     │
                         ┌───────────────────────────┼───────────────┐
                         │                           │               │
                         ▼                           ▼               ▼
                ┌─────────────────┐        ┌──────────────┐  ┌───────────┐
                │ Slack Summary   │        │  Mixpanel    │  │  Looker   │
                └─────────────────┘        └──────────────┘  └───────────┘
```

## Node-by-Node Implementation

### 1. Scheduled Trigger

**Type:** `n8n-nodes-base.scheduleTrigger`

**Configuration:**
```json
{
  "rule": {
    "interval": [{
      "field": "cronExpression",
      "expression": "0 6 * * *"
    }],
    "timezone": "America/New_York"
  }
}
```

**Cron Expression Details:**
- `0` - Minute (at minute 0)
- `6` - Hour (6 AM)
- `*` - Day of month (every day)
- `*` - Month (every month)
- `*` - Day of week (every day)

**Testing:**
```bash
# Manually trigger for testing
curl -X POST http://localhost:5678/webhook-test/workflow-08-trigger
```

### 2. Get Trackable Products

**Type:** `n8n-nodes-base.postgres`

**Query Optimization:**
```sql
-- Create index for faster queries
CREATE INDEX idx_products_competitor_tracking
ON products(competitor_tracking_enabled, status, stock_quantity)
WHERE competitor_tracking_enabled = true;

-- Query with proper joins and filters
SELECT
  p.id,
  p.sku,
  p.name,
  p.current_price,
  p.cost_price,
  p.category_id,
  p.brand,
  p.upc,
  p.ean,
  p.asin,
  p.competitor_tracking_enabled,
  p.min_price,
  p.max_price,
  p.target_margin,
  c.name as category_name,
  c.priority as category_priority
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.status = 'active'
  AND p.competitor_tracking_enabled = true
  AND p.stock_quantity > 0
  AND (p.last_price_check IS NULL OR p.last_price_check < CURRENT_DATE)
ORDER BY
  c.priority DESC,
  p.sales_rank ASC NULLS LAST,
  p.id
LIMIT 1000;  -- Safety limit
```

**Performance Considerations:**
- Use connection pooling (max 10 connections)
- Query timeout: 30 seconds
- Batch size: 1000 products max per execution

### 3. Split Into Batches

**Type:** `n8n-nodes-base.splitInBatches`

**Configuration:**
```json
{
  "batchSize": 10,
  "options": {
    "reset": true
  }
}
```

**Why Batching?**
- API rate limiting (avoid 429 errors)
- Memory management (prevents OOM)
- Parallel processing efficiency
- Error isolation (failure doesn't break entire run)

**Batch Size Tuning:**
```javascript
// Calculate optimal batch size based on API limits
const API_RATE_LIMITS = {
  rainforest: 100,  // requests per minute
  walmart: 300,     // requests per minute
  target: 60        // requests per minute (estimated)
};

// Most restrictive is Target at 60/min
// With 4 API calls per product (3 APIs + scraping)
// Optimal batch: 60 / 4 = 15 products per minute
// Use 10 for safety margin
```

### 4. Competitor API Nodes

#### Amazon (Rainforest API)

**Type:** `n8n-nodes-base.httpRequest`

**Request:**
```http
GET https://api.rainforestapi.com/request
  ?api_key={API_KEY}
  &type=search
  &amazon_domain=amazon.com
  &search_term={SEARCH_QUERY}
  &max_page=1
```

**Response Parsing:**
```javascript
// Extract price data from Rainforest response
const parseRainforestResponse = (response) => {
  if (!response.search_results) return [];

  return response.search_results
    .filter(item => item.price?.value)
    .slice(0, 3)  // Top 3 results
    .map(item => ({
      competitor: 'Amazon',
      price: parseFloat(item.price.value),
      currency: item.price.currency || 'USD',
      url: item.link,
      title: item.title,
      in_stock: item.is_prime || item.availability?.raw === 'In Stock',
      rating: item.rating || null,
      reviews: item.ratings_total || 0,
      asin: item.asin,
      prime: item.is_prime
    }));
};
```

**Error Handling:**
```javascript
// Implement retry logic with exponential backoff
const retryRequest = async (url, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;

      if (response.status === 429) {
        const delay = Math.pow(2, i) * 1000;  // 1s, 2s, 4s
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
    }
  }
};
```

#### Walmart API

**Request:**
```http
GET https://api.walmartlabs.com/v1/search
  ?apiKey={API_KEY}
  &query={SEARCH_QUERY}
  &numItems=5
  &format=json
```

**Response Parsing:**
```javascript
const parseWalmartResponse = (response) => {
  if (!response.items) return [];

  return response.items
    .filter(item => item.salePrice)
    .slice(0, 3)
    .map(item => ({
      competitor: 'Walmart',
      price: parseFloat(item.salePrice),
      currency: 'USD',
      url: item.productUrl,
      title: item.name,
      in_stock: item.stock === 'Available',
      rating: item.customerRating || null,
      reviews: item.numReviews || 0,
      upc: item.upc
    }));
};
```

#### Target API

**Request:**
```http
GET https://redsky.target.com/redsky_aggregations/v1/web/plp_search_v2
  ?key=9f36aeafbe60771e321a7cc95a78140772ab3e96
  &keyword={SEARCH_QUERY}
  &pricing_store_id=3991
  &count=5
```

**Note:** Target's API key is semi-public but monitor for changes.

**Response Parsing:**
```javascript
const parseTargetResponse = (response) => {
  if (!response?.data?.search?.products) return [];

  return response.data.search.products
    .filter(item => item.price?.current_retail)
    .slice(0, 3)
    .map(item => ({
      competitor: 'Target',
      price: parseFloat(item.price.current_retail),
      currency: 'USD',
      url: `https://www.target.com${item.url}`,
      title: item.title,
      in_stock: !item.available_to_promise_network?.is_out_of_stock_in_all_store_locations,
      rating: item.ratings_and_reviews?.statistics?.rating?.average || null,
      reviews: item.ratings_and_reviews?.statistics?.rating?.count || 0,
      tcin: item.tcin
    }));
};
```

### 5. Web Scraping (Direct Competitors)

**Type:** `n8n-nodes-base.httpRequest` → ScraperAPI

**Request:**
```http
POST https://api.scraperapi.com/
  ?api_key={API_KEY}
  &url={TARGET_URL}
  &render=true
  &country_code=us
```

**Scraping Best Practices:**

```javascript
// Dynamic selector extraction
const extractDataFromHTML = (html, selectors) => {
  const $ = cheerio.load(html);

  // Price extraction with multiple selector fallbacks
  const extractPrice = () => {
    const priceSelectors = Array.isArray(selectors.price)
      ? selectors.price
      : [selectors.price];

    for (const selector of priceSelectors) {
      const element = $(selector).first();
      if (element.length) {
        const text = element.text().trim();
        const match = text.match(/\$?([\d,]+\.?\d{0,2})/);
        if (match) return parseFloat(match[1].replace(',', ''));
      }
    }
    return null;
  };

  // Stock status extraction
  const extractStock = () => {
    const stockElement = $(selectors.stock).first();
    const stockText = stockElement.text().toLowerCase();

    const availableTexts = selectors.stock_available_text || ['in stock', 'available', 'add to cart'];
    const unavailableTexts = selectors.stock_unavailable_text || ['out of stock', 'unavailable', 'sold out'];

    const isAvailable = availableTexts.some(text => stockText.includes(text.toLowerCase()));
    const isUnavailable = unavailableTexts.some(text => stockText.includes(text.toLowerCase()));

    if (isAvailable) return true;
    if (isUnavailable) return false;
    return null;  // Unknown
  };

  return {
    price: extractPrice(),
    title: $(selectors.title).first().text().trim(),
    in_stock: extractStock(),
    rating: parseFloat($(selectors.rating).first().text()) || null,
    reviews: parseInt($(selectors.reviews).first().text().replace(/\D/g, '')) || 0
  };
};
```

**Rate Limiting:**
```javascript
// Implement intelligent rate limiting
class RateLimiter {
  constructor(requestsPerSecond) {
    this.requestsPerSecond = requestsPerSecond;
    this.queue = [];
    this.processing = false;
  }

  async schedule(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.process();
    });
  }

  async process() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;
    const { fn, resolve, reject } = this.queue.shift();

    try {
      const result = await fn();
      resolve(result);
    } catch (error) {
      reject(error);
    }

    await new Promise(r => setTimeout(r, 1000 / this.requestsPerSecond));
    this.processing = false;
    this.process();
  }
}

const scraperLimiter = new RateLimiter(1);  // 1 request per second
```

### 6. Parse Competitor Data

**Type:** `n8n-nodes-base.code`

**Product Matching Algorithm:**

```javascript
// Advanced product matching with fuzzy logic
const calculateMatchScore = (productName, competitorTitle) => {
  if (!productName || !competitorTitle) return 0;

  // Normalize strings
  const normalize = (str) => {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const pName = normalize(productName);
  const cTitle = normalize(competitorTitle);

  // Extract important features
  const extractFeatures = (text) => {
    const features = {
      brand: null,
      model: null,
      size: null,
      color: null,
      capacity: null
    };

    // Brand detection
    const brands = ['apple', 'samsung', 'sony', 'lg', 'dell', 'hp', 'lenovo'];
    features.brand = brands.find(b => text.includes(b));

    // Model number detection (alphanumeric sequences)
    const modelMatch = text.match(/\b[a-z]{0,3}\d{2,}[a-z0-9]*\b/i);
    if (modelMatch) features.model = modelMatch[0];

    // Size detection (inches, GB, TB, etc.)
    const sizeMatch = text.match(/\b\d+(\.\d+)?\s?(inch|"|gb|tb|oz|lb)\b/i);
    if (sizeMatch) features.size = sizeMatch[0];

    // Color detection
    const colors = ['black', 'white', 'silver', 'gold', 'blue', 'red', 'green'];
    features.color = colors.find(c => text.includes(c));

    return features;
  };

  const pFeatures = extractFeatures(pName);
  const cFeatures = extractFeatures(cTitle);

  let score = 0;
  let maxScore = 0;

  // Brand matching (highest weight)
  if (pFeatures.brand || cFeatures.brand) {
    maxScore += 0.3;
    if (pFeatures.brand === cFeatures.brand) score += 0.3;
  }

  // Model matching (high weight)
  if (pFeatures.model || cFeatures.model) {
    maxScore += 0.3;
    if (pFeatures.model === cFeatures.model) score += 0.3;
  }

  // Size matching
  if (pFeatures.size || cFeatures.size) {
    maxScore += 0.15;
    if (pFeatures.size === cFeatures.size) score += 0.15;
  }

  // Word overlap (Jaccard similarity)
  const pWords = new Set(pName.split(/\s+/).filter(w => w.length > 2));
  const cWords = new Set(cTitle.split(/\s+/).filter(w => w.length > 2));

  const intersection = new Set([...pWords].filter(w => cWords.has(w)));
  const union = new Set([...pWords, ...cWords]);

  const jaccardScore = intersection.size / union.size;
  maxScore += 0.25;
  score += jaccardScore * 0.25;

  // Normalize score to 0-1 range
  return maxScore > 0 ? Math.min(score / maxScore, 1) : 0;
};
```

**Data Aggregation:**

```javascript
// Aggregate competitor prices with statistical analysis
const aggregateCompetitorPrices = (competitorPrices) => {
  if (competitorPrices.length === 0) return null;

  const prices = competitorPrices.map(cp => cp.price).sort((a, b) => a - b);

  return {
    count: prices.length,
    min: Math.min(...prices),
    max: Math.max(...prices),
    mean: prices.reduce((a, b) => a + b, 0) / prices.length,
    median: prices[Math.floor(prices.length / 2)],

    // Quartiles
    q1: prices[Math.floor(prices.length * 0.25)],
    q3: prices[Math.floor(prices.length * 0.75)],

    // Standard deviation
    stdDev: (() => {
      const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
      const squaredDiffs = prices.map(p => Math.pow(p - mean, 2));
      const variance = squaredDiffs.reduce((a, b) => a + b, 0) / prices.length;
      return Math.sqrt(variance);
    })(),

    // In-stock competitors
    inStockCount: competitorPrices.filter(cp => cp.in_stock).length,
    outOfStockCount: competitorPrices.filter(cp => !cp.in_stock).length,

    // By competitor
    byCompetitor: competitorPrices.reduce((acc, cp) => {
      acc[cp.competitor] = {
        price: cp.price,
        in_stock: cp.in_stock,
        url: cp.url,
        match_score: cp.match_score
      };
      return acc;
    }, {})
  };
};
```

### 7. Generate Pricing Recommendations

**Type:** `n8n-nodes-base.code`

**Recommendation Engine:**

```javascript
class PricingRecommendationEngine {
  constructor(config = {}) {
    this.config = {
      // Thresholds
      PRICE_MATCH_THRESHOLD: config.priceMatchThreshold || 0.10,
      URGENT_ALERT_THRESHOLD: config.urgentAlertThreshold || 0.15,
      MIN_MARGIN: config.minMargin || 0.15,
      TARGET_MARGIN: config.targetMargin || 0.20,
      LOW_MARGIN_THRESHOLD: config.lowMarginThreshold || 0.20,
      OPPORTUNITY_OOS_PERCENT: config.opportunityOosPercent || 0.5,

      // Competitive positioning
      COMPETITIVE_RANGE_MIN: 0.05,
      COMPETITIVE_RANGE_MAX: 0.10,

      // Premium pricing
      PREMIUM_THRESHOLD: 0.10,
      MAX_MARGIN_CAP: 0.40
    };
  }

  generateRecommendations(productData, competitorData) {
    const recommendations = [];
    const alerts = [];

    const {
      product_id,
      current_price,
      cost_price,
      min_price,
      max_price,
      target_margin
    } = productData;

    const {
      min: minCompPrice,
      mean: avgCompPrice,
      inStockCount,
      outOfStockCount,
      count: totalCompetitors
    } = competitorData;

    const currentMargin = this.calculateMargin(current_price, cost_price);
    const priceDiffPercent = this.calculatePriceDiff(current_price, minCompPrice);

    // Rule 1: Margin Protection (CRITICAL)
    if (currentMargin < this.config.LOW_MARGIN_THRESHOLD) {
      const rec = this.marginProtectionRule(
        productData,
        currentMargin,
        this.config.TARGET_MARGIN
      );
      if (rec) {
        recommendations.push(rec);
        alerts.push({
          type: 'low_margin',
          severity: currentMargin < this.config.MIN_MARGIN ? 'critical' : 'high',
          message: `Margin at ${(currentMargin * 100).toFixed(1)}% - below threshold`,
          action_required: true
        });
      }
    }

    // Rule 2: Price Match (HIGH)
    if (minCompPrice && priceDiffPercent > this.config.PRICE_MATCH_THRESHOLD) {
      const rec = this.priceMatchRule(
        productData,
        minCompPrice,
        currentMargin
      );
      if (rec) {
        recommendations.push(rec);

        if (priceDiffPercent > this.config.URGENT_ALERT_THRESHOLD) {
          alerts.push({
            type: 'price_undercut',
            severity: 'urgent',
            message: `Competitor pricing ${(priceDiffPercent * 100).toFixed(1)}% lower`,
            action_required: true
          });
        }
      }
    }

    // Rule 3: Opportunity Pricing (MEDIUM)
    if (totalCompetitors > 0 && outOfStockCount >= totalCompetitors * this.config.OPPORTUNITY_OOS_PERCENT) {
      const rec = this.opportunityPricingRule(
        productData,
        avgCompPrice,
        outOfStockCount,
        totalCompetitors
      );
      if (rec) {
        recommendations.push(rec);
        alerts.push({
          type: 'opportunity',
          severity: 'medium',
          message: `${outOfStockCount} of ${totalCompetitors} competitors out of stock`,
          action_required: false
        });
      }
    }

    // Rule 4: Competitive Adjustment (LOW)
    if (minCompPrice &&
        priceDiffPercent > this.config.COMPETITIVE_RANGE_MIN &&
        priceDiffPercent <= this.config.COMPETITIVE_RANGE_MAX) {
      const rec = this.competitiveAdjustmentRule(
        productData,
        avgCompPrice,
        target_margin
      );
      if (rec) recommendations.push(rec);
    }

    // Rule 5: Premium Opportunity (LOW)
    if (minCompPrice && priceDiffPercent < -this.config.PREMIUM_THRESHOLD) {
      const rec = this.premiumOpportunityRule(
        productData,
        avgCompPrice
      );
      if (rec) recommendations.push(rec);
    }

    return { recommendations, alerts };
  }

  calculateMargin(price, cost) {
    return price > 0 ? (price - cost) / price : 0;
  }

  calculatePriceDiff(ourPrice, theirPrice) {
    return theirPrice ? (ourPrice - theirPrice) / theirPrice : 0;
  }

  priceMatchRule(productData, targetPrice, currentMargin) {
    const { current_price, cost_price, min_price } = productData;
    const matchPrice = targetPrice;
    const newMargin = this.calculateMargin(matchPrice, cost_price);

    // Only recommend if maintains minimum margin and within bounds
    if (newMargin < this.config.MIN_MARGIN || matchPrice < min_price) {
      return null;
    }

    return {
      type: 'price_match',
      priority: newMargin < this.config.TARGET_MARGIN ? 'high' : 'medium',
      current_price,
      recommended_price: matchPrice.toFixed(2),
      price_change: (matchPrice - current_price).toFixed(2),
      price_change_percent: (((matchPrice - current_price) / current_price) * 100).toFixed(2),
      new_margin: (newMargin * 100).toFixed(2),
      reason: `Competitor pricing lower. Price match recommended to stay competitive.`,
      expected_impact: 'Increase competitiveness and sales volume',
      requires_approval: newMargin < this.config.TARGET_MARGIN
    };
  }

  marginProtectionRule(productData, currentMargin, targetMargin) {
    const { current_price, cost_price, max_price } = productData;
    const minProfitablePrice = Math.min(
      cost_price / (1 - targetMargin),
      max_price
    );

    if (minProfitablePrice <= current_price) return null;

    return {
      type: 'margin_protection',
      priority: 'critical',
      current_price,
      recommended_price: minProfitablePrice.toFixed(2),
      price_change: (minProfitablePrice - current_price).toFixed(2),
      price_change_percent: (((minProfitablePrice - current_price) / current_price) * 100).toFixed(2),
      new_margin: (targetMargin * 100).toFixed(2),
      reason: `Current margin ${(currentMargin * 100).toFixed(1)}% below minimum threshold`,
      expected_impact: 'Restore profitability (may reduce sales volume)',
      requires_approval: true
    };
  }

  opportunityPricingRule(productData, avgCompPrice, oosCount, totalCount) {
    const { current_price, cost_price, max_price } = productData;

    // Increase price by 5% or to average competitor price, whichever is lower
    const opportunityPrice = Math.min(
      avgCompPrice * 1.00,  // Match average
      current_price * 1.05,  // Or 5% increase
      max_price
    );

    if (opportunityPrice <= current_price) return null;

    const newMargin = this.calculateMargin(opportunityPrice, cost_price);

    return {
      type: 'opportunity_pricing',
      priority: 'medium',
      current_price,
      recommended_price: opportunityPrice.toFixed(2),
      price_change: (opportunityPrice - current_price).toFixed(2),
      price_change_percent: (((opportunityPrice - current_price) / current_price) * 100).toFixed(2),
      new_margin: (newMargin * 100).toFixed(2),
      reason: `${oosCount} of ${totalCount} competitors out of stock - opportunity to capture demand`,
      expected_impact: 'Capture market demand and increase margins',
      requires_approval: false
    };
  }

  competitiveAdjustmentRule(productData, avgCompPrice, targetMargin) {
    const { current_price, cost_price, min_price } = productData;

    // Position just below average (2% discount)
    const competitivePrice = avgCompPrice * 0.98;
    const newMargin = this.calculateMargin(competitivePrice, cost_price);

    if (newMargin < targetMargin || competitivePrice < min_price) {
      return null;
    }

    return {
      type: 'competitive_adjustment',
      priority: 'low',
      current_price,
      recommended_price: competitivePrice.toFixed(2),
      price_change: (competitivePrice - current_price).toFixed(2),
      price_change_percent: (((competitivePrice - current_price) / current_price) * 100).toFixed(2),
      new_margin: (newMargin * 100).toFixed(2),
      reason: 'Optimize competitive position while maintaining target margin',
      expected_impact: 'Improve price competitiveness',
      requires_approval: false
    };
  }

  premiumOpportunityRule(productData, avgCompPrice) {
    const { current_price, cost_price, max_price } = productData;

    // Increase to 5% below average
    const premiumPrice = Math.min(
      avgCompPrice * 0.95,
      max_price
    );

    if (premiumPrice <= current_price) return null;

    const newMargin = this.calculateMargin(premiumPrice, cost_price);

    // Don't exceed reasonable margin cap
    if (newMargin > this.config.MAX_MARGIN_CAP) return null;

    return {
      type: 'premium_opportunity',
      priority: 'low',
      current_price,
      recommended_price: premiumPrice.toFixed(2),
      price_change: (premiumPrice - current_price).toFixed(2),
      price_change_percent: (((premiumPrice - current_price) / current_price) * 100).toFixed(2),
      new_margin: (newMargin * 100).toFixed(2),
      reason: 'Current price significantly below market - opportunity to increase margins',
      expected_impact: 'Increase profitability without sacrificing competitiveness',
      requires_approval: false
    };
  }
}

// Usage in n8n Code node
const engine = new PricingRecommendationEngine({
  priceMatchThreshold: 0.10,
  urgentAlertThreshold: 0.15,
  minMargin: 0.15,
  targetMargin: 0.20
});

const { recommendations, alerts } = engine.generateRecommendations(
  productData,
  competitorData
);
```

## Database Performance

### Connection Pooling

```javascript
// PostgreSQL connection pool configuration
const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,

  // Pool settings
  max: 10,                    // Maximum number of connections
  min: 2,                     // Minimum number of connections
  idleTimeoutMillis: 30000,   // Close idle connections after 30s
  connectionTimeoutMillis: 2000,  // Timeout if can't get connection

  // Performance
  statement_timeout: 30000,   // Kill queries after 30s
  query_timeout: 30000,

  // SSL for production
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
});
```

### Bulk Inserts

```sql
-- Use COPY for bulk inserts (much faster than individual INSERTs)
COPY competitor_price_history (
  product_id, competitor, price, currency, url, in_stock, match_score, scraped_at
)
FROM STDIN
WITH (FORMAT csv, HEADER false);

-- Or use multi-row INSERT
INSERT INTO competitor_price_history
  (product_id, competitor, price, currency, url, in_stock, match_score, scraped_at)
VALUES
  (1, 'Amazon', 99.99, 'USD', 'https://...', true, 0.95, NOW()),
  (2, 'Amazon', 149.99, 'USD', 'https://...', true, 0.92, NOW()),
  (3, 'Amazon', 199.99, 'USD', 'https://...', false, 0.88, NOW())
ON CONFLICT (product_id, competitor, scraped_at::date)
DO UPDATE SET
  price = EXCLUDED.price,
  in_stock = EXCLUDED.in_stock,
  updated_at = NOW();
```

### Query Optimization

```sql
-- Add covering indexes for common queries
CREATE INDEX idx_competitor_price_history_covering
ON competitor_price_history (product_id, scraped_at DESC)
INCLUDE (competitor, price, in_stock);

-- Partition large tables by date
CREATE TABLE competitor_price_history_partitioned (
  LIKE competitor_price_history INCLUDING ALL
) PARTITION BY RANGE (scraped_at);

CREATE TABLE competitor_price_history_2025_12
PARTITION OF competitor_price_history_partitioned
FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');

-- Auto-create partitions
CREATE OR REPLACE FUNCTION create_monthly_partition()
RETURNS void AS $$
DECLARE
  partition_date DATE;
  partition_name TEXT;
  start_date TEXT;
  end_date TEXT;
BEGIN
  partition_date := DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month');
  partition_name := 'competitor_price_history_' || TO_CHAR(partition_date, 'YYYY_MM');
  start_date := partition_date::TEXT;
  end_date := (partition_date + INTERVAL '1 month')::TEXT;

  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF competitor_price_history_partitioned FOR VALUES FROM (%L) TO (%L)',
    partition_name, start_date, end_date
  );
END;
$$ LANGUAGE plpgsql;
```

## Monitoring & Logging

### Workflow Execution Metrics

```javascript
// Add execution tracking to workflow
const workflowMetrics = {
  workflow_id: 'workflow-08-dynamic-pricing',
  execution_id: $execution.id,
  started_at: new Date().toISOString(),

  products_processed: 0,
  api_calls_successful: 0,
  api_calls_failed: 0,
  scraping_requests: 0,
  scraping_successes: 0,

  recommendations_generated: 0,
  urgent_alerts_sent: 0,

  errors: [],
  warnings: []
};

// Track throughout execution
try {
  // ... API call
  workflowMetrics.api_calls_successful++;
} catch (error) {
  workflowMetrics.api_calls_failed++;
  workflowMetrics.errors.push({
    type: 'api_error',
    message: error.message,
    timestamp: new Date().toISOString()
  });
}

// Save metrics at end
await saveExecutionMetrics(workflowMetrics);
```

### Error Handling

```javascript
// Centralized error handler
class WorkflowError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

const handleError = async (error, context) => {
  console.error(`[${context}] Error:`, error);

  // Log to database
  await logError({
    workflow_id: 'workflow-08',
    error_code: error.code || 'UNKNOWN',
    error_message: error.message,
    context,
    details: error.details,
    stack_trace: error.stack,
    timestamp: error.timestamp
  });

  // Send alert for critical errors
  if (error.code === 'CRITICAL') {
    await sendSlackAlert({
      channel: '#tech-alerts',
      message: `🚨 Critical error in pricing workflow: ${error.message}`,
      priority: 'high'
    });
  }

  // Decide whether to continue or fail
  if (error.code === 'FATAL') {
    throw error;  // Stop workflow
  } else {
    return null;  // Continue with next item
  }
};
```

### Logging Best Practices

```javascript
// Structured logging
const logger = {
  info: (message, meta = {}) => {
    console.log(JSON.stringify({
      level: 'info',
      message,
      ...meta,
      timestamp: new Date().toISOString(),
      workflow: 'pricing'
    }));
  },

  warn: (message, meta = {}) => {
    console.warn(JSON.stringify({
      level: 'warn',
      message,
      ...meta,
      timestamp: new Date().toISOString(),
      workflow: 'pricing'
    }));
  },

  error: (message, error, meta = {}) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: {
        message: error.message,
        stack: error.stack,
        code: error.code
      },
      ...meta,
      timestamp: new Date().toISOString(),
      workflow: 'pricing'
    }));
  }
};

// Usage
logger.info('Starting competitor price check', {
  product_id: 123,
  competitors: ['Amazon', 'Walmart']
});
```

## Testing

### Unit Tests

```javascript
// test/pricing-engine.test.js
const { PricingRecommendationEngine } = require('../pricing-engine');

describe('PricingRecommendationEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new PricingRecommendationEngine();
  });

  describe('priceMatchRule', () => {
    it('should recommend price match when competitor 10% lower', () => {
      const productData = {
        product_id: 1,
        current_price: 100,
        cost_price: 70,
        min_price: 75,
        max_price: 150
      };

      const result = engine.priceMatchRule(productData, 88, 0.30);

      expect(result).not.toBeNull();
      expect(result.type).toBe('price_match');
      expect(parseFloat(result.recommended_price)).toBe(88);
      expect(result.requires_approval).toBe(false);
    });

    it('should require approval when margin drops below 20%', () => {
      const productData = {
        product_id: 1,
        current_price: 100,
        cost_price: 85,
        min_price: 75,
        max_price: 150
      };

      const result = engine.priceMatchRule(productData, 95, 0.15);

      expect(result).not.toBeNull();
      expect(result.requires_approval).toBe(true);
    });

    it('should not recommend if margin below 15%', () => {
      const productData = {
        product_id: 1,
        current_price: 100,
        cost_price: 90,
        min_price: 75,
        max_price: 150
      };

      const result = engine.priceMatchRule(productData, 95, 0.10);

      expect(result).toBeNull();
    });
  });

  describe('calculateMatchScore', () => {
    it('should return high score for exact brand and model match', () => {
      const score = engine.calculateMatchScore(
        'Apple iPhone 14 Pro 128GB Black',
        'iPhone 14 Pro 128GB - Black'
      );

      expect(score).toBeGreaterThan(0.8);
    });

    it('should return low score for different products', () => {
      const score = engine.calculateMatchScore(
        'Apple iPhone 14 Pro',
        'Samsung Galaxy S23'
      );

      expect(score).toBeLessThan(0.3);
    });
  });
});
```

### Integration Tests

```javascript
// test/workflow-integration.test.js
describe('Pricing Workflow Integration', () => {
  it('should complete full workflow for sample products', async () => {
    // Setup test data
    await db.query(`
      INSERT INTO products (name, sku, current_price, cost_price, competitor_tracking_enabled)
      VALUES ('Test Product', 'TEST-001', 99.99, 70.00, true)
    `);

    // Trigger workflow
    const execution = await triggerWorkflow('workflow-08-dynamic-pricing');

    // Wait for completion
    await waitForCompletion(execution.id, 300000);  // 5 min timeout

    // Verify results
    const recommendations = await db.query(`
      SELECT * FROM pricing_recommendations
      WHERE product_id = (SELECT id FROM products WHERE sku = 'TEST-001')
        AND created_at >= NOW() - INTERVAL '1 hour'
    `);

    expect(recommendations.rows.length).toBeGreaterThan(0);

    // Cleanup
    await db.query(`DELETE FROM products WHERE sku = 'TEST-001'`);
  });
});
```

## Deployment

### Environment Configuration

```bash
# .env.production
NODE_ENV=production

# Database
POSTGRES_HOST=postgres.broxiva.internal
POSTGRES_PORT=5432
POSTGRES_DB=broxiva
POSTGRES_USER=n8n_pricing
POSTGRES_PASSWORD=<secret>

# APIs
RAINFOREST_API_KEY=<secret>
WALMART_API_KEY=<secret>
SCRAPER_API_KEY=<secret>

# Slack
SLACK_OAUTH_TOKEN=<secret>
SLACK_PRICING_CHANNEL=C12345PRICING

# Analytics
MIXPANEL_PROJECT_TOKEN=<secret>
LOOKER_CLIENT_ID=<secret>
LOOKER_CLIENT_SECRET=<secret>

# Workflow Settings
BATCH_SIZE=10
MAX_PRODUCTS_PER_RUN=1000
EXECUTION_TIMEOUT=600000
```

### Docker Deployment

```dockerfile
# Dockerfile
FROM n8nio/n8n:latest

# Install additional dependencies
USER root
RUN apk add --no-cache postgresql-client

# Copy workflow
COPY workflow-08-dynamic-pricing.json /workflows/

# Import workflow on startup
CMD n8n import:workflow --input=/workflows/workflow-08-dynamic-pricing.json && n8n start
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  n8n-pricing:
    build: .
    environment:
      - NODE_ENV=production
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=${N8N_USER}
      - N8N_BASIC_AUTH_PASSWORD=${N8N_PASSWORD}
    env_file:
      - .env.production
    volumes:
      - n8n_data:/home/node/.n8n
    depends_on:
      - postgres
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: broxiva
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./workflow-08-database-setup.sql:/docker-entrypoint-initdb.d/setup.sql
    restart: unless-stopped

volumes:
  n8n_data:
  postgres_data:
```

## Maintenance

### Daily Tasks

```bash
# Check workflow execution status
SELECT
  execution_id,
  started_at,
  finished_at,
  status,
  products_processed,
  recommendations_generated
FROM workflow_executions
WHERE workflow_id = 'workflow-08'
  AND started_at >= CURRENT_DATE
ORDER BY started_at DESC;

# Check error rate
SELECT
  error_code,
  COUNT(*) as error_count,
  MAX(timestamp) as last_occurrence
FROM workflow_errors
WHERE workflow_id = 'workflow-08'
  AND timestamp >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY error_code
ORDER BY error_count DESC;
```

### Weekly Tasks

```bash
# Archive old price history
SELECT pg_size_pretty(pg_total_relation_size('competitor_price_history'));

INSERT INTO competitor_price_history_archive
SELECT * FROM competitor_price_history
WHERE scraped_at < CURRENT_DATE - INTERVAL '90 days';

DELETE FROM competitor_price_history
WHERE scraped_at < CURRENT_DATE - INTERVAL '90 days';

# Vacuum tables
VACUUM ANALYZE competitor_price_history;
VACUUM ANALYZE pricing_recommendations;
```

### Monthly Tasks

```bash
# Review and tune pricing rules
SELECT
  recommendation_type,
  COUNT(*) as total_recommendations,
  COUNT(*) FILTER (WHERE status = 'approved') as approved,
  COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
  ROUND(COUNT(*) FILTER (WHERE status = 'approved')::numeric / COUNT(*) * 100, 2) as approval_rate
FROM pricing_recommendations
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY recommendation_type
ORDER BY total_recommendations DESC;

# Update competitor configurations
SELECT
  competitor,
  COUNT(*) as total_checks,
  COUNT(*) FILTER (WHERE price IS NOT NULL) as successful_checks,
  ROUND(COUNT(*) FILTER (WHERE price IS NOT NULL)::numeric / COUNT(*) * 100, 2) as success_rate
FROM competitor_price_history
WHERE scraped_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY competitor
ORDER BY success_rate DESC;
```

## Troubleshooting

See [README](./workflow-08-dynamic-pricing-README.md) for common issues and solutions.

## Contributing

When making changes to the workflow:

1. Test in development environment first
2. Update version number in workflow JSON
3. Document changes in README
4. Update this technical guide if architecture changes
5. Run integration tests
6. Deploy to staging for validation
7. Deploy to production with monitoring

---

**Document Version:** 1.0.0
**Last Updated:** 2025-12-03
**Maintained By:** Platform Engineering Team
