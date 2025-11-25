# Seed Data Instructions

## Warehouse Seed Data

After applying the Prisma migration, run the warehouse seed script to populate initial warehouse locations.

### Prerequisites

1. PostgreSQL database running
2. Prisma migration applied:
   ```bash
   npx prisma migrate dev --name add_inventory_management_system
   ```

### Running Seed Script

```bash
cd backend

# Compile TypeScript seed file
npx ts-node prisma/seed-warehouses.ts
```

### What Gets Created

The seed script creates **5 warehouses** across the United States:

1. **WH-NYC-01** - New York Main Warehouse (PRIMARY)
   - Location: New York, NY
   - Status: Active
   - Primary warehouse for the system

2. **WH-LAX-01** - Los Angeles Distribution Center
   - Location: Los Angeles, CA
   - Status: Active

3. **WH-CHI-01** - Chicago Fulfillment Center
   - Location: Chicago, IL
   - Status: Active

4. **WH-MIA-01** - Miami Southeast Hub
   - Location: Miami, FL
   - Status: Active

5. **WH-SEA-01** - Seattle Pacific Northwest Center
   - Location: Seattle, WA
   - Status: Active

### Safe to Re-run

The seed script uses `upsert` operations, so it's safe to run multiple times. Existing warehouses will not be duplicated.

### Verification

After seeding, verify warehouses were created:

```bash
# Using Prisma Studio
npx prisma studio

# Or query directly
npx prisma db execute --stdin <<EOF
SELECT code, name, city, state, "isPrimary" FROM "Warehouse";
EOF
```

Expected output:
```
code        | name                                | city          | state | isPrimary
------------|-------------------------------------|---------------|-------|----------
WH-NYC-01   | New York Main Warehouse             | New York      | NY    | true
WH-LAX-01   | Los Angeles Distribution Center     | Los Angeles   | CA    | false
WH-CHI-01   | Chicago Fulfillment Center          | Chicago       | IL    | false
WH-MIA-01   | Miami Southeast Hub                 | Miami         | FL    | false
WH-SEA-01   | Seattle Pacific Northwest Center    | Seattle       | WA    | false
```

### Next Steps

After seeding warehouses:
1. Create initial inventory items for products
2. Test stock adjustment endpoints
3. Test warehouse transfer workflows

---

**Note:** This seed data provides a realistic multi-warehouse setup for testing and development. Adjust locations and details as needed for your specific requirements.
