# JWT Token Blacklist - Implementation Checklist

## ✅ Completed Automatically

- [x] **TokenBlacklistService** created (`token-blacklist.service.ts`)
  - Individual token blacklisting
  - User-wide token invalidation
  - Automatic TTL management
  - Statistics and monitoring methods

- [x] **JWT Strategy** updated (`strategies/jwt.strategy.ts`)
  - Added `TokenBlacklistService` dependency injection
  - Added blacklist check in `validate()` method
  - Enhanced error handling for blacklisted tokens
  - Returns 401 when token is revoked

- [x] **Auth Module** updated (`auth.module.ts`)
  - Added `TokenBlacklistService` import statement
  - Added `TokenBlacklistService` to providers array
  - RedisModule already imported (no changes needed)

- [x] **Auth Controller Reference** created (`auth.controller.updated.ts`)
  - Updated logout endpoint implementation
  - Extracts token from request and blacklists it
  - Reference implementation provided

- [x] **Documentation** created
  - `JWT_BLACKLIST_IMPLEMENTATION.md` - Complete technical documentation
  - `IMPLEMENTATION_SUMMARY.md` - Quick reference guide
  - `IMPLEMENTATION_CHECKLIST.md` - This file
  - `auth.service.additions.ts` - Code snippets to add to auth.service.ts
  - `auth.service.enhanced.ts` - Complete enhanced version (reference)

## ⚠️ Manual Steps Required

### 1. Update `auth.controller.ts`

**File**: `organization/apps/api/src/modules/auth/auth.controller.ts`

**Change the logout method** (around line 98):

```typescript
// BEFORE:
@Post('logout')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
async logout() {
  // JWT tokens are stateless, so we just return success
  // Client should clear tokens on their side
  return { message: 'Logged out successfully' };
}

// AFTER:
@Post('logout')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiOperation({
  summary: 'Logout current user',
  description: 'Invalidates the current token by adding it to a blacklist. Token will be revoked immediately and cannot be used again.',
})
async logout(@Request() req: any) {
  // SECURITY: Extract token from request and blacklist it
  // This prevents the token from being used again even before expiration
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return { message: 'Logged out successfully' };
  }

  const token = authHeader.replace('Bearer ', '');
  return this.authService.logout(token);
}
```

### 2. Update `auth.service.ts`

**File**: `organization/apps/api/src/modules/auth/auth.service.ts`

This file requires MULTIPLE changes. See `auth.service.additions.ts` for detailed instructions.

#### 2.1 Add import at top of file

```typescript
import { TokenBlacklistService } from './token-blacklist.service';
```

#### 2.2 Add to constructor (around line 44)

```typescript
constructor(
  private usersService: UsersService,
  private jwtService: JwtService,
  private emailService: EmailService,
  private prisma: PrismaService,
  private configService: ConfigService,
  private serverTrackingService: ServerTrackingService,
  private accountLockoutService: AccountLockoutService,
  private tokenBlacklistService: TokenBlacklistService, // ← ADD THIS LINE
) {
  // ... existing code
}
```

#### 2.3 Add `generateToken` private method (insert after constructor, before validateUser)

```typescript
/**
 * Generate JWT token with unique ID (jti) for blacklist tracking
 * SECURITY: jti enables us to blacklist specific tokens
 */
private generateToken(payload: any, options?: any): string {
  const tokenPayload = {
    ...payload,
    jti: crypto.randomUUID(), // Add unique token ID
  };

  return this.jwtService.sign(tokenPayload, options);
}
```

#### 2.4 Add `logout` method (insert after login method)

```typescript
/**
 * Logout - Blacklist the current token
 * SECURITY: This makes the token invalid immediately
 */
async logout(token: string): Promise<{ message: string }> {
  try {
    const success = await this.tokenBlacklistService.blacklistToken(token);

    if (success) {
      this.logger.log('User logged out successfully, token blacklisted');
      return { message: 'Logged out successfully' };
    } else {
      this.logger.warn('Token blacklist failed during logout');
      return { message: 'Logged out successfully' };
    }
  } catch (error) {
    this.logger.error('Error during logout:', error);
    return { message: 'Logged out successfully' };
  }
}
```

#### 2.5 Add `invalidateAllUserTokens` method (after logout method)

