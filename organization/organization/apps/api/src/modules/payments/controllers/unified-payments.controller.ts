import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PaymentOrchestratorService } from '../services/payment-orchestrator.service';
import { WalletService } from '../services/wallet.service';
import { PaymentProviderType, CreatePaymentRequest, PaymentType } from '../interfaces';

// DTOs
class CreateCheckoutSessionDto {
  amount: number;
  currency: string;
  provider?: PaymentProviderType;
  items?: Array<{
    id: string;
    name: string;
    description?: string;
    quantity: number;
    unitPrice: number;
  }>;
  metadata?: Record<string, any>;
  returnUrl?: string;
  cancelUrl?: string;
  description?: string;
}

class CreateSubscriptionDto {
  planId: string;
  provider?: PaymentProviderType;
  paymentMethodId?: string;
  couponCode?: string;
  trialDays?: number;
}

class ValidateIAPReceiptDto {
  platform: 'ios' | 'android';
  receipt: string;
  productId?: string;
}

class WalletTopupDto {
  amount: number;
  currency?: string;
  provider?: PaymentProviderType;
  returnUrl?: string;
  cancelUrl?: string;
}

class PurchasePackageDto {
  packageId: string;
  provider?: PaymentProviderType;
  returnUrl?: string;
  cancelUrl?: string;
}

@ApiTags('Unified Payments')
@Controller('payments')
export class UnifiedPaymentsController {
  constructor(
    private readonly paymentOrchestrator: PaymentOrchestratorService,
    private readonly walletService: WalletService,
  ) {}

  // ==================== Provider Info ====================

  @Get('providers')
  @ApiOperation({ summary: 'Get available payment providers' })
  @ApiQuery({ name: 'currency', required: false })
  @ApiQuery({ name: 'country', required: false })
  getProviders(
    @Query('currency') currency?: string,
    @Query('country') country?: string,
  ) {
    const available = this.paymentOrchestrator.getAvailableProviders(currency, country);
    const status = this.paymentOrchestrator.getProvidersStatus();

    return {
      available,
      status,
    };
  }

  // ==================== Checkout ====================

  @Post('checkout-session')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create checkout session' })
  async createCheckoutSession(
    @Request() req: any,
    @Body() dto: CreateCheckoutSessionDto,
  ) {
    const user = req.user;

    const request: CreatePaymentRequest = {
      amount: dto.amount,
      currency: dto.currency,
      customer: {
        id: user.sub || user.id,
        email: user.email,
        name: user.name,
      },
      items: dto.items?.map(item => ({
        ...item,
        currency: dto.currency,
      })),
      metadata: dto.metadata,
      returnUrl: dto.returnUrl,
      cancelUrl: dto.cancelUrl,
      description: dto.description,
      paymentType: PaymentType.ONE_TIME,
    };

    if (dto.provider) {
      return this.paymentOrchestrator.createPayment(dto.provider, request);
    }

    return this.paymentOrchestrator.createPaymentAuto(request);
  }

