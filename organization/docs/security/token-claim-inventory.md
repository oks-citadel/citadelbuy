# Token Claim Inventory - Broxiva E-Commerce Platform

**Document Version:** 1.0.0
**Last Updated:** 2026-01-05
**Audited By:** Agent 02 - Identity & Access Architect

---

## Overview

This document provides a comprehensive inventory of all JWT token claims used in the Broxiva E-Commerce Platform authentication system. All tokens are signed using the HS256 algorithm with a configurable secret key.

---

## 1. Access Token Claims

Access tokens are used for API authentication and contain user identity and authorization information.

### 1.1 Standard Claims

| Claim | Type | Description | Source |
|-------|------|-------------|--------|
| `sub` | string (UUID) | Subject - User's unique identifier | `user.id` |
| `iat` | number | Issued At - Unix timestamp of token creation | Automatic |
| `exp` | number | Expiration - Unix timestamp when token expires | Automatic (default: 7 days) |

### 1.2 Custom Claims

| Claim | Type | Description | Source |
|-------|------|-------------|--------|
| `email` | string | User's email address | `user.email` |
| `role` | string | User's role for authorization | `user.role` |
| `jti` | string (UUID) | JWT ID - Unique token identifier for blacklisting | `crypto.randomUUID()` |

### 1.3 Sample Access Token Payload

```json
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "role": "CUSTOMER",
  "jti": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "iat": 1704067200,
  "exp": 1704672000
}
```

### 1.4 Token Generation Code

**File:** `organization/apps/api/src/modules/auth/auth.service.ts`

```typescript
private generateToken(payload: any, options?: any): string {
  const tokenPayload = {
    ...payload,
    jti: crypto.randomUUID(), // Add unique token ID
  };
  return this.jwtService.sign(tokenPayload, options);
}

// Usage in login:
const payload = { sub: user.id, email: user.email, role: user.role };
const accessToken = this.generateToken(payload);
```

---

## 2. Refresh Token Claims

Refresh tokens are used to obtain new access tokens without re-authentication.

### 2.1 Standard Claims

| Claim | Type | Description | Source |
|-------|------|-------------|--------|
| `sub` | string (UUID) | Subject - User's unique identifier | `user.id` |
| `iat` | number | Issued At - Unix timestamp of token creation | Automatic |
| `exp` | number | Expiration - Unix timestamp when token expires | Automatic (default: 30 days) |

### 2.2 Custom Claims

| Claim | Type | Description | Source |
|-------|------|-------------|--------|
| `type` | string | Token type identifier | Fixed: `"refresh"` |
| `jti` | string (UUID) | JWT ID - Unique token identifier for blacklisting | `crypto.randomUUID()` |

### 2.3 Sample Refresh Token Payload

```json
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "type": "refresh",
  "jti": "7ba7b810-9dad-11d1-80b4-00c04fd430c9",
  "iat": 1704067200,
  "exp": 1706659200
}
```

### 2.4 Token Generation Code

**File:** `organization/apps/api/src/modules/auth/auth.service.ts`

```typescript
const refreshPayload = { sub: user.id, type: 'refresh' };
const refreshToken = this.generateToken(refreshPayload, {
  secret: this.configService.get<string>('JWT_REFRESH_SECRET')
          || this.configService.get<string>('JWT_SECRET'),
  expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '30d',
});
```

---

## 3. Token Validation

### 3.1 Access Token Validation

**File:** `organization/apps/api/src/modules/auth/strategies/jwt.strategy.ts`

```typescript
async validate(request: Request, payload: {
  sub: string;
  email: string;
  role: string;
  iat?: number;
  jti?: string
}) {
  // Extract token from header
  const token = request.headers.authorization?.replace('Bearer ', '');

  // Check if token is blacklisted
  const isBlacklisted = await this.tokenBlacklistService.isTokenBlacklisted(token);
  if (isBlacklisted) {
    throw new UnauthorizedException('Token has been revoked');
  }

  // Return user object for request.user
  return {
    id: payload.sub,
    email: payload.email,
    role: payload.role,
    iat: payload.iat,
    jti: payload.jti,
  };
}
```

### 3.2 Refresh Token Validation

