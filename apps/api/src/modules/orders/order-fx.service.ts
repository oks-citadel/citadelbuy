import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * Order FX Snapshot Service
 *
 * Provides immutable foreign exchange rate snapshots for orders.
 * This is CRITICAL for preventing FX manipulation attacks where attackers
 * might try to exploit exchange rate fluctuations.
 *
 * SECURITY REQUIREMENTS:
 * - FX rates MUST be captured at order creation time
 * - FX rates MUST be stored with the order and NEVER recalculated
 * - All refunds MUST use the original order's FX rate
 * - Rate source and timestamp MUST be auditable
 */
@Injectable()
export class OrderFxService {
  private readonly logger = new Logger(OrderFxService.name);
  private readonly fxRateProvider: string;
  private readonly maxOrderAgeMinutes = 15; // Maximum time between quote and payment

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.fxRateProvider = this.configService.get<string>('FX_RATE_PROVIDER', 'internal');
  }

  /**
   * Capture FX rates for an order at creation time
   *
   * This creates an immutable snapshot of exchange rates that will be used
   * for all financial calculations on this order.
   */
  async captureOrderFxSnapshot(
    orderId: string,
    sourceCurrency: string,
    targetCurrency: string,
    organizationId: string,
  ): Promise<OrderFxSnapshot> {
    // Get current FX rate from provider
    const currentRate = await this.getCurrentFxRate(sourceCurrency, targetCurrency);

    if (!currentRate) {
      throw new BadRequestException(
        `Unable to get exchange rate for ${sourceCurrency}/${targetCurrency}`,
      );
    }

    // Generate a unique snapshot ID for audit purposes
    const snapshotId = crypto.randomUUID();
    const capturedAt = new Date();

    // Create immutable snapshot
    const snapshot = await this.prisma.orderFxSnapshot.create({
      data: {
        id: snapshotId,
        orderId,
        organizationId,
        sourceCurrency: sourceCurrency.toUpperCase(),
        targetCurrency: targetCurrency.toUpperCase(),
        rate: currentRate.rate,
        inverseRate: currentRate.inverseRate,
        rateSource: currentRate.source,
        rateTimestamp: currentRate.timestamp,
        capturedAt,
        // Store provider metadata for audit
        metadata: {
          provider: this.fxRateProvider,
          providerRateId: currentRate.rateId,
          margin: currentRate.margin || 0,
          midMarketRate: currentRate.midMarketRate,
        },
      },
    });

    this.logger.log({
      message: 'FX snapshot captured for order',
      orderId,
      snapshotId,
      sourceCurrency,
      targetCurrency,
      rate: currentRate.rate,
      rateSource: currentRate.source,
    });

    return {
      id: snapshot.id,
      orderId: snapshot.orderId,
      sourceCurrency: snapshot.sourceCurrency,
      targetCurrency: snapshot.targetCurrency,
      rate: snapshot.rate.toNumber(),
      inverseRate: snapshot.inverseRate.toNumber(),
      rateSource: snapshot.rateSource,
      rateTimestamp: snapshot.rateTimestamp,
      capturedAt: snapshot.capturedAt,
    };
  }

  /**
   * Get the FX snapshot for an order
   *
   * This retrieves the immutable FX rates that were captured when the order was created.
   * NEVER recalculate - always use the stored snapshot.
   */
  async getOrderFxSnapshot(orderId: string): Promise<OrderFxSnapshot | null> {
    const snapshot = await this.prisma.orderFxSnapshot.findFirst({
      where: { orderId },
    });

    if (!snapshot) {
      return null;
    }

    return {
      id: snapshot.id,
      orderId: snapshot.orderId,
      sourceCurrency: snapshot.sourceCurrency,
      targetCurrency: snapshot.targetCurrency,
      rate: snapshot.rate.toNumber(),
      inverseRate: snapshot.inverseRate.toNumber(),
      rateSource: snapshot.rateSource,
      rateTimestamp: snapshot.rateTimestamp,
      capturedAt: snapshot.capturedAt,
    };
  }

  /**
   * Convert amount using the order's FX snapshot
   *
   * This MUST be used for all financial calculations on the order
   * to ensure consistency and prevent FX manipulation.
   */
  async convertWithOrderSnapshot(
    orderId: string,
    amount: number,
    direction: 'sourceToTarget' | 'targetToSource',
  ): Promise<{
    originalAmount: number;
    convertedAmount: number;
    rate: number;
    snapshotId: string;
  }> {
    const snapshot = await this.getOrderFxSnapshot(orderId);

    if (!snapshot) {
      throw new BadRequestException(`No FX snapshot found for order ${orderId}`);
    }

    const rate = direction === 'sourceToTarget' ? snapshot.rate : snapshot.inverseRate;
    const convertedAmount = this.roundCurrency(amount * rate);

    return {
      originalAmount: amount,
      convertedAmount,
      rate,
      snapshotId: snapshot.id,
    };
  }

  /**
   * Calculate refund amount using the original order's FX rate
   *
   * SECURITY: Refunds MUST use the original order's FX rate to prevent
   * customers from exploiting rate differences.
   */
  async calculateRefundAmount(
    orderId: string,
    refundAmount: number,
    currency: 'source' | 'target',
  ): Promise<{
    refundInSourceCurrency: number;
    refundInTargetCurrency: number;
    rateUsed: number;
    snapshotId: string;
    warning?: string;
  }> {
    const snapshot = await this.getOrderFxSnapshot(orderId);

    if (!snapshot) {
      throw new BadRequestException(`No FX snapshot found for order ${orderId}`);
    }

    let refundInSourceCurrency: number;
    let refundInTargetCurrency: number;
    let warning: string | undefined;

    if (currency === 'source') {
      refundInSourceCurrency = refundAmount;
      refundInTargetCurrency = this.roundCurrency(refundAmount * snapshot.rate);
    } else {
      refundInTargetCurrency = refundAmount;
      refundInSourceCurrency = this.roundCurrency(refundAmount * snapshot.inverseRate);
    }

    // Check if current rate differs significantly from snapshot rate
    const currentRate = await this.getCurrentFxRate(snapshot.sourceCurrency, snapshot.targetCurrency);
    if (currentRate) {
      const rateDifferencePercent = Math.abs(
        ((currentRate.rate - snapshot.rate) / snapshot.rate) * 100,
      );

      if (rateDifferencePercent > 5) {
        warning = `Current FX rate differs by ${rateDifferencePercent.toFixed(2)}% from order rate. ` +
                  `Refund calculated using original order rate.`;

        this.logger.warn({
          message: 'Significant FX rate change since order',
          orderId,
          snapshotRate: snapshot.rate,
          currentRate: currentRate.rate,
          differencePercent: rateDifferencePercent,
        });
      }
    }

    return {
      refundInSourceCurrency,
      refundInTargetCurrency,
      rateUsed: snapshot.rate,
      snapshotId: snapshot.id,
      warning,
    };
  }

  /**
   * Validate that an order quote hasn't expired
   *
   * Orders must be paid within a certain time window to prevent
   * FX arbitrage attacks.
   */
  async validateOrderFxQuote(orderId: string): Promise<{
    valid: boolean;
    remainingSeconds?: number;
    error?: string;
  }> {
    const snapshot = await this.getOrderFxSnapshot(orderId);

    if (!snapshot) {
      return { valid: false, error: 'No FX quote found for this order' };
    }

    const ageMs = Date.now() - snapshot.capturedAt.getTime();
    const maxAgeMs = this.maxOrderAgeMinutes * 60 * 1000;

    if (ageMs > maxAgeMs) {
      this.logger.warn({
        message: 'Order FX quote expired',
        orderId,
        snapshotId: snapshot.id,
        ageMinutes: ageMs / 60000,
        maxMinutes: this.maxOrderAgeMinutes,
      });

      return {
        valid: false,
        error: `Order quote has expired. Please create a new order. (Quote valid for ${this.maxOrderAgeMinutes} minutes)`,
      };
    }

    const remainingSeconds = Math.floor((maxAgeMs - ageMs) / 1000);

    return { valid: true, remainingSeconds };
  }

  /**
   * Refresh FX quote for an expired order
   *
   * This creates a new snapshot with current rates, but the old snapshot
   * is preserved for audit purposes (never deleted).
   */
  async refreshOrderFxQuote(
    orderId: string,
    organizationId: string,
  ): Promise<OrderFxSnapshot> {
    const existingSnapshot = await this.getOrderFxSnapshot(orderId);

    if (!existingSnapshot) {
      throw new BadRequestException('No existing FX quote found for this order');
    }

    // Mark existing snapshot as superseded (but don't delete)
    await this.prisma.orderFxSnapshot.update({
      where: { id: existingSnapshot.id },
      data: {
        metadata: {
          ...((existingSnapshot as any).metadata || {}),
          supersededAt: new Date().toISOString(),
          supersededReason: 'Quote expired, new quote requested',
        },
      },
    });

    // Create new snapshot
    const newSnapshot = await this.captureOrderFxSnapshot(
      orderId,
      existingSnapshot.sourceCurrency,
      existingSnapshot.targetCurrency,
      organizationId,
    );

    this.logger.log({
      message: 'FX quote refreshed for order',
      orderId,
      oldSnapshotId: existingSnapshot.id,
      newSnapshotId: newSnapshot.id,
      oldRate: existingSnapshot.rate,
      newRate: newSnapshot.rate,
    });

    return newSnapshot;
  }

  /**
   * Get current FX rate from provider
   *
   * This is used for capturing new snapshots. Once captured,
   * the snapshot rate is immutable.
   */
  private async getCurrentFxRate(
    sourceCurrency: string,
    targetCurrency: string,
  ): Promise<FxRate | null> {
    // In production, this would call an external FX provider
    // For now, using internal rate configuration

    const rateKey = `${sourceCurrency.toUpperCase()}_${targetCurrency.toUpperCase()}`;

    // Try to get from configured rates
    const configuredRate = this.configService.get<number>(`FX_RATE_${rateKey}`);

    if (configuredRate) {
      return {
        rate: configuredRate,
        inverseRate: this.roundRate(1 / configuredRate),
        source: 'configured',
        timestamp: new Date(),
        rateId: `cfg_${rateKey}_${Date.now()}`,
      };
    }

    // Fallback: Try to get from database cache
    const cachedRate = await this.prisma.fxRateCache.findFirst({
      where: {
        sourceCurrency: sourceCurrency.toUpperCase(),
        targetCurrency: targetCurrency.toUpperCase(),
        expiresAt: { gt: new Date() },
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (cachedRate) {
      return {
        rate: cachedRate.rate.toNumber(),
        inverseRate: this.roundRate(1 / cachedRate.rate.toNumber()),
        source: cachedRate.source,
        timestamp: cachedRate.updatedAt,
        rateId: cachedRate.id,
        midMarketRate: cachedRate.midMarketRate?.toNumber(),
        margin: cachedRate.margin?.toNumber(),
      };
    }

    // Same currency - rate is 1
    if (sourceCurrency.toUpperCase() === targetCurrency.toUpperCase()) {
      return {
        rate: 1,
        inverseRate: 1,
        source: 'same_currency',
        timestamp: new Date(),
        rateId: `same_${rateKey}_${Date.now()}`,
      };
    }

    this.logger.error(`No FX rate available for ${sourceCurrency}/${targetCurrency}`);
    return null;
  }

  /**
   * Round currency amount to appropriate decimal places
   */
  private roundCurrency(amount: number, decimals: number = 2): number {
    return Math.round(amount * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }

  /**
   * Round exchange rate to appropriate precision
   */
  private roundRate(rate: number, precision: number = 6): number {
    return Math.round(rate * Math.pow(10, precision)) / Math.pow(10, precision);
  }

  /**
   * Get FX snapshot audit trail for an order
   */
  async getOrderFxAuditTrail(orderId: string): Promise<OrderFxAuditEntry[]> {
    const snapshots = await this.prisma.orderFxSnapshot.findMany({
      where: { orderId },
      orderBy: { capturedAt: 'asc' },
    });

    return snapshots.map((s) => ({
      snapshotId: s.id,
      capturedAt: s.capturedAt,
      sourceCurrency: s.sourceCurrency,
      targetCurrency: s.targetCurrency,
      rate: s.rate.toNumber(),
      rateSource: s.rateSource,
      rateTimestamp: s.rateTimestamp,
      metadata: s.metadata as Record<string, unknown>,
    }));
  }
}

/**
 * FX Rate from provider
 */
interface FxRate {
  rate: number;
  inverseRate: number;
  source: string;
  timestamp: Date;
  rateId: string;
  midMarketRate?: number;
  margin?: number;
}

/**
 * Immutable FX Snapshot
 */
export interface OrderFxSnapshot {
  id: string;
  orderId: string;
  sourceCurrency: string;
  targetCurrency: string;
  rate: number;
  inverseRate: number;
  rateSource: string;
  rateTimestamp: Date;
  capturedAt: Date;
}

/**
 * FX Audit Trail Entry
 */
export interface OrderFxAuditEntry {
  snapshotId: string;
  capturedAt: Date;
  sourceCurrency: string;
  targetCurrency: string;
  rate: number;
  rateSource: string;
  rateTimestamp: Date;
  metadata: Record<string, unknown>;
}
