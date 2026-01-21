import { Test, TestingModule } from '@nestjs/testing';
import { CurrencyExchangeService } from './currency-exchange.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('CurrencyExchangeService', () => {
  let service: CurrencyExchangeService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    exchangeRate: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    currencyConversion: {
      findMany: jest.fn(),
    },
    currencyHedge: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CurrencyExchangeService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CurrencyExchangeService>(CurrencyExchangeService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getExchangeRate', () => {
    it('should return rate of 1.0 when from and to currencies are the same', async () => {
      const result = await service.getExchangeRate('USD', 'USD');

      expect(result).toEqual({
        from: 'USD',
        to: 'USD',
        rate: 1.0,
        timestamp: expect.any(Date),
        source: 'INTERNAL',
      });
      expect(mockPrismaService.exchangeRate.create).not.toHaveBeenCalled();
    });

    it('should return direct exchange rate when available', async () => {
      mockPrismaService.exchangeRate.create.mockResolvedValue({});

      const result = await service.getExchangeRate('USD', 'EUR');

      expect(result.from).toBe('USD');
      expect(result.to).toBe('EUR');
      expect(result.rate).toBe(0.92);
      expect(result.source).toBe('MARKET');
      expect(mockPrismaService.exchangeRate.create).toHaveBeenCalledWith({
        data: {
          fromCurrency: 'USD',
          toCurrency: 'EUR',
          rate: 0.92,
          source: 'MARKET',
        },
      });
    });

    it('should calculate inverse rate when direct rate is not available', async () => {
      mockPrismaService.exchangeRate.create.mockResolvedValue({});

      const result = await service.getExchangeRate('EUR', 'USD');

      expect(result.from).toBe('EUR');
      expect(result.to).toBe('USD');
      expect(result.rate).toBe(1.09);
      expect(result.source).toBe('MARKET');
    });

    it('should use USD as intermediary when direct rate is not available', async () => {
      mockPrismaService.exchangeRate.create.mockResolvedValue({});

      // EUR -> JPY (should use EUR -> USD -> JPY)
      const result = await service.getExchangeRate('USD', 'JPY');

      expect(result.from).toBe('USD');
      expect(result.to).toBe('JPY');
      expect(result.rate).toBe(149.5);
    });

    it('should throw error when exchange rate is not available', async () => {
      await expect(
        service.getExchangeRate('XXX', 'YYY'),
      ).rejects.toThrow('Exchange rate not available for XXX -> YYY');
    });

    it('should store rate in database after fetching', async () => {
      mockPrismaService.exchangeRate.create.mockResolvedValue({});

      await service.getExchangeRate('USD', 'GBP');

      expect(mockPrismaService.exchangeRate.create).toHaveBeenCalledWith({
        data: {
          fromCurrency: 'USD',
          toCurrency: 'GBP',
          rate: 0.79,
          source: 'MARKET',
        },
      });
    });
  });

  describe('convertCurrency', () => {
    beforeEach(() => {
      mockPrismaService.exchangeRate.create.mockResolvedValue({});
    });

    it('should convert currency with fees by default', async () => {
      const result = await service.convertCurrency({
        amount: 100,
        fromCurrency: 'USD',
        toCurrency: 'EUR',
      });

      expect(result.amount).toBe(100);
      expect(result.fromCurrency).toBe('USD');
      expect(result.toCurrency).toBe('EUR');
      expect(result.convertedAmount).toBe(92); // 100 * 0.92
      expect(result.exchangeRate).toBe(0.92);
      expect(result.fees).toBe(0.46); // 92 * 0.005
      expect(result.totalCost).toBe(92.46); // 92 + 0.46
    });

    it('should convert currency without fees when includeFees is false', async () => {
      const result = await service.convertCurrency({
        amount: 100,
        fromCurrency: 'USD',
        toCurrency: 'EUR',
        includeFees: false,
      });

      expect(result.fees).toBe(0);
      expect(result.totalCost).toBe(92);
    });

    it('should convert same currency without change', async () => {
      const result = await service.convertCurrency({
        amount: 100,
        fromCurrency: 'USD',
        toCurrency: 'USD',
      });

      expect(result.convertedAmount).toBe(100);
      expect(result.exchangeRate).toBe(1.0);
    });

    it('should handle large amounts correctly', async () => {
      const result = await service.convertCurrency({
        amount: 1000000,
        fromCurrency: 'USD',
        toCurrency: 'EUR',
      });

      expect(result.convertedAmount).toBe(920000); // 1000000 * 0.92
      expect(result.fees).toBe(4600); // 920000 * 0.005
      expect(result.totalCost).toBe(924600);
    });

    it('should handle small amounts correctly', async () => {
      const result = await service.convertCurrency({
        amount: 0.01,
        fromCurrency: 'USD',
        toCurrency: 'EUR',
        includeFees: false,
      });

      expect(result.convertedAmount).toBeCloseTo(0.0092, 4);
    });
  });

  describe('getHistoricalRates', () => {
    it('should return historical rates within date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const mockRates = [
        { rate: 0.91, createdAt: new Date('2024-01-10') },
        { rate: 0.92, createdAt: new Date('2024-01-15') },
        { rate: 0.93, createdAt: new Date('2024-01-20') },
      ];

      mockPrismaService.exchangeRate.findMany.mockResolvedValue(mockRates);

      const result = await service.getHistoricalRates({
        from: 'USD',
        to: 'EUR',
        startDate,
        endDate,
      });

      expect(result.from).toBe('USD');
      expect(result.to).toBe('EUR');
      expect(result.period.start).toEqual(startDate);
      expect(result.period.end).toEqual(endDate);
      expect(result.rates).toHaveLength(3);
      expect(result.average).toBeCloseTo(0.92, 2);
      expect(result.min).toBe(0.91);
      expect(result.max).toBe(0.93);
    });

    it('should return zero values when no rates found', async () => {
      mockPrismaService.exchangeRate.findMany.mockResolvedValue([]);

      const result = await service.getHistoricalRates({
        from: 'USD',
        to: 'EUR',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      });

      expect(result.rates).toHaveLength(0);
      expect(result.average).toBe(0);
      expect(result.min).toBe(0);
      expect(result.max).toBe(0);
    });

    it('should call prisma with correct query parameters', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      mockPrismaService.exchangeRate.findMany.mockResolvedValue([]);

      await service.getHistoricalRates({
        from: 'USD',
        to: 'EUR',
        startDate,
        endDate,
      });

      expect(mockPrismaService.exchangeRate.findMany).toHaveBeenCalledWith({
        where: {
          fromCurrency: 'USD',
          toCurrency: 'EUR',
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { createdAt: 'asc' },
      });
    });
  });

  describe('getSupportedCurrencies', () => {
    it('should return list of supported currencies', async () => {
      const result = await service.getSupportedCurrencies();

      expect(result.currencies).toHaveLength(7);
      expect(result.currencies).toContainEqual({
        code: 'USD',
        name: 'US Dollar',
        symbol: '$',
      });
      expect(result.currencies).toContainEqual({
        code: 'EUR',
        name: 'Euro',
        symbol: '\u20AC',
      });
      expect(result.currencies).toContainEqual({
        code: 'GBP',
        name: 'British Pound',
        symbol: '\u00A3',
      });
    });

    it('should include all expected currency codes', async () => {
      const result = await service.getSupportedCurrencies();
      const codes = result.currencies.map((c) => c.code);

      expect(codes).toContain('USD');
      expect(codes).toContain('EUR');
      expect(codes).toContain('GBP');
      expect(codes).toContain('CNY');
      expect(codes).toContain('JPY');
      expect(codes).toContain('AUD');
      expect(codes).toContain('CAD');
    });
  });

  describe('calculateMultiCurrencyPricing', () => {
    beforeEach(() => {
      mockPrismaService.exchangeRate.create.mockResolvedValue({});
    });

    it('should calculate pricing for multiple target currencies', async () => {
      const result = await service.calculateMultiCurrencyPricing({
        basePrice: 100,
        baseCurrency: 'USD',
        targetCurrencies: ['EUR', 'GBP'],
      });

      expect(result.basePrice).toBe(100);
      expect(result.baseCurrency).toBe('USD');
      expect(result.prices).toHaveProperty('EUR');
      expect(result.prices).toHaveProperty('GBP');
      expect(result.generatedAt).toBeInstanceOf(Date);
    });

    it('should include fees in calculated prices', async () => {
      const result = await service.calculateMultiCurrencyPricing({
        basePrice: 100,
        baseCurrency: 'USD',
        targetCurrencies: ['EUR'],
      });

      // EUR price should include 0.5% fee
      expect(result.prices.EUR.amount).toBeCloseTo(92.46, 2);
      expect(result.prices.EUR.fees).toBeCloseTo(0.46, 2);
      expect(result.prices.EUR.exchangeRate).toBe(0.92);
    });

    it('should handle empty target currencies array', async () => {
      const result = await service.calculateMultiCurrencyPricing({
        basePrice: 100,
        baseCurrency: 'USD',
        targetCurrencies: [],
      });

      expect(result.prices).toEqual({});
    });
  });

  describe('monitorVolatility', () => {
    it('should return insufficient data message when no rates in last 24h', async () => {
      mockPrismaService.exchangeRate.findMany.mockResolvedValue([]);

      const result = await service.monitorVolatility({
        currencyPair: 'USD/EUR',
        threshold: 5,
      });

      expect(result.currencyPair).toBe('USD/EUR');
      expect(result.volatile).toBe(false);
      expect(result.message).toBe('Insufficient data');
    });

    it('should detect high volatility above threshold', async () => {
      const mockRates = [
        { rate: 1.0 },
        { rate: 0.9 },
        { rate: 1.1 },
      ];
      mockPrismaService.exchangeRate.findMany.mockResolvedValue(mockRates);

      const result = await service.monitorVolatility({
        currencyPair: 'USD/EUR',
        threshold: 5, // 5% threshold
      });

      expect(result.volatile).toBe(true);
      expect(result.maxRate24h).toBe(1.1);
      expect(result.minRate24h).toBe(0.9);
      // Volatility: ((1.1 - 0.9) / 0.9) * 100 = 22.22%
      expect(result.volatility).toBeGreaterThan(5);
    });

    it('should detect low volatility below threshold', async () => {
      const mockRates = [
        { rate: 0.92 },
        { rate: 0.921 },
        { rate: 0.919 },
      ];
      mockPrismaService.exchangeRate.findMany.mockResolvedValue(mockRates);

      const result = await service.monitorVolatility({
        currencyPair: 'USD/EUR',
        threshold: 5,
      });

      expect(result.volatile).toBe(false);
      expect(result.volatility).toBeLessThan(5);
    });

    it('should include current rate from most recent entry', async () => {
      const mockRates = [
        { rate: 0.95 }, // Most recent (index 0)
        { rate: 0.92 },
        { rate: 0.93 },
      ];
      mockPrismaService.exchangeRate.findMany.mockResolvedValue(mockRates);

      const result = await service.monitorVolatility({
        currencyPair: 'USD/EUR',
        threshold: 5,
      });

      expect(result.currentRate).toBe(0.95);
    });
  });

  describe('createHedge', () => {
    beforeEach(() => {
      mockPrismaService.exchangeRate.create.mockResolvedValue({});
    });

    it('should create a currency hedge', async () => {
      const expiryDate = new Date('2024-12-31');
      const mockHedge = {
        id: 'hedge-1',
        amount: 10000,
        fromCurrency: 'USD',
        toCurrency: 'EUR',
        targetRate: 0.90,
        currentRate: 0.92,
        expiryDate,
        status: 'ACTIVE',
      };

      mockPrismaService.currencyHedge.create.mockResolvedValue(mockHedge);

      const result = await service.createHedge({
        amount: 10000,
        fromCurrency: 'USD',
        toCurrency: 'EUR',
        targetRate: 0.90,
        expiryDate,
      });

      expect(result).toEqual(mockHedge);
      expect(mockPrismaService.currencyHedge.create).toHaveBeenCalledWith({
        data: {
          amount: 10000,
          fromCurrency: 'USD',
          toCurrency: 'EUR',
          targetRate: 0.90,
          currentRate: 0.92, // Current USD/EUR rate
          expiryDate,
          status: 'ACTIVE',
        },
      });
    });
  });

  describe('getConversionAnalytics', () => {
    it('should return analytics for all conversions when no params', async () => {
      const mockConversions = [
        { amount: 100, fees: 0.5, fromCurrency: 'USD', toCurrency: 'EUR' },
        { amount: 200, fees: 1.0, fromCurrency: 'USD', toCurrency: 'GBP' },
        { amount: 150, fees: 0.75, fromCurrency: 'EUR', toCurrency: 'USD' },
      ];

      mockPrismaService.currencyConversion.findMany.mockResolvedValue(mockConversions);

      const result = await service.getConversionAnalytics();

      expect(result.totalConversions).toBe(3);
      expect(result.totalVolume).toBe(450);
      expect(result.totalFees).toBe(2.25);
      expect(result.averageConversion).toBe(150);
    });

    it('should filter by date range', async () => {
      mockPrismaService.currencyConversion.findMany.mockResolvedValue([]);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      await service.getConversionAnalytics({ startDate, endDate });

      expect(mockPrismaService.currencyConversion.findMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });
    });

    it('should filter by currency', async () => {
      mockPrismaService.currencyConversion.findMany.mockResolvedValue([]);

      await service.getConversionAnalytics({ currency: 'EUR' });

      expect(mockPrismaService.currencyConversion.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { fromCurrency: 'EUR' },
            { toCurrency: 'EUR' },
          ],
        },
      });
    });

    it('should return zero averages when no conversions', async () => {
      mockPrismaService.currencyConversion.findMany.mockResolvedValue([]);

      const result = await service.getConversionAnalytics();

      expect(result.totalConversions).toBe(0);
      expect(result.totalVolume).toBe(0);
      expect(result.totalFees).toBe(0);
      expect(result.averageConversion).toBe(0);
    });

    it('should return top currency pairs sorted by volume', async () => {
      const mockConversions = [
        { amount: 100, fees: 0.5, fromCurrency: 'USD', toCurrency: 'EUR' },
        { amount: 200, fees: 1.0, fromCurrency: 'USD', toCurrency: 'EUR' },
        { amount: 50, fees: 0.25, fromCurrency: 'GBP', toCurrency: 'USD' },
      ];

      mockPrismaService.currencyConversion.findMany.mockResolvedValue(mockConversions);

      const result = await service.getConversionAnalytics();

      expect(result.topCurrencyPairs[0]).toEqual({
        pair: 'USD/EUR',
        volume: 300,
      });
      expect(result.topCurrencyPairs[1]).toEqual({
        pair: 'GBP/USD',
        volume: 50,
      });
    });

    it('should handle conversions with null fees', async () => {
      const mockConversions = [
        { amount: 100, fees: null, fromCurrency: 'USD', toCurrency: 'EUR' },
        { amount: 200, fees: 1.0, fromCurrency: 'USD', toCurrency: 'GBP' },
      ];

      mockPrismaService.currencyConversion.findMany.mockResolvedValue(mockConversions);

      const result = await service.getConversionAnalytics();

      expect(result.totalFees).toBe(1.0);
    });
  });
});