**File:** `organization/apps/api/src/modules/auth/auth.service.ts`

```typescript
async refreshToken(refreshToken: string) {
  // Check if blacklisted
  const isBlacklisted = await this.tokenBlacklistService.isTokenBlacklisted(refreshToken);
  if (isBlacklisted) {
    throw new UnauthorizedException('Refresh token has been revoked');
  }

  // Verify signature and expiration
  const payload = this.jwtService.verify(refreshToken, {
    secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
  });

  // Validate token type
  if (payload.type !== 'refresh') {
    throw new UnauthorizedException('Invalid token type');
  }

  // Generate new tokens
  // ...
}
```

---

## 4. Token Blacklisting

### 4.1 Blacklist Storage (Redis)

**Key Patterns:**

| Pattern | Purpose | TTL |
|---------|---------|-----|
| `token:blacklist:{jti}` | Individual blacklisted token | Token remaining lifetime |
| `user:tokens:invalidated:{userId}` | User-wide invalidation timestamp | Max refresh token lifetime (30d) |

### 4.2 Blacklist Data Structure

```json
// Individual token blacklist entry
{
  "blacklistedAt": 1704067200000,
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "expiresAt": 1704672000
}

// User-wide invalidation entry
{
  "invalidatedAt": 1704067200000,
  "reason": "user_initiated"
}
```

### 4.3 Blacklist Check Logic

**File:** `organization/apps/api/src/modules/auth/token-blacklist.service.ts`

```typescript
async isTokenBlacklisted(token: string): Promise<boolean> {
  const decoded = this.decodeToken(token);

  // Check 1: Is the specific token blacklisted?
  const tokenId = decoded.jti || this.hashToken(token);
  const isBlacklisted = await this.redisService.exists(
    `token:blacklist:${tokenId}`
  );
  if (isBlacklisted) return true;

  // Check 2: Has the user invalidated all tokens?
  if (decoded.sub && decoded.iat) {
    const invalidationData = await this.redisService.get(
      `user:tokens:invalidated:${decoded.sub}`
    );
    if (invalidationData) {
      const tokenIssuedAtMs = decoded.iat * 1000;
      return tokenIssuedAtMs < invalidationData.invalidatedAt;
    }
  }

  return false;
}
```

---

## 5. Role Claims Inventory

### 5.1 Available Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| `CUSTOMER` | Standard user | Browse, purchase, manage own profile |
| `VENDOR` | Seller/merchant | Customer + manage products, view analytics |
| `SUPPORT` | Customer support | Customer + access support tools, view tickets |
| `ADMIN` | Administrator | Full access including user management |

### 5.2 Role in Token

```typescript
// Token payload includes role
const payload = {
  sub: user.id,
  email: user.email,
  role: user.role  // "CUSTOMER" | "VENDOR" | "SUPPORT" | "ADMIN"
};
```

### 5.3 Role Verification

**File:** `organization/apps/api/src/common/guards/roles.guard.ts`

```typescript
canActivate(context: ExecutionContext): boolean {
  const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>('roles', [
    context.getHandler(),
    context.getClass(),
  ]);

  if (!requiredRoles) return true;

  const { user } = context.switchToHttp().getRequest();
  return requiredRoles.some((role) => user.role === role);
}
```

---

## 6. Token Lifecycle

### 6.1 Token Creation Events

| Event | Tokens Created | Claims Included |
|-------|---------------|-----------------|
| Registration | Access + Refresh | sub, email, role, jti |
| Login | Access + Refresh | sub, email, role, jti |
| Social Login | Access + Refresh | sub, email, role, jti |
| Token Refresh | Access + Refresh | sub, email, role, jti |

### 6.2 Token Invalidation Events

| Event | Action | Scope |
|-------|--------|-------|
| Logout | Blacklist current token | Single token |
| Password Change | Invalidate all user tokens | User-wide |
| Password Reset | Invalidate all user tokens | User-wide |
| Admin Force Logout | Invalidate all user tokens | User-wide |

---

## 7. Token Configuration

### 7.1 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | Required | HS256 signing secret (min 32 chars dev, 64 chars prod) |
| `JWT_EXPIRES_IN` | `7d` | Access token expiration |
| `JWT_REFRESH_SECRET` | Falls back to JWT_SECRET | Refresh token signing secret |
| `JWT_REFRESH_EXPIRES_IN` | `30d` | Refresh token expiration |

