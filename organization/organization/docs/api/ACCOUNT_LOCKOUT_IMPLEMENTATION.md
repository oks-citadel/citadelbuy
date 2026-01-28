# Account Lockout Implementation - Security Enhancement

## Overview

This implementation adds comprehensive account lockout functionality to prevent brute force attacks on the authentication system. The system tracks failed login attempts and automatically locks accounts after a configurable threshold is reached.

## Features Implemented

### 1. **Failed Login Attempt Tracking**
- Tracks failed login attempts per email address and IP address
- Stores attempt data in Redis for fast access and automatic expiration
- Records attempt metadata (timestamp, IP, user agent) for security auditing

### 2. **Account Lockout Mechanism**
- **Threshold**: Account locks after 5 failed login attempts
- **Initial Lockout Duration**: 15 minutes
- **Exponential Backoff**: Each subsequent lockout doubles the duration
  - 1st lockout: 15 minutes
  - 2nd lockout: 30 minutes
  - 3rd lockout: 60 minutes
  - Maximum: 24 hours
- **IP-Based Lockout**: Separate lockout for excessive attempts from a single IP (threshold: 10 attempts)

### 3. **Automatic Lockout Expiration**
- Lockouts automatically expire after the configured duration
- Expired lockouts are cleared on next login attempt
- Failed attempt counters reset after successful login

### 4. **Security Notifications**
- Email notifications sent when account is locked
- Email includes:
  - Lockout duration
  - IP address of failed attempts
  - Instructions for recovery
  - Security recommendations

### 5. **Security Audit Logging**
- All failed login attempts logged with details:
  - Email address
  - IP address
  - User agent
  - Timestamp
  - Attempt number
- Logs stored in Redis (last 100 entries per user)
- Logs retained for 30 days
- Events tracked:
  - `failed_login`: Failed authentication attempt
  - `account_locked`: Account locked due to failed attempts
  - `account_unlocked`: Admin-initiated unlock
  - `successful_login_after_failures`: Successful login after previous failures

### 6. **Admin Management Tools**
- **Unlock Account**: Admins can manually unlock locked accounts
- **View Lockout Status**: Check if an account is locked and see details
- **Security Logs**: View failed login attempts and security events
- All admin actions are logged for audit purposes

### 7. **Rate Limiting Integration**
- Works alongside existing throttle decorators
- Login endpoint has stricter rate limiting (5 attempts per minute)
- Provides defense-in-depth security

## Files Created/Modified

### New Files
1. `organization/apps/api/src/modules/auth/account-lockout.service.ts`
   - Core lockout logic and Redis integration
   - Email notifications
   - Security event logging

2. `organization/apps/api/src/modules/auth/admin-auth.controller.ts`
   - Admin endpoints for account management
   - Lockout status checking
   - Security log retrieval

### Modified Files
1. `organization/apps/api/src/modules/auth/auth.service.ts`
   - Integrated lockout checks in `validateUser()`
   - Clear lockout on successful login
   - IP address extraction logic

2. `organization/apps/api/src/modules/auth/auth.module.ts`
   - Added `AccountLockoutService` provider
   - Added `RedisModule` import
   - Exported lockout service for use in other modules

3. `organization/apps/api/src/modules/auth/strategies/local.strategy.ts`
   - Updated to pass request object to `validateUser()`
   - Enables IP tracking and security logging

4. `organization/apps/api/src/modules/auth/auth.controller.ts`
   - Updated login endpoint to pass request object
   - Enhanced API documentation with lockout information

## Configuration

The lockout system uses the following configurable values (in `AccountLockoutService`):

```typescript
private readonly MAX_ATTEMPTS = 5;                    // Attempts before lockout
private readonly LOCKOUT_DURATION_MINUTES = 15;       // Initial lockout duration
private readonly ATTEMPT_WINDOW_MINUTES = 30;         // Time window for attempt counting
private readonly LOCKOUT_MULTIPLIER = 2;              // Exponential backoff multiplier
private readonly MAX_LOCKOUT_DURATION_HOURS = 24;     // Maximum lockout duration
```

## Redis Keys Used

