import { Test, TestingModule } from '@nestjs/testing';
import { SecurityController } from './security.controller';
import { SecurityService } from './security.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { ActivityType, UserRole } from '@prisma/client';
import { AuthRequest } from '@/common/types/auth-request.types';

describe('SecurityController', () => {
  let controller: SecurityController;
  let securityService: SecurityService;

  const mockSecurityService = {
    getAuditLogs: jest.fn(),
    createApiKey: jest.fn(),
    revokeApiKey: jest.fn(),
    setup2FA: jest.fn(),
    enable2FA: jest.fn(),
    disable2FA: jest.fn(),
    revokeSessions: jest.fn(),
    requestDataExport: jest.fn(),
    getSecurityEvents: jest.fn(),
  };

  const mockAdminUser = {
    id: 'admin-123',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
  };

  const mockCustomerUser = {
    id: 'user-123',
    email: 'customer@example.com',
    role: UserRole.CUSTOMER,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SecurityController],
      providers: [
        {
          provide: SecurityService,
          useValue: mockSecurityService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context) => {
          const request = context.switchToHttp().getRequest();
          request.user = mockAdminUser;
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({
        canActivate: () => true,
      })
      .compile();

    controller = module.get<SecurityController>(SecurityController);
    securityService = module.get<SecurityService>(SecurityService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ==================== Audit Logs ====================

  describe('getAuditLogs', () => {
    it('should return audit logs without filters', async () => {
      const mockAuditLogs = {
        logs: [
          {
            id: 'log-1',
            userId: 'user-123',
            activityType: ActivityType.LOGIN,
            action: 'User logged in',
            createdAt: new Date(),
          },
        ],
        pagination: { page: 1, limit: 50, total: 1, totalPages: 1 },
      };

      mockSecurityService.getAuditLogs.mockResolvedValue(mockAuditLogs);

      const result = await controller.getAuditLogs();

      expect(result).toEqual(mockAuditLogs);
      expect(mockSecurityService.getAuditLogs).toHaveBeenCalledWith({
        userId: undefined,
        activityType: undefined,
        page: undefined,
        limit: undefined,
      });
    });

    it('should return audit logs with userId filter', async () => {
      const mockAuditLogs = {
        logs: [],
        pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
      };

      mockSecurityService.getAuditLogs.mockResolvedValue(mockAuditLogs);

      await controller.getAuditLogs('user-456');

      expect(mockSecurityService.getAuditLogs).toHaveBeenCalledWith({
        userId: 'user-456',
        activityType: undefined,
        page: undefined,
        limit: undefined,
      });
    });

    it('should return audit logs with activityType filter', async () => {
      const mockAuditLogs = {
        logs: [],
        pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
      };

      mockSecurityService.getAuditLogs.mockResolvedValue(mockAuditLogs);

      await controller.getAuditLogs(undefined, ActivityType.LOGIN);

      expect(mockSecurityService.getAuditLogs).toHaveBeenCalledWith({
        userId: undefined,
        activityType: ActivityType.LOGIN,
        page: undefined,
        limit: undefined,
      });
    });

    it('should return audit logs with pagination', async () => {
      const mockAuditLogs = {
        logs: [],
        pagination: { page: 2, limit: 10, total: 25, totalPages: 3 },
      };

      mockSecurityService.getAuditLogs.mockResolvedValue(mockAuditLogs);

      await controller.getAuditLogs(undefined, undefined, 2, 10);

      expect(mockSecurityService.getAuditLogs).toHaveBeenCalledWith({
        userId: undefined,
        activityType: undefined,
        page: 2,
        limit: 10,
      });
    });

    it('should convert string page and limit to numbers', async () => {
      const mockAuditLogs = {
        logs: [],
        pagination: { page: 3, limit: 20, total: 100, totalPages: 5 },
      };

      mockSecurityService.getAuditLogs.mockResolvedValue(mockAuditLogs);

      // Simulate query params coming as strings
      await controller.getAuditLogs(undefined, undefined, '3' as any, '20' as any);

      expect(mockSecurityService.getAuditLogs).toHaveBeenCalledWith({
        userId: undefined,
        activityType: undefined,
        page: 3,
        limit: 20,
      });
    });
  });

  // ==================== API Key Management ====================

  describe('createApiKey', () => {
    it('should create an API key with basic parameters', async () => {
      const mockRequest = { user: mockCustomerUser } as AuthRequest;
      const dto = {
        name: 'My API Key',
        scopes: ['read:products', 'write:orders'],
      };

      const mockApiKey = {
        apiKey: {
          id: 'key-123',
          name: 'My API Key',
          keyPrefix: 'abcd1234',
          scopes: ['read:products', 'write:orders'],
        },
        plainKey: 'abcd1234567890abcdef',
      };

      mockSecurityService.createApiKey.mockResolvedValue(mockApiKey);

      const result = await controller.createApiKey(mockRequest, dto);

      expect(result).toEqual(mockApiKey);
      expect(mockSecurityService.createApiKey).toHaveBeenCalledWith(
        'user-123',
        'My API Key',
        ['read:products', 'write:orders'],
        undefined,
      );
    });

    it('should create an API key with expiration', async () => {
      const mockRequest = { user: mockCustomerUser } as AuthRequest;
      const dto = {
        name: 'Temporary Key',
        scopes: ['read:products'],
        expiresInDays: 30,
      };

      const mockApiKey = {
        apiKey: {
          id: 'key-456',
          name: 'Temporary Key',
          keyPrefix: 'efgh5678',
          scopes: ['read:products'],
          expiresAt: new Date(),
        },
        plainKey: 'efgh5678901234567890',
      };

      mockSecurityService.createApiKey.mockResolvedValue(mockApiKey);

      const result = await controller.createApiKey(mockRequest, dto);

      expect(result).toEqual(mockApiKey);
      expect(mockSecurityService.createApiKey).toHaveBeenCalledWith(
        'user-123',
        'Temporary Key',
        ['read:products'],
        30,
      );
    });

    it('should create API key with empty scopes', async () => {
      const mockRequest = { user: mockCustomerUser } as AuthRequest;
      const dto = {
        name: 'Basic Key',
        scopes: [],
      };

      mockSecurityService.createApiKey.mockResolvedValue({
        apiKey: { id: 'key-789', name: 'Basic Key', scopes: [] },
        plainKey: 'xyz123',
      });

      await controller.createApiKey(mockRequest, dto);

      expect(mockSecurityService.createApiKey).toHaveBeenCalledWith(
        'user-123',
        'Basic Key',
        [],
        undefined,
      );
    });
  });

  describe('revokeApiKey', () => {
    it('should revoke an API key', async () => {
      const mockRequest = { user: mockCustomerUser } as AuthRequest;
      const mockResponse = { message: 'API key revoked successfully' };

      mockSecurityService.revokeApiKey.mockResolvedValue(mockResponse);

      const result = await controller.revokeApiKey(mockRequest, 'key-123');

      expect(result).toEqual(mockResponse);
      expect(mockSecurityService.revokeApiKey).toHaveBeenCalledWith(
        'key-123',
        'user-123',
      );
    });

    it('should pass correct user ID when revoking', async () => {
      const mockRequest = { user: { ...mockCustomerUser, id: 'different-user' } } as AuthRequest;

      mockSecurityService.revokeApiKey.mockResolvedValue({ message: 'API key revoked successfully' });

      await controller.revokeApiKey(mockRequest, 'key-456');

      expect(mockSecurityService.revokeApiKey).toHaveBeenCalledWith(
        'key-456',
        'different-user',
      );
    });
  });

  // ==================== Two-Factor Authentication ====================

  describe('setup2FA', () => {
    it('should setup 2FA for authenticated user', async () => {
      const mockRequest = { user: mockCustomerUser } as AuthRequest;
      const mock2FASetup = {
        secret: 'JBSWY3DPEHPK3PXP',
        qrCode: 'data:image/png;base64,iVBORw0KGgo...',
        backupCodes: ['ABC12345', 'DEF67890', 'GHI11111'],
      };

      mockSecurityService.setup2FA.mockResolvedValue(mock2FASetup);

      const result = await controller.setup2FA(mockRequest);

      expect(result).toEqual(mock2FASetup);
      expect(mockSecurityService.setup2FA).toHaveBeenCalledWith('user-123');
    });

    it('should return QR code for scanning', async () => {
      const mockRequest = { user: mockCustomerUser } as AuthRequest;
      const mock2FASetup = {
        secret: 'JBSWY3DPEHPK3PXP',
        qrCode: 'data:image/png;base64,iVBORw0KGgo...',
        backupCodes: ['CODE1', 'CODE2'],
      };

      mockSecurityService.setup2FA.mockResolvedValue(mock2FASetup);

      const result = await controller.setup2FA(mockRequest);

      expect(result.qrCode).toBeDefined();
      expect(result.qrCode).toContain('data:image');
    });
  });

  describe('enable2FA', () => {
    it('should enable 2FA with valid token', async () => {
      const mockRequest = { user: mockCustomerUser } as AuthRequest;
      const dto = { token: '123456' };
      const mockResponse = { message: '2FA enabled successfully' };

      mockSecurityService.enable2FA.mockResolvedValue(mockResponse);

      const result = await controller.enable2FA(mockRequest, dto);

      expect(result).toEqual(mockResponse);
      expect(mockSecurityService.enable2FA).toHaveBeenCalledWith(
        'user-123',
        '123456',
      );
    });

    it('should pass token to service for verification', async () => {
      const mockRequest = { user: mockCustomerUser } as AuthRequest;
      const dto = { token: '654321' };

      mockSecurityService.enable2FA.mockResolvedValue({ message: '2FA enabled successfully' });

      await controller.enable2FA(mockRequest, dto);

      expect(mockSecurityService.enable2FA).toHaveBeenCalledWith(
        'user-123',
        '654321',
      );
    });
  });

  describe('disable2FA', () => {
    it('should disable 2FA with valid token', async () => {
      const mockRequest = { user: mockCustomerUser } as AuthRequest;
      const dto = { token: '123456' };
      const mockResponse = { message: '2FA disabled successfully' };

      mockSecurityService.disable2FA.mockResolvedValue(mockResponse);

      const result = await controller.disable2FA(mockRequest, dto);

      expect(result).toEqual(mockResponse);
      expect(mockSecurityService.disable2FA).toHaveBeenCalledWith(
        'user-123',
        '123456',
      );
    });

    it('should require token verification to disable', async () => {
      const mockRequest = { user: mockCustomerUser } as AuthRequest;
      const dto = { token: '999999' };

      mockSecurityService.disable2FA.mockResolvedValue({ message: '2FA disabled successfully' });

      await controller.disable2FA(mockRequest, dto);

      expect(mockSecurityService.disable2FA).toHaveBeenCalledWith(
        'user-123',
        '999999',
      );
    });
  });

  // ==================== Session Management ====================

  describe('revokeSessions', () => {
    it('should revoke all sessions for authenticated user', async () => {
      const mockRequest = { user: mockCustomerUser } as AuthRequest;
      const mockResponse = { message: 'Sessions revoked successfully' };

      mockSecurityService.revokeSessions.mockResolvedValue(mockResponse);

      const result = await controller.revokeSessions(mockRequest);

      expect(result).toEqual(mockResponse);
      expect(mockSecurityService.revokeSessions).toHaveBeenCalledWith('user-123');
    });

    it('should revoke sessions for specific user', async () => {
      const mockRequest = { user: { ...mockCustomerUser, id: 'user-456' } } as AuthRequest;

      mockSecurityService.revokeSessions.mockResolvedValue({ message: 'Sessions revoked successfully' });

      await controller.revokeSessions(mockRequest);

      expect(mockSecurityService.revokeSessions).toHaveBeenCalledWith('user-456');
    });
  });

  // ==================== GDPR Data Export ====================

  describe('requestDataExport', () => {
    it('should request data export with default JSON format', async () => {
      const mockRequest = { user: mockCustomerUser } as AuthRequest;
      const dto = {};
      const mockExportRequest = {
        id: 'export-123',
        userId: 'user-123',
        format: 'JSON',
        status: 'PENDING',
      };

      mockSecurityService.requestDataExport.mockResolvedValue(mockExportRequest);

      const result = await controller.requestDataExport(mockRequest, dto);

      expect(result).toEqual(mockExportRequest);
      expect(mockSecurityService.requestDataExport).toHaveBeenCalledWith(
        'user-123',
        undefined,
      );
    });

    it('should request data export with JSON format', async () => {
      const mockRequest = { user: mockCustomerUser } as AuthRequest;
      const dto = { format: 'JSON' as const };

      mockSecurityService.requestDataExport.mockResolvedValue({
        id: 'export-123',
        format: 'JSON',
        status: 'PENDING',
      });

      await controller.requestDataExport(mockRequest, dto);

      expect(mockSecurityService.requestDataExport).toHaveBeenCalledWith(
        'user-123',
        'JSON',
      );
    });

    it('should request data export with CSV format', async () => {
      const mockRequest = { user: mockCustomerUser } as AuthRequest;
      const dto = { format: 'CSV' as const };

      mockSecurityService.requestDataExport.mockResolvedValue({
        id: 'export-456',
        format: 'CSV',
        status: 'PENDING',
      });

      await controller.requestDataExport(mockRequest, dto);

      expect(mockSecurityService.requestDataExport).toHaveBeenCalledWith(
        'user-123',
        'CSV',
      );
    });
  });

  // ==================== Security Events ====================

  describe('getSecurityEvents', () => {
    it('should return security events without filters', async () => {
      const mockSecurityEvents = {
        events: [
          {
            id: 'event-1',
            type: 'BRUTE_FORCE',
            severity: 'HIGH',
            description: 'Multiple failed login attempts',
            createdAt: new Date(),
          },
        ],
        pagination: { page: 1, limit: 50, total: 1, totalPages: 1 },
      };

      mockSecurityService.getSecurityEvents.mockResolvedValue(mockSecurityEvents);

      const result = await controller.getSecurityEvents();

      expect(result).toEqual(mockSecurityEvents);
      expect(mockSecurityService.getSecurityEvents).toHaveBeenCalledWith({
        type: undefined,
        severity: undefined,
        resolved: undefined,
        page: undefined,
        limit: undefined,
      });
    });

    it('should filter security events by type', async () => {
      mockSecurityService.getSecurityEvents.mockResolvedValue({
        events: [],
        pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
      });

      await controller.getSecurityEvents('BRUTE_FORCE');

      expect(mockSecurityService.getSecurityEvents).toHaveBeenCalledWith({
        type: 'BRUTE_FORCE',
        severity: undefined,
        resolved: undefined,
        page: undefined,
        limit: undefined,
      });
    });

    it('should filter security events by severity', async () => {
      mockSecurityService.getSecurityEvents.mockResolvedValue({
        events: [],
        pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
      });

      await controller.getSecurityEvents(undefined, 'HIGH');

      expect(mockSecurityService.getSecurityEvents).toHaveBeenCalledWith({
        type: undefined,
        severity: 'HIGH',
        resolved: undefined,
        page: undefined,
        limit: undefined,
      });
    });

    it('should filter security events by resolved status', async () => {
      mockSecurityService.getSecurityEvents.mockResolvedValue({
        events: [],
        pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
      });

      await controller.getSecurityEvents(undefined, undefined, false);

      expect(mockSecurityService.getSecurityEvents).toHaveBeenCalledWith({
        type: undefined,
        severity: undefined,
        resolved: false,
        page: undefined,
        limit: undefined,
      });
    });

    it('should filter security events with pagination', async () => {
      mockSecurityService.getSecurityEvents.mockResolvedValue({
        events: [],
        pagination: { page: 2, limit: 25, total: 50, totalPages: 2 },
      });

      await controller.getSecurityEvents(undefined, undefined, undefined, 2, 25);

      expect(mockSecurityService.getSecurityEvents).toHaveBeenCalledWith({
        type: undefined,
        severity: undefined,
        resolved: undefined,
        page: 2,
        limit: 25,
      });
    });

    it('should handle combined filters', async () => {
      mockSecurityService.getSecurityEvents.mockResolvedValue({
        events: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      });

      await controller.getSecurityEvents('UNAUTHORIZED_ACCESS', 'CRITICAL', true, 1, 10);

      expect(mockSecurityService.getSecurityEvents).toHaveBeenCalledWith({
        type: 'UNAUTHORIZED_ACCESS',
        severity: 'CRITICAL',
        resolved: true,
        page: 1,
        limit: 10,
      });
    });
  });
});
