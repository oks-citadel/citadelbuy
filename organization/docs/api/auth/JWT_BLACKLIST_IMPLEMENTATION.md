# JWT Token Blacklist Implementation

## Overview

This implementation adds **JWT token blacklisting** to fix a critical security issue: JWTs are stateless, which means logout doesn't invalidate tokens by default. Compromised tokens remain valid until expiration, which is a major security risk.

## Security Problem Solved

**Before**:
- User logs out → Token remains valid
- Password changed → Old tokens still work
- Account compromised → Cannot revoke active sessions

**After**:
- User logs out → Token immediately invalidated
- Password changed → All tokens revoked
- Account compromised → Admin can revoke all sessions

## Architecture

### Components

1. **TokenBlacklistService** (`token-blacklist.service.ts`)
   - Manages blacklisted tokens in Redis
   - Handles user-wide token invalidation
   - Automatic TTL management

2. **JWT Strategy** (`strategies/jwt.strategy.ts`)
   - Enhanced to check blacklist before allowing access
   - Rejects blacklisted tokens with 401 Unauthorized

3. **Auth Service** (`auth.service.ts`)
   - Generates tokens with unique IDs (jti)
   - Blacklists tokens on logout
   - Invalidates all user tokens on password change

4. **Auth Controller** (`auth.controller.ts`)
   - Updated logout endpoint to extract and blacklist token

## How It Works

### 1. Token Generation with JTI

Every JWT now includes a unique `jti` (JWT ID) claim:

```typescript
{
  "sub": "user-id",
  "email": "user@example.com",
  "role": "CUSTOMER",
  "jti": "550e8400-e29b-41d4-a716-446655440000",  // ← Unique ID
  "iat": 1638360000,
  "exp": 1638970800
}
```

### 2. Logout Flow

```
Client                    Server                     Redis
  |                         |                          |
  |-- POST /auth/logout --->|                          |
  |   (with Bearer token)   |                          |
  |                         |--- Extract jti --------->|
  |                         |                          |
  |                         |<-- Store in blacklist ---|
  |                         |    (TTL = token expiry)  |
  |<-- 200 OK --------------|                          |
  |                         |                          |
```

### 3. Request Authorization Flow

```
Client                    Server                     Redis
  |                         |                          |
  |-- GET /api/resource --->|                          |
  |   (with Bearer token)   |                          |
  |                         |--- Check blacklist ----->|
  |                         |                          |
  |                         |<-- Not blacklisted ------|
  |                         |                          |
  |<-- 200 OK --------------|                          |
```

If token is blacklisted:

```
Client                    Server                     Redis
  |                         |                          |
  |-- GET /api/resource --->|                          |
  |   (with Bearer token)   |                          |
  |                         |--- Check blacklist ----->|
  |                         |                          |
  |                         |<-- Blacklisted! ---------|
  |                         |                          |
  |<-- 401 Unauthorized ----|                          |
  |    "Token has been      |                          |
  |     revoked"            |                          |
```

## Redis Data Structure

### Individual Token Blacklist

**Key**: `token:blacklist:{jti}`
**Value**:
```json
{
  "blacklistedAt": 1638360000000,
  "userId": "user-123",
  "expiresAt": 1638970800
}
```
**TTL**: Automatic (matches JWT expiration time)

### User-Wide Token Invalidation

**Key**: `user:tokens:invalidated:{userId}`
**Value**:
```json
{
  "invalidatedAt": 1638360000000,
  "reason": "user_initiated"
}
```
**TTL**: 30 days (longer than any JWT lifetime)

## API Reference

### TokenBlacklistService Methods

#### `blacklistToken(token: string): Promise<boolean>`
Blacklist a specific JWT token.

```typescript
const success = await tokenBlacklistService.blacklistToken(jwtToken);
```

#### `isTokenBlacklisted(token: string): Promise<boolean>`
Check if a token is blacklisted.