- `auth:lockout:email:{email}` - Email-based lockout tracking
- `auth:lockout:ip:{ip}` - IP-based lockout tracking
- `auth:attempts:{email}` - Security audit logs per user

## API Endpoints

### User Endpoints
- `POST /auth/login` - Login with lockout protection

### Admin Endpoints
- `POST /auth/admin/unlock/:email` - Manually unlock an account
- `GET /auth/admin/lockout-status/:email` - Get lockout status
- `GET /auth/admin/security-logs/:email` - View security audit logs

## Security Considerations

### 1. **Timing Attack Prevention**
- Failed attempts recorded even for non-existent users
- Response time consistent for valid and invalid emails
- Prevents user enumeration through timing analysis

### 2. **IP Tracking**
- Extracts client IP from various headers (x-forwarded-for, x-real-ip, etc.)
- Handles proxy and CDN scenarios
- Separate lockout mechanism for IPs prevents distributed attacks

### 3. **Defense in Depth**
- Works alongside rate limiting
- Multiple layers of protection:
  - Global rate limiting (5 req/min)
  - Email-based lockout (5 attempts)
  - IP-based lockout (10 attempts)

### 4. **Privacy**
- No sensitive information in error messages
- Generic "Invalid credentials" response
- Lockout emails only sent to actual account owners

### 5. **Audit Trail**
- All security events logged
- Admin unlock actions tracked
- 30-day retention for compliance

## Testing Recommendations

### Manual Testing
1. **Test Failed Attempts**:
   ```bash
   # Attempt login 5 times with wrong password
   curl -X POST http://localhost:3000/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"wrong"}'
   ```

2. **Test Lockout**:
   - After 5 failed attempts, should receive lockout error
   - Error message should include time remaining

3. **Test Auto-Expiration**:
   - Wait 15 minutes
   - Attempt login again - should work if using correct password

4. **Test Admin Unlock**:
   ```bash
   # Unlock account as admin
   curl -X POST http://localhost:3000/auth/admin/unlock/test@example.com \
     -H "Authorization: Bearer {admin_token}"
   ```

### Automated Testing
Create E2E tests for:
- Multiple failed login attempts
- Account lockout triggering
- Lockout expiration
- Admin unlock functionality
- IP-based lockout
- Exponential backoff

## Email Notifications

### Lockout Email
Sent when account is locked. Includes:
- Lockout duration
- Unlock time
- IP address of attempts
- Security recommendations
- Support contact information

### Unlock Email
Sent when admin unlocks account. Includes:
- Confirmation of unlock
- Login link
- Security advice

## Monitoring

Monitor the following metrics:
- Number of lockouts per day
- Most locked accounts
- IP addresses with multiple lockouts
- Failed attempt patterns

Query Redis for statistics:
```bash
# Count locked accounts
redis-cli KEYS "auth:lockout:email:*"

# View security logs for specific user
redis-cli LRANGE "auth:attempts:user@example.com" 0 -1
```

## Future Enhancements

1. **CAPTCHA Integration**: Add CAPTCHA after 3 failed attempts
2. **Geolocation Alerts**: Notify users of logins from unusual locations
3. **Two-Factor Authentication**: Additional security layer
4. **Adaptive Thresholds**: Machine learning to detect suspicious patterns
5. **Account Recovery**: Self-service unlock via email verification
6. **Dashboard**: Admin dashboard for security monitoring

## Compliance

This implementation helps meet security requirements for:
- **PCI DSS**: Requirement 8.1.6 (account lockout after failed attempts)
- **NIST 800-63B**: Digital Identity Guidelines
- **GDPR**: Security of processing (Article 32)
- **SOC 2**: Access control and security monitoring

## Support

For questions or issues:
- Review security logs: `GET /auth/admin/security-logs/:email`
- Check lockout status: `GET /auth/admin/lockout-status/:email`
- Manual unlock: `POST /auth/admin/unlock/:email`

## Changelog

### Version 1.0.0 (2025-12-04)
- Initial implementation
- Email and IP-based lockout
- Exponential backoff
- Email notifications
- Admin management tools
- Security audit logging
