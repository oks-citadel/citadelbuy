import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
  Post,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { PrismaService } from '../../common/prisma/prisma.service';
import { VendorStatus, VendorApplicationStatus } from '@prisma/client';
import { IsString, IsOptional, IsNumber, IsEnum, IsBoolean } from 'class-validator';

// DTOs
export class ApproveVendorDto {
  @IsOptional()
  @IsNumber()
  commissionRate?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectVendorDto {
  @IsString()
  reason: string;
}

export class SuspendVendorDto {
  @IsString()
  reason: string;
}

export class UpdateVendorCommissionDto {
  @IsNumber()
  commissionRate: number;
}

@ApiTags('admin/vendors')
@Controller('admin/vendors')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class AdminVendorsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Get all vendors with filters (admin only)' })
  @ApiResponse({ status: 200, description: 'Returns paginated list of vendors' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'INACTIVE'] })
  async getAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    // Build where clause
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { businessName: { contains: search, mode: 'insensitive' } },
        { businessEmail: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [vendors, total] = await Promise.all([
      this.prisma.vendorProfile.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          application: {
            select: {
              status: true,
              submittedAt: true,
              reviewedAt: true,
            },
          },
          _count: {
            select: {
              payouts: true,
            },
          },
        },
      }),
      this.prisma.vendorProfile.count({ where }),
    ]);

    // Get product and order stats for each vendor
    const vendorIds = vendors.map((v) => v.id);

    const productCounts = await this.prisma.product.groupBy({
      by: ['vendorId'],
      where: { vendorId: { in: vendorIds } },
      _count: true,
    });

    // Calculate stats
    const totalVendors = await this.prisma.vendorProfile.count();
    const pendingVendors = await this.prisma.vendorProfile.count({
      where: { status: VendorStatus.PENDING_VERIFICATION },
    });
    const activeVendors = await this.prisma.vendorProfile.count({
      where: { status: VendorStatus.ACTIVE },
    });
    const totalGMV = await this.prisma.vendorProfile.aggregate({
      _sum: { totalRevenue: true },
    });
    const totalCommission = await this.prisma.vendorProfile.aggregate({
      _sum: { totalSales: true },
    });

    // Map vendors with stats
    const vendorsWithStats = vendors.map((vendor) => {
      const productCount = productCounts.find((p) => p.vendorId === vendor.id)?._count || 0;

      return {
        id: vendor.id,
        storeName: vendor.businessName,
        ownerName: vendor.user?.name || 'N/A',
        email: vendor.businessEmail || vendor.user?.email,
        phone: vendor.businessPhone,
        status: vendor.status,
        rating: vendor.averageRating || 0,
        reviewCount: 0, // Would need to aggregate from reviews
        totalProducts: productCount,
        totalOrders: vendor.totalOrders || 0,
        totalRevenue: vendor.totalRevenue || 0,
        commission: (vendor.totalRevenue || 0) * (vendor.commissionRate || 10) / 100,
        commissionRate: vendor.commissionRate || 10,
        isVerified: vendor.isVerified,
        canSell: vendor.canSell,
        createdAt: vendor.createdAt.toISOString(),
        verifiedAt: vendor.verifiedAt?.toISOString(),
        applicationStatus: vendor.application?.status,
      };
    });

    return {
      vendors: vendorsWithStats,
      total,
      page: Number(page),
      limit: take,
      stats: {
        total: totalVendors,
        pending: pendingVendors,
        active: activeVendors,
        totalGMV: totalGMV._sum.totalRevenue || 0,
        totalCommission: (totalGMV._sum.totalRevenue || 0) * 0.1, // Approximate
      },
    };
  }

  @Get('applications')
  @ApiOperation({ summary: 'Get pending vendor applications (admin only)' })
  @ApiResponse({ status: 200, description: 'Returns pending applications' })
  async getPendingApplications() {
    const applications = await this.prisma.vendorApplication.findMany({
      where: { status: VendorApplicationStatus.PENDING },
      orderBy: { submittedAt: 'desc' },
      include: {
        vendorProfile: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return applications.map((app) => ({
      id: app.id,
      vendorProfileId: app.vendorProfileId,
      storeName: app.vendorProfile.businessName,
      ownerName: app.vendorProfile.user?.name,
      email: app.vendorProfile.businessEmail || app.vendorProfile.user?.email,
      phone: app.vendorProfile.businessPhone,
      businessType: app.vendorProfile.businessType,
      status: app.status,
      submittedAt: app.submittedAt?.toISOString(),
      documentsSubmitted: app.documentsSubmitted,
    }));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get vendor by ID (admin only)' })
  @ApiResponse({ status: 200, description: 'Returns vendor details' })
  async getById(@Param('id') id: string) {
    const vendor = await this.prisma.vendorProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
          },
        },
        application: true,
        payouts: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    // Get product count
    const productCount = await this.prisma.product.count({
      where: { vendorId: vendor.id },
    });

    // Get review stats
    const reviewStats = await this.prisma.review.aggregate({
      where: {
        product: {
          vendorId: vendor.id,
        },
      },
      _avg: { rating: true },
      _count: true,
    });

    return {
      id: vendor.id,
      storeName: vendor.businessName,
      businessType: vendor.businessType,
      description: vendor.description,
      ownerName: vendor.user?.name,
      email: vendor.businessEmail || vendor.user?.email,
      phone: vendor.businessPhone,
      website: vendor.website,
      address: vendor.businessAddress,
      logoUrl: vendor.logoUrl,
      bannerUrl: vendor.bannerUrl,
      status: vendor.status,
      isVerified: vendor.isVerified,
      canSell: vendor.canSell,
      commissionRate: vendor.commissionRate || 10,
      rating: reviewStats._avg.rating || vendor.averageRating || 0,
      reviewCount: reviewStats._count || 0,
      totalProducts: productCount,
      totalOrders: vendor.totalOrders || 0,
      totalRevenue: vendor.totalRevenue || 0,
      totalSales: vendor.totalSales || 0,
      createdAt: vendor.createdAt.toISOString(),
      verifiedAt: vendor.verifiedAt?.toISOString(),
      application: vendor.application,
      recentPayouts: vendor.payouts,
    };
  }

  @Get(':id/products')
  @ApiOperation({ summary: 'Get vendor products (admin only)' })
  @ApiResponse({ status: 200, description: 'Returns vendor products' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getVendorProducts(
    @Param('id') vendorId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    const skip = (Number(page) - 1) * Number(limit);

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where: { vendorId },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          price: true,
          stock: true,
          isActive: true,
          images: true,
          createdAt: true,
          _count: {
            select: { orderItems: true },
          },
        },
      }),
      this.prisma.product.count({ where: { vendorId } }),
    ]);

    return {
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        stock: p.stock,
        isActive: p.isActive,
        image: p.images?.[0],
        sales: p._count.orderItems,
        createdAt: p.createdAt.toISOString(),
      })),
      total,
      page: Number(page),
      limit: Number(limit),
    };
  }

  @Get(':id/payouts')
  @ApiOperation({ summary: 'Get vendor payouts (admin only)' })
  @ApiResponse({ status: 200, description: 'Returns vendor payouts' })
  async getVendorPayouts(
    @Param('id') vendorId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    const skip = (Number(page) - 1) * Number(limit);

    const [payouts, total] = await Promise.all([
      this.prisma.vendorPayout.findMany({
        where: { vendorProfileId: vendorId },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.vendorPayout.count({ where: { vendorProfileId: vendorId } }),
    ]);

    return {
      payouts,
      total,
      page: Number(page),
      limit: Number(limit),
    };
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve vendor application (admin only)' })
  @ApiResponse({ status: 200, description: 'Vendor approved successfully' })
  async approveVendor(
    @Param('id') id: string,
    @Body() approveDto: ApproveVendorDto,
  ) {
    const vendor = await this.prisma.vendorProfile.findUnique({
      where: { id },
      include: { application: true },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    // Update vendor profile and application
    const result = await this.prisma.$transaction(async (tx) => {
      // Update application status if exists
      if (vendor.application) {
        await tx.vendorApplication.update({
          where: { id: vendor.application.id },
          data: {
            status: VendorApplicationStatus.APPROVED,
            reviewedAt: new Date(),
            reviewNotes: approveDto.notes,
          },
        });
      }

      // Update vendor profile
      return tx.vendorProfile.update({
        where: { id },
        data: {
          status: VendorStatus.ACTIVE,
          isVerified: true,
          canSell: true,
          verifiedAt: new Date(),
          commissionRate: approveDto.commissionRate || 10,
        },
      });
    });

    return {
      id: result.id,
      status: result.status,
      isVerified: result.isVerified,
      canSell: result.canSell,
      message: 'Vendor approved successfully',
    };
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Reject vendor application (admin only)' })
  @ApiResponse({ status: 200, description: 'Vendor rejected' })
  async rejectVendor(
    @Param('id') id: string,
    @Body() rejectDto: RejectVendorDto,
  ) {
    const vendor = await this.prisma.vendorProfile.findUnique({
      where: { id },
      include: { application: true },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      if (vendor.application) {
        await tx.vendorApplication.update({
          where: { id: vendor.application.id },
          data: {
            status: VendorApplicationStatus.REJECTED,
            reviewedAt: new Date(),
            reviewNotes: rejectDto.reason,
          },
        });
      }

      return tx.vendorProfile.update({
        where: { id },
        data: {
          status: VendorStatus.INACTIVE,
          canSell: false,
        },
      });
    });

    return {
      id: result.id,
      status: result.status,
      message: 'Vendor application rejected',
    };
  }

  @Patch(':id/suspend')
  @ApiOperation({ summary: 'Suspend vendor (admin only)' })
  @ApiResponse({ status: 200, description: 'Vendor suspended' })
  async suspendVendor(
    @Param('id') id: string,
    @Body() suspendDto: SuspendVendorDto,
  ) {
    const vendor = await this.prisma.vendorProfile.findUnique({
      where: { id },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const result = await this.prisma.vendorProfile.update({
      where: { id },
      data: {
        status: VendorStatus.SUSPENDED,
        canSell: false,
        suspensionReason: suspendDto.reason,
      },
    });

    return {
      id: result.id,
      status: result.status,
      message: 'Vendor suspended',
    };
  }

  @Patch(':id/reactivate')
  @ApiOperation({ summary: 'Reactivate suspended vendor (admin only)' })
  @ApiResponse({ status: 200, description: 'Vendor reactivated' })
  async reactivateVendor(@Param('id') id: string) {
    const vendor = await this.prisma.vendorProfile.findUnique({
      where: { id },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const result = await this.prisma.vendorProfile.update({
      where: { id },
      data: {
        status: VendorStatus.ACTIVE,
        canSell: true,
        suspensionReason: null,
      },
    });

    return {
      id: result.id,
      status: result.status,
      message: 'Vendor reactivated successfully',
    };
  }

  @Patch(':id/commission')
  @ApiOperation({ summary: 'Update vendor commission rate (admin only)' })
  @ApiResponse({ status: 200, description: 'Commission rate updated' })
  async updateCommission(
    @Param('id') id: string,
    @Body() updateDto: UpdateVendorCommissionDto,
  ) {
    const vendor = await this.prisma.vendorProfile.findUnique({
      where: { id },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    if (updateDto.commissionRate < 0 || updateDto.commissionRate > 100) {
      throw new BadRequestException('Commission rate must be between 0 and 100');
    }

    const result = await this.prisma.vendorProfile.update({
      where: { id },
      data: {
        commissionRate: updateDto.commissionRate,
      },
    });

    return {
      id: result.id,
      commissionRate: result.commissionRate,
      message: 'Commission rate updated',
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete vendor (admin only)' })
  @ApiResponse({ status: 200, description: 'Vendor deleted' })
  async deleteVendor(@Param('id') id: string) {
    const vendor = await this.prisma.vendorProfile.findUnique({
      where: { id },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    // Soft delete - mark as inactive
    await this.prisma.vendorProfile.update({
      where: { id },
      data: {
        status: VendorStatus.INACTIVE,
        canSell: false,
      },
    });

    return {
      id,
      message: 'Vendor deleted successfully',
    };
  }
}
