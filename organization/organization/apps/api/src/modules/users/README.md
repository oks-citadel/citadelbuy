# Users Module

User profile management, address management, and GDPR-compliant data handling.

## Endpoints

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/api/users/:id` | Get user profile | Yes (Self/Admin) |
| PUT | `/api/users/:id` | Update user profile | Yes (Self/Admin) |
| DELETE | `/api/users/:id` | Delete user account | Yes (Self/Admin) |
| GET | `/api/users/:id/addresses` | List user addresses | Yes (Self) |
| POST | `/api/users/:id/addresses` | Add address | Yes (Self) |
| PUT | `/api/users/:id/addresses/:addressId` | Update address | Yes (Self) |
| DELETE | `/api/users/:id/addresses/:addressId` | Delete address | Yes (Self) |

## User Roles

| Role | Description |
|------|-------------|
| `CUSTOMER` | Standard customer account |
| `VENDOR` | Seller/merchant account |
| `ADMIN` | Platform administrator |
| `SUPER_ADMIN` | Full system access |

## Services

- `UsersService` - User CRUD operations
- Profile management
- Address management
- GDPR data export/deletion

## GDPR Compliance

- Data export (`GET /api/users/:id/data-export`)
- Account deletion with data anonymization
- Consent management

## Related Modules

- `AuthModule` - Authentication
- `PrivacyModule` - GDPR compliance
- `OrganizationModule` - Team membership
