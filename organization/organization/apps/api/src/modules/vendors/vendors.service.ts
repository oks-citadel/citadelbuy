import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import {
  VendorRegistrationDto,
  UpdateVendorProfileDto,
  UpdateBankingInfoDto,
  PayoutRequestDto,
  CreateCommissionRuleDto,
  UpdateCommissionRuleDto,
  PerformanceMetricsQueryDto,
  VerifyVendorDto,
  ApproveApplicationDto,
  RejectApplicationDto,
  SuspendVendorDto,
  VendorQueryDto,
} from './dto';
import { VendorStatus, VendorApplicationStatus } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class VendorsService {
  private readonly ENCRYPTION_ALGORITHM = 'aes-256-cbc';

  constructor(private readonly prisma: PrismaService) {}

  // ==================== VENDOR REGISTRATION & ONBOARDING ====================

  async registerVendor(userId: string, dto: VendorRegistrationDto) {
    // Check if user already has a vendor profile
    const existingProfile = await this.prisma.vendorProfile.findUnique({
      where: { userId },
    });

    if (existingProfile) {
      throw new ConflictException('User already has a vendor profile');
    }

    // Create vendor profile and application in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const vendorProfile = await tx.vendorProfile.create({
        data: {
          userId,
          businessName: dto.businessName,
          businessType: dto.businessType,
          taxId: dto.taxId,
          businessAddress: dto.businessAddress,
          businessPhone: dto.businessPhone,
          businessEmail: dto.businessEmail,
          website: dto.website,
          description: dto.description,
          logoUrl: dto.logoUrl,
          bannerUrl: dto.bannerUrl,
          socialMedia: dto.socialMedia as any,
          status: VendorStatus.PENDING_VERIFICATION,
          isVerified: false,
          canSell: false,
        },
      });

      const application = await tx.vendorApplication.create({
        data: {
          vendorProfile: { connect: { id: vendorProfile.id } },
          status: VendorApplicationStatus.PENDING,
          applicationData: dto as any,
          documentsSubmitted: dto.documents || [],
          submittedAt: new Date(),
          businessInfoComplete: true,
          bankingInfoComplete: false,
          documentsComplete: dto.documents ? true : false,
          agreementSigned: false,
        },
      });

      return { vendorProfile, application };
    });

    return result;
  }

  // ==================== VENDOR PROFILE MANAGEMENT ====================

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
      totalSales: profile.totalSales || 0,
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

  // ==================== BANKING & PAYOUTS ====================

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
        bankName: dto.bankName,
        accountNumber: encryptedAccountNumber,
        routingNumber: dto.routingNumber,
        paypalEmail: dto.paypalEmail,
        stripeAccountId: dto.stripeAccountId,
      },
    });

    return { success: true, message: 'Banking information updated successfully' };
  }

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

  // ==================== ADMIN FUNCTIONS ====================

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

  // ==================== HELPER METHODS ====================

  private encryptData(data: string): string {
    const ENCRYPTION_KEY = process.env.BANKING_ENCRYPTION_KEY;

    if (!ENCRYPTION_KEY) {
      throw new Error('BANKING_ENCRYPTION_KEY environment variable is required for encrypting banking data');
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
    const ENCRYPTION_KEY = process.env.BANKING_ENCRYPTION_KEY;

    if (!ENCRYPTION_KEY) {
      throw new Error('BANKING_ENCRYPTION_KEY environment variable is required for decrypting banking data');
    }

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
}
