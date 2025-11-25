import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'CUSTOMER',
  };

  const mockAuthResponse = {
    access_token: 'jwt-token-here',
    user: mockUser,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    })
      .overrideGuard(LocalAuthGuard)
      .useValue({
        canActivate: (context) => {
          const request = context.switchToHttp().getRequest();
          request.user = mockUser;
          return true;
        },
      })
      .compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const registerDto = {
        email: 'newuser@example.com',
        password: 'SecurePassword123!',
        name: 'New User',
      };

      mockAuthService.register.mockResolvedValue(mockAuthResponse);

      const result = await controller.register(registerDto);

      expect(result).toEqual(mockAuthResponse);
      expect(mockAuthService.register).toHaveBeenCalledWith(
        'newuser@example.com',
        'SecurePassword123!',
        'New User'
      );
    });

    it('should handle registration with different user data', async () => {
      const registerDto = {
        email: 'another@example.com',
        password: 'Password456!',
        name: 'Another User',
      };

      mockAuthService.register.mockResolvedValue({
        access_token: 'different-token',
        user: { ...mockUser, email: 'another@example.com', name: 'Another User' },
      });

      await controller.register(registerDto);

      expect(mockAuthService.register).toHaveBeenCalledWith(
        'another@example.com',
        'Password456!',
        'Another User'
      );
    });
  });

  describe('login', () => {
    it('should login a user', async () => {
      const mockRequest = { user: mockUser };

      mockAuthService.login.mockResolvedValue(mockAuthResponse);

      const result = await controller.login(mockRequest);

      expect(result).toEqual(mockAuthResponse);
      expect(mockAuthService.login).toHaveBeenCalledWith(mockUser);
    });

    it('should pass user object from request to service', async () => {
      const differentUser = {
        id: 'user-456',
        email: 'different@example.com',
        name: 'Different User',
        role: 'VENDOR',
      };

      const mockRequest = { user: differentUser };

      mockAuthService.login.mockResolvedValue({
        access_token: 'different-token',
        user: differentUser,
      });

      await controller.login(mockRequest);

      expect(mockAuthService.login).toHaveBeenCalledWith(differentUser);
    });
  });

  describe('forgotPassword', () => {
    it('should send password reset email', async () => {
      const forgotPasswordDto = {
        email: 'test@example.com',
      };

      const mockResponse = {
        message: 'Password reset email sent if email exists',
      };

      mockAuthService.forgotPassword.mockResolvedValue(mockResponse);

      const result = await controller.forgotPassword(forgotPasswordDto);

      expect(result).toEqual(mockResponse);
      expect(mockAuthService.forgotPassword).toHaveBeenCalledWith('test@example.com');
    });

    it('should handle different email addresses', async () => {
      const forgotPasswordDto = {
        email: 'another@example.com',
      };

      const mockResponse = {
        message: 'Password reset email sent if email exists',
      };

      mockAuthService.forgotPassword.mockResolvedValue(mockResponse);

      await controller.forgotPassword(forgotPasswordDto);

      expect(mockAuthService.forgotPassword).toHaveBeenCalledWith('another@example.com');
    });

    it('should return consistent response for security', async () => {
      const forgotPasswordDto = {
        email: 'nonexistent@example.com',
      };

      const mockResponse = {
        message: 'Password reset email sent if email exists',
      };

      mockAuthService.forgotPassword.mockResolvedValue(mockResponse);

      const result = await controller.forgotPassword(forgotPasswordDto);

      expect(result).toEqual(mockResponse);
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      const resetPasswordDto = {
        token: 'valid-reset-token',
        newPassword: 'NewSecurePassword123!',
      };

      const mockResponse = {
        message: 'Password reset successfully',
      };

      mockAuthService.resetPassword.mockResolvedValue(mockResponse);

      const result = await controller.resetPassword(resetPasswordDto);

      expect(result).toEqual(mockResponse);
      expect(mockAuthService.resetPassword).toHaveBeenCalledWith(
        'valid-reset-token',
        'NewSecurePassword123!'
      );
    });

    it('should pass token and password to service', async () => {
      const resetPasswordDto = {
        token: 'another-token',
        newPassword: 'DifferentPassword456!',
      };

      const mockResponse = {
        message: 'Password reset successfully',
      };

      mockAuthService.resetPassword.mockResolvedValue(mockResponse);

      await controller.resetPassword(resetPasswordDto);

      expect(mockAuthService.resetPassword).toHaveBeenCalledWith(
        'another-token',
        'DifferentPassword456!'
      );
    });
  });
});
