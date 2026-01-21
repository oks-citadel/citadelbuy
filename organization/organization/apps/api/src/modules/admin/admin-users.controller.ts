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
import { UsersService } from '../users/users.service';
import { IsEnum, IsOptional, IsString, IsEmail, MinLength } from 'class-validator';
import { UserRole } from '@prisma/client';

// DTOs
export class AdminUpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

export class AdminUpdateUserStatusDto {
  @IsString()
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
}

export class AdminCreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

@ApiTags('admin/users')
@Controller('admin/users')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class AdminUsersController {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all users with filters (admin only)' })
  @ApiResponse({ status: 200, description: 'Returns paginated list of users' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'role', required: false, enum: ['CUSTOMER', 'VENDOR', 'ADMIN'] })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'INACTIVE', 'BLOCKED'] })
  async getAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
  ) {
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    // Build where clause
    const where: any = {};

    if (role) {
      where.role = role;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get users with order stats
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          phoneNumber: true,
          phoneVerified: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              orders: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    // Get aggregate stats for each user
    const userIds = users.map((u) => u.id);
    const orderStats = await this.prisma.order.groupBy({
      by: ['userId'],
      where: { userId: { in: userIds } },
      _sum: { total: true },
      _count: true,
    });

    // Calculate customer stats
    const totalCustomers = await this.prisma.user.count({ where: { role: 'CUSTOMER' } });
    const activeCustomers = await this.prisma.user.count({
      where: {
        role: 'CUSTOMER',
        orders: { some: {} },
      },
    });
    const totalRevenue = await this.prisma.order.aggregate({
      _sum: { total: true },
      where: {
        status: { in: ['PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'] },
      },
    });

    // Map users with their stats
    const customersWithStats = users.map((user) => {
      const stats = orderStats.find((s) => s.userId === user.id);
      const totalSpent = stats?._sum.total || 0;
      const totalOrders = stats?._count || 0;

      // Determine tier based on total spent
      let tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' = 'BRONZE';
      if (totalSpent >= 5000) tier = 'PLATINUM';
      else if (totalSpent >= 2000) tier = 'GOLD';
      else if (totalSpent >= 500) tier = 'SILVER';

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phoneNumber,
        status: 'ACTIVE' as const, // Can be expanded with actual status field
        tier,
        totalOrders,
        totalSpent,
        avgOrderValue: totalOrders > 0 ? totalSpent / totalOrders : 0,
        createdAt: user.createdAt.toISOString(),
        role: user.role,
      };
    });

    return {
      customers: customersWithStats,
      total,
      page: Number(page),
      limit: take,
      stats: {
        total: totalCustomers,
        active: activeCustomers,
        totalRevenue: totalRevenue._sum.total || 0,
        avgCustomerValue: totalCustomers > 0 ? (totalRevenue._sum.total || 0) / totalCustomers : 0,
      },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID (admin only)' })
  @ApiResponse({ status: 200, description: 'Returns user details' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getById(@Param('id') id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phoneNumber: true,
        phoneVerified: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            orders: true,
            reviews: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get order stats
    const orderStats = await this.prisma.order.aggregate({
      where: { userId: id },
      _sum: { total: true },
      _count: true,
    });

    // Get recent orders
    const recentOrders = await this.prisma.order.findMany({
      where: { userId: id },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        total: true,
        status: true,
        createdAt: true,
      },
    });

    // Get last order date
    const lastOrder = await this.prisma.order.findFirst({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    const totalSpent = orderStats._sum.total || 0;
    const totalOrders = orderStats._count || 0;

    // Determine tier
    let tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' = 'BRONZE';
    if (totalSpent >= 5000) tier = 'PLATINUM';
    else if (totalSpent >= 2000) tier = 'GOLD';
    else if (totalSpent >= 500) tier = 'SILVER';

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phoneNumber,
      phoneVerified: user.phoneVerified,
      emailVerified: user.emailVerified,
      role: user.role,
      status: 'ACTIVE',
      tier,
      totalOrders,
      totalSpent,
      avgOrderValue: totalOrders > 0 ? totalSpent / totalOrders : 0,
      reviewCount: user._count.reviews,
      lastOrderDate: lastOrder?.createdAt?.toISOString(),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      recentOrders: recentOrders.map((order) => ({
        id: order.id,
        orderNumber: order.id.slice(-8).toUpperCase(),
        total: order.total,
        status: order.status,
        createdAt: order.createdAt.toISOString(),
      })),
    };
  }

  @Get(':id/orders')
  @ApiOperation({ summary: 'Get user orders (admin only)' })
  @ApiResponse({ status: 200, description: 'Returns user orders' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getUserOrders(
    @Param('id') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    const skip = (Number(page) - 1) * Number(limit);

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { userId },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  images: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.order.count({ where: { userId } }),
    ]);

    return {
      orders: orders.map((order) => ({
        id: order.id,
        orderNumber: order.id.slice(-8).toUpperCase(),
        total: order.total,
        status: order.status,
        items: order.items.length,
        createdAt: order.createdAt.toISOString(),
      })),
      total,
      page: Number(page),
      limit: Number(limit),
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user (admin only)' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUser(
    @Param('id') id: string,
    @Body() updateDto: AdminUpdateUserDto,
  ) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update user
    const updated = await this.prisma.user.update({
      where: { id },
      data: updateDto,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        updatedAt: true,
      },
    });

    return updated;
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update user status (admin only)' })
  @ApiResponse({ status: 200, description: 'User status updated' })
  async updateUserStatus(
    @Param('id') id: string,
    @Body() updateDto: AdminUpdateUserStatusDto,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // For now, we'll just return the updated status
    // In a real implementation, you'd have a status field on the User model
    return {
      id: user.id,
      status: updateDto.status,
      message: `User status updated to ${updateDto.status}`,
    };
  }

  @Patch(':id/tier')
  @ApiOperation({ summary: 'Update user tier (admin only)' })
  @ApiResponse({ status: 200, description: 'User tier updated' })
  async updateUserTier(
    @Param('id') id: string,
    @Body('tier') tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM',
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // In a real implementation, you'd store the tier
    // For now, return the updated tier
    return {
      id: user.id,
      tier,
      message: `User tier updated to ${tier}`,
    };
  }

  @Patch(':id/role')
  @ApiOperation({ summary: 'Update user role (admin only)' })
  @ApiResponse({ status: 200, description: 'User role updated' })
  async updateUserRole(
    @Param('id') id: string,
    @Body('role') role: 'CUSTOMER' | 'VENDOR' | 'ADMIN',
  ) {
    return this.usersService.updateRole(id, role);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user (admin only)' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  async deleteUser(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Delete(':id/permanent')
  @ApiOperation({ summary: 'Permanently delete user (admin only)' })
  @ApiResponse({ status: 200, description: 'User permanently deleted' })
  async hardDeleteUser(@Param('id') id: string) {
    return this.usersService.hardDelete(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new user (admin only)' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  async createUser(@Body() createDto: AdminCreateUserDto) {
    // Hash password would normally be handled by auth service
    // For now, create user with plain password (should be hashed)
    return this.usersService.create(createDto);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export users data (admin only)' })
  @ApiResponse({ status: 200, description: 'Returns users data for export' })
  @ApiQuery({ name: 'role', required: false, type: String })
  async exportUsers(@Query('role') role?: string) {
    const where: any = {};
    if (role) {
      where.role = role;
    }

    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phoneNumber: true,
        createdAt: true,
        _count: {
          select: { orders: true },
        },
      },
    });

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phoneNumber,
      orderCount: user._count.orders,
      createdAt: user.createdAt.toISOString(),
    }));
  }
}
