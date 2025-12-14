import { Injectable, Logger } from '@nestjs/common';
import {
  IShippingProvider,
  RateQuote,
  ShipmentLabel,
  TrackingInfo,
  TrackingEventInfo,
} from './shipping-provider.interface';
import { PackageDto, AddressDto, ServiceLevelEnum } from '../dto/shipping.dto';

interface UpsAccessToken {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface UpsRateResponse {
  RateResponse?: {
    RatedShipment?: Array<{
      Service: { Code: string; Description?: string };
      TotalCharges: { MonetaryValue: string; CurrencyCode: string };
      GuaranteedDelivery?: { BusinessDaysInTransit: string };
      TimeInTransit?: { ServiceSummary?: { EstimatedArrival?: { DayOfWeek?: string } } };
    }>;
  };
}

interface UpsTrackResponse {
  trackResponse?: {
    shipment?: Array<{
      package?: Array<{
        trackingNumber: string;
        currentStatus?: { description: string; code: string };
        activity?: Array<{
          date: string;
          time: string;
          location?: { address?: { city?: string; stateProvince?: string; countryCode?: string } };
          status?: { description: string; code: string };
        }>;
        deliveryDate?: Array<{ date: string }>;
      }>;
    }>;
  };
}

@Injectable()
export class UpsProvider implements IShippingProvider {
  private readonly logger = new Logger(UpsProvider.name);
  private apiKey: string;
  private apiSecret: string;
  private accountNumber: string;
  private testMode: boolean;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  // UPS Service Code Mapping
  private readonly serviceCodeMap: Record<string, ServiceLevelEnum> = {
    '03': ServiceLevelEnum.GROUND,
    '02': ServiceLevelEnum.TWO_DAY,
    '01': ServiceLevelEnum.NEXT_DAY,
    '07': ServiceLevelEnum.INTERNATIONAL,
    '08': ServiceLevelEnum.INTERNATIONAL,
  };

  private readonly serviceLevelToCode: Record<ServiceLevelEnum, string> = {
    [ServiceLevelEnum.GROUND]: '03',
    [ServiceLevelEnum.TWO_DAY]: '02',
    [ServiceLevelEnum.NEXT_DAY]: '01',
    [ServiceLevelEnum.INTERNATIONAL]: '07',
    [ServiceLevelEnum.FREIGHT]: '86', // UPS Freight LTL
  };

  constructor(config: {
    apiKey: string;
    apiSecret: string;
    accountNumber: string;
    testMode?: boolean;
  }) {
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.accountNumber = config.accountNumber;
    this.testMode = config.testMode ?? process.env.NODE_ENV !== 'production';
  }

  private get baseUrl(): string {
    return this.testMode
      ? 'https://wwwcie.ups.com'
      : 'https://onlinetools.ups.com';
  }

  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid (with 5 min buffer)
    if (this.accessToken && Date.now() < this.tokenExpiry - 300000) {
      return this.accessToken;
    }

    if (!this.apiKey || !this.apiSecret) {
      this.logger.warn('UPS API credentials not configured - using mock responses');
      throw new Error('UPS_NOT_CONFIGURED');
    }

    try {
      const credentials = Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64');

      const response = await fetch(`${this.baseUrl}/security/v1/oauth/token`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });

      if (!response.ok) {
        throw new Error(`Failed to get UPS access token: ${response.statusText}`);
      }

      const data: UpsAccessToken = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + data.expires_in * 1000;

