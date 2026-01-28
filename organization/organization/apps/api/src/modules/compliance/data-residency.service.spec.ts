import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  DataResidencyService,
  DataClassification,
  DataStorageLocation,
  DataResidencyPolicy,
} from './data-residency.service';

describe('DataResidencyService', () => {
  let service: DataResidencyService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataResidencyService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<DataResidencyService>(DataResidencyService);
    configService = module.get<ConfigService>(ConfigService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getResidencyRequirements', () => {
    it('should return EU GDPR requirements', () => {
      const requirements = service.getResidencyRequirements('EU');

      expect(requirements).toBeDefined();
      expect(requirements.length).toBeGreaterThan(0);
      expect(requirements[0].regulation).toContain('GDPR');
      expect(requirements[0].requirements.encryptionRequired).toBe(true);
    });

    it('should return US CCPA requirements', () => {
      const requirements = service.getResidencyRequirements('US');

      expect(requirements).toBeDefined();
      expect(requirements.some((r) => r.regulation.includes('CCPA'))).toBe(true);
    });

    it('should return Africa regional requirements', () => {
      const requirements = service.getResidencyRequirements('AFRICA');

      expect(requirements).toBeDefined();
      expect(requirements.some((r) => r.country === 'ZA')).toBe(true);
      expect(requirements.some((r) => r.country === 'NG')).toBe(true);
    });

    it('should return Asia regional requirements', () => {
      const requirements = service.getResidencyRequirements('ASIA');

      expect(requirements).toBeDefined();
      expect(requirements.some((r) => r.country === 'SG')).toBe(true);
      expect(requirements.some((r) => r.country === 'CN')).toBe(true);
    });

    it('should return Russia data localization requirements', () => {
      const requirements = service.getResidencyRequirements('RUSSIA');

      expect(requirements).toBeDefined();
      expect(requirements[0].requirements.localStorageRequired).toBe(true);
      expect(requirements[0].requirements.dataLocalizationRequired).toBe(true);
    });

    it('should filter by country when provided', () => {
      const requirements = service.getResidencyRequirements('AFRICA', 'ZA');

      expect(requirements).toBeDefined();
      expect(requirements.length).toBe(1);
      expect(requirements[0].country).toBe('ZA');
      expect(requirements[0].regulation).toContain('POPIA');
    });

    it('should return empty array for unknown region', () => {
      const requirements = service.getResidencyRequirements('UNKNOWN');

      expect(requirements).toEqual([]);
    });

    it('should include penalty information', () => {
      const requirements = service.getResidencyRequirements('EU');

      expect(requirements[0].penalties).toBeDefined();
      expect(requirements[0].penalties.maximumFine).toContain('20 million');
    });

    it('should include data types covered', () => {
      const requirements = service.getResidencyRequirements('EU');

      expect(requirements[0].dataTypes).toContain(DataClassification.PII);
      expect(requirements[0].dataTypes).toContain(DataClassification.FINANCIAL);
    });
  });

  describe('determineStorageLocation', () => {
    it('should return EU storage for GDPR-covered data', async () => {
      const locations = await service.determineStorageLocation('DE', DataClassification.PII);

      expect(locations).toBeDefined();
      expect(locations.length).toBeGreaterThan(0);
    });

    it('should return appropriate location for US data', async () => {
      const locations = await service.determineStorageLocation('US', DataClassification.FINANCIAL);

      expect(locations).toBeDefined();
      expect(locations.length).toBeGreaterThan(0);
    });

    it('should return Africa location for South African data', async () => {
      const locations = await service.determineStorageLocation('ZA', DataClassification.PII);

      expect(locations).toBeDefined();
      expect(locations.length).toBeGreaterThan(0);
    });

    it('should return default location for unknown country', async () => {
      const locations = await service.determineStorageLocation('XX', DataClassification.INTERNAL);

      expect(locations).toBeDefined();
      expect(locations.length).toBeGreaterThan(0);
    });

    it('should handle health data classification', async () => {
      const locations = await service.determineStorageLocation('US', DataClassification.HEALTH);

      expect(locations).toBeDefined();
    });
  });

  describe('validateCrossBorderTransfer', () => {
    it('should allow transfer between EU countries', async () => {
      const result = await service.validateCrossBorderTransfer(
        'DE',
        'FR',
        DataClassification.PII,
      );

      expect(result.allowed).toBe(true);
    });

    it('should require SCC for EU to non-adequate country transfer', async () => {
      const result = await service.validateCrossBorderTransfer(
        'DE',
        'US',
        DataClassification.PII,
      );

      expect(result.mechanism).toBeDefined();
      expect(result.requirements.length).toBeGreaterThan(0);
    });

    it('should allow transfer to EU adequacy countries', async () => {
      const result = await service.validateCrossBorderTransfer(
        'DE',
        'JP', // Japan has EU adequacy decision
        DataClassification.PII,
      );

      expect(result.mechanism).toContain('Adequacy');
    });

    it('should prohibit transfer when data localization is required', async () => {
      const result = await service.validateCrossBorderTransfer(
        'NG', // Nigeria requires local storage
        'US',
        DataClassification.PII,
      );

      expect(result.allowed).toBe(false);
      expect(result.mechanism).toBe('PROHIBITED');
      expect(result.risks.length).toBeGreaterThan(0);
    });

    it('should prohibit transfer from China for regulated data', async () => {
      const result = await service.validateCrossBorderTransfer(
        'CN',
        'US',
        DataClassification.PII,
      );

      expect(result.allowed).toBe(false);
      expect(result.risks.length).toBeGreaterThan(0);
    });

    it('should allow transfer when no specific restrictions exist', async () => {
      const result = await service.validateCrossBorderTransfer(
        'XX', // Unknown country
        'US',
        DataClassification.INTERNAL,
      );

      expect(result.allowed).toBe(true);
      expect(result.requirements).toHaveLength(0);
    });
  });

  describe('createDataResidencyPolicy', () => {
    it('should create policy for EU user', async () => {
      const policy = await service.createDataResidencyPolicy('user-123', 'DE');

      expect(policy).toBeDefined();
      expect(policy.userId).toBe('user-123');
      expect(policy.userCountry).toBe('DE');
      expect(policy.userRegion).toBe('EU');
      expect(policy.complianceStatus.gdpr).toBe(true);
    });

    it('should create policy for US user', async () => {
      const policy = await service.createDataResidencyPolicy('user-456', 'US');

      expect(policy).toBeDefined();
      expect(policy.userCountry).toBe('US');
      expect(policy.complianceStatus.ccpa).toBe(true);
    });

    it('should create policy for South African user', async () => {
      const policy = await service.createDataResidencyPolicy('user-789', 'ZA');

      expect(policy).toBeDefined();
      expect(policy.userCountry).toBe('ZA');
      expect(policy.userRegion).toBe('AFRICA');
      expect(policy.complianceStatus.regionalCompliance.get('POPIA')).toBe(true);
    });

    it('should include storage locations in policy', async () => {
      const policy = await service.createDataResidencyPolicy('user-123', 'DE');

      expect(policy.storageLocations).toBeDefined();
      expect(policy.storageLocations.length).toBeGreaterThan(0);
    });

    it('should include data classifications in policy', async () => {
      const policy = await service.createDataResidencyPolicy('user-123', 'US');

      expect(policy.dataClassifications).toContain(DataClassification.PII);
      expect(policy.dataClassifications).toContain(DataClassification.FINANCIAL);
    });
  });

  describe('getStorageLocations', () => {
    it('should return all available storage locations', () => {
      const locations = service.getStorageLocations();

      expect(locations).toBeDefined();
      expect(locations.length).toBeGreaterThan(0);
    });

    it('should include EU storage location', () => {
      const locations = service.getStorageLocations();
      const euLocation = locations.find((loc) => loc.id === 'eu-west-1');

      expect(euLocation).toBeDefined();
      expect(euLocation?.region).toBe('Europe');
      expect(euLocation?.country).toBe('Ireland');
      expect(euLocation?.certifications).toContain('GDPR Compliant');
    });

    it('should include US storage location', () => {
      const locations = service.getStorageLocations();
      const usLocation = locations.find((loc) => loc.id === 'us-east-1');

      expect(usLocation).toBeDefined();
      expect(usLocation?.region).toBe('North America');
      expect(usLocation?.certifications).toContain('HIPAA');
    });

    it('should include Africa storage location', () => {
      const locations = service.getStorageLocations();
      const afLocation = locations.find((loc) => loc.id === 'af-south-1');

      expect(afLocation).toBeDefined();
      expect(afLocation?.region).toBe('Africa');
      expect(afLocation?.country).toBe('South Africa');
      expect(afLocation?.compliance).toContain('POPIA');
    });

    it('should include Asia Pacific storage location', () => {
      const locations = service.getStorageLocations();
      const apLocation = locations.find((loc) => loc.id === 'ap-southeast-1');

      expect(apLocation).toBeDefined();
      expect(apLocation?.country).toBe('Singapore');
      expect(apLocation?.compliance).toContain('PDPA');
    });

    it('should include Middle East storage location', () => {
      const locations = service.getStorageLocations();
      const meLocation = locations.find((loc) => loc.id === 'me-south-1');

      expect(meLocation).toBeDefined();
      expect(meLocation?.region).toBe('Middle East');
      expect(meLocation?.country).toBe('UAE');
    });
  });

  describe('auditDataStorageCompliance', () => {
    it('should return compliant status by default', async () => {
      const result = await service.auditDataStorageCompliance('user-123');

      expect(result).toBeDefined();
      expect(result.compliant).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.recommendations).toHaveLength(0);
    });
  });
});