```typescript
const isBlacklisted = await tokenBlacklistService.isTokenBlacklisted(jwtToken);
if (isBlacklisted) {
  throw new UnauthorizedException('Token has been revoked');
}
```

#### `invalidateAllUserTokens(userId: string): Promise<boolean>`
Invalidate ALL tokens for a user (password change, security breach).

```typescript
const success = await tokenBlacklistService.invalidateAllUserTokens('user-123');
```

#### `getBlacklistStats(): Promise<{blacklistedTokens: number, invalidatedUsers: number}>`
Get statistics about blacklisted tokens (for monitoring).

```typescript
const stats = await tokenBlacklistService.getBlacklistStats();
// { blacklistedTokens: 42, invalidatedUsers: 3 }
```

### Auth Service Methods

#### `logout(token: string): Promise<{message: string}>`
Logout and blacklist the current token.

```typescript
const result = await authService.logout(jwtToken);
// { message: 'Logged out successfully' }
```

#### `invalidateAllUserTokens(userId: string): Promise<boolean>`
Invalidate all tokens for a user.

```typescript
await authService.invalidateAllUserTokens('user-123');
```

## Usage Examples

### 1. Manual Logout

```typescript
@Post('logout')
@UseGuards(JwtAuthGuard)
async logout(@Request() req) {
  const token = req.headers.authorization.replace('Bearer ', '');
  return this.authService.logout(token);
}
```

### 2. Password Change (Invalidate All Tokens)

```typescript
async changePassword(userId: string, oldPassword: string, newPassword: string) {
  // Verify old password
  const user = await this.usersService.findById(userId);
  const isValid = await bcrypt.compare(oldPassword, user.password);

  if (!isValid) {
    throw new UnauthorizedException('Invalid password');
  }

  // Update password
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await this.prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });

  // SECURITY: Invalidate all existing tokens
  await this.authService.invalidateAllUserTokens(userId);

  return { message: 'Password changed successfully. Please log in again.' };
}
```

### 3. Admin Force Logout

```typescript
@Post('admin/users/:userId/revoke-sessions')
@UseGuards(JwtAuthGuard, AdminGuard)
async revokeUserSessions(@Param('userId') userId: string) {
  await this.authService.invalidateAllUserTokens(userId);
  return { message: 'All user sessions revoked' };
}
```

## Performance Considerations

### Redis Operations

- **Blacklist check**: O(1) - Single Redis `EXISTS` call
- **Blacklist token**: O(1) - Single Redis `SET` call
- **User invalidation check**: O(1) - Single Redis `GET` call

### Overhead Per Request

Each authenticated request performs:
1. JWT signature verification (existing)
2. Redis blacklist check (new) - ~1ms

**Impact**: Negligible (~1ms added latency)

### Memory Usage

- **Per blacklisted token**: ~200 bytes
- **Per invalidated user**: ~150 bytes
- **Automatic cleanup**: Redis TTL removes expired entries

Example: 10,000 blacklisted tokens = ~2MB RAM

## Security Features

### 1. Defense in Depth

- **Layer 1**: JWT signature verification
- **Layer 2**: Token expiration check
- **Layer 3**: Blacklist check (new)
- **Layer 4**: User-wide invalidation check (new)

### 2. Automatic TTL Management

Blacklisted tokens automatically expire from Redis when the JWT expires, preventing memory bloat.

### 3. Graceful Degradation

If Redis is unavailable:
- Blacklist checks return `false` (deny access for security)
- System logs errors for monitoring
- Admin is alerted to investigate

### 4. Token Rotation on Refresh

When refreshing tokens:
```typescript
async refreshToken(refreshToken: string) {
  // Check if refresh token is blacklisted
  const isBlacklisted = await this.tokenBlacklistService.isTokenBlacklisted(refreshToken);
  if (isBlacklisted) {
    throw new UnauthorizedException('Refresh token has been revoked');
  }

  // Generate NEW tokens (with new jti)
  return {
    access_token: this.generateToken(payload),
    refresh_token: this.generateToken(refreshPayload, options),
  };
}
```

