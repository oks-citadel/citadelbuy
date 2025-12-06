# Phone Number Feature - Developer Guide

## Quick Reference

This guide provides quick examples for working with the phone number feature in the CitadelBuy platform.

## Database Schema

```prisma
model User {
  phoneNumber     String?    // User's phone number (optional)
  phoneVerified   Boolean    // Default: false
  phoneVerifiedAt DateTime?  // Timestamp when verified
}
```

## API Endpoints

### 1. Update Phone Number

**Endpoint:** `PATCH /users/phone`

**Authentication:** Required (JWT Bearer token)

**Request:**
```json
{
  "phoneNumber": "+15551234567"
}
```

**Response:**
```json
{
  "id": "user-id",
  "phoneNumber": "+15551234567",
  "phoneVerified": false,
  "phoneVerifiedAt": null
}
```

### 2. Verify Phone Number

**Endpoint:** `POST /users/phone/verify`

**Authentication:** Required (JWT Bearer token)

**Request:**
```json
{
  "code": "123456"
}
```

**Response:**
```json
{
  "id": "user-id",
  "phoneNumber": "+15551234567",
  "phoneVerified": true,
  "phoneVerifiedAt": "2025-12-06T15:45:00Z"
}
```

## Service Layer Usage

### UsersService

```typescript
import { UsersService } from './users.service';

// Update phone number
const user = await usersService.updatePhoneNumber(userId, '+15551234567');
// Returns: { phoneNumber: '+15551234567', phoneVerified: false, phoneVerifiedAt: null }

// Mark phone as verified
const verifiedUser = await usersService.markPhoneAsVerified(userId);
// Returns: { phoneVerified: true, phoneVerifiedAt: '2025-12-06T...' }

// Get user with phone info
const user = await usersService.findById(userId);
// Returns: { phoneNumber, phoneVerified, phoneVerifiedAt, ... }
```

### SmsService

```typescript
import { SmsService } from '../notifications/sms.service';

// Send SMS to user (checks phone number and preferences)
const result = await smsService.sendSmsToUser(
  userId,
  'Your order has shipped!',
  'order_updates'
);

// Send verification code
const result = await smsService.sendVerificationCodeSms(
  '+15551234567',
  '123456'
);

// Update user's phone number (with validation)
const result = await smsService.updateUserPhoneNumber(
  userId,
  '+15551234567'
);

// Mark phone as verified
const success = await smsService.markPhoneAsVerified(userId);
```

## Controller Examples

### Update Phone in Profile

```typescript
@UseGuards(JwtAuthGuard)
@Patch('profile')
async updateProfile(@Request() req, @Body() data: UpdateProfileDto) {
  // UpdateProfileDto includes optional phoneNumber field
  return this.usersService.updateProfile(req.user.id, data);
}
```

### Dedicated Phone Update Endpoint

```typescript
@UseGuards(JwtAuthGuard)
@Patch('phone')
async updatePhoneNumber(@Request() req, @Body() dto: UpdatePhoneDto) {
  return this.usersService.updatePhoneNumber(req.user.id, dto.phoneNumber);
}
```

## Prisma Queries

### Select Phone Fields

```typescript
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: {
    id: true,
    email: true,
    phoneNumber: true,
    phoneVerified: true,
    phoneVerifiedAt: true,
  },
});
```

### Filter by Phone Number

```typescript
const user = await prisma.user.findFirst({
  where: {
    phoneNumber: '+15551234567',
  },
});
```

### Filter Verified Users

```typescript
const verifiedUsers = await prisma.user.findMany({
  where: {
    phoneVerified: true,
    phoneNumber: { not: null },
  },
});
```

### Update Phone Number

```typescript
const user = await prisma.user.update({
  where: { id: userId },
  data: {
    phoneNumber: '+15551234567',
    phoneVerified: false,
    phoneVerifiedAt: null,
  },
});
```

## DTOs

### UpdatePhoneDto

```typescript
class UpdatePhoneDto {
  @IsString()
  phoneNumber: string;  // e.g., "+15551234567"
}
```

### VerifyPhoneDto

```typescript
class VerifyPhoneDto {
  @IsString()
  @Matches(/^\d{6}$/)
  code: string;  // e.g., "123456"
}
```

### UpdateProfileDto

