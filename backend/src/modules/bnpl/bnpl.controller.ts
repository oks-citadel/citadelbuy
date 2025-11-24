import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BnplService } from './bnpl.service';
import { CreatePaymentPlanDto } from './dto/create-payment-plan.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BnplProvider } from '@prisma/client';
import { AuthRequest } from '../../common/types/auth-request.types';

@ApiTags('bnpl')
@Controller('bnpl')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BnplController {
  constructor(private readonly bnplService: BnplService) {}

  // ============================================
  // PAYMENT PLAN MANAGEMENT
  // ============================================

  @Post('payment-plans')
  @ApiOperation({ summary: 'Create BNPL payment plan for an order' })
  @ApiResponse({ status: 201, description: 'Payment plan created successfully' })
  createPaymentPlan(@Request() req: AuthRequest, @Body() dto: CreatePaymentPlanDto) {
    return this.bnplService.createPaymentPlan(req.user.id, dto);
  }

  @Get('payment-plans')
  @ApiOperation({ summary: 'Get all payment plans for current user' })
  @ApiResponse({ status: 200, description: 'Payment plans retrieved successfully' })
  findUserPaymentPlans(@Request() req: AuthRequest) {
    return this.bnplService.findUserPaymentPlans(req.user.id);
  }

  @Get('payment-plans/:id')
  @ApiOperation({ summary: 'Get payment plan by ID' })
  @ApiResponse({ status: 200, description: 'Payment plan retrieved successfully' })
  findOnePaymentPlan(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.bnplService.findOnePaymentPlan(id, req.user.id);
  }

  @Get('payment-plans/order/:orderId')
  @ApiOperation({ summary: 'Get payment plan for an order' })
  @ApiResponse({ status: 200, description: 'Payment plan retrieved successfully' })
  findByOrderId(@Param('orderId') orderId: string, @Request() req: AuthRequest) {
    return this.bnplService.findByOrderId(orderId, req.user.id);
  }

  @Delete('payment-plans/:id')
  @ApiOperation({ summary: 'Cancel payment plan' })
  @ApiResponse({ status: 200, description: 'Payment plan cancelled successfully' })
  cancelPaymentPlan(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.bnplService.cancelPaymentPlan(id, req.user.id);
  }

  // ============================================
  // INSTALLMENT MANAGEMENT
  // ============================================

  @Post('installments/:id/pay')
  @ApiOperation({ summary: 'Process installment payment' })
  @ApiResponse({ status: 200, description: 'Payment processed successfully' })
  processInstallmentPayment(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.bnplService.processInstallmentPayment(id, req.user.id);
  }

  @Get('installments/upcoming')
  @ApiOperation({ summary: 'Get upcoming installments' })
  @ApiResponse({ status: 200, description: 'Upcoming installments retrieved successfully' })
  getUpcomingInstallments(@Request() req: AuthRequest) {
    return this.bnplService.getUpcomingInstallments(req.user.id);
  }

  @Get('installments/overdue')
  @ApiOperation({ summary: 'Get overdue installments' })
  @ApiResponse({ status: 200, description: 'Overdue installments retrieved successfully' })
  getOverdueInstallments(@Request() req: AuthRequest) {
    return this.bnplService.getOverdueInstallments(req.user.id);
  }

  // ============================================
  // ELIGIBILITY & INFORMATION
  // ============================================

  @Get('eligibility/:orderId')
  @ApiOperation({ summary: 'Check BNPL eligibility for an order' })
  @ApiResponse({ status: 200, description: 'Eligibility checked successfully' })
  checkEligibility(
    @Param('orderId') orderId: string,
    @Query('provider') provider: BnplProvider
  ) {
    return this.bnplService.checkEligibility(orderId, provider);
  }
}