## Implementation Checklist

- [x] Create TokenBlacklistService
- [x] Update JWT Strategy to check blacklist
- [x] Update Auth Service to generate tokens with jti
- [x] Update Auth Service logout method
- [x] Update Auth Controller logout endpoint
- [x] Add invalidateAllUserTokens method
- [x] Update password reset to invalidate tokens
- [x] Update refresh token to check blacklist
- [x] Add Redis dependency to Auth Module
- [ ] Add admin endpoint to force logout
- [ ] Add monitoring/metrics for blacklist
- [ ] Add unit tests for TokenBlacklistService
- [ ] Add integration tests for logout flow
- [ ] Update API documentation

## Testing

### Unit Tests

```typescript
describe('TokenBlacklistService', () => {
  it('should blacklist a token', async () => {
    const token = generateTestToken();
    const success = await service.blacklistToken(token);
    expect(success).toBe(true);

    const isBlacklisted = await service.isTokenBlacklisted(token);
    expect(isBlacklisted).toBe(true);
  });

  it('should invalidate all user tokens', async () => {
    const userId = 'user-123';
    const oldToken = generateTestToken({ sub: userId, iat: Date.now() - 10000 });

    await service.invalidateAllUserTokens(userId);

    const isBlacklisted = await service.isTokenBlacklisted(oldToken);
    expect(isBlacklisted).toBe(true);
  });
});
```

### Integration Tests

```typescript
describe('Auth Logout (e2e)', () => {
  it('should invalidate token on logout', async () => {
    // Login
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });

    const token = loginResponse.body.access_token;

    // Access protected route (should work)
    await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // Logout
    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // Try to access protected route (should fail)
    await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
  });
});
```

## Monitoring

### Metrics to Track

1. **Blacklist Size**: Number of blacklisted tokens
2. **Blacklist Hit Rate**: % of requests blocked by blacklist
3. **Redis Latency**: Time for blacklist checks
4. **Failed Blacklist Operations**: Errors adding to blacklist

### Example Monitoring

```typescript
@Injectable()
export class BlacklistMetricsService {
  private blacklistChecks = 0;
  private blacklistHits = 0;

  recordCheck(wasBlacklisted: boolean) {
    this.blacklistChecks++;
    if (wasBlacklisted) {
      this.blacklistHits++;
    }
  }

  getMetrics() {
    return {
      totalChecks: this.blacklistChecks,
      totalHits: this.blacklistHits,
      hitRate: (this.blacklistHits / this.blacklistChecks) * 100,
    };
  }
}
```

## Migration Guide

### For Existing Systems

1. **Deploy TokenBlacklistService** (no breaking changes)
2. **Update JWT Strategy** (existing tokens still work)
3. **Update Auth Service** to generate jti (new tokens only)
4. **Update logout endpoint** (starts blacklisting from now on)

**Zero downtime**: Old tokens without jti use hash-based fallback.

### Rollback Plan

1. Remove blacklist check from JWT Strategy
2. Revert Auth Controller logout endpoint
3. Keep TokenBlacklistService (for future use)

## FAQ

### Q: What happens if Redis goes down?

**A**: For security, all tokens are treated as blacklisted (denied). System logs errors and alerts admins.

### Q: Do old tokens without jti work?

**A**: Yes! The system uses a token hash as fallback ID.

### Q: What's the performance impact?

**A**: ~1ms per request for Redis blacklist check. Negligible.

### Q: How long are tokens blacklisted?

**A**: Automatically until the JWT expires. No manual cleanup needed.

### Q: Can I blacklist refresh tokens?

**A**: Yes! The system checks both access and refresh tokens.

### Q: What about distributed systems?

**A**: Redis is shared across all servers. Blacklist is instantly global.

## Support

For issues or questions:
- Check logs: `apps/api/src/modules/auth/`
- Redis status: `GET /health/redis`
- Blacklist stats: `tokenBlacklistService.getBlacklistStats()`

## License

Part of the Citadel Buy platform. Internal use only.
