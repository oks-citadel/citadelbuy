import { Injectable, Logger } from '@nestjs/common';
import {
  IShippingProvider,
  RateQuote,
  ShipmentLabel,
  TrackingInfo,
} from './shipping-provider.interface';
import { PackageDto, AddressDto, ServiceLevelEnum } from '../dto/shipping.dto';

@Injectable()
export class UspsProvider implements IShippingProvider {
  private readonly logger = new Logger(UspsProvider.name);
  private apiKey: string;
  private accountNumber: string;
  private testMode: boolean;

  constructor(config: {
    apiKey: string;
    accountNumber: string;
    testMode?: boolean;
  }) {
    this.apiKey = config.apiKey;
    this.accountNumber = config.accountNumber;
    this.testMode = config.testMode || false;
  }

  async getRates(
    fromAddress: AddressDto,
    toAddress: AddressDto,
    packageInfo: PackageDto,
    serviceLevels?: ServiceLevelEnum[],
  ): Promise<RateQuote[]> {
    this.logger.log('Getting USPS rates');

    const baseRate = this.calculateBaseRate(packageInfo);
    const rates: RateQuote[] = [];

    if (!serviceLevels || serviceLevels.includes(ServiceLevelEnum.GROUND)) {
      rates.push({
        carrier: 'USPS',
        serviceName: 'USPS Priority Mail',
        serviceLevel: ServiceLevelEnum.GROUND,
        baseRate,
        totalRate: baseRate,
        estimatedDays: 3,
        guaranteedDelivery: false,
      });

      // First Class for lighter packages
      if (packageInfo.weight <= 13) {
        rates.push({
          carrier: 'USPS',
          serviceName: 'USPS First Class',
          serviceLevel: ServiceLevelEnum.GROUND,
          baseRate: baseRate * 0.6,
          totalRate: baseRate * 0.6,
          estimatedDays: 5,
          guaranteedDelivery: false,
        });
      }
    }

    if (!serviceLevels || serviceLevels.includes(ServiceLevelEnum.TWO_DAY)) {
      rates.push({
        carrier: 'USPS',
        serviceName: 'USPS Priority Mail Express',
        serviceLevel: ServiceLevelEnum.TWO_DAY,
        baseRate: baseRate * 1.8,
        totalRate: baseRate * 1.8,
        estimatedDays: 2,
        guaranteedDelivery: true,
      });
    }

    if (!serviceLevels || serviceLevels.includes(ServiceLevelEnum.INTERNATIONAL)) {
      if (toAddress.country !== 'US' && toAddress.country !== 'USA') {
        rates.push({
          carrier: 'USPS',
          serviceName: 'USPS Priority Mail International',
          serviceLevel: ServiceLevelEnum.INTERNATIONAL,
          baseRate: baseRate * 2.5,
          totalRate: baseRate * 2.5,
          estimatedDays: 10,
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
    options?: any,
  ): Promise<ShipmentLabel> {
    this.logger.log('Creating USPS shipping label');

    const trackingNumber = this.generateTrackingNumber();
    const rates = await this.getRates(fromAddress, toAddress, packageInfo, [serviceLevel]);
    const rate = rates[0];

    let cost = rate.totalRate;
    if (options?.insurance) cost += options.insurance * 0.015;
    if (options?.signature) cost += 3.00;

    return {
      trackingNumber,
      labelUrl: `https://usps.com/labels/${trackingNumber}.pdf`,
      labelFormat: 'PDF',
      estimatedDelivery: new Date(Date.now() + (rate.estimatedDays || 5) * 24 * 60 * 60 * 1000),
      cost,
    };
  }

  async trackShipment(trackingNumber: string): Promise<TrackingInfo> {
    this.logger.log(`Tracking USPS shipment: ${trackingNumber}`);

    return {
      trackingNumber,
      status: 'IN_TRANSIT',
      events: [
        {
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          status: 'LABEL_CREATED',
          description: 'Shipping label created',
          location: 'Origin Post Office',
        },
        {
          timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          status: 'IN_TRANSIT',
          description: 'In transit',
          location: 'Regional facility',
        },
      ],
      estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    };
  }

  async createReturnLabel(
    originalTrackingNumber: string,
    fromAddress: AddressDto,
    toAddress: AddressDto,
    packageInfo: PackageDto,
  ): Promise<ShipmentLabel> {
    return this.createLabel(fromAddress, toAddress, packageInfo, ServiceLevelEnum.GROUND);
  }

  async cancelShipment(trackingNumber: string): Promise<boolean> {
    this.logger.log(`Cancelling USPS shipment: ${trackingNumber}`);
    return true;
  }

  async validateAddress(address: AddressDto): Promise<{
    valid: boolean;
    suggestedAddress?: AddressDto;
    errors?: string[];
  }> {
    const errors: string[] = [];
    if (!address.street1) errors.push('Street address required');
    if (!address.city) errors.push('City required');
    if (!address.state) errors.push('State required');
    if (!address.postalCode) errors.push('Postal code required');

    return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
  }

  private calculateBaseRate(packageInfo: PackageDto): number {
    // USPS typically cheaper for lighter packages
    return Math.max(packageInfo.weight * 1.80, 7.50);
  }

  private generateTrackingNumber(): string {
    // USPS tracking numbers are typically 20-22 digits
    return '94' + Math.random().toString(10).substring(2, 22);
  }
}
