# Users Module - Developer Guide

## Overview

The Users module provides comprehensive user management, profile management, address management, and user preferences functionality for the Broxiva e-commerce platform.

## Features

### User Management
- User CRUD operations (Create, Read, Update, Delete)
- User authentication and authorization
- Role-based access control (CUSTOMER, VENDOR, ADMIN)
- Profile management
- Account deletion (soft delete with anonymization)

### Address Management
- Multiple shipping/billing addresses per user
- Default address selection
- Address types: SHIPPING, BILLING, BOTH
- Address labels (Home, Work, Office, etc.)
- CRUD operations for addresses

### User Preferences
- Newsletter subscription
- Notification preferences (push, email, SMS)
- Language and currency settings
- Timezone configuration

## Module Structure

```
users/
├── dto/
│   ├── index.ts                    # Barrel export
│   ├── create-user.dto.ts          # User creation DTO
│   ├── update-profile.dto.ts       # Profile update DTO
│   ├── update-preferences.dto.ts   # Preferences DTO
│   └── address.dto.ts              # Address DTOs
├── users.controller.ts             # User endpoints
├── users.service.ts                # User business logic
├── address.service.ts              # Address business logic
├── data-export.service.ts          # GDPR data export
├── data-deletion.service.ts        # GDPR data deletion
├── users.module.ts                 # Module definition
├── users.service.spec.ts           # Service tests
└── users.controller.spec.ts        # Controller tests
```

## API Endpoints

### User Profile (Customer)

#### Get Current User Profile
```http
GET /users/profile
Authorization: Bearer {jwt_token}
```

#### Update Current User Profile
```http
PATCH /users/profile
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "name": "John Doe",
  "phone": "+1 (555) 123-4567",
  "avatar": "https://cdn.example.com/avatar.jpg",
  "preferences": {
    "newsletter": true,
    "notifications": true,
    "language": "en"
  }
}
```

#### Delete Own Account
```http
DELETE /users/profile
Authorization: Bearer {jwt_token}
```

### User Preferences

#### Get User Preferences
```http
GET /users/preferences
Authorization: Bearer {jwt_token}
```

#### Update User Preferences
```http
PATCH /users/preferences
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "newsletter": true,
  "notifications": true,
  "emailNotifications": true,
  "smsNotifications": false,
  "language": "en",
  "currency": "USD",
  "timezone": "America/New_York"
}
```

### Address Management

#### List All Addresses
```http
GET /users/addresses
Authorization: Bearer {jwt_token}
```

#### Get Default Address
```http
GET /users/addresses/default
Authorization: Bearer {jwt_token}
```

#### Get Specific Address
```http
GET /users/addresses/{id}
Authorization: Bearer {jwt_token}
```

#### Create New Address
```http
POST /users/addresses
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "fullName": "John Doe",
  "email": "john@example.com",
  "phone": "+1 (555) 123-4567",
  "street": "123 Main Street, Apt 4B",
  "city": "New York",
  "state": "NY",
  "postalCode": "10001",
  "country": "United States",
  "label": "Home",
  "type": "SHIPPING",
  "isDefault": true
}
```

#### Update Address
```http
PATCH /users/addresses/{id}
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "street": "456 Oak Avenue",
  "isDefault": true
}
```

#### Set Address as Default
```http
PATCH /users/addresses/{id}/set-default
Authorization: Bearer {jwt_token}
```

#### Delete Address
```http
DELETE /users/addresses/{id}
Authorization: Bearer {jwt_token}
```

### User Management (Admin Only)

#### List All Users
```http
GET /users?skip=0&take=50&role=CUSTOMER
Authorization: Bearer {jwt_token}
X-User-Role: ADMIN
```

#### Get User by ID
```http
GET /users/{id}
Authorization: Bearer {jwt_token}
X-User-Role: ADMIN
```

#### Update User Role
```http
PATCH /users/{id}/role
Authorization: Bearer {jwt_token}
X-User-Role: ADMIN
Content-Type: application/json

{
  "role": "VENDOR"
}
```

#### Delete User
```http
DELETE /users/{id}
Authorization: Bearer {jwt_token}
X-User-Role: ADMIN
```

## Usage Examples

### Creating a User (TypeScript)

