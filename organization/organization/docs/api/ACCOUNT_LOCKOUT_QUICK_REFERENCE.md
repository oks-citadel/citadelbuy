# Account Lockout - Quick Reference

## Summary

Prevents brute force attacks by locking accounts after 5 failed login attempts.

## Key Features

- **5 failed attempts** → Account locked for 15 minutes
- **Automatic expiration** → Lockout clears after time expires
- **Exponential backoff** → Repeated lockouts increase duration (max 24 hours)
- **IP tracking** → Separate lockout for IPs (10 attempts)
- **Email notifications** → Users notified when account is locked
- **Admin tools** → Unlock accounts, view security logs

## Configuration (AccountLockoutService)

```typescript
MAX_ATTEMPTS = 5                      // Login attempts before lockout
LOCKOUT_DURATION_MINUTES = 15         // Initial lockout time
ATTEMPT_WINDOW_MINUTES = 30           // Time window for counting attempts
LOCKOUT_MULTIPLIER = 2                // Exponential backoff factor
MAX_LOCKOUT_DURATION_HOURS = 24       // Maximum lockout time
```

## User Flow

1. User enters wrong password → Failed attempt recorded
2. After 5 failed attempts → Account locked for 15 minutes
3. User tries to login → Receives lockout error with time remaining
4. After 15 minutes → Lockout automatically expires
5. User logs in successfully → Failed attempt counter reset

## Admin Operations

### Unlock Account
```bash
POST /auth/admin/unlock/:email
Authorization: Bearer {admin_token}
```

### Check Lockout Status
```bash
GET /auth/admin/lockout-status/:email
Authorization: Bearer {admin_token}
```

### View Security Logs
```bash
GET /auth/admin/security-logs/:email
Authorization: Bearer {admin_token}
```

## Error Messages

### Account Locked (Email)
```json
{
  "statusCode": 401,
  "message": "Account is temporarily locked due to multiple failed login attempts. Please try again in 14 minute(s)."
}
```

### Account Locked (IP)
```json
{
  "statusCode": 401,
  "message": "Too many failed login attempts from this location. Please try again in 28 minute(s)."
}
```

## Redis Keys

- `auth:lockout:email:{email}` - Email lockout data
- `auth:lockout:ip:{ip}` - IP lockout data
- `auth:attempts:{email}` - Security audit logs (last 100 entries)

## Email Notifications

### When Account is Locked
- Subject: "Security Alert: Account Temporarily Locked"
- Contains: Duration, unlock time, IP address, security tips

### When Admin Unlocks
- Subject: "Account Unlocked"
- Contains: Confirmation, login link, security advice

## Security Events Logged

| Event | Description |
|-------|-------------|
| `failed_login` | Incorrect password attempt |
| `account_locked` | Account locked due to failures |
| `account_unlocked` | Admin manually unlocked account |
| `successful_login_after_failures` | Login succeeded after previous failures |

## Testing

### Trigger Lockout
```bash
# Attempt login 5 times with wrong password
for i in {1..5}; do
  curl -X POST http://localhost:3000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}'
done
```

### Admin Unlock
```bash
curl -X POST http://localhost:3000/auth/admin/unlock/test@example.com \
  -H "Authorization: Bearer {admin_token}"
```

## Monitoring

```bash
# Count locked accounts
redis-cli KEYS "auth:lockout:email:*" | wc -l

# View security logs
redis-cli LRANGE "auth:attempts:user@example.com" 0 -1

# Check specific lockout
redis-cli GET "auth:lockout:email:user@example.com"
```

## Integration Points

### Files Modified
- `auth.service.ts` - validateUser() checks lockout
- `auth.controller.ts` - Login passes request for IP tracking
- `local.strategy.ts` - Passes request to validateUser()
- `auth.module.ts` - Registers AccountLockoutService

### Dependencies
- Redis (for lockout state and audit logs)
- Email service (for notifications)
- Prisma (for user lookups)

## Important Notes

- Lockouts are automatic - no manual intervention needed
- Failed attempts count within a 30-minute window
- IP lockout threshold is 2x email threshold (10 vs 5)
- All admin unlock actions are logged
- Email notifications don't reveal if email exists (security)
- Compatible with existing rate limiting

## Troubleshooting

### User Can't Login
1. Check lockout status: `GET /auth/admin/lockout-status/:email`
2. Review security logs: `GET /auth/admin/security-logs/:email`
3. Unlock if legitimate: `POST /auth/admin/unlock/:email`

### Lockout Not Working
1. Verify Redis is running: `redis-cli ping`
2. Check RedisService is injected in AuthModule
3. Ensure request object is passed to validateUser()

### Email Not Sent
1. Check email service configuration
2. Review email service logs
3. Email failures don't block lockout (logged only)

## Compliance

Meets requirements for:
- PCI DSS 8.1.6 (Account lockout)
- NIST 800-63B (Authentication)
- SOC 2 (Access control)
- GDPR Article 32 (Security measures)
