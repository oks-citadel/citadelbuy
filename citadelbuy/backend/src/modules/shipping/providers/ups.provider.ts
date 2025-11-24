import { Injectable, Logger } from '@nestjs/common';
import {
  IShippingProvider,
  RateQuote,
  ShipmentLabel,
  TrackingInfo,
  TrackingEventInfo,
} from './shipping-provider.interface';
import { PackageDto, AddressDto, ServiceLevelEnum } from '../dto/shipping.dto';

@Injectable()
export class UpsProvider implements IShippingProvider {
  private readonly logger = new Logger(UpsProvider.name);
  private apiKey: string;
  private apiSecret: string;
  private accountNumber: string;
  private testMode: boolean;

  constructor(config: {
    apiKey: string;
    apiSecret: string;
    accountNumber: string;
    testMode?: boolean;
  }) {
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.accountNumber = config.accountNumber;
    this.testMode = config.testMode || false;
  }

  async getRates(
    fromAddress: AddressDto,
    toAddress: AddressDto,
    packageInfo: PackageDto,
    serviceLevels?: ServiceLevelEnum[],
  ): Promise<RateQuote[]> {
    this.logger.log('Getting UPS rates');

    // In production, this would call the actual UPS API
    // For now, return mock rates based on package weight and service level

    const baseRate = this.calculateBaseRate(fromAddress, toAddress, packageInfo);
    const fuelSurcharge = baseRate * 0.10; // 10% fuel surcharge

    const rates: RateQuote[] = [];

    // Ground Service
    if (!serviceLevels || serviceLevels.includes(ServiceLevelEnum.GROUND)) {
      rates.push({
        carrier: 'UPS',
        serviceName: 'UPS Ground',
        serviceLevel: ServiceLevelEnum.GROUND,
        baseRate,
        fuelSurcharge,
        totalRate: baseRate + fuelSurcharge,
        estimatedDays: this.estimateDeliveryDays(fromAddress, toAddress, ServiceLevelEnum.GROUND),
        guaranteedDelivery: false,
      });
    }

    // 2-Day Air
    if (!serviceLevels || serviceLevels.includes(ServiceLevelEnum.TWO_DAY)) {
      rates.push({
        carrier: 'UPS',
        serviceName: 'UPS 2nd Day Air',
        serviceLevel: ServiceLevelEnum.TWO_DAY,
        baseRate: baseRate * 1.5,
        fuelSurcharge: baseRate * 1.5 * 0.10,
        totalRate: baseRate * 1.5 * 1.10,
        estimatedDays: 2,
        guaranteedDelivery: true,
      });
    }

    // Next Day Air
    if (!serviceLevels || serviceLevels.includes(ServiceLevelEnum.NEXT_DAY)) {
      rates.push({
        carrier: 'UPS',
        serviceName: 'UPS Next Day Air',
        serviceLevel: ServiceLevelEnum.NEXT_DAY,
        baseRate: baseRate * 2.5,
        fuelSurcharge: baseRate * 2.5 * 0.10,
        totalRate: baseRate * 2.5 * 1.10,
        estimatedDays: 1,
        guaranteedDelivery: true,
      });
    }

    // International
    if (!serviceLevels || serviceLevels.includes(ServiceLevelEnum.INTERNATIONAL)) {
      if (toAddress.country !== 'US' && toAddress.country !== 'USA') {
        rates.push({
          carrier: 'UPS',
          serviceName: 'UPS Worldwide Express',
          serviceLevel: ServiceLevelEnum.INTERNATIONAL,
          baseRate: baseRate * 3.0,
          fuelSurcharge: baseRate * 3.0 * 0.15,
          totalRate: baseRate * 3.0 * 1.15,
          estimatedDays: 5,
          guaranteedDelivery: false,
        });
      }
    }

    return rates;
  }

