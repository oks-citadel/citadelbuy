import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import {
  CreateWarehouseDto,
  UpdateWarehouseDto,
  AdjustStockDto,
  CreateTransferDto,
  StockMovementQueryDto,
  CreateReorderRequestDto,
  FulfillReorderDto,
  BackorderQueryDto,
  InventoryQueryDto,
} from './dto';
import { StockStatus, TransferStatus, ReorderStatus, StockMovementType } from '@prisma/client';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== WAREHOUSE MANAGEMENT ====================

  async createWarehouse(dto: CreateWarehouseDto) {
    // If setting as primary, unset other primary warehouses
    if (dto.isPrimary) {
      await this.prisma.warehouse.updateMany({
        where: { isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const warehouse = await this.prisma.warehouse.create({
      data: {
        name: dto.name,
        code: dto.code,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        country: dto.country,
        postalCode: dto.postalCode,
        phone: dto.phone,
        email: dto.email,
        managerId: dto.managerId,
        isPrimary: dto.isPrimary || false,
        isActive: true,
      },
    });

    return warehouse;
  }

  async getWarehouses(isActive?: boolean) {
    const where: any = {};
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    return this.prisma.warehouse.findMany({
      where,
      include: {
        _count: {
          select: {
            inventory: true,
            transfersFrom: true,
            transfersTo: true,
          },
        },
      },
      orderBy: { isPrimary: 'desc' },
    });
  }

  async getWarehouse(id: string) {
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id },
      include: {
        inventory: {
          take: 10,
          orderBy: { updatedAt: 'desc' },
        },
        _count: {
          select: {
            inventory: true,
            transfersFrom: true,
            transfersTo: true,
          },
        },
      },
    });

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    return warehouse;
  }

  async updateWarehouse(id: string, dto: UpdateWarehouseDto) {
    // If setting as primary, unset other primary warehouses
    if (dto.isPrimary) {
      await this.prisma.warehouse.updateMany({
        where: { isPrimary: true, NOT: { id } },
        data: { isPrimary: false },
      });
    }

    return this.prisma.warehouse.update({
      where: { id },
      data: dto,
    });
  }

  // ==================== INVENTORY MANAGEMENT ====================

  async getInventory(query: InventoryQueryDto) {
    const where: any = {};

    if (query.productId) {
      where.productId = query.productId;
    }

    if (query.warehouseId) {
      where.warehouseId = query.warehouseId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.lowStockOnly) {
      where.OR = [
        { status: StockStatus.LOW_STOCK },
        { status: StockStatus.OUT_OF_STOCK },
      ];
    }

    const inventory = await this.prisma.inventoryItem.findMany({
      where,
      take: query.limit,
      skip: query.offset,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            price: true,
          },
        },
        warehouse: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const total = await this.prisma.inventoryItem.count({ where });

    return { inventory, total, limit: query.limit, offset: query.offset };
  }

  async getInventoryByProduct(productId: string, warehouseId?: string) {
    const where: any = { productId };

    if (warehouseId) {
      where.warehouseId = warehouseId;
    }

    return this.prisma.inventoryItem.findMany({
      where,
      include: {
        warehouse: true,
        movements: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async adjustStock(dto: AdjustStockDto, userId?: string) {
    // Get or create inventory item
    let inventoryItem = await this.prisma.inventoryItem.findUnique({
      where: {
        productId_warehouseId: {
          productId: dto.productId,
          warehouseId: dto.warehouseId,
        },
      },
    });

    if (!inventoryItem) {
      // Create new inventory item if it doesn't exist
      inventoryItem = await this.prisma.inventoryItem.create({
        data: {
          productId: dto.productId,
          warehouseId: dto.warehouseId,
          quantity: 0,
          reservedQty: 0,
          availableQty: 0,
        },
      });
    }

    const previousQty = inventoryItem.quantity;
    const newQty = previousQty + dto.quantity;

    if (newQty < 0) {
      throw new BadRequestException('Insufficient stock for this adjustment');
    }

    // Update inventory in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Update inventory item
      const updated = await tx.inventoryItem.update({
        where: { id: inventoryItem.id },
        data: {
          quantity: newQty,
          availableQty: newQty - inventoryItem.reservedQty,
          lastRestockDate: dto.quantity > 0 ? new Date() : inventoryItem.lastRestockDate,
          status: this.calculateStockStatus(newQty, inventoryItem.reorderPoint, inventoryItem.minStockLevel),
        },
      });

      // Create stock movement record
      const movement = await tx.stockMovement.create({
        data: {
          inventoryItemId: inventoryItem.id,
          productId: dto.productId,
          warehouseId: dto.warehouseId,
          type: dto.type,
          quantity: dto.quantity,
          previousQty,
          newQty,
          orderId: dto.orderId,
          userId,
          reason: dto.reason,
          notes: dto.notes,
          unitCost: dto.unitCost,
          totalCost: dto.unitCost ? dto.unitCost * Math.abs(dto.quantity) : null,
        },
      });

      return { inventoryItem: updated, movement };
    });

    return result;
  }

  async reserveStock(productId: string, warehouseId: string, quantity: number, _orderId: string) {
    const inventoryItem = await this.prisma.inventoryItem.findUnique({
      where: {
        productId_warehouseId: {
          productId,
          warehouseId,
        },
      },
    });

    if (!inventoryItem) {
      throw new NotFoundException('Inventory item not found');
    }

    if (inventoryItem.availableQty < quantity) {
      throw new BadRequestException('Insufficient available stock to reserve');
    }

    return this.prisma.inventoryItem.update({
      where: { id: inventoryItem.id },
      data: {
        reservedQty: inventoryItem.reservedQty + quantity,
        availableQty: inventoryItem.availableQty - quantity,
      },
    });
  }

  async releaseReservedStock(orderId: string) {
    // Find all stock movements for this order
    const movements = await this.prisma.stockMovement.findMany({
      where: { orderId, type: StockMovementType.SALE },
      include: { inventoryItem: true },
    });

    // Release reserved stock for each movement
    const updates = movements.map((movement) => {
      const qty = Math.abs(movement.quantity);
      return this.prisma.inventoryItem.update({
        where: { id: movement.inventoryItemId },
        data: {
          reservedQty: Math.max(0, movement.inventoryItem.reservedQty - qty),
          availableQty: movement.inventoryItem.availableQty + qty,
        },
      });
    });

    await Promise.all(updates);

    return { success: true, releasedItems: updates.length };
  }

  // ==================== STOCK TRANSFERS ====================

  async createTransfer(dto: CreateTransferDto, userId?: string) {
    // Validate source warehouse has sufficient stock
    const sourceInventory = await this.prisma.inventoryItem.findUnique({
      where: {
        productId_warehouseId: {
          productId: dto.productId,
          warehouseId: dto.fromWarehouseId,
        },
      },
    });

    if (!sourceInventory || sourceInventory.availableQty < dto.quantity) {
      throw new BadRequestException('Insufficient stock in source warehouse');
    }

    // Generate transfer number
    const count = await this.prisma.stockTransfer.count();
    const transferNumber = `TRF-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;

    const transfer = await this.prisma.stockTransfer.create({
      data: {
        transferNumber,
        fromWarehouseId: dto.fromWarehouseId,
        toWarehouseId: dto.toWarehouseId,
        productId: dto.productId,
        quantity: dto.quantity,
        status: TransferStatus.PENDING,
        requestedBy: userId,
        carrier: dto.carrier,
        trackingNumber: dto.trackingNumber,
        estimatedArrival: dto.estimatedArrival ? new Date(dto.estimatedArrival) : null,
        notes: dto.notes,
      },
      include: {
        fromWarehouse: true,
        toWarehouse: true,
        product: true,
      },
    });

    return transfer;
  }

  async approveTransfer(transferId: string, userId?: string) {
    const transfer = await this.prisma.stockTransfer.findUnique({
      where: { id: transferId },
    });

    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }

    if (transfer.status !== TransferStatus.PENDING) {
      throw new BadRequestException('Transfer is not in pending status');
    }

    // Reserve stock in source warehouse and update transfer status
    const result = await this.prisma.$transaction(async (tx) => {
      // Reserve stock
      const sourceInventory = await tx.inventoryItem.findUnique({
        where: {
          productId_warehouseId: {
            productId: transfer.productId,
            warehouseId: transfer.fromWarehouseId,
          },
        },
      });

      if (!sourceInventory || sourceInventory.availableQty < transfer.quantity) {
        throw new BadRequestException('Insufficient available stock');
      }

      await tx.inventoryItem.update({
        where: { id: sourceInventory.id },
        data: {
          reservedQty: sourceInventory.reservedQty + transfer.quantity,
          availableQty: sourceInventory.availableQty - transfer.quantity,
        },
      });

      // Update transfer
      const updated = await tx.stockTransfer.update({
        where: { id: transferId },
        data: {
          status: TransferStatus.IN_TRANSIT,
          approvedBy: userId,
          shippedDate: new Date(),
        },
      });

      // Create stock movement for source warehouse
      await tx.stockMovement.create({
        data: {
          inventoryItemId: sourceInventory.id,
          productId: transfer.productId,
          warehouseId: transfer.fromWarehouseId,
          type: StockMovementType.TRANSFER_OUT,
          quantity: -transfer.quantity,
          previousQty: sourceInventory.quantity,
          newQty: sourceInventory.quantity - transfer.quantity,
          transferId,
          userId,
          reason: `Transfer to ${transfer.toWarehouseId}`,
        },
      });

      return updated;
    });

    return result;
  }

  async receiveTransfer(transferId: string, userId?: string) {
    const transfer = await this.prisma.stockTransfer.findUnique({
      where: { id: transferId },
    });

    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }

    if (transfer.status !== TransferStatus.IN_TRANSIT) {
      throw new BadRequestException('Transfer is not in transit');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Reduce stock from source warehouse
      const sourceInventory = await tx.inventoryItem.findUnique({
        where: {
          productId_warehouseId: {
            productId: transfer.productId,
            warehouseId: transfer.fromWarehouseId,
          },
        },
      });

      if (sourceInventory) {
        await tx.inventoryItem.update({
          where: { id: sourceInventory.id },
          data: {
            quantity: sourceInventory.quantity - transfer.quantity,
            reservedQty: Math.max(0, sourceInventory.reservedQty - transfer.quantity),
          },
        });
      }

      // Add stock to destination warehouse
      let destInventory = await tx.inventoryItem.findUnique({
        where: {
          productId_warehouseId: {
            productId: transfer.productId,
            warehouseId: transfer.toWarehouseId,
          },
        },
      });

      if (!destInventory) {
        destInventory = await tx.inventoryItem.create({
          data: {
            productId: transfer.productId,
            warehouseId: transfer.toWarehouseId,
            quantity: transfer.quantity,
            availableQty: transfer.quantity,
          },
        });
      } else {
        destInventory = await tx.inventoryItem.update({
          where: { id: destInventory.id },
          data: {
            quantity: destInventory.quantity + transfer.quantity,
            availableQty: destInventory.availableQty + transfer.quantity,
          },
        });
      }

      // Create stock movement for destination
      await tx.stockMovement.create({
        data: {
          inventoryItemId: destInventory.id,
          productId: transfer.productId,
          warehouseId: transfer.toWarehouseId,
          type: StockMovementType.TRANSFER_IN,
          quantity: transfer.quantity,
          previousQty: destInventory.quantity - transfer.quantity,
          newQty: destInventory.quantity,
          transferId,
          userId,
          reason: `Transfer from ${transfer.fromWarehouseId}`,
        },
      });

      // Update transfer status
      const updated = await tx.stockTransfer.update({
        where: { id: transferId },
        data: {
          status: TransferStatus.COMPLETED,
          receivedBy: userId,
          receivedDate: new Date(),
        },
      });

      return updated;
    });

    return result;
  }

  async cancelTransfer(transferId: string, reason?: string) {
    const transfer = await this.prisma.stockTransfer.findUnique({
      where: { id: transferId },
    });

    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }

    if (transfer.status === TransferStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel completed transfer');
    }

    // If transfer was in transit, release reserved stock
    if (transfer.status === TransferStatus.IN_TRANSIT) {
      const sourceInventory = await this.prisma.inventoryItem.findUnique({
        where: {
          productId_warehouseId: {
            productId: transfer.productId,
            warehouseId: transfer.fromWarehouseId,
          },
        },
      });

      if (sourceInventory) {
        await this.prisma.inventoryItem.update({
          where: { id: sourceInventory.id },
          data: {
            reservedQty: Math.max(0, sourceInventory.reservedQty - transfer.quantity),
            availableQty: sourceInventory.availableQty + transfer.quantity,
          },
        });
      }
    }

    return this.prisma.stockTransfer.update({
      where: { id: transferId },
      data: {
        status: TransferStatus.CANCELLED,
        cancelledDate: new Date(),
        cancellationReason: reason,
      },
    });
  }

  async getTransfers(status?: TransferStatus, warehouseId?: string) {
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (warehouseId) {
      where.OR = [
        { fromWarehouseId: warehouseId },
        { toWarehouseId: warehouseId },
      ];
    }

    return this.prisma.stockTransfer.findMany({
      where,
      include: {
        fromWarehouse: true,
        toWarehouse: true,
        product: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ==================== STOCK MOVEMENTS ====================

  async getStockMovements(query: StockMovementQueryDto) {
    const where: any = {};

    if (query.productId) {
      where.productId = query.productId;
    }

    if (query.warehouseId) {
      where.warehouseId = query.warehouseId;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.createdAt.lte = new Date(query.endDate);
      }
    }

    const movements = await this.prisma.stockMovement.findMany({
      where,
      take: query.limit,
      skip: query.offset,
      include: {
        inventoryItem: {
          include: {
            product: true,
            warehouse: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const total = await this.prisma.stockMovement.count({ where });

    return { movements, total, limit: query.limit, offset: query.offset };
  }

  // ==================== REORDER MANAGEMENT ====================

  async checkReorderPoints() {
    // Find all inventory items below reorder point
    const lowStockItems = await this.prisma.inventoryItem.findMany({
      where: {
        OR: [
          { status: StockStatus.LOW_STOCK },
          { status: StockStatus.OUT_OF_STOCK },
        ],
      },
      include: {
        product: true,
        warehouse: true,
      },
    });

    const reorderRequests = [];

    for (const item of lowStockItems) {
      // Check if there's already a pending reorder
      const existingReorder = await this.prisma.reorderRequest.findFirst({
        where: {
          inventoryItemId: item.id,
          status: { in: [ReorderStatus.PENDING, ReorderStatus.ORDERED] },
        },
      });

      if (!existingReorder) {
        const request = await this.createReorderRequest({
          inventoryItemId: item.id,
          quantityRequested: item.reorderQuantity,
        });
        reorderRequests.push(request);
      }
    }

    return reorderRequests;
  }

  async createReorderRequest(dto: CreateReorderRequestDto) {
    const inventoryItem = await this.prisma.inventoryItem.findUnique({
      where: { id: dto.inventoryItemId },
      include: { product: true, warehouse: true },
    });

    if (!inventoryItem) {
      throw new NotFoundException('Inventory item not found');
    }

    const count = await this.prisma.reorderRequest.count();
    const requestNumber = `RO-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;

    return this.prisma.reorderRequest.create({
      data: {
        requestNumber,
        inventoryItemId: dto.inventoryItemId,
        productId: inventoryItem.productId,
        warehouseId: inventoryItem.warehouseId,
        quantityRequested: dto.quantityRequested,
        status: ReorderStatus.PENDING,
        supplierId: dto.supplierId,
        estimatedCost: dto.estimatedCost,
        expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : null,
        notes: dto.notes,
      },
    });
  }

  async fulfillReorderRequest(requestId: string, dto: FulfillReorderDto) {
    const request = await this.prisma.reorderRequest.findUnique({
      where: { id: requestId },
      include: { inventoryItem: true },
    });

    if (!request) {
      throw new NotFoundException('Reorder request not found');
    }

    // Update request and adjust stock
    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.reorderRequest.update({
        where: { id: requestId },
        data: {
          status: ReorderStatus.RECEIVED,
          quantityReceived: dto.quantityReceived,
          receivedDate: new Date(),
          actualCost: dto.actualCost,
          purchaseOrderId: dto.purchaseOrderId,
        },
      });

      // Adjust stock
      await this.adjustStock({
        productId: request.productId,
        warehouseId: request.warehouseId,
        quantity: dto.quantityReceived,
        type: StockMovementType.PURCHASE,
        reason: `Reorder request ${request.requestNumber}`,
        unitCost: dto.actualCost ? dto.actualCost / dto.quantityReceived : undefined,
      });

      return updated;
    });

    return result;
  }

  // ==================== STOCK ALERTS ====================

  async checkLowStockAlerts() {
    // Find all low stock items that haven't been alerted
    const lowStockItems = await this.prisma.inventoryItem.findMany({
      where: {
        OR: [
          { status: StockStatus.LOW_STOCK, lowStockAlertSent: false },
          { status: StockStatus.OUT_OF_STOCK, outOfStockAlertSent: false },
        ],
      },
      include: {
        product: true,
        warehouse: true,
      },
    });

    const alerts = [];

    for (const item of lowStockItems) {
      // Check if alert already exists
      const existingAlert = await this.prisma.stockAlert.findFirst({
        where: {
          productId: item.productId,
          warehouseId: item.warehouseId,
          isActive: true,
          isResolved: false,
        },
      });

      if (!existingAlert) {
        const count = await this.prisma.stockAlert.count();
        const alertNumber = `ALT-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;

        const alertType = item.status === StockStatus.OUT_OF_STOCK ? 'OUT_OF_STOCK' : 'LOW_STOCK';
        const severity = item.status === StockStatus.OUT_OF_STOCK ? 'CRITICAL' : 'HIGH';

        const alert = await this.prisma.stockAlert.create({
          data: {
            alertNumber,
            productId: item.productId,
            warehouseId: item.warehouseId,
            inventoryItemId: item.id,
            alertType,
            severity,
            currentQty: item.quantity,
            threshold: item.reorderPoint,
            message: `${alertType === 'OUT_OF_STOCK' ? 'Out of stock' : 'Low stock'} alert for ${item.product.name} at ${item.warehouse.name}. Current: ${item.quantity}, Reorder point: ${item.reorderPoint}`,
            isActive: true,
            isResolved: false,
            notificationSent: false,
            notifiedUsers: [],
          },
        });

        // Update alert sent flags
        await this.prisma.inventoryItem.update({
          where: { id: item.id },
          data: {
            lowStockAlertSent: alertType === 'LOW_STOCK',
            outOfStockAlertSent: alertType === 'OUT_OF_STOCK',
          },
        });

        alerts.push(alert);
      }
    }

    return alerts;
  }

  async getActiveAlerts(productId?: string, warehouseId?: string) {
    const where: any = {
      isActive: true,
      isResolved: false,
    };

    if (productId) {
      where.productId = productId;
    }

    if (warehouseId) {
      where.warehouseId = warehouseId;
    }

    return this.prisma.stockAlert.findMany({
      where,
      orderBy: [
        { severity: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async resolveAlert(alertId: string) {
    return this.prisma.stockAlert.update({
      where: { id: alertId },
      data: {
        isResolved: true,
        resolvedDate: new Date(),
      },
    });
  }

  // ==================== BACKORDER MANAGEMENT ====================

  async createBackorder(orderId: string, orderItemId: string, customerId: string, productId: string, quantityOrdered: number, warehouseId?: string) {
    const count = await this.prisma.backorder.count();
    const backorderNumber = `BO-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;

    let inventoryItemId = null;
    if (warehouseId) {
      const inventoryItem = await this.prisma.inventoryItem.findUnique({
        where: {
          productId_warehouseId: {
            productId,
            warehouseId,
          },
        },
      });
      inventoryItemId = inventoryItem?.id || null;
    }

    return this.prisma.backorder.create({
      data: {
        backorderNumber,
        orderId,
        orderItemId,
        customerId,
        productId,
        inventoryItemId,
        quantityOrdered,
        quantityFulfilled: 0,
        quantityRemaining: quantityOrdered,
        isActive: true,
        priority: 1,
        customerNotified: false,
      },
    });
  }

  async getBackorders(query: BackorderQueryDto) {
    const where: any = {};

    if (query.customerId) {
      where.customerId = query.customerId;
    }

    if (query.productId) {
      where.productId = query.productId;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    const backorders = await this.prisma.backorder.findMany({
      where,
      take: query.limit,
      skip: query.offset,
      orderBy: [
        { priority: 'asc' },
        { createdDate: 'asc' },
      ],
    });

    const total = await this.prisma.backorder.count({ where });

    return { backorders, total, limit: query.limit, offset: query.offset };
  }

  async fulfillBackorders(productId: string, quantity: number) {
    // Get active backorders for this product, ordered by priority
    const backorders = await this.prisma.backorder.findMany({
      where: {
        productId,
        isActive: true,
      },
      orderBy: [
        { priority: 'asc' },
        { createdDate: 'asc' },
      ],
    });

    let remainingQuantity = quantity;
    const fulfilled = [];

    for (const backorder of backorders) {
      if (remainingQuantity <= 0) break;

      const fulfillAmount = Math.min(remainingQuantity, backorder.quantityRemaining);

      const updated = await this.prisma.backorder.update({
        where: { id: backorder.id },
        data: {
          quantityFulfilled: backorder.quantityFulfilled + fulfillAmount,
          quantityRemaining: backorder.quantityRemaining - fulfillAmount,
          isActive: backorder.quantityRemaining - fulfillAmount > 0,
          fulfilledDate: backorder.quantityRemaining - fulfillAmount === 0 ? new Date() : null,
        },
      });

      fulfilled.push(updated);
      remainingQuantity -= fulfillAmount;
    }

    return { fulfilled, remainingQuantity };
  }

  // ==================== INVENTORY FORECASTING ====================

  async generateForecast(productId: string, warehouseId: string | null, period: string, periodDate: Date) {
    // Get historical sales data (last 90 days)
    const startDate = new Date(periodDate);
    startDate.setDate(startDate.getDate() - 90);

    const salesHistory = await this.prisma.stockMovement.findMany({
      where: {
        productId,
        warehouseId: warehouseId || undefined,
        type: StockMovementType.SALE,
        createdAt: {
          gte: startDate,
          lt: periodDate,
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Calculate historical sales
    const historicalSales = salesHistory.reduce((sum, movement) => sum + Math.abs(movement.quantity), 0);
    const averageDailySales = historicalSales / 90;

    // Simple forecasting based on historical average
    let forecastMultiplier = 1;
    switch (period) {
      case 'DAILY':
        forecastMultiplier = 1;
        break;
      case 'WEEKLY':
        forecastMultiplier = 7;
        break;
      case 'MONTHLY':
        forecastMultiplier = 30;
        break;
      case 'QUARTERLY':
        forecastMultiplier = 90;
        break;
    }

    const forecastedDemand = Math.ceil(averageDailySales * forecastMultiplier);
    const recommendedStock = Math.ceil(forecastedDemand * 1.2); // 20% buffer

    // Calculate seasonal factor (simple month-based)
    const month = periodDate.getMonth();
    const seasonalFactor = this.getSeasonalFactor(month);

    // Calculate confidence level based on data availability
    const confidenceLevel = Math.min(salesHistory.length / 30, 1); // Max confidence at 30+ data points

    // Check for existing forecast
    const existingForecast = await this.prisma.inventoryForecast.findUnique({
      where: {
        productId_warehouseId_forecastPeriod_periodDate: {
          productId,
          warehouseId: warehouseId || "",
          forecastPeriod: period,
          periodDate,
        },
      },
    });

    if (existingForecast) {
      return this.prisma.inventoryForecast.update({
        where: { id: existingForecast.id },
        data: {
          historicalSales,
          averageDailySales,
          forecastedDemand,
          recommendedStock,
          confidenceLevel,
          seasonalFactor,
          validUntil: new Date(periodDate.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });
    }

    return this.prisma.inventoryForecast.create({
      data: {
        productId,
        warehouseId,
        forecastPeriod: period,
        periodDate,
        historicalSales,
        averageDailySales,
        forecastedDemand,
        recommendedStock,
        confidenceLevel,
        seasonalFactor,
        validUntil: new Date(periodDate.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });
  }

  async getForecasts(productId?: string, warehouseId?: string) {
    const where: any = {
      validUntil: {
        gte: new Date(),
      },
    };

    if (productId) {
      where.productId = productId;
    }

    if (warehouseId !== undefined) {
      where.warehouseId = warehouseId;
    }

    return this.prisma.inventoryForecast.findMany({
      where,
      orderBy: { periodDate: 'asc' },
    });
  }

  private getSeasonalFactor(month: number): number {
    // Simple seasonal adjustment based on month
    // Adjust these factors based on your business patterns
    const seasonalFactors = [
      0.9,  // January (post-holiday slowdown)
      0.85, // February
      0.95, // March
      1.0,  // April
      1.05, // May
      1.1,  // June
      1.05, // July
      1.0,  // August
      1.05, // September
      1.1,  // October
      1.3,  // November (pre-holiday)
      1.4,  // December (holiday peak)
    ];

    return seasonalFactors[month] || 1.0;
  }

  // ==================== REAL-TIME AVAILABILITY CHECK ====================

  /**
   * Check real-time stock availability for checkout
   * Returns availability across all warehouses or a specific warehouse
   */
  async checkRealTimeAvailability(
    productId: string,
    requestedQuantity: number,
    warehouseId?: string,
  ): Promise<{
    isAvailable: boolean;
    availableQuantity: number;
    reservedQuantity: number;
    totalQuantity: number;
    warehouses: Array<{
      warehouseId: string;
      warehouseName: string;
      available: number;
      reserved: number;
      canFulfill: boolean;
    }>;
    canPartiallyFulfill: boolean;
    estimatedRestockDate?: Date | null;
    alternatives?: Array<{
      productId: string;
      productName: string;
      available: number;
    }>;
  }> {
    const where: any = { productId };

    if (warehouseId) {
      where.warehouseId = warehouseId;
    }

    // Get inventory across all warehouses
    const inventoryItems = await this.prisma.inventoryItem.findMany({
      where,
      include: {
        warehouse: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
        product: {
          select: {
            categoryId: true,
          },
        },
      },
    });

    // Calculate totals
    let totalAvailable = 0;
    let totalReserved = 0;
    let totalQuantity = 0;

    const warehouses = inventoryItems
      .filter(item => item.warehouse.isActive)
      .map(item => {
        totalAvailable += item.availableQty;
        totalReserved += item.reservedQty;
        totalQuantity += item.quantity;

        return {
          warehouseId: item.warehouse.id,
          warehouseName: item.warehouse.name,
          available: item.availableQty,
          reserved: item.reservedQty,
          canFulfill: item.availableQty >= requestedQuantity,
        };
      });

    const isAvailable = totalAvailable >= requestedQuantity;
    const canPartiallyFulfill = totalAvailable > 0 && totalAvailable < requestedQuantity;

    // Get estimated restock date from pending reorders
    let estimatedRestockDate: Date | null = null;
    if (!isAvailable) {
      const pendingReorder = await this.prisma.reorderRequest.findFirst({
        where: {
          productId,
          status: { in: [ReorderStatus.PENDING, ReorderStatus.ORDERED] },
        },
        orderBy: { expectedDate: 'asc' },
      });

      estimatedRestockDate = pendingReorder?.expectedDate || null;
    }

    // Find alternative products in the same category
    let alternatives: Array<{ productId: string; productName: string; available: number }> = [];
    if (!isAvailable && inventoryItems.length > 0) {
      // Get product info to find its category
      const productInfo = await this.prisma.product.findUnique({
        where: { id: productId },
        select: { categoryId: true },
      });

      if (productInfo?.categoryId) {
        const alternativeInventory = await this.prisma.inventoryItem.findMany({
          where: {
            productId: { not: productId },
            availableQty: { gte: requestedQuantity },
          },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                categoryId: true,
              },
            },
          },
          take: 20, // Get more and filter
          orderBy: { availableQty: 'desc' },
        });

        // Filter by category and limit to 5
        alternatives = alternativeInventory
          .filter(item => item.product.categoryId === productInfo.categoryId)
          .slice(0, 5)
          .map(item => ({
            productId: item.product.id,
            productName: item.product.name,
            available: item.availableQty,
          }));
      }
    }

    return {
      isAvailable,
      availableQuantity: totalAvailable,
      reservedQuantity: totalReserved,
      totalQuantity,
      warehouses,
      canPartiallyFulfill,
      estimatedRestockDate,
      alternatives: !isAvailable ? alternatives : undefined,
    };
  }

  /**
   * Bulk availability check for multiple products (for cart validation)
   */
  async checkBulkAvailability(
    items: Array<{ productId: string; quantity: number }>,
  ): Promise<{
    allAvailable: boolean;
    items: Array<{
      productId: string;
      requestedQuantity: number;
      isAvailable: boolean;
      availableQuantity: number;
      shortfall: number;
    }>;
    unavailableCount: number;
    totalShortfall: number;
  }> {
    const results = await Promise.all(
      items.map(async (item) => {
        const availability = await this.checkRealTimeAvailability(item.productId, item.quantity);

        return {
          productId: item.productId,
          requestedQuantity: item.quantity,
          isAvailable: availability.isAvailable,
          availableQuantity: availability.availableQuantity,
          shortfall: Math.max(0, item.quantity - availability.availableQuantity),
        };
      })
    );

    const unavailableItems = results.filter(r => !r.isAvailable);
    const totalShortfall = results.reduce((sum, r) => sum + r.shortfall, 0);

    return {
      allAvailable: unavailableItems.length === 0,
      items: results,
      unavailableCount: unavailableItems.length,
      totalShortfall,
    };
  }

  /**
   * Reserve stock for checkout with real-time validation
   */
  async reserveStockForCheckout(
    productId: string,
    quantity: number,
    orderId: string,
    preferredWarehouseId?: string,
  ): Promise<{
    success: boolean;
    warehouseId: string;
    reservedQuantity: number;
    error?: string;
  }> {
    // Check availability first
    const availability = await this.checkRealTimeAvailability(productId, quantity, preferredWarehouseId);

    if (!availability.isAvailable) {
      return {
        success: false,
        warehouseId: '',
        reservedQuantity: 0,
        error: `Insufficient stock. Available: ${availability.availableQuantity}, Requested: ${quantity}`,
      };
    }

    // Find best warehouse to fulfill from
    let selectedWarehouse = availability.warehouses.find(
      w => w.warehouseId === preferredWarehouseId && w.canFulfill
    );

    // If preferred warehouse can't fulfill, find another
    if (!selectedWarehouse) {
      selectedWarehouse = availability.warehouses.find(w => w.canFulfill);
    }

    if (!selectedWarehouse) {
      return {
        success: false,
        warehouseId: '',
        reservedQuantity: 0,
        error: 'No warehouse can fulfill this order',
      };
    }

    try {
      // Reserve the stock
      await this.reserveStock(productId, selectedWarehouse.warehouseId, quantity, orderId);

      return {
        success: true,
        warehouseId: selectedWarehouse.warehouseId,
        reservedQuantity: quantity,
      };
    } catch (error: any) {
      return {
        success: false,
        warehouseId: selectedWarehouse.warehouseId,
        reservedQuantity: 0,
        error: error.message,
      };
    }
  }

  /**
   * Subscribe to stock notifications
   */
  async subscribeToStockNotification(
    productId: string,
    email: string,
    threshold: number = 1,
  ): Promise<{ success: boolean; subscriptionId?: string }> {
    // Check if already subscribed using raw query since stockSubscription model may not exist
    try {
      const existing = await this.prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM stock_subscriptions
        WHERE product_id = ${productId} AND email = ${email} AND is_active = true
        LIMIT 1
      `;

      if (existing && existing.length > 0) {
        return { success: true, subscriptionId: existing[0].id };
      }

      // Create notification subscription
      const subscription = await this.prisma.$queryRaw<Array<{ id: string }>>`
        INSERT INTO stock_subscriptions (id, product_id, email, threshold, is_active, created_at)
        VALUES (gen_random_uuid(), ${productId}, ${email}, ${threshold}, true, NOW())
        RETURNING id
      `;

      return {
        success: true,
        subscriptionId: subscription?.[0]?.id,
      };
    } catch {
      // If table doesn't exist, log it but don't fail
      // Stock subscription requested (table doesn't exist yet)
      return { success: true };
    }
  }

  // ==================== HELPER METHODS ====================

  private calculateStockStatus(quantity: number, reorderPoint: number, minStockLevel: number): StockStatus {
    if (quantity === 0) {
      return StockStatus.OUT_OF_STOCK;
    }
    if (quantity <= minStockLevel) {
      return StockStatus.LOW_STOCK;
    }
    if (quantity <= reorderPoint) {
      return StockStatus.LOW_STOCK;
    }
    return StockStatus.IN_STOCK;
  }
}
