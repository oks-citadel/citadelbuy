import { Test, TestingModule } from '@nestjs/testing';
import { PrivacyController } from './privacy.controller';
import { PrivacyService } from './privacy.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExecutionContext } from '@nestjs/common';
import { Response } from 'express';
import { ConsentDto, DataExportRequestDto, DataDeletionRequestDto } from './dto/consent.dto';

describe('PrivacyController', () => {
  let controller: PrivacyController;
  let service: PrivacyService;

  const mockPrivacyService = {
    getStoredDataOverview: jest.fn(),
    initiateDataExport: jest.fn(),
    generateDataExport: jest.fn(),
    requestDeletion: jest.fn(),
    getRetentionInfo: jest.fn(),
    updateConsent: jest.fn(),
    getConsent: jest.fn(),
    verifyDataAccuracy: jest.fn(),
    restrictProcessing: jest.fn(),
    getAgreedTerms: jest.fn(),
    getConsentHistory: jest.fn(),
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'CUSTOMER',
  };

  const mockRequest = {
    user: { id: 'user-123' },
    ip: '127.0.0.1',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PrivacyController],
      providers: [
        {
          provide: PrivacyService,
          useValue: mockPrivacyService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const request = context.switchToHttp().getRequest();
          request.user = { id: 'user-123' };
          return true;
        },
      })
      .compile();

    controller = module.get<PrivacyController>(PrivacyController);
    service = module.get<PrivacyService>(PrivacyService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('viewStoredData', () => {
    it('should return user data overview', async () => {
      const mockDataOverview = {
        userId: 'user-123',
        email: 'test@example.com',
        exportDate: '2024-02-20T10:30:00Z',
        dataCategories: {
          personalInformation: 1,
          orders: 15,
          reviews: 8,
          wishlist: 12,
        },
        consentStatus: {
          dataProcessing: true,
          marketing: true,
          analytics: true,
          thirdPartySharing: false,
        },
      };

      mockPrivacyService.getStoredDataOverview.mockResolvedValue(mockDataOverview);

      const result = await controller.viewStoredData(mockRequest);

      expect(result).toEqual(mockDataOverview);
      expect(mockPrivacyService.getStoredDataOverview).toHaveBeenCalledWith('user-123');
      expect(mockPrivacyService.getStoredDataOverview).toHaveBeenCalledTimes(1);
    });

    it('should extract user id from request', async () => {
      const customRequest = { user: { id: 'different-user-456' } };
      mockPrivacyService.getStoredDataOverview.mockResolvedValue({});

      await controller.viewStoredData(customRequest);

      expect(mockPrivacyService.getStoredDataOverview).toHaveBeenCalledWith('different-user-456');
    });
  });

  describe('requestDataExport', () => {
    it('should initiate data export with json format', async () => {
      const exportRequest: DataExportRequestDto = { format: 'json' };
      const mockExportResponse = {
        message: 'Data export has been initiated',
        exportId: 'export_123e4567',
        format: 'json',
        estimatedCompletionTime: '2024-02-20T10:35:00Z',
        downloadUrl: '/privacy/export/download/export_123e4567',
        expiresAt: '2024-02-27T10:30:00Z',
      };

      mockPrivacyService.initiateDataExport.mockResolvedValue(mockExportResponse);

      const result = await controller.requestDataExport(mockRequest, exportRequest);

      expect(result).toEqual(mockExportResponse);
      expect(mockPrivacyService.initiateDataExport).toHaveBeenCalledWith('user-123', 'json');
    });

    it('should initiate data export with csv format', async () => {
      const exportRequest: DataExportRequestDto = { format: 'csv' };
      const mockExportResponse = {
        message: 'Data export has been initiated',
        exportId: 'export_123e4567',
        format: 'csv',
      };

      mockPrivacyService.initiateDataExport.mockResolvedValue(mockExportResponse);

      const result = await controller.requestDataExport(mockRequest, exportRequest);

      expect(result).toEqual(mockExportResponse);
      expect(mockPrivacyService.initiateDataExport).toHaveBeenCalledWith('user-123', 'csv');
    });

    it('should default to json format when not specified', async () => {
      const exportRequest: DataExportRequestDto = {};
      mockPrivacyService.initiateDataExport.mockResolvedValue({});

      await controller.requestDataExport(mockRequest, exportRequest);

      expect(mockPrivacyService.initiateDataExport).toHaveBeenCalledWith('user-123', 'json');
    });
  });

  describe('downloadDataExport', () => {
    it('should download export as json', async () => {
      const mockExportData = JSON.stringify({ user: { id: 'user-123' } });
      const mockResponse = {
        setHeader: jest.fn(),
        send: jest.fn(),
      } as unknown as Response;

      mockPrivacyService.generateDataExport.mockResolvedValue(mockExportData);

      await controller.downloadDataExport(mockRequest, 'json', mockResponse);

      expect(mockPrivacyService.generateDataExport).toHaveBeenCalledWith('user-123', 'json');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('broxiva-data-export-user-123'),
      );
      expect(mockResponse.send).toHaveBeenCalledWith(mockExportData);
    });

    it('should download export as csv', async () => {
      const mockExportData = 'id,email,name\nuser-123,test@example.com,Test User';
      const mockResponse = {
        setHeader: jest.fn(),
        send: jest.fn(),
      } as unknown as Response;

      mockPrivacyService.generateDataExport.mockResolvedValue(mockExportData);

      await controller.downloadDataExport(mockRequest, 'csv', mockResponse);

      expect(mockPrivacyService.generateDataExport).toHaveBeenCalledWith('user-123', 'csv');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('.csv'),
      );
    });

    it('should default to json format', async () => {
      const mockResponse = {
        setHeader: jest.fn(),
        send: jest.fn(),
      } as unknown as Response;

      mockPrivacyService.generateDataExport.mockResolvedValue('{}');

      await controller.downloadDataExport(mockRequest, 'json', mockResponse);

      expect(mockPrivacyService.generateDataExport).toHaveBeenCalledWith('user-123', 'json');
    });
  });

  describe('requestAccountDeletion', () => {
    it('should request account deletion with ANONYMIZE strategy', async () => {
      const deletionRequest: DataDeletionRequestDto = {
        strategy: 'ANONYMIZE',
        reason: 'No longer using the service',
      };
      const mockDeletionResponse = {
        message: 'Account deletion request has been received',
        userId: 'user-123',
        strategy: 'ANONYMIZE',
        scheduledDate: '2024-03-20T10:30:00Z',
        cancellationDeadline: '2024-03-19T10:30:00Z',
        dataRetentionInfo: {
          ordersRetained: true,
          retentionPeriod: '7 years',
          reason: 'Legal and tax compliance',
        },
      };

      mockPrivacyService.requestDeletion.mockResolvedValue(mockDeletionResponse);

      const result = await controller.requestAccountDeletion(mockRequest, deletionRequest);

      expect(result).toEqual(mockDeletionResponse);
      expect(mockPrivacyService.requestDeletion).toHaveBeenCalledWith('user-123', deletionRequest);
    });

    it('should request account deletion with HARD_DELETE strategy', async () => {
      const deletionRequest: DataDeletionRequestDto = {
        strategy: 'HARD_DELETE',
      };
      const mockDeletionResponse = {
        message: 'Account deletion request has been received',
        userId: 'user-123',
        strategy: 'HARD_DELETE',
      };

      mockPrivacyService.requestDeletion.mockResolvedValue(mockDeletionResponse);

      const result = await controller.requestAccountDeletion(mockRequest, deletionRequest);

      expect(result).toEqual(mockDeletionResponse);
      expect(mockPrivacyService.requestDeletion).toHaveBeenCalledWith('user-123', deletionRequest);
    });

    it('should request account deletion with SOFT_DELETE strategy', async () => {
      const deletionRequest: DataDeletionRequestDto = {
        strategy: 'SOFT_DELETE',
        reason: 'Testing soft delete',
      };

      mockPrivacyService.requestDeletion.mockResolvedValue({ strategy: 'SOFT_DELETE' });

      await controller.requestAccountDeletion(mockRequest, deletionRequest);

      expect(mockPrivacyService.requestDeletion).toHaveBeenCalledWith('user-123', deletionRequest);
    });

    it('should handle scheduled deletion date', async () => {
      const scheduledDate = new Date('2024-12-31T23:59:59Z');
      const deletionRequest: DataDeletionRequestDto = {
        strategy: 'ANONYMIZE',
        scheduledDate,
      };

      mockPrivacyService.requestDeletion.mockResolvedValue({});

      await controller.requestAccountDeletion(mockRequest, deletionRequest);

      expect(mockPrivacyService.requestDeletion).toHaveBeenCalledWith('user-123', {
        strategy: 'ANONYMIZE',
        scheduledDate,
      });
    });
  });

  describe('getRetentionInfo', () => {
    it('should return data retention information', async () => {
      const mockRetentionInfo = {
        userId: 'user-123',
        retentionRequirements: {
          taxRecords: {
            required: true,
            period: '7 years',
            recordsCount: 15,
            reason: 'Tax law compliance',
          },
          activePaymentPlans: {
            required: false,
            count: 0,
            reason: 'Contractual obligation',
          },
        },
        deletionOptions: {
          hardDelete: true,
          softDelete: true,
          anonymize: true,
        },
        recommendation: 'All deletion strategies available',
      };

      mockPrivacyService.getRetentionInfo.mockResolvedValue(mockRetentionInfo);

      const result = await controller.getRetentionInfo(mockRequest);

      expect(result).toEqual(mockRetentionInfo);
      expect(mockPrivacyService.getRetentionInfo).toHaveBeenCalledWith('user-123');
    });
  });

  describe('updateConsent', () => {
    it('should update consent preferences', async () => {
      const consentDto: ConsentDto = {
        dataProcessing: true,
        marketing: false,
        analytics: true,
        thirdPartySharing: false,
      };
      const mockConsentResponse = {
        userId: 'user-123',
        consent: {
          dataProcessing: true,
          marketing: false,
          analytics: true,
          thirdPartySharing: false,
        },
        updatedAt: '2024-02-20T10:30:00Z',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
      };

      mockPrivacyService.updateConsent.mockResolvedValue(mockConsentResponse);

      const result = await controller.updateConsent(
        mockRequest,
        consentDto,
        '192.168.1.1',
        'Mozilla/5.0...',
      );

      expect(result).toEqual(mockConsentResponse);
      expect(mockPrivacyService.updateConsent).toHaveBeenCalledWith('user-123', {
        ...consentDto,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
      });
    });

    it('should handle missing forwarded-for header', async () => {
      const consentDto: ConsentDto = {
        dataProcessing: true,
        ipAddress: '10.0.0.1',
      };

      mockPrivacyService.updateConsent.mockResolvedValue({});

      await controller.updateConsent(mockRequest, consentDto, undefined as any, 'Mozilla/5.0');

      expect(mockPrivacyService.updateConsent).toHaveBeenCalledWith('user-123', {
        dataProcessing: true,
        ipAddress: '10.0.0.1',
        userAgent: 'Mozilla/5.0',
      });
    });

    it('should use request IP as fallback', async () => {
      const consentDto: ConsentDto = {
        dataProcessing: true,
      };

      mockPrivacyService.updateConsent.mockResolvedValue({});

      await controller.updateConsent(mockRequest, consentDto, undefined as any, undefined as any);

      expect(mockPrivacyService.updateConsent).toHaveBeenCalledWith('user-123', {
        dataProcessing: true,
        ipAddress: '127.0.0.1',
        userAgent: 'unknown',
      });
    });

    it('should use first IP from forwarded-for header', async () => {
      const consentDto: ConsentDto = {
        dataProcessing: true,
      };

      mockPrivacyService.updateConsent.mockResolvedValue({});

      await controller.updateConsent(
        mockRequest,
        consentDto,
        '192.168.1.1, 10.0.0.1, 172.16.0.1',
        'Mozilla/5.0',
      );

      expect(mockPrivacyService.updateConsent).toHaveBeenCalledWith('user-123', {
        dataProcessing: true,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });
    });
  });

  describe('getConsent', () => {
    it('should return current consent preferences', async () => {
      const mockConsentResponse = {
        userId: 'user-123',
        consent: {
          dataProcessing: true,
          marketing: true,
          analytics: true,
          thirdPartySharing: false,
        },
        grantedAt: '2024-01-15T08:00:00Z',
        lastUpdatedAt: '2024-02-10T14:30:00Z',
        ipAddress: '192.168.1.1',
      };

      mockPrivacyService.getConsent.mockResolvedValue(mockConsentResponse);

      const result = await controller.getConsent(mockRequest);

      expect(result).toEqual(mockConsentResponse);
      expect(mockPrivacyService.getConsent).toHaveBeenCalledWith('user-123');
    });
  });

  describe('verifyDataAccuracy', () => {
    it('should return data accuracy information', async () => {
      const mockDataAccuracy = {
        userId: 'user-123',
        lastVerified: '2024-01-15T08:00:00Z',
        dataFields: {
          email: { value: 'test@example.com', verified: true, lastUpdated: '2024-01-15T08:00:00Z' },
          name: { value: 'Test User', verified: false, lastUpdated: '2024-01-01T00:00:00Z' },
        },
        message: 'You can update your personal information through the profile settings page.',
      };

      mockPrivacyService.verifyDataAccuracy.mockResolvedValue(mockDataAccuracy);

      const result = await controller.verifyDataAccuracy(mockRequest);

      expect(result).toEqual(mockDataAccuracy);
      expect(mockPrivacyService.verifyDataAccuracy).toHaveBeenCalledWith('user-123');
    });
  });

  describe('restrictProcessing', () => {
    it('should restrict data processing', async () => {
      const mockRestrictionResponse = {
        userId: 'user-123',
        processingRestricted: true,
        restrictedActivities: ['marketing', 'analytics', 'recommendations'],
        appliedAt: '2024-02-20T10:30:00Z',
        message:
          'Your data will only be stored and processed for essential account functions and legal compliance.',
      };

      mockPrivacyService.restrictProcessing.mockResolvedValue(mockRestrictionResponse);

      const result = await controller.restrictProcessing(mockRequest);

      expect(result).toEqual(mockRestrictionResponse);
      expect(mockPrivacyService.restrictProcessing).toHaveBeenCalledWith('user-123');
    });
  });

  describe('getAgreedTerms', () => {
    it('should return agreed terms information', async () => {
      const mockAgreedTerms = {
        userId: 'user-123',
        agreedAt: '2024-01-15T08:00:00Z',
        versions: {
          privacyPolicy: '1.0',
          termsOfService: '1.0',
          cookiePolicy: '1.0',
        },
        documents: {
          privacyPolicy: '/legal/privacy-policy',
          termsOfService: '/legal/terms-of-service',
          cookiePolicy: '/legal/cookie-policy',
        },
      };

      mockPrivacyService.getAgreedTerms.mockResolvedValue(mockAgreedTerms);

      const result = await controller.getAgreedTerms(mockRequest);

      expect(result).toEqual(mockAgreedTerms);
      expect(mockPrivacyService.getAgreedTerms).toHaveBeenCalledWith('user-123');
    });
  });

  describe('getConsentHistory', () => {
    it('should return consent history', async () => {
      const mockConsentHistory = {
        userId: 'user-123',
        totalRecords: 3,
        history: [
          {
            consent: {
              dataProcessing: true,
              marketing: false,
              analytics: true,
              thirdPartySharing: false,
            },
            timestamp: '2024-02-20T10:30:00Z',
            ipAddress: '192.168.1.1',
            userAgent: 'Mozilla/5.0...',
            version: '1.0',
          },
          {
            consent: {
              dataProcessing: true,
              marketing: true,
              analytics: true,
              thirdPartySharing: false,
            },
            timestamp: '2024-01-15T08:00:00Z',
            ipAddress: '192.168.1.1',
            userAgent: 'Mozilla/5.0...',
            version: '1.0',
          },
        ],
      };

      mockPrivacyService.getConsentHistory.mockResolvedValue(mockConsentHistory);

      const result = await controller.getConsentHistory(mockRequest);

      expect(result).toEqual(mockConsentHistory);
      expect(mockPrivacyService.getConsentHistory).toHaveBeenCalledWith('user-123');
      expect(mockPrivacyService.getConsentHistory).toHaveBeenCalledTimes(1);
    });

    it('should return empty history when no consent records exist', async () => {
      const mockEmptyHistory = {
        userId: 'user-123',
        totalRecords: 0,
        history: [],
      };

      mockPrivacyService.getConsentHistory.mockResolvedValue(mockEmptyHistory);

      const result = await controller.getConsentHistory(mockRequest);

      expect(result.totalRecords).toBe(0);
      expect(result.history).toEqual([]);
    });
  });
});
