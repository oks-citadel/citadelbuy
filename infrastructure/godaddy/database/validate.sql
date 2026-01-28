-- Broxiva Database Migration Validation Script
-- Run this after database migration to verify data integrity

-- ============================================================================
-- SECTION 1: TABLE COUNTS
-- ============================================================================

SELECT '=== TABLE COUNT VALIDATION ===' as section;

SELECT
    'Total Tables' as metric,
    COUNT(*) as count
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE';

-- ============================================================================
-- SECTION 2: ROW COUNTS BY TABLE
-- ============================================================================

SELECT '=== ROW COUNTS BY TABLE ===' as section;

SELECT
    schemaname as schema,
    relname as table_name,
    n_live_tup as row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;

-- ============================================================================
-- SECTION 3: INDEX VERIFICATION
-- ============================================================================

SELECT '=== INDEX VERIFICATION ===' as section;

SELECT
    'Total Indexes' as metric,
    COUNT(*) as count
FROM pg_indexes
WHERE schemaname = 'public';

-- List all indexes
SELECT
    tablename as table_name,
    indexname as index_name,
    indexdef as definition
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ============================================================================
-- SECTION 4: FOREIGN KEY VERIFICATION
-- ============================================================================

SELECT '=== FOREIGN KEY VERIFICATION ===' as section;

SELECT
    'Total Foreign Keys' as metric,
    COUNT(*) as count
FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY'
AND table_schema = 'public';

-- List all foreign keys
SELECT
    tc.table_name as table_name,
    tc.constraint_name as fk_name,
    kcu.column_name as column_name,
    ccu.table_name AS referenced_table,
    ccu.column_name AS referenced_column
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- ============================================================================
-- SECTION 5: UNIQUE CONSTRAINTS
-- ============================================================================

SELECT '=== UNIQUE CONSTRAINTS ===' as section;

SELECT
    'Total Unique Constraints' as metric,
    COUNT(*) as count
FROM information_schema.table_constraints
WHERE constraint_type = 'UNIQUE'
AND table_schema = 'public';

-- ============================================================================
-- SECTION 6: EXTENSIONS
-- ============================================================================

SELECT '=== INSTALLED EXTENSIONS ===' as section;

SELECT
    extname as extension_name,
    extversion as version
FROM pg_extension
ORDER BY extname;

-- ============================================================================
-- SECTION 7: CRITICAL TABLE CHECKS
-- ============================================================================

SELECT '=== CRITICAL TABLE CHECKS ===' as section;

-- User table
SELECT 'Users' as table_name, COUNT(*) as count FROM "User";

-- Product table
SELECT 'Products' as table_name, COUNT(*) as count FROM "Product";

-- Order table
SELECT 'Orders' as table_name, COUNT(*) as count FROM "Order";

-- OrderItem table
SELECT 'OrderItems' as table_name, COUNT(*) as count FROM "OrderItem";

-- Category table
SELECT 'Categories' as table_name, COUNT(*) as count FROM "Category";

-- Vendor table
SELECT 'Vendors' as table_name, COUNT(*) as count FROM "Vendor";

-- Payment table
SELECT 'Payments' as table_name, COUNT(*) as count FROM "Payment";

-- Review table
SELECT 'Reviews' as table_name, COUNT(*) as count FROM "Review";

-- ============================================================================
-- SECTION 8: DATA INTEGRITY CHECKS
-- ============================================================================

SELECT '=== DATA INTEGRITY CHECKS ===' as section;

-- Check for orphaned order items (orders without valid order reference)
SELECT
    'Orphaned OrderItems' as check_name,
    COUNT(*) as count
FROM "OrderItem" oi
LEFT JOIN "Order" o ON oi."orderId" = o.id
WHERE o.id IS NULL;

-- Check for orders with null users
SELECT
    'Orders with NULL User' as check_name,
    COUNT(*) as count
FROM "Order"
WHERE "userId" IS NULL;

-- Check for products with null vendors
SELECT
    'Products with NULL Vendor' as check_name,
    COUNT(*) as count
FROM "Product"
WHERE "vendorId" IS NULL;

-- ============================================================================
-- SECTION 9: RECENT ACTIVITY CHECK
-- ============================================================================

SELECT '=== RECENT ACTIVITY CHECK ===' as section;

-- Most recent user registration
SELECT
    'Most Recent User' as metric,
    MAX("createdAt") as value
FROM "User";

-- Most recent order
SELECT
    'Most Recent Order' as metric,
    MAX("createdAt") as value
FROM "Order";

-- Most recent product
SELECT
    'Most Recent Product' as metric,
    MAX("createdAt") as value
FROM "Product";

-- ============================================================================
-- SECTION 10: DATABASE SIZE
-- ============================================================================

SELECT '=== DATABASE SIZE ===' as section;

SELECT
    pg_size_pretty(pg_database_size(current_database())) as database_size;

-- Size by table
SELECT
    tablename as table_name,
    pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname || '.' || tablename)) as data_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC
LIMIT 20;

-- ============================================================================
-- SECTION 11: SEQUENCE VERIFICATION
-- ============================================================================

SELECT '=== SEQUENCE VERIFICATION ===' as section;

SELECT
    'Total Sequences' as metric,
    COUNT(*) as count
FROM information_schema.sequences
WHERE sequence_schema = 'public';

-- ============================================================================
-- VALIDATION SUMMARY
-- ============================================================================

SELECT '=== VALIDATION SUMMARY ===' as section;

SELECT 'Migration validation complete. Review results above for any issues.' as status;
