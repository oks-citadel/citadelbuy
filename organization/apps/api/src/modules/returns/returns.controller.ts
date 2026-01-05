import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ReturnsService } from './returns.service';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CreateReturnRequestDto,
  UpdateReturnRequestDto,
  ApproveReturnDto,
  InspectReturnDto,
  CreateRefundDto,
  RestockReturnDto,
  IssueStoreCreditDto,
  GenerateReturnLabelDto,
  ReturnFiltersDto,
  ReturnAnalyticsDto,
  CancelReturnDto,
} from './dto/returns.dto';

@Controller('returns')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReturnsController {
  constructor(
    private readonly returnsService: ReturnsService,
    private readonly prisma: PrismaService,
  ) {}

  // ==================== Customer Endpoints ====================

  @Post()
  async createReturn(@Request() req: any, @Body() dto: CreateReturnRequestDto) {
    return this.returnsService.createReturnRequest(req.user.id, dto);
  }

  @Get('my-returns')
  async getMyReturns(@Request() req: any, @Query() filters: ReturnFiltersDto) {
    return this.returnsService.getReturns(req.user.id, filters);
  }

  @Get(':id')
  async getReturnById(@Param('id') id: string) {
    return this.returnsService.getReturnById(id);
  }

  @Post(':id/cancel')
  async cancelReturn(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: CancelReturnDto,
  ) {
    return this.returnsService.cancelReturn(id, req.user.id, dto);
  }

  // ==================== Admin Endpoints ====================

  @Get()
  @Roles('ADMIN')
  async getAllReturns(@Query() filters: ReturnFiltersDto) {
    return this.returnsService.getReturns(null, filters);
  }

  @Post(':id/approve')
  @Roles('ADMIN')
  async approveReturn(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: ApproveReturnDto,
  ) {
    return this.returnsService.approveReturn(id, req.user.id, dto);
  }

  @Post(':id/generate-label')
  @Roles('ADMIN')
  async generateReturnLabel(
    @Param('id') id: string,
    @Body() dto: GenerateReturnLabelDto,
  ) {
    return this.returnsService.generateReturnLabel(id, dto);
  }

  @Post(':id/mark-received')
  @Roles('ADMIN')
  async markAsReceived(@Request() req: any, @Param('id') id: string) {
    return this.returnsService.markAsReceived(id, req.user.id);
  }

  @Post(':id/inspect')
  @Roles('ADMIN')
  async inspectReturn(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: InspectReturnDto,
  ) {
    return this.returnsService.inspectReturn(id, req.user.id, dto);
  }

  @Patch(':id')
  @Roles('ADMIN')
  async updateReturn(@Param('id') id: string, @Body() dto: UpdateReturnRequestDto) {
    return this.prisma.returnRequest.update({
      where: { id },
      data: dto,
    });
  }

  // ==================== Refund Endpoints ====================

  @Post(':id/refund')
  @Roles('ADMIN')
  async createRefund(@Param('id') id: string, @Body() dto: CreateRefundDto) {
    return this.returnsService.createRefund(id, { ...dto, returnRequestId: id });
  }

  @Post('refunds/:id/process')
  @Roles('ADMIN')
  async processRefund(@Request() req: any, @Param('id') id: string) {
    return this.returnsService.processRefund(id, req.user.id);
  }

  // ==================== Store Credit Endpoints ====================

  @Post(':id/issue-credit')
  @Roles('ADMIN')
  async issueStoreCredit(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: IssueStoreCreditDto,
  ) {
    return this.returnsService.issueStoreCredit(id, req.user.id, {
      ...dto,
      returnRequestId: id,
    });
  }

  // ==================== Restocking Endpoints ====================

  @Post('restock')
  @Roles('ADMIN')
  async restockItems(@Request() req: any, @Body() dto: RestockReturnDto) {
    return this.returnsService.restockItems(dto, req.user.id);
  }

  // ==================== Analytics Endpoints ====================

  @Get('analytics/summary')
  @Roles('ADMIN')
  async getAnalytics(@Query() filters: ReturnAnalyticsDto) {
    return this.returnsService.getReturnAnalytics(filters);
  }

}
