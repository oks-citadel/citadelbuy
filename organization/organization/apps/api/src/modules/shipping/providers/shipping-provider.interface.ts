import { PackageDto, AddressDto, ServiceLevelEnum } from '../dto/shipping.dto';

export interface RateQuote {
  carrier: string;
  serviceName: string;
  serviceLevel: ServiceLevelEnum;
  totalRate: number;
  baseRate: number;
  fuelSurcharge?: number;
  insurance?: number;
  estimatedDays?: number;
  guaranteedDelivery: boolean;
}

export interface ShipmentLabel {
  trackingNumber: string;
  labelUrl: string;
  labelFormat: string;
  estimatedDelivery?: Date;
  cost: number;
}

export interface TrackingInfo {
  trackingNumber: string;
  status: string;
  events: TrackingEventInfo[];
  estimatedDelivery?: Date;
  actualDelivery?: Date;
}

export interface TrackingEventInfo {
  timestamp: Date;
  status: string;
  description: string;
  location?: string;
}

export interface IShippingProvider {
  /**
   * Get real-time shipping rates from the provider
   */
  getRates(
    fromAddress: AddressDto,
    toAddress: AddressDto,
    packageInfo: PackageDto,
    serviceLevels?: ServiceLevelEnum[],
  ): Promise<RateQuote[]>;

  /**
   * Create a shipment and generate a shipping label
   */
  createLabel(
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
  ): Promise<ShipmentLabel>;

  /**
   * Track a shipment by tracking number
   */
  trackShipment(trackingNumber: string): Promise<TrackingInfo>;

  /**
   * Create a return label
   */
  createReturnLabel(
    originalTrackingNumber: string,
    fromAddress: AddressDto,
    toAddress: AddressDto,
    packageInfo: PackageDto,
  ): Promise<ShipmentLabel>;

  /**
   * Cancel a shipment (if possible)
   */
  cancelShipment(trackingNumber: string): Promise<boolean>;

  /**
   * Validate an address
   */
  validateAddress(address: AddressDto): Promise<{
    valid: boolean;
    suggestedAddress?: AddressDto;
    errors?: string[];
  }>;
}
