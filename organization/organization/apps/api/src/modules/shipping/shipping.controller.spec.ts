import { Test, TestingModule } from '@nestjs/testing';
import { ShippingController } from './shipping.controller';
import { ShippingService } from './shipping.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
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
  PackageTypeEnum,
} from './dto/shipping.dto';
import { RateQuote } from './providers/shipping-provider.interface';

describe('ShippingController', () => {
  let controller: ShippingController;
  let service: ShippingService;

  const mockShippingService = {
    calculateRates: jest.fn(),
    compareRates: jest.fn(),
    clearRateCache: jest.fn(),
    calculatePackageDimensions: jest.fn(),
    createShipment: jest.fn(),
    trackShipment: jest.fn(),
    createReturnLabel: jest.fn(),
    handleDeliveryConfirmation: jest.fn(),
    createProvider: jest.fn(),
    updateProvider: jest.fn(),
    getProviders: jest.fn(),
    createZone: jest.fn(),
    updateZone: jest.fn(),
    getZones: jest.fn(),
    createRule: jest.fn(),
    updateRule: jest.fn(),
    getRules: jest.fn(),
    selectOptimalWarehouse: jest.fn(),
  };

  const mockAddress = {
    name: 'John Doe',
    street1: '123 Main St',
    city: 'New York',
    state: 'NY',
    postalCode: '10001',
    country: 'US',
  };

  const mockPackage = {
    type: PackageTypeEnum.SMALL_PACKAGE,
    weight: 5,
    length: 10,
    width: 8,
    height: 4,
  };

  const mockRateQuote: RateQuote = {
    carrier: 'UPS',
    serviceName: 'UPS Ground',
    serviceLevel: ServiceLevelEnum.GROUND,
    baseRate: 8.99,
    totalRate: 9.99,
    fuelSurcharge: 1.00,
    estimatedDays: 5,
    guaranteedDelivery: false,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShippingController],
      providers: [
        {
          provide: ShippingService,
          useValue: mockShippingService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ShippingController>(ShippingController);
    service = module.get<ShippingService>(ShippingService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ==================== Rate Calculation Tests ====================

  describe('calculateRates', () => {
    const calculateRateDto: CalculateRateDto = {
      fromAddress: mockAddress,
      toAddress: { ...mockAddress, postalCode: '90210', state: 'CA', city: 'Beverly Hills' },
      package: mockPackage,
    };

    it('should calculate shipping rates successfully', async () => {
      const mockRates: RateQuote[] = [
        mockRateQuote,
        { ...mockRateQuote, carrier: 'FEDEX', serviceName: 'FedEx Ground', totalRate: 10.99 },
      ];

      mockShippingService.calculateRates.mockResolvedValue(mockRates);

      const result = await controller.calculateRates(calculateRateDto);

      expect(result).toEqual(mockRates);
      expect(mockShippingService.calculateRates).toHaveBeenCalledWith(calculateRateDto);
      expect(mockShippingService.calculateRates).toHaveBeenCalledTimes(1);
    });

    it('should handle empty rates response', async () => {
      mockShippingService.calculateRates.mockResolvedValue([]);

      const result = await controller.calculateRates(calculateRateDto);

      expect(result).toEqual([]);
    });

    it('should calculate rates with specific carriers', async () => {
      const dtoWithCarriers = {
        ...calculateRateDto,
        carriers: [ShippingCarrierEnum.UPS, ShippingCarrierEnum.FEDEX],
      };

      mockShippingService.calculateRates.mockResolvedValue([mockRateQuote]);

      await controller.calculateRates(dtoWithCarriers);

      expect(mockShippingService.calculateRates).toHaveBeenCalledWith(dtoWithCarriers);
    });

    it('should calculate rates with specific service levels', async () => {
      const dtoWithServiceLevels = {
        ...calculateRateDto,
        serviceLevels: [ServiceLevelEnum.GROUND, ServiceLevelEnum.TWO_DAY],
      };

      mockShippingService.calculateRates.mockResolvedValue([mockRateQuote]);

      await controller.calculateRates(dtoWithServiceLevels);

      expect(mockShippingService.calculateRates).toHaveBeenCalledWith(dtoWithServiceLevels);
    });
  });

  describe('compareRates', () => {
    it('should compare rates with cart total for free shipping check', async () => {
      const compareResult = {
        rates: [mockRateQuote],
        freeShippingEligible: true,
        freeShippingThreshold: 50,
        amountNeededForFreeShipping: undefined,
      };

      mockShippingService.compareRates.mockResolvedValue(compareResult);

      const rateRequest: CalculateRateDto = {
        fromAddress: mockAddress,
        toAddress: mockAddress,
        package: mockPackage,
      };

      const result = await controller.compareRates({ rateRequest, cartTotal: 75 });

      expect(result).toEqual(compareResult);
      expect(mockShippingService.compareRates).toHaveBeenCalledWith(rateRequest, 75);
    });

    it('should compare rates without cart total', async () => {
      const compareResult = {
        rates: [mockRateQuote],
        freeShippingEligible: false,
      };

      mockShippingService.compareRates.mockResolvedValue(compareResult);

      const rateRequest: CalculateRateDto = {
        fromAddress: mockAddress,
        toAddress: mockAddress,
        package: mockPackage,
      };

      const result = await controller.compareRates({ rateRequest });

      expect(result).toEqual(compareResult);
      expect(mockShippingService.compareRates).toHaveBeenCalledWith(rateRequest, undefined);
    });

    it('should indicate amount needed for free shipping', async () => {
      const compareResult = {
        rates: [mockRateQuote],
        freeShippingEligible: false,
        freeShippingThreshold: 50,
        amountNeededForFreeShipping: 25,
      };

      mockShippingService.compareRates.mockResolvedValue(compareResult);

      const rateRequest: CalculateRateDto = {
        fromAddress: mockAddress,
        toAddress: mockAddress,
        package: mockPackage,
      };

      const result = await controller.compareRates({ rateRequest, cartTotal: 25 });

      expect(result.amountNeededForFreeShipping).toBe(25);
    });
  });

  describe('clearRateCache', () => {
    it('should clear rate cache successfully', async () => {
      mockShippingService.clearRateCache.mockResolvedValue(undefined);

      const result = await controller.clearRateCache();

      expect(result).toEqual({ message: 'Rate cache cleared successfully' });
      expect(mockShippingService.clearRateCache).toHaveBeenCalled();
    });
  });

  describe('calculatePackageDimensions', () => {
    it('should calculate package dimensions from products', async () => {
      const dimensions = {
        weight: 10,
        length: 15,
        width: 12,
        height: 8,
        value: 149.99,
      };

      mockShippingService.calculatePackageDimensions.mockResolvedValue(dimensions);

      const result = await controller.calculatePackageDimensions({
        productIds: ['product-1', 'product-2'],
      });

      expect(result).toEqual(dimensions);
      expect(mockShippingService.calculatePackageDimensions).toHaveBeenCalledWith([
        'product-1',
        'product-2',
      ]);
    });
  });

  // ==================== Shipment & Label Tests ====================

  describe('createShipment', () => {
    const createShipmentDto: CreateShipmentDto = {
      orderId: 'order-123',
      carrier: ShippingCarrierEnum.UPS,
      serviceLevel: ServiceLevelEnum.GROUND,
      fromAddress: mockAddress,
      toAddress: { ...mockAddress, postalCode: '90210' },
      package: mockPackage,
    };

    it('should create a shipment and return label', async () => {
      const mockShipment = {
        id: 'shipment-123',
        trackingNumber: '1Z999AA10123456784',
        labelUrl: 'https://example.com/label.pdf',
        status: 'LABEL_CREATED',
        ...createShipmentDto,
      };

      mockShippingService.createShipment.mockResolvedValue(mockShipment);

      const result = await controller.createShipment(createShipmentDto);

      expect(result).toEqual(mockShipment);
      expect(result.trackingNumber).toBeDefined();
      expect(result.labelUrl).toBeDefined();
      expect(mockShippingService.createShipment).toHaveBeenCalledWith(createShipmentDto);
    });

    it('should create shipment with insurance and signature', async () => {
      const dtoWithOptions = {
        ...createShipmentDto,
        insurance: 100,
        signature: true,
      };

      const mockShipment = {
        id: 'shipment-123',
        trackingNumber: '1Z999AA10123456784',
        labelUrl: 'https://example.com/label.pdf',
        insurance: 100,
        signature: true,
      };

      mockShippingService.createShipment.mockResolvedValue(mockShipment);

      const result = await controller.createShipment(dtoWithOptions);

      expect(result.insurance).toBe(100);
      expect(result.signature).toBe(true);
    });

    it('should create international shipment with customs info', async () => {
      const internationalDto = {
        ...createShipmentDto,
        toAddress: { ...mockAddress, country: 'CA', postalCode: 'M5V 1J2' },
        customsDescription: 'Electronics',
        customsValue: 499.99,
      };

      const mockShipment = {
        id: 'shipment-123',
        trackingNumber: '1Z999AA10123456784',
        isInternational: true,
        customsValue: 499.99,
      };

      mockShippingService.createShipment.mockResolvedValue(mockShipment);

      const result = await controller.createShipment(internationalDto);

      expect(result.isInternational).toBe(true);
    });
  });

  describe('trackShipment', () => {
    it('should track shipment by tracking number', async () => {
      const trackDto: TrackShipmentDto = {
        trackingNumber: '1Z999AA10123456784',
      };

      const trackingInfo = {
        trackingNumber: '1Z999AA10123456784',
        status: 'IN_TRANSIT',
        events: [
          {
            timestamp: new Date(),
            status: 'IN_TRANSIT',
            description: 'Package departed facility',
            location: 'New York, NY',
          },
        ],
        estimatedDelivery: new Date('2024-12-25'),
      };

      mockShippingService.trackShipment.mockResolvedValue(trackingInfo);

      const result = await controller.trackShipment(trackDto);

      expect(result).toEqual(trackingInfo);
      expect(result.trackingNumber).toBe('1Z999AA10123456784');
      expect(result.events).toHaveLength(1);
    });

    it('should track shipment with specific carrier', async () => {
      const trackDto: TrackShipmentDto = {
        trackingNumber: '1Z999AA10123456784',
        carrier: ShippingCarrierEnum.UPS,
      };

      mockShippingService.trackShipment.mockResolvedValue({
        trackingNumber: '1Z999AA10123456784',
        status: 'DELIVERED',
        events: [],
      });

      await controller.trackShipment(trackDto);

      expect(mockShippingService.trackShipment).toHaveBeenCalledWith(trackDto);
    });
  });

  // ==================== Return Labels Tests ====================

  describe('createReturnLabel', () => {
    it('should create return label for shipment', async () => {
      const returnLabelDto: CreateReturnLabelDto = {
        shipmentId: 'shipment-123',
        orderId: 'order-123',
        reason: 'Customer return',
      };

      const returnLabel = {
        id: 'return-123',
        trackingNumber: '1Z999AA10987654321',
        labelUrl: 'https://example.com/return-label.pdf',
        expiresAt: new Date('2025-01-30'),
      };

      mockShippingService.createReturnLabel.mockResolvedValue(returnLabel);

      const result = await controller.createReturnLabel(returnLabelDto);

      expect(result).toEqual(returnLabel);
      expect(result.trackingNumber).toBeDefined();
      expect(mockShippingService.createReturnLabel).toHaveBeenCalledWith(returnLabelDto);
    });

    it('should create return label with custom validity period', async () => {
      const returnLabelDto: CreateReturnLabelDto = {
        shipmentId: 'shipment-123',
        orderId: 'order-123',
        validDays: 60,
      };

      mockShippingService.createReturnLabel.mockResolvedValue({
        id: 'return-123',
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      });

      await controller.createReturnLabel(returnLabelDto);

      expect(mockShippingService.createReturnLabel).toHaveBeenCalledWith(returnLabelDto);
    });
  });

  // ==================== Delivery Confirmation Webhook Tests ====================

  describe('handleDeliveryConfirmation', () => {
    it('should handle delivery confirmation webhook', async () => {
      const webhookDto: DeliveryConfirmationWebhookDto = {
        trackingNumber: '1Z999AA10123456784',
        status: 'DELIVERED',
        deliveredAt: '2024-12-25T14:30:00Z',
        signedBy: 'J. Smith',
        location: 'Front Door',
      };

      mockShippingService.handleDeliveryConfirmation.mockResolvedValue(undefined);

      await controller.handleDeliveryConfirmation(webhookDto);

      expect(mockShippingService.handleDeliveryConfirmation).toHaveBeenCalledWith(webhookDto);
    });

    it('should handle delivery confirmation with photo proof', async () => {
      const webhookDto: DeliveryConfirmationWebhookDto = {
        trackingNumber: '1Z999AA10123456784',
        status: 'DELIVERED',
        deliveredAt: '2024-12-25T14:30:00Z',
        photo: 'https://example.com/delivery-photo.jpg',
      };

      mockShippingService.handleDeliveryConfirmation.mockResolvedValue(undefined);

      await controller.handleDeliveryConfirmation(webhookDto);

      expect(mockShippingService.handleDeliveryConfirmation).toHaveBeenCalledWith(webhookDto);
    });
  });

  // ==================== Provider Management Tests ====================

  describe('createProvider', () => {
    it('should create shipping provider', async () => {
      const createProviderDto: CreateShippingProviderDto = {
        carrier: ShippingCarrierEnum.UPS,
        name: 'UPS Production',
        apiKey: 'api-key-123',
        apiSecret: 'api-secret-456',
        accountNumber: '12345678',
      };

      const mockProvider = {
        id: 'provider-123',
        ...createProviderDto,
        isActive: true,
        testMode: false,
      };

      mockShippingService.createProvider.mockResolvedValue(mockProvider);

      const result = await controller.createProvider(createProviderDto);

      expect(result).toEqual(mockProvider);
      expect(mockShippingService.createProvider).toHaveBeenCalledWith(createProviderDto);
    });

    it('should create provider in test mode', async () => {
      const createProviderDto: CreateShippingProviderDto = {
        carrier: ShippingCarrierEnum.FEDEX,
        name: 'FedEx Test',
        testMode: true,
      };

      mockShippingService.createProvider.mockResolvedValue({
        id: 'provider-123',
        ...createProviderDto,
        testMode: true,
      });

      const result = await controller.createProvider(createProviderDto);

      expect(result.testMode).toBe(true);
    });
  });

  describe('updateProvider', () => {
    it('should update shipping provider', async () => {
      const updateDto: UpdateShippingProviderDto = {
        name: 'Updated Provider Name',
        isActive: false,
      };

      const updatedProvider = {
        id: 'provider-123',
        carrier: ShippingCarrierEnum.UPS,
        name: 'Updated Provider Name',
        isActive: false,
      };

      mockShippingService.updateProvider.mockResolvedValue(updatedProvider);

      const result = await controller.updateProvider('provider-123', updateDto);

      expect(result).toEqual(updatedProvider);
      expect(mockShippingService.updateProvider).toHaveBeenCalledWith('provider-123', updateDto);
    });
  });

  describe('getProviders', () => {
    it('should return all shipping providers', async () => {
      const providers = [
        { id: 'provider-1', carrier: ShippingCarrierEnum.UPS, name: 'UPS' },
        { id: 'provider-2', carrier: ShippingCarrierEnum.FEDEX, name: 'FedEx' },
      ];

      mockShippingService.getProviders.mockResolvedValue(providers);

      const result = await controller.getProviders();

      expect(result).toEqual(providers);
      expect(result).toHaveLength(2);
    });
  });

  // ==================== Shipping Zones Tests ====================

  describe('createZone', () => {
    it('should create shipping zone', async () => {
      const createZoneDto: CreateShippingZoneDto = {
        providerId: 'provider-123',
        name: 'US West Coast',
        countries: ['US'],
        states: ['CA', 'WA', 'OR'],
      };

      const mockZone = {
        id: 'zone-123',
        ...createZoneDto,
        isActive: true,
      };

      mockShippingService.createZone.mockResolvedValue(mockZone);

      const result = await controller.createZone(createZoneDto);

      expect(result).toEqual(mockZone);
      expect(mockShippingService.createZone).toHaveBeenCalledWith(createZoneDto);
    });
  });

  describe('updateZone', () => {
    it('should update shipping zone', async () => {
      const updateDto: UpdateShippingZoneDto = {
        name: 'Updated Zone',
        isActive: false,
      };

      mockShippingService.updateZone.mockResolvedValue({
        id: 'zone-123',
        name: 'Updated Zone',
        isActive: false,
      });

      const result = await controller.updateZone('zone-123', updateDto);

      expect(result.name).toBe('Updated Zone');
      expect(mockShippingService.updateZone).toHaveBeenCalledWith('zone-123', updateDto);
    });
  });

  describe('getZones', () => {
    it('should return all zones', async () => {
      const zones = [
        { id: 'zone-1', name: 'West Coast' },
        { id: 'zone-2', name: 'East Coast' },
      ];

      mockShippingService.getZones.mockResolvedValue(zones);

      const result = await controller.getZones();

      expect(result).toEqual(zones);
    });

    it('should filter zones by provider', async () => {
      const zones = [{ id: 'zone-1', name: 'UPS Zone', providerId: 'provider-123' }];

      mockShippingService.getZones.mockResolvedValue(zones);

      const result = await controller.getZones('provider-123');

      expect(mockShippingService.getZones).toHaveBeenCalledWith('provider-123');
    });
  });

  // ==================== Shipping Rules Tests ====================

  describe('createRule', () => {
    it('should create shipping rule', async () => {
      const createRuleDto: CreateShippingRuleDto = {
        zoneId: 'zone-123',
        name: 'Standard Ground',
        baseRate: 5.99,
        perPoundRate: 0.50,
        minWeight: 0,
        maxWeight: 70,
      };

      const mockRule = {
        id: 'rule-123',
        ...createRuleDto,
        isActive: true,
      };

      mockShippingService.createRule.mockResolvedValue(mockRule);

      const result = await controller.createRule(createRuleDto);

      expect(result).toEqual(mockRule);
      expect(mockShippingService.createRule).toHaveBeenCalledWith(createRuleDto);
    });

    it('should create rule with free shipping threshold', async () => {
      const createRuleDto: CreateShippingRuleDto = {
        zoneId: 'zone-123',
        name: 'Free Shipping Rule',
        baseRate: 0,
        freeThreshold: 50,
      };

      mockShippingService.createRule.mockResolvedValue({
        id: 'rule-123',
        ...createRuleDto,
        freeThreshold: 50,
      });

      const result = await controller.createRule(createRuleDto);

      expect(result.freeThreshold).toBe(50);
    });
  });

  describe('updateRule', () => {
    it('should update shipping rule', async () => {
      const updateDto: UpdateShippingRuleDto = {
        baseRate: 7.99,
        isActive: false,
      };

      mockShippingService.updateRule.mockResolvedValue({
        id: 'rule-123',
        baseRate: 7.99,
        isActive: false,
      });

      const result = await controller.updateRule('rule-123', updateDto);

      expect(result.baseRate).toBe(7.99);
      expect(mockShippingService.updateRule).toHaveBeenCalledWith('rule-123', updateDto);
    });
  });

  describe('getRules', () => {
    it('should return all rules', async () => {
      const rules = [
        { id: 'rule-1', name: 'Ground' },
        { id: 'rule-2', name: 'Express' },
      ];

      mockShippingService.getRules.mockResolvedValue(rules);

      const result = await controller.getRules();

      expect(result).toEqual(rules);
    });

    it('should filter rules by zone', async () => {
      mockShippingService.getRules.mockResolvedValue([]);

      await controller.getRules('zone-123');

      expect(mockShippingService.getRules).toHaveBeenCalledWith('zone-123');
    });
  });

  // ==================== Multi-Warehouse Selection Tests ====================

  describe('selectOptimalWarehouse', () => {
    it('should select optimal warehouse based on shipping cost', async () => {
      const warehouseId = 'warehouse-1';

      mockShippingService.selectOptimalWarehouse.mockResolvedValue(warehouseId);

      const result = await controller.selectOptimalWarehouse({
        toAddress: mockAddress,
        productIds: ['product-1', 'product-2'],
      });

      expect(result).toBe(warehouseId);
      expect(mockShippingService.selectOptimalWarehouse).toHaveBeenCalledWith(
        mockAddress,
        ['product-1', 'product-2'],
      );
    });
  });
});
