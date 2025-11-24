import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';

describe('EmailService', () => {
  let service: EmailService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      const config = {
        EMAIL_FROM: 'test@citadelbuy.com',
        EMAIL_FROM_NAME: 'CitadelBuy Test',
        FRONTEND_URL: 'http://localhost:3000',
        SENDGRID_API_KEY: undefined, // Test without SendGrid
        NODE_ENV: 'test',
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    configService = module.get<ConfigService>(ConfigService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email successfully', async () => {
      // Arrange
      const to = 'newuser@example.com';
      const userName = 'John Doe';

      // Spy on private sendEmail method
      const sendEmailSpy = jest.spyOn(service as any, 'sendEmail').mockResolvedValue(undefined);

      // Act
      await service.sendWelcomeEmail(to, userName);

      // Assert
      expect(sendEmailSpy).toHaveBeenCalledWith({
        to,
        subject: 'Welcome to CitadelBuy Test! 🎉',
        html: expect.stringContaining(userName),
      });
      expect(sendEmailSpy).toHaveBeenCalledTimes(1);
    });

    it('should include user name in welcome email template', async () => {
      // Arrange
      const to = 'user@example.com';
      const userName = 'Alice Smith';
      const sendEmailSpy = jest.spyOn(service as any, 'sendEmail').mockResolvedValue(undefined);

      // Act
      await service.sendWelcomeEmail(to, userName);

      // Assert
      const emailCall = sendEmailSpy.mock.calls[0][0];
      expect(emailCall.html).toContain(userName);
      expect(emailCall.html).toContain('Welcome to CitadelBuy Test');
      expect(emailCall.html).toContain('Browse Products');
    });

    it('should handle errors when sending welcome email', async () => {
      // Arrange
      const to = 'error@example.com';
      const userName = 'Error User';
      const error = new Error('SendGrid error');
      jest.spyOn(service as any, 'sendEmail').mockRejectedValue(error);

      // Act & Assert
      await expect(service.sendWelcomeEmail(to, userName)).rejects.toThrow('SendGrid error');
    });
  });

  describe('sendOrderConfirmation', () => {
    it('should send order confirmation email successfully', async () => {
      // Arrange
      const to = 'customer@example.com';
      const orderData = {
        customerName: 'John Doe',
        orderId: 'ORD-12345',
        orderTotal: 199.99,
        orderItems: [
          { name: 'Product 1', quantity: 2, price: 49.99 },
          { name: 'Product 2', quantity: 1, price: 100.01 },
        ],
        shippingAddress: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zip: '10001',
        },
        orderDate: '2024-01-15',
      };
      const sendEmailSpy = jest.spyOn(service as any, 'sendEmail').mockResolvedValue(undefined);

      // Act
      await service.sendOrderConfirmation(to, orderData);

      // Assert
      expect(sendEmailSpy).toHaveBeenCalledWith({
        to,
        subject: `Order Confirmation - ${orderData.orderId}`,
        html: expect.stringContaining(orderData.orderId),
      });
    });

    it('should include order details in confirmation email', async () => {
      // Arrange
      const to = 'customer@example.com';
      const orderData = {
        customerName: 'Jane Smith',
        orderId: 'ORD-99999',
        orderTotal: 299.99,
        orderItems: [
          { name: 'Laptop', quantity: 1, price: 299.99 },
        ],
        shippingAddress: {
          street: '456 Oak Ave',
          city: 'San Francisco',
          state: 'CA',
          zip: '94102',
        },
        orderDate: '2024-01-20',
      };
      const sendEmailSpy = jest.spyOn(service as any, 'sendEmail').mockResolvedValue(undefined);

      // Act
      await service.sendOrderConfirmation(to, orderData);

      // Assert
      const emailCall = sendEmailSpy.mock.calls[0][0];
      expect(emailCall.html).toContain(orderData.customerName);
      expect(emailCall.html).toContain(orderData.orderId);
      expect(emailCall.html).toContain('Laptop');
    });

    it('should handle multiple items in order confirmation', async () => {
      // Arrange
      const to = 'customer@example.com';
      const orderData = {
        customerName: 'Bob Johnson',
        orderId: 'ORD-55555',
        orderTotal: 500.00,
        orderItems: [
          { name: 'Item 1', quantity: 2, price: 100.00 },
          { name: 'Item 2', quantity: 3, price: 50.00 },
          { name: 'Item 3', quantity: 1, price: 150.00 },
        ],
        shippingAddress: {},
        orderDate: '2024-01-25',
      };
      const sendEmailSpy = jest.spyOn(service as any, 'sendEmail').mockResolvedValue(undefined);

      // Act
      await service.sendOrderConfirmation(to, orderData);

      // Assert
      const emailCall = sendEmailSpy.mock.calls[0][0];
      expect(emailCall.html).toContain('Item 1');
      expect(emailCall.html).toContain('Item 2');
      expect(emailCall.html).toContain('Item 3');
    });
  });

  describe('sendOrderStatusUpdate', () => {
    it('should send order status update email successfully', async () => {
      // Arrange
      const to = 'customer@example.com';
      const statusData = {
        customerName: 'John Doe',
        orderId: 'ORD-12345',
        newStatus: 'SHIPPED',
        trackingNumber: 'TRACK123456',
        carrier: 'UPS',
        estimatedDelivery: '2024-01-20',
      };
      const sendEmailSpy = jest.spyOn(service as any, 'sendEmail').mockResolvedValue(undefined);

      // Act
      await service.sendOrderStatusUpdate(to, statusData);

      // Assert
      expect(sendEmailSpy).toHaveBeenCalledWith({
        to,
        subject: `Order ${statusData.orderId} - Status Updated to ${statusData.newStatus}`,
        html: expect.stringContaining(statusData.newStatus),
      });
    });

    it('should include tracking information when provided', async () => {
      // Arrange
      const to = 'customer@example.com';
      const statusData = {
        customerName: 'Jane Doe',
        orderId: 'ORD-67890',
        newStatus: 'SHIPPED',
        trackingNumber: 'FEDEX789456',
        carrier: 'FedEx',
        estimatedDelivery: '2024-02-01',
      };
      const sendEmailSpy = jest.spyOn(service as any, 'sendEmail').mockResolvedValue(undefined);

      // Act
      await service.sendOrderStatusUpdate(to, statusData);

      // Assert
      const emailCall = sendEmailSpy.mock.calls[0][0];
      expect(emailCall.html).toContain(statusData.trackingNumber);
      expect(emailCall.html).toContain(statusData.orderId);
    });

    it('should handle status update without tracking information', async () => {
      // Arrange
      const to = 'customer@example.com';
      const statusData = {
        customerName: 'Bob Smith',
        orderId: 'ORD-11111',
        newStatus: 'PROCESSING',
      };
      const sendEmailSpy = jest.spyOn(service as any, 'sendEmail').mockResolvedValue(undefined);

      // Act
      await service.sendOrderStatusUpdate(to, statusData);

      // Assert
      expect(sendEmailSpy).toHaveBeenCalledWith({
        to,
        subject: `Order ${statusData.orderId} - Status Updated to ${statusData.newStatus}`,
        html: expect.any(String),
      });
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email successfully', async () => {
      // Arrange
      const to = 'user@example.com';
      const resetData = {
        customerName: 'John Doe',
        resetToken: 'abc123xyz789',
        resetUrl: 'http://localhost:3000/reset-password?token=abc123xyz789',
      };
      const sendEmailSpy = jest.spyOn(service as any, 'sendEmail').mockResolvedValue(undefined);

      // Act
      await service.sendPasswordResetEmail(to, resetData);

      // Assert
      expect(sendEmailSpy).toHaveBeenCalledWith({
        to,
        subject: 'Password Reset Request',
        html: expect.stringContaining(resetData.resetUrl),
      });
    });

    it('should include reset URL in password reset email', async () => {
      // Arrange
      const to = 'user@example.com';
      const resetData = {
        customerName: 'Alice Johnson',
        resetToken: 'reset-token-456',
        resetUrl: 'http://localhost:3000/reset-password?token=reset-token-456',
      };
      const sendEmailSpy = jest.spyOn(service as any, 'sendEmail').mockResolvedValue(undefined);

      // Act
      await service.sendPasswordResetEmail(to, resetData);

      // Assert
      const emailCall = sendEmailSpy.mock.calls[0][0];
      expect(emailCall.html).toContain(resetData.customerName);
      expect(emailCall.html).toContain(resetData.resetUrl);
      expect(emailCall.html).toContain('Reset Password');
    });

    it('should handle errors when sending password reset email', async () => {
      // Arrange
      const to = 'error@example.com';
      const resetData = {
        customerName: 'Error User',
        resetToken: 'error-token',
        resetUrl: 'http://localhost:3000/reset-password?token=error-token',
      };
      const error = new Error('Email service unavailable');
      jest.spyOn(service as any, 'sendEmail').mockRejectedValue(error);

      // Act & Assert
      await expect(service.sendPasswordResetEmail(to, resetData)).rejects.toThrow('Email service unavailable');
    });
  });

  describe('sendEmail (private method via public methods)', () => {
    it('should log email to console when SendGrid is not configured', async () => {
      // Arrange
      const logSpy = jest.spyOn(service['logger'], 'log');
      const to = 'test@example.com';

      // Act
      await service.sendWelcomeEmail(to, 'Test User');

      // Assert
      expect(logSpy).toHaveBeenCalled();
      const logCalls = logSpy.mock.calls.map(call => call[0]);
      const hasEmailLog = logCalls.some(call =>
        typeof call === 'string' && call.includes('📧 EMAIL SENT')
      );
      expect(hasEmailLog).toBe(true);
    });

    it('should log success message after sending email', async () => {
      // Arrange
      const logSpy = jest.spyOn(service['logger'], 'log');
      const to = 'success@example.com';
      jest.spyOn(service as any, 'sendEmail').mockResolvedValue(undefined);

      // Act
      await service.sendWelcomeEmail(to, 'Success User');

      // Assert
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining(`Welcome email sent to ${to}`));
    });

    it('should log error when email sending fails', async () => {
      // Arrange
      const to = 'fail@example.com';
      const error = new Error('Network error');

      // Mock sendEmail to throw error
      jest.spyOn(service as any, 'sendEmail').mockRejectedValue(error);

      // Act & Assert
      await expect(service.sendWelcomeEmail(to, 'Fail User')).rejects.toThrow('Network error');
    });
  });

  describe('configuration', () => {

    it('should use custom configuration when provided', async () => {
      // Arrange
      const customConfig = {
        get: jest.fn((key: string, defaultValue?: string) => {
          const config = {
            EMAIL_FROM: 'custom@example.com',
            EMAIL_FROM_NAME: 'Custom Store',
            FRONTEND_URL: 'https://custom-store.com',
            NODE_ENV: 'production',
          };
          return config[key] ?? defaultValue;
        }),
      };

      const module = await Test.createTestingModule({
        providers: [
          EmailService,
          {
            provide: ConfigService,
            useValue: customConfig,
          },
        ],
      }).compile();

      const customService = module.get<EmailService>(EmailService);

      // Act
      const sendEmailSpy = jest.spyOn(customService as any, 'sendEmail').mockResolvedValue(undefined);
      await customService.sendWelcomeEmail('test@example.com', 'Test User');

      // Assert
      const emailCall = sendEmailSpy.mock.calls[0][0];
      expect(emailCall.html).toContain('Custom Store');
      expect(emailCall.html).toContain('https://custom-store.com');
    });
  });
});
