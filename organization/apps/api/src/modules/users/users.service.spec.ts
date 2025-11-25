import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findById', () => {
    it('should return a user by ID with selected fields', async () => {
      // Arrange
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
        role: 'CUSTOMER',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await service.findById(userId);

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    it('should return null when user is not found', async () => {
      // Arrange
      const userId = 'non-existent-id';
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.findById(userId);

      // Assert
      expect(result).toBeNull();
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const userId = 'user-123';
      mockPrismaService.user.findUnique.mockRejectedValue(
        new Error('Database connection error'),
      );

      // Act & Assert
      await expect(service.findById(userId)).rejects.toThrow(
        'Database connection error',
      );
    });
  });

  describe('findByEmail', () => {
    it('should return a user by email', async () => {
      // Arrange
      const email = 'test@example.com';
      const mockUser = {
        id: 'user-123',
        email,
        name: 'Test User',
        password: 'hashed-password',
        role: 'CUSTOMER',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await service.findByEmail(email);

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email },
      });
    });

    it('should return null when user email is not found', async () => {
      // Arrange
      const email = 'nonexistent@example.com';
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.findByEmail(email);

      // Assert
      expect(result).toBeNull();
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email },
      });
    });

    it('should handle case-sensitive email lookups', async () => {
      // Arrange
      const email = 'Test@Example.com';
      const mockUser = {
        id: 'user-123',
        email,
        name: 'Test User',
        password: 'hashed-password',
        role: 'CUSTOMER',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await service.findByEmail(email);

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email },
      });
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const email = 'test@example.com';
      mockPrismaService.user.findUnique.mockRejectedValue(
        new Error('Database timeout'),
      );

      // Act & Assert
      await expect(service.findByEmail(email)).rejects.toThrow(
        'Database timeout',
      );
    });
  });

  describe('create', () => {
    it('should create a new user with CUSTOMER role', async () => {
      // Arrange
      const createUserDto = {
        email: 'newuser@example.com',
        password: 'hashed-password-123',
        name: 'New User',
      };
      const mockCreatedUser = {
        id: 'user-new-123',
        email: createUserDto.email,
        password: createUserDto.password,
        name: createUserDto.name,
        role: 'CUSTOMER',
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15'),
      };
      mockPrismaService.user.create.mockResolvedValue(mockCreatedUser);

      // Act
      const result = await service.create(createUserDto);

      // Assert
      expect(result).toEqual(mockCreatedUser);
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: createUserDto.email,
          password: createUserDto.password,
          name: createUserDto.name,
          role: 'CUSTOMER',
        },
      });
    });

    it('should create user with all required fields', async () => {
      // Arrange
      const createUserDto = {
        email: 'complete@example.com',
        password: 'secure-hash',
        name: 'Complete User',
      };
      const mockCreatedUser = {
        id: 'user-complete-123',
        ...createUserDto,
        role: 'CUSTOMER',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrismaService.user.create.mockResolvedValue(mockCreatedUser);

      // Act
      const result = await service.create(createUserDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.email).toBe(createUserDto.email);
      expect(result.name).toBe(createUserDto.name);
      expect(result.role).toBe('CUSTOMER');
    });

    it('should handle database errors during user creation', async () => {
      // Arrange
      const createUserDto = {
        email: 'error@example.com',
        password: 'password-hash',
        name: 'Error User',
      };
      mockPrismaService.user.create.mockRejectedValue(
        new Error('Unique constraint violation'),
      );

      // Act & Assert
      await expect(service.create(createUserDto)).rejects.toThrow(
        'Unique constraint violation',
      );
    });

    it('should handle duplicate email errors', async () => {
      // Arrange
      const createUserDto = {
        email: 'duplicate@example.com',
        password: 'password-hash',
        name: 'Duplicate User',
      };
      mockPrismaService.user.create.mockRejectedValue({
        code: 'P2002',
        meta: { target: ['email'] },
      });

      // Act & Assert
      await expect(service.create(createUserDto)).rejects.toEqual({
        code: 'P2002',
        meta: { target: ['email'] },
      });
    });
  });
});
