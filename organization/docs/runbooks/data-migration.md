# Data Migration Runbook

**Version**: 1.0.0
**Last Updated**: 2025-12-06
**Owner**: Database Team

## Pre-Migration Checklist

- [ ] Database backup completed and verified
- [ ] Migration tested in staging environment
- [ ] Rollback plan documented
- [ ] Maintenance window scheduled
- [ ] Stakeholders notified
- [ ] On-call engineer available

## Zero-Downtime Migration Strategy

### Step 1: Create New Column (Safe)

```sql
-- Add new column (nullable initially)
ALTER TABLE "Product" ADD COLUMN new_price_cents INTEGER;

-- Add index if needed
CREATE INDEX CONCURRENTLY idx_products_new_price ON "Product"(new_price_cents);
```

### Step 2: Deploy Dual-Write Code

Update application to write to both old and new columns:

```typescript
// Both columns updated simultaneously
await prisma.product.update({
  where: { id },
  data: {
    price: newPrice, // Old column
    new_price_cents: Math.round(newPrice * 100), // New column
  },
});
```

### Step 3: Backfill Data in Batches

```sql
-- Backfill in batches to avoid locking
DO $$
DECLARE
  batch_size INTEGER := 1000;
  processed INTEGER := 0;
BEGIN
  LOOP
    WITH batch AS (
      SELECT id FROM "Product"
      WHERE new_price_cents IS NULL
      LIMIT batch_size
    )
    UPDATE "Product"
    SET new_price_cents = (price * 100)::INTEGER
    WHERE id IN (SELECT id FROM batch);

    GET DIAGNOSTICS processed = ROW_COUNT;
    EXIT WHEN processed = 0;

    RAISE NOTICE 'Processed batch, total rows: %', processed;
    PERFORM pg_sleep(0.1); -- Prevent lock contention
  END LOOP;
END $$;
```

### Step 4: Verify Data Integrity

```sql
-- Check for nulls
SELECT COUNT(*) FROM "Product" WHERE new_price_cents IS NULL;

-- Verify conversion
SELECT id, price, new_price_cents,
  (price * 100)::INTEGER = new_price_cents AS is_correct
FROM "Product"
WHERE (price * 100)::INTEGER != new_price_cents
LIMIT 100;
```

### Step 5: Make Column NOT NULL

```sql
-- Add constraint
ALTER TABLE "Product" ALTER COLUMN new_price_cents SET NOT NULL;
```

### Step 6: Deploy Read-from-New Code

Update application to read from new column:

```typescript
const product = await prisma.product.findUnique({
  where: { id },
  select: {
    id: true,
    name: true,
    new_price_cents: true, // Read from new column
  },
});

// Convert cents to dollars for display
const priceInDollars = product.new_price_cents / 100;
```

### Step 7: Drop Old Column (After Verification)

```sql
-- Wait 7 days, then remove old column
ALTER TABLE "Product" DROP COLUMN price;

-- Rename new column
ALTER TABLE "Product" RENAME COLUMN new_price_cents TO price_cents;
```

## Large Table Migration

For tables > 10GB, use `pg_repack`:

```bash
# Install pg_repack extension
psql -U citadelbuy -d citadelbuy_production -c "CREATE EXTENSION pg_repack;"

# Repack table (rebuilds with minimal locking)
pg_repack -U citadelbuy -d citadelbuy_production --table Product --no-order
```

## Rollback Procedure

```sql
-- If migration fails, restore from backup
-- Point-in-time restore
pg_restore -h postgres -U citadelbuy -d citadelbuy_production \
  -c /backups/pre-migration-backup.dump
```

---

**Last Updated**: 2025-12-06
