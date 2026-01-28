import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { OrdersService } from '../orders/orders.service';
import { ProductsService } from '../products/products.service';
import { AdminUsersController } from './admin-users.controller';
import { AdminVendorsController } from './admin-vendors.controller';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminOrdersController } from './admin-orders.controller';
import { AdminProductsController } from './admin-products.controller';
import { VendorStatus, VendorApplicationStatus, OrderStatus } from '@prisma/client';

/**
 * Admin Module Unit Tests
 *
 * Tests for the admin module controllers which handle:
 * - User management (AdminUsersController)
 * - Vendor management (AdminVendorsController)
 * - Dashboard statistics (AdminDashboardController)
 * - Order management (AdminOrdersController)
 * - Product management (AdminProductsController)
 */
describe('Admin Module', () => {
  // Mock services
  const mockPrismaService = {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    order: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    vendorProfile: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      aggregate: jest.fn(),
    },
    vendorApplication: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    vendorPayout: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    orderItem: {
      groupBy: jest.fn(),
    },
    review: {
      aggregate: jest.fn(),
    },
    returnRequest: {
      count: jest.fn(),
    },
    category: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockUsersService = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByEmail: jest.fn(),
    create: jest.fn(),
    updateRole: jest.fn(),
    remove: jest.fn(),
    hardDelete: jest.fn(),
  };

  const mockOrdersService = {
    findAll: jest.fn(),
    updateOrderStatus: jest.fn(),
    getOrderStats: jest.fn(),
  };

  const mockProductsService = {
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getProductStats: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('AdminUsersController', () => {
    let controller: AdminUsersController;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        controllers: [AdminUsersController],
        providers: [
          { provide: PrismaService, useValue: mockPrismaService },
          { provide: UsersService, useValue: mockUsersService },
        ],
      }).compile();

      controller = module.get<AdminUsersController>(AdminUsersController);
    });

    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    describe('getAll', () => {
      it('should return paginated list of users with stats', async () => {
        const mockUsers = [
          {
            id: 'user-1',
            email: 'user1@example.com',
            name: 'User One',
            role: 'CUSTOMER',
            phoneNumber: '+1234567890',
            phoneVerified: true,
            emailVerified: true,
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-15'),
            _count: { orders: 5 },
          },
          {
            id: 'user-2',
            email: 'user2@example.com',
            name: 'User Two',
            role: 'CUSTOMER',
            phoneNumber: null,
            phoneVerified: false,
            emailVerified: true,
            createdAt: new Date('2024-02-01'),
            updatedAt: new Date('2024-02-15'),
            _count: { orders: 0 },
          },
        ];

        mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
        mockPrismaService.user.count
          .mockResolvedValueOnce(2) // total
          .mockResolvedValueOnce(10) // total customers
          .mockResolvedValueOnce(5); // active customers

        mockPrismaService.order.groupBy.mockResolvedValue([
          { userId: 'user-1', _sum: { total: 500 }, _count: 5 },
        ]);

        mockPrismaService.order.aggregate.mockResolvedValue({
          _sum: { total: 10000 },
        });

        const result = await controller.getAll(1, 10);

        expect(result).toHaveProperty('customers');
        expect(result).toHaveProperty('total', 2);
        expect(result).toHaveProperty('page', 1);
        expect(result).toHaveProperty('stats');
        expect(result.customers).toHaveLength(2);
        expect(mockPrismaService.user.findMany).toHaveBeenCalled();
      });

      it('should filter users by role', async () => {
        mockPrismaService.user.findMany.mockResolvedValue([]);
        mockPrismaService.user.count.mockResolvedValue(0);
        mockPrismaService.order.groupBy.mockResolvedValue([]);
        mockPrismaService.order.aggregate.mockResolvedValue({ _sum: { total: 0 } });

        await controller.getAll(1, 10, undefined, 'ADMIN');

        expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({ role: 'ADMIN' }),
          }),
        );
      });

      it('should filter users by search term', async () => {
        mockPrismaService.user.findMany.mockResolvedValue([]);
        mockPrismaService.user.count.mockResolvedValue(0);
        mockPrismaService.order.groupBy.mockResolvedValue([]);
        mockPrismaService.order.aggregate.mockResolvedValue({ _sum: { total: 0 } });

        await controller.getAll(1, 10, 'test@example.com');

        expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              OR: expect.arrayContaining([
                { name: { contains: 'test@example.com', mode: 'insensitive' } },
                { email: { contains: 'test@example.com', mode: 'insensitive' } },
              ]),
            }),
          }),
        );
      });

      it('should calculate user tier based on total spent', async () => {
        const mockUsers = [
          {
            id: 'user-bronze',
            email: 'bronze@example.com',
            name: 'Bronze User',
            role: 'CUSTOMER',
            phoneNumber: null,
            phoneVerified: false,
            emailVerified: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            _count: { orders: 1 },
          },
          {
            id: 'user-platinum',
            email: 'platinum@example.com',
            name: 'Platinum User',
            role: 'CUSTOMER',
            phoneNumber: null,
            phoneVerified: false,
            emailVerified: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            _count: { orders: 50 },
          },
        ];

        mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
        mockPrismaService.user.count.mockResolvedValue(2);
        mockPrismaService.order.groupBy.mockResolvedValue([
          { userId: 'user-bronze', _sum: { total: 100 }, _count: 1 },
          { userId: 'user-platinum', _sum: { total: 6000 }, _count: 50 },
        ]);
        mockPrismaService.order.aggregate.mockResolvedValue({ _sum: { total: 6100 } });

        const result = await controller.getAll(1, 10);

        const bronzeUser = result.customers.find((c: any) => c.id === 'user-bronze');
        const platinumUser = result.customers.find((c: any) => c.id === 'user-platinum');

        expect(bronzeUser.tier).toBe('BRONZE');
        expect(platinumUser.tier).toBe('PLATINUM');
      });
    });

    describe('getById', () => {
      it('should return user details with orders', async () => {
        const mockUser = {
          id: 'user-123',
          email: 'user@example.com',
          name: 'Test User',
          role: 'CUSTOMER',
          phoneNumber: '+1234567890',
          phoneVerified: true,
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { orders: 5, reviews: 3 },
        };

        mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
        mockPrismaService.order.aggregate.mockResolvedValue({
          _sum: { total: 1500 },
          _count: 5,
        });
        mockPrismaService.order.findMany.mockResolvedValue([
          { id: 'order-1', total: 300, status: 'COMPLETED', createdAt: new Date() },
        ]);
        mockPrismaService.order.findFirst.mockResolvedValue({
          createdAt: new Date(),
        });

        const result = await controller.getById('user-123');

        expect(result).toHaveProperty('id', 'user-123');
        expect(result).toHaveProperty('totalOrders', 5);
        expect(result).toHaveProperty('totalSpent', 1500);
        expect(result).toHaveProperty('recentOrders');
      });

      it('should throw NotFoundException if user not found', async () => {
        mockPrismaService.user.findUnique.mockResolvedValue(null);

        await expect(controller.getById('nonexistent-id')).rejects.toThrow(
          NotFoundException,
        );
      });
    });

    describe('getUserOrders', () => {
      it('should return paginated user orders', async () => {
        const mockOrders = [
          {
            id: 'order-1',
            total: 100,
            status: 'COMPLETED',
            createdAt: new Date(),
            items: [{ product: { id: 'prod-1', name: 'Product 1', images: [] } }],
          },
        ];

        mockPrismaService.order.findMany.mockResolvedValue(mockOrders);
        mockPrismaService.order.count.mockResolvedValue(1);

        const result = await controller.getUserOrders('user-123', 1, 10);

        expect(result).toHaveProperty('orders');
        expect(result).toHaveProperty('total', 1);
        expect(result.orders[0]).toHaveProperty('orderNumber');
      });
    });

    describe('updateUser', () => {
      it('should update user details', async () => {
        const mockUser = {
          id: 'user-123',
          email: 'user@example.com',
          name: 'Test User',
          role: 'CUSTOMER',
        };

        mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
        mockPrismaService.user.update.mockResolvedValue({
          ...mockUser,
          name: 'Updated Name',
        });

        const result = await controller.updateUser('user-123', {
          name: 'Updated Name',
        });

        expect(result.name).toBe('Updated Name');
        expect(mockPrismaService.user.update).toHaveBeenCalled();
      });

      it('should throw NotFoundException if user does not exist', async () => {
        mockPrismaService.user.findUnique.mockResolvedValue(null);

        await expect(
          controller.updateUser('nonexistent-id', { name: 'Test' }),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('updateUserStatus', () => {
      it('should update user status', async () => {
        const mockUser = { id: 'user-123', email: 'user@example.com' };
        mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

        const result = await controller.updateUserStatus('user-123', {
          status: 'BLOCKED',
        });

        expect(result).toHaveProperty('status', 'BLOCKED');
        expect(result).toHaveProperty('message');
      });

      it('should throw NotFoundException if user not found', async () => {
        mockPrismaService.user.findUnique.mockResolvedValue(null);

        await expect(
          controller.updateUserStatus('nonexistent', { status: 'ACTIVE' }),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('updateUserRole', () => {
      it('should delegate role update to UsersService', async () => {
        mockUsersService.updateRole.mockResolvedValue({
          id: 'user-123',
          role: 'VENDOR',
        });

        const result = await controller.updateUserRole('user-123', 'VENDOR');

        expect(result.role).toBe('VENDOR');
        expect(mockUsersService.updateRole).toHaveBeenCalledWith(
          'user-123',
          'VENDOR',
        );
      });
    });

    describe('deleteUser', () => {
      it('should soft delete user via UsersService', async () => {
        mockUsersService.remove.mockResolvedValue({
          message: 'User account deleted successfully',
        });

        const result = await controller.deleteUser('user-123');

        expect(result).toHaveProperty('message');
        expect(mockUsersService.remove).toHaveBeenCalledWith('user-123');
      });
    });

    describe('hardDeleteUser', () => {
      it('should permanently delete user', async () => {
        mockUsersService.hardDelete.mockResolvedValue({
          message: 'User permanently deleted',
        });

        const result = await controller.hardDeleteUser('user-123');

        expect(result).toHaveProperty('message');
        expect(mockUsersService.hardDelete).toHaveBeenCalledWith('user-123');
      });
    });

    describe('createUser', () => {
      it('should create new user via UsersService', async () => {
        const createDto = {
          email: 'new@example.com',
          password: 'password123',
          name: 'New User',
          role: 'CUSTOMER' as const,
        };

        mockUsersService.create.mockResolvedValue({
          id: 'new-user-id',
          ...createDto,
        });

        const result = await controller.createUser(createDto);

        expect(result).toHaveProperty('id', 'new-user-id');
        expect(mockUsersService.create).toHaveBeenCalledWith(createDto);
      });
    });
  });

  describe('AdminVendorsController', () => {
    let controller: AdminVendorsController;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        controllers: [AdminVendorsController],
        providers: [{ provide: PrismaService, useValue: mockPrismaService }],
      }).compile();

      controller = module.get<AdminVendorsController>(AdminVendorsController);
    });

    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    describe('getAll', () => {
      it('should return paginated list of vendors with stats', async () => {
        const mockVendors = [
          {
            id: 'vendor-1',
            businessName: 'Test Store',
            businessEmail: 'store@example.com',
            businessPhone: '+1234567890',
            status: VendorStatus.ACTIVE,
            averageRating: 4.5,
            totalOrders: 100,
            totalRevenue: 10000,
            commissionRate: 10,
            isVerified: true,
            canSell: true,
            createdAt: new Date(),
            verifiedAt: new Date(),
            user: { id: 'user-1', name: 'Vendor Owner', email: 'owner@example.com' },
            application: { status: VendorApplicationStatus.APPROVED },
            _count: { payouts: 5 },
          },
        ];

        mockPrismaService.vendorProfile.findMany.mockResolvedValue(mockVendors);
        mockPrismaService.vendorProfile.count
          .mockResolvedValueOnce(1) // where query
          .mockResolvedValueOnce(10) // total
          .mockResolvedValueOnce(2) // pending
          .mockResolvedValueOnce(8); // active

        mockPrismaService.product.groupBy.mockResolvedValue([
          { vendorId: 'vendor-1', _count: 25 },
        ]);

        mockPrismaService.vendorProfile.aggregate
          .mockResolvedValueOnce({ _sum: { totalRevenue: 50000 } })
          .mockResolvedValueOnce({ _sum: { totalSales: 5000 } });

        const result = await controller.getAll(1, 10);

        expect(result).toHaveProperty('vendors');
        expect(result).toHaveProperty('stats');
        expect(result.vendors).toHaveLength(1);
        expect(result.vendors[0]).toHaveProperty('storeName', 'Test Store');
      });

      it('should filter vendors by status', async () => {
        mockPrismaService.vendorProfile.findMany.mockResolvedValue([]);
        mockPrismaService.vendorProfile.count.mockResolvedValue(0);
        mockPrismaService.product.groupBy.mockResolvedValue([]);
        mockPrismaService.vendorProfile.aggregate.mockResolvedValue({
          _sum: { totalRevenue: 0 },
        });

        await controller.getAll(1, 10, undefined, 'PENDING_VERIFICATION');

        expect(mockPrismaService.vendorProfile.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              status: 'PENDING_VERIFICATION',
            }),
          }),
        );
      });
    });

    describe('getPendingApplications', () => {
      it('should return pending vendor applications', async () => {
        const mockApplications = [
          {
            id: 'app-1',
            vendorProfileId: 'vendor-1',
            status: VendorApplicationStatus.PENDING,
            submittedAt: new Date(),
            documentsSubmitted: true,
            vendorProfile: {
              businessName: 'New Store',
              businessEmail: 'newstore@example.com',
              businessPhone: '+1234567890',
              businessType: 'RETAIL',
              user: { id: 'user-1', name: 'Owner', email: 'owner@example.com' },
            },
          },
        ];

        mockPrismaService.vendorApplication.findMany.mockResolvedValue(
          mockApplications,
        );

        const result = await controller.getPendingApplications();

        expect(result).toHaveLength(1);
        expect(result[0]).toHaveProperty('status', VendorApplicationStatus.PENDING);
      });
    });

    describe('getById', () => {
      it('should return vendor details', async () => {
        const mockVendor = {
          id: 'vendor-1',
          businessName: 'Test Store',
          businessType: 'RETAIL',
          description: 'A test store',
          businessEmail: 'store@example.com',
          businessPhone: '+1234567890',
          website: 'https://teststore.com',
          businessAddress: '123 Test St',
          logoUrl: 'logo.png',
          bannerUrl: 'banner.png',
          status: VendorStatus.ACTIVE,
          isVerified: true,
          canSell: true,
          commissionRate: 10,
          averageRating: 4.5,
          totalOrders: 100,
          totalRevenue: 10000,
          totalSales: 5000,
          createdAt: new Date(),
          verifiedAt: new Date(),
          user: { id: 'user-1', name: 'Owner', email: 'owner@example.com', createdAt: new Date() },
          application: {},
          payouts: [],
        };

        mockPrismaService.vendorProfile.findUnique.mockResolvedValue(mockVendor);
        mockPrismaService.product.count.mockResolvedValue(25);
        mockPrismaService.review.aggregate.mockResolvedValue({
          _avg: { rating: 4.5 },
          _count: 50,
        });

        const result = await controller.getById('vendor-1');

        expect(result).toHaveProperty('id', 'vendor-1');
        expect(result).toHaveProperty('storeName', 'Test Store');
        expect(result).toHaveProperty('totalProducts', 25);
      });

      it('should throw NotFoundException if vendor not found', async () => {
        mockPrismaService.vendorProfile.findUnique.mockResolvedValue(null);

        await expect(controller.getById('nonexistent')).rejects.toThrow(
          NotFoundException,
        );
      });
    });

    describe('approveVendor', () => {
      it('should approve vendor and update status', async () => {
        const mockVendor = {
          id: 'vendor-1',
          status: VendorStatus.PENDING_VERIFICATION,
          application: { id: 'app-1' },
        };

        const mockUpdatedVendor = {
          id: 'vendor-1',
          status: VendorStatus.ACTIVE,
          isVerified: true,
          canSell: true,
        };

        mockPrismaService.vendorProfile.findUnique.mockResolvedValue(mockVendor);

        // Mock the $transaction to execute the callback and return the result
        mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
          const mockTx = {
            vendorApplication: {
              update: jest.fn().mockResolvedValue({}),
            },
            vendorProfile: {
              update: jest.fn().mockResolvedValue(mockUpdatedVendor),
            },
          };
          return callback(mockTx);
        });

        const result = await controller.approveVendor('vendor-1', {
          commissionRate: 15,
          notes: 'Approved',
        });

        expect(result).toHaveProperty('status', VendorStatus.ACTIVE);
        expect(result).toHaveProperty('isVerified', true);
        expect(result).toHaveProperty('canSell', true);
      });

      it('should throw NotFoundException if vendor not found', async () => {
        mockPrismaService.vendorProfile.findUnique.mockResolvedValue(null);

        await expect(
          controller.approveVendor('nonexistent', {}),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('rejectVendor', () => {
      it('should reject vendor application', async () => {
        const mockVendor = {
          id: 'vendor-1',
          status: VendorStatus.PENDING_VERIFICATION,
          application: { id: 'app-1' },
        };

        const mockUpdatedVendor = {
          id: 'vendor-1',
          status: VendorStatus.INACTIVE,
          canSell: false,
        };

        mockPrismaService.vendorProfile.findUnique.mockResolvedValue(mockVendor);

        // Mock the $transaction to execute the callback and return the result
        mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
          const mockTx = {
            vendorApplication: {
              update: jest.fn().mockResolvedValue({}),
            },
            vendorProfile: {
              update: jest.fn().mockResolvedValue(mockUpdatedVendor),
            },
          };
          return callback(mockTx);
        });

        const result = await controller.rejectVendor('vendor-1', {
          reason: 'Incomplete documents',
        });

        expect(result).toHaveProperty('status', VendorStatus.INACTIVE);
      });
    });

    describe('suspendVendor', () => {
      it('should suspend active vendor', async () => {
        const mockVendor = {
          id: 'vendor-1',
          status: VendorStatus.ACTIVE,
        };

        mockPrismaService.vendorProfile.findUnique.mockResolvedValue(mockVendor);
        mockPrismaService.vendorProfile.update.mockResolvedValue({
          id: 'vendor-1',
          status: VendorStatus.SUSPENDED,
          canSell: false,
        });

        const result = await controller.suspendVendor('vendor-1', {
          reason: 'Policy violation',
        });

        expect(result).toHaveProperty('status', VendorStatus.SUSPENDED);
      });
    });

    describe('reactivateVendor', () => {
      it('should reactivate suspended vendor', async () => {
        const mockVendor = {
          id: 'vendor-1',
          status: VendorStatus.SUSPENDED,
        };

        mockPrismaService.vendorProfile.findUnique.mockResolvedValue(mockVendor);
        mockPrismaService.vendorProfile.update.mockResolvedValue({
          id: 'vendor-1',
          status: VendorStatus.ACTIVE,
          canSell: true,
        });

        const result = await controller.reactivateVendor('vendor-1');

        // The controller returns { id, status, message } - not canSell directly
        expect(result).toHaveProperty('status', VendorStatus.ACTIVE);
        expect(result).toHaveProperty('message', 'Vendor reactivated successfully');
      });
    });

    describe('updateCommission', () => {
      it('should update vendor commission rate', async () => {
        const mockVendor = { id: 'vendor-1', commissionRate: 10 };

        mockPrismaService.vendorProfile.findUnique.mockResolvedValue(mockVendor);
        mockPrismaService.vendorProfile.update.mockResolvedValue({
          id: 'vendor-1',
          commissionRate: 15,
        });

        const result = await controller.updateCommission('vendor-1', {
          commissionRate: 15,
        });

        expect(result).toHaveProperty('commissionRate', 15);
      });

      it('should throw BadRequestException for invalid commission rate', async () => {
        const mockVendor = { id: 'vendor-1', commissionRate: 10 };
        mockPrismaService.vendorProfile.findUnique.mockResolvedValue(mockVendor);

        await expect(
          controller.updateCommission('vendor-1', { commissionRate: 150 }),
        ).rejects.toThrow(BadRequestException);
      });

      it('should throw BadRequestException for negative commission rate', async () => {
        const mockVendor = { id: 'vendor-1', commissionRate: 10 };
        mockPrismaService.vendorProfile.findUnique.mockResolvedValue(mockVendor);

        await expect(
          controller.updateCommission('vendor-1', { commissionRate: -5 }),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('deleteVendor', () => {
      it('should soft delete vendor (set to inactive)', async () => {
        const mockVendor = { id: 'vendor-1', status: VendorStatus.ACTIVE };

        mockPrismaService.vendorProfile.findUnique.mockResolvedValue(mockVendor);
        mockPrismaService.vendorProfile.update.mockResolvedValue({});

        const result = await controller.deleteVendor('vendor-1');

        expect(result).toHaveProperty('message', 'Vendor deleted successfully');
        expect(mockPrismaService.vendorProfile.update).toHaveBeenCalledWith({
          where: { id: 'vendor-1' },
          data: {
            status: VendorStatus.INACTIVE,
            canSell: false,
          },
        });
      });
    });
  });

  describe('AdminDashboardController', () => {
    let controller: AdminDashboardController;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        controllers: [AdminDashboardController],
        providers: [{ provide: PrismaService, useValue: mockPrismaService }],
      }).compile();

      controller = module.get<AdminDashboardController>(AdminDashboardController);
    });

    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    describe('getStats', () => {
      it('should return dashboard statistics', async () => {
        // Current month revenue
        mockPrismaService.order.aggregate
          .mockResolvedValueOnce({ _sum: { total: 50000 } }) // current month
          .mockResolvedValueOnce({ _sum: { total: 40000 } }); // last month

        // Current/last month orders
        mockPrismaService.order.count
          .mockResolvedValueOnce(100) // current month
          .mockResolvedValueOnce(80); // last month

        // Current/last month customers
        mockPrismaService.user.count
          .mockResolvedValueOnce(50) // current month new customers
          .mockResolvedValueOnce(40) // last month new customers
          .mockResolvedValueOnce(500); // total customers

        // Product stats
        mockPrismaService.product.count
          .mockResolvedValueOnce(200) // total products
          .mockResolvedValueOnce(180); // active products

        const result = await controller.getStats();

        expect(result).toHaveProperty('revenue');
        expect(result).toHaveProperty('orders');
        expect(result).toHaveProperty('customers');
        expect(result).toHaveProperty('products');
        expect(result.revenue.value).toBe(50000);
        expect(result.orders.value).toBe(100);
      });

      it('should calculate percentage changes correctly', async () => {
        mockPrismaService.order.aggregate
          .mockResolvedValueOnce({ _sum: { total: 100 } })
          .mockResolvedValueOnce({ _sum: { total: 50 } });

        mockPrismaService.order.count
          .mockResolvedValueOnce(10)
          .mockResolvedValueOnce(5);

        mockPrismaService.user.count
          .mockResolvedValueOnce(20)
          .mockResolvedValueOnce(10)
          .mockResolvedValueOnce(100);

        mockPrismaService.product.count
          .mockResolvedValueOnce(50)
          .mockResolvedValueOnce(40);

        const result = await controller.getStats();

        // Revenue doubled: (100-50)/50 * 100 = 100%
        expect(result.revenue.change).toBe(100);
        // Orders doubled: (10-5)/5 * 100 = 100%
        expect(result.orders.change).toBe(100);
        // Customers doubled: (20-10)/10 * 100 = 100%
        expect(result.customers.change).toBe(100);
      });

      it('should handle zero previous month values', async () => {
        mockPrismaService.order.aggregate
          .mockResolvedValueOnce({ _sum: { total: 1000 } })
          .mockResolvedValueOnce({ _sum: { total: null } });

        mockPrismaService.order.count
          .mockResolvedValueOnce(10)
          .mockResolvedValueOnce(0);

        mockPrismaService.user.count
          .mockResolvedValueOnce(5)
          .mockResolvedValueOnce(0)
          .mockResolvedValueOnce(50);

        mockPrismaService.product.count
          .mockResolvedValueOnce(100)
          .mockResolvedValueOnce(80);

        const result = await controller.getStats();

        expect(result.revenue.change).toBe(0);
        expect(result.orders.change).toBe(0);
        expect(result.customers.change).toBe(0);
      });
    });

    describe('getRecentOrders', () => {
      it('should return recent orders with relative time', async () => {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const mockOrders = [
          {
            id: 'order-12345678',
            total: 150,
            status: 'PENDING',
            createdAt: oneHourAgo,
            user: { id: 'user-1', name: 'John Doe', email: 'john@example.com' },
            items: [{ quantity: 2 }],
          },
        ];

        mockPrismaService.order.findMany.mockResolvedValue(mockOrders);

        const result = await controller.getRecentOrders(5);

        expect(result).toHaveLength(1);
        expect(result[0]).toHaveProperty('orderNumber', '12345678');
        expect(result[0]).toHaveProperty('customer', 'John Doe');
        expect(result[0].time).toMatch(/h ago/);
      });

      it('should show "Guest" for orders without user', async () => {
        const mockOrders = [
          {
            id: 'order-1',
            total: 100,
            status: 'PENDING',
            createdAt: new Date(),
            user: null,
            items: [],
          },
        ];

        mockPrismaService.order.findMany.mockResolvedValue(mockOrders);

        const result = await controller.getRecentOrders(5);

        expect(result[0].customer).toBe('Guest');
      });
    });

    describe('getAlerts', () => {
      it('should return alerts for low stock products', async () => {
        mockPrismaService.product.count.mockResolvedValue(5);
        mockPrismaService.order.count.mockResolvedValue(0);
        mockPrismaService.vendorApplication.count.mockResolvedValue(0);
        mockPrismaService.returnRequest.count.mockResolvedValue(0);

        const result = await controller.getAlerts();

        const lowStockAlert = result.find((a: any) =>
          a.message.includes('low stock'),
        );
        expect(lowStockAlert).toBeDefined();
        expect(lowStockAlert.type).toBe('warning');
      });

      it('should return alerts for pending orders', async () => {
        mockPrismaService.product.count.mockResolvedValue(0);
        mockPrismaService.order.count.mockResolvedValue(10);
        mockPrismaService.vendorApplication.count.mockResolvedValue(0);
        mockPrismaService.returnRequest.count.mockResolvedValue(0);

        const result = await controller.getAlerts();

        const pendingOrdersAlert = result.find((a: any) =>
          a.message.includes('pending processing'),
        );
        expect(pendingOrdersAlert).toBeDefined();
        expect(pendingOrdersAlert.type).toBe('info');
      });

      it('should return success message when no alerts', async () => {
        mockPrismaService.product.count.mockResolvedValue(0);
        mockPrismaService.order.count.mockResolvedValue(0);
        mockPrismaService.vendorApplication.count.mockResolvedValue(0);
        mockPrismaService.returnRequest.count.mockResolvedValue(0);

        const result = await controller.getAlerts();

        expect(result).toHaveLength(1);
        expect(result[0].type).toBe('success');
        expect(result[0].message).toBe('All systems operational');
      });
    });

    describe('getTopProducts', () => {
      it('should return top selling products', async () => {
        const mockSales = [
          { productId: 'prod-1', _sum: { quantity: 100, price: 50 } },
          { productId: 'prod-2', _sum: { quantity: 80, price: 30 } },
        ];

        const mockProducts = [
          { id: 'prod-1', name: 'Best Seller', stock: 50, images: ['image1.jpg'] },
          { id: 'prod-2', name: 'Second Best', stock: 30, images: ['image2.jpg'] },
        ];

        mockPrismaService.orderItem.groupBy.mockResolvedValue(mockSales);
        mockPrismaService.product.findMany.mockResolvedValue(mockProducts);

        const result = await controller.getTopProducts(4);

        expect(result).toHaveLength(2);
        expect(result[0]).toHaveProperty('name', 'Best Seller');
        expect(result[0]).toHaveProperty('sales', 100);
      });
    });

    describe('getDashboardData', () => {
      it('should return all dashboard data at once', async () => {
        // Setup mocks for all data
        mockPrismaService.order.aggregate.mockResolvedValue({ _sum: { total: 10000 } });
        mockPrismaService.order.count.mockResolvedValue(50);
        mockPrismaService.user.count.mockResolvedValue(100);
        mockPrismaService.product.count.mockResolvedValue(200);
        mockPrismaService.order.findMany.mockResolvedValue([]);
        mockPrismaService.vendorApplication.count.mockResolvedValue(0);
        mockPrismaService.returnRequest.count.mockResolvedValue(0);
        mockPrismaService.orderItem.groupBy.mockResolvedValue([]);
        mockPrismaService.product.findMany.mockResolvedValue([]);

        const result = await controller.getDashboardData();

        expect(result).toHaveProperty('stats');
        expect(result).toHaveProperty('recentOrders');
        expect(result).toHaveProperty('alerts');
        expect(result).toHaveProperty('topProducts');
      });
    });
  });

  describe('AdminOrdersController', () => {
    let controller: AdminOrdersController;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        controllers: [AdminOrdersController],
        providers: [{ provide: OrdersService, useValue: mockOrdersService }],
      }).compile();

      controller = module.get<AdminOrdersController>(AdminOrdersController);
    });

    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    describe('getAllOrders', () => {
      it('should return all orders with pagination', async () => {
        const mockOrders = {
          data: [
            { id: 'order-1', total: 100, status: 'PENDING' },
            { id: 'order-2', total: 200, status: 'COMPLETED' },
          ],
          total: 2,
          page: 1,
          limit: 20,
        };

        mockOrdersService.findAll.mockResolvedValue(mockOrders);

        const result = await controller.getAllOrders(undefined, 1, 20);

        expect(result).toEqual(mockOrders);
        expect(mockOrdersService.findAll).toHaveBeenCalledWith(undefined, 1, 20);
      });

      it('should filter orders by status', async () => {
        mockOrdersService.findAll.mockResolvedValue({ data: [], total: 0 });

        await controller.getAllOrders(OrderStatus.PENDING, 1, 20);

        expect(mockOrdersService.findAll).toHaveBeenCalledWith(
          OrderStatus.PENDING,
          1,
          20,
        );
      });
    });

    describe('updateOrderStatus', () => {
      it('should update order status', async () => {
        const mockUpdatedOrder = {
          id: 'order-1',
          status: 'SHIPPED',
        };

        mockOrdersService.updateOrderStatus.mockResolvedValue(mockUpdatedOrder);

        const result = await controller.updateOrderStatus('order-1', {
          status: OrderStatus.SHIPPED,
        });

        expect(result.status).toBe('SHIPPED');
        expect(mockOrdersService.updateOrderStatus).toHaveBeenCalledWith(
          'order-1',
          OrderStatus.SHIPPED,
          undefined,
        );
      });
    });

    describe('getOrderStats', () => {
      it('should return order statistics', async () => {
        const mockStats = {
          totalOrders: 1000,
          pendingOrders: 50,
          completedOrders: 900,
          cancelledOrders: 50,
          totalRevenue: 100000,
        };

        mockOrdersService.getOrderStats.mockResolvedValue(mockStats);

        const result = await controller.getOrderStats();

        expect(result).toEqual(mockStats);
        expect(mockOrdersService.getOrderStats).toHaveBeenCalled();
      });
    });
  });

  describe('AdminProductsController', () => {
    let controller: AdminProductsController;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        controllers: [AdminProductsController],
        providers: [
          { provide: ProductsService, useValue: mockProductsService },
          { provide: PrismaService, useValue: mockPrismaService },
        ],
      }).compile();

      controller = module.get<AdminProductsController>(AdminProductsController);
    });

    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    describe('getAllProducts', () => {
      it('should return all products', async () => {
        const mockProducts = {
          data: [
            { id: 'prod-1', name: 'Product 1', price: 100 },
            { id: 'prod-2', name: 'Product 2', price: 200 },
          ],
          total: 2,
        };

        mockProductsService.findAll.mockResolvedValue(mockProducts);

        const result = await controller.getAllProducts();

        expect(result).toEqual(mockProducts);
        expect(mockProductsService.findAll).toHaveBeenCalledWith({});
      });
    });

    describe('createProduct', () => {
      it('should create new product', async () => {
        const createDto = {
          name: 'New Product',
          description: 'A new product',
          price: 99.99,
          images: ['image.jpg'],
          categoryId: 'cat-1',
          vendorId: 'vendor-1',
          stock: 100,
        };

        const mockProduct = { id: 'new-prod', ...createDto };
        mockProductsService.create.mockResolvedValue(mockProduct);

        const result = await controller.createProduct(createDto);

        expect(result).toEqual(mockProduct);
        expect(mockProductsService.create).toHaveBeenCalledWith(createDto);
      });
    });

    describe('updateProduct', () => {
      it('should update existing product', async () => {
        const updateDto = { name: 'Updated Name', price: 149.99 };
        const mockProduct = { id: 'prod-1', ...updateDto };

        mockProductsService.update.mockResolvedValue(mockProduct);

        const result = await controller.updateProduct('prod-1', updateDto);

        expect(result).toEqual(mockProduct);
        expect(mockProductsService.update).toHaveBeenCalledWith('prod-1', updateDto);
      });
    });

    describe('deleteProduct', () => {
      it('should delete product', async () => {
        mockProductsService.delete.mockResolvedValue({ id: 'prod-1' });

        const result = await controller.deleteProduct('prod-1');

        expect(result).toHaveProperty('id', 'prod-1');
        expect(mockProductsService.delete).toHaveBeenCalledWith('prod-1');
      });
    });

    describe('getProductStats', () => {
      it('should return product statistics', async () => {
        const mockStats = {
          totalProducts: 150,
          totalCategories: 10,
          lowStockProducts: 8,
          outOfStockProducts: 3,
          averagePrice: 99.99,
        };

        mockProductsService.getProductStats.mockResolvedValue(mockStats);

        const result = await controller.getProductStats();

        expect(result).toEqual(mockStats);
      });
    });

    describe('getCategories', () => {
      it('should return all categories', async () => {
        const mockCategories = [
          { id: 'cat-1', name: 'Electronics', slug: 'electronics' },
          { id: 'cat-2', name: 'Clothing', slug: 'clothing' },
        ];

        mockPrismaService.category.findMany.mockResolvedValue(mockCategories);

        const result = await controller.getCategories();

        expect(result).toEqual(mockCategories);
        expect(mockPrismaService.category.findMany).toHaveBeenCalledWith({
          select: { id: true, name: true, slug: true },
          orderBy: { name: 'asc' },
        });
      });
    });

    describe('getVendors', () => {
      it('should return all vendors (users with VENDOR role)', async () => {
        const mockVendors = [
          { id: 'vendor-1', name: 'Vendor One', email: 'vendor1@example.com' },
          { id: 'vendor-2', name: 'Vendor Two', email: 'vendor2@example.com' },
        ];

        mockPrismaService.user.findMany.mockResolvedValue(mockVendors);

        const result = await controller.getVendors();

        expect(result).toEqual(mockVendors);
        expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
          where: { role: 'VENDOR' },
          select: { id: true, name: true, email: true },
          orderBy: { name: 'asc' },
        });
      });
    });
  });

  describe('Authorization Checks', () => {
    /**
     * Note: Authorization is handled by JwtAuthGuard and AdminGuard decorators
     * at the controller level. These tests verify the guards are configured correctly.
     * Integration tests would verify actual guard behavior.
     */

    it('AdminUsersController should have correct guards applied', () => {
      const guards = Reflect.getMetadata('__guards__', AdminUsersController);
      expect(guards).toBeDefined();
      expect(guards.length).toBe(2); // JwtAuthGuard and AdminGuard
    });

    it('AdminVendorsController should have correct guards applied', () => {
      const guards = Reflect.getMetadata('__guards__', AdminVendorsController);
      expect(guards).toBeDefined();
      expect(guards.length).toBe(2);
    });

    it('AdminDashboardController should have correct guards applied', () => {
      const guards = Reflect.getMetadata('__guards__', AdminDashboardController);
      expect(guards).toBeDefined();
      expect(guards.length).toBe(2);
    });

    it('AdminOrdersController should have correct guards applied', () => {
      const guards = Reflect.getMetadata('__guards__', AdminOrdersController);
      expect(guards).toBeDefined();
      expect(guards.length).toBe(2);
    });

    it('AdminProductsController should have correct guards applied', () => {
      const guards = Reflect.getMetadata('__guards__', AdminProductsController);
      expect(guards).toBeDefined();
      expect(guards.length).toBe(2);
    });
  });
});
