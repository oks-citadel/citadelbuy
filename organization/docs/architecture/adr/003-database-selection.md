# ADR 003: PostgreSQL as Primary Database

**Status**: Accepted

**Date**: 2025-12-06

**Deciders**: Platform Architecture Team, CTO, Database Lead

**Technical Story**: Database Selection for Global B2B Marketplace

---

## Context

CitadelBuy needs a primary database that can support:

1. **Scale Requirements**:
   - 1M+ concurrent users globally
   - 100TB+ data storage
   - 10K+ transactions per second (TPS)
   - Complex queries with JOINs

2. **Data Model Requirements**:
   - Relational data (orders, users, products)
   - ACID transactions (payment processing)
   - Complex queries (analytics, reporting)
   - JSON/JSONB for flexible fields (product attributes, metadata)

3. **Compliance Requirements**:
   - GDPR data protection
   - PCI DSS for payment data
   - Audit trail (7-year retention)
   - Data encryption at rest and in transit

4. **Operational Requirements**:
   - Multi-region deployment
   - Read replicas for scaling
   - Point-in-time recovery
   - Automated backups
   - High availability (99.99% uptime)

5. **Developer Experience**:
   - Strong TypeScript ORM support
   - Migration tools
   - Good documentation
   - Active community

## Decision

We will use **PostgreSQL 16** (Azure Database for PostgreSQL - Flexible Server) as our primary database for all structured, transactional data.

**Configuration**:
- **Version**: PostgreSQL 16 (latest stable)
- **Deployment**: Azure Database for PostgreSQL (Flexible Server)
- **SKU**: GP_Standard_D4s_v3 (4 vCPU, 16 GB RAM) in production
- **Storage**: 128 GB with auto-grow enabled
- **High Availability**: Zone-redundant deployment
- **Backup**: 35-day retention, geo-redundant
- **Replication**: Async read replicas in all 6 regions
- **ORM**: Prisma for TypeScript services

**Supporting Databases** (for specific use cases):
- **Redis**: Caching, sessions, rate limiting, pub/sub
- **Elasticsearch**: Full-text search, analytics
- **Azure Blob Storage**: Media files, documents

## Consequences

### Positive

- **ACID Compliance**: Strong transactional guarantees for payments and orders
- **Rich Data Types**: Native JSON/JSONB support for flexible schemas
- **Performance**: Excellent query performance with proper indexing
- **Mature Ecosystem**: 30+ years of development, battle-tested
- **Advanced Features**:
  - Full-text search (tsvector)
  - Row-level security (RLS)
  - Partitioning (range, list, hash)
  - Foreign data wrappers
  - Materialized views
  - CTEs and window functions
- **Developer Experience**: Excellent Prisma ORM support
- **Cost-Effective**: Open source, no licensing fees
- **Azure Integration**: Managed service with automated backups, patching, monitoring
- **Compliance**: Meets PCI DSS, GDPR requirements
- **Multi-Region**: Read replicas in all regions for low latency
- **Community**: Huge community, extensive documentation

### Negative

- **Horizontal Scaling**: More difficult than NoSQL (requires sharding)
- **Schema Rigidity**: Schema changes require migrations (though Prisma makes this easier)
- **Write Scalability**: Single master write bottleneck (mitigated with partitioning)
- **Cost at Scale**: Managed PostgreSQL can be expensive ($8,000/month per region)
- **Complex Queries**: Can be slow without proper indexes and query optimization
- **Connection Pooling**: Limited connections (need PgBouncer)
- **Replication Lag**: Async replication can have 5-second lag

### Neutral

- **SQL Knowledge**: Team needs SQL expertise (not a problem for our team)
- **Vendor-Specific Features**: Azure PostgreSQL has some Azure-specific features

## Alternatives Considered

### Alternative 1: MongoDB (NoSQL Document Database)

**Description**: Use MongoDB for flexible schema and horizontal scaling.

**Pros**:
- Schema flexibility (no migrations)
- Horizontal scaling out of the box (sharding)
- JSON-native (matches JavaScript/TypeScript)
- Fast writes
- Good for product catalog (variable attributes)

**Cons**:
- No ACID transactions across documents (before v4.0)
- Complex JOINs are difficult ($lookup is slow)
- No foreign key constraints (data integrity issues)
- Less mature than PostgreSQL for relational data
- Query performance unpredictable
- Not ideal for financial transactions
- ORM support not as good as PostgreSQL
- Higher cost for managed service (MongoDB Atlas)

**Reason for rejection**: Need strong ACID guarantees for orders and payments. PostgreSQL's JSONB provides schema flexibility where needed.

### Alternative 2: MySQL (Relational Database)

**Description**: Use MySQL instead of PostgreSQL.

**Pros**:
- Faster for simple read queries
- Slightly better write performance
- Widely used, large community
- Good managed service on Azure

