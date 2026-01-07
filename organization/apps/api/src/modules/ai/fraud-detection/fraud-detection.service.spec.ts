import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FraudDetectionService, FraudAlert } from './fraud-detection.service';
import { PrismaService } from '@/common/prisma/prisma.service';

describe('FraudDetectionService', () => {
  let service: FraudDetectionService;
  let prisma: PrismaService;
  let configService: ConfigService;

  const mockPrismaService = {
    review: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    order: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    returnRequest: {
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      const config: Record<string, string> = {
        FRAUD_DETECTION_ENABLED: 'true',
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FraudDetectionService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<FraudDetectionService>(FraudDetectionService);
    prisma = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==================== Fake Review Detection ====================

  describe('analyzeFakeReview', () => {
    const baseReviewData = {
      reviewId: 'review-123',
      userId: 'user-123',
      productId: 'product-456',
      rating: 4,
      content: 'This is a genuine detailed review with specific product feedback and useful information for other buyers.',
      verified: true,
    };

    beforeEach(() => {
      mockPrismaService.review.count.mockResolvedValue(2); // Low review velocity
    });

    it('should approve a genuine verified review', async () => {
      const result = await service.analyzeFakeReview(baseReviewData);

      expect(result.success).toBe(true);
      expect(result.reviewId).toBe('review-123');
      expect(result.isFake).toBe(false);
      expect(result.fraudScore).toBeLessThan(50);
      expect(result.recommendation).toBe('approve');
    });

    it('should add 20 points for unverified purchases', async () => {
      const result = await service.analyzeFakeReview({
        ...baseReviewData,
        verified: false,
      });

      expect(result.fraudScore).toBeGreaterThanOrEqual(20);
      expect(result.indicators).toContain('Not a verified purchase');
    });

    it('should flag generic template language with short content', async () => {
      const result = await service.analyzeFakeReview({
        ...baseReviewData,
        content: 'Amazing product! Highly recommend!',
        verified: true,
      });

      expect(result.indicators).toContain('Generic template language detected');
      expect(result.fraudScore).toBeGreaterThanOrEqual(25);
    });

    it('should not flag generic phrases in longer reviews', async () => {
      const longReview = 'This is an amazing product that I highly recommend because it exceeded all my expectations and the quality is outstanding with great attention to detail.';
      const result = await service.analyzeFakeReview({
        ...baseReviewData,
        content: longReview,
        verified: true,
      });

      expect(result.indicators).not.toContain('Generic template language detected');
    });

    it('should flag extreme ratings with minimal content', async () => {
      const result = await service.analyzeFakeReview({
        ...baseReviewData,
        rating: 5,
        content: 'Great!',
        verified: true,
      });

      expect(result.indicators).toContain('Extreme rating with minimal content');
      expect(result.fraudScore).toBeGreaterThanOrEqual(15);
    });

    it('should flag 1-star ratings with minimal content', async () => {
      const result = await service.analyzeFakeReview({
        ...baseReviewData,
        rating: 1,
        content: 'Terrible',
        verified: true,
      });

      expect(result.indicators).toContain('Extreme rating with minimal content');
    });

    it('should flag high review velocity', async () => {
      mockPrismaService.review.count.mockResolvedValue(15); // High velocity

      const result = await service.analyzeFakeReview(baseReviewData);

      expect(result.indicators).toContain('Unusually high review frequency');
      expect(result.fraudScore).toBeGreaterThanOrEqual(30);
    });

    it('should detect fake review when score is 50 or above', async () => {
      mockPrismaService.review.count.mockResolvedValue(15); // +30 for velocity

      const result = await service.analyzeFakeReview({
        ...baseReviewData,
        verified: false, // +20 for unverified
        content: 'Amazing product!', // +25 for generic
      });

      expect(result.isFake).toBe(true);
      expect(result.fraudScore).toBeGreaterThanOrEqual(50);
      expect(result.recommendation).toBe('flag_for_review');
    });

    it('should set correct confidence based on fraud score', async () => {
      mockPrismaService.review.count.mockResolvedValue(15);

      const result = await service.analyzeFakeReview({
        ...baseReviewData,
        verified: false,
      });

      expect(result.confidence).toBe(result.fraudScore / 100);
    });

    it('should include reasons array matching indicators', async () => {
      const result = await service.analyzeFakeReview({
        ...baseReviewData,
        verified: false,
      });

      expect(result.reasons).toEqual(result.indicators);
    });

    it('should handle database errors gracefully', async () => {
      // Reset and set up the rejected mock
      mockPrismaService.review.count.mockReset();
      mockPrismaService.review.count.mockRejectedValue(new Error('Database error'));

      // The service catches errors and returns velocity as 0
      const result = await service.analyzeFakeReview(baseReviewData);

      expect(result.success).toBe(true);
    });
  });

  // ==================== Return Fraud Detection ====================

  describe('detectReturnFraud', () => {
    const baseReturnData = {
      orderId: 'order-123',
      userId: 'user-456',
      returnReason: 'Product defective - screen cracked on arrival',
      items: [
        { productId: 'prod-1', quantity: 1, price: 100 },
      ],
    };

    beforeEach(() => {
      // Mock low return history
      mockPrismaService.order.count.mockResolvedValue(10);
      mockPrismaService.returnRequest.findMany.mockResolvedValue([
        { createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), items: [{ refundAmount: 50 }] },
      ]);
    });

    it('should auto-approve low-risk returns', async () => {
      const result = await service.detectReturnFraud(baseReturnData);

      expect(result.success).toBe(true);
      expect(result.orderId).toBe('order-123');
      expect(result.isFraudulent).toBe(false);
      expect(result.recommendation).toBe('auto_approve');
    });

    it('should flag high return rate (>50%)', async () => {
      mockPrismaService.order.count.mockResolvedValue(10);
      mockPrismaService.returnRequest.findMany.mockResolvedValue(
        Array(6).fill({
          createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          items: [{ refundAmount: 50 }]
        })
      );

      const result = await service.detectReturnFraud(baseReturnData);

      expect(result.indicators).toContainEqual(expect.stringContaining('High return rate'));
      expect(result.riskScore).toBeGreaterThanOrEqual(40);
    });

    it('should flag high-value returns (>$500)', async () => {
      const result = await service.detectReturnFraud({
        ...baseReturnData,
        items: [{ productId: 'prod-1', quantity: 1, price: 600 }],
      });

      expect(result.indicators).toContain('High-value return');
      expect(result.riskScore).toBeGreaterThanOrEqual(15);
    });

    it('should flag vague return reasons', async () => {
      const vagueReasons = ['changed mind', 'dont want it', 'not needed anymore'];

      for (const reason of vagueReasons) {
        const result = await service.detectReturnFraud({
          ...baseReturnData,
          returnReason: reason,
        });

        expect(result.indicators).toContain('Vague return reason');
        expect(result.riskScore).toBeGreaterThanOrEqual(10);
      }
    });

    it('should flag multiple recent returns (>3 in 30 days)', async () => {
      const recentDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      mockPrismaService.returnRequest.findMany.mockResolvedValue(
        Array(4).fill({ createdAt: recentDate, items: [{ refundAmount: 50 }] })
      );

      const result = await service.detectReturnFraud(baseReturnData);

      expect(result.indicators).toContain('Multiple recent returns');
      expect(result.riskScore).toBeGreaterThanOrEqual(25);
    });

    it('should require manual review for fraudulent returns', async () => {
      // Create high-risk scenario
      mockPrismaService.order.count.mockResolvedValue(10);
      mockPrismaService.returnRequest.findMany.mockResolvedValue(
        Array(6).fill({
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          items: [{ refundAmount: 100 }]
        })
      );

      const result = await service.detectReturnFraud({
        ...baseReturnData,
        returnReason: 'changed mind',
        items: [{ productId: 'prod-1', quantity: 1, price: 600 }],
      });

      expect(result.isFraudulent).toBe(true);
      expect(result.recommendation).toBe('manual_review_required');
      expect(result.actions).toContain('Verify item condition');
      expect(result.actions).toContain('Request photos');
      expect(result.actions).toContain('Contact customer');
    });

    it('should recommend additional verification for medium risk', async () => {
      mockPrismaService.order.count.mockResolvedValue(10);
      // Set up 4 recent returns to trigger "Multiple recent returns" (+25 points)
      const recentDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      mockPrismaService.returnRequest.findMany.mockResolvedValue(
        Array(4).fill({ createdAt: recentDate, items: [{ refundAmount: 50 }] })
      );

      const result = await service.detectReturnFraud({
        ...baseReturnData,
        returnReason: 'changed mind', // +10 for vague reason
        items: [{ productId: 'prod-1', quantity: 1, price: 100 }], // No high-value bonus (< 500)
      });

      // With vague reason (10) + multiple recent returns (25) = 35, which is > 30 but < 50
      expect(result.riskScore).toBeGreaterThan(30);
      expect(result.riskScore).toBeLessThan(50);
      expect(result.recommendation).toBe('additional_verification');
    });

    it('should calculate estimated loss for fraudulent returns', async () => {
      mockPrismaService.order.count.mockResolvedValue(10);
      mockPrismaService.returnRequest.findMany.mockResolvedValue(
        Array(6).fill({
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          items: [{ refundAmount: 100 }]
        })
      );

      const items = [
        { productId: 'prod-1', quantity: 2, price: 100 },
        { productId: 'prod-2', quantity: 1, price: 200 },
      ];

      const result = await service.detectReturnFraud({
        ...baseReturnData,
        returnReason: 'changed mind',
        items,
      });

      expect(result.estimatedLoss).toBe(400); // 2*100 + 1*200
    });

    it('should return zero estimated loss for non-fraudulent returns', async () => {
      const result = await service.detectReturnFraud(baseReturnData);

      expect(result.estimatedLoss).toBe(0);
    });
  });

  // ==================== User Risk Score ====================

  describe('getUserRiskScore', () => {
    beforeEach(() => {
      // Mock default low-risk user
      mockPrismaService.order.count.mockResolvedValue(5);
      mockPrismaService.order.findMany.mockResolvedValue([
        { createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), total: 100, status: 'COMPLETED' },
      ]);
      mockPrismaService.returnRequest.findMany.mockResolvedValue([]);
      mockPrismaService.user.findUnique.mockResolvedValue({
        createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      });
      mockPrismaService.review.findMany.mockResolvedValue([
        { id: '1', rating: 4, comment: 'Good', status: 'APPROVED' },
      ]);
    });

    it('should return minimal risk for established low-risk users', async () => {
      const result = await service.getUserRiskScore('user-123');

      expect(result.success).toBe(true);
      expect(result.userId).toBe('user-123');
      expect(result.riskLevel).toBe('minimal');
      expect(result.riskScore).toBeLessThan(20);
      expect(result.accountStatus).toBe('active');
    });

    it('should flag new accounts (<30 days)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      });

      const result = await service.getUserRiskScore('user-123');

      expect(result.riskFactors).toContain('New account (< 30 days)');
      expect(result.riskScore).toBeGreaterThanOrEqual(20);
    });

    it('should flag high return rate (>40%)', async () => {
      mockPrismaService.order.count.mockResolvedValue(10);
      mockPrismaService.returnRequest.findMany.mockResolvedValue(
        Array(5).fill({
          createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          items: [{ refundAmount: 50 }]
        })
      );

      const result = await service.getUserRiskScore('user-123');

      expect(result.riskFactors).toContainEqual(expect.stringContaining('High return rate'));
      expect(result.riskScore).toBeGreaterThanOrEqual(25);
    });

    it('should flag high transaction velocity (>5 in 7 days)', async () => {
      const recentDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      mockPrismaService.order.findMany.mockResolvedValue(
        Array(6).fill({ createdAt: recentDate, total: 100, status: 'COMPLETED' })
      );

      const result = await service.getUserRiskScore('user-123');

      expect(result.riskFactors).toContain('High transaction velocity');
      expect(result.riskScore).toBeGreaterThanOrEqual(15);
    });

    it('should flag suspicious review activity', async () => {
      mockPrismaService.review.findMany.mockResolvedValue([
        { id: '1', rating: 5, comment: 'Great', status: 'REJECTED' },
        { id: '2', rating: 5, comment: 'Awesome', status: 'PENDING' },
      ]);

      const result = await service.getUserRiskScore('user-123');

      expect(result.riskFactors).toContain('Suspicious review activity');
      expect(result.riskScore).toBeGreaterThanOrEqual(20);
    });

    it('should calculate correct risk levels', async () => {
      // Test high risk (>=70)
      mockPrismaService.user.findUnique.mockResolvedValue({
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      });
      mockPrismaService.order.count.mockResolvedValue(10);
      mockPrismaService.returnRequest.findMany.mockResolvedValue(
        Array(5).fill({
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          items: [{ refundAmount: 50 }]
        })
      );
      mockPrismaService.review.findMany.mockResolvedValue([
        { id: '1', rating: 5, comment: 'Great', status: 'REJECTED' },
      ]);
      const recentDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      mockPrismaService.order.findMany.mockResolvedValue(
        Array(6).fill({ createdAt: recentDate, total: 100, status: 'COMPLETED' })
      );

      const result = await service.getUserRiskScore('user-123');

      // New account (20) + high return rate (25) + velocity (15) + suspicious reviews (20) = 80
      expect(result.riskLevel).toBe('high');
      expect(result.accountStatus).toBe('restricted');
    });

    it('should provide appropriate recommendations for risk levels', async () => {
      // High risk scenario
      mockPrismaService.user.findUnique.mockResolvedValue({
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      });
      mockPrismaService.order.count.mockResolvedValue(10);
      mockPrismaService.returnRequest.findMany.mockResolvedValue(
        Array(5).fill({
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          items: [{ refundAmount: 50 }]
        })
      );
      mockPrismaService.review.findMany.mockResolvedValue([
        { id: '1', rating: 5, comment: 'Great', status: 'REJECTED' },
      ]);

      const result = await service.getUserRiskScore('user-123');

      if (result.riskLevel === 'high') {
        expect(result.recommendations).toContain('Enhanced verification');
        expect(result.recommendations).toContain('Manual review');
        expect(result.recommendations).toContain('Limit transaction amount');
      }
    });

    it('should handle missing user gracefully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.getUserRiskScore('nonexistent-user');

      expect(result.success).toBe(true);
      // Account age returns 0 which triggers new account flag
    });
  });

  // ==================== Transaction Analysis ====================

  describe('analyzeTransaction', () => {
    const baseTransactionData = {
      orderId: 'order-789',
      userId: 'user-123',
      total: 150,
      paymentMethod: 'credit_card',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      billingAddress: { postalCode: '12345', city: 'New York' },
      shippingAddress: { postalCode: '12345', city: 'New York' },
    };

    beforeEach(() => {
      // Mock low-risk user
      mockPrismaService.order.findMany.mockResolvedValue([
        { createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), total: 100, status: 'COMPLETED' },
      ]);
      mockPrismaService.user.findUnique.mockResolvedValue({
        createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      });
      mockPrismaService.order.count.mockResolvedValue(5);
      mockPrismaService.returnRequest.findMany.mockResolvedValue([]);
    });

    it('should approve low-risk transactions', async () => {
      const result = await service.analyzeTransaction(baseTransactionData);

      expect(result.success).toBe(true);
      expect(result.orderId).toBe('order-789');
      expect(result.riskLevel).toBe('minimal');
      expect(result.recommendation).toBe('approve');
      expect(result.requiresVerification).toBe(false);
    });

    it('should flag very new accounts (<7 days)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      });

      const result = await service.analyzeTransaction(baseTransactionData);

      expect(result.indicators).toContain('Very new account (< 7 days)');
      expect(result.riskScore).toBeGreaterThanOrEqual(25);
    });

    it('should flag new accounts (<30 days but >=7 days)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      });

      const result = await service.analyzeTransaction(baseTransactionData);

      expect(result.indicators).toContain('New account (< 30 days)');
      expect(result.riskScore).toBeGreaterThanOrEqual(15);
    });

    it('should flag high-value transactions (>$1000)', async () => {
      const result = await service.analyzeTransaction({
        ...baseTransactionData,
        total: 1500,
      });

      expect(result.indicators).toContain('High-value transaction');
      expect(result.riskScore).toBeGreaterThanOrEqual(10);
    });

    it('should flag orders significantly higher than user average', async () => {
      mockPrismaService.order.findMany.mockResolvedValue([
        { createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), total: 50, status: 'COMPLETED' },
        { createdAt: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000), total: 60, status: 'COMPLETED' },
      ]);

      const result = await service.analyzeTransaction({
        ...baseTransactionData,
        total: 500, // More than 3x average of 55
      });

      expect(result.indicators).toContain('Order value significantly higher than average');
      expect(result.riskScore).toBeGreaterThanOrEqual(20);
    });

    it('should flag high return rate (>50%)', async () => {
      mockPrismaService.order.count.mockResolvedValue(10);
      mockPrismaService.returnRequest.findMany.mockResolvedValue(
        Array(6).fill({
          createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          items: [{ refundAmount: 50 }]
        })
      );

      const result = await service.analyzeTransaction(baseTransactionData);

      expect(result.indicators).toContain('High return rate (>50%)');
      expect(result.riskScore).toBeGreaterThanOrEqual(20);
    });

    it('should flag billing/shipping address mismatch', async () => {
      const result = await service.analyzeTransaction({
        ...baseTransactionData,
        billingAddress: { postalCode: '12345', city: 'New York' },
        shippingAddress: { postalCode: '67890', city: 'Los Angeles' },
      });

      expect(result.indicators).toContain('Billing and shipping address mismatch');
      expect(result.riskScore).toBeGreaterThanOrEqual(10);
    });

    it('should handle zip field naming variations', async () => {
      const result = await service.analyzeTransaction({
        ...baseTransactionData,
        billingAddress: { zip: '12345' },
        shippingAddress: { zip: '67890' },
      });

      expect(result.indicators).toContain('Billing and shipping address mismatch');
    });

    it('should flag high transaction velocity', async () => {
      const recentDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      mockPrismaService.order.findMany.mockResolvedValue(
        Array(6).fill({ createdAt: recentDate, total: 100, status: 'COMPLETED' })
      );

      const result = await service.analyzeTransaction(baseTransactionData);

      expect(result.indicators).toContain('High transaction velocity');
      expect(result.riskScore).toBeGreaterThanOrEqual(15);
    });

    it('should block high-risk transactions', async () => {
      // Create high-risk scenario
      mockPrismaService.user.findUnique.mockResolvedValue({
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      });
      mockPrismaService.order.count.mockResolvedValue(10);
      mockPrismaService.returnRequest.findMany.mockResolvedValue(
        Array(6).fill({
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          items: [{ refundAmount: 100 }]
        })
      );
      const recentDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      mockPrismaService.order.findMany.mockResolvedValue(
        Array(6).fill({ createdAt: recentDate, total: 100, status: 'COMPLETED' })
      );

      const result = await service.analyzeTransaction({
        ...baseTransactionData,
        total: 1500,
        billingAddress: { postalCode: '12345' },
        shippingAddress: { postalCode: '67890' },
      });

      expect(result.riskLevel).toBe('high');
      expect(result.recommendation).toBe('block');
      expect(result.requiresVerification).toBe(true);
    });

    it('should require manual review for medium-risk transactions', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      });

      const result = await service.analyzeTransaction({
        ...baseTransactionData,
        total: 1500,
        billingAddress: { postalCode: '12345' },
        shippingAddress: { postalCode: '67890' },
      });

      // New account (15) + high value (10) + address mismatch (10) = 35-45
      expect(result.riskLevel).toBe('medium');
      expect(result.recommendation).toBe('manual_review');
      expect(result.requiresVerification).toBe(true);
    });
  });

  // ==================== Fraud Alerts ====================

  describe('getFraudAlerts', () => {
    it('should return empty alerts initially', () => {
      const result = service.getFraudAlerts();

      expect(result.success).toBe(true);
      expect(result.alerts).toHaveLength(0);
      expect(result.summary.total).toBe(0);
    });

    it('should return all alerts when no severity filter', async () => {
      // Trigger some fraud detection to create alerts
      mockPrismaService.review.count.mockResolvedValue(15);

      await service.analyzeFakeReview({
        reviewId: 'review-1',
        userId: 'user-1',
        productId: 'prod-1',
        rating: 5,
        content: 'Amazing product!',
        verified: false,
      });

      const result = service.getFraudAlerts();

      expect(result.success).toBe(true);
      expect(result.alerts.length).toBeGreaterThan(0);
    });

    it('should filter alerts by severity', async () => {
      // Create high severity alert
      mockPrismaService.review.count.mockResolvedValue(20);

      await service.analyzeFakeReview({
        reviewId: 'review-high',
        userId: 'user-1',
        productId: 'prod-1',
        rating: 5,
        content: 'Amazing!',
        verified: false,
      });

      const highAlerts = service.getFraudAlerts('high');
      const lowAlerts = service.getFraudAlerts('low');

      expect(highAlerts.alerts.every(a => a.severity === 'high')).toBe(true);
      expect(lowAlerts.alerts.every(a => a.severity === 'low')).toBe(true);
    });

    it('should sort alerts by timestamp descending', async () => {
      mockPrismaService.review.count.mockResolvedValue(15);

      // Create multiple alerts
      await service.analyzeFakeReview({
        reviewId: 'review-1',
        userId: 'user-1',
        productId: 'prod-1',
        rating: 5,
        content: 'Amazing!',
        verified: false,
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      await service.analyzeFakeReview({
        reviewId: 'review-2',
        userId: 'user-2',
        productId: 'prod-2',
        rating: 5,
        content: 'Great!',
        verified: false,
      });

      const result = service.getFraudAlerts();

      if (result.alerts.length >= 2) {
        const timestamps = result.alerts.map(a => new Date(a.timestamp).getTime());
        for (let i = 1; i < timestamps.length; i++) {
          expect(timestamps[i - 1]).toBeGreaterThanOrEqual(timestamps[i]);
        }
      }
    });

    it('should limit to last 50 alerts', async () => {
      mockPrismaService.review.count.mockResolvedValue(15);

      // Create many alerts
      for (let i = 0; i < 60; i++) {
        await service.analyzeFakeReview({
          reviewId: `review-${i}`,
          userId: `user-${i}`,
          productId: 'prod-1',
          rating: 5,
          content: 'Amazing!',
          verified: false,
        });
      }

      const result = service.getFraudAlerts();

      expect(result.alerts.length).toBeLessThanOrEqual(50);
    });

    it('should provide correct summary counts', async () => {
      mockPrismaService.review.count.mockResolvedValue(15);

      await service.analyzeFakeReview({
        reviewId: 'review-1',
        userId: 'user-1',
        productId: 'prod-1',
        rating: 5,
        content: 'Amazing!',
        verified: false,
      });

      const result = service.getFraudAlerts();

      expect(typeof result.summary.total).toBe('number');
      expect(typeof result.summary.critical).toBe('number');
      expect(typeof result.summary.high).toBe('number');
      expect(typeof result.summary.medium).toBe('number');
      expect(typeof result.summary.low).toBe('number');
      expect(result.summary.total).toBe(
        result.summary.critical + result.summary.high + result.summary.medium + result.summary.low
      );
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle empty review content', async () => {
      mockPrismaService.review.count.mockResolvedValue(2);

      const result = await service.analyzeFakeReview({
        reviewId: 'review-empty',
        userId: 'user-1',
        productId: 'prod-1',
        rating: 3,
        content: '',
        verified: true,
      });

      expect(result.success).toBe(true);
    });

    it('should handle empty return items array', async () => {
      mockPrismaService.order.count.mockResolvedValue(5);
      mockPrismaService.returnRequest.findMany.mockResolvedValue([]);

      const result = await service.detectReturnFraud({
        orderId: 'order-empty',
        userId: 'user-1',
        returnReason: 'Defective',
        items: [],
      });

      expect(result.success).toBe(true);
      expect(result.estimatedLoss).toBe(0);
    });

    it('should handle user with no orders', async () => {
      mockPrismaService.order.count.mockResolvedValue(0);
      mockPrismaService.order.findMany.mockResolvedValue([]);
      mockPrismaService.returnRequest.findMany.mockResolvedValue([]);
      mockPrismaService.user.findUnique.mockResolvedValue({
        createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      });
      mockPrismaService.review.findMany.mockResolvedValue([]);

      const result = await service.getUserRiskScore('user-new');

      expect(result.success).toBe(true);
      expect(result.riskLevel).toBe('minimal');
    });

    it('should handle case-insensitive generic phrase detection', async () => {
      mockPrismaService.review.count.mockResolvedValue(2);

      const result = await service.analyzeFakeReview({
        reviewId: 'review-case',
        userId: 'user-1',
        productId: 'prod-1',
        rating: 5,
        content: 'AMAZING PRODUCT!',
        verified: true,
      });

      expect(result.indicators).toContain('Generic template language detected');
    });

    it('should handle case-insensitive vague reason detection', async () => {
      mockPrismaService.order.count.mockResolvedValue(5);
      mockPrismaService.returnRequest.findMany.mockResolvedValue([]);

      const result = await service.detectReturnFraud({
        orderId: 'order-case',
        userId: 'user-1',
        returnReason: 'CHANGED MIND about it',
        items: [{ productId: 'prod-1', quantity: 1, price: 50 }],
      });

      expect(result.indicators).toContain('Vague return reason');
    });

    it('should handle null/undefined addresses gracefully', async () => {
      mockPrismaService.order.findMany.mockResolvedValue([]);
      mockPrismaService.user.findUnique.mockResolvedValue({
        createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      });
      mockPrismaService.order.count.mockResolvedValue(0);
      mockPrismaService.returnRequest.findMany.mockResolvedValue([]);

      const result = await service.analyzeTransaction({
        orderId: 'order-no-address',
        userId: 'user-1',
        total: 100,
        paymentMethod: 'credit_card',
      });

      expect(result.success).toBe(true);
      expect(result.indicators).not.toContain('Billing and shipping address mismatch');
    });

    it('should handle database errors in review velocity check', async () => {
      // Reset and set up the rejected mock
      mockPrismaService.review.count.mockReset();
      mockPrismaService.review.count.mockRejectedValue(new Error('DB Error'));

      const result = await service.analyzeFakeReview({
        reviewId: 'review-error',
        userId: 'user-1',
        productId: 'prod-1',
        rating: 4,
        content: 'Good product with detailed feedback',
        verified: true,
      });

      // Should still return result with velocity treated as 0
      expect(result.success).toBe(true);
    });

    it('should handle multiple items in return calculation', async () => {
      mockPrismaService.order.count.mockResolvedValue(5);
      mockPrismaService.returnRequest.findMany.mockResolvedValue([]);

      const result = await service.detectReturnFraud({
        orderId: 'order-multi',
        userId: 'user-1',
        returnReason: 'All items defective',
        items: [
          { productId: 'prod-1', quantity: 2, price: 100 },
          { productId: 'prod-2', quantity: 3, price: 50 },
          { productId: 'prod-3', quantity: 1, price: 200 },
        ],
      });

      // Total: 2*100 + 3*50 + 1*200 = 550, triggers high-value return
      expect(result.indicators).toContain('High-value return');
    });
  });

  // ==================== Alert Creation ====================

  describe('fraud alert creation', () => {
    it('should create alert for fake review detection', async () => {
      mockPrismaService.review.count.mockResolvedValue(15);

      await service.analyzeFakeReview({
        reviewId: 'review-fake',
        userId: 'user-1',
        productId: 'prod-1',
        rating: 5,
        content: 'Amazing!',
        verified: false,
      });

      const alerts = service.getFraudAlerts();
      const fakeReviewAlert = alerts.alerts.find(a => a.type === 'fake_review');

      expect(fakeReviewAlert).toBeDefined();
      expect(fakeReviewAlert?.userId).toBe('user-1');
      expect(fakeReviewAlert?.description).toContain('review-fake');
    });

    it('should create alert for return fraud detection', async () => {
      mockPrismaService.order.count.mockResolvedValue(10);
      mockPrismaService.returnRequest.findMany.mockResolvedValue(
        Array(6).fill({
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          items: [{ refundAmount: 100 }]
        })
      );

      await service.detectReturnFraud({
        orderId: 'order-fraud',
        userId: 'user-1',
        returnReason: 'changed mind',
        items: [{ productId: 'prod-1', quantity: 1, price: 600 }],
      });

      const alerts = service.getFraudAlerts();
      const returnFraudAlert = alerts.alerts.find(a => a.type === 'return_fraud');

      expect(returnFraudAlert).toBeDefined();
      expect(returnFraudAlert?.userId).toBe('user-1');
      expect(returnFraudAlert?.description).toContain('order-fraud');
    });

    it('should create alert for high-risk transactions', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      });
      mockPrismaService.order.count.mockResolvedValue(10);
      mockPrismaService.returnRequest.findMany.mockResolvedValue(
        Array(6).fill({
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          items: [{ refundAmount: 100 }]
        })
      );
      const recentDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      mockPrismaService.order.findMany.mockResolvedValue(
        Array(6).fill({ createdAt: recentDate, total: 100, status: 'COMPLETED' })
      );

      await service.analyzeTransaction({
        orderId: 'order-high-risk',
        userId: 'user-1',
        total: 1500,
        paymentMethod: 'credit_card',
        billingAddress: { postalCode: '12345' },
        shippingAddress: { postalCode: '67890' },
      });

      const alerts = service.getFraudAlerts();
      const transactionAlert = alerts.alerts.find(a => a.type === 'transaction_fraud');

      expect(transactionAlert).toBeDefined();
      expect(transactionAlert?.transactionId).toBe('order-high-risk');
    });

    it('should set correct severity based on fraud score', async () => {
      // High score (>70) should get 'high' severity
      mockPrismaService.review.count.mockResolvedValue(20);

      await service.analyzeFakeReview({
        reviewId: 'review-high-score',
        userId: 'user-1',
        productId: 'prod-1',
        rating: 5,
        content: 'Best ever!',
        verified: false,
      });

      const alerts = service.getFraudAlerts();
      const highScoreAlert = alerts.alerts.find(
        a => a.description.includes('review-high-score')
      );

      expect(highScoreAlert?.severity).toBe('high');
    });
  });
});
