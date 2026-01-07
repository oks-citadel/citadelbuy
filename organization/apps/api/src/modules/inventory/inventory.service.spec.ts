import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { StockStatus, TransferStatus, ReorderStatus, StockMovementType } from '@prisma/client';

describe('InventoryService', () => {
  let service: InventoryService;
  let prisma: PrismaService;

  const mockPrismaService = {
    warehouse: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    inventoryItem: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    stockMovement: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
    stockTransfer: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    reorderRequest: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    stockAlert: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    backorder: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    inventoryForecast: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(async (callback) => await callback(mockPrismaService)),
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createWarehouse', () => {
    const warehouseDto = {
      name: 'Main Warehouse',
      code: 'WH001',
      address: '123 Storage St',
      city: 'New York',
      state: 'NY',
      country: 'US',
      postalCode: '10001',
      phone: '1234567890',
      email: 'warehouse@example.com',
      managerId: 'manager-123',
      isPrimary: true,
    };

    it('should create a warehouse', async () => {
      mockPrismaService.warehouse.updateMany.mockResolvedValue({});
      mockPrismaService.warehouse.create.mockResolvedValue({
        id: 'warehouse-123',
        ...warehouseDto,
        isActive: true,
      });

      const result = await service.createWarehouse(warehouseDto);

      expect(result).toHaveProperty('id');
      expect(result.name).toBe('Main Warehouse');
      expect(mockPrismaService.warehouse.create).toHaveBeenCalled();
    });

    it('should unset other primary warehouses when creating primary', async () => {
      mockPrismaService.warehouse.updateMany.mockResolvedValue({});
      mockPrismaService.warehouse.create.mockResolvedValue({
        id: 'warehouse-123',
        ...warehouseDto,
      });

      await service.createWarehouse(warehouseDto);

      expect(mockPrismaService.warehouse.updateMany).toHaveBeenCalledWith({
        where: { isPrimary: true },
        data: { isPrimary: false },
      });
    });

    it('should not unset primary if not setting as primary', async () => {
      const nonPrimaryDto = { ...warehouseDto, isPrimary: false };
      mockPrismaService.warehouse.create.mockResolvedValue({
        id: 'warehouse-123',
        ...nonPrimaryDto,
      });

      await service.createWarehouse(nonPrimaryDto);

      expect(mockPrismaService.warehouse.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('getWarehouses', () => {
    const mockWarehouses = [
      {
        id: 'warehouse-1',
        name: 'Main Warehouse',
        isPrimary: true,
        isActive: true,
        _count: { inventory: 100, transfersFrom: 5, transfersTo: 3 },
      },
      {
        id: 'warehouse-2',
        name: 'Secondary Warehouse',
        isPrimary: false,
        isActive: true,
        _count: { inventory: 50, transfersFrom: 2, transfersTo: 7 },
      },
    ];

    it('should return all warehouses', async () => {
      mockPrismaService.warehouse.findMany.mockResolvedValue(mockWarehouses);

      const result = await service.getWarehouses();

      expect(result).toHaveLength(2);
      expect(result[0].isPrimary).toBe(true);
    });

    it('should filter by active status', async () => {
      mockPrismaService.warehouse.findMany.mockResolvedValue([mockWarehouses[0]]);

      await service.getWarehouses(true);

      expect(mockPrismaService.warehouse.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
        })
      );
    });
  });

  describe('getWarehouse', () => {
    const mockWarehouse = {
      id: 'warehouse-123',
      name: 'Main Warehouse',
      inventory: [],
      _count: { inventory: 100, transfersFrom: 5, transfersTo: 3 },
    };

    it('should return warehouse by ID', async () => {
      mockPrismaService.warehouse.findUnique.mockResolvedValue(mockWarehouse);

      const result = await service.getWarehouse('warehouse-123');

      expect(result).toEqual(mockWarehouse);
    });

    it('should throw NotFoundException if warehouse not found', async () => {
      mockPrismaService.warehouse.findUnique.mockResolvedValue(null);

      await expect(service.getWarehouse('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('adjustStock', () => {
    const mockInventoryItem = {
      id: 'item-123',
      productId: 'product-123',
      warehouseId: 'warehouse-123',
      quantity: 100,
      reservedQty: 10,
      availableQty: 90,
      reorderPoint: 20,
      minStockLevel: 10,
      lastRestockDate: new Date(),
    };

    const adjustDto = {
      productId: 'product-123',
      warehouseId: 'warehouse-123',
      quantity: 50,
      type: StockMovementType.PURCHASE,
      reason: 'Restocking',
    };

    it('should adjust stock quantity', async () => {
      mockPrismaService.inventoryItem.findUnique.mockResolvedValue(mockInventoryItem);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          inventoryItem: {
            update: jest.fn().mockResolvedValue({
              ...mockInventoryItem,
              quantity: 150,
              availableQty: 140,
            }),
          },
          stockMovement: {
            create: jest.fn().mockResolvedValue({
              id: 'movement-123',
            }),
          },
        });
      });

      const result = await service.adjustStock(adjustDto);

      expect(result.inventoryItem.quantity).toBe(150);
      expect(result).toHaveProperty('movement');
    });

    it('should create inventory item if it does not exist', async () => {
      mockPrismaService.inventoryItem.findUnique.mockResolvedValue(null);
      mockPrismaService.inventoryItem.create.mockResolvedValue({
        ...mockInventoryItem,
        quantity: 0,
      });
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          inventoryItem: {
            update: jest.fn().mockResolvedValue({
              ...mockInventoryItem,
              quantity: 50,
            }),
          },
          stockMovement: {
            create: jest.fn().mockResolvedValue({
              id: 'movement-123',
            }),
          },
        });
      });

      await service.adjustStock(adjustDto);

      expect(mockPrismaService.inventoryItem.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException if adjustment results in negative stock', async () => {
      mockPrismaService.inventoryItem.findUnique.mockResolvedValue(mockInventoryItem);

      await expect(
        service.adjustStock({
          ...adjustDto,
          quantity: -150, // Would result in negative stock
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should update last restock date when adding stock', async () => {
      mockPrismaService.inventoryItem.findUnique.mockResolvedValue(mockInventoryItem);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          inventoryItem: {
            update: jest.fn().mockResolvedValue(mockInventoryItem),
          },
          stockMovement: {
            create: jest.fn().mockResolvedValue({ id: 'movement-123' }),
          },
        };
        return callback(tx);
      });

      await service.adjustStock(adjustDto);

      const transaction = mockPrismaService.$transaction.mock.calls[0][0];
      const mockTx = {
        inventoryItem: {
          update: jest.fn().mockResolvedValue(mockInventoryItem),
        },
        stockMovement: {
          create: jest.fn().mockResolvedValue({ id: 'movement-123' }),
        },
      };
      await transaction(mockTx);

      expect(mockTx.inventoryItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            lastRestockDate: expect.any(Date),
          }),
        })
      );
    });
  });

  describe('reserveStock', () => {
    const mockInventoryItem = {
      id: 'item-123',
      productId: 'product-123',
      warehouseId: 'warehouse-123',
      quantity: 100,
      reservedQty: 10,
      availableQty: 90,
    };

    it('should reserve stock', async () => {
      mockPrismaService.inventoryItem.findUnique.mockResolvedValue(mockInventoryItem);
      mockPrismaService.inventoryItem.update.mockResolvedValue({
        ...mockInventoryItem,
        reservedQty: 20,
        availableQty: 80,
      });

      const result = await service.reserveStock('product-123', 'warehouse-123', 10, 'order-123');

      expect(result.reservedQty).toBe(20);
      expect(result.availableQty).toBe(80);
    });

    it('should throw NotFoundException if inventory item not found', async () => {
      mockPrismaService.inventoryItem.findUnique.mockResolvedValue(null);

      await expect(
        service.reserveStock('product-123', 'warehouse-123', 10, 'order-123')
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if insufficient available stock', async () => {
      mockPrismaService.inventoryItem.findUnique.mockResolvedValue({
        ...mockInventoryItem,
        availableQty: 5,
      });

      await expect(
        service.reserveStock('product-123', 'warehouse-123', 10, 'order-123')
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('releaseReservedStock', () => {
    const mockMovements = [
      {
        id: 'movement-1',
        orderId: 'order-123',
        inventoryItemId: 'item-1',
        quantity: -5,
        type: StockMovementType.SALE,
        inventoryItem: {
          id: 'item-1',
          reservedQty: 10,
          availableQty: 85,
        },
      },
      {
        id: 'movement-2',
        orderId: 'order-123',
        inventoryItemId: 'item-2',
        quantity: -3,
        type: StockMovementType.SALE,
        inventoryItem: {
          id: 'item-2',
          reservedQty: 8,
          availableQty: 42,
        },
      },
    ];

    it('should release reserved stock for order', async () => {
      mockPrismaService.stockMovement.findMany.mockResolvedValue(mockMovements);
      mockPrismaService.inventoryItem.update.mockResolvedValue({});

      const result = await service.releaseReservedStock('order-123');

      expect(result.success).toBe(true);
      expect(result.releasedItems).toBe(2);
      expect(mockPrismaService.inventoryItem.update).toHaveBeenCalledTimes(2);
    });
  });

  describe('createTransfer', () => {
    const mockSourceInventory = {
      id: 'item-123',
      productId: 'product-123',
      warehouseId: 'warehouse-from',
      quantity: 100,
      availableQty: 90,
    };

    const transferDto = {
      fromWarehouseId: 'warehouse-from',
      toWarehouseId: 'warehouse-to',
      productId: 'product-123',
      quantity: 20,
      carrier: 'FedEx',
      trackingNumber: 'TRACK123',
      estimatedArrival: '2024-12-31',
      notes: 'Transfer notes',
    };

    it('should create stock transfer', async () => {
      mockPrismaService.inventoryItem.findUnique.mockResolvedValue(mockSourceInventory);
      mockPrismaService.stockTransfer.count.mockResolvedValue(10);
      mockPrismaService.stockTransfer.create.mockResolvedValue({
        id: 'transfer-123',
        transferNumber: 'TRF-2024-000011',
        status: TransferStatus.PENDING,
        ...transferDto,
      });

      const result = await service.createTransfer(transferDto, 'user-123');

      expect(result).toHaveProperty('id');
      expect(result.status).toBe(TransferStatus.PENDING);
      expect(result.transferNumber).toMatch(/TRF-\d{4}-\d{6}/);
    });

    it('should throw BadRequestException if insufficient stock in source warehouse', async () => {
      mockPrismaService.inventoryItem.findUnique.mockResolvedValue({
        ...mockSourceInventory,
        availableQty: 10,
      });

      await expect(service.createTransfer(transferDto, 'user-123')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException if source inventory not found', async () => {
      mockPrismaService.inventoryItem.findUnique.mockResolvedValue(null);

      await expect(service.createTransfer(transferDto, 'user-123')).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('approveTransfer', () => {
    const mockTransfer = {
      id: 'transfer-123',
      productId: 'product-123',
      fromWarehouseId: 'warehouse-from',
      toWarehouseId: 'warehouse-to',
      quantity: 20,
      status: TransferStatus.PENDING,
    };

    it('should approve transfer and update status', async () => {
      mockPrismaService.stockTransfer.findUnique.mockResolvedValue(mockTransfer);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          inventoryItem: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'item-123',
              availableQty: 100,
              reservedQty: 10,
              quantity: 110,
            }),
            update: jest.fn().mockResolvedValue({}),
          },
          stockTransfer: {
            update: jest.fn().mockResolvedValue({
              ...mockTransfer,
              status: TransferStatus.IN_TRANSIT,
            }),
          },
          stockMovement: {
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(mockTx);
      });

      const result = await service.approveTransfer('transfer-123', 'user-123');

      expect(result.status).toBe(TransferStatus.IN_TRANSIT);
    });

    it('should throw NotFoundException if transfer not found', async () => {
      mockPrismaService.stockTransfer.findUnique.mockResolvedValue(null);

      await expect(service.approveTransfer('nonexistent', 'user-123')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw BadRequestException if transfer not in pending status', async () => {
      mockPrismaService.stockTransfer.findUnique.mockResolvedValue({
        ...mockTransfer,
        status: TransferStatus.COMPLETED,
      });

      await expect(service.approveTransfer('transfer-123', 'user-123')).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('receiveTransfer', () => {
    const mockTransfer = {
      id: 'transfer-123',
      productId: 'product-123',
      fromWarehouseId: 'warehouse-from',
      toWarehouseId: 'warehouse-to',
      quantity: 20,
      status: TransferStatus.IN_TRANSIT,
    };

    it('should receive transfer and complete it', async () => {
      mockPrismaService.stockTransfer.findUnique.mockResolvedValue(mockTransfer);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          inventoryItem: {
            findUnique: jest.fn()
              .mockResolvedValueOnce({ id: 'source-item', quantity: 100, reservedQty: 20 })
              .mockResolvedValueOnce({ id: 'dest-item', quantity: 50, availableQty: 50 }),
            create: jest.fn().mockResolvedValue({ id: 'new-item', quantity: 20, availableQty: 20 }),
            update: jest.fn().mockResolvedValue({ id: 'dest-item', quantity: 70, availableQty: 70 }),
          },
          stockTransfer: {
            update: jest.fn().mockResolvedValue({
              ...mockTransfer,
              status: TransferStatus.COMPLETED,
            }),
          },
          stockMovement: {
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(mockTx);
      });

      const result = await service.receiveTransfer('transfer-123', 'user-123');

      expect(result.status).toBe(TransferStatus.COMPLETED);
    });

    it('should throw NotFoundException if transfer not found', async () => {
      mockPrismaService.stockTransfer.findUnique.mockResolvedValue(null);

      await expect(service.receiveTransfer('nonexistent', 'user-123')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw BadRequestException if transfer not in transit', async () => {
      mockPrismaService.stockTransfer.findUnique.mockResolvedValue({
        ...mockTransfer,
        status: TransferStatus.PENDING,
      });

      await expect(service.receiveTransfer('transfer-123', 'user-123')).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('cancelTransfer', () => {
    const mockTransfer = {
      id: 'transfer-123',
      productId: 'product-123',
      fromWarehouseId: 'warehouse-from',
      quantity: 20,
      status: TransferStatus.IN_TRANSIT,
    };

    it('should cancel transfer', async () => {
      mockPrismaService.stockTransfer.findUnique.mockResolvedValue(mockTransfer);
      mockPrismaService.inventoryItem.findUnique.mockResolvedValue({
        id: 'item-123',
        reservedQty: 30,
        availableQty: 70,
      });
      mockPrismaService.inventoryItem.update.mockResolvedValue({});
      mockPrismaService.stockTransfer.update.mockResolvedValue({
        ...mockTransfer,
        status: TransferStatus.CANCELLED,
      });

      const result = await service.cancelTransfer('transfer-123', 'Cancelled by user');

      expect(result.status).toBe(TransferStatus.CANCELLED);
    });

    it('should throw BadRequestException if transfer already completed', async () => {
      mockPrismaService.stockTransfer.findUnique.mockResolvedValue({
        ...mockTransfer,
        status: TransferStatus.COMPLETED,
      });

      await expect(service.cancelTransfer('transfer-123')).rejects.toThrow(BadRequestException);
    });
  });

  describe('checkRealTimeAvailability', () => {
    const mockInventoryItems = [
      {
        id: 'item-1',
        productId: 'product-123',
        warehouseId: 'warehouse-1',
        quantity: 100,
        availableQty: 90,
        reservedQty: 10,
        warehouse: {
          id: 'warehouse-1',
          name: 'Main Warehouse',
          isActive: true,
        },
        product: {
          categoryId: 'category-1',
        },
      },
      {
        id: 'item-2',
        productId: 'product-123',
        warehouseId: 'warehouse-2',
        quantity: 50,
        availableQty: 45,
        reservedQty: 5,
        warehouse: {
          id: 'warehouse-2',
          name: 'Secondary Warehouse',
          isActive: true,
        },
        product: {
          categoryId: 'category-1',
        },
      },
    ];

    it('should check availability across all warehouses', async () => {
      mockPrismaService.inventoryItem.findMany.mockResolvedValue(mockInventoryItems);
      mockPrismaService.reorderRequest.findFirst.mockResolvedValue(null);

      const result = await service.checkRealTimeAvailability('product-123', 50);

      expect(result.isAvailable).toBe(true);
      expect(result.availableQuantity).toBe(135); // 90 + 45
      expect(result.totalQuantity).toBe(150); // 100 + 50
      expect(result.warehouses).toHaveLength(2);
    });

    it('should indicate when product is not available', async () => {
      mockPrismaService.inventoryItem.findMany.mockResolvedValue(mockInventoryItems);
      mockPrismaService.reorderRequest.findFirst.mockResolvedValue(null);

      const result = await service.checkRealTimeAvailability('product-123', 200);

      expect(result.isAvailable).toBe(false);
      expect(result.canPartiallyFulfill).toBe(true);
    });

    it('should filter by specific warehouse', async () => {
      mockPrismaService.inventoryItem.findMany.mockResolvedValue([mockInventoryItems[0]]);
      mockPrismaService.reorderRequest.findFirst.mockResolvedValue(null);

      const result = await service.checkRealTimeAvailability('product-123', 50, 'warehouse-1');

      expect(result.warehouses).toHaveLength(1);
      expect(result.warehouses[0].warehouseId).toBe('warehouse-1');
    });

    it('should provide estimated restock date when unavailable', async () => {
      mockPrismaService.inventoryItem.findMany.mockResolvedValue([]);
      mockPrismaService.reorderRequest.findFirst.mockResolvedValue({
        expectedDate: new Date('2024-12-31'),
      });

      const result = await service.checkRealTimeAvailability('product-123', 10);

      expect(result.isAvailable).toBe(false);
      expect(result.estimatedRestockDate).toBeDefined();
    });

    it('should suggest alternative products when unavailable', async () => {
      mockPrismaService.inventoryItem.findMany
        .mockResolvedValueOnce([]) // Original product query
        .mockResolvedValueOnce([ // Alternatives query
          {
            productId: 'alt-product-1',
            availableQty: 100,
            product: {
              id: 'alt-product-1',
              name: 'Alternative Product 1',
              categoryId: 'category-1',
            },
          },
        ]);
      mockPrismaService.product.findUnique.mockResolvedValue({
        id: 'product-123',
        categoryId: 'category-1',
      });
      mockPrismaService.reorderRequest.findFirst.mockResolvedValue(null);

      const result = await service.checkRealTimeAvailability('product-123', 10);

      expect(result.alternatives).toBeDefined();
      expect(result.alternatives.length).toBeGreaterThan(0);
    });
  });

  describe('checkBulkAvailability', () => {
    it('should check availability for multiple products', async () => {
      const items = [
        { productId: 'product-1', quantity: 10 },
        { productId: 'product-2', quantity: 5 },
      ];

      jest.spyOn(service, 'checkRealTimeAvailability')
        .mockResolvedValueOnce({
          isAvailable: true,
          availableQuantity: 100,
          reservedQuantity: 10,
          totalQuantity: 110,
          warehouses: [],
          canPartiallyFulfill: false,
        })
        .mockResolvedValueOnce({
          isAvailable: false,
          availableQuantity: 3,
          reservedQuantity: 2,
          totalQuantity: 5,
          warehouses: [],
          canPartiallyFulfill: true,
        });

      const result = await service.checkBulkAvailability(items);

      expect(result.allAvailable).toBe(false);
      expect(result.items).toHaveLength(2);
      expect(result.unavailableCount).toBe(1);
      expect(result.totalShortfall).toBe(2); // 5 requested - 3 available
    });
  });

  describe('reserveStockForCheckout', () => {
    it('should reserve stock from preferred warehouse', async () => {
      jest.spyOn(service, 'checkRealTimeAvailability').mockResolvedValue({
        isAvailable: true,
        availableQuantity: 100,
        reservedQuantity: 10,
        totalQuantity: 110,
        warehouses: [
          {
            warehouseId: 'warehouse-1',
            warehouseName: 'Main',
            available: 100,
            reserved: 10,
            canFulfill: true,
          },
        ],
        canPartiallyFulfill: false,
      });

      jest.spyOn(service, 'reserveStock').mockResolvedValue({} as any);

      const result = await service.reserveStockForCheckout(
        'product-123',
        10,
        'order-123',
        'warehouse-1'
      );

      expect(result.success).toBe(true);
      expect(result.warehouseId).toBe('warehouse-1');
      expect(result.reservedQuantity).toBe(10);
    });

    it('should return error if product unavailable', async () => {
      jest.spyOn(service, 'checkRealTimeAvailability').mockResolvedValue({
        isAvailable: false,
        availableQuantity: 5,
        reservedQuantity: 2,
        totalQuantity: 7,
        warehouses: [],
        canPartiallyFulfill: true,
      });

      const result = await service.reserveStockForCheckout('product-123', 10, 'order-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient stock');
    });
  });

  describe('createReorderRequest', () => {
    const mockInventoryItem = {
      id: 'item-123',
      productId: 'product-123',
      warehouseId: 'warehouse-123',
      product: { id: 'product-123', name: 'Product' },
      warehouse: { id: 'warehouse-123', name: 'Warehouse' },
    };

    it('should create reorder request', async () => {
      mockPrismaService.inventoryItem.findUnique.mockResolvedValue(mockInventoryItem);
      mockPrismaService.reorderRequest.count.mockResolvedValue(5);
      mockPrismaService.reorderRequest.create.mockResolvedValue({
        id: 'reorder-123',
        requestNumber: 'RO-2024-000006',
        status: ReorderStatus.PENDING,
      });

      const result = await service.createReorderRequest({
        inventoryItemId: 'item-123',
        quantityRequested: 100,
      });

      expect(result).toHaveProperty('id');
      expect(result.requestNumber).toMatch(/RO-\d{4}-\d{6}/);
      expect(result.status).toBe(ReorderStatus.PENDING);
    });

    it('should throw NotFoundException if inventory item not found', async () => {
      mockPrismaService.inventoryItem.findUnique.mockResolvedValue(null);

      await expect(
        service.createReorderRequest({
          inventoryItemId: 'nonexistent',
          quantityRequested: 100,
        })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('checkReorderPoints', () => {
    const mockLowStockItems = [
      {
        id: 'item-1',
        productId: 'product-1',
        status: StockStatus.LOW_STOCK,
        reorderQuantity: 100,
        product: { id: 'product-1', name: 'Product 1' },
        warehouse: { id: 'warehouse-1', name: 'Warehouse 1' },
      },
      {
        id: 'item-2',
        productId: 'product-2',
        status: StockStatus.OUT_OF_STOCK,
        reorderQuantity: 50,
        product: { id: 'product-2', name: 'Product 2' },
        warehouse: { id: 'warehouse-1', name: 'Warehouse 1' },
      },
    ];

    it('should create reorder requests for low stock items', async () => {
      mockPrismaService.inventoryItem.findMany.mockResolvedValue(mockLowStockItems);
      mockPrismaService.reorderRequest.findFirst.mockResolvedValue(null);
      mockPrismaService.reorderRequest.count.mockResolvedValue(0);
      mockPrismaService.reorderRequest.create.mockResolvedValue({
        id: 'reorder-123',
        requestNumber: 'RO-2024-000001',
      });

      const result = await service.checkReorderPoints();

      expect(result).toHaveLength(2);
    });

    it('should skip items with existing pending reorders', async () => {
      mockPrismaService.inventoryItem.findMany.mockResolvedValue(mockLowStockItems);
      mockPrismaService.reorderRequest.findFirst.mockResolvedValue({
        id: 'existing-reorder',
        status: ReorderStatus.PENDING,
      });

      const result = await service.checkReorderPoints();

      expect(result).toHaveLength(0);
    });
  });
});
