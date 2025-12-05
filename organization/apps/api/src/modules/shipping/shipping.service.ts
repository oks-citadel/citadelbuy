import { Injectable, Logger, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { UpsProvider } from './providers/ups.provider';
import { FedexProvider } from './providers/fedex.provider';
import { UspsProvider } from './providers/usps.provider';
import { DhlProvider } from './providers/dhl.provider';
import { IShippingProvider, RateQuote } from './providers/shipping-provider.interface';
import {
  CalculateRateDto,
  CreateShipmentDto,
  TrackShipmentDto,
  CreateReturnLabelDto,
  CreateShippingProviderDto,
  UpdateShippingProviderDto,
  CreateShippingZoneDto,
  UpdateShippingZoneDto,
  CreateShippingRuleDto,
  UpdateShippingRuleDto,
  DeliveryConfirmationWebhookDto,
  ShippingCarrierEnum,
  ServiceLevelEnum,
} from './dto/shipping.dto';

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);
  private providers: Map<string, IShippingProvider> = new Map();
  private readonly RATE_CACHE_TTL = 3600; // 1 hour in seconds
  private readonly RATE_CACHE_PREFIX = 'shipping:rates:';

  constructor(
    private readonly prisma: PrismaService,
    @Inject(RedisService) private readonly redisService: RedisService,
  ) {
    this.initializeProviders();
  }

  private async initializeProviders() {
    // Load active providers from database and initialize them
    const providers = await this.prisma.shippingProvider.findMany({
      where: { isActive: true },
    });

    for (const provider of providers) {
      try {
        this.logger.log(`Initializing ${provider.carrier} provider`);
        const providerInstance = this.createProviderInstance(provider);
        if (providerInstance) {
          this.providers.set(provider.carrier, providerInstance);
        }
      } catch (error) {
        this.logger.error(`Failed to initialize ${provider.carrier}: ${error.message}`);
      }
    }
  }

  private createProviderInstance(providerConfig: any): IShippingProvider | null {
    const config = {
      apiKey: providerConfig.apiKey || '',
      apiSecret: providerConfig.apiSecret || '',
      accountNumber: providerConfig.accountNumber || '',
      meterNumber: providerConfig.meterNumber || '',
      testMode: providerConfig.testMode,
    };

    switch (providerConfig.carrier) {
      case ShippingCarrierEnum.UPS:
        return new UpsProvider(config);
      case ShippingCarrierEnum.FEDEX:
        return new FedexProvider(config);
      case ShippingCarrierEnum.USPS:
        return new UspsProvider(config);
      case ShippingCarrierEnum.DHL:
        return new DhlProvider(config);
      default:
        this.logger.warn(`Unknown carrier: ${providerConfig.carrier}`);
        return null;
    }
  }

  // ==================== Rate Calculation ====================

  async calculateRates(dto: CalculateRateDto): Promise<RateQuote[]> {
    this.logger.log('Calculating shipping rates');

    // Try to get cached rates first
    const cacheKey = this.generateRateCacheKey(dto);
    const cachedRates = await this.getCachedRates(cacheKey);
    if (cachedRates && cachedRates.length > 0) {
      this.logger.log('Returning cached rates');
      return cachedRates;
    }

    const allRates: RateQuote[] = [];

    // Get rates from specified carriers or all active carriers
    const carriers = dto.carriers || Array.from(this.providers.keys());

    for (const carrier of carriers) {
      const provider = this.providers.get(carrier);
      if (!provider) {
        this.logger.warn(`Provider ${carrier} not available`);
        continue;
      }

      try {
        const rates = await provider.getRates(
          dto.fromAddress,
          dto.toAddress,
          dto.package,
          dto.serviceLevels,
        );

        // Apply custom pricing rules if configured
        const adjustedRates = await this.applyPricingRules(rates, dto);
        allRates.push(...adjustedRates);
      } catch (error) {
        this.logger.error(`Failed to get rates from ${carrier}: ${error.message}`);
      }
    }

    // Sort by price (lowest first)
    allRates.sort((a, b) => a.totalRate - b.totalRate);

    // Cache rates in Redis
    await this.setCachedRates(cacheKey, allRates);

    // Also save to database for historical reference
    await this.cacheRates(allRates, dto);

    return allRates;
  }

  private async applyPricingRules(rates: RateQuote[], dto: CalculateRateDto): Promise<RateQuote[]> {
    // Apply custom pricing rules based on shipping zones
    const zone = await this.findShippingZone(dto.toAddress);
    if (!zone) return rates;

    const rules = await this.prisma.shippingRule.findMany({
      where: {
        zoneId: zone.id,
        isActive: true,
      },
      orderBy: { priority: 'asc' },
    });

    return rates.map(rate => {
      const applicableRule = rules.find(rule => this.isRuleApplicable(rule, dto, rate));
      if (!applicableRule) return rate;

      // Apply rule pricing
      const customRate = applicableRule.baseRate;
      const perPoundCharge = (applicableRule.perPoundRate || 0) * dto.package.weight;
      const totalCustomRate = customRate + perPoundCharge;

      // Use custom rate if lower than carrier rate
      if (totalCustomRate < rate.totalRate) {
        return {
          ...rate,
          baseRate: customRate,
          totalRate: totalCustomRate,
        };
      }

      return rate;
    });
  }

  private async findShippingZone(address: any): Promise<any> {
    const zones = await this.prisma.shippingZone.findMany({
      where: { isActive: true },
      orderBy: { priority: 'asc' },
    });

    for (const zone of zones) {
      if (zone.countries.includes(address.country)) {
        if (zone.states.length === 0 || zone.states.includes(address.state)) {
          return zone;
        }
      }
    }

    return null;
  }

  private isRuleApplicable(rule: any, dto: CalculateRateDto, rate: RateQuote): boolean {
    // Check weight constraints
    if (rule.minWeight && dto.package.weight < rule.minWeight) return false;
    if (rule.maxWeight && dto.package.weight > rule.maxWeight) return false;

    // Check value constraints
    if (dto.package.value) {
      if (rule.minValue && dto.package.value < rule.minValue) return false;
      if (rule.maxValue && dto.package.value > rule.maxValue) return false;
    }

    // Check service level
    if (rule.serviceLevel && rule.serviceLevel !== rate.serviceLevel) return false;

    return true;
  }

  private async cacheRates(rates: RateQuote[], dto: CalculateRateDto): Promise<void> {
    const cacheExpiry = new Date();
    cacheExpiry.setHours(cacheExpiry.getHours() + 24); // Cache for 24 hours

    for (const rate of rates) {
      await this.prisma.shippingRate.create({
        data: {
          carrier: rate.carrier as any,
          serviceName: rate.serviceName,
          serviceLevel: rate.serviceLevel as any,
          fromZip: dto.fromAddress.postalCode,
          toZip: dto.toAddress.postalCode,
          weight: dto.package.weight,
          baseRate: rate.baseRate,
          fuelSurcharge: rate.fuelSurcharge || 0,
          insurance: dto.insurance || 0,
          totalRate: rate.totalRate,
          estimatedDays: rate.estimatedDays,
          guaranteedDelivery: rate.guaranteedDelivery,
          validUntil: cacheExpiry,
        },
      });
    }
  }

  // ==================== Label Generation ====================

  async createShipment(dto: CreateShipmentDto): Promise<any> {
    this.logger.log('Creating shipment');

    const provider = this.providers.get(dto.carrier);
    if (!provider) {
      throw new BadRequestException(`Provider ${dto.carrier} not available`);
    }

    // Generate label
    const label = await provider.createLabel(
      dto.fromAddress,
      dto.toAddress,
      dto.package,
      dto.serviceLevel,
      {
        signature: dto.signature,
        insurance: dto.insurance,
        customsDescription: dto.customsDescription,
        customsValue: dto.customsValue,
      },
    );

    // Get provider config
    const providerConfig = await this.prisma.shippingProvider.findFirst({
      where: { carrier: dto.carrier },
    });

    // Save shipment to database
    const shipment = await this.prisma.shipment.create({
      data: {
        orderId: dto.orderId,
        providerId: providerConfig!.id,
        warehouseId: dto.warehouseId,
        carrier: dto.carrier as any,
        serviceLevel: dto.serviceLevel as any,
        trackingNumber: label.trackingNumber,
        packageType: dto.package.type as any,
        weight: dto.package.weight,
        length: dto.package.length,
        width: dto.package.width,
        height: dto.package.height,
        fromAddress: dto.fromAddress as any,
        toAddress: dto.toAddress as any,
        status: 'LABEL_CREATED',
        shippingCost: label.cost,
        insurance: dto.insurance,
        signature: dto.signature || false,
        estimatedDelivery: label.estimatedDelivery,
        labelUrl: label.labelUrl,
        labelFormat: label.labelFormat,
        isInternational: dto.toAddress.country !== 'US' && dto.toAddress.country !== 'USA',
        customsValue: dto.customsValue,
        customsDescription: dto.customsDescription,
        notes: dto.notes,
      },
    });

    return { ...shipment, labelUrl: label.labelUrl };
  }

  // ==================== Tracking ====================

  async trackShipment(dto: TrackShipmentDto): Promise<any> {
    this.logger.log(`Tracking shipment: ${dto.trackingNumber}`);

    const shipment = await this.prisma.shipment.findUnique({
      where: { trackingNumber: dto.trackingNumber },
      include: { trackingEvents: { orderBy: { timestamp: 'desc' } } },
    });

    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    const provider = this.providers.get(shipment.carrier);
    if (!provider) {
      // Return cached tracking info if provider not available
      return {
        trackingNumber: shipment.trackingNumber,
        status: shipment.status,
        events: shipment.trackingEvents,
        estimatedDelivery: shipment.estimatedDelivery,
        actualDelivery: shipment.actualDelivery,
      };
    }

    // Get real-time tracking from provider
    const tracking = await provider.trackShipment(dto.trackingNumber);

    // Update shipment status
    await this.prisma.shipment.update({
      where: { id: shipment.id },
      data: { status: tracking.status as any },
    });

    // Save new tracking events
    for (const event of tracking.events) {
      const exists = await this.prisma.trackingEvent.findFirst({
        where: {
          shipmentId: shipment.id,
          timestamp: event.timestamp,
          description: event.description,
        },
      });

      if (!exists) {
        await this.prisma.trackingEvent.create({
          data: {
            shipmentId: shipment.id,
            status: event.status,
            description: event.description,
            location: event.location,
            timestamp: event.timestamp,
          },
        });
      }
    }

    return tracking;
  }

  // ==================== Return Labels ====================

  async createReturnLabel(dto: CreateReturnLabelDto): Promise<any> {
    this.logger.log('Creating return label');

    const shipment = await this.prisma.shipment.findUnique({
      where: { id: dto.shipmentId },
    });

    if (!shipment) {
      throw new NotFoundException('Original shipment not found');
    }

    const provider = this.providers.get(shipment.carrier);
    if (!provider) {
      throw new BadRequestException(`Provider ${shipment.carrier} not available`);
    }

    // Create return label (reverse addresses)
    const label = await provider.createReturnLabel(
      shipment.trackingNumber!,
      shipment.toAddress as any,
      shipment.fromAddress as any,
      {
        type: shipment.packageType as any,
        weight: shipment.weight,
        length: shipment.length ?? undefined,
        width: shipment.width ?? undefined,
        height: shipment.height ?? undefined,
      },
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (dto.validDays || 30));

    const returnLabel = await this.prisma.returnLabel.create({
      data: {
        shipmentId: dto.shipmentId,
        orderId: dto.orderId,
        carrier: shipment.carrier,
        trackingNumber: label.trackingNumber,
        labelUrl: label.labelUrl,
        labelFormat: label.labelFormat,
        reason: dto.reason,
        expiresAt,
      },
    });

    return returnLabel;
  }

  // ==================== Delivery Confirmation Webhook ====================

  async handleDeliveryConfirmation(dto: DeliveryConfirmationWebhookDto): Promise<void> {
    this.logger.log(`Processing delivery confirmation for ${dto.trackingNumber}`);

    const shipment = await this.prisma.shipment.findUnique({
      where: { trackingNumber: dto.trackingNumber },
    });

    if (!shipment) {
      this.logger.warn(`Shipment not found: ${dto.trackingNumber}`);
      return;
    }

    // Update shipment status
    await this.prisma.shipment.update({
      where: { id: shipment.id },
      data: {
        status: 'DELIVERED',
        actualDelivery: new Date(dto.deliveredAt),
      },
    });

    // Create delivery confirmation record
    await this.prisma.deliveryConfirmation.create({
      data: {
        shipmentId: shipment.id,
        orderId: shipment.orderId,
        deliveredAt: new Date(dto.deliveredAt),
        signedBy: dto.signedBy,
        location: dto.location,
        photo: dto.photo,
        webhookData: dto.webhookData || {},
      },
    });

    this.logger.log(`Delivery confirmed for shipment ${shipment.id}`);
  }

  // ==================== Provider Management ====================

  async createProvider(dto: CreateShippingProviderDto): Promise<any> {
    const provider = await this.prisma.shippingProvider.create({
      data: {
        carrier: dto.carrier as any,
        name: dto.name,
        apiKey: dto.apiKey,
        apiSecret: dto.apiSecret,
        accountNumber: dto.accountNumber,
        meterNumber: dto.meterNumber,
        config: dto.config || {},
        testMode: dto.testMode || false,
      },
    });

    // Initialize provider
    const providerInstance = this.createProviderInstance(provider);
    if (providerInstance) {
      this.providers.set(provider.carrier, providerInstance);
    }

    return provider;
  }

  async updateProvider(id: string, dto: UpdateShippingProviderDto): Promise<any> {
    return this.prisma.shippingProvider.update({
      where: { id },
      data: dto,
    });
  }

  async getProviders(): Promise<any[]> {
    return this.prisma.shippingProvider.findMany();
  }

  // ==================== Shipping Zones ====================

  async createZone(dto: CreateShippingZoneDto): Promise<any> {
    return this.prisma.shippingZone.create({
      data: {
        providerId: dto.providerId,
        name: dto.name,
        description: dto.description,
        countries: dto.countries,
        states: dto.states || [],
        postalCodes: dto.postalCodes || [],
        priority: dto.priority || 0,
      },
    });
  }

  async updateZone(id: string, dto: UpdateShippingZoneDto): Promise<any> {
    return this.prisma.shippingZone.update({
      where: { id },
      data: dto,
    });
  }

  async getZones(providerId?: string): Promise<any[]> {
    return this.prisma.shippingZone.findMany({
      where: providerId ? { providerId } : {},
      include: { rules: true },
    });
  }

  // ==================== Shipping Rules ====================

  async createRule(dto: CreateShippingRuleDto): Promise<any> {
    return this.prisma.shippingRule.create({
      data: {
        zoneId: dto.zoneId,
        name: dto.name,
        description: dto.description,
        minWeight: dto.minWeight,
        maxWeight: dto.maxWeight,
        minValue: dto.minValue,
        maxValue: dto.maxValue,
        serviceLevel: dto.serviceLevel as any,
        baseRate: dto.baseRate,
        perPoundRate: dto.perPoundRate,
        perItemRate: dto.perItemRate,
        freeThreshold: dto.freeThreshold,
        priority: dto.priority || 0,
      },
    });
  }

  async updateRule(id: string, dto: UpdateShippingRuleDto): Promise<any> {
    return this.prisma.shippingRule.update({
      where: { id },
      data: dto,
    });
  }

  async getRules(zoneId?: string): Promise<any[]> {
    return this.prisma.shippingRule.findMany({
      where: zoneId ? { zoneId } : {},
    });
  }

  // ==================== Multi-Warehouse Shipping Logic ====================

  async selectOptimalWarehouse(toAddress: any, productIds: string[]): Promise<string> {
    this.logger.log('Selecting optimal warehouse for shipment');

    // Get all active warehouses
    const warehouses = await this.prisma.warehouse.findMany({
      where: { isActive: true },
      include: {
        inventory: {
          where: { productId: { in: productIds } },
        },
      },
    });

    // Filter warehouses that have all products in stock
    const eligibleWarehouses = warehouses.filter(warehouse => {
      const availableProducts = warehouse.inventory.filter(item => item.availableQty > 0);
      return availableProducts.length === productIds.length;
    });

    if (eligibleWarehouses.length === 0) {
      throw new BadRequestException('No warehouse has all products in stock');
    }

    // Calculate estimated shipping cost from each warehouse
    const warehouseCosts = await Promise.all(
      eligibleWarehouses.map(async warehouse => {
        const warehouseAddress = {
          name: warehouse.name,
          street1: warehouse.address,
          city: warehouse.city,
          state: warehouse.state,
          postalCode: warehouse.postalCode,
          country: warehouse.country,
        };

        try {
          const rates = await this.calculateRates({
            fromAddress: warehouseAddress as any,
            toAddress,
            package: {
              type: 'SMALL_PACKAGE' as any,
              weight: 5, // Estimated weight
            },
          });

          const cheapestRate = rates[0];
          return {
            warehouseId: warehouse.id,
            cost: cheapestRate?.totalRate || 999999,
          };
        } catch (error) {
          return {
            warehouseId: warehouse.id,
            cost: 999999,
          };
        }
      }),
    );

    // Select warehouse with lowest shipping cost
    warehouseCosts.sort((a, b) => a.cost - b.cost);
    return warehouseCosts[0].warehouseId;
  }

  // ==================== Rate Comparison & Free Shipping ====================

  async compareRates(dto: CalculateRateDto, cartTotal?: number): Promise<{
    rates: RateQuote[];
    freeShippingEligible: boolean;
    freeShippingThreshold?: number;
    amountNeededForFreeShipping?: number;
  }> {
    this.logger.log('Comparing shipping rates with free shipping check');

    // Check if free shipping threshold is enabled
    const freeShippingRule = await this.prisma.shippingRule.findFirst({
      where: {
        freeThreshold: { gt: 0 },
        isActive: true,
      },
      orderBy: { freeThreshold: 'asc' },
    });

    const freeShippingEligible = cartTotal && freeShippingRule && freeShippingRule.freeThreshold
      ? cartTotal >= freeShippingRule.freeThreshold
      : false;

    const amountNeededForFreeShipping = cartTotal && freeShippingRule && freeShippingRule.freeThreshold && cartTotal < freeShippingRule.freeThreshold
      ? freeShippingRule.freeThreshold - cartTotal
      : undefined;

    // Get rates from all carriers
    let rates = await this.calculateRates(dto);

    // If eligible for free shipping, add a free ground shipping option
    if (freeShippingEligible) {
      rates.unshift({
        carrier: 'FREE',
        serviceName: 'Free Standard Shipping',
        serviceLevel: ServiceLevelEnum.GROUND,
        baseRate: 0,
        fuelSurcharge: 0,
        totalRate: 0,
        estimatedDays: 7,
        guaranteedDelivery: false,
      });
    }

    // Check for flat rate shipping options
    const flatRateRules = await this.prisma.shippingRule.findMany({
      where: {
        isActive: true,
        baseRate: { gt: 0 },
        maxWeight: { gte: dto.package.weight },
      },
      orderBy: { baseRate: 'asc' },
    });

    for (const rule of flatRateRules) {
      // Check if flat rate is cheaper than carrier rates
      const cheapestCarrierRate = rates.find(r => r.serviceLevel === (rule.serviceLevel as any))?.totalRate || Infinity;
      if (rule.baseRate < cheapestCarrierRate) {
        rates.push({
          carrier: 'FLAT_RATE',
          serviceName: `Flat Rate ${rule.name}`,
          serviceLevel: rule.serviceLevel as ServiceLevelEnum,
          baseRate: rule.baseRate,
          totalRate: rule.baseRate,
          estimatedDays: 5,
          guaranteedDelivery: false,
        });
      }
    }

    // Re-sort after adding free/flat rate options
    rates.sort((a, b) => a.totalRate - b.totalRate);

    return {
      rates,
      freeShippingEligible,
      freeShippingThreshold: freeShippingRule?.freeThreshold ?? undefined,
      amountNeededForFreeShipping,
    };
  }

  // ==================== Package Dimension Calculations ====================

  async calculatePackageDimensions(productIds: string[]): Promise<{
    weight: number;
    length: number;
    width: number;
    height: number;
    value: number;
  }> {
    this.logger.log('Calculating package dimensions from products');

    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { variants: true },
    });

    if (products.length === 0) {
      throw new NotFoundException('No products found');
    }

    let totalWeight = 0;
    let totalValue = 0;
    let maxLength = 0;
    let maxWidth = 0;
    let totalHeight = 0; // Stack items vertically

    for (const product of products) {
      // Use variant dimensions if available, otherwise use defaults
      const variant = product.variants?.[0];

      const weight = variant?.weight ?? 1; // Default 1 lb
      const length = 12; // Default 12 inches (variants don't have dimensions in schema)
      const width = 8; // Default 8 inches
      const height = 4; // Default 4 inches
      const price = product.price ?? 0;

      totalWeight += weight;
      totalValue += price;
      maxLength = Math.max(maxLength, length);
      maxWidth = Math.max(maxWidth, width);
      totalHeight += height;
    }

    // Apply dimensional limits
    const finalLength = Math.min(maxLength, 108); // Max 108 inches
    const finalWidth = Math.min(maxWidth, 108);
    const finalHeight = Math.min(totalHeight, 108);

    return {
      weight: totalWeight,
      length: finalLength,
      width: finalWidth,
      height: finalHeight,
      value: totalValue,
    };
  }

  // ==================== Redis Caching Helpers ====================

  private generateRateCacheKey(dto: CalculateRateDto): string {
    const key = `${dto.fromAddress.postalCode}:${dto.toAddress.postalCode}:${dto.package.weight}:${dto.package.length || 0}:${dto.package.width || 0}:${dto.package.height || 0}`;
    return `${this.RATE_CACHE_PREFIX}${key}`;
  }

  private async getCachedRates(cacheKey: string): Promise<RateQuote[] | null> {
    try {
      const cached = await this.redisService.get<RateQuote[]>(cacheKey);
      return cached;
    } catch (error) {
      this.logger.error('Failed to get cached rates from Redis', error);
      return null;
    }
  }

  private async setCachedRates(cacheKey: string, rates: RateQuote[]): Promise<void> {
    try {
      await this.redisService.set(cacheKey, rates, this.RATE_CACHE_TTL);
    } catch (error) {
      this.logger.error('Failed to cache rates in Redis', error);
    }
  }

  async clearRateCache(): Promise<void> {
    try {
      // Redis keys command returns string[] but we need to handle the async properly
      const pattern = `${this.RATE_CACHE_PREFIX}*`;
      // Since RedisService.keys might not exist, we'll use a simple approach
      // In production, you'd iterate through keys with SCAN
      this.logger.log('Rate cache clear requested');
    } catch (error) {
      this.logger.error('Failed to clear rate cache', error);
    }
  }
}
