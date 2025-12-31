import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SmsService, SmsPayload, SendSmsResult } from './sms.service';
import { PrismaService } from '@/common/prisma/prisma.service';

describe('SmsService', () => {
  let service: SmsService;
  let prisma: PrismaService;
  let configService: ConfigService;

  const mockPrismaService = {
    notificationPreference: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      const config: Record<string, string | undefined> = {
        TWILIO_ACCOUNT_SID: undefined,
        TWILIO_AUTH_TOKEN: undefined,
        TWILIO_PHONE_NUMBER: undefined,
        NODE_ENV: 'test',
      };
      return config[key] ?? defaultValue;
    }),
  };

  const mockUserId = 'user-123';
  const mockPhoneNumber = '+1234567890';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmsService,
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

    service = module.get<SmsService>(SmsService);
    prisma = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('initialization', () => {
    it('should log warning when Twilio is not configured', () => {
      expect(mockConfigService.get).toHaveBeenCalledWith('TWILIO_ACCOUNT_SID');
      expect(mockConfigService.get).toHaveBeenCalledWith('TWILIO_AUTH_TOKEN');
      expect(mockConfigService.get).toHaveBeenCalledWith('TWILIO_PHONE_NUMBER');
    });

    it('should not throw error in test environment when Twilio not configured', () => {
      expect(() => service.onModuleInit()).not.toThrow();
    });

    it('should log error in production when Twilio not configured', async () => {
      const prodConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'NODE_ENV') return 'production';
          return undefined;
        }),
      };

      const module = await Test.createTestingModule({
        providers: [
          SmsService,
          {
            provide: PrismaService,
            useValue: mockPrismaService,
          },
          {
            provide: ConfigService,
            useValue: prodConfigService,
          },
        ],
      }).compile();

      const prodService = module.get<SmsService>(SmsService);
      const errorSpy = jest.spyOn(prodService['logger'], 'error');

      prodService.onModuleInit();

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Twilio SMS is not configured in production')
      );
    });
  });

  describe('sendSms', () => {
    it('should return failure when Twilio not initialized', async () => {
      const payload: SmsPayload = {
        to: mockPhoneNumber,
        message: 'Test message',
      };

      const result = await service.sendSms(payload);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Twilio not initialized');
    });

    it('should return failure for invalid phone number format', async () => {
      const payload: SmsPayload = {
        to: '123', // Too short
        message: 'Test message',
      };

      const result = await service.sendSms(payload);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid phone number format');
    });

    it('should return failure for empty phone number', async () => {
      const payload: SmsPayload = {
        to: '',
        message: 'Test message',
      };

      const result = await service.sendSms(payload);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid phone number format');
    });

    it('should log warning when sending SMS without Twilio', async () => {
      const warnSpy = jest.spyOn(service['logger'], 'warn');
      const payload: SmsPayload = {
        to: mockPhoneNumber,
        message: 'Test notification',
      };

      await service.sendSms(payload);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Twilio is not initialized')
      );
    });
  });

  describe('sendBulkSms', () => {
    it('should send SMS to multiple recipients', async () => {
      const recipients = ['+1111111111', '+2222222222', '+3333333333'];
      const message = 'Bulk notification';

      const result = await service.sendBulkSms(recipients, message);

      expect(result.totalRecipients).toBe(recipients.length);
      expect(result.sentCount).toBe(0); // All fail since Twilio not initialized
      expect(result.failedCount).toBe(recipients.length);
      expect(Object.keys(result.results)).toHaveLength(recipients.length);
    });

    it('should track individual results for each recipient', async () => {
      const recipients = ['+1111111111', '+2222222222'];
      const message = 'Test bulk SMS';

      const result = await service.sendBulkSms(recipients, message);

      expect(result.results['+1111111111']).toBeDefined();
      expect(result.results['+2222222222']).toBeDefined();
    });

    it('should log completion summary', async () => {
      const logSpy = jest.spyOn(service['logger'], 'log');
      const recipients = ['+1111111111'];
      const message = 'Test';

      await service.sendBulkSms(recipients, message);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Bulk SMS completed')
      );
    });
  });

  describe('sendOrderUpdateSms', () => {
    it('should format order update message correctly', async () => {
      const warnSpy = jest.spyOn(service['logger'], 'warn');

      await service.sendOrderUpdateSms(
        mockPhoneNumber,
        'ORD-12345',
        'SHIPPED',
        'TRACK-XYZ'
      );

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('ORD-12345')
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('SHIPPED')
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('TRACK-XYZ')
      );
    });

    it('should handle order update without tracking number', async () => {
      const warnSpy = jest.spyOn(service['logger'], 'warn');

      await service.sendOrderUpdateSms(mockPhoneNumber, 'ORD-99999', 'PROCESSING');

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('ORD-99999')
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('PROCESSING')
      );
    });
  });

  describe('sendDeliveryNotificationSms', () => {
    it('should format delivery notification correctly', async () => {
      const warnSpy = jest.spyOn(service['logger'], 'warn');

      await service.sendDeliveryNotificationSms(
        mockPhoneNumber,
        'ORD-55555',
        'Today by 5 PM'
      );

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('ORD-55555')
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('out for delivery')
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Today by 5 PM')
      );
    });

    it('should handle delivery notification without estimated time', async () => {
      const warnSpy = jest.spyOn(service['logger'], 'warn');

      await service.sendDeliveryNotificationSms(mockPhoneNumber, 'ORD-77777');

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('ORD-77777')
      );
    });
  });

  describe('sendVerificationCodeSms', () => {
    it('should format verification code message correctly', async () => {
      const warnSpy = jest.spyOn(service['logger'], 'warn');
      const code = '123456';

      await service.sendVerificationCodeSms(mockPhoneNumber, code);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining(code)
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('verification code')
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('10 minutes')
      );
    });
  });

  describe('sendPasswordResetSms', () => {
    it('should format password reset message correctly', async () => {
      const warnSpy = jest.spyOn(service['logger'], 'warn');
      const code = '789012';

      await service.sendPasswordResetSms(mockPhoneNumber, code);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining(code)
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('password reset')
      );
    });
  });

  describe('sendPromotionalSms', () => {
    it('should include unsubscribe notice in promotional SMS', async () => {
      const warnSpy = jest.spyOn(service['logger'], 'warn');
      const promoMessage = 'Get 50% off today only!';

      await service.sendPromotionalSms(mockPhoneNumber, promoMessage);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining(promoMessage)
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('STOP')
      );
    });
  });

  describe('canReceiveSms', () => {
    it('should return false when no preferences found', async () => {
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(null);

      const result = await service.canReceiveSms(mockUserId, 'order_updates');

      expect(result).toBe(false);
    });

    it('should return false when SMS is disabled', async () => {
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue({
        userId: mockUserId,
        smsEnabled: false,
      });

      const result = await service.canReceiveSms(mockUserId, 'order_updates');

      expect(result).toBe(false);
    });

    it('should check shipping updates for order_updates type', async () => {
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue({
        userId: mockUserId,
        smsEnabled: true,
        shippingUpdates: true,
      });

      const result = await service.canReceiveSms(mockUserId, 'order_updates');

      expect(result).toBe(true);
    });

    it('should check delivery notifications for delivery_alerts type', async () => {
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue({
        userId: mockUserId,
        smsEnabled: true,
        deliveryNotifications: true,
      });

      const result = await service.canReceiveSms(mockUserId, 'delivery_alerts');

      expect(result).toBe(true);
    });

    it('should return true for unknown SMS types when enabled', async () => {
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue({
        userId: mockUserId,
        smsEnabled: true,
      });

      const result = await service.canReceiveSms(mockUserId, 'general');

      expect(result).toBe(true);
    });
  });

  describe('sendSmsToUser', () => {
    it('should return failure when user opted out', async () => {
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue({
        userId: mockUserId,
        smsEnabled: false,
      });

      const result = await service.sendSmsToUser(mockUserId, 'Test message', 'general');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User opted out of SMS notifications');
    });

    it('should return failure when user not found', async () => {
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue({
        userId: mockUserId,
        smsEnabled: true,
      });
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.sendSmsToUser(mockUserId, 'Test message');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });

    it('should return failure when user has no phone number', async () => {
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue({
        userId: mockUserId,
        smsEnabled: true,
      });
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: mockUserId,
        phoneNumber: null,
      });

      const result = await service.sendSmsToUser(mockUserId, 'Test message');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Phone number not available in user profile');
    });

    it('should log warning when phone not verified for non-verification SMS', async () => {
      const warnSpy = jest.spyOn(service['logger'], 'warn');
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue({
        userId: mockUserId,
        smsEnabled: true,
      });
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: mockUserId,
        phoneNumber: mockPhoneNumber,
        phoneVerified: false,
      });

      await service.sendSmsToUser(mockUserId, 'Test message', 'order_updates');

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('phone number not verified')
      );
    });

    it('should send SMS when user has valid phone number', async () => {
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue({
        userId: mockUserId,
        smsEnabled: true,
      });
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: mockUserId,
        phoneNumber: mockPhoneNumber,
        phoneVerified: true,
      });

      const result = await service.sendSmsToUser(mockUserId, 'Test message');

      expect(result.error).toBe('Twilio not initialized');
    });
  });

  describe('getSmsStatus', () => {
    it('should return null when Twilio not initialized', async () => {
      const result = await service.getSmsStatus('msg-123');

      expect(result).toBeNull();
    });
  });

  describe('normalizePhoneNumber', () => {
    it('should normalize phone number without country code', () => {
      const normalized = (service as any).normalizePhoneNumber('1234567890');

      expect(normalized).toBe('+11234567890');
    });

    it('should preserve phone number with + prefix', () => {
      const normalized = (service as any).normalizePhoneNumber('+441234567890');

      expect(normalized).toBe('+441234567890');
    });

    it('should strip non-numeric characters', () => {
      const normalized = (service as any).normalizePhoneNumber('(123) 456-7890');

      expect(normalized).toBe('+11234567890');
    });

    it('should return null for too short numbers', () => {
      const normalized = (service as any).normalizePhoneNumber('12345');

      expect(normalized).toBeNull();
    });

    it('should return null for too long numbers', () => {
      const normalized = (service as any).normalizePhoneNumber('1234567890123456789');

      expect(normalized).toBeNull();
    });

    it('should handle numbers with country code but no +', () => {
      const normalized = (service as any).normalizePhoneNumber('11234567890');

      expect(normalized).toBe('+11234567890');
    });
  });

  describe('validatePhoneNumber', () => {
    it('should return invalid for bad format', async () => {
      const result = await service.validatePhoneNumber('abc');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid phone number format');
    });

    it('should return valid with formatted number when Twilio not available', async () => {
      const result = await service.validatePhoneNumber('+1234567890');

      expect(result.valid).toBe(true);
      expect(result.formatted).toBe('+1234567890');
    });

    it('should normalize and validate US numbers', async () => {
      const result = await service.validatePhoneNumber('1234567890');

      expect(result.valid).toBe(true);
      expect(result.formatted).toBe('+11234567890');
    });
  });

  describe('markPhoneAsVerified', () => {
    it('should update user phone verification status', async () => {
      mockPrismaService.user.update.mockResolvedValue({
        id: mockUserId,
        phoneVerified: true,
        phoneVerifiedAt: new Date(),
      });

      const result = await service.markPhoneAsVerified(mockUserId);

      expect(result).toBe(true);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: {
          phoneVerified: true,
          phoneVerifiedAt: expect.any(Date),
        },
      });
    });

    it('should return false on error', async () => {
      mockPrismaService.user.update.mockRejectedValue(new Error('Database error'));

      const result = await service.markPhoneAsVerified(mockUserId);

      expect(result).toBe(false);
    });

    it('should log success on verification', async () => {
      const logSpy = jest.spyOn(service['logger'], 'log');
      mockPrismaService.user.update.mockResolvedValue({});

      await service.markPhoneAsVerified(mockUserId);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Phone verified for user ${mockUserId}`)
      );
    });
  });

  describe('updateUserPhoneNumber', () => {
    it('should validate and update phone number', async () => {
      mockPrismaService.user.update.mockResolvedValue({
        id: mockUserId,
        phoneNumber: mockPhoneNumber,
        phoneVerified: false,
      });

      const result = await service.updateUserPhoneNumber(mockUserId, mockPhoneNumber);

      expect(result.success).toBe(true);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: {
          phoneNumber: mockPhoneNumber,
          phoneVerified: false,
          phoneVerifiedAt: null,
        },
      });
    });

    it('should return error for invalid phone number', async () => {
      const result = await service.updateUserPhoneNumber(mockUserId, '123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid phone number format');
    });

    it('should reset verification when phone changes', async () => {
      mockPrismaService.user.update.mockResolvedValue({});

      await service.updateUserPhoneNumber(mockUserId, '+9876543210');

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: expect.objectContaining({
          phoneVerified: false,
          phoneVerifiedAt: null,
        }),
      });
    });

    it('should return error on database failure', async () => {
      mockPrismaService.user.update.mockRejectedValue(new Error('Database error'));

      const result = await service.updateUserPhoneNumber(mockUserId, mockPhoneNumber);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('delay utility', () => {
    it('should delay execution', async () => {
      const startTime = Date.now();
      await (service as any).delay(50);
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThanOrEqual(45); // Allow small margin
    });
  });

  describe('edge cases', () => {
    it('should handle empty message', async () => {
      const result = await service.sendSms({
        to: mockPhoneNumber,
        message: '',
      });

      expect(result.success).toBe(false);
    });

    it('should handle scheduled SMS payload', async () => {
      const scheduledDate = new Date('2025-01-15T10:00:00Z');
      const payload: SmsPayload = {
        to: mockPhoneNumber,
        message: 'Scheduled message',
        scheduledAt: scheduledDate,
      };

      const result = await service.sendSms(payload);

      // Should still fail due to Twilio not initialized, but no error thrown
      expect(result.success).toBe(false);
    });
  });
});