```typescript
/**
 * Invalidate all tokens for a user
 * Use cases: password change, security breach, admin action
 */
async invalidateAllUserTokens(userId: string): Promise<boolean> {
  try {
    const success = await this.tokenBlacklistService.invalidateAllUserTokens(userId);

    if (success) {
      this.logger.log(`All tokens invalidated for user ${userId}`);
    }

    return success;
  } catch (error) {
    this.logger.error(`Error invalidating tokens for user ${userId}:`, error);
    return false;
  }
}
```

#### 2.6 Update `register()` method

Find and replace (around line 125):
```typescript
// FIND:
access_token: this.jwtService.sign({ sub: user.id, email: user.email, role: user.role }),

// REPLACE WITH:
access_token: this.generateToken({ sub: user.id, email: user.email, role: user.role }),
```

#### 2.7 Update `login()` method

Find and replace (around lines 135-138):
```typescript
// FIND:
return {
  user,
  access_token: this.jwtService.sign(payload),
  refresh_token: this.jwtService.sign(refreshPayload, {
    secret: this.configService.get<string>('JWT_REFRESH_SECRET') || this.configService.get<string>('JWT_SECRET'),
    expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '30d',
  }),
};

// REPLACE WITH:
return {
  user,
  access_token: this.generateToken(payload),
  refresh_token: this.generateToken(refreshPayload, {
    secret: this.configService.get<string>('JWT_REFRESH_SECRET') || this.configService.get<string>('JWT_SECRET'),
    expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '30d',
  }),
};
```

#### 2.8 Update `refreshToken()` method

Add blacklist check at the BEGINNING of the method (right after `try {`):

```typescript
async refreshToken(refreshToken: string): Promise<{ user: any; access_token: string; refresh_token: string }> {
  try {
    // ADD THESE 4 LINES:
    const isBlacklisted = await this.tokenBlacklistService.isTokenBlacklisted(refreshToken);
    if (isBlacklisted) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    // ... rest of existing code
```

AND update token generation in the same method (around lines 163-167):

```typescript
// FIND:
return {
  user,
  access_token: this.jwtService.sign(newPayload),
  refresh_token: this.jwtService.sign(newRefreshPayload, {
    secret: this.configService.get<string>('JWT_REFRESH_SECRET') || this.configService.get<string>('JWT_SECRET'),
    expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '30d',
  }),
};

// REPLACE WITH:
return {
  user,
  access_token: this.generateToken(newPayload),
  refresh_token: this.generateToken(newRefreshPayload, {
    secret: this.configService.get<string>('JWT_REFRESH_SECRET') || this.configService.get<string>('JWT_SECRET'),
    expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '30d',
  }),
};
```

#### 2.9 Update `socialLogin()` method

Find and replace (around lines 253-257):
```typescript
// FIND:
return {
  user: result,
  access_token: this.jwtService.sign(payload),
  refresh_token: this.jwtService.sign(refreshPayload, {
    secret: this.configService.get<string>('JWT_REFRESH_SECRET') || this.configService.get<string>('JWT_SECRET'),
    expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '30d',
  }),
};

// REPLACE WITH:
return {
  user: result,
  access_token: this.generateToken(payload),
  refresh_token: this.generateToken(refreshPayload, {
    secret: this.configService.get<string>('JWT_REFRESH_SECRET') || this.configService.get<string>('JWT_SECRET'),
    expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '30d',
  }),
};
```

#### 2.10 Update `resetPassword()` method

Add token invalidation BEFORE the final return statement (around line 723):

```typescript
await this.prisma.passwordReset.update({
  where: { id: matchingRecord.id },
  data: { used: true },
});

// ADD THESE 3 LINES:
// SECURITY: Invalidate all existing tokens when password changes
await this.invalidateAllUserTokens(user.id);
this.logger.log(`Password reset complete for user ${user.id}. All tokens invalidated.`);

return { message: 'Password has been reset successfully' };
```

## ⬜ Testing Steps

### 1. Test Logout Flow

```bash
# 1. Login and save token
TOKEN=$(curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  | jq -r '.access_token')

# 2. Access protected route (should work)
curl -X GET http://localhost:3000/users/me \
  -H "Authorization: Bearer $TOKEN"
# Expected: 200 OK

# 3. Logout
curl -X POST http://localhost:3000/auth/logout \
  -H "Authorization: Bearer $TOKEN"
# Expected: {"message":"Logged out successfully"}

# 4. Try protected route again (should fail)
curl -X GET http://localhost:3000/users/me \
  -H "Authorization: Bearer $TOKEN"
# Expected: 401 Unauthorized - "Token has been revoked"
```

### 2. Test Password Reset

