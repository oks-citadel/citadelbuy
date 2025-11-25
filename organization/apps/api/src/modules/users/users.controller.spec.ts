import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExecutionContext } from '@nestjs/common';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockUsersService = {
    findById: jest.fn(),
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'CUSTOMER',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
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

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const mockRequest = {
        user: { id: 'user-123' },
      };

      mockUsersService.findById.mockResolvedValue(mockUser);

      const result = await controller.getProfile(mockRequest);

      expect(result).toEqual(mockUser);
      expect(mockUsersService.findById).toHaveBeenCalledWith('user-123');
      expect(mockUsersService.findById).toHaveBeenCalledTimes(1);
    });

    it('should handle user not found', async () => {
      const mockRequest = {
        user: { id: 'nonexistent-user' },
      };

      mockUsersService.findById.mockResolvedValue(null);

      const result = await controller.getProfile(mockRequest);

      expect(result).toBeNull();
      expect(mockUsersService.findById).toHaveBeenCalledWith('nonexistent-user');
    });

    it('should extract user id from request', async () => {
      const mockRequest = {
        user: { id: 'different-user-456' },
      };

      mockUsersService.findById.mockResolvedValue({
        ...mockUser,
        id: 'different-user-456',
      });

      await controller.getProfile(mockRequest);

      expect(mockUsersService.findById).toHaveBeenCalledWith('different-user-456');
    });
  });
});
