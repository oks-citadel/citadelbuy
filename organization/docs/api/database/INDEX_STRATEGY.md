# CitadelBuy Database Index Strategy

## Overview

This document outlines the comprehensive indexing strategy for CitadelBuy's PostgreSQL database. The indexes defined in the Prisma schema and migration files are designed to optimize query performance for common access patterns.

## Index Types

### 1. Single-Column Indexes

Optimize queries filtering on a single column.

**Example**:
```prisma
@@index([status])
@@index([createdAt])
```

**SQL**:
```sql
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_created_at ON products(created_at);
```

**Use cases**:
- Filtering by status: `WHERE status = 'ACTIVE'`
- Ordering by date: `ORDER BY created_at DESC`

### 2. Composite Indexes

Optimize queries filtering on multiple columns. Order matters!

**Example**:
```prisma
@@index([vendorId, status, createdAt])
```

**SQL**:
```sql
CREATE INDEX idx_products_vendor_status_created ON products(vendor_id, status, created_at DESC);
```

**Use cases**:
- Vendor's active products: `WHERE vendor_id = '...' AND status = 'ACTIVE'`
- Vendor's products sorted by date: `WHERE vendor_id = '...' ORDER BY created_at DESC`

**Index column order**:
1. Equality filters first (`vendorId`)
2. Range filters second (`status`)
3. Sort columns last (`createdAt`)

### 3. Partial Indexes

Index only a subset of rows, reducing index size and improving performance.

**Example**:
```sql
CREATE INDEX idx_active_products ON products(category_id, created_at DESC)
WHERE status = 'ACTIVE';
```

**Benefits**:
- Smaller index size
- Faster queries for common filters
- Lower maintenance overhead

**Use cases**:
- Active products only
- Unread notifications
- Pending orders

### 4. Covering Indexes (INCLUDE)

Include frequently accessed columns in the index to avoid table lookups.

**Example**:
```sql
CREATE INDEX idx_products_search_covering
ON products(category_id, created_at DESC)
INCLUDE (name, price, stock, images);
```

**Benefits**:
- Index-only scans (no table access needed)
- Significant performance improvement for list views

**Trade-offs**:
- Larger index size
- Slower writes
- Use for read-heavy tables only

### 5. GIN Indexes

Optimize queries on array and JSON columns.

**Example**:
```sql
CREATE INDEX idx_products_tags_gin ON products USING GIN(tags);
```

**Use cases**:
- Array containment: `WHERE tags @> ARRAY['electronics']`
- Full-text search
- JSONB queries

### 6. Unique Indexes

Enforce uniqueness and optimize equality lookups.

**Example**:
```prisma
@@unique([email])
@@unique([userId, productId])
```

**SQL**:
```sql
CREATE UNIQUE INDEX users_email_unique ON users(email);
CREATE UNIQUE INDEX reviews_user_product_unique ON reviews(user_id, product_id);
```

## Index Naming Convention

**Pattern**: `idx_{table}_{columns}_{condition}`

**Examples**:
- `idx_products_vendor_status` - Composite index on vendor_id and status
- `idx_active_products_category` - Partial index for active products by category
- `idx_orders_user_created` - User orders sorted by creation date

## Common Query Patterns and Indexes

### Products

**Query**: Find products by category with pagination
```sql
SELECT * FROM products
WHERE category_id = '...' AND status = 'ACTIVE'
ORDER BY created_at DESC
LIMIT 20 OFFSET 0;
```

**Index**:
```sql
CREATE INDEX idx_products_category_status_created
ON products(category_id, status, created_at DESC);
```

### Orders

**Query**: User's order history
```sql
SELECT * FROM orders
WHERE user_id = '...'
ORDER BY created_at DESC;
```

**Index**:
```sql
CREATE INDEX idx_orders_user_created
ON orders(user_id, created_at DESC);
```

**Query**: Admin order management
```sql
SELECT * FROM orders
WHERE status = 'PENDING'
ORDER BY created_at DESC;
```

**Index**:
```sql
CREATE INDEX idx_orders_status_created
ON orders(status, created_at DESC);
```

### Reviews

**Query**: Product reviews with status filtering
```sql
SELECT * FROM reviews
WHERE product_id = '...' AND status = 'APPROVED'
ORDER BY created_at DESC;
```

**Index**:
```sql
CREATE INDEX idx_reviews_product_status_created
ON reviews(product_id, status, created_at DESC);
```

### Carts

**Query**: Active cart for user
```sql
SELECT * FROM carts
WHERE user_id = '...' AND is_abandoned = false
ORDER BY last_activity_at DESC;
```

**Index**:
```sql
CREATE INDEX idx_carts_user_active
ON carts(user_id, last_activity_at DESC)
WHERE user_id IS NOT NULL;
```

## Index Maintenance

### Monitoring Index Usage

```sql
-- Find unused indexes
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(indexrelid) DESC;
```

### Checking Index Bloat

```sql
-- Estimate index bloat percentage
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
ORDER BY pg_relation_size(indexrelid) DESC;
```

### Reindexing