```bash
# 1. Login and save token
TOKEN=$(curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  | jq -r '.access_token')

# 2. Reset password
curl -X POST http://localhost:3000/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token":"RESET_TOKEN_FROM_EMAIL","newPassword":"newPassword123"}'

# 3. Try to use old token (should fail)
curl -X GET http://localhost:3000/users/me \
  -H "Authorization: Bearer $TOKEN"
# Expected: 401 Unauthorized - "Token has been revoked"

# 4. Login with new password (should work)
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"newPassword123"}'
# Expected: 200 OK with new tokens
```

### 3. Check Redis

```bash
# Connect to Redis
redis-cli

# Check blacklisted tokens
KEYS token:blacklist:*

# Check user invalidations
KEYS user:tokens:invalidated:*

# Check a specific token
GET token:blacklist:<jti>

# Get TTL of a blacklisted token
TTL token:blacklist:<jti>
```

## ⬜ Optional Enhancements

### 1. Add Admin Force Logout Endpoint

Create a new endpoint to allow admins to revoke all sessions for a user:

```typescript
@Post('admin/users/:userId/revoke-sessions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
async revokeUserSessions(@Param('userId') userId: string) {
  await this.authService.invalidateAllUserTokens(userId);
  return { message: 'All user sessions revoked' };
}
```

### 2. Add Blacklist Metrics Endpoint

```typescript
@Get('admin/blacklist/stats')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
async getBlacklistStats() {
  return this.tokenBlacklistService.getBlacklistStats();
}
```

### 3. Add Cleanup Cron Job

```typescript
@Cron('0 0 * * *') // Run daily at midnight
async cleanupExpiredBlacklistEntries() {
  const cleaned = await this.tokenBlacklistService.cleanupExpiredEntries();
  this.logger.log(`Cleaned ${cleaned} expired blacklist entries`);
}
```

## 📋 Verification Checklist

After completing manual steps, verify:

- [ ] Application starts without errors
- [ ] Login works and returns tokens
- [ ] Logout invalidates the token
- [ ] Blacklisted token returns 401
- [ ] Password reset invalidates all tokens
- [ ] Refresh token checks blacklist
- [ ] New tokens have `jti` claim
- [ ] Redis contains blacklisted tokens
- [ ] Redis keys have proper TTL
- [ ] Logs show blacklist operations

## 🚨 Troubleshooting

### Application won't start

**Error**: `Cannot find module './token-blacklist.service'`
- Check that `token-blacklist.service.ts` exists in the auth module directory
- Check that `auth.module.ts` has the import statement

**Error**: `TokenBlacklistService is not a provider`
- Check that `TokenBlacklistService` is in the `providers` array in `auth.module.ts`

### Redis connection errors

**Error**: `Redis Client Error: connect ECONNREFUSED`
- Check Redis is running: `redis-cli ping`
- Check Redis configuration in `.env`
- Verify REDIS_HOST and REDIS_PORT

### Tokens not being blacklisted

**Issue**: Logout succeeds but token still works
- Check Redis connection
- Verify `auth.controller.ts` logout method extracts token correctly
- Check `auth.service.ts` has the `logout()` method
- Verify `jwt.strategy.ts` checks blacklist

### All requests returning 401

**Issue**: Even valid tokens get 401
- Check if `TokenBlacklistService.isTokenBlacklisted()` has errors
- Verify Redis is accessible
- Check JWT Strategy implementation
- Review logs for blacklist check errors

## 📚 Reference Documents

- **JWT_BLACKLIST_IMPLEMENTATION.md** - Complete technical documentation
- **IMPLEMENTATION_SUMMARY.md** - Quick reference guide
- **auth.service.additions.ts** - Exact code snippets to add
- **auth.service.enhanced.ts** - Full enhanced version (for comparison)
- **auth.controller.updated.ts** - Updated controller (for comparison)

## ✅ Final Verification

Once all steps are complete:

1. Run the application
2. Execute all test scenarios
3. Check Redis for blacklisted tokens
4. Verify logs show blacklist operations
5. Test in production-like environment
6. Monitor for any performance issues

## 🎉 Success Criteria

- ✅ Logout actually invalidates tokens
- ✅ Password change revokes all sessions
- ✅ Compromised tokens can be blacklisted
- ✅ System performance remains good (~1ms overhead)
- ✅ Redis automatically cleans expired entries
- ✅ Works across distributed systems

## Support

If you encounter issues:
1. Check this checklist
2. Review implementation documentation
3. Check application logs
4. Verify Redis connection and data
5. Compare with reference implementations