```typescript
class UpdateProfileDto {
  @IsString()
  @IsOptional()
  phoneNumber?: string;  // e.g., "+15551234567"
}
```

## Best Practices

### 1. Always Reset Verification on Phone Change

```typescript
// GOOD
await prisma.user.update({
  where: { id: userId },
  data: {
    phoneNumber: newPhone,
    phoneVerified: false,      // Reset verification
    phoneVerifiedAt: null,     // Clear timestamp
  },
});

// BAD - doesn't reset verification
await prisma.user.update({
  where: { id: userId },
  data: { phoneNumber: newPhone },
});
```

### 2. Check Phone Exists Before Sending SMS

```typescript
// GOOD
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: { phoneNumber: true },
});

if (!user?.phoneNumber) {
  throw new Error('User has no phone number');
}

await smsService.sendSms({ to: user.phoneNumber, message: 'Hello!' });

// BAD - might fail with null phone
await smsService.sendSms({ to: user.phoneNumber, message: 'Hello!' });
```

### 3. Use SMS Service for Validation

```typescript
// GOOD - validates and normalizes
const validation = await smsService.validatePhoneNumber(phoneNumber);
if (!validation.valid) {
  throw new BadRequestException(validation.error);
}
const normalizedPhone = validation.formatted;

// BAD - no validation
await prisma.user.update({
  data: { phoneNumber: phoneNumber },
});
```

### 4. Check Verification for Sensitive Operations

```typescript
// GOOD - verify phone for sensitive operations
async sendPasswordResetCode(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { phoneNumber: true, phoneVerified: true },
  });

  if (!user.phoneVerified) {
    throw new UnauthorizedException('Phone number must be verified');
  }

  // Send reset code...
}
```

## Common Workflows

### Phone Number Update Flow

1. User updates phone number via `PATCH /users/phone`
2. Backend validates phone format
3. Phone number saved, verification reset
4. Verification code sent via SMS
5. User submits code via `POST /users/phone/verify`
6. Backend validates code (TODO: implement)
7. Phone marked as verified

### SMS Notification Flow

1. Event triggers notification (e.g., order shipped)
2. Check user notification preferences
3. Verify user has phone number
4. Check phone verified status (optional)
5. Send SMS via Twilio
6. Log result for audit

## Error Handling

### Phone Number Missing

```typescript
if (!user.phoneNumber) {
  throw new BadRequestException('Phone number not configured');
}
```

### Phone Not Verified

```typescript
if (!user.phoneVerified) {
  throw new UnauthorizedException('Phone number must be verified');
}
```

### Invalid Phone Format

```typescript
const validation = await smsService.validatePhoneNumber(phone);
if (!validation.valid) {
  throw new BadRequestException('Invalid phone number format');
}
```

## Testing Examples

### Unit Test

```typescript
describe('updatePhoneNumber', () => {
  it('should update phone and reset verification', async () => {
    const result = await service.updatePhoneNumber(userId, '+15551234567');

    expect(result.phoneNumber).toBe('+15551234567');
    expect(result.phoneVerified).toBe(false);
    expect(result.phoneVerifiedAt).toBeNull();
  });
});
```

### Integration Test

```typescript
describe('PATCH /users/phone', () => {
  it('should update phone number', async () => {
    const response = await request(app)
      .patch('/users/phone')
      .set('Authorization', `Bearer ${token}`)
      .send({ phoneNumber: '+15551234567' })
      .expect(200);

    expect(response.body.phoneNumber).toBe('+15551234567');
  });
});
```

## Security Considerations

1. **Rate Limiting:** Limit verification attempts to prevent abuse
2. **Code Expiration:** Verification codes should expire (e.g., 10 minutes)
3. **Audit Logging:** Log all phone number changes and verification attempts
4. **Privacy:** Don't expose phone numbers in public APIs
5. **Validation:** Always validate phone format before storage

## Migration

To apply the phone number schema changes:

```bash
# Navigate to API directory
cd organization/apps/api

# Run migration
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Restart server
npm run start:dev
```

## Environment Variables

Required for SMS functionality:

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+15551234567
```

## Support

- Migration docs: `prisma/migrations/20251206_add_user_phone_fields/README.md`
- Implementation summary: `PHONE_NUMBER_IMPLEMENTATION.md`
- SMS service: `src/modules/notifications/sms.service.ts`
