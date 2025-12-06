import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';

@ApiTags('Inventory - Real-Time Availability')
@Controller('inventory/availability')
export class InventoryAvailabilityController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get(':productId')
  @ApiOperation({ summary: 'Check real-time stock availability for a product' })
  @ApiQuery({ name: 'quantity', required: true, type: Number, description: 'Requested quantity' })
  @ApiQuery({ name: 'warehouseId', required: false, type: String, description: 'Specific warehouse ID' })
  async checkRealTimeAvailability(
    @Param('productId') productId: string,
    @Query('quantity') quantity: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.inventoryService.checkRealTimeAvailability(
      productId,
      parseInt(quantity, 10),
      warehouseId,
    );
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Check availability for multiple products (cart validation)' })
  async checkBulkAvailability(
    @Body() dto: { items: Array<{ productId: string; quantity: number }> },
  ) {
    return this.inventoryService.checkBulkAvailability(dto.items);
  }

  @Post('reserve')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'CUSTOMER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reserve stock for checkout' })
  async reserveStockForCheckout(
    @Body() dto: {
      productId: string;
      quantity: number;
      orderId: string;
      preferredWarehouseId?: string;
    },
  ) {
    return this.inventoryService.reserveStockForCheckout(
      dto.productId,
      dto.quantity,
      dto.orderId,
      dto.preferredWarehouseId,
    );
  }

  @Post('subscribe')
  @ApiOperation({ summary: 'Subscribe to stock availability notifications' })
  async subscribeToStockNotification(
    @Body() dto: {
      productId: string;
      email: string;
      threshold?: number;
    },
  ) {
    return this.inventoryService.subscribeToStockNotification(
      dto.productId,
      dto.email,
      dto.threshold,
    );
  }
}
