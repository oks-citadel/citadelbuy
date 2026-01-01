-- Broxiva Dynamic Pricing & Competitor Monitoring
-- Database Setup Script
-- Version: 1.0.0
-- Created: 2025-12-03

-- ============================================================================
-- PART 1: Table Creation
-- ============================================================================

-- Extend products table with pricing fields
ALTER TABLE products
ADD COLUMN IF NOT EXISTS competitor_tracking_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS min_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS max_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS target_margin DECIMAL(5,4) DEFAULT 0.25,
ADD COLUMN IF NOT EXISTS upc VARCHAR(50),
ADD COLUMN IF NOT EXISTS ean VARCHAR(50),
ADD COLUMN IF NOT EXISTS asin VARCHAR(20),
ADD COLUMN IF NOT EXISTS price_updated_at TIMESTAMP;

-- Create index for tracking enabled products
CREATE INDEX IF NOT EXISTS idx_products_tracking
ON products(competitor_tracking_enabled, status)
WHERE competitor_tracking_enabled = true;

-- Competitor configurations table
CREATE TABLE IF NOT EXISTS competitor_configs (
  id SERIAL PRIMARY KEY,
  competitor_name VARCHAR(100) NOT NULL UNIQUE,
  competitor_domain VARCHAR(255),
  competitor_url_template TEXT,
  requires_scraping BOOLEAN DEFAULT false,
  api_enabled BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 1,
  enabled BOOLEAN DEFAULT true,
  scraping_selectors JSONB,
  rate_limit_per_hour INTEGER DEFAULT 1000,
  timeout_seconds INTEGER DEFAULT 30,
  retry_attempts INTEGER DEFAULT 3,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for active competitors
CREATE INDEX IF NOT EXISTS idx_competitor_configs_active
ON competitor_configs(priority, enabled)
WHERE enabled = true;

COMMENT ON TABLE competitor_configs IS 'Configuration for competitor price monitoring sources';
COMMENT ON COLUMN competitor_configs.scraping_selectors IS 'JSONB containing CSS selectors for web scraping: {price, title, stock, currency, rating, reviews}';

-- Competitor price history table
CREATE TABLE IF NOT EXISTS competitor_price_history (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  competitor VARCHAR(100) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  url TEXT,
  product_title TEXT,
  in_stock BOOLEAN DEFAULT true,
  match_score DECIMAL(3,2) CHECK (match_score >= 0 AND match_score <= 1),
  rating DECIMAL(3,2),
  review_count INTEGER,
  shipping_cost DECIMAL(10,2),
  prime_available BOOLEAN,
  raw_data JSONB,
  scraped_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(product_id, competitor, scraped_at::date)
);

-- Indexes for price history
CREATE INDEX IF NOT EXISTS idx_competitor_price_history_product_date
ON competitor_price_history(product_id, scraped_at DESC);

CREATE INDEX IF NOT EXISTS idx_competitor_price_history_competitor_date
ON competitor_price_history(competitor, scraped_at DESC);

CREATE INDEX IF NOT EXISTS idx_competitor_price_history_price
ON competitor_price_history(product_id, price);

COMMENT ON TABLE competitor_price_history IS 'Historical record of competitor prices for tracked products';
COMMENT ON COLUMN competitor_price_history.match_score IS 'Confidence score (0-1) that competitor product matches our product';

-- Pricing recommendations table
CREATE TABLE IF NOT EXISTS pricing_recommendations (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  recommendation_type VARCHAR(50) NOT NULL CHECK (
    recommendation_type IN (
      'price_match',
      'margin_protection',
      'opportunity_pricing',
      'competitive_adjustment',
      'premium_opportunity'
    )
  ),
  priority VARCHAR(20) NOT NULL CHECK (
    priority IN ('critical', 'high', 'medium', 'low')
  ),
  current_price DECIMAL(10,2) NOT NULL,
  recommended_price DECIMAL(10,2) NOT NULL,
  price_change_amount DECIMAL(10,2),
  price_change_percent DECIMAL(5,2),
  new_margin DECIMAL(5,2),
  current_margin DECIMAL(5,2),
  reason TEXT NOT NULL,
  expected_impact TEXT,
  requires_approval BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'pending' CHECK (
    status IN ('pending', 'approved', 'rejected', 'applied', 'expired')
  ),
  competitor_data JSONB,
  approved_by INTEGER REFERENCES users(id),
  approved_at TIMESTAMP,
  rejected_by INTEGER REFERENCES users(id),
  rejected_at TIMESTAMP,
  rejection_reason TEXT,
  applied_at TIMESTAMP,
  expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for recommendations
CREATE INDEX IF NOT EXISTS idx_pricing_recommendations_status
ON pricing_recommendations(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pricing_recommendations_product
ON pricing_recommendations(product_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pricing_recommendations_priority
ON pricing_recommendations(priority, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pricing_recommendations_expires
ON pricing_recommendations(expires_at)
WHERE status = 'pending';

COMMENT ON TABLE pricing_recommendations IS 'AI-generated pricing recommendations based on competitor analysis';
COMMENT ON COLUMN pricing_recommendations.expires_at IS 'Recommendation expires after 7 days if not acted upon';

-- Pricing analysis summary table
CREATE TABLE IF NOT EXISTS pricing_analysis_summary (
  id SERIAL PRIMARY KEY,
  report_date DATE NOT NULL UNIQUE,
  total_products_tracked INTEGER NOT NULL DEFAULT 0,
  products_with_competitor_data INTEGER NOT NULL DEFAULT 0,
  total_recommendations INTEGER NOT NULL DEFAULT 0,
  urgent_alerts INTEGER NOT NULL DEFAULT 0,
  pending_approvals INTEGER NOT NULL DEFAULT 0,

  -- Price position breakdown (JSONB)
  price_positions JSONB,

  -- Recommendations by type (JSONB)
  recommendations_by_type JSONB,

  -- Alerts by severity (JSONB)
  alerts_by_severity JSONB,

  -- Market insights (JSONB)
  market_insights JSONB,

  -- Execution metadata
  execution_time_seconds INTEGER,
  api_calls_made INTEGER,
  scraping_success_rate DECIMAL(5,2),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pricing_analysis_date
ON pricing_analysis_summary(report_date DESC);

COMMENT ON TABLE pricing_analysis_summary IS 'Daily summary of pricing analysis and recommendations';

-- Price change audit log
CREATE TABLE IF NOT EXISTS price_change_audit (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  recommendation_id INTEGER REFERENCES pricing_recommendations(id),
  old_price DECIMAL(10,2) NOT NULL,
  new_price DECIMAL(10,2) NOT NULL,
  price_change_percent DECIMAL(5,2),
  change_type VARCHAR(50),
  reason TEXT,
  changed_by INTEGER REFERENCES users(id),
  automated BOOLEAN DEFAULT false,
  competitor_triggered BOOLEAN DEFAULT false,
  competitor_reference VARCHAR(100),
  sales_impact_7d JSONB,
  sales_impact_30d JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_price_change_audit_product
ON price_change_audit(product_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_price_change_audit_date
ON price_change_audit(created_at DESC);

COMMENT ON TABLE price_change_audit IS 'Audit trail of all price changes including automated and manual';

-- ============================================================================
-- PART 2: Initial Data Seeding
-- ============================================================================

-- Insert default competitor configurations
INSERT INTO competitor_configs
  (competitor_name, competitor_domain, competitor_url_template, requires_scraping, api_enabled, priority, scraping_selectors)
VALUES
  -- API-based competitors (handled by dedicated API nodes)
  (
    'Amazon',
    'amazon.com',
    'https://www.amazon.com/s?k={search_query}',
    false,
    true,
    1,
    NULL
  ),
  (
    'Walmart',
    'walmart.com',
    'https://www.walmart.com/search?q={search_query}',
    false,
    true,
    2,
    NULL
  ),
  (
    'Target',
    'target.com',
    'https://www.target.com/s?searchTerm={search_query}',
    false,
    true,
    3,
    NULL
  ),

  -- Direct competitors requiring web scraping
  (
    'Best Buy',
    'bestbuy.com',
    'https://www.bestbuy.com/site/searchpage.jsp?st={search_query}',
    true,
    false,
    4,
    '{
      "price": ".priceView-hero-price span, .priceView-customer-price span",
      "title": ".sku-header h1, .sku-title h1",
      "stock": ".fulfillment-add-to-cart-button, .add-to-cart-button",
      "rating": ".c-reviews-v4 .sr-only",
      "reviews": ".c-reviews-v4 .c-total-reviews",
      "stock_available_text": ["Add to Cart", "Pick Up Today"],
      "stock_unavailable_text": ["Sold Out", "Coming Soon"]
    }'::jsonb
  ),
  (
    'Newegg',
    'newegg.com',
    'https://www.newegg.com/p/pl?d={search_query}',
    true,
    false,
    5,
    '{
      "price": ".price-current strong, .price-current-label",
      "title": ".item-title",
      "stock": ".item-button-area button, .item-buy-box",
      "rating": ".item-rating i",
      "reviews": ".item-rating-num",
      "stock_available_text": ["ADD TO CART", "Add to cart"],
      "stock_unavailable_text": ["OUT OF STOCK", "Deactivated"]
    }'::jsonb
  ),
  (
    'B&H Photo',
    'bhphotovideo.com',
    'https://www.bhphotovideo.com/c/search?Ntt={search_query}',
    true,
    false,
    6,
    '{
      "price": "[data-selenium=\"pricePrimary\"], .price_1pXO6",
      "title": "[data-selenium=\"itemTitle\"], .itemHeading_F6Okm",
      "stock": "[data-selenium=\"addToCartButton\"]",
      "rating": "[data-selenium=\"ratingStars\"]",
      "reviews": "[data-selenium=\"reviewsLink\"]",
      "stock_available_text": ["Add to Cart", "Add to Basket"],
      "stock_unavailable_text": ["Temporarily Unavailable", "Backordered"]
    }'::jsonb
  ),
  (
    'eBay',
    'ebay.com',
    'https://www.ebay.com/sch/i.html?_nkw={search_query}',
    true,
    false,
    7,
    '{
      "price": ".s-item__price, .x-price-primary",
      "title": ".s-item__title",
      "stock": ".s-item__purchase-options",
      "rating": ".x-star-rating",
      "reviews": ".s-item__reviews-count",
      "stock_available_text": ["Buy It Now"],
      "stock_unavailable_text": ["Out of stock"]
    }'::jsonb
  )
ON CONFLICT (competitor_name) DO NOTHING;

-- ============================================================================
-- PART 3: Helper Functions
-- ============================================================================

-- Function to calculate product margin
CREATE OR REPLACE FUNCTION calculate_product_margin(
  p_price DECIMAL,
  p_cost DECIMAL
)
RETURNS DECIMAL AS $$
BEGIN
  IF p_price <= 0 THEN
    RETURN 0;
  END IF;
  RETURN ROUND(((p_price - p_cost) / p_price), 4);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get current competitor pricing for a product
CREATE OR REPLACE FUNCTION get_current_competitor_prices(p_product_id INTEGER)
RETURNS TABLE (
  competitor VARCHAR,
  price DECIMAL,
  in_stock BOOLEAN,
  scraped_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (cph.competitor)
    cph.competitor,
    cph.price,
    cph.in_stock,
    cph.scraped_at
  FROM competitor_price_history cph
  WHERE cph.product_id = p_product_id
    AND cph.scraped_at >= CURRENT_DATE - INTERVAL '7 days'
  ORDER BY cph.competitor, cph.scraped_at DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get price history trend
CREATE OR REPLACE FUNCTION get_price_trend(
  p_product_id INTEGER,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  date DATE,
  our_price DECIMAL,
  avg_competitor_price DECIMAL,
  min_competitor_price DECIMAL,
  max_competitor_price DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH price_data AS (
    SELECT
      cph.scraped_at::date as price_date,
      AVG(cph.price) as avg_price,
      MIN(cph.price) as min_price,
      MAX(cph.price) as max_price
    FROM competitor_price_history cph
    WHERE cph.product_id = p_product_id
      AND cph.scraped_at >= CURRENT_DATE - p_days
      AND cph.in_stock = true
    GROUP BY cph.scraped_at::date
  ),
  our_prices AS (
    SELECT
      pca.created_at::date as price_date,
      pca.new_price as our_price
    FROM price_change_audit pca
    WHERE pca.product_id = p_product_id
      AND pca.created_at >= CURRENT_DATE - p_days
  )
  SELECT
    d.date,
    COALESCE(op.our_price, p.current_price) as our_price,
    pd.avg_price,
    pd.min_price,
    pd.max_price
  FROM generate_series(
    CURRENT_DATE - p_days,
    CURRENT_DATE,
    '1 day'::interval
  ) d(date)
  LEFT JOIN price_data pd ON pd.price_date = d.date
  LEFT JOIN our_prices op ON op.price_date = d.date
  CROSS JOIN (SELECT current_price FROM products WHERE id = p_product_id) p
  ORDER BY d.date;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to expire old recommendations
CREATE OR REPLACE FUNCTION expire_old_recommendations()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE pricing_recommendations
  SET
    status = 'expired',
    updated_at = CURRENT_TIMESTAMP
  WHERE status = 'pending'
    AND expires_at < CURRENT_TIMESTAMP;

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 4: Views for Analysis
-- ============================================================================

-- View: Current competitive position
CREATE OR REPLACE VIEW v_competitive_position AS
SELECT
  p.id,
  p.sku,
  p.name,
  p.current_price,
  p.cost_price,
  calculate_product_margin(p.current_price, p.cost_price) as current_margin,
  p.target_margin,
  comp.competitor_count,
  comp.avg_competitor_price,
  comp.min_competitor_price,
  comp.max_competitor_price,
  CASE
    WHEN comp.min_competitor_price IS NULL THEN 'unknown'
    WHEN p.current_price < comp.min_competitor_price * 0.95 THEN 'significantly_lower'
    WHEN p.current_price <= comp.min_competitor_price * 1.05 THEN 'competitive'
    WHEN p.current_price <= comp.min_competitor_price * 1.15 THEN 'slightly_higher'
    ELSE 'significantly_higher'
  END as price_position,
  CASE
    WHEN comp.min_competitor_price IS NOT NULL THEN
      ROUND(((p.current_price - comp.min_competitor_price) / comp.min_competitor_price * 100)::numeric, 2)
    ELSE NULL
  END as price_diff_percent,
  comp.out_of_stock_count,
  comp.last_checked
FROM products p
LEFT JOIN (
  SELECT
    product_id,
    COUNT(DISTINCT competitor) as competitor_count,
    AVG(price) as avg_competitor_price,
    MIN(price) as min_competitor_price,
    MAX(price) as max_competitor_price,
    COUNT(*) FILTER (WHERE in_stock = false) as out_of_stock_count,
    MAX(scraped_at) as last_checked
  FROM competitor_price_history
  WHERE scraped_at >= CURRENT_DATE - INTERVAL '7 days'
  GROUP BY product_id
) comp ON p.id = comp.product_id
WHERE p.competitor_tracking_enabled = true
  AND p.status = 'active';

-- View: Pending pricing actions
CREATE OR REPLACE VIEW v_pending_pricing_actions AS
SELECT
  pr.id as recommendation_id,
  p.id as product_id,
  p.sku,
  p.name,
  pr.recommendation_type,
  pr.priority,
  pr.current_price,
  pr.recommended_price,
  pr.price_change_percent,
  pr.new_margin,
  pr.reason,
  pr.requires_approval,
  pr.expires_at,
  DATE_PART('day', pr.expires_at - CURRENT_TIMESTAMP) as days_until_expiry,
  pr.created_at
FROM pricing_recommendations pr
JOIN products p ON pr.product_id = p.id
WHERE pr.status = 'pending'
  AND pr.expires_at > CURRENT_TIMESTAMP
ORDER BY
  CASE pr.priority
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    WHEN 'low' THEN 4
  END,
  pr.created_at DESC;

-- View: Daily pricing metrics
CREATE OR REPLACE VIEW v_daily_pricing_metrics AS
SELECT
  pas.report_date,
  pas.total_products_tracked,
  pas.products_with_competitor_data,
  ROUND(
    (pas.products_with_competitor_data::numeric / NULLIF(pas.total_products_tracked, 0) * 100),
    2
  ) as data_coverage_percent,
  pas.total_recommendations,
  pas.urgent_alerts,
  pas.pending_approvals,
  (pas.price_positions->>'competitive')::int as competitive_count,
  (pas.price_positions->>'significantly_higher')::int as overpriced_count,
  (pas.price_positions->>'significantly_lower')::int as underpriced_count,
  (pas.recommendations_by_type->>'price_match')::int as price_match_recommendations,
  (pas.recommendations_by_type->>'margin_protection')::int as margin_protection_recommendations,
  (pas.market_insights->>'avg_price_difference')::numeric as avg_price_difference,
  pas.execution_time_seconds,
  pas.scraping_success_rate
FROM pricing_analysis_summary pas
ORDER BY pas.report_date DESC;

-- ============================================================================
-- PART 5: Triggers for Automation
-- ============================================================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply timestamp triggers
DROP TRIGGER IF EXISTS update_competitor_configs_updated_at ON competitor_configs;
CREATE TRIGGER update_competitor_configs_updated_at
  BEFORE UPDATE ON competitor_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_competitor_price_history_updated_at ON competitor_price_history;
CREATE TRIGGER update_competitor_price_history_updated_at
  BEFORE UPDATE ON competitor_price_history
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pricing_recommendations_updated_at ON pricing_recommendations;
CREATE TRIGGER update_pricing_recommendations_updated_at
  BEFORE UPDATE ON pricing_recommendations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-expire recommendations trigger
CREATE OR REPLACE FUNCTION check_recommendation_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'pending' AND NEW.expires_at < CURRENT_TIMESTAMP THEN
    NEW.status = 'expired';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_recommendation_expiry_trigger ON pricing_recommendations;
CREATE TRIGGER check_recommendation_expiry_trigger
  BEFORE INSERT OR UPDATE ON pricing_recommendations
  FOR EACH ROW EXECUTE FUNCTION check_recommendation_expiry();

-- ============================================================================
-- PART 6: Sample Queries for Testing
-- ============================================================================

-- Enable tracking for top products
/*
UPDATE products
SET
  competitor_tracking_enabled = true,
  min_price = GREATEST(cost_price * 1.10, 1.00),
  max_price = current_price * 1.50,
  target_margin = 0.25
WHERE status = 'active'
  AND stock_quantity > 0
  AND (
    sales_rank <= 100
    OR category_id IN (SELECT id FROM categories WHERE name IN ('Electronics', 'Home & Garden'))
  );
*/

-- View competitive position summary
/*
SELECT
  price_position,
  COUNT(*) as product_count,
  AVG(price_diff_percent) as avg_price_diff,
  AVG(current_margin) as avg_margin
FROM v_competitive_position
GROUP BY price_position
ORDER BY
  CASE price_position
    WHEN 'significantly_lower' THEN 1
    WHEN 'competitive' THEN 2
    WHEN 'slightly_higher' THEN 3
    WHEN 'significantly_higher' THEN 4
    ELSE 5
  END;
*/

-- Find opportunities (competitors out of stock)
/*
SELECT
  p.name,
  p.sku,
  p.current_price,
  vcp.competitor_count,
  vcp.out_of_stock_count,
  vcp.avg_competitor_price
FROM v_competitive_position vcp
JOIN products p ON vcp.id = p.id
WHERE vcp.out_of_stock_count >= (vcp.competitor_count * 0.5)
  AND vcp.competitor_count >= 2
ORDER BY vcp.out_of_stock_count DESC, p.current_price DESC
LIMIT 20;
*/

-- ============================================================================
-- PART 7: Grants and Permissions
-- ============================================================================

-- Grant appropriate permissions (adjust user/role as needed)
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO n8n_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO n8n_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO n8n_user;

-- ============================================================================
-- PART 8: Maintenance Tasks
-- ============================================================================

-- Schedule these tasks via cron or pg_cron

-- Daily: Expire old recommendations
-- SELECT expire_old_recommendations();

-- Weekly: Vacuum and analyze pricing tables
-- VACUUM ANALYZE competitor_price_history;
-- VACUUM ANALYZE pricing_recommendations;

-- Monthly: Archive old price history (older than 6 months)
/*
CREATE TABLE IF NOT EXISTS competitor_price_history_archive (
  LIKE competitor_price_history INCLUDING ALL
);

INSERT INTO competitor_price_history_archive
SELECT * FROM competitor_price_history
WHERE scraped_at < CURRENT_DATE - INTERVAL '6 months';

DELETE FROM competitor_price_history
WHERE scraped_at < CURRENT_DATE - INTERVAL '6 months';
*/

-- ============================================================================
-- Setup Complete
-- ============================================================================

SELECT 'Database setup complete!' as status,
       (SELECT COUNT(*) FROM competitor_configs WHERE enabled = true) as active_competitors,
       (SELECT COUNT(*) FROM products WHERE competitor_tracking_enabled = true) as tracked_products;
