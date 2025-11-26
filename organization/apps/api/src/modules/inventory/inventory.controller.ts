import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
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
import { TransferStatus } from '@prisma/client';
import { AuthRequest } from '@/common/types/auth-request.types';

@ApiTags('Inventory')
@Controller('inventory')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // ==================== WAREHOUSE ENDPOINTS ====================

  @Post('warehouses')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create new warehouse (Admin only)' })
  async createWarehouse(@Body() dto: CreateWarehouseDto) {
    return this.inventoryService.createWarehouse(dto);
  }

  @Get('warehouses')
  @ApiOperation({ summary: 'Get all warehouses' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  async getWarehouses(@Query('isActive') isActive?: boolean) {
    return this.inventoryService.getWarehouses(isActive);
  }

  @Get('warehouses/:id')
  @ApiOperation({ summary: 'Get warehouse by ID' })
  async getWarehouse(@Param('id') id: string) {
    return this.inventoryService.getWarehouse(id);
  }

  @Patch('warehouses/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update warehouse (Admin only)' })
  async updateWarehouse(@Param('id') id: string, @Body() dto: UpdateWarehouseDto) {
    return this.inventoryService.updateWarehouse(id, dto);
  }

  // ==================== INVENTORY ENDPOINTS ====================

  @Get()
  @ApiOperation({ summary: 'Get inventory list' })
  async getInventory(@Query() query: InventoryQueryDto) {
    return this.inventoryService.getInventory(query);
  }

  @Get('product/:productId')
  @ApiOperation({ summary: 'Get inventory for a specific product' })
  @ApiQuery({ name: 'warehouseId', required: false, type: String })
  async getInventoryByProduct(
    @Param('productId') productId: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.inventoryService.getInventoryByProduct(productId, warehouseId);
  }

  @Post('adjust')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Adjust stock level (Admin/Manager only)' })
  async adjustStock(@Request() req: AuthRequest, @Body() dto: AdjustStockDto) {
    return this.inventoryService.adjustStock(dto, req.user.userId);
  }

  @Post('reserve')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Reserve stock for an order' })
  async reserveStock(
    @Body() dto: { productId: string; warehouseId: string; quantity: number; orderId: string },
  ) {
    return this.inventoryService.reserveStock(
      dto.productId,
      dto.warehouseId,
      dto.quantity,
      dto.orderId,
    );
  }

  @Post('release/:orderId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Release reserved stock for an order' })
  async releaseReservedStock(@Param('orderId') orderId: string) {
    return this.inventoryService.releaseReservedStock(orderId);
  }

  // ==================== TRANSFER ENDPOINTS ====================

  @Post('transfers')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create stock transfer' })
  async createTransfer(@Request() req: AuthRequest, @Body() dto: CreateTransferDto) {
    return this.inventoryService.createTransfer(dto, req.user.userId);
  }

  @Get('transfers')
  @ApiOperation({ summary: 'Get all transfers' })
  @ApiQuery({ name: 'status', required: false, enum: TransferStatus })
  @ApiQuery({ name: 'warehouseId', required: false, type: String })
  async getTransfers(
    @Query('status') status?: TransferStatus,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.inventoryService.getTransfers(status, warehouseId);
  }

  @Patch('transfers/:id/approve')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Approve transfer' })
  async approveTransfer(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.inventoryService.approveTransfer(id, req.user.userId);
  }

  @Patch('transfers/:id/receive')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Receive transfer' })
  async receiveTransfer(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.inventoryService.receiveTransfer(id, req.user.userId);
  }

  @Patch('transfers/:id/cancel')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Cancel transfer' })
  async cancelTransfer(@Param('id') id: string, @Body() dto: { reason?: string }) {
    return this.inventoryService.cancelTransfer(id, dto.reason);
  }

  // ==================== MOVEMENT ENDPOINTS ====================

  @Get('movements')
  @ApiOperation({ summary: 'Get stock movement history' })
  async getStockMovements(@Query() query: StockMovementQueryDto) {
    return this.inventoryService.getStockMovements(query);
  }

  // ==================== REORDER ENDPOINTS ====================

  @Post('reorders/check')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Check reorder points and create requests (Admin only)' })
  async checkReorderPoints() {
    return this.inventoryService.checkReorderPoints();
  }

  @Post('reorders')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create reorder request' })
  async createReorderRequest(@Body() dto: CreateReorderRequestDto) {
    return this.inventoryService.createReorderRequest(dto);
  }

  @Patch('reorders/:id/fulfill')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Fulfill reorder request' })
  async fulfillReorderRequest(@Param('id') id: string, @Body() dto: FulfillReorderDto) {
    return this.inventoryService.fulfillReorderRequest(id, dto);
  }

  // ==================== ALERT ENDPOINTS ====================

  @Post('alerts/check')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Check and generate low stock alerts (Admin only)' })
  async checkLowStockAlerts() {
    return this.inventoryService.checkLowStockAlerts();
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get active alerts' })
  @ApiQuery({ name: 'productId', required: false, type: String })
  @ApiQuery({ name: 'warehouseId', required: false, type: String })
  async getActiveAlerts(
    @Query('productId') productId?: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.inventoryService.getActiveAlerts(productId, warehouseId);
  }

  @Patch('alerts/:id/resolve')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Resolve alert (Admin only)' })
  async resolveAlert(@Param('id') id: string) {
    return this.inventoryService.resolveAlert(id);
  }

  // ==================== BACKORDER ENDPOINTS ====================

  @Post('backorders')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create backorder (Admin only)' })
  async createBackorder(
    @Body() dto: {
      orderId: string;
      orderItemId: string;
      customerId: string;
      productId: string;
      quantityOrdered: number;
      warehouseId?: string;
    },
  ) {
    return this.inventoryService.createBackorder(
      dto.orderId,
      dto.orderItemId,
      dto.customerId,
      dto.productId,
      dto.quantityOrdered,
      dto.warehouseId,
    );
  }

  @Get('backorders')
  @ApiOperation({ summary: 'Get backorders' })
  async getBackorders(@Query() query: BackorderQueryDto) {
    return this.inventoryService.getBackorders(query);
  }

  @Post('backorders/fulfill/:productId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Fulfill backorders for product (Admin only)' })
  async fulfillBackorders(
    @Param('productId') productId: string,
    @Body() dto: { quantity: number },
  ) {
    return this.inventoryService.fulfillBackorders(productId, dto.quantity);
  }

  // ==================== FORECASTING ENDPOINTS ====================

  @Post('forecasts/generate')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Generate inventory forecast (Admin only)' })
  async generateForecast(
    @Body() dto: {
      productId: string;
      warehouseId: string | null;
      period: string;
      periodDate: string;
    },
  ) {
    return this.inventoryService.generateForecast(
      dto.productId,
      dto.warehouseId,
      dto.period,
      new Date(dto.periodDate),
    );
  }

  @Get('forecasts')
  @ApiOperation({ summary: 'Get inventory forecasts' })
  @ApiQuery({ name: 'productId', required: false, type: String })
  @ApiQuery({ name: 'warehouseId', required: false, type: String })
  async getForecasts(
    @Query('productId') productId?: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.inventoryService.getForecasts(productId, warehouseId);
  }
}