### 7.2 Security Validations

**File:** `organization/apps/api/src/modules/auth/auth.module.ts`

```typescript
// Production requirements
if (isProduction) {
  // Minimum 64 characters
  if (jwtSecret.length < 64) {
    throw new Error('JWT_SECRET must be at least 64 characters in production');
  }

  // No insecure patterns
  const insecurePatterns = ['secret', 'password', 'changeme', 'test', ...];
  if (insecurePatterns.some(p => jwtSecret.toLowerCase().includes(p))) {
    throw new Error('JWT_SECRET contains insecure patterns');
  }

  // Complexity requirements
  if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
    throw new Error('JWT_SECRET lacks sufficient complexity');
  }
}
```

---

## 8. Token Usage by Endpoint

### 8.1 Endpoints Creating Tokens

| Endpoint | Token Type | Claims |
|----------|-----------|--------|
| `POST /auth/register` | Access + Refresh | sub, email, role, jti |
| `POST /auth/login` | Access + Refresh | sub, email, role, jti |
| `POST /auth/refresh` | Access + Refresh | sub, email, role, jti |
| `POST /auth/social-login` | Access + Refresh | sub, email, role, jti |
| `POST /auth/google` | Access + Refresh | sub, email, role, jti |
| `POST /auth/facebook` | Access + Refresh | sub, email, role, jti |
| `POST /auth/apple` | Access + Refresh | sub, email, role, jti |
| `POST /auth/github` | Access + Refresh | sub, email, role, jti |

### 8.2 Endpoints Consuming Tokens

| Endpoint | Required Role | Token Claims Used |
|----------|--------------|-------------------|
| `GET /users/profile` | Any authenticated | sub (for lookup) |
| `PUT /users/profile` | Any authenticated | sub |
| `POST /auth/logout` | Any authenticated | jti (for blacklist) |
| `POST /auth/mfa/*` | Any authenticated | sub |
| `POST /auth/admin/*` | ADMIN only | sub, role |

---

## 9. Client Token Storage

### 9.1 Web Application (Next.js)

**File:** `organization/apps/web/src/stores/auth-store.ts`

| Storage | Data | Security |
|---------|------|----------|
| localStorage | access_token, refresh_token, user | Zustand persist middleware |

```typescript
persist(
  (set, get) => ({ /* state */ }),
  {
    name: 'auth-storage',
    storage: createJSONStorage(() => localStorage),
    partialize: (state) => ({
      user: state.user,
      isAuthenticated: state.isAuthenticated,
    }),
  }
)
```

### 9.2 Mobile Application (React Native/Expo)

**File:** `organization/apps/mobile/src/stores/auth-store.ts`

| Storage | Data | Security |
|---------|------|----------|
| expo-secure-store | access_token | Encrypted (Keychain/Keystore) |
| expo-secure-store | user (JSON) | Encrypted (Keychain/Keystore) |

```typescript
await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
```

---

## 10. Token Security Recommendations

### 10.1 Implemented Security Measures

- [x] JWT ID (jti) for individual token blacklisting
- [x] Token blacklist service with Redis backend
- [x] User-wide token invalidation on password change
- [x] Strict secret validation in production
- [x] Token expiration enforcement
- [x] Role claim for RBAC
- [x] Blacklist check on every authenticated request

### 10.2 Recommended Improvements

| Priority | Recommendation | Rationale |
|----------|---------------|-----------|
| HIGH | Implement refresh token rotation | New refresh token on each use prevents replay |
| HIGH | Add `aud` (audience) claim | Prevents token use across different services |
| MEDIUM | Reduce access token expiry | 7d is long; 15-60 min with refresh is more secure |
| MEDIUM | Add `iss` (issuer) claim | Validates token source |
| LOW | Add device fingerprint claim | Detect token use from different devices |

---

## 11. Audit Trail

| Date | Auditor | Changes |
|------|---------|---------|
| 2026-01-05 | Agent 02 | Initial inventory creation |

---

**Signature:** Identity & Access Architect - Agent 02
**Document Complete:** 2026-01-05
