# Vendor Service Implementation Guide

## Overview
This document provides the complete implementation for all remaining VendorsService methods.

---

## Methods to Add to `vendors.service.ts`

### 1. Get Vendor Profile

```typescript
async getVendorProfile(userId: string) {
  const profile = await this.prisma.vendorProfile.findUnique({
    where: { userId },
    include: {
      application: true,
      payouts: {
        take: 5,
        orderBy: { createdAt: 'desc' },
      },
      commissionRules: {
        where: { isActive: true },
      },
    },
  });

  if (!profile) {
    throw new NotFoundException('Vendor profile not found');
  }

  return profile;
}
```

### 2. Get Vendor Dashboard

```typescript
async getVendorDashboard(userId: string) {
  const profile = await this.getVendorProfile(userId);

  const totalProducts = await this.prisma.product.count({
    where: { vendorId: profile.id },
  });

  const metrics = {
    totalRevenue: profile.totalRevenue || 0,
    totalOrders: profile.totalOrders || 0,
    totalProducts,
    averageRating: profile.averageRating || 0,
    totalReviews: profile.totalReviews || 0,
  };

  return {
    profile: {
      businessName: profile.businessName,
      status: profile.status,
      isVerified: profile.isVerified,
      canSell: profile.canSell,
      commissionRate: profile.commissionRate,
      logoUrl: profile.logoUrl,
    },
    metrics,
  };
}
```

### 3. Update Vendor Profile

```typescript
async updateVendorProfile(userId: string, dto: UpdateVendorProfileDto) {
  const profile = await this.prisma.vendorProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    throw new NotFoundException('Vendor profile not found');
  }

  const updated = await this.prisma.vendorProfile.update({
    where: { id: profile.id },
    data: {
      businessName: dto.businessName,
      businessType: dto.businessType,
      businessAddress: dto.businessAddress,
      businessPhone: dto.businessPhone,
      businessEmail: dto.businessEmail,
      website: dto.website,
      description: dto.description,
      logoUrl: dto.logoUrl,
      bannerUrl: dto.bannerUrl,
      socialMedia: dto.socialMedia as any,
    },
  });

  return updated;
}
```

### 4. Update Banking Info

```typescript
async updateBankingInfo(userId: string, dto: UpdateBankingInfoDto) {
  const profile = await this.prisma.vendorProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    throw new NotFoundException('Vendor profile not found');
  }

  let encryptedAccountNumber = null;
  if (dto.accountNumber) {
    encryptedAccountNumber = this.encryptData(dto.accountNumber);
  }

  await this.prisma.vendorProfile.update({
    where: { id: profile.id },
    data: {
      payoutMethod: dto.payoutMethod,
      bankName: dto.bankName,
      accountHolderName: dto.accountHolderName,
      bankAccountNumber: encryptedAccountNumber,
      bankRoutingNumber: dto.routingNumber,
      paypalEmail: dto.paypalEmail,
      stripeAccountId: dto.stripeAccountId,
    },
  });

  return { success: true, message: 'Banking information updated successfully' };
}
```

### 5. Get Payouts

```typescript
async getPayouts(userId: string, limit = 20, offset = 0) {
  const profile = await this.prisma.vendorProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    throw new NotFoundException('Vendor profile not found');
  }

  const payouts = await this.prisma.vendorPayout.findMany({
    where: { vendorProfileId: profile.id },
    take: limit,
    skip: offset,
    orderBy: { createdAt: 'desc' },
  });

  const total = await this.prisma.vendorPayout.count({
    where: { vendorProfileId: profile.id },
  });

  return { payouts, total, limit, offset };
}
```

### 6. Approve Vendor Application (Admin)

```typescript
async approveVendorApplication(applicationId: string, dto: ApproveApplicationDto) {
  const application = await this.prisma.vendorApplication.findUnique({
    where: { id: applicationId },
    include: { vendorProfile: true },
  });

  if (!application) {
    throw new NotFoundException('Application not found');
  }

  const result = await this.prisma.$transaction(async (tx) => {
    const updatedApp = await tx.vendorApplication.update({
      where: { id: applicationId },
      data: {
        status: VendorApplicationStatus.APPROVED,
        reviewedAt: new Date(),
        reviewNotes: dto.notes,
      },
    });

    const updatedProfile = await tx.vendorProfile.update({
      where: { id: application.vendorProfileId },
      data: {
        status: VendorStatus.ACTIVE,
        isVerified: true,
        canSell: true,
        commissionRate: dto.commissionRate || 15.0,
      },
    });

    return { application: updatedApp, profile: updatedProfile };
  });

  return result;
}
```