  async createLabel(
    fromAddress: AddressDto,
    toAddress: AddressDto,
    packageInfo: PackageDto,
    serviceLevel: ServiceLevelEnum,
    options?: {
      signature?: boolean;
      insurance?: number;
      customsDescription?: string;
      customsValue?: number;
    },
  ): Promise<ShipmentLabel> {
    this.logger.log('Creating UPS shipping label');

    // In production, this would call the actual UPS API
    // For now, return a mock label

    const trackingNumber = this.generateTrackingNumber();
    const rates = await this.getRates(fromAddress, toAddress, packageInfo, [serviceLevel]);
    const rate = rates[0];

    let cost = rate.totalRate;
    if (options?.insurance) {
      cost += options.insurance * 0.01; // 1% of insured value
    }
    if (options?.signature) {
      cost += 5.00; // $5 signature fee
    }

    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + (rate.estimatedDays || 5));

    return {
      trackingNumber,
      labelUrl: `https://ups.com/labels/${trackingNumber}.pdf`,
      labelFormat: 'PDF',
      estimatedDelivery,
      cost,
    };
  }

  async trackShipment(trackingNumber: string): Promise<TrackingInfo> {
    this.logger.log(`Tracking UPS shipment: ${trackingNumber}`);

    // In production, this would call the actual UPS API
    // For now, return mock tracking info

    const events: TrackingEventInfo[] = [
      {
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        status: 'LABEL_CREATED',
        description: 'Shipment information received',
        location: 'Origin facility',
      },
      {
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        status: 'PICKED_UP',
        description: 'Package picked up',
        location: 'Origin facility',
      },
      {
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        status: 'IN_TRANSIT',
        description: 'In transit',
        location: 'Sorting facility',
      },
      {
        timestamp: new Date(),
        status: 'OUT_FOR_DELIVERY',
        description: 'Out for delivery',
        location: 'Local facility',
      },
    ];

    return {
      trackingNumber,
      status: 'OUT_FOR_DELIVERY',
      events,
      estimatedDelivery: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
    };
  }

  async createReturnLabel(
    originalTrackingNumber: string,
    fromAddress: AddressDto,
    toAddress: AddressDto,
    packageInfo: PackageDto,
  ): Promise<ShipmentLabel> {
    this.logger.log('Creating UPS return label');

    // Return labels are typically reverse of original shipment
    return this.createLabel(fromAddress, toAddress, packageInfo, ServiceLevelEnum.GROUND);
  }

  async cancelShipment(trackingNumber: string): Promise<boolean> {
    this.logger.log(`Cancelling UPS shipment: ${trackingNumber}`);

    // In production, this would call the actual UPS API
    return true;
  }

  async validateAddress(address: AddressDto): Promise<{
    valid: boolean;
    suggestedAddress?: AddressDto;
    errors?: string[];
  }> {
    this.logger.log('Validating address with UPS');

    // In production, this would call the actual UPS Address Validation API
    // For now, perform basic validation

    const errors: string[] = [];

    if (!address.street1) errors.push('Street address is required');
    if (!address.city) errors.push('City is required');
    if (!address.state) errors.push('State is required');
    if (!address.postalCode) errors.push('Postal code is required');
    if (!address.country) errors.push('Country is required');

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  private calculateBaseRate(
    fromAddress: AddressDto,
    toAddress: AddressDto,
    packageInfo: PackageDto,
  ): number {
    // Simple rate calculation based on weight
    // In production, this would use UPS's actual rating engine
    const baseRatePerPound = 2.50;
    const minimumCharge = 10.00;

    const rate = packageInfo.weight * baseRatePerPound;
    return Math.max(rate, minimumCharge);
  }

  private estimateDeliveryDays(
    fromAddress: AddressDto,
    toAddress: AddressDto,
    serviceLevel: ServiceLevelEnum,
  ): number {
    // Simple estimation
    // In production, use UPS Time in Transit API
    const sameState = fromAddress.state === toAddress.state;

    switch (serviceLevel) {
      case ServiceLevelEnum.GROUND:
        return sameState ? 3 : 5;
      case ServiceLevelEnum.TWO_DAY:
        return 2;
      case ServiceLevelEnum.NEXT_DAY:
        return 1;
      case ServiceLevelEnum.INTERNATIONAL:
        return 7;
      default:
        return 5;
    }
  }

  private generateTrackingNumber(): string {
    // UPS tracking numbers are typically 18 characters starting with "1Z"
    const prefix = '1Z';
    const random = Math.random().toString(36).substring(2, 18).toUpperCase();
    return prefix + random;
  }
}
