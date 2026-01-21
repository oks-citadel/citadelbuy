# Authorization Policy

**Document Version**: 1.0
**Effective Date**: 2026-01-05
**Agent**: 03 - Backend Authorization Engineer
**Classification**: Internal Security Policy

---

## 1. Purpose

This document establishes the authorization policy for the Broxiva E-Commerce Platform. All backend development must adhere to these policies to ensure secure access control.

---

## 2. Scope

This policy applies to:
- All API endpoints in the NestJS backend
- All controllers and services handling user data
- All modules accessing protected resources
- All developer contributions and code reviews

---

## 3. Authorization Principles

### 3.1 Defense in Depth

Authorization must be enforced at multiple layers:
1. **Guard Layer**: NestJS guards for authentication and role verification
2. **Controller Layer**: Input validation and request authorization
3. **Service Layer**: Business logic authorization and ownership verification
4. **Data Layer**: Query-level filtering by user/tenant

### 3.2 Principle of Least Privilege

- Users should only have access to resources necessary for their role
- Default access should be DENY; access must be explicitly granted
- Admin privileges should be limited to designated administrators

### 3.3 Zero Trust

- Every request must be authenticated (except public endpoints)
- Every action on protected resources must be authorized
- Never trust user input for authorization decisions

---

## 4. Authentication Requirements

### 4.1 JWT Authentication

All authenticated endpoints MUST use `JwtAuthGuard`:

```typescript
@UseGuards(JwtAuthGuard)
@Get('protected-resource')
async getProtectedResource(@Request() req: AuthRequest) {
  // req.user is guaranteed to be set
}
```

### 4.2 Token Requirements

- JWT tokens must be RS256 signed
- Access tokens expire after 15 minutes
- Refresh tokens expire after 7 days
- Token payload must include: userId, email, role

---

## 5. Role-Based Access Control (RBAC)

### 5.1 User Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| CUSTOMER | End-user customer | View products, manage own orders/cart/wishlist |
| VENDOR | Product seller | All customer permissions + manage own products |
| ADMIN | Platform administrator | Full access to all resources |

### 5.2 Role Guard Implementation

Admin-only endpoints MUST use `AdminGuard`:

```typescript
@UseGuards(JwtAuthGuard, AdminGuard)
@Get('admin-only')
async adminEndpoint() {
  // Only ADMIN role users can access
}
```

Role-specific endpoints MUST use `RolesGuard` with `@Roles` decorator:

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.VENDOR)
@Get('vendor-resource')
async vendorEndpoint() {
  // ADMIN and VENDOR roles can access
}
```

---

## 6. Resource Ownership Verification

### 6.1 IDOR Prevention Policy

**CRITICAL**: All endpoints accessing user-specific resources MUST verify ownership.

#### 6.1.1 Acceptable Patterns

**Pattern 1: Filter by userId**
```typescript
// Service Layer
async getUserOrders(userId: string) {
  return this.prisma.order.findMany({
    where: { userId }, // Always filter by userId
  });
}
```

**Pattern 2: Ownership Verification**
```typescript
// Controller Layer
@Put(':id')
async updateResource(@Request() req: AuthRequest, @Param('id') id: string) {
  const resource = await this.service.findOne(id);

  // Verify ownership
  if (resource.userId !== req.user.id && req.user.role !== 'ADMIN') {
    throw new ForbiddenException('Access denied');
  }

  return this.service.update(id, dto);
}
```

**Pattern 3: Service Layer Verification**
```typescript
// Service Layer
async updateAddress(addressId: string, userId: string, dto: UpdateAddressDto) {
  const address = await this.findOne(addressId);

  if (address.userId !== userId) {
    throw new NotFoundException('Address not found'); // Don't reveal existence
  }

  return this.prisma.savedAddress.update({ where: { id: addressId }, data: dto });
}
```

#### 6.1.2 Forbidden Patterns

**NEVER do this:**
```typescript
// VULNERABLE - No ownership check!
@Delete(':id')
async delete(@Param('id') id: string) {
  return this.service.delete(id); // Any user can delete any resource!
}
```

### 6.2 Error Handling for Authorization

- Use `NotFoundException` for missing resources (prevents enumeration)
- Use `ForbiddenException` only for clear authorization failures
- Never reveal if a resource exists when access is denied

---

## 7. Subscription/Tier Enforcement

### 7.1 Feature Gating

Premium features MUST use subscription guards:

```typescript
@UseGuards(JwtAuthGuard, ProductCreationGuard)
@Post('products')
async createProduct(@Body() dto: CreateProductDto) {
  // Guard verifies subscription tier allows product creation
}
```

### 7.2 Service Layer Checks

All tier-limited operations must verify in service layer:

```typescript
async createProduct(vendorId: string, dto: CreateProductDto) {
  const canCreate = await this.subscriptionTierService.checkProductLimit(vendorId);

  if (!canCreate.allowed) {
    throw new ForbiddenException(
      `Product limit reached. Upgrade to ${canCreate.upgradeRequired} tier.`
    );
  }

  return this.prisma.product.create({ data: { ...dto, vendorId } });
}
```

---

## 8. Multi-Tenant Isolation

### 8.1 Data Isolation Requirements

- All user data queries MUST include userId filter
- Vendor data MUST be isolated by vendorId
- Organization data MUST be isolated by organizationId

### 8.2 Query Patterns

**Required Pattern:**
```typescript
// Always include tenant filter
async getUserNotifications(userId: string) {
  return this.prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}