### 7. Get All Vendors (Admin)

```typescript
async getAllVendors(query: VendorQueryDto) {
  const where: any = {};

  if (query.status) {
    where.status = query.status;
  }

  if (query.isVerified !== undefined) {
    where.isVerified = query.isVerified;
  }

  if (query.search) {
    where.OR = [
      { businessName: { contains: query.search, mode: 'insensitive' } },
      { businessEmail: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const vendors = await this.prisma.vendorProfile.findMany({
    where,
    take: query.limit || 20,
    skip: query.offset || 0,
    orderBy: { createdAt: 'desc' },
    include: {
      application: true,
      _count: {
        select: {
          payouts: true,
        },
      },
    },
  });

  const total = await this.prisma.vendorProfile.count({ where });

  return { vendors, total, limit: query.limit || 20, offset: query.offset || 0 };
}
```

### 8. Encryption Helper Methods

```typescript
private encryptData(data: string): string {
  const ENCRYPTION_KEY = process.env.BANKING_ENCRYPTION_KEY || 'default-key-change-in-production-32b';

  if (ENCRYPTION_KEY === 'default-key-change-in-production-32b') {
    console.warn('Using default encryption key. Please set BANKING_ENCRYPTION_KEY in production!');
  }

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    this.ENCRYPTION_ALGORITHM,
    Buffer.from(ENCRYPTION_KEY),
    iv
  );

  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return iv.toString('hex') + ':' + encrypted;
}

private decryptData(encryptedData: string): string {
  const ENCRYPTION_KEY = process.env.BANKING_ENCRYPTION_KEY || 'default-key-change-in-production-32b';
  const parts = encryptedData.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];

  const decipher = crypto.createDecipheriv(
    this.ENCRYPTION_ALGORITHM,
    Buffer.from(ENCRYPTION_KEY),
    iv
  );

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

---

## Implementation Priority

### Phase 1: Core Vendor Methods (Immediate)
1. ✅ `registerVendor` - Already implemented
2. `getVendorProfile` - Critical for dashboard
3. `getVendorDashboard` - Critical for vendor portal
4. `updateVendorProfile` - Important for settings
5. `getPayouts` - Important for payouts page

### Phase 2: Banking & Payouts
6. `updateBankingInfo` - Banking settings
7. `requestPayout` - Vendor payout requests
8. `processPayouts` - Admin payout processing

### Phase 3: Admin Functions
9. `approveVendorApplication` - Admin approval workflow
10. `rejectVendorApplication` - Admin rejection workflow
11. `getAllVendors` - Admin vendor list
12. `verifyVendor` - Admin verification
13. `suspendVendor` - Admin suspension

### Phase 4: Advanced Features
14. `calculateCommission` - Commission engine
15. `calculatePerformanceMetrics` - Metrics calculation
16. `createCommissionRule` - Custom commission rules

---

## Controller Updates Required

Update `vendors.controller.ts` to call these methods:

```typescript
@Get('profile')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiOperation({ summary: 'Get vendor profile' })
async getProfile(@Request() req) {
  return this.vendorsService.getVendorProfile(req.user.userId);
}

@Get('dashboard')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiOperation({ summary: 'Get vendor dashboard' })
async getDashboard(@Request() req) {
  return this.vendorsService.getVendorDashboard(req.user.userId);
}

@Patch('profile')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiOperation({ summary: 'Update vendor profile' })
async updateProfile(@Request() req, @Body() dto: UpdateVendorProfileDto) {
  return this.vendorsService.updateVendorProfile(req.user.userId, dto);
}

@Get('payouts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiOperation({ summary: 'Get vendor payouts' })
async getPayouts(@Request() req, @Query('limit') limit?: number, @Query('offset') offset?: number) {
  return this.vendorsService.getPayouts(req.user.userId, limit, offset);
}
```

---

## Testing Checklist

- [ ] Test vendor registration endpoint
- [ ] Test get profile endpoint
- [ ] Test get dashboard endpoint
- [ ] Test update profile endpoint
- [ ] Test get payouts endpoint
- [ ] Test admin approve application
- [ ] Test admin get all vendors

---

## Next Steps

1. Manually copy the methods above into `vendors.service.ts`
2. Update the controller implementation
3. Test each endpoint with Postman/Insomnia
4. Fix any TypeScript compilation errors
5. Deploy updated backend

---

**Note:** Due to file size limitations, these methods should be manually added to the service file. Copy each method in the order listed above to maintain code organization.