**Cons**:
- Weaker JSON support (JSON type is less performant than JSONB)
- Fewer advanced features (no CTEs before v8.0)
- Less robust for complex queries
- Partitioning is more limited
- Less suitable for analytical queries
- Prisma support not as mature

**Reason for rejection**: PostgreSQL's advanced features (JSONB, CTEs, window functions) and better compliance story make it a better fit.

### Alternative 3: CockroachDB (Distributed SQL)

**Description**: Use CockroachDB for global distribution and horizontal scaling.

**Pros**:
- Horizontal scaling built-in
- Multi-region writes (active-active)
- PostgreSQL-compatible
- Automatic sharding
- Strong consistency
- Cloud-agnostic

**Cons**:
- Higher latency due to distributed consensus (Raft)
- Expensive ($$$)
- Less mature than PostgreSQL
- Limited managed service options
- Some PostgreSQL features not supported
- Smaller community
- Overkill for our current scale

**Reason for rejection**: Our scale doesn't justify the cost and complexity. PostgreSQL with read replicas is sufficient.

### Alternative 4: Multi-Model (PostgreSQL + MongoDB)

**Description**: Use PostgreSQL for transactional data, MongoDB for product catalog.

**Pros**:
- Best of both worlds
- PostgreSQL for orders/payments
- MongoDB for flexible product attributes

**Cons**:
- Operational complexity (two databases)
- Data sync complexity
- Increased cost
- Need expertise in both databases
- More monitoring and maintenance

**Reason for rejection**: PostgreSQL JSONB provides enough flexibility. Not worth the operational overhead.

## Implementation Notes

### Database Design Principles

1. **Normalization**: Use 3NF for transactional data
2. **Denormalization**: Strategic denormalization for read-heavy data
3. **Partitioning**: Partition large tables (orders, audit_logs) by time and region
4. **Indexing**: Create indexes based on query patterns
5. **JSONB**: Use for flexible, semi-structured data (product attributes, metadata)

### Schema Management

**Migrations**:
- Use Prisma Migrate for schema changes
- Test migrations in staging before production
- Run migrations during low-traffic windows
- Use online schema change tools for large tables

**Versioning**:
- Version control all schema changes in Git
- Review all migrations before merging
- Document breaking changes

### Performance Optimization

**Indexing Strategy**:
- B-tree indexes for equality and range queries
- GIN indexes for JSONB columns
- Partial indexes for filtered queries
- Covering indexes for index-only scans

**Query Optimization**:
- Use EXPLAIN ANALYZE for slow queries
- Optimize JOINs (prefer INNER JOIN over multiple queries)
- Use prepared statements
- Enable query plan caching

**Connection Pooling**:
- Use PgBouncer for connection pooling
- Configure max connections: 100 per service
- Use transaction-level pooling

**Caching Strategy**:
- Cache frequently accessed data in Redis (products, categories)
- Cache TTL: 5-60 minutes depending on data
- Invalidate cache on write

### Backup & Recovery

**Automated Backups**:
- Daily full backups (35-day retention)
- Continuous archiving (WAL)
- Geo-redundant backup storage
- Point-in-time recovery (PITR)

**Disaster Recovery**:
- Read replicas in all regions (can be promoted to master)
- Automated failover < 5 minutes
- Monthly DR drills

### Monitoring & Alerting

**Metrics to Monitor**:
- Connection count (alert if > 80%)
- Query latency (p50, p95, p99)
- Replication lag (alert if > 10 seconds)
- Slow queries (> 1 second)
- Disk usage (alert if > 80%)
- Cache hit ratio (alert if < 90%)

**Tools**:
- Azure Monitor for infrastructure metrics
- Prometheus for custom metrics
- Grafana for dashboards
- PagerDuty for alerts

### Security

**Encryption**:
- Encryption at rest (AES-256, managed by Azure)
- Encryption in transit (TLS 1.3)
- Encrypted backups

**Access Control**:
- Row-level security (RLS) for multi-tenancy
- Least privilege principle (minimal permissions per service)
- Service accounts (no shared credentials)
- Secrets in Azure Key Vault

**Audit**:
- Enable audit logging for all DDL and DML
- Log all access to sensitive tables (users, payments)
- 7-year retention for compliance

## References

- [PostgreSQL Official Documentation](https://www.postgresql.org/docs/)
- [Azure Database for PostgreSQL](https://learn.microsoft.com/en-us/azure/postgresql/)
- [Prisma ORM Documentation](https://www.prisma.io/docs)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Instagram's PostgreSQL at Scale](https://instagram-engineering.com/handling-growth-with-postgres-5-tips-from-instagram-d5d7e7ffdfcb)
- [Uber's PostgreSQL Journey](https://eng.uber.com/postgres-to-mysql-migration/)

---

**Last Updated**: 2025-12-06
**Author**: Platform Architecture Team
**Reviewers**: CTO, Database Lead, Principal Engineers
