import { UpsProvider } from './ups.provider';
import { FedexProvider } from './fedex.provider';
import { UspsProvider } from './usps.provider';
import { DhlProvider } from './dhl.provider';
import {
  IShippingProvider,
  RateQuote,
  ShipmentLabel,
  TrackingInfo,
} from './shipping-provider.interface';
import {
  AddressDto,
  PackageDto,
  ServiceLevelEnum,
  PackageTypeEnum,
} from '../dto/shipping.dto';

// Mock fetch globally
global.fetch = jest.fn();

describe('Shipping Providers', () => {
  const mockFromAddress: AddressDto = {
    name: 'Test Shipper',
    street1: '123 Origin St',
    city: 'New York',
    state: 'NY',
    postalCode: '10001',
    country: 'US',
  };

  const mockToAddress: AddressDto = {
    name: 'Test Recipient',
    street1: '456 Destination Ave',
    city: 'Los Angeles',
    state: 'CA',
    postalCode: '90001',
    country: 'US',
  };

  const mockInternationalAddress: AddressDto = {
    name: 'International Recipient',
    street1: '123 International St',
    city: 'London',
    state: '',
    postalCode: 'SW1A 1AA',
    country: 'GB',
  };

  const mockPackage: PackageDto = {
    type: PackageTypeEnum.SMALL_PACKAGE,
    weight: 5,
    length: 12,
    width: 8,
    height: 6,
  };

  const mockLightPackage: PackageDto = {
    type: PackageTypeEnum.ENVELOPE,
    weight: 0.5,
    length: 10,
    width: 7,
    height: 1,
  };

  const mockHeavyPackage: PackageDto = {
    type: PackageTypeEnum.LARGE_PACKAGE,
    weight: 50,
    length: 24,
    width: 18,
    height: 16,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==================== UPS Provider Tests ====================

  describe('UpsProvider', () => {
    let upsProvider: UpsProvider;

    const upsConfig = {
      apiKey: 'test-api-key',
      apiSecret: 'test-api-secret',
      accountNumber: '12345678',
      testMode: true,
    };

    beforeEach(() => {
      upsProvider = new UpsProvider(upsConfig);
    });

    describe('getRates', () => {
      it('should return fallback rates when credentials not configured', async () => {
        const providerWithoutCredentials = new UpsProvider({
          apiKey: '',
          apiSecret: '',
          accountNumber: '',
          testMode: true,
        });

        // UPS provider returns fallback rates when not configured instead of throwing
        const rates = await providerWithoutCredentials.getRates(mockFromAddress, mockToAddress, mockPackage);

        expect(rates).toBeDefined();
        expect(Array.isArray(rates)).toBe(true);
        expect(rates.length).toBeGreaterThan(0);
        expect(rates[0].carrier).toBe('UPS');
      });

      it('should return rates when API responds successfully', async () => {
        const mockTokenResponse = {
          ok: true,
          json: () => Promise.resolve({
            access_token: 'test-token',
            expires_in: 3600,
          }),
        };

        const mockRateResponse = {
          ok: true,
          json: () => Promise.resolve({
            RateResponse: {
              RatedShipment: [
                {
                  Service: { Code: '03', Description: 'UPS Ground' },
                  TotalCharges: { MonetaryValue: '12.50', CurrencyCode: 'USD' },
                  GuaranteedDelivery: { BusinessDaysInTransit: '5' },
                },
                {
                  Service: { Code: '02', Description: 'UPS 2nd Day Air' },
                  TotalCharges: { MonetaryValue: '25.00', CurrencyCode: 'USD' },
                  GuaranteedDelivery: { BusinessDaysInTransit: '2' },
                },
              ],
            },
          }),
        };

        (global.fetch as jest.Mock)
          .mockResolvedValueOnce(mockTokenResponse)
          .mockResolvedValueOnce(mockRateResponse);

        const rates = await upsProvider.getRates(mockFromAddress, mockToAddress, mockPackage);

        expect(rates).toBeDefined();
        expect(Array.isArray(rates)).toBe(true);
      });

      it('should filter rates by service level when specified', async () => {
        const mockTokenResponse = {
          ok: true,
          json: () => Promise.resolve({
            access_token: 'test-token',
            expires_in: 3600,
          }),
        };

        const mockRateResponse = {
          ok: true,
          json: () => Promise.resolve({
            RateResponse: {
              RatedShipment: [
                {
                  Service: { Code: '03' },
                  TotalCharges: { MonetaryValue: '12.50' },
                },
              ],
            },
          }),
        };

        (global.fetch as jest.Mock)
          .mockResolvedValueOnce(mockTokenResponse)
          .mockResolvedValueOnce(mockRateResponse);

        const rates = await upsProvider.getRates(
          mockFromAddress,
          mockToAddress,
          mockPackage,
          [ServiceLevelEnum.GROUND],
        );

        expect(rates.every(r => r.serviceLevel === ServiceLevelEnum.GROUND)).toBe(true);
      });

      it('should use cached token when still valid', async () => {
        const mockTokenResponse = {
          ok: true,
          json: () => Promise.resolve({
            access_token: 'test-token',
            expires_in: 3600,
          }),
        };

        const mockRateResponse = {
          ok: true,
          json: () => Promise.resolve({
            RateResponse: { RatedShipment: [] },
          }),
        };

        (global.fetch as jest.Mock)
          .mockResolvedValueOnce(mockTokenResponse)
          .mockResolvedValueOnce(mockRateResponse)
          .mockResolvedValueOnce(mockRateResponse);

        // First call - should get token
        await upsProvider.getRates(mockFromAddress, mockToAddress, mockPackage);

        // Second call - should reuse token
        await upsProvider.getRates(mockFromAddress, mockToAddress, mockPackage);

        // Token fetch should only be called once
        expect(global.fetch).toHaveBeenCalledTimes(3); // 1 token + 2 rate requests
      });
    });

    describe('createLabel', () => {
      it('should create shipping label with tracking number', async () => {
        const mockTokenResponse = {
          ok: true,
          json: () => Promise.resolve({
            access_token: 'test-token',
            expires_in: 3600,
          }),
        };

        const mockShipmentResponse = {
          ok: true,
          json: () => Promise.resolve({
            ShipmentResponse: {
              ShipmentResults: {
                ShipmentIdentificationNumber: '1Z999AA10123456784',
                PackageResults: [{
                  TrackingNumber: '1Z999AA10123456784',
                  ShippingLabel: {
                    GraphicImage: 'base64-label-data',
                    ImageFormat: { Code: 'PDF' },
                  },
                }],
                ShipmentCharges: {
                  TotalCharges: { MonetaryValue: '15.50' },
                },
              },
            },
          }),
        };

        (global.fetch as jest.Mock)
          .mockResolvedValueOnce(mockTokenResponse)
          .mockResolvedValueOnce(mockShipmentResponse);

        const label = await upsProvider.createLabel(
          mockFromAddress,
          mockToAddress,
          mockPackage,
          ServiceLevelEnum.GROUND,
        );

        expect(label).toBeDefined();
        expect(label.trackingNumber).toBeDefined();
      });

      it('should include insurance cost when specified', async () => {
        const mockTokenResponse = {
          ok: true,
          json: () => Promise.resolve({
            access_token: 'test-token',
            expires_in: 3600,
          }),
        };

        const mockShipmentResponse = {
          ok: true,
          json: () => Promise.resolve({
            ShipmentResponse: {
              ShipmentResults: {
                ShipmentIdentificationNumber: '1Z999AA10123456784',
                PackageResults: [{
                  TrackingNumber: '1Z999AA10123456784',
                  ShippingLabel: {
                    GraphicImage: 'base64-label-data',
                  },
                }],
                ShipmentCharges: {
                  TotalCharges: { MonetaryValue: '20.00' },
                },
              },
            },
          }),
        };

        (global.fetch as jest.Mock)
          .mockResolvedValueOnce(mockTokenResponse)
          .mockResolvedValueOnce(mockShipmentResponse);

        const label = await upsProvider.createLabel(
          mockFromAddress,
          mockToAddress,
          mockPackage,
          ServiceLevelEnum.GROUND,
          { insurance: 500 },
        );

        expect(label.cost).toBeGreaterThan(0);
      });
    });

    describe('trackShipment', () => {
      it('should return tracking information', async () => {
        const trackingNumber = '1Z999AA10123456784';

        const mockTokenResponse = {
          ok: true,
          json: () => Promise.resolve({
            access_token: 'test-token',
            expires_in: 3600,
          }),
        };

        const mockTrackingResponse = {
          ok: true,
          json: () => Promise.resolve({
            trackResponse: {
              shipment: [{
                package: [{
                  trackingNumber,
                  currentStatus: { description: 'In Transit', code: 'IT' },
                  activity: [
                    {
                      date: '20241220',
                      time: '143000',
                      status: { description: 'Package picked up' },
                      location: { address: { city: 'New York', stateProvince: 'NY' } },
                    },
                  ],
                }],
              }],
            },
          }),
        };

        (global.fetch as jest.Mock)
          .mockResolvedValueOnce(mockTokenResponse)
          .mockResolvedValueOnce(mockTrackingResponse);

        const tracking = await upsProvider.trackShipment(trackingNumber);

        expect(tracking).toBeDefined();
        expect(tracking.trackingNumber).toBe(trackingNumber);
      });
    });

    describe('validateAddress', () => {
      it('should validate complete address', async () => {
        const mockTokenResponse = {
          ok: true,
          json: () => Promise.resolve({
            access_token: 'test-token',
            expires_in: 3600,
          }),
        };

        const mockValidationResponse = {
          ok: true,
          json: () => Promise.resolve({
            XAVResponse: {
              ValidAddressIndicator: '',
              Candidate: [{
                AddressKeyFormat: {
                  AddressLine: ['123 Main St'],
                  PoliticalDivision2: 'New York',
                  PoliticalDivision1: 'NY',
                  PostcodePrimaryLow: '10001',
                },
              }],
            },
          }),
        };

        (global.fetch as jest.Mock)
          .mockResolvedValueOnce(mockTokenResponse)
          .mockResolvedValueOnce(mockValidationResponse);

        const result = await upsProvider.validateAddress(mockFromAddress);

        expect(result.valid).toBe(true);
      });

      it('should return errors for invalid address', async () => {
        const mockTokenResponse = {
          ok: true,
          json: () => Promise.resolve({
            access_token: 'test-token',
            expires_in: 3600,
          }),
        };

        // Return a non-ok response to trigger fallback to basicValidation
        const mockValidationResponse = {
          ok: false,
          statusText: 'Address not found',
        };

        (global.fetch as jest.Mock)
          .mockResolvedValueOnce(mockTokenResponse)
          .mockResolvedValueOnce(mockValidationResponse);

        // Use an address with missing required fields to trigger validation errors
        const result = await upsProvider.validateAddress({
          ...mockFromAddress,
          street1: '',
          city: '',
        });

        expect(result.valid).toBe(false);
        expect(result.errors).toBeDefined();
        expect(result.errors!.length).toBeGreaterThan(0);
      });
    });

    describe('cancelShipment', () => {
      it('should cancel shipment successfully', async () => {
        const mockTokenResponse = {
          ok: true,
          json: () => Promise.resolve({
            access_token: 'test-token',
            expires_in: 3600,
          }),
        };

        const mockCancelResponse = {
          ok: true,
          json: () => Promise.resolve({
            VoidShipmentResponse: {
              SummaryResult: {
                Status: { Code: '1' },
              },
            },
          }),
        };

        (global.fetch as jest.Mock)
          .mockResolvedValueOnce(mockTokenResponse)
          .mockResolvedValueOnce(mockCancelResponse);

        const result = await upsProvider.cancelShipment('1Z999AA10123456784');

        expect(result).toBe(true);
      });
    });
  });

  // ==================== FedEx Provider Tests ====================

  describe('FedexProvider', () => {
    let fedexProvider: FedexProvider;

    const fedexConfig = {
      apiKey: 'test-api-key',
      apiSecret: 'test-api-secret',
      accountNumber: '12345678',
      meterNumber: '87654321',
      testMode: true,
    };

    beforeEach(() => {
      fedexProvider = new FedexProvider(fedexConfig);
    });

    describe('getRates', () => {
      it('should return ground rate for domestic shipments', async () => {
        const rates = await fedexProvider.getRates(
          mockFromAddress,
          mockToAddress,
          mockPackage,
        );

        const groundRate = rates.find(r => r.serviceLevel === ServiceLevelEnum.GROUND);
        expect(groundRate).toBeDefined();
        expect(groundRate?.carrier).toBe('FEDEX');
        expect(groundRate?.serviceName).toBe('FedEx Ground');
      });

      it('should return two-day rate', async () => {
        const rates = await fedexProvider.getRates(
          mockFromAddress,
          mockToAddress,
          mockPackage,
          [ServiceLevelEnum.TWO_DAY],
        );

        expect(rates.length).toBeGreaterThanOrEqual(1);
        expect(rates[0].serviceLevel).toBe(ServiceLevelEnum.TWO_DAY);
        expect(rates[0].guaranteedDelivery).toBe(true);
      });

      it('should return overnight rate', async () => {
        const rates = await fedexProvider.getRates(
          mockFromAddress,
          mockToAddress,
          mockPackage,
          [ServiceLevelEnum.NEXT_DAY],
        );

        expect(rates.length).toBeGreaterThanOrEqual(1);
        expect(rates[0].estimatedDays).toBe(1);
      });

      it('should return international rate for international destinations', async () => {
        const rates = await fedexProvider.getRates(
          mockFromAddress,
          mockInternationalAddress,
          mockPackage,
          [ServiceLevelEnum.INTERNATIONAL],
        );

        const intlRate = rates.find(r => r.serviceLevel === ServiceLevelEnum.INTERNATIONAL);
        expect(intlRate).toBeDefined();
        expect(intlRate?.serviceName).toContain('International');
      });

      it('should not return international rate for domestic destinations', async () => {
        const rates = await fedexProvider.getRates(
          mockFromAddress,
          mockToAddress,
          mockPackage,
          [ServiceLevelEnum.INTERNATIONAL],
        );

        expect(rates.length).toBe(0);
      });

      it('should calculate rates based on package weight', async () => {
        const lightRates = await fedexProvider.getRates(
          mockFromAddress,
          mockToAddress,
          mockLightPackage,
        );

        const heavyRates = await fedexProvider.getRates(
          mockFromAddress,
          mockToAddress,
          mockHeavyPackage,
        );

        const lightGround = lightRates.find(r => r.serviceLevel === ServiceLevelEnum.GROUND);
        const heavyGround = heavyRates.find(r => r.serviceLevel === ServiceLevelEnum.GROUND);

        expect(heavyGround!.totalRate).toBeGreaterThan(lightGround!.totalRate);
      });

      it('should include fuel surcharge in rates', async () => {
        const rates = await fedexProvider.getRates(
          mockFromAddress,
          mockToAddress,
          mockPackage,
        );

        const rateWithSurcharge = rates.find(r => r.fuelSurcharge && r.fuelSurcharge > 0);
        expect(rateWithSurcharge).toBeDefined();
      });
    });

    describe('createLabel', () => {
      it('should create label with tracking number', async () => {
        const label = await fedexProvider.createLabel(
          mockFromAddress,
          mockToAddress,
          mockPackage,
          ServiceLevelEnum.GROUND,
        );

        expect(label.trackingNumber).toBeDefined();
        expect(label.trackingNumber.length).toBeGreaterThan(0);
        expect(label.labelUrl).toContain('fedex.com');
        expect(label.labelFormat).toBe('PDF');
      });

      it('should include estimated delivery date', async () => {
        const label = await fedexProvider.createLabel(
          mockFromAddress,
          mockToAddress,
          mockPackage,
          ServiceLevelEnum.GROUND,
        );

        expect(label.estimatedDelivery).toBeDefined();
        expect(label.estimatedDelivery instanceof Date).toBe(true);
      });

      it('should add insurance cost to label', async () => {
        const labelWithInsurance = await fedexProvider.createLabel(
          mockFromAddress,
          mockToAddress,
          mockPackage,
          ServiceLevelEnum.GROUND,
          { insurance: 1000 },
        );

        const labelWithoutInsurance = await fedexProvider.createLabel(
          mockFromAddress,
          mockToAddress,
          mockPackage,
          ServiceLevelEnum.GROUND,
        );

        expect(labelWithInsurance.cost).toBeGreaterThan(labelWithoutInsurance.cost);
      });

      it('should add signature cost to label', async () => {
        const labelWithSignature = await fedexProvider.createLabel(
          mockFromAddress,
          mockToAddress,
          mockPackage,
          ServiceLevelEnum.GROUND,
          { signature: true },
        );

        const labelWithoutSignature = await fedexProvider.createLabel(
          mockFromAddress,
          mockToAddress,
          mockPackage,
          ServiceLevelEnum.GROUND,
        );

        expect(labelWithSignature.cost).toBeGreaterThan(labelWithoutSignature.cost);
      });
    });

    describe('trackShipment', () => {
      it('should return tracking info with events', async () => {
        const tracking = await fedexProvider.trackShipment('123456789012');

        expect(tracking.trackingNumber).toBe('123456789012');
        expect(tracking.status).toBeDefined();
        expect(Array.isArray(tracking.events)).toBe(true);
        expect(tracking.events.length).toBeGreaterThan(0);
      });

      it('should include estimated delivery', async () => {
        const tracking = await fedexProvider.trackShipment('123456789012');

        expect(tracking.estimatedDelivery).toBeDefined();
      });
    });

    describe('createReturnLabel', () => {
      it('should create return label with reversed addresses', async () => {
        const returnLabel = await fedexProvider.createReturnLabel(
          '123456789012',
          mockToAddress, // Customer becomes shipper
          mockFromAddress, // Original shipper becomes recipient
          mockPackage,
        );

        expect(returnLabel.trackingNumber).toBeDefined();
        expect(returnLabel.labelUrl).toContain('fedex.com');
      });
    });

    describe('cancelShipment', () => {
      it('should cancel shipment successfully', async () => {
        const result = await fedexProvider.cancelShipment('123456789012');
        expect(result).toBe(true);
      });
    });

    describe('validateAddress', () => {
      it('should validate complete address', async () => {
        const result = await fedexProvider.validateAddress(mockFromAddress);
        expect(result.valid).toBe(true);
      });

      it('should return errors for missing street', async () => {
        const invalidAddress = { ...mockFromAddress, street1: '' };
        const result = await fedexProvider.validateAddress(invalidAddress);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Street address required');
      });

      it('should return errors for missing city', async () => {
        const invalidAddress = { ...mockFromAddress, city: '' };
        const result = await fedexProvider.validateAddress(invalidAddress);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('City required');
      });

      it('should return errors for missing postal code', async () => {
        const invalidAddress = { ...mockFromAddress, postalCode: '' };
        const result = await fedexProvider.validateAddress(invalidAddress);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Postal code required');
      });
    });
  });

  // ==================== USPS Provider Tests ====================

  describe('UspsProvider', () => {
    let uspsProvider: UspsProvider;

    const uspsConfig = {
      apiKey: 'test-api-key',
      accountNumber: '12345678',
      testMode: true,
    };

    beforeEach(() => {
      uspsProvider = new UspsProvider(uspsConfig);
    });

    describe('getRates', () => {
      it('should return Priority Mail rate', async () => {
        const rates = await uspsProvider.getRates(
          mockFromAddress,
          mockToAddress,
          mockPackage,
        );

        const priorityRate = rates.find(r => r.serviceName.includes('Priority Mail'));
        expect(priorityRate).toBeDefined();
        expect(priorityRate?.carrier).toBe('USPS');
      });

      it('should return First Class for light packages', async () => {
        const rates = await uspsProvider.getRates(
          mockFromAddress,
          mockToAddress,
          mockLightPackage,
          [ServiceLevelEnum.GROUND],
        );

        const firstClassRate = rates.find(r => r.serviceName.includes('First Class'));
        expect(firstClassRate).toBeDefined();
        expect(firstClassRate!.totalRate).toBeLessThan(
          rates.find(r => r.serviceName.includes('Priority'))!.totalRate,
        );
      });

      it('should not return First Class for heavy packages', async () => {
        const heavyPackage = { ...mockPackage, weight: 20 };
        const rates = await uspsProvider.getRates(
          mockFromAddress,
          mockToAddress,
          heavyPackage,
          [ServiceLevelEnum.GROUND],
        );

        const firstClassRate = rates.find(r => r.serviceName.includes('First Class'));
        expect(firstClassRate).toBeUndefined();
      });

      it('should return Express rate for two-day service', async () => {
        const rates = await uspsProvider.getRates(
          mockFromAddress,
          mockToAddress,
          mockPackage,
          [ServiceLevelEnum.TWO_DAY],
        );

        expect(rates.length).toBeGreaterThanOrEqual(1);
        expect(rates[0].serviceName).toContain('Express');
        expect(rates[0].guaranteedDelivery).toBe(true);
      });

      it('should return international rate for international destinations', async () => {
        const rates = await uspsProvider.getRates(
          mockFromAddress,
          mockInternationalAddress,
          mockPackage,
          [ServiceLevelEnum.INTERNATIONAL],
        );

        expect(rates.length).toBeGreaterThan(0);
        expect(rates[0].serviceName).toContain('International');
      });

      it('should be cheaper than other carriers for light packages', async () => {
        const uspsRates = await uspsProvider.getRates(
          mockFromAddress,
          mockToAddress,
          mockLightPackage,
        );

        const fedexProvider = new FedexProvider({
          apiKey: 'test',
          apiSecret: 'test',
          accountNumber: 'test',
          meterNumber: 'test',
        });

        const fedexRates = await fedexProvider.getRates(
          mockFromAddress,
          mockToAddress,
          mockLightPackage,
        );

        const uspsGround = uspsRates.find(r => r.serviceLevel === ServiceLevelEnum.GROUND);
        const fedexGround = fedexRates.find(r => r.serviceLevel === ServiceLevelEnum.GROUND);

        // USPS is typically cheaper for light packages
        expect(uspsGround!.totalRate).toBeLessThan(fedexGround!.totalRate);
      });
    });

    describe('createLabel', () => {
      it('should generate USPS tracking number format', async () => {
        const label = await uspsProvider.createLabel(
          mockFromAddress,
          mockToAddress,
          mockPackage,
          ServiceLevelEnum.GROUND,
        );

        expect(label.trackingNumber).toBeDefined();
        expect(label.trackingNumber.startsWith('94')).toBe(true);
        expect(label.labelUrl).toContain('usps.com');
      });

      it('should include signature and insurance costs', async () => {
        const labelWithOptions = await uspsProvider.createLabel(
          mockFromAddress,
          mockToAddress,
          mockPackage,
          ServiceLevelEnum.GROUND,
          { insurance: 500, signature: true },
        );

        const labelBasic = await uspsProvider.createLabel(
          mockFromAddress,
          mockToAddress,
          mockPackage,
          ServiceLevelEnum.GROUND,
        );

        expect(labelWithOptions.cost).toBeGreaterThan(labelBasic.cost);
      });
    });

    describe('trackShipment', () => {
      it('should return tracking events', async () => {
        const tracking = await uspsProvider.trackShipment('9400111899223100001234');

        expect(tracking.trackingNumber).toBe('9400111899223100001234');
        expect(tracking.events.length).toBeGreaterThan(0);
        expect(tracking.events[0].description).toBeDefined();
      });
    });

    describe('validateAddress', () => {
      it('should validate US addresses', async () => {
        const result = await uspsProvider.validateAddress(mockFromAddress);
        expect(result.valid).toBe(true);
      });

      it('should detect missing required fields', async () => {
        const invalidAddress = { ...mockFromAddress, state: '' };
        const result = await uspsProvider.validateAddress(invalidAddress);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('State required');
      });
    });
  });

  // ==================== DHL Provider Tests ====================

  describe('DhlProvider', () => {
    let dhlProvider: DhlProvider;

    const dhlConfig = {
      apiKey: 'test-api-key',
      apiSecret: 'test-api-secret',
      accountNumber: '12345678',
      testMode: true,
    };

    beforeEach(() => {
      dhlProvider = new DhlProvider(dhlConfig);
    });

    describe('getRates', () => {
      it('should return fallback rates when credentials not configured', async () => {
        const providerWithoutCredentials = new DhlProvider({
          apiKey: '',
          apiSecret: '',
          accountNumber: '',
          testMode: true,
        });

        // DHL provider returns fallback rates when not configured instead of throwing
        const rates = await providerWithoutCredentials.getRates(
          mockFromAddress,
          mockInternationalAddress,
          mockPackage,
        );

        expect(rates).toBeDefined();
        expect(Array.isArray(rates)).toBe(true);
        expect(rates.length).toBeGreaterThan(0);
        expect(rates[0].carrier).toBe('DHL');
      });

      it('should return international rates', async () => {
        const mockTokenResponse = {
          ok: true,
          json: () => Promise.resolve({
            access_token: 'test-token',
            expires_in: 3600,
          }),
        };

        const mockRateResponse = {
          ok: true,
          json: () => Promise.resolve({
            products: [
              {
                productName: 'EXPRESS WORLDWIDE',
                productCode: 'P',
                totalPrice: [{ price: 75.50, priceCurrency: 'USD' }],
                weight: { volumetric: 2, provided: 2.27 },
                deliveryCapabilities: {
                  deliveryTypeCode: 'DD',
                  estimatedDeliveryDateAndTime: '2024-12-25T18:00:00',
                },
              },
            ],
          }),
        };

        (global.fetch as jest.Mock)
          .mockResolvedValueOnce(mockTokenResponse)
          .mockResolvedValueOnce(mockRateResponse);

        const rates = await dhlProvider.getRates(
          mockFromAddress,
          mockInternationalAddress,
          mockPackage,
        );

        expect(rates).toBeDefined();
        expect(Array.isArray(rates)).toBe(true);
      });

      it('should handle API errors gracefully by returning fallback rates', async () => {
        const mockTokenResponse = {
          ok: true,
          json: () => Promise.resolve({
            access_token: 'test-token',
            expires_in: 3600,
          }),
        };

        const mockErrorResponse = {
          ok: false,
          statusText: 'Internal Server Error',
          text: () => Promise.resolve('Internal Server Error'),
        };

        (global.fetch as jest.Mock)
          .mockResolvedValueOnce(mockTokenResponse)
          .mockResolvedValueOnce(mockErrorResponse);

        // DHL provider returns fallback rates on API errors instead of throwing
        const rates = await dhlProvider.getRates(mockFromAddress, mockInternationalAddress, mockPackage);

        expect(rates).toBeDefined();
        expect(Array.isArray(rates)).toBe(true);
        expect(rates.length).toBeGreaterThan(0);
        expect(rates[0].carrier).toBe('DHL');
      });
    });

    describe('service level mapping', () => {
      it('should map DHL product codes to service levels correctly', async () => {
        const mockTokenResponse = {
          ok: true,
          json: () => Promise.resolve({
            access_token: 'test-token',
            expires_in: 3600,
          }),
        };

        const mockRateResponse = {
          ok: true,
          json: () => Promise.resolve({
            products: [
              {
                productName: 'EXPRESS 12:00',
                productCode: 'P',
                totalPrice: [{ price: 50.00, priceCurrency: 'USD' }],
                weight: { volumetric: 2, provided: 2.27 },
              },
              {
                productName: 'EXPRESS WORLDWIDE',
                productCode: 'G',
                totalPrice: [{ price: 75.00, priceCurrency: 'USD' }],
                weight: { volumetric: 2, provided: 2.27 },
              },
            ],
          }),
        };

        (global.fetch as jest.Mock)
          .mockResolvedValueOnce(mockTokenResponse)
          .mockResolvedValueOnce(mockRateResponse);

        const rates = await dhlProvider.getRates(
          mockFromAddress,
          mockInternationalAddress,
          mockPackage,
        );

        const expressRate = rates.find(r => r.serviceName.includes('EXPRESS'));
        expect(expressRate).toBeDefined();
      });
    });
  });

  // ==================== Cross-Provider Comparison Tests ====================

  describe('Cross-Provider Rate Comparison', () => {
    it('should return consistent rate structure across all providers', async () => {
      const fedex = new FedexProvider({
        apiKey: 'test',
        apiSecret: 'test',
        accountNumber: 'test',
        meterNumber: 'test',
      });

      const usps = new UspsProvider({
        apiKey: 'test',
        accountNumber: 'test',
      });

      const fedexRates = await fedex.getRates(mockFromAddress, mockToAddress, mockPackage);
      const uspsRates = await usps.getRates(mockFromAddress, mockToAddress, mockPackage);

      // Verify all rates have required fields
      [...fedexRates, ...uspsRates].forEach(rate => {
        expect(rate).toHaveProperty('carrier');
        expect(rate).toHaveProperty('serviceName');
        expect(rate).toHaveProperty('serviceLevel');
        expect(rate).toHaveProperty('totalRate');
        expect(rate).toHaveProperty('baseRate');
        expect(rate).toHaveProperty('guaranteedDelivery');
        expect(typeof rate.totalRate).toBe('number');
        expect(rate.totalRate).toBeGreaterThan(0);
      });
    });

    it('should return consistent label structure across providers', async () => {
      const fedex = new FedexProvider({
        apiKey: 'test',
        apiSecret: 'test',
        accountNumber: 'test',
        meterNumber: 'test',
      });

      const usps = new UspsProvider({
        apiKey: 'test',
        accountNumber: 'test',
      });

      const fedexLabel = await fedex.createLabel(
        mockFromAddress,
        mockToAddress,
        mockPackage,
        ServiceLevelEnum.GROUND,
      );

      const uspsLabel = await usps.createLabel(
        mockFromAddress,
        mockToAddress,
        mockPackage,
        ServiceLevelEnum.GROUND,
      );

      // Verify all labels have required fields
      [fedexLabel, uspsLabel].forEach(label => {
        expect(label).toHaveProperty('trackingNumber');
        expect(label).toHaveProperty('labelUrl');
        expect(label).toHaveProperty('labelFormat');
        expect(label).toHaveProperty('cost');
        expect(typeof label.trackingNumber).toBe('string');
        expect(label.trackingNumber.length).toBeGreaterThan(0);
      });
    });

    it('should return consistent tracking structure across providers', async () => {
      const fedex = new FedexProvider({
        apiKey: 'test',
        apiSecret: 'test',
        accountNumber: 'test',
        meterNumber: 'test',
      });

      const usps = new UspsProvider({
        apiKey: 'test',
        accountNumber: 'test',
      });

      const fedexTracking = await fedex.trackShipment('123456789012');
      const uspsTracking = await usps.trackShipment('9400111899223100001234');

      // Verify all tracking responses have required fields
      [fedexTracking, uspsTracking].forEach(tracking => {
        expect(tracking).toHaveProperty('trackingNumber');
        expect(tracking).toHaveProperty('status');
        expect(tracking).toHaveProperty('events');
        expect(Array.isArray(tracking.events)).toBe(true);
      });
    });
  });
});