```sql
-- Reindex a specific index (locks table)
REINDEX INDEX idx_products_vendor_status;

-- Reindex without locking (PostgreSQL 12+)
REINDEX INDEX CONCURRENTLY idx_products_vendor_status;

-- Reindex entire table
REINDEX TABLE products;
```

## Index Performance Guidelines

### When to Add Indexes

✅ **DO** add indexes for:
- Foreign key columns (vendorId, userId, categoryId)
- Columns frequently used in WHERE clauses
- Columns used in ORDER BY
- Columns used in JOIN conditions
- Unique constraints

❌ **DON'T** add indexes for:
- Small tables (< 1000 rows)
- Columns with low cardinality (few distinct values)
- Columns rarely queried
- Temporary or staging tables

### Index Trade-offs

**Benefits**:
- ⚡ Faster SELECT queries
- ⚡ Faster JOIN operations
- ⚡ Faster sorting (ORDER BY)
- ⚡ Unique constraint enforcement

**Costs**:
- 💾 Additional storage (10-15% of table size)
- 🐌 Slower INSERT/UPDATE/DELETE
- 🔧 Maintenance overhead (VACUUM, REINDEX)

### Optimizing for Read vs Write

**Read-heavy tables** (products, categories):
- More indexes acceptable
- Consider covering indexes
- Use partial indexes for common filters

**Write-heavy tables** (audit logs, events):
- Minimal indexes only
- Avoid covering indexes
- Batch writes when possible

## Prisma Schema Index Declarations

The Prisma schema includes index declarations using `@@index` directives:

```prisma
model Product {
  id          String   @id @default(uuid())
  name        String
  slug        String   @unique
  description String
  price       Float
  images      String[]
  stock       Int      @default(0)
  vendorId    String
  categoryId  String
  status      String   @default("ACTIVE")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  vendor   User     @relation(fields: [vendorId], references: [id])
  category Category @relation(fields: [categoryId], references: [id])

  // Indexes
  @@index([vendorId])                           // Vendor's products
  @@index([categoryId])                         // Category browsing
  @@index([status])                             // Status filtering
  @@index([slug])                               // URL lookups
  @@index([vendorId, createdAt])                // Vendor's latest products
  @@index([categoryId, createdAt])              // Category latest products
  @@index([vendorId, status, createdAt])        // Vendor's active products
  @@index([categoryId, status, createdAt])      // Category active products

  @@map("products")
}
```

## Migration Strategy

### Adding Indexes

1. **Test on replica/staging first**
2. **Use CONCURRENTLY** to avoid locks:
   ```sql
   CREATE INDEX CONCURRENTLY idx_name ON table(column);
   ```
3. **Monitor performance impact**
4. **Apply to production during low traffic**

### Removing Indexes

1. **Verify index is unused**:
   ```sql
   SELECT idx_scan FROM pg_stat_user_indexes WHERE indexrelname = 'idx_name';
   ```
2. **Drop during maintenance window**:
   ```sql
   DROP INDEX CONCURRENTLY idx_name;
   ```

## Performance Testing

### Before Adding Index

```sql
-- Explain query plan
EXPLAIN ANALYZE
SELECT * FROM products
WHERE vendor_id = '...' AND status = 'ACTIVE'
ORDER BY created_at DESC
LIMIT 20;
```

**Look for**:
- Seq Scan (table scan - bad for large tables)
- High cost estimate
- Long execution time

### After Adding Index

```sql
-- Verify index is used
EXPLAIN ANALYZE
SELECT * FROM products
WHERE vendor_id = '...' AND status = 'ACTIVE'
ORDER BY created_at DESC
LIMIT 20;
```

**Look for**:
- Index Scan or Index Only Scan
- Lower cost estimate
- Faster execution time

## Index Strategy by Table

### High-Priority Tables (frequent queries)

**products**:
- vendorId, categoryId (foreign keys)
- status (filtering)
- vendorId + status + createdAt (composite)
- tags (GIN for array search)

**orders**:
- userId (foreign key)
- status (filtering)
- userId + status + createdAt (composite)
- trackingNumber (tracking lookups)

**reviews**:
- productId, userId (foreign keys)
- status (filtering)
- productId + status + createdAt (composite)

**carts**:
- userId, sessionId (lookups)
- isAbandoned (cart recovery)
- lastActivityAt (expiration)

### Medium-Priority Tables (moderate queries)

**vendors**, **subscriptions**, **coupons**, **deals**

### Low-Priority Tables (rare queries)

**audit_logs**, **email_logs**, **tracking_events**

## Conclusion

This index strategy balances query performance with write overhead and storage costs. Regular monitoring and adjustment based on actual usage patterns is essential for optimal database performance.

### Key Takeaways

1. **Index foreign keys** - Always index columns used in JOINs
2. **Composite indexes** - Order columns by selectivity (equality → range → sort)
3. **Partial indexes** - Use for common filtered queries
4. **Monitor usage** - Remove unused indexes
5. **Test impact** - Always test on staging before production
6. **Use CONCURRENTLY** - Avoid locking production tables

---

**Document Version**: 1.0
**Last Updated**: December 2025
**Next Review**: March 2026
