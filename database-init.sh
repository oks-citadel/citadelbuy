#!/bin/bash
# Database Initialization Script
# This script runs when the PostgreSQL container is first created

set -e

echo "🗄️  Initializing Commerce Platform Database..."

# Create extensions
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Enable UUID generation
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    
    -- Enable full-text search
    CREATE EXTENSION IF NOT EXISTS "pg_trgm";
    
    -- Enable PostGIS for geospatial data (optional)
    -- CREATE EXTENSION IF NOT EXISTS "postgis";
    
    -- Enable hstore for key-value storage
    CREATE EXTENSION IF NOT EXISTS "hstore";
    
    -- Create schemas
    CREATE SCHEMA IF NOT EXISTS commerce;
    CREATE SCHEMA IF NOT EXISTS analytics;
    CREATE SCHEMA IF NOT EXISTS audit;
    
    -- Set default search path
    ALTER DATABASE ${POSTGRES_DB} SET search_path TO commerce, public;
EOSQL

echo "✅ Extensions and schemas created successfully"

# Create roles
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create application role
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'app_user') THEN
            CREATE ROLE app_user WITH LOGIN PASSWORD 'app_password_change_me';
        END IF;
    END
    \$\$;
    
    -- Create read-only role for analytics
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'analytics_user') THEN
            CREATE ROLE analytics_user WITH LOGIN PASSWORD 'analytics_password';
        END IF;
    END
    \$\$;
    
    -- Grant permissions
    GRANT CONNECT ON DATABASE ${POSTGRES_DB} TO app_user;
    GRANT USAGE ON SCHEMA commerce TO app_user;
    GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA commerce TO app_user;
    GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA commerce TO app_user;
    ALTER DEFAULT PRIVILEGES IN SCHEMA commerce GRANT ALL ON TABLES TO app_user;
    ALTER DEFAULT PRIVILEGES IN SCHEMA commerce GRANT ALL ON SEQUENCES TO app_user;
    
    -- Grant read-only to analytics user
    GRANT CONNECT ON DATABASE ${POSTGRES_DB} TO analytics_user;
    GRANT USAGE ON SCHEMA commerce, analytics TO analytics_user;
    GRANT SELECT ON ALL TABLES IN SCHEMA commerce, analytics TO analytics_user;
    ALTER DEFAULT PRIVILEGES IN SCHEMA commerce, analytics GRANT SELECT ON TABLES TO analytics_user;
EOSQL

echo "✅ Roles and permissions configured successfully"

# Create core tables
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    SET search_path TO commerce;
    
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        role VARCHAR(50) DEFAULT 'customer',
        status VARCHAR(50) DEFAULT 'active',
        email_verified BOOLEAN DEFAULT FALSE,
        phone VARCHAR(20),
        avatar_url TEXT,
        preferences JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_login_at TIMESTAMP WITH TIME ZONE,
        deleted_at TIMESTAMP WITH TIME ZONE
    );
    
    -- Products table
    CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        sku VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        short_description TEXT,
        price_usd DECIMAL(10,2) NOT NULL,
        cost_usd DECIMAL(10,2),
        stock_quantity INTEGER DEFAULT 0,
        low_stock_threshold INTEGER DEFAULT 10,
        weight_kg DECIMAL(10,3),
        dimensions JSONB,
        images JSONB DEFAULT '[]',
        category_id UUID,
        brand VARCHAR(100),
        tags TEXT[],
        attributes JSONB DEFAULT '{}',
        seo_title VARCHAR(255),
        seo_description TEXT,
        seo_keywords TEXT[],
        status VARCHAR(50) DEFAULT 'draft',
        featured BOOLEAN DEFAULT FALSE,
        views_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        published_at TIMESTAMP WITH TIME ZONE,
        deleted_at TIMESTAMP WITH TIME ZONE
    );
    
    -- Categories table
    CREATE TABLE IF NOT EXISTS categories (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        parent_id UUID REFERENCES categories(id),
        level INTEGER DEFAULT 0,
        position INTEGER DEFAULT 0,
        image_url TEXT,
        icon VARCHAR(100),
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Orders table
    CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        order_number VARCHAR(50) UNIQUE NOT NULL,
        user_id UUID REFERENCES users(id),
        status VARCHAR(50) DEFAULT 'pending',
        subtotal DECIMAL(10,2) NOT NULL,
        tax_amount DECIMAL(10,2) DEFAULT 0,
        shipping_amount DECIMAL(10,2) DEFAULT 0,
        discount_amount DECIMAL(10,2) DEFAULT 0,
        total_amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        payment_method VARCHAR(50),
        payment_status VARCHAR(50) DEFAULT 'pending',
        shipping_address JSONB,
        billing_address JSONB,
        notes TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        paid_at TIMESTAMP WITH TIME ZONE,
        shipped_at TIMESTAMP WITH TIME ZONE,
        delivered_at TIMESTAMP WITH TIME ZONE,
        cancelled_at TIMESTAMP WITH TIME ZONE
    );
    
    -- Order items table
    CREATE TABLE IF NOT EXISTS order_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
        product_id UUID REFERENCES products(id),
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        sku VARCHAR(100),
        name VARCHAR(255),
        attributes JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Payments table
    CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        order_id UUID REFERENCES orders(id),
        gateway VARCHAR(50) NOT NULL,
        transaction_id VARCHAR(255),
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        status VARCHAR(50) DEFAULT 'pending',
        payment_method VARCHAR(50),
        card_last4 VARCHAR(4),
        card_brand VARCHAR(50),
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP WITH TIME ZONE,
        refunded_at TIMESTAMP WITH TIME ZONE
    );
    
    -- Create indexes for performance
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
    CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
    CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
    CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
    CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
    CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
    CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
    CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
    
    -- Full-text search indexes
    CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin(name gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS idx_products_description_trgm ON products USING gin(description gin_trgm_ops);
    
    -- Create updated_at trigger function
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS \$\$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    \$\$ language 'plpgsql';
    
    -- Apply trigger to tables
    CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EOSQL

echo "✅ Core tables and indexes created successfully"

# Create analytics views
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    SET search_path TO analytics;
    
    -- Daily sales view
    CREATE OR REPLACE VIEW daily_sales AS
    SELECT 
        DATE(created_at) as date,
        COUNT(*) as order_count,
        SUM(total_amount) as total_revenue,
        AVG(total_amount) as average_order_value,
        COUNT(DISTINCT user_id) as unique_customers
    FROM commerce.orders
    WHERE status = 'completed'
    GROUP BY DATE(created_at);
    
    -- Product performance view
    CREATE OR REPLACE VIEW product_performance AS
    SELECT 
        p.id,
        p.name,
        p.sku,
        COUNT(oi.id) as times_ordered,
        SUM(oi.quantity) as units_sold,
        SUM(oi.total_price) as total_revenue
    FROM commerce.products p
    LEFT JOIN commerce.order_items oi ON p.id = oi.product_id
    GROUP BY p.id, p.name, p.sku;
EOSQL

echo "✅ Analytics views created successfully"

echo "🎉 Database initialization completed!"
echo ""
echo "Database: ${POSTGRES_DB}"
echo "User: ${POSTGRES_USER}"
echo "Extensions: uuid-ossp, pg_trgm, hstore"
echo "Schemas: commerce, analytics, audit"
echo ""
echo "Ready to accept connections!"
