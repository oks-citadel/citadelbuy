# Migration: Add User Phone Fields

**Date:** December 6, 2025
**Migration ID:** 20251206_add_user_phone_fields

## Summary

This migration adds phone number support to the User model, including fields for phone verification tracking.

## Changes

### Schema Changes

Added three new fields to the `users` table:

1. **phoneNumber** (String, optional)
   - User's phone number
   - Can be stored in E.164 format (e.g., +15551234567) or local format
   - Nullable to allow users without phone numbers

2. **phoneVerified** (Boolean, default: false)
   - Indicates whether the phone number has been verified
   - Defaults to `false` for security
   - Set to `true` after successful SMS verification

3. **phoneVerifiedAt** (DateTime, optional)
   - Timestamp when the phone number was verified
   - Null until verification is complete
   - Used for audit trails and verification expiry

### Performance Optimization

- Added index on `phoneNumber` field for efficient lookups

## Code Changes

### Updated Files

1. **Prisma Schema** (`schema.prisma`)
   - Added phone fields to User model

2. **SMS Service** (`src/modules/notifications/sms.service.ts`)
   - Updated `sendSmsToUser()` to use the new `phoneNumber` field
   - Added `markPhoneAsVerified()` method
   - Added `updateUserPhoneNumber()` method

3. **Users Service** (`src/modules/users/users.service.ts`)
   - Updated select statements to include phone fields
   - Added `updatePhoneNumber()` method
   - Added `markPhoneAsVerified()` method

4. **Users Controller** (`src/modules/users/users.controller.ts`)
   - Added `PATCH /users/phone` endpoint
   - Added `POST /users/phone/verify` endpoint

5. **DTOs**
   - Updated `CreateUserDto` and `UpdateProfileDto` to use `phoneNumber`
   - Created `UpdatePhoneDto` and `VerifyPhoneDto`

## API Endpoints

### Update Phone Number
```
PATCH /users/phone
Authorization: Bearer <token>

Body:
{
  "phoneNumber": "+15551234567"
}

Response:
{
  "id": "user-id",
  "email": "user@example.com",
  "phoneNumber": "+15551234567",
  "phoneVerified": false,
  "phoneVerifiedAt": null,
  ...
}
```

### Verify Phone Number
```
POST /users/phone/verify
Authorization: Bearer <token>

Body:
{
  "code": "123456"
}

Response:
{
  "id": "user-id",
  "email": "user@example.com",
  "phoneNumber": "+15551234567",
  "phoneVerified": true,
  "phoneVerifiedAt": "2025-12-06T15:45:00Z",
  ...
}
```

## Running the Migration

### Apply Migration
```bash
# Using Prisma
npx prisma migrate deploy

# Or manually
psql -d your_database -f migration.sql
```

### Rollback Migration
```bash
# Manually rollback
psql -d your_database -f down.sql
```

## Testing

After running the migration:

1. Verify schema changes:
   ```sql
   \d users
   ```

2. Test phone number update:
   ```bash
   curl -X PATCH http://localhost:3000/users/phone \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"phoneNumber": "+15551234567"}'
   ```

3. Test phone verification:
   ```bash
   curl -X POST http://localhost:3000/users/phone/verify \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"code": "123456"}'
   ```

## Notes

- Phone numbers can be stored in any format but E.164 is recommended
- SMS service includes validation and normalization
- Phone verification is reset when phone number is changed
- Verification code validation needs to be implemented (TODO in controller)
- Consider adding rate limiting for verification attempts

## Backward Compatibility

- All new fields are optional or have defaults
- Existing user records will have `phoneNumber = null`, `phoneVerified = false`, `phoneVerifiedAt = null`
- No breaking changes to existing API endpoints
- Existing functionality remains unchanged

## Security Considerations

- Phone numbers should be validated before storage
- Verification codes should expire after 10 minutes
- Implement rate limiting on verification attempts
- Consider adding phone number uniqueness constraint if business logic requires it
- Log all phone verification attempts for security audit

## Future Enhancements

1. Add verification code storage and validation
2. Implement rate limiting on SMS sending
3. Add phone number uniqueness constraint (if needed)
4. Support for multiple phone numbers per user
5. Phone number change history tracking
6. Two-factor authentication via SMS