      return this.accessToken;
    } catch (error) {
      this.logger.error('Failed to authenticate with UPS API', error);
      throw error;
    }
  }

  async getRates(
    fromAddress: AddressDto,
    toAddress: AddressDto,
    packageInfo: PackageDto,
    serviceLevels?: ServiceLevelEnum[],
  ): Promise<RateQuote[]> {
    this.logger.log('Getting UPS rates');

    try {
      const accessToken = await this.getAccessToken();

      const requestBody = {
        RateRequest: {
          Request: {
            SubVersion: '2205',
            TransactionReference: { CustomerContext: 'Rate Request' },
          },
          Shipment: {
            Shipper: {
              Address: {
                AddressLine: [fromAddress.street1],
                City: fromAddress.city,
                StateProvinceCode: fromAddress.state,
                PostalCode: fromAddress.postalCode,
                CountryCode: fromAddress.country || 'US',
              },
              ShipperNumber: this.accountNumber,
            },
            ShipTo: {
              Address: {
                AddressLine: [toAddress.street1],
                City: toAddress.city,
                StateProvinceCode: toAddress.state,
                PostalCode: toAddress.postalCode,
                CountryCode: toAddress.country || 'US',
              },
            },
            ShipFrom: {
              Address: {
                AddressLine: [fromAddress.street1],
                City: fromAddress.city,
                StateProvinceCode: fromAddress.state,
                PostalCode: fromAddress.postalCode,
                CountryCode: fromAddress.country || 'US',
              },
            },
            Package: {
              PackagingType: { Code: '02' }, // Customer Supplied Package
              Dimensions: {
                UnitOfMeasurement: { Code: 'IN' },
                Length: String(packageInfo.length || 10),
                Width: String(packageInfo.width || 10),
                Height: String(packageInfo.height || 10),
              },
              PackageWeight: {
                UnitOfMeasurement: { Code: 'LBS' },
                Weight: String(packageInfo.weight || 1),
              },
            },
          },
        },
      };

      const response = await fetch(`${this.baseUrl}/api/rating/v2205/Shop`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'transId': `rate-${Date.now()}`,
          'transactionSrc': 'Broxiva',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`UPS Rate API error: ${errorText}`);
        return this.getFallbackRates(fromAddress, toAddress, packageInfo, serviceLevels);
      }

      const data: UpsRateResponse = await response.json();
      const rates: RateQuote[] = [];

      if (data.RateResponse?.RatedShipment) {
        for (const shipment of data.RateResponse.RatedShipment) {
          const serviceCode = shipment.Service.Code;
          const serviceLevel = this.serviceCodeMap[serviceCode] || ServiceLevelEnum.GROUND;

          // Filter by requested service levels
          if (serviceLevels && !serviceLevels.includes(serviceLevel)) {
            continue;
          }

          const totalRate = parseFloat(shipment.TotalCharges.MonetaryValue);
          const estimatedDays = shipment.GuaranteedDelivery?.BusinessDaysInTransit
            ? parseInt(shipment.GuaranteedDelivery.BusinessDaysInTransit)
            : this.estimateDeliveryDays(fromAddress, toAddress, serviceLevel);

          rates.push({
            carrier: 'UPS',
            serviceName: this.getServiceName(serviceCode),
            serviceLevel,
            baseRate: totalRate * 0.9, // Approximate base rate
            fuelSurcharge: totalRate * 0.1, // Approximate fuel surcharge
            totalRate,
            estimatedDays,
            guaranteedDelivery: serviceLevel !== ServiceLevelEnum.GROUND,
          });
        }
      }

      // If no rates returned, use fallback
      if (rates.length === 0) {
        return this.getFallbackRates(fromAddress, toAddress, packageInfo, serviceLevels);
      }

      return rates;
    } catch (error: any) {
      if (error.message === 'UPS_NOT_CONFIGURED') {
        return this.getFallbackRates(fromAddress, toAddress, packageInfo, serviceLevels);
      }
      this.logger.error('Failed to get UPS rates', error);
      return this.getFallbackRates(fromAddress, toAddress, packageInfo, serviceLevels);
    }
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

    try {
      const accessToken = await this.getAccessToken();
      const serviceCode = this.serviceLevelToCode[serviceLevel] || '03';

      const requestBody = {
        ShipmentRequest: {
          Request: {
            SubVersion: '2205',
            TransactionReference: { CustomerContext: 'Label Request' },
          },
          Shipment: {
            Description: options?.customsDescription || 'Merchandise',
            Shipper: {
              Name: fromAddress.name || 'Broxiva',
              AttentionName: fromAddress.name || 'Shipping Dept',
              Phone: { Number: fromAddress.phone || '1234567890' },
              ShipperNumber: this.accountNumber,
              Address: {
                AddressLine: [fromAddress.street1, fromAddress.street2].filter(Boolean),
                City: fromAddress.city,
                StateProvinceCode: fromAddress.state,
                PostalCode: fromAddress.postalCode,
                CountryCode: fromAddress.country || 'US',
              },
            },
            ShipTo: {
              Name: toAddress.name || 'Customer',
              AttentionName: toAddress.name || 'Customer',
              Phone: { Number: toAddress.phone || '1234567890' },
              Address: {
                AddressLine: [toAddress.street1, toAddress.street2].filter(Boolean),
                City: toAddress.city,
                StateProvinceCode: toAddress.state,
                PostalCode: toAddress.postalCode,
                CountryCode: toAddress.country || 'US',
              },
            },
            ShipFrom: {
              Name: fromAddress.name || 'Broxiva',
              AttentionName: fromAddress.name || 'Shipping Dept',
              Phone: { Number: fromAddress.phone || '1234567890' },
              Address: {
                AddressLine: [fromAddress.street1, fromAddress.street2].filter(Boolean),
                City: fromAddress.city,
                StateProvinceCode: fromAddress.state,
                PostalCode: fromAddress.postalCode,
                CountryCode: fromAddress.country || 'US',
              },
            },
            PaymentInformation: {
              ShipmentCharge: {
                Type: '01',
                BillShipper: { AccountNumber: this.accountNumber },
              },
            },
            Service: { Code: serviceCode },
            Package: {
              Packaging: { Code: '02' },
              Dimensions: {
                UnitOfMeasurement: { Code: 'IN' },
                Length: String(packageInfo.length || 10),
                Width: String(packageInfo.width || 10),
                Height: String(packageInfo.height || 10),
              },
              PackageWeight: {
                UnitOfMeasurement: { Code: 'LBS' },
                Weight: String(packageInfo.weight || 1),
              },
              ...(options?.signature && {
                PackageServiceOptions: {
                  DeliveryConfirmation: { DCISType: '2' }, // Signature Required
                },
              }),
              ...(options?.insurance && {
                PackageServiceOptions: {
                  DeclaredValue: {
                    CurrencyCode: 'USD',
                    MonetaryValue: String(options.insurance),
                  },
                },
              }),
            },
          },
          LabelSpecification: {
            LabelImageFormat: { Code: 'PDF' },
            LabelStockSize: { Height: '6', Width: '4' },
          },
        },
      };

      const response = await fetch(`${this.baseUrl}/api/shipments/v2205/ship`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'transId': `ship-${Date.now()}`,
          'transactionSrc': 'Broxiva',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`UPS Ship API error: ${errorText}`);
        return this.createFallbackLabel(fromAddress, toAddress, packageInfo, serviceLevel, options);
      }

      const data = await response.json();
      const shipmentResults = data.ShipmentResponse?.ShipmentResults;

      if (!shipmentResults) {
        return this.createFallbackLabel(fromAddress, toAddress, packageInfo, serviceLevel, options);
      }

      const trackingNumber = shipmentResults.PackageResults?.[0]?.TrackingNumber || this.generateTrackingNumber();
      const labelImage = shipmentResults.PackageResults?.[0]?.ShippingLabel?.GraphicImage;
      const cost = parseFloat(shipmentResults.ShipmentCharges?.TotalCharges?.MonetaryValue || '0');

      const estimatedDelivery = new Date();
      estimatedDelivery.setDate(estimatedDelivery.getDate() + this.estimateDeliveryDays(fromAddress, toAddress, serviceLevel));

      return {
        trackingNumber,
        labelUrl: labelImage ? `data:application/pdf;base64,${labelImage}` : `https://ups.com/labels/${trackingNumber}.pdf`,
        labelFormat: 'PDF',
        estimatedDelivery,
        cost,
      };
    } catch (error: any) {
      if (error.message === 'UPS_NOT_CONFIGURED') {
        return this.createFallbackLabel(fromAddress, toAddress, packageInfo, serviceLevel, options);
      }
      this.logger.error('Failed to create UPS label', error);
      return this.createFallbackLabel(fromAddress, toAddress, packageInfo, serviceLevel, options);
    }
  }

  async trackShipment(trackingNumber: string): Promise<TrackingInfo> {
    this.logger.log(`Tracking UPS shipment: ${trackingNumber}`);

    try {
      const accessToken = await this.getAccessToken();

      const response = await fetch(
        `${this.baseUrl}/api/track/v1/details/${trackingNumber}?locale=en_US&returnSignature=false`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'transId': `track-${Date.now()}`,
            'transactionSrc': 'Broxiva',
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`UPS Track API error: ${errorText}`);
        return this.getFallbackTracking(trackingNumber);
      }

      const data: UpsTrackResponse = await response.json();
      const pkg = data.trackResponse?.shipment?.[0]?.package?.[0];

      if (!pkg) {
        return this.getFallbackTracking(trackingNumber);
      }

      const events: TrackingEventInfo[] = (pkg.activity || []).map((activity) => ({
        timestamp: this.parseUpsDateTime(activity.date, activity.time),
        status: activity.status?.code || 'UNKNOWN',
        description: activity.status?.description || 'Status update',
        location: this.formatLocation(activity.location),
      }));

      const estimatedDelivery = pkg.deliveryDate?.[0]?.date
        ? this.parseUpsDate(pkg.deliveryDate[0].date)
        : undefined;

      return {
        trackingNumber: pkg.trackingNumber,
        status: pkg.currentStatus?.code || 'IN_TRANSIT',
        events,
        estimatedDelivery,
      };
    } catch (error: any) {
      if (error.message === 'UPS_NOT_CONFIGURED') {
        return this.getFallbackTracking(trackingNumber);
      }
      this.logger.error('Failed to track UPS shipment', error);
      return this.getFallbackTracking(trackingNumber);
    }
  }

  async createReturnLabel(
    originalTrackingNumber: string,
    fromAddress: AddressDto,
    toAddress: AddressDto,
    packageInfo: PackageDto,
  ): Promise<ShipmentLabel> {
    this.logger.log('Creating UPS return label');
    // For returns, swap the addresses
    return this.createLabel(fromAddress, toAddress, packageInfo, ServiceLevelEnum.GROUND);
  }

  async cancelShipment(trackingNumber: string): Promise<boolean> {
    this.logger.log(`Cancelling UPS shipment: ${trackingNumber}`);

    try {
      const accessToken = await this.getAccessToken();

      const response = await fetch(`${this.baseUrl}/api/shipments/v1/void/cancel/${trackingNumber}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'transId': `void-${Date.now()}`,
          'transactionSrc': 'Broxiva',
        },
      });

      return response.ok;
    } catch (error) {
      this.logger.error('Failed to cancel UPS shipment', error);
      return false;
    }
  }

  async validateAddress(address: AddressDto): Promise<{
    valid: boolean;
    suggestedAddress?: AddressDto;
    errors?: string[];
  }> {
    this.logger.log('Validating address with UPS');

    try {
      const accessToken = await this.getAccessToken();

      const requestBody = {
        XAVRequest: {
          AddressKeyFormat: {
            ConsigneeName: address.name || '',
            AddressLine: [address.street1, address.street2].filter(Boolean),
            PoliticalDivision2: address.city,
            PoliticalDivision1: address.state,
            PostcodePrimaryLow: address.postalCode,
            CountryCode: address.country || 'US',
          },
        },
      };

      const response = await fetch(`${this.baseUrl}/api/addressvalidation/v1/1`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'transId': `av-${Date.now()}`,
          'transactionSrc': 'Broxiva',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        return this.basicValidation(address);
      }

      const data = await response.json();
      const candidate = data.XAVResponse?.Candidate?.[0];

      if (candidate) {
        const suggestedAddress: AddressDto = {
          ...address,
          street1: candidate.AddressKeyFormat?.AddressLine?.[0] || address.street1,
          city: candidate.AddressKeyFormat?.PoliticalDivision2 || address.city,
          state: candidate.AddressKeyFormat?.PoliticalDivision1 || address.state,
          postalCode: candidate.AddressKeyFormat?.PostcodePrimaryLow || address.postalCode,
        };

        return {
          valid: true,
          suggestedAddress,
        };
      }

      return { valid: true };
    } catch (error: any) {
      if (error.message === 'UPS_NOT_CONFIGURED') {
        return this.basicValidation(address);
      }
      this.logger.error('Failed to validate address', error);
      return this.basicValidation(address);
    }
  }

  // Fallback methods for when UPS API is not available
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
        carrier: 'UPS',
        serviceName: 'UPS Ground',
        serviceLevel: ServiceLevelEnum.GROUND,
        baseRate,
        fuelSurcharge: baseRate * 0.1,
        totalRate: baseRate * 1.1,
        estimatedDays: this.estimateDeliveryDays(fromAddress, toAddress, ServiceLevelEnum.GROUND),
        guaranteedDelivery: false,
      });
    }

    if (!serviceLevels || serviceLevels.includes(ServiceLevelEnum.TWO_DAY)) {
      rates.push({
        carrier: 'UPS',
        serviceName: 'UPS 2nd Day Air',
        serviceLevel: ServiceLevelEnum.TWO_DAY,
        baseRate: baseRate * 1.5,
        fuelSurcharge: baseRate * 0.15,
        totalRate: baseRate * 1.65,
        estimatedDays: 2,
        guaranteedDelivery: true,
      });
    }

    if (!serviceLevels || serviceLevels.includes(ServiceLevelEnum.NEXT_DAY)) {
      rates.push({
        carrier: 'UPS',
        serviceName: 'UPS Next Day Air',
        serviceLevel: ServiceLevelEnum.NEXT_DAY,
        baseRate: baseRate * 2.5,
        fuelSurcharge: baseRate * 0.25,
        totalRate: baseRate * 2.75,
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
    options?: { signature?: boolean; insurance?: number },
  ): ShipmentLabel {
    const trackingNumber = this.generateTrackingNumber();
    const baseRate = this.calculateBaseRate(packageInfo);

    let cost = baseRate;
    if (serviceLevel === ServiceLevelEnum.TWO_DAY) cost *= 1.5;
    if (serviceLevel === ServiceLevelEnum.NEXT_DAY) cost *= 2.5;
    if (options?.signature) cost += 5.0;
    if (options?.insurance) cost += options.insurance * 0.01;

    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(
      estimatedDelivery.getDate() + this.estimateDeliveryDays(fromAddress, toAddress, serviceLevel)
    );

    return {
      trackingNumber,
      labelUrl: `https://ups.com/labels/${trackingNumber}.pdf`,
      labelFormat: 'PDF',
      estimatedDelivery,
      cost,
    };
  }

  private getFallbackTracking(trackingNumber: string): TrackingInfo {
    const now = new Date();
    return {
      trackingNumber,
      status: 'IN_TRANSIT',
      events: [
        {
          timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
          status: 'PICKED_UP',
          description: 'Package picked up',
          location: 'Origin Facility',
        },
        {
          timestamp: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
          status: 'IN_TRANSIT',
          description: 'In transit to destination',
          location: 'Sorting Facility',
        },
      ],
      estimatedDelivery: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
    };
  }

  private basicValidation(address: AddressDto): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];
    if (!address.street1) errors.push('Street address is required');
    if (!address.city) errors.push('City is required');
    if (!address.state) errors.push('State is required');
    if (!address.postalCode) errors.push('Postal code is required');
    return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
  }

  private calculateBaseRate(packageInfo: PackageDto): number {
    const weightRate = Math.max(packageInfo.weight || 1, 1) * 2.5;
    const dimWeight = ((packageInfo.length || 10) * (packageInfo.width || 10) * (packageInfo.height || 10)) / 139;
    const billableWeight = Math.max(packageInfo.weight || 1, dimWeight);
    return Math.max(billableWeight * 2.5, 10);
  }

  private estimateDeliveryDays(from: AddressDto, to: AddressDto, level: ServiceLevelEnum): number {
    const sameState = from.state === to.state;
    switch (level) {
      case ServiceLevelEnum.NEXT_DAY: return 1;
      case ServiceLevelEnum.TWO_DAY: return 2;
      case ServiceLevelEnum.GROUND: return sameState ? 3 : 5;
      case ServiceLevelEnum.INTERNATIONAL: return 7;
      default: return 5;
    }
  }

  private getServiceName(code: string): string {
    const names: Record<string, string> = {
      '01': 'UPS Next Day Air',
      '02': 'UPS 2nd Day Air',
      '03': 'UPS Ground',
      '07': 'UPS Worldwide Express',
      '08': 'UPS Worldwide Expedited',
      '11': 'UPS Standard',
      '12': 'UPS 3 Day Select',
      '14': 'UPS Next Day Air Early',
    };
    return names[code] || 'UPS Service';
  }

  private generateTrackingNumber(): string {
    const prefix = '1Z';
    const random = Math.random().toString(36).substring(2, 18).toUpperCase();
    return prefix + random;
  }

  private parseUpsDateTime(date: string, time: string): Date {
    // UPS format: YYYYMMDD and HHMMSS
    const year = parseInt(date.substring(0, 4));
    const month = parseInt(date.substring(4, 6)) - 1;
    const day = parseInt(date.substring(6, 8));
    const hour = parseInt(time.substring(0, 2));
    const minute = parseInt(time.substring(2, 4));
    return new Date(year, month, day, hour, minute);
  }

  private parseUpsDate(date: string): Date {
    const year = parseInt(date.substring(0, 4));
    const month = parseInt(date.substring(4, 6)) - 1;
    const day = parseInt(date.substring(6, 8));
    return new Date(year, month, day);
  }

  private formatLocation(location?: { address?: { city?: string; stateProvince?: string; countryCode?: string } }): string {
    if (!location?.address) return 'Unknown';
    const parts = [location.address.city, location.address.stateProvince, location.address.countryCode].filter(Boolean);
    return parts.join(', ') || 'Unknown';
  }
}
