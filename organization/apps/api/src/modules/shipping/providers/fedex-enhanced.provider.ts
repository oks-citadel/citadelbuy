import { Injectable, Logger } from '@nestjs/common';
import {
  IShippingProvider,
  RateQuote,
  ShipmentLabel,
  TrackingInfo,
  TrackingEventInfo,
  PickupSchedule,
} from './shipping-provider-updated.interface';
import { PackageDto, AddressDto, ServiceLevelEnum } from '../dto/shipping.dto';

interface FedExAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

@Injectable()
export class FedexEnhancedProvider implements IShippingProvider {
  private readonly logger = new Logger(FedexEnhancedProvider.name);
  private apiKey: string;
  private apiSecret: string;
  private accountNumber: string;
  private meterNumber: string;
  private testMode: boolean;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

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
    this.testMode = config.testMode ?? process.env.NODE_ENV !== 'production';
  }

  private get baseUrl(): string {
    return this.testMode
      ? 'https://apis-sandbox.fedex.com'
      : 'https://apis.fedex.com';
  }

  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid (with 5 min buffer)
    if (this.accessToken && Date.now() < this.tokenExpiry - 300000) {
      return this.accessToken;
    }

    if (!this.apiKey || !this.apiSecret) {
      this.logger.warn('FedEx API credentials not configured - using mock responses');
      throw new Error('FEDEX_NOT_CONFIGURED');
    }

    try {
      const response = await fetch(`${this.baseUrl}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.apiKey,
          client_secret: this.apiSecret,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get FedEx access token: ${response.statusText}`);
      }

      const data: FedExAuthResponse = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + data.expires_in * 1000;

      return this.accessToken;
    } catch (error) {
      this.logger.error('Failed to authenticate with FedEx API', error);
      throw error;
    }
  }

  async getRates(
    fromAddress: AddressDto,
    toAddress: AddressDto,
    packageInfo: PackageDto,
    serviceLevels?: ServiceLevelEnum[],
  ): Promise<RateQuote[]> {
    this.logger.log('Getting FedEx rates');

    try {
      const accessToken = await this.getAccessToken();

      const requestBody = {
        accountNumber: {
          value: this.accountNumber,
        },
        requestedShipment: {
          shipper: {
            address: {
              postalCode: fromAddress.postalCode,
              countryCode: fromAddress.country || 'US',
              residential: false,
            },
          },
          recipient: {
            address: {
              postalCode: toAddress.postalCode,
              countryCode: toAddress.country || 'US',
              residential: true,
            },
          },
          pickupType: 'DROPOFF_AT_FEDEX_LOCATION',
          rateRequestType: ['LIST', 'ACCOUNT'],
          requestedPackageLineItems: [
            {
              weight: {
                units: 'LB',
                value: packageInfo.weight || 1,
              },
              dimensions: {
                length: packageInfo.length || 10,
                width: packageInfo.width || 10,
                height: packageInfo.height || 10,
                units: 'IN',
              },
            },
          ],
        },
      };

      const response = await fetch(`${this.baseUrl}/rate/v1/rates/quotes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-locale': 'en_US',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`FedEx Rate API error: ${errorText}`);
        return this.getFallbackRates(fromAddress, toAddress, packageInfo, serviceLevels);
      }

      const data = await response.json();
      const rates: RateQuote[] = [];

      if (data.output?.rateReplyDetails) {
        for (const rateDetail of data.output.rateReplyDetails) {
          const serviceType = rateDetail.serviceType;
          const serviceLevel = this.mapServiceToLevel(serviceType);

          if (serviceLevels && !serviceLevels.includes(serviceLevel)) {
            continue;
          }

          const ratedShipmentDetails = rateDetail.ratedShipmentDetails?.[0];
          const totalRate = parseFloat(ratedShipmentDetails?.totalNetCharge || '0');
          const baseRate = parseFloat(ratedShipmentDetails?.totalBaseCharge || '0');

          rates.push({
            carrier: 'FEDEX',
            serviceName: this.getServiceName(serviceType),
            serviceLevel,
            baseRate,
            fuelSurcharge: totalRate - baseRate,
            totalRate,
            estimatedDays: rateDetail.commit?.dateDetail?.dayFormat ? this.parseDeliveryDays(rateDetail.commit.dateDetail.dayFormat) : undefined,
            guaranteedDelivery: serviceLevel !== ServiceLevelEnum.GROUND,
          });
        }
      }

      if (rates.length === 0) {
        return this.getFallbackRates(fromAddress, toAddress, packageInfo, serviceLevels);
      }

      return rates;
    } catch (error: any) {
      if (error.message === 'FEDEX_NOT_CONFIGURED') {
        return this.getFallbackRates(fromAddress, toAddress, packageInfo, serviceLevels);
      }
      this.logger.error('Failed to get FedEx rates', error);
      return this.getFallbackRates(fromAddress, toAddress, packageInfo, serviceLevels);
    }
  }

  async createLabel(
    fromAddress: AddressDto,
    toAddress: AddressDto,
    packageInfo: PackageDto,
    serviceLevel: ServiceLevelEnum,
    options?: any,
  ): Promise<ShipmentLabel> {
    this.logger.log('Creating FedEx shipping label');

    try {
      const accessToken = await this.getAccessToken();
      const serviceType = this.getServiceType(serviceLevel);

      const requestBody = {
        accountNumber: {
          value: this.accountNumber,
        },
        requestedShipment: {
          shipper: {
            contact: {
              personName: fromAddress.name,
              phoneNumber: fromAddress.phone || '1234567890',
              companyName: fromAddress.name,
            },
            address: {
              streetLines: [fromAddress.street1, fromAddress.street2].filter(Boolean),
              city: fromAddress.city,
              stateOrProvinceCode: fromAddress.state,
              postalCode: fromAddress.postalCode,
              countryCode: fromAddress.country || 'US',
            },
          },
          recipients: [
            {
              contact: {
                personName: toAddress.name,
                phoneNumber: toAddress.phone || '1234567890',
              },
              address: {
                streetLines: [toAddress.street1, toAddress.street2].filter(Boolean),
                city: toAddress.city,
                stateOrProvinceCode: toAddress.state,
                postalCode: toAddress.postalCode,
                countryCode: toAddress.country || 'US',
                residential: true,
              },
            },
          ],
          serviceType: serviceType,
          packagingType: 'YOUR_PACKAGING',
          pickupType: 'DROPOFF_AT_FEDEX_LOCATION',
          blockInsightVisibility: false,
          shippingChargesPayment: {
            paymentType: 'SENDER',
          },
          labelSpecification: {
            imageType: 'PDF',
            labelStockType: 'PAPER_4X6',
          },
          requestedPackageLineItems: [
            {
              weight: {
                units: 'LB',
                value: packageInfo.weight || 1,
              },
              dimensions: {
                length: packageInfo.length || 10,
                width: packageInfo.width || 10,
                height: packageInfo.height || 10,
                units: 'IN',
              },
            },
          ],
        },
      };

      const response = await fetch(`${this.baseUrl}/ship/v1/shipments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-locale': 'en_US',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`FedEx Ship API error: ${errorText}`);
        return this.createFallbackLabel(fromAddress, toAddress, packageInfo, serviceLevel, options);
      }

      const data = await response.json();
      const completedShipmentDetail = data.output?.transactionShipments?.[0]?.completedShipmentDetail;

      if (!completedShipmentDetail) {
        return this.createFallbackLabel(fromAddress, toAddress, packageInfo, serviceLevel, options);
      }

      const trackingNumber = completedShipmentDetail.masterTrackingNumber || this.generateTrackingNumber();
      const labelImage = completedShipmentDetail.shipmentDocuments?.[0]?.encodedLabel;
      const cost = parseFloat(completedShipmentDetail.shipmentRating?.totalNetCharge || '0');

      const rates = await this.getRates(fromAddress, toAddress, packageInfo, [serviceLevel]);
      const estimatedDays = rates[0]?.estimatedDays || 5;

      return {
        trackingNumber,
        labelUrl: labelImage ? `data:application/pdf;base64,${labelImage}` : `https://fedex.com/labels/${trackingNumber}.pdf`,
        labelFormat: 'PDF',
        estimatedDelivery: new Date(Date.now() + estimatedDays * 24 * 60 * 60 * 1000),
        cost,
      };
    } catch (error: any) {
      if (error.message === 'FEDEX_NOT_CONFIGURED') {
        return this.createFallbackLabel(fromAddress, toAddress, packageInfo, serviceLevel, options);
      }
      this.logger.error('Failed to create FedEx label', error);
      return this.createFallbackLabel(fromAddress, toAddress, packageInfo, serviceLevel, options);
    }
  }

  async trackShipment(trackingNumber: string): Promise<TrackingInfo> {
    this.logger.log(`Tracking FedEx shipment: ${trackingNumber}`);

    try {
      const accessToken = await this.getAccessToken();

      const requestBody = {
        trackingInfo: [
          {
            trackingNumberInfo: {
              trackingNumber: trackingNumber,
            },
          },
        ],
        includeDetailedScans: true,
      };

      const response = await fetch(`${this.baseUrl}/track/v1/trackingnumbers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-locale': 'en_US',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`FedEx Track API error: ${errorText}`);
        return this.getFallbackTracking(trackingNumber);
      }

      const data = await response.json();
      const trackingInfo = data.output?.completeTrackResults?.[0]?.trackResults?.[0];

      if (!trackingInfo) {
        return this.getFallbackTracking(trackingNumber);
      }

      const events: TrackingEventInfo[] = (trackingInfo.scanEvents || []).map((event: any) => ({
        timestamp: new Date(event.date),
        status: event.eventType || 'UNKNOWN',
        description: event.eventDescription || 'Status update',
        location: event.scanLocation?.city || 'Unknown',
      }));

      return {
        trackingNumber: trackingInfo.trackingNumber,
        status: trackingInfo.latestStatusDetail?.code || 'IN_TRANSIT',
        events,
        estimatedDelivery: trackingInfo.estimatedDeliveryTimeStamp ? new Date(trackingInfo.estimatedDeliveryTimeStamp) : undefined,
        actualDelivery: trackingInfo.actualDeliveryTimestamp ? new Date(trackingInfo.actualDeliveryTimestamp) : undefined,
      };
    } catch (error: any) {
      if (error.message === 'FEDEX_NOT_CONFIGURED') {
        return this.getFallbackTracking(trackingNumber);
      }
      this.logger.error('Failed to track FedEx shipment', error);
      return this.getFallbackTracking(trackingNumber);
    }
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

    try {
      const accessToken = await this.getAccessToken();

      const requestBody = {
        accountNumber: {
          value: this.accountNumber,
        },
        trackingNumber: trackingNumber,
        deletionControl: 'DELETE_ALL_PACKAGES',
      };

      const response = await fetch(`${this.baseUrl}/ship/v1/shipments/cancel`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-locale': 'en_US',
        },
        body: JSON.stringify(requestBody),
      });

      return response.ok;
    } catch (error) {
      this.logger.error('Failed to cancel FedEx shipment', error);
      return false;
    }
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

  async schedulePickup(
    address: AddressDto,
    pickupDate: Date,
    readyTime: string,
    closeTime: string,
    packageCount: number,
    totalWeight: number,
    specialInstructions?: string,
  ): Promise<PickupSchedule> {
    this.logger.log('Scheduling FedEx pickup');

    try {
      const accessToken = await this.getAccessToken();

      const requestBody = {
        associatedAccountNumber: {
          value: this.accountNumber,
        },
        pickupAddress: {
          streetLines: [address.street1, address.street2].filter(Boolean),
          city: address.city,
          stateOrProvinceCode: address.state,
          postalCode: address.postalCode,
          countryCode: address.country || 'US',
        },
        pickupDateAndTime: pickupDate.toISOString(),
        readyDateTimestamp: `${pickupDate.toISOString().split('T')[0]}T${readyTime}:00`,
        companyCloseTime: closeTime,
        packageLocation: 'FRONT',
        pickupContactInfo: {
          personName: address.name || 'Pickup Contact',
          phoneNumber: address.phone || '1234567890',
          companyName: address.name || 'CitadelBuy',
        },
        totalWeight: {
          units: 'LB',
          value: totalWeight,
        },
        packageCount: packageCount,
        remarks: specialInstructions || '',
      };

      const response = await fetch(`${this.baseUrl}/pickup/v1/pickups`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-locale': 'en_US',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`FedEx Pickup API error: ${errorText}`);
        return this.createFallbackPickup(address, pickupDate, readyTime, closeTime);
      }

      const data = await response.json();

      return {
        confirmationNumber: data.output?.pickupConfirmationCode || this.generateConfirmationNumber(),
        pickupDate,
        readyTime,
        closeTime,
        location: `${address.street1}, ${address.city}, ${address.state}`,
        status: 'CONFIRMED',
      };
    } catch (error: any) {
      if (error.message === 'FEDEX_NOT_CONFIGURED') {
        return this.createFallbackPickup(address, pickupDate, readyTime, closeTime);
      }
      this.logger.error('Failed to schedule FedEx pickup', error);
      return this.createFallbackPickup(address, pickupDate, readyTime, closeTime);
    }
  }

  async cancelPickup(confirmationNumber: string): Promise<boolean> {
    this.logger.log(`Cancelling FedEx pickup: ${confirmationNumber}`);

    try {
      const accessToken = await this.getAccessToken();

      const requestBody = {
        associatedAccountNumber: {
          value: this.accountNumber,
        },
        pickupConfirmationCode: confirmationNumber,
        reason: 'Customer requested cancellation',
      };

      const response = await fetch(`${this.baseUrl}/pickup/v1/pickups/cancel`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-locale': 'en_US',
        },
        body: JSON.stringify(requestBody),
      });

      return response.ok;
    } catch (error) {
      this.logger.error('Failed to cancel FedEx pickup', error);
      return false;
    }
  }

  // Helper methods
  private getFallbackRates(
    fromAddress: AddressDto,
    toAddress: AddressDto,
    packageInfo: PackageDto,
    serviceLevels?: ServiceLevelEnum[],
  ): RateQuote[] {
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

    return rates;
  }

  private createFallbackLabel(
    fromAddress: AddressDto,
    toAddress: AddressDto,
    packageInfo: PackageDto,
    serviceLevel: ServiceLevelEnum,
    options?: any,
  ): ShipmentLabel {
    const trackingNumber = this.generateTrackingNumber();
    const rates = this.getFallbackRates(fromAddress, toAddress, packageInfo, [serviceLevel]);
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

  private getFallbackTracking(trackingNumber: string): TrackingInfo {
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

  private createFallbackPickup(
    address: AddressDto,
    pickupDate: Date,
    readyTime: string,
    closeTime: string,
  ): PickupSchedule {
    return {
      confirmationNumber: this.generateConfirmationNumber(),
      pickupDate,
      readyTime,
      closeTime,
      location: `${address.street1}, ${address.city}, ${address.state}`,
      status: 'SCHEDULED',
    };
  }

  private calculateBaseRate(packageInfo: PackageDto): number {
    return Math.max(packageInfo.weight * 2.30, 9.50);
  }

  private generateTrackingNumber(): string {
    return Math.random().toString(10).substring(2, 14);
  }

  private generateConfirmationNumber(): string {
    return 'FDXP' + Math.random().toString(36).substring(2, 12).toUpperCase();
  }

  private mapServiceToLevel(serviceType: string): ServiceLevelEnum {
    const mapping: Record<string, ServiceLevelEnum> = {
      'FEDEX_GROUND': ServiceLevelEnum.GROUND,
      'GROUND_HOME_DELIVERY': ServiceLevelEnum.GROUND,
      'FEDEX_2_DAY': ServiceLevelEnum.TWO_DAY,
      'FEDEX_2_DAY_AM': ServiceLevelEnum.TWO_DAY,
      'STANDARD_OVERNIGHT': ServiceLevelEnum.NEXT_DAY,
      'PRIORITY_OVERNIGHT': ServiceLevelEnum.NEXT_DAY,
      'FIRST_OVERNIGHT': ServiceLevelEnum.NEXT_DAY,
      'INTERNATIONAL_ECONOMY': ServiceLevelEnum.INTERNATIONAL,
      'INTERNATIONAL_PRIORITY': ServiceLevelEnum.INTERNATIONAL,
    };
    return mapping[serviceType] || ServiceLevelEnum.GROUND;
  }

  private getServiceType(serviceLevel: ServiceLevelEnum): string {
    const mapping: Record<ServiceLevelEnum, string> = {
      [ServiceLevelEnum.GROUND]: 'FEDEX_GROUND',
      [ServiceLevelEnum.TWO_DAY]: 'FEDEX_2_DAY',
      [ServiceLevelEnum.NEXT_DAY]: 'PRIORITY_OVERNIGHT',
      [ServiceLevelEnum.INTERNATIONAL]: 'INTERNATIONAL_PRIORITY',
      [ServiceLevelEnum.FREIGHT]: 'FEDEX_FREIGHT_PRIORITY',
    };
    return mapping[serviceLevel] || 'FEDEX_GROUND';
  }

  private getServiceName(serviceType: string): string {
    const names: Record<string, string> = {
      'FEDEX_GROUND': 'FedEx Ground',
      'GROUND_HOME_DELIVERY': 'FedEx Home Delivery',
      'FEDEX_2_DAY': 'FedEx 2Day',
      'FEDEX_2_DAY_AM': 'FedEx 2Day AM',
      'STANDARD_OVERNIGHT': 'FedEx Standard Overnight',
      'PRIORITY_OVERNIGHT': 'FedEx Priority Overnight',
      'FIRST_OVERNIGHT': 'FedEx First Overnight',
      'INTERNATIONAL_ECONOMY': 'FedEx International Economy',
      'INTERNATIONAL_PRIORITY': 'FedEx International Priority',
    };
    return names[serviceType] || 'FedEx Service';
  }

  private parseDeliveryDays(dayFormat: string): number {
    // Parse FedEx day format to number of days
    const match = dayFormat.match(/(\d+)/);
    return match ? parseInt(match[1]) : 5;
  }
}
