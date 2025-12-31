import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PrivacyService } from './privacy.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DataExportService } from '../users/data-export.service';
import { DataDeletionService, DeletionStrategy } from '../users/data-deletion.service';

describe('PrivacyService', () => {
  let service: PrivacyService;
  let prisma: PrismaService;
  let dataExportService: DataExportService;
  let dataDeletionService: DataDeletionService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    consentLog: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    agreedTerms: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockDataExportService = {
    generateExportReport: jest.fn(),
    exportUserData: jest.fn(),
  };

  const mockDataDeletionService = {
    getDataRetentionInfo: jest.fn(),
    scheduleDeletion: jest.fn(),
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'CUSTOMER',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrivacyService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: DataExportService,
          useValue: mockDataExportService,
        },
        {
          provide: DataDeletionService,
          useValue: mockDataDeletionService,
        },
      ],
    }).compile();

    service = module.get<PrivacyService>(PrivacyService);
    prisma = module.get<PrismaService>(PrismaService);
    dataExportService = module.get<DataExportService>(DataExportService);
    dataDeletionService = module.get<DataDeletionService>(DataDeletionService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getStoredDataOverview', () => {
    it('should return stored data overview with consent status', async () => {
      const mockReport = {
        userId: 'user-123',
        email: 'test@example.com',
        exportDate: '2024-02-20T10:30:00Z',
        dataCategories: {
          personalInformation: 1,
          orders: 15,
        },
      };

      const mockConsent = {
        consent: {
          dataProcessing: true,
          marketing: true,
          analytics: true,
          thirdPartySharing: false,
        },
      };

      mockDataExportService.generateExportReport.mockResolvedValue(mockReport);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.consentLog.findFirst.mockResolvedValue({
        dataProcessing: true,
        marketing: true,
        analytics: true,
        thirdPartySharing: false,
        createdAt: new Date('2024-01-15'),
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        version: '1.0',
      });

      const result = await service.getStoredDataOverview('user-123');

      expect(result).toHaveProperty('userId', 'user-123');
      expect(result).toHaveProperty('consentStatus');
      expect(mockDataExportService.generateExportReport).toHaveBeenCalledWith('user-123');
    });

    it('should include default consent when no consent log exists', async () => {
      mockDataExportService.generateExportReport.mockResolvedValue({ userId: 'user-123' });
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.consentLog.findFirst.mockResolvedValue(null);

      const result = await service.getStoredDataOverview('user-123');

      expect(result.consentStatus).toEqual({
        dataProcessing: true,
        marketing: false,
        analytics: false,
        thirdPartySharing: false,
      });
    });
  });

  describe('initiateDataExport', () => {
    it('should initiate data export with json format', async () => {
      const result = await service.initiateDataExport('user-123', 'json');

      expect(result.message).toBe('Data export has been initiated');
      expect(result.format).toBe('json');
      expect(result.exportId).toContain('export_user-123');
      expect(result.downloadUrl).toBe('/privacy/export/download?format=json');
      expect(result.expiresAt).toBeDefined();
    });

    it('should initiate data export with csv format', async () => {
      const result = await service.initiateDataExport('user-123', 'csv');

      expect(result.format).toBe('csv');
      expect(result.downloadUrl).toBe('/privacy/export/download?format=csv');
    });

    it('should set expiration date 7 days in the future', async () => {
      const result = await service.initiateDataExport('user-123', 'json');

      const expiresAt = new Date(result.expiresAt);
      const now = new Date();
      const daysDifference = Math.round((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      expect(daysDifference).toBeGreaterThanOrEqual(6);
      expect(daysDifference).toBeLessThanOrEqual(7);
    });

    it('should include note about email notification', async () => {
      const result = await service.initiateDataExport('user-123', 'json');

      expect(result.note).toContain('email');
      expect(result.note).toContain('7 days');
    });
  });

  describe('generateDataExport', () => {
    it('should generate data export in specified format', async () => {
      const mockExportData = { user: { id: 'user-123' } };
      mockDataExportService.exportUserData.mockResolvedValue(mockExportData);

      const result = await service.generateDataExport('user-123', 'json');

      expect(result).toEqual(mockExportData);
      expect(mockDataExportService.exportUserData).toHaveBeenCalledWith('user-123', 'json');
    });

    it('should generate data export in csv format', async () => {
      const mockCsvData = 'id,email\nuser-123,test@example.com';
      mockDataExportService.exportUserData.mockResolvedValue(mockCsvData);

      const result = await service.generateDataExport('user-123', 'csv');

      expect(result).toEqual(mockCsvData);
      expect(mockDataExportService.exportUserData).toHaveBeenCalledWith('user-123', 'csv');
    });
  });

  describe('requestDeletion', () => {
    const mockRetentionInfo = {
      dataTypes: ['profile', 'orders'],
      retentionPeriod: 365,
      deletionScheduled: false,
      deletionOptions: {
        gracePeriodDays: 30,
        strategies: ['hard', 'soft', 'anonymize'] as DeletionStrategy[],
        hardDelete: true,
      },
    };

    const mockSchedule = {
      requestId: 'deletion-123',
      scheduledDate: new Date('2024-03-20'),
      cancellationDeadline: new Date('2024-03-13'),
    };

    it('should request deletion with ANONYMIZE strategy', async () => {
      mockDataDeletionService.getDataRetentionInfo.mockResolvedValue(mockRetentionInfo);
      mockDataDeletionService.scheduleDeletion.mockResolvedValue(mockSchedule);

      const result = await service.requestDeletion('user-123', {
        strategy: 'ANONYMIZE',
        reason: 'No longer using the service',
      });

      expect(result.message).toBe('Account deletion request has been received');
      expect(result.strategy).toBe('ANONYMIZE');
      expect(result.userId).toBe('user-123');
      expect(mockDataDeletionService.scheduleDeletion).toHaveBeenCalled();
    });

    it('should request deletion with SOFT_DELETE strategy', async () => {
      mockDataDeletionService.getDataRetentionInfo.mockResolvedValue(mockRetentionInfo);
      mockDataDeletionService.scheduleDeletion.mockResolvedValue(mockSchedule);

      const result = await service.requestDeletion('user-123', {
        strategy: 'SOFT_DELETE',
      });

      expect(result.strategy).toBe('SOFT_DELETE');
    });

    it('should request deletion with HARD_DELETE strategy when available', async () => {
      mockDataDeletionService.getDataRetentionInfo.mockResolvedValue(mockRetentionInfo);
      mockDataDeletionService.scheduleDeletion.mockResolvedValue(mockSchedule);

      const result = await service.requestDeletion('user-123', {
        strategy: 'HARD_DELETE',
      });

      expect(result.strategy).toBe('HARD_DELETE');
    });

    it('should reject HARD_DELETE when not available', async () => {
      const restrictedRetentionInfo = {
        ...mockRetentionInfo,
        deletionOptions: {
          ...mockRetentionInfo.deletionOptions,
          hardDelete: false,
        },
      };

      mockDataDeletionService.getDataRetentionInfo.mockResolvedValue(restrictedRetentionInfo);

      const result = await service.requestDeletion('user-123', {
        strategy: 'HARD_DELETE',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Hard delete is not available');
      expect(result.suggestedStrategy).toBe('ANONYMIZE');
    });

    it('should include data retention info in response', async () => {
      mockDataDeletionService.getDataRetentionInfo.mockResolvedValue(mockRetentionInfo);
      mockDataDeletionService.scheduleDeletion.mockResolvedValue(mockSchedule);

      const result = await service.requestDeletion('user-123', {
        strategy: 'ANONYMIZE',
      });

      expect(result.dataRetentionInfo).toBeDefined();
      expect(result.dataRetentionInfo.ordersRetained).toBe(true);
      expect(result.dataRetentionInfo.retentionPeriod).toBe('7 years');
    });

    it('should include cancellation deadline in response', async () => {
      mockDataDeletionService.getDataRetentionInfo.mockResolvedValue(mockRetentionInfo);
      mockDataDeletionService.scheduleDeletion.mockResolvedValue(mockSchedule);

      const result = await service.requestDeletion('user-123', {
        strategy: 'ANONYMIZE',
      });

      expect(result.scheduledDate).toBeDefined();
      expect(result.cancellationDeadline).toBeDefined();
    });
  });

  describe('getRetentionInfo', () => {
    it('should return retention information from data deletion service', async () => {
      const mockRetentionInfo = {
        dataTypes: ['profile', 'orders', 'addresses', 'reviews'],
        retentionPeriod: 365,
        deletionScheduled: false,
        deletionOptions: {
          gracePeriodDays: 30,
          strategies: ['hard', 'soft', 'anonymize'] as DeletionStrategy[],
          hardDelete: true,
        },
      };

      mockDataDeletionService.getDataRetentionInfo.mockResolvedValue(mockRetentionInfo);

      const result = await service.getRetentionInfo('user-123');

      expect(result).toEqual(mockRetentionInfo);
      expect(mockDataDeletionService.getDataRetentionInfo).toHaveBeenCalledWith('user-123');
    });
  });

  describe('updateConsent', () => {
    it('should update consent preferences', async () => {
      const consentDto = {
        dataProcessing: true,
        marketing: false,
        analytics: true,
        thirdPartySharing: false,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      const mockConsentLog = {
        id: 'consent-123',
        userId: 'user-123',
        dataProcessing: true,
        marketing: false,
        analytics: true,
        thirdPartySharing: false,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        version: '1.0',
        createdAt: new Date('2024-02-20'),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.consentLog.create.mockResolvedValue(mockConsentLog);

      const result = await service.updateConsent('user-123', consentDto);

      expect(result.userId).toBe('user-123');
      expect(result.consent.dataProcessing).toBe(true);
      expect(result.consent.marketing).toBe(false);
      expect(result.consent.analytics).toBe(true);
      expect(result.consent.thirdPartySharing).toBe(false);
      expect(result.ipAddress).toBe('192.168.1.1');
      expect(result.userAgent).toBe('Mozilla/5.0');
      expect(result.version).toBe('1.0');
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updateConsent('nonexistent-user', {
          dataProcessing: true,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should default optional consent fields to false', async () => {
      const consentDto = {
        dataProcessing: true,
      };

      const mockConsentLog = {
        id: 'consent-123',
        userId: 'user-123',
        dataProcessing: true,
        marketing: false,
        analytics: false,
        thirdPartySharing: false,
        ipAddress: 'unknown',
        userAgent: 'unknown',
        version: '1.0',
        createdAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.consentLog.create.mockResolvedValue(mockConsentLog);

      const result = await service.updateConsent('user-123', consentDto);

      expect(result.consent.marketing).toBe(false);
      expect(result.consent.analytics).toBe(false);
      expect(result.consent.thirdPartySharing).toBe(false);
    });

    it('should create immutable consent log entry', async () => {
      const consentDto = {
        dataProcessing: true,
        marketing: true,
        ipAddress: '10.0.0.1',
        userAgent: 'Chrome',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.consentLog.create.mockResolvedValue({
        ...consentDto,
        analytics: false,
        thirdPartySharing: false,
        version: '1.0',
        createdAt: new Date(),
      });

      await service.updateConsent('user-123', consentDto);

      expect(mockPrismaService.consentLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          dataProcessing: true,
          marketing: true,
          analytics: false,
          thirdPartySharing: false,
          ipAddress: '10.0.0.1',
          userAgent: 'Chrome',
          version: '1.0',
        },
      });
    });
  });

  describe('getConsent', () => {
    it('should return current consent preferences', async () => {
      const mockConsentLog = {
        dataProcessing: true,
        marketing: true,
        analytics: true,
        thirdPartySharing: false,
        createdAt: new Date('2024-02-20'),
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        version: '1.0',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.consentLog.findFirst.mockResolvedValue(mockConsentLog);

      const result = await service.getConsent('user-123');

      expect(result.userId).toBe('user-123');
      expect(result.consent.dataProcessing).toBe(true);
      expect(result.consent.marketing).toBe(true);
      expect(result.consent.analytics).toBe(true);
      expect(result.consent.thirdPartySharing).toBe(false);
      expect(result.ipAddress).toBe('192.168.1.1');
      expect(result.version).toBe('1.0');
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getConsent('nonexistent-user')).rejects.toThrow(NotFoundException);
    });

    it('should return default consent when no consent log exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.consentLog.findFirst.mockResolvedValue(null);

      const result = await service.getConsent('user-123');

      expect(result.consent).toEqual({
        dataProcessing: true,
        marketing: false,
        analytics: false,
        thirdPartySharing: false,
      });
      expect(result.note).toContain('Default values');
      expect(result.ipAddress).toBeNull();
    });

    it('should query consent log with correct ordering', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.consentLog.findFirst.mockResolvedValue(null);

      await service.getConsent('user-123');

      expect(mockPrismaService.consentLog.findFirst).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getConsentHistory', () => {
    it('should return consent history', async () => {
      const mockConsentLogs = [
        {
          dataProcessing: true,
          marketing: false,
          analytics: true,
          thirdPartySharing: false,
          createdAt: new Date('2024-02-20'),
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          version: '1.0',
        },
        {
          dataProcessing: true,
          marketing: true,
          analytics: true,
          thirdPartySharing: false,
          createdAt: new Date('2024-01-15'),
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          version: '1.0',
        },
      ];

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.consentLog.findMany.mockResolvedValue(mockConsentLogs);

      const result = await service.getConsentHistory('user-123');

      expect(result.userId).toBe('user-123');
      expect(result.totalRecords).toBe(2);
      expect(result.history).toHaveLength(2);
      expect(result.history[0].consent.marketing).toBe(false);
      expect(result.history[1].consent.marketing).toBe(true);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getConsentHistory('nonexistent-user')).rejects.toThrow(NotFoundException);
    });

    it('should return empty history when no consent logs exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.consentLog.findMany.mockResolvedValue([]);

      const result = await service.getConsentHistory('user-123');

      expect(result.totalRecords).toBe(0);
      expect(result.history).toEqual([]);
    });

    it('should query consent logs with descending order', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.consentLog.findMany.mockResolvedValue([]);

      await service.getConsentHistory('user-123');

      expect(mockPrismaService.consentLog.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('verifyDataAccuracy', () => {
    it('should return data accuracy information', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.verifyDataAccuracy('user-123');

      expect(result.userId).toBe('user-123');
      expect(result.dataFields.email.value).toBe('test@example.com');
      expect(result.dataFields.email.verified).toBe(true);
      expect(result.dataFields.name.value).toBe('Test User');
      expect(result.dataFields.name.verified).toBe(false);
      expect(result.message).toContain('profile settings');
      expect(result.updateEndpoint).toBe('PATCH /users/profile');
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.verifyDataAccuracy('nonexistent-user')).rejects.toThrow(NotFoundException);
    });

    it('should include lastVerified timestamp', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.verifyDataAccuracy('user-123');

      expect(result.lastVerified).toBeDefined();
      expect(new Date(result.lastVerified)).toBeInstanceOf(Date);
    });
  });

  describe('restrictProcessing', () => {
    it('should restrict data processing', async () => {
      const mockConsentLog = {
        dataProcessing: true,
        marketing: false,
        analytics: false,
        thirdPartySharing: false,
        createdAt: new Date(),
        ipAddress: 'system',
        userAgent: 'system',
        version: '1.0',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.consentLog.create.mockResolvedValue(mockConsentLog);

      const result = await service.restrictProcessing('user-123');

      expect(result.userId).toBe('user-123');
      expect(result.processingRestricted).toBe(true);
      expect(result.restrictedActivities).toContain('marketing');
      expect(result.restrictedActivities).toContain('analytics');
      expect(result.restrictedActivities).toContain('recommendations');
      expect(result.allowedActivities).toContain('account management');
      expect(result.allowedActivities).toContain('order processing');
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.restrictProcessing('nonexistent-user')).rejects.toThrow(NotFoundException);
    });

    it('should update consent to restrict non-essential processing', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.consentLog.create.mockResolvedValue({
        dataProcessing: true,
        marketing: false,
        analytics: false,
        thirdPartySharing: false,
        createdAt: new Date(),
        ipAddress: 'system',
        userAgent: 'system',
        version: '1.0',
      });

      await service.restrictProcessing('user-123');

      expect(mockPrismaService.consentLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          dataProcessing: true,
          marketing: false,
          analytics: false,
          thirdPartySharing: false,
          ipAddress: 'system',
          userAgent: 'system',
          version: '1.0',
        },
      });
    });

    it('should include applied timestamp in response', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.consentLog.create.mockResolvedValue({
        dataProcessing: true,
        marketing: false,
        analytics: false,
        thirdPartySharing: false,
        createdAt: new Date(),
        ipAddress: 'system',
        userAgent: 'system',
        version: '1.0',
      });

      const result = await service.restrictProcessing('user-123');

      expect(result.appliedAt).toBeDefined();
      expect(new Date(result.appliedAt)).toBeInstanceOf(Date);
    });
  });

  describe('getAgreedTerms', () => {
    it('should return agreed terms information', async () => {
      const mockAgreedTerms = {
        userId: 'user-123',
        termsVersion: '1.0',
        privacyPolicyVersion: '1.0',
        cookiePolicyVersion: '1.0',
        agreedAt: new Date('2024-01-15'),
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.agreedTerms.findFirst.mockResolvedValue(mockAgreedTerms);

      const result = await service.getAgreedTerms('user-123');

      expect(result.userId).toBe('user-123');
      expect(result.versions.privacyPolicy).toBe('1.0');
      expect(result.versions.termsOfService).toBe('1.0');
      expect(result.versions.cookiePolicy).toBe('1.0');
      expect(result.documents.privacyPolicy).toBe('/legal/privacy-policy');
      expect(result.documents.termsOfService).toBe('/legal/terms-of-service');
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getAgreedTerms('nonexistent-user')).rejects.toThrow(NotFoundException);
    });

    it('should return default structure when no terms record exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.agreedTerms.findFirst.mockResolvedValue(null);

      const result = await service.getAgreedTerms('user-123');

      expect(result.versions.privacyPolicy).toBe('Not recorded');
      expect(result.versions.termsOfService).toBe('Not recorded');
      expect(result.versions.cookiePolicy).toBe('Not recorded');
      expect(result.note).toContain('No terms acceptance record found');
    });

    it('should query agreed terms with correct ordering', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.agreedTerms.findFirst.mockResolvedValue(null);

      await service.getAgreedTerms('user-123');

      expect(mockPrismaService.agreedTerms.findFirst).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: { agreedAt: 'desc' },
      });
    });
  });

  describe('recordTermsAcceptance', () => {
    it('should record terms acceptance', async () => {
      const mockAgreedTerms = {
        id: 'terms-123',
        userId: 'user-123',
        termsVersion: '2.0',
        privacyPolicyVersion: '2.0',
        cookiePolicyVersion: '2.0',
        agreedAt: new Date('2024-02-20'),
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.agreedTerms.create.mockResolvedValue(mockAgreedTerms);

      const result = await service.recordTermsAcceptance(
        'user-123',
        '2.0',
        '2.0',
        '2.0',
        '192.168.1.1',
        'Mozilla/5.0',
      );

      expect(result.userId).toBe('user-123');
      expect(result.versions.privacyPolicy).toBe('2.0');
      expect(result.versions.termsOfService).toBe('2.0');
      expect(result.versions.cookiePolicy).toBe('2.0');
      expect(result.ipAddress).toBe('192.168.1.1');
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.recordTermsAcceptance('nonexistent-user', '1.0', '1.0'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle optional cookie policy version', async () => {
      const mockAgreedTerms = {
        id: 'terms-123',
        userId: 'user-123',
        termsVersion: '1.0',
        privacyPolicyVersion: '1.0',
        cookiePolicyVersion: null,
        agreedAt: new Date(),
        ipAddress: 'unknown',
        userAgent: 'unknown',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.agreedTerms.create.mockResolvedValue(mockAgreedTerms);

      const result = await service.recordTermsAcceptance('user-123', '1.0', '1.0');

      expect(result.versions.cookiePolicy).toBe('Not specified');
    });

    it('should default ipAddress and userAgent to unknown', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.agreedTerms.create.mockResolvedValue({
        id: 'terms-123',
        userId: 'user-123',
        termsVersion: '1.0',
        privacyPolicyVersion: '1.0',
        cookiePolicyVersion: undefined,
        agreedAt: new Date(),
        ipAddress: 'unknown',
        userAgent: 'unknown',
      });

      await service.recordTermsAcceptance('user-123', '1.0', '1.0');

      expect(mockPrismaService.agreedTerms.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          termsVersion: '1.0',
          privacyPolicyVersion: '1.0',
          cookiePolicyVersion: undefined,
          ipAddress: 'unknown',
          userAgent: 'unknown',
        },
      });
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully in getConsent', async () => {
      mockPrismaService.user.findUnique.mockRejectedValue(new Error('Database connection error'));

      await expect(service.getConsent('user-123')).rejects.toThrow('Database connection error');
    });

    it('should handle database errors gracefully in updateConsent', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.consentLog.create.mockRejectedValue(new Error('Database write error'));

      await expect(
        service.updateConsent('user-123', { dataProcessing: true }),
      ).rejects.toThrow('Database write error');
    });

    it('should handle database errors gracefully in getConsentHistory', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.consentLog.findMany.mockRejectedValue(new Error('Database query error'));

      await expect(service.getConsentHistory('user-123')).rejects.toThrow('Database query error');
    });
  });
});
