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
export class FedexProvider implements IShippingProvider {
  private readonly logger = new Logger(FedexProvider.name);
  private apiKey: string;
  private apiSecret: string;
  private accountNumber: string;
  private meterNumber: string;
  private testMode: boolean;

  constructor(config: {
    apiKey: string;
    apiSecret: string;
    accountNumber: string;
    meterNumber: string;
    testMode?: boolean;
  }) {
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.accountNumber = config.accountNumber;
    this.meterNumber = config.meterNumber;
    this.testMode = config.testMode || false;
  }

  async getRates(
    fromAddress: AddressDto,
    toAddress: AddressDto,
    packageInfo: PackageDto,
    serviceLevels?: ServiceLevelEnum[],
  ): Promise<RateQuote[]> {
    this.logger.log('Getting FedEx rates');

    const baseRate = this.calculateBaseRate(packageInfo);
    const rates: RateQuote[] = [];

    if (!serviceLevels || serviceLevels.includes(ServiceLevelEnum.GROUND)) {
      rates.push({
        carrier: 'FEDEX',
        serviceName: 'FedEx Ground',
        serviceLevel: ServiceLevelEnum.GROUND,
        baseRate,
        fuelSurcharge: baseRate * 0.09,
        totalRate: baseRate * 1.09,
        estimatedDays: 4,
        guaranteedDelivery: false,
      });
    }

    if (!serviceLevels || serviceLevels.includes(ServiceLevelEnum.TWO_DAY)) {
      rates.push({
        carrier: 'FEDEX',
        serviceName: 'FedEx 2Day',
        serviceLevel: ServiceLevelEnum.TWO_DAY,
        baseRate: baseRate * 1.6,
        fuelSurcharge: baseRate * 1.6 * 0.09,
        totalRate: baseRate * 1.6 * 1.09,
        estimatedDays: 2,
        guaranteedDelivery: true,
      });
    }

    if (!serviceLevels || serviceLevels.includes(ServiceLevelEnum.NEXT_DAY)) {
      rates.push({
        carrier: 'FEDEX',
        serviceName: 'FedEx Priority Overnight',
        serviceLevel: ServiceLevelEnum.NEXT_DAY,
        baseRate: baseRate * 2.8,
        fuelSurcharge: baseRate * 2.8 * 0.09,
        totalRate: baseRate * 2.8 * 1.09,
        estimatedDays: 1,
        guaranteedDelivery: true,
      });
    }

    if (!serviceLevels || serviceLevels.includes(ServiceLevelEnum.INTERNATIONAL)) {
      if (toAddress.country !== 'US' && toAddress.country !== 'USA') {
        rates.push({
          carrier: 'FEDEX',
          serviceName: 'FedEx International Priority',
          serviceLevel: ServiceLevelEnum.INTERNATIONAL,
          baseRate: baseRate * 3.5,
          fuelSurcharge: baseRate * 3.5 * 0.12,
          totalRate: baseRate * 3.5 * 1.12,
          estimatedDays: 4,
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
    this.logger.log('Creating FedEx shipping label');

    const trackingNumber = this.generateTrackingNumber();
    const rates = await this.getRates(fromAddress, toAddress, packageInfo, [serviceLevel]);
    const rate = rates[0];

    let cost = rate.totalRate;
    if (options?.insurance) cost += options.insurance * 0.01;
    if (options?.signature) cost += 4.50;

    return {
      trackingNumber,
      labelUrl: `https://fedex.com/labels/${trackingNumber}.pdf`,
      labelFormat: 'PDF',
      estimatedDelivery: new Date(Date.now() + (rate.estimatedDays || 5) * 24 * 60 * 60 * 1000),
      cost,
    };
  }

  async trackShipment(trackingNumber: string): Promise<TrackingInfo> {
    this.logger.log(`Tracking FedEx shipment: ${trackingNumber}`);

    return {
      trackingNumber,
      status: 'IN_TRANSIT',
      events: [
        {
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          status: 'PICKED_UP',
          description: 'Picked up',
          location: 'Origin',
        },
        {
          timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          status: 'IN_TRANSIT',
          description: 'In transit',
          location: 'Memphis, TN',
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
    this.logger.log(`Cancelling FedEx shipment: ${trackingNumber}`);
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
    return Math.max(packageInfo.weight * 2.30, 9.50);
  }

  private generateTrackingNumber(): string {
    return Math.random().toString(10).substring(2, 14);
  }
}