```typescript
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';

// In your service or controller
const createUserDto: CreateUserDto = {
  email: 'user@example.com',
  password: 'hashed_password',
  name: 'John Doe',
  role: 'CUSTOMER', // Optional, defaults to CUSTOMER
};

const user = await usersService.create(createUserDto);
```

### Managing Addresses (TypeScript)

```typescript
import { AddressService } from './address.service';
import { CreateAddressDto } from './dto/address.dto';

// Create an address
const addressDto: CreateAddressDto = {
  fullName: 'John Doe',
  street: '123 Main St',
  city: 'New York',
  state: 'NY',
  postalCode: '10001',
  country: 'United States',
  type: 'SHIPPING',
  isDefault: true,
};

const address = await addressService.create(userId, addressDto);

// Get all addresses
const addresses = await addressService.findAllByUserId(userId);

// Set default
await addressService.setDefault(addressId, userId);
```

### Using Role-Based Guards (TypeScript)

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  @Get('dashboard')
  @Roles('ADMIN')
  getDashboard() {
    return { message: 'Admin dashboard' };
  }

  @Get('vendor-panel')
  @Roles('ADMIN', 'VENDOR')
  getVendorPanel() {
    return { message: 'Vendor panel' };
  }
}
```

## Database Models

### User Model
```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  name      String
  role      UserRole @default(CUSTOMER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum UserRole {
  CUSTOMER
  VENDOR
  ADMIN
}
```

### SavedAddress Model
```prisma
model SavedAddress {
  id         String      @id @default(uuid())
  userId     String
  fullName   String
  email      String?
  phone      String?
  street     String
  city       String
  state      String
  postalCode String
  country    String
  label      String?
  type       AddressType @default(SHIPPING)
  isDefault  Boolean     @default(false)
  createdAt  DateTime    @default(now())
  updatedAt  DateTime    @updatedAt
}

enum AddressType {
  SHIPPING
  BILLING
  BOTH
}
```

## Security

### Authentication
All endpoints require JWT authentication via the `JwtAuthGuard`.

### Authorization
- **Customer endpoints**: Accessible by authenticated users
- **Admin endpoints**: Require `AdminGuard` or `@Roles('ADMIN')`
- **Ownership verification**: Services verify user owns the resource before modification

### Data Protection
- Passwords are never returned in API responses
- Soft delete anonymizes user data instead of hard delete
- Address access is restricted to the owning user

## Testing

### Running Tests
```bash
# Unit tests
npm test users.service.spec.ts
npm test users.controller.spec.ts

# E2E tests
npm run test:e2e
```

### Example Test
```typescript
describe('AddressService', () => {
  it('should create an address', async () => {
    const userId = 'user-123';
    const addressDto: CreateAddressDto = {
      fullName: 'John Doe',
      street: '123 Main St',
      city: 'New York',
      state: 'NY',
      postalCode: '10001',
      country: 'USA',
    };

    const address = await addressService.create(userId, addressDto);
    expect(address).toBeDefined();
    expect(address.userId).toBe(userId);
  });
});
```

## Error Handling

The module uses NestJS standard exceptions:

- `NotFoundException`: Resource not found (404)
- `ConflictException`: Duplicate email or constraint violation (409)
- `ForbiddenException`: Insufficient permissions (403)
- `UnauthorizedException`: Invalid or missing authentication (401)
- `BadRequestException`: Invalid input data (400)

## Future Enhancements

1. **Email Verification**: Add email verification workflow
2. **Phone Verification**: Add SMS verification
3. **2FA**: Two-factor authentication
4. **Profile Photos**: File upload for avatars
5. **Address Validation**: Integration with Google Maps API
6. **Preferences Persistence**: Store preferences in database
7. **Activity Log**: Track user actions for audit

## Related Modules

- **Auth Module**: User authentication and JWT tokens
- **Privacy Module**: GDPR compliance, data export/deletion
- **Orders Module**: Uses user addresses for shipping
- **Reviews Module**: User-generated product reviews

## Support

For issues or questions:
- Review the scan report: `USERS_PROFILES_SCAN_REPORT.md`
- Check API documentation: `/api/docs` (Swagger)
- Contact: dev@broxiva.com
