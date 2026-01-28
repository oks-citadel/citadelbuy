# Auth Module

JWT-based authentication module with MFA support, token blacklisting, and account lockout protection.

## Endpoints

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | User login | No |
| POST | `/api/auth/refresh` | Refresh access token | No (refresh token) |
| POST | `/api/auth/logout` | Logout and invalidate tokens | Yes |
| GET | `/api/auth/me` | Get current user | Yes |
| POST | `/api/auth/admin/login` | Admin login | No |

## Features

- **JWT Authentication**: Access tokens (15min default) and refresh tokens (30d default)
- **Token Blacklisting**: Invalidated tokens stored in Redis for security
- **Account Lockout**: 5 failed attempts triggers lockout with exponential backoff
- **MFA Enforcement**: TOTP-based multi-factor authentication for admin/vendor roles
- **Social Login**: Google, Facebook, Apple, GitHub OAuth support

## Configuration

Required environment variables:

```env
JWT_SECRET=your-jwt-secret-min-64-chars
JWT_REFRESH_SECRET=your-refresh-secret-min-64-chars
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
MFA_REQUIRED_ROLES=ADMIN,VENDOR
MFA_GRACE_PERIOD_DAYS=7
```

## Services

- `AuthService` - Core authentication logic
- `TokenBlacklistService` - JWT invalidation management
- `AccountLockoutService` - Brute force protection
- `MfaEnforcementService` - Multi-factor authentication

## Guards

- `JwtAuthGuard` - Validates JWT tokens
- `AdminGuard` - Restricts to admin users
- `RolesGuard` - Role-based access control

## Usage

```typescript
// Controller with authentication
@Controller('protected')
@UseGuards(JwtAuthGuard)
export class ProtectedController {
  @Get()
  @Roles('ADMIN')
  adminOnly() {
    return 'Admin access';
  }
}
```