  @Get('status/:provider/:transactionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment status' })
  async getPaymentStatus(
    @Param('provider') provider: PaymentProviderType,
    @Param('transactionId') transactionId: string,
  ) {
    return this.paymentOrchestrator.getPaymentStatus(provider, transactionId);
  }

  // ==================== PayPal ====================

  @Post('paypal/create-order')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create PayPal order' })
  async createPayPalOrder(
    @Request() req: any,
    @Body() dto: CreateCheckoutSessionDto,
  ) {
    const user = req.user;

    const request: CreatePaymentRequest = {
      amount: dto.amount,
      currency: dto.currency || 'USD',
      customer: {
        id: user.sub || user.id,
        email: user.email,
        name: user.name,
      },
      items: dto.items?.map(item => ({
        ...item,
        currency: dto.currency || 'USD',
      })),
      metadata: dto.metadata,
      returnUrl: dto.returnUrl,
      cancelUrl: dto.cancelUrl,
      description: dto.description,
    };

    return this.paymentOrchestrator.createPayment(PaymentProviderType.PAYPAL, request);
  }

  @Post('paypal/capture/:orderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Capture PayPal order' })
  async capturePayPalOrder(@Param('orderId') orderId: string) {
    return this.paymentOrchestrator.capturePayment(PaymentProviderType.PAYPAL, orderId);
  }

  // ==================== Flutterwave ====================

  @Post('flutterwave/init')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initialize Flutterwave payment' })
  async initFlutterwave(
    @Request() req: any,
    @Body() dto: CreateCheckoutSessionDto,
  ) {
    const user = req.user;

    const request: CreatePaymentRequest = {
      amount: dto.amount,
      currency: dto.currency || 'NGN',
      customer: {
        id: user.sub || user.id,
        email: user.email,
        name: user.name,
      },
      items: dto.items?.map(item => ({
        ...item,
        currency: dto.currency || 'NGN',
      })),
      metadata: dto.metadata,
      returnUrl: dto.returnUrl,
      cancelUrl: dto.cancelUrl,
      description: dto.description,
    };

    return this.paymentOrchestrator.createPayment(PaymentProviderType.FLUTTERWAVE, request);
  }

  // ==================== Paystack ====================

  @Post('paystack/init')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initialize Paystack payment' })
  async initPaystack(
    @Request() req: any,
    @Body() dto: CreateCheckoutSessionDto,
  ) {
    const user = req.user;

    const request: CreatePaymentRequest = {
      amount: dto.amount,
      currency: dto.currency || 'NGN',
      customer: {
        id: user.sub || user.id,
        email: user.email,
        name: user.name,
      },
      items: dto.items?.map(item => ({
        ...item,
        currency: dto.currency || 'NGN',
      })),
      metadata: dto.metadata,
      returnUrl: dto.returnUrl,
      cancelUrl: dto.cancelUrl,
      description: dto.description,
    };

    return this.paymentOrchestrator.createPayment(PaymentProviderType.PAYSTACK, request);
  }

  // ==================== Subscriptions ====================

  @Post('subscriptions/create')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create subscription' })
  async createSubscription(
    @Request() req: any,
    @Body() dto: CreateSubscriptionDto,
  ) {
    const user = req.user;
    const provider = dto.provider || PaymentProviderType.STRIPE;

    return this.paymentOrchestrator.createSubscription(provider, {
      customerId: user.sub || user.id,
      planId: dto.planId,
      paymentMethodId: dto.paymentMethodId,
      couponCode: dto.couponCode,
      trialDays: dto.trialDays,
    });
  }

  @Post('subscriptions/:subscriptionId/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel subscription' })
  async cancelSubscription(
    @Param('subscriptionId') subscriptionId: string,
    @Query('immediately') immediately?: boolean,
    @Query('provider') provider?: PaymentProviderType,
  ) {
    return this.paymentOrchestrator.cancelSubscription(
      provider || PaymentProviderType.STRIPE,
      subscriptionId,
      immediately,
    );
  }

  @Get('subscriptions/:subscriptionId/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get subscription status' })
  async getSubscriptionStatus(
    @Param('subscriptionId') subscriptionId: string,
    @Query('provider') provider?: PaymentProviderType,
  ) {
    return this.paymentOrchestrator.getSubscriptionStatus(
      provider || PaymentProviderType.STRIPE,
      subscriptionId,
    );
  }

  // ==================== In-App Purchases ====================

  @Post('iap/validate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Validate IAP receipt' })
  async validateIAPReceipt(
    @Request() req: any,
    @Body() dto: ValidateIAPReceiptDto,
  ) {
    return this.paymentOrchestrator.validateIAPReceipt(
      dto.platform,
      dto.receipt,
      dto.productId,
    );
  }

  @Post('iap/sync')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sync IAP purchase with account' })
  async syncIAPPurchase(
    @Request() req: any,
    @Body() dto: ValidateIAPReceiptDto,
  ) {
    const userId = req.user.sub || req.user.id;

    if (!dto.productId) {
      throw new BadRequestException('Product ID is required for sync');
    }

    return this.paymentOrchestrator.syncIAPPurchase(
      userId,
      dto.platform,
      dto.receipt,
      dto.productId,
    );
  }

  @Post('iap/subscription/verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify IAP subscription' })
  async verifyIAPSubscription(
    @Body() dto: ValidateIAPReceiptDto,
  ) {
    if (!dto.productId) {
      throw new BadRequestException('Product ID is required');
    }

    return this.paymentOrchestrator.verifyIAPSubscription(
      dto.platform,
      dto.receipt,
      dto.productId,
    );
  }

  // ==================== Wallet ====================

  @Get('wallet/balance')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get wallet balance' })
  async getWalletBalance(@Request() req: any) {
    const userId = req.user.sub || req.user.id;
    return this.walletService.getBalance(userId);
  }

  @Get('wallet/transactions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get wallet transactions' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async getWalletTransactions(
    @Request() req: any,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.walletService.getTransactions(userId, limit || 20, offset || 0);
  }

  @Post('wallet/topup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Top up wallet' })
  async topupWallet(
    @Request() req: any,
    @Body() dto: WalletTopupDto,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.walletService.topup(userId, dto);
  }

  @Get('wallet/packages')
  @ApiOperation({ summary: 'Get available credit packages' })
  getCreditPackages() {
    return this.walletService.getCreditPackages();
  }

  @Post('wallet/purchase-package')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Purchase a credit package' })
  async purchasePackage(
    @Request() req: any,
    @Body() dto: PurchasePackageDto,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.walletService.purchasePackage(
      userId,
      dto.packageId,
      dto.provider,
      dto.returnUrl,
      dto.cancelUrl,
    );
  }
}