```

---

## 9. Public Endpoints

### 9.1 Allowed Public Endpoints

Only the following endpoint categories may be public:
- Product catalog browsing
- Category listings
- Search functionality
- Authentication (login, register, password reset)
- Public coupon validation
- Webhook endpoints (with signature verification)

### 9.2 Public Endpoint Security

Public endpoints MUST:
- Use rate limiting (ThrottlerGuard)
- Validate all input
- Not expose sensitive data
- Implement CAPTCHA where appropriate

---

## 10. Admin Operations

### 10.1 Admin Authorization Requirements

All admin endpoints MUST:
1. Use `JwtAuthGuard` + `AdminGuard`
2. Log all admin actions with audit trail
3. Implement confirmation for destructive operations

### 10.2 Impersonation Policy

Admin impersonation MUST:
1. Require explicit admin authentication
2. Log start and end of impersonation sessions
3. Notify the impersonated user via email
4. Time-limit impersonation sessions (max 1 hour)
5. Not allow impersonation of other admins

---

## 11. API Security Headers

All responses MUST include:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`

---

## 12. Code Review Requirements

### 12.1 Authorization Checklist

All PRs affecting endpoints must verify:

- [ ] Endpoint has appropriate guard(s)
- [ ] Service layer verifies ownership for user resources
- [ ] No direct object reference vulnerabilities
- [ ] Subscription tier enforcement for premium features
- [ ] Admin endpoints protected by AdminGuard
- [ ] Error messages don't leak information
- [ ] Rate limiting applied where appropriate

### 12.2 Security Review Triggers

Mandatory security review for:
- New controllers or endpoints
- Changes to guards or decorators
- Changes to user data access patterns
- Changes to subscription/billing logic
- Changes to admin functionality

---

## 13. Incident Response

### 13.1 Authorization Bypass Discovery

If an authorization bypass is discovered:
1. Immediately disable affected endpoint if possible
2. Notify security team
3. Assess impact and affected users
4. Implement fix with emergency deploy process
5. Notify affected users if data was exposed
6. Post-incident review and policy update

---

## 14. Compliance

This policy supports compliance with:
- GDPR (data access controls)
- SOC 2 (access control)
- PCI-DSS (cardholder data protection)

---

## 15. Policy Maintenance

This policy shall be reviewed:
- Quarterly for routine updates
- Immediately upon security incident
- When adding new features or modules

---

## Appendix A: Guard Reference

| Guard | Purpose | Import |
|-------|---------|--------|
| JwtAuthGuard | JWT authentication | `@/common/guards/jwt-auth.guard` |
| AdminGuard | Admin role check | `modules/auth/guards/admin.guard` |
| RolesGuard | Role-based access | `@/common/guards/roles.guard` |
| ProductCreationGuard | Product limit enforcement | `modules/subscriptions/guards` |
| SubscriptionFeatureGuard | Feature access check | `modules/subscriptions/guards` |
| OptionalJwtAuthGuard | Optional authentication | `@/common/guards/optional-jwt-auth.guard` |
| ThrottlerGuard | Rate limiting | `@nestjs/throttler` |

---

## Appendix B: Common Authorization Patterns

### B.1 User-Owned Resource CRUD

```typescript
@Controller('user-resources')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserResourceController {
  constructor(private readonly service: UserResourceService) {}

  @Get()
  async findAll(@Request() req: AuthRequest) {
    // Filter by user ID
    return this.service.findAllByUserId(req.user.id);
  }

  @Get(':id')
  async findOne(@Request() req: AuthRequest, @Param('id') id: string) {
    // Service verifies ownership
    return this.service.findOne(id, req.user.id);
  }

  @Post()
  async create(@Request() req: AuthRequest, @Body() dto: CreateDto) {
    // Assign to current user
    return this.service.create(req.user.id, dto);
  }

  @Put(':id')
  async update(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: UpdateDto,
  ) {
    // Service verifies ownership before update
    return this.service.update(id, req.user.id, dto);
  }

  @Delete(':id')
  async remove(@Request() req: AuthRequest, @Param('id') id: string) {
    // Service verifies ownership before delete
    return this.service.remove(id, req.user.id);
  }
}
```

### B.2 Admin-Only CRUD

```typescript
@Controller('admin/resources')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class AdminResourceController {
  constructor(private readonly service: ResourceService) {}

  @Get()
  async findAll(@Query() query: QueryDto) {
    return this.service.findAll(query);
  }

  @Post()
  async create(@Body() dto: CreateDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
```

---

*Document maintained by Security Team*
*Last reviewed: 2026-01-05*
