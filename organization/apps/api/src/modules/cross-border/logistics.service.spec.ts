import { Test, TestingModule } from '@nestjs/testing';
import { LogisticsService } from './logistics.service';

describe('LogisticsService', () => {
  let service: LogisticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LogisticsService],
    }).compile();

    service = module.get<LogisticsService>(LogisticsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getShippingQuotes', () => {
    const defaultParams = {
      originCountry: 'US',
      destinationCountry: 'GB',
      weight: 5,
      dimensions: { length: 30, width: 20, height: 15 },
      value: 500,
      isCommercial: true,
    };

    it('should return quotes from all carriers', async () => {
      const quotes = await service.getShippingQuotes(defaultParams);

      expect(quotes).toHaveLength(3);
      const carriers = quotes.map((q) => q.carrier);
      expect(carriers).toContain('DHL');
      expect(carriers).toContain('FedEx');
      expect(carriers).toContain('UPS');
    });

    it('should return quotes sorted by cost ascending', async () => {
      const quotes = await service.getShippingQuotes(defaultParams);

      for (let i = 0; i < quotes.length - 1; i++) {
        expect(quotes[i].cost).toBeLessThanOrEqual(quotes[i + 1].cost);
      }
    });

    it('should include all required fields in each quote', async () => {
      const quotes = await service.getShippingQuotes(defaultParams);

      quotes.forEach((quote) => {
        expect(quote).toHaveProperty('carrier');
        expect(quote).toHaveProperty('service');
        expect(quote).toHaveProperty('estimatedDays');
        expect(quote).toHaveProperty('cost');
        expect(quote).toHaveProperty('currency');
        expect(quote).toHaveProperty('includesDuties');
        expect(quote).toHaveProperty('tracking');
        expect(quote).toHaveProperty('insurance');
      });
    });

    it('should calculate shipping cost based on weight and value', async () => {
      const heavyParams = { ...defaultParams, weight: 10 };
      const heavyQuotes = await service.getShippingQuotes(heavyParams);

      const lightParams = { ...defaultParams, weight: 1 };
      const lightQuotes = await service.getShippingQuotes(lightParams);

      // Heavier packages should cost more
      const dhlHeavy = heavyQuotes.find((q) => q.carrier === 'DHL')!;
      const dhlLight = lightQuotes.find((q) => q.carrier === 'DHL')!;
      expect(dhlHeavy.cost).toBeGreaterThan(dhlLight.cost);
    });

    it('should include value surcharge in shipping cost', async () => {
      const lowValueParams = { ...defaultParams, value: 100 };
      const lowValueQuotes = await service.getShippingQuotes(lowValueParams);

      const highValueParams = { ...defaultParams, value: 1000 };
      const highValueQuotes = await service.getShippingQuotes(highValueParams);

      const dhlLow = lowValueQuotes.find((q) => q.carrier === 'DHL')!;
      const dhlHigh = highValueQuotes.find((q) => q.carrier === 'DHL')!;
      expect(dhlHigh.cost).toBeGreaterThan(dhlLow.cost);
    });

    it('should estimate transit days based on origin and destination', async () => {
      const usToGbQuotes = await service.getShippingQuotes(defaultParams);
      const usToAuParams = { ...defaultParams, destinationCountry: 'AU' };
      const usToAuQuotes = await service.getShippingQuotes(usToAuParams);

      // US to AU should take longer than US to GB
      const dhlGb = usToGbQuotes.find((q) => q.carrier === 'DHL')!;
      const dhlAu = usToAuQuotes.find((q) => q.carrier === 'DHL')!;
      expect(dhlAu.estimatedDays).toBeGreaterThan(dhlGb.estimatedDays);
    });

    it('should use default transit days for unknown routes', async () => {
      const unknownRouteParams = {
        ...defaultParams,
        originCountry: 'XX',
        destinationCountry: 'YY',
      };

      const quotes = await service.getShippingQuotes(unknownRouteParams);

      quotes.forEach((quote) => {
        expect(quote.estimatedDays).toBeGreaterThan(0);
      });
    });

    it('should set currency to USD', async () => {
      const quotes = await service.getShippingQuotes(defaultParams);

      quotes.forEach((quote) => {
        expect(quote.currency).toBe('USD');
      });
    });

    it('should indicate UPS includes duties', async () => {
      const quotes = await service.getShippingQuotes(defaultParams);

      const upsQuote = quotes.find((q) => q.carrier === 'UPS')!;
      expect(upsQuote.includesDuties).toBe(true);

      const dhlQuote = quotes.find((q) => q.carrier === 'DHL')!;
      expect(dhlQuote.includesDuties).toBe(false);
    });

    it('should indicate all carriers have tracking and insurance', async () => {
      const quotes = await service.getShippingQuotes(defaultParams);

      quotes.forEach((quote) => {
        expect(quote.tracking).toBe(true);
        expect(quote.insurance).toBe(true);
      });
    });

    it('should return correct services for each carrier', async () => {
      const quotes = await service.getShippingQuotes(defaultParams);

      const dhl = quotes.find((q) => q.carrier === 'DHL')!;
      expect(dhl.service).toBe('Express Worldwide');

      const fedex = quotes.find((q) => q.carrier === 'FedEx')!;
      expect(fedex.service).toBe('International Priority');

      const ups = quotes.find((q) => q.carrier === 'UPS')!;
      expect(ups.service).toBe('Worldwide Express');
    });
  });

  describe('bookShipment', () => {
    const defaultBookingParams = {
      orderId: 'order-123',
      carrier: 'DHL',
      service: 'Express Worldwide',
      origin: { country: 'US', city: 'New York' },
      destination: { country: 'GB', city: 'London' },
      packages: [{ weight: 5, dimensions: { length: 30, width: 20, height: 15 } }],
    };

    it('should return booking confirmation with tracking number', async () => {
      const result = await service.bookShipment(defaultBookingParams);

      expect(result.orderId).toBe('order-123');
      expect(result.carrier).toBe('DHL');
      expect(result.service).toBe('Express Worldwide');
      expect(result.trackingNumber).toBeDefined();
      expect(result.trackingNumber).toMatch(/^DH\d{12}$/);
    });

    it('should generate carrier-specific tracking number prefix', async () => {
      const dhlResult = await service.bookShipment({
        ...defaultBookingParams,
        carrier: 'DHL',
      });
      expect(dhlResult.trackingNumber).toMatch(/^DH/);

      const fedexResult = await service.bookShipment({
        ...defaultBookingParams,
        carrier: 'FedEx',
      });
      expect(fedexResult.trackingNumber).toMatch(/^FE/);

      const upsResult = await service.bookShipment({
        ...defaultBookingParams,
        carrier: 'UPS',
      });
      expect(upsResult.trackingNumber).toMatch(/^UP/);
    });

    it('should generate shipping label', async () => {
      const result = await service.bookShipment(defaultBookingParams);

      expect(result.label).toBeDefined();
      expect(result.label).toContain('LABEL_order-123');
    });

    it('should generate commercial invoice', async () => {
      const result = await service.bookShipment(defaultBookingParams);

      expect(result.commercialInvoice).toBeDefined();
      expect(result.commercialInvoice).toContain('INVOICE_order-123');
    });

    it('should calculate estimated delivery date', async () => {
      const result = await service.bookShipment(defaultBookingParams);

      expect(result.estimatedDelivery).toBeInstanceOf(Date);
      expect(result.estimatedDelivery.getTime()).toBeGreaterThan(Date.now());
    });

    it('should estimate delivery based on service level', async () => {
      const expressResult = await service.bookShipment({
        ...defaultBookingParams,
        service: 'Express Worldwide',
      });

      const economyResult = await service.bookShipment({
        ...defaultBookingParams,
        service: 'Economy',
      });

      expect(economyResult.estimatedDelivery.getTime()).toBeGreaterThan(
        expressResult.estimatedDelivery.getTime(),
      );
    });
  });

  describe('trackShipment', () => {
    it('should return tracking info with events', async () => {
      const result = await service.trackShipment('DH123456789012');

      expect(result.trackingNumber).toBe('DH123456789012');
      expect(result.carrier).toBe('DHL');
      expect(result.status).toBe('IN_TRANSIT');
      expect(result.events).toBeDefined();
      expect(result.events.length).toBeGreaterThan(0);
    });

    it('should include estimated delivery date', async () => {
      const result = await service.trackShipment('DH123456789012');

      expect(result.estimatedDelivery).toBeInstanceOf(Date);
    });

    it('should include current location', async () => {
      const result = await service.trackShipment('DH123456789012');

      expect(result.location).toBeDefined();
    });

    it('should have events with required fields', async () => {
      const result = await service.trackShipment('DH123456789012');

      result.events.forEach((event) => {
        expect(event).toHaveProperty('timestamp');
        expect(event).toHaveProperty('status');
        expect(event).toHaveProperty('location');
        expect(event).toHaveProperty('description');
        expect(event.timestamp).toBeInstanceOf(Date);
      });
    });

    it('should have events in chronological order', async () => {
      const result = await service.trackShipment('DH123456789012');

      for (let i = 0; i < result.events.length - 1; i++) {
        expect(result.events[i].timestamp.getTime()).toBeLessThanOrEqual(
          result.events[i + 1].timestamp.getTime(),
        );
      }
    });

    it('should include customs clearance event', async () => {
      const result = await service.trackShipment('DH123456789012');

      const customsEvent = result.events.find((e) => e.status === 'CUSTOMS_CLEARANCE');
      expect(customsEvent).toBeDefined();
    });
  });

  describe('calculateConsolidation', () => {
    it('should calculate savings from consolidation', async () => {
      const shipments = [
        { weight: 2, cost: 40 },
        { weight: 3, cost: 50 },
        { weight: 5, cost: 80 },
      ];

      const result = await service.calculateConsolidation(shipments);

      expect(result.shipmentCount).toBe(3);
      expect(result.individualCost).toBe(170); // 40 + 50 + 80
      expect(result.consolidatedCost).toBe(50); // (2 + 3 + 5) * 5
      expect(result.savings).toBe(120); // 170 - 50
      expect(result.savingsPercentage).toBeCloseTo(70.59, 1); // (120 / 170) * 100
    });

    it('should handle single shipment', async () => {
      const shipments = [{ weight: 5, cost: 60 }];

      const result = await service.calculateConsolidation(shipments);

      expect(result.shipmentCount).toBe(1);
      expect(result.individualCost).toBe(60);
      expect(result.consolidatedCost).toBe(25); // 5 * 5
      expect(result.savings).toBe(35);
    });

    it('should handle empty shipments array', async () => {
      const result = await service.calculateConsolidation([]);

      expect(result.shipmentCount).toBe(0);
      expect(result.individualCost).toBe(0);
      expect(result.consolidatedCost).toBe(0);
      expect(result.savings).toBe(0);
      expect(result.savingsPercentage).toBeNaN(); // 0/0
    });

    it('should calculate consolidated cost at $5 per kg', async () => {
      const shipments = [
        { weight: 10, cost: 100 },
        { weight: 20, cost: 200 },
      ];

      const result = await service.calculateConsolidation(shipments);

      expect(result.consolidatedCost).toBe(150); // 30 kg * $5
    });

    it('should handle shipments with zero weight', async () => {
      const shipments = [
        { weight: 0, cost: 25 },
        { weight: 5, cost: 50 },
      ];

      const result = await service.calculateConsolidation(shipments);

      expect(result.consolidatedCost).toBe(25); // 5 * 5
    });

    it('should calculate savings percentage correctly', async () => {
      const shipments = [
        { weight: 4, cost: 100 },
        { weight: 6, cost: 100 },
      ];

      const result = await service.calculateConsolidation(shipments);

      // Individual: 200, Consolidated: 50 (10 kg * 5)
      // Savings: 150, Percentage: 75%
      expect(result.savingsPercentage).toBe(75);
    });
  });

  describe('estimateTransitDays (private method tested via getShippingQuotes)', () => {
    it('should apply express modifier (0.5x) for express services', async () => {
      // US -> GB base is 5 days, express should be 3 (5 * 0.5 = 2.5, ceiling = 3)
      const quotes = await service.getShippingQuotes({
        originCountry: 'US',
        destinationCountry: 'GB',
        weight: 5,
        dimensions: { length: 30, width: 20, height: 15 },
        value: 500,
        isCommercial: true,
      });

      const dhlExpress = quotes.find((q) => q.carrier === 'DHL')!;
      expect(dhlExpress.estimatedDays).toBe(3);
    });

    it('should apply priority modifier (0.8x) for priority services', async () => {
      const quotes = await service.getShippingQuotes({
        originCountry: 'US',
        destinationCountry: 'GB',
        weight: 5,
        dimensions: { length: 30, width: 20, height: 15 },
        value: 500,
        isCommercial: true,
      });

      const fedexPriority = quotes.find((q) => q.carrier === 'FedEx')!;
      // US -> GB base is 5, priority is 5 * 0.8 = 4
      expect(fedexPriority.estimatedDays).toBe(4);
    });
  });

  describe('calculateShippingCost (private method tested via getShippingQuotes)', () => {
    it('should use different base rates for each carrier', async () => {
      const quotes = await service.getShippingQuotes({
        originCountry: 'US',
        destinationCountry: 'GB',
        weight: 10, // Same weight
        dimensions: { length: 30, width: 20, height: 15 },
        value: 0, // No value surcharge
        isCommercial: true,
      });

      const dhlCost = quotes.find((q) => q.carrier === 'DHL')!.cost;
      const fedexCost = quotes.find((q) => q.carrier === 'FedEx')!.cost;
      const upsCost = quotes.find((q) => q.carrier === 'UPS')!.cost;

      // DHL rate is 8, FedEx is 7.5, UPS is 8.5
      // Cost = weight * rate + value * 0.01 + 25
      expect(dhlCost).toBe(105); // 10 * 8 + 0 + 25
      expect(fedexCost).toBe(100); // 10 * 7.5 + 0 + 25
      expect(upsCost).toBe(110); // 10 * 8.5 + 0 + 25
    });

    it('should include $25 base fee', async () => {
      const quotes = await service.getShippingQuotes({
        originCountry: 'US',
        destinationCountry: 'GB',
        weight: 0,
        dimensions: { length: 10, width: 10, height: 10 },
        value: 0,
        isCommercial: true,
      });

      const fedexCost = quotes.find((q) => q.carrier === 'FedEx')!.cost;
      // With 0 weight and 0 value, cost should just be base fee
      expect(fedexCost).toBe(25);
    });

    it('should apply 1% value surcharge', async () => {
      const lowValueQuotes = await service.getShippingQuotes({
        originCountry: 'US',
        destinationCountry: 'GB',
        weight: 1,
        dimensions: { length: 10, width: 10, height: 10 },
        value: 100,
        isCommercial: true,
      });

      const highValueQuotes = await service.getShippingQuotes({
        originCountry: 'US',
        destinationCountry: 'GB',
        weight: 1,
        dimensions: { length: 10, width: 10, height: 10 },
        value: 1100,
        isCommercial: true,
      });

      const lowDhl = lowValueQuotes.find((q) => q.carrier === 'DHL')!.cost;
      const highDhl = highValueQuotes.find((q) => q.carrier === 'DHL')!.cost;

      // Difference should be 1% of value difference (1000)
      expect(highDhl - lowDhl).toBe(10);
    });
  });

  describe('generateTrackingNumber (private method tested via bookShipment)', () => {
    it('should generate unique tracking numbers', async () => {
      const booking1 = await service.bookShipment({
        orderId: 'order-1',
        carrier: 'DHL',
        service: 'Express',
        origin: {},
        destination: {},
        packages: [],
      });

      const booking2 = await service.bookShipment({
        orderId: 'order-2',
        carrier: 'DHL',
        service: 'Express',
        origin: {},
        destination: {},
        packages: [],
      });

      expect(booking1.trackingNumber).not.toBe(booking2.trackingNumber);
    });

    it('should generate tracking number with 14 characters', async () => {
      const booking = await service.bookShipment({
        orderId: 'order-1',
        carrier: 'DHL',
        service: 'Express',
        origin: {},
        destination: {},
        packages: [],
      });

      // 2 prefix chars + 12 random digits = 14 total
      expect(booking.trackingNumber.length).toBe(14);
    });
  });

  describe('calculateEstimatedDelivery (private method tested via bookShipment)', () => {
    it('should estimate 3 days for Express Worldwide service', async () => {
      const booking = await service.bookShipment({
        orderId: 'order-1',
        carrier: 'DHL',
        service: 'Express Worldwide',
        origin: {},
        destination: {},
        packages: [],
      });

      const expectedDelivery = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      // Allow for slight time differences during test execution
      expect(booking.estimatedDelivery.getDate()).toBe(expectedDelivery.getDate());
    });

    it('should estimate 10 days for Economy service', async () => {
      const booking = await service.bookShipment({
        orderId: 'order-1',
        carrier: 'UPS',
        service: 'Economy',
        origin: {},
        destination: {},
        packages: [],
      });

      const expectedDelivery = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
      expect(booking.estimatedDelivery.getDate()).toBe(expectedDelivery.getDate());
    });

    it('should default to 7 days for unknown service', async () => {
      const booking = await service.bookShipment({
        orderId: 'order-1',
        carrier: 'Unknown',
        service: 'Unknown Service',
        origin: {},
        destination: {},
        packages: [],
      });

      const expectedDelivery = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      expect(booking.estimatedDelivery.getDate()).toBe(expectedDelivery.getDate());
    });
  });
});
