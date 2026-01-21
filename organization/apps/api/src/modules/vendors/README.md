# Vendors Module

Multi-vendor marketplace management including registration, KYC verification, payouts, and analytics.

## Endpoints

### Public Endpoints

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/api/vendors` | List vendors | No |
| GET | `/api/vendors/:id` | Get vendor profile | No |
| GET | `/api/vendors/:id/products` | List vendor products | No |

### Vendor Endpoints

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| POST | `/api/vendors` | Register as vendor | Yes |
| PUT | `/api/vendors/:id` | Update vendor profile | Yes (Owner) |
| GET | `/api/vendor/analytics` | Get vendor analytics | Yes (Vendor) |
| GET | `/api/vendor/payouts` | List payouts | Yes (Vendor) |
| GET | `/api/vendor/commissions` | View commission rates | Yes (Vendor) |
| POST | `/api/vendor/bulk-upload` | Bulk product upload | Yes (Vendor) |

### Admin Endpoints

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/api/admin/vendors` | List all vendors | Yes (Admin) |
| PUT | `/api/admin/vendors/:id/approve` | Approve vendor | Yes (Admin) |
| PUT | `/api/admin/vendors/:id/suspend` | Suspend vendor | Yes (Admin) |
| GET | `/api/admin/payouts` | Manage payouts | Yes (Admin) |
| PUT | `/api/admin/commissions` | Set commission rates | Yes (Admin) |

## Vendor Verification Status

| Status | Description |
|--------|-------------|
| `PENDING` | Application submitted |
| `UNDER_REVIEW` | KYC in progress |
| `APPROVED` | Active vendor |
| `SUSPENDED` | Account suspended |
| `REJECTED` | Application rejected |

## Services

- `VendorsService` - Vendor CRUD operations
- `VendorPayoutsService` - Payout management
- `VendorCommissionsService` - Commission calculation
- `BulkUploadService` - CSV product import
- `FeaturedListingsService` - Promoted products

## Commission Structure

Default commission rates by category (configurable):

- Electronics: 8%
- Fashion: 12%
- Home & Garden: 10%
- Default: 10%

## Related Modules

- `OrganizationKycModule` - KYC verification
- `PaymentsModule` - Payout processing
- `AnalyticsModule` - Business analytics
