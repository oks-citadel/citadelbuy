import { Throttle } from '@nestjs/throttler';
import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
  ForgotPasswordDto,
  ResetPasswordDto,
  SocialLoginDto,
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
} from './dto';
import { SocialProvider } from './dto/social-login.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('register')
  @ApiOperation({
    summary: 'Register a new user account',
    description: 'Creates a new user account with email, password, and name. Returns JWT tokens upon successful registration.',
  })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    schema: {
      example: {
        user: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'john.doe@example.com',
          name: 'John Doe',
          role: 'CUSTOMER',
        },
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid input data or email already exists' })
  @ApiResponse({ status: 429, description: 'Too many registration attempts' })
  @ApiBody({ type: RegisterDto })
  async register(@Body() registerDto: RegisterDto, @Request() req: any) {
    return this.authService.register(registerDto.email, registerDto.password, registerDto.name, req);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @ApiOperation({
    summary: 'Login with email and password',
    description: 'Authenticates user with email and password. Returns JWT access and refresh tokens.',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully authenticated',
    schema: {
      example: {
        user: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'john.doe@example.com',
          name: 'John Doe',
          role: 'CUSTOMER',
        },
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Too many login attempts' })
  @ApiBody({ type: LoginDto })
  async login(@Request() req: any) {
    return this.authService.login(req.user);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Logout current user',
    description: 'Invalidates the current session. Client should clear stored tokens.',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully logged out',
    schema: {
      example: {
        message: 'Logged out successfully',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing token' })
  async logout(@Request() req: any) {
    // Extract token from Authorization header and blacklist it
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      return this.authService.logout(token);
    }
    return { message: 'Logged out successfully' };
  }

  @Post('refresh')
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Generates a new access token using a valid refresh token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  @ApiBody({ type: RefreshTokenDto })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('forgot-password')
  @ApiOperation({
    summary: 'Request password reset',
    description: 'Sends a password reset email to the provided address if it exists in the system.',
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset email sent if email exists',
    schema: {
      example: {
        message: 'If an account with that email exists, a password reset link has been sent.',
      },
    },
  })
  @ApiResponse({ status: 429, description: 'Too many reset attempts' })
  @ApiBody({ type: ForgotPasswordDto })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Post('reset-password')
  @ApiOperation({
    summary: 'Reset password with token',
    description: 'Resets user password using the token received via email.',
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
    schema: {
      example: {
        message: 'Password has been reset successfully',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  @ApiBody({ type: ResetPasswordDto })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto.token, resetPasswordDto.newPassword);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('social-login')
  @ApiOperation({
    summary: 'Login with social provider',
    description: 'Authenticates user using OAuth tokens from Google, Facebook, Apple, or GitHub.',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully authenticated',
    schema: {
      example: {
        user: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'john.doe@example.com',
          name: 'John Doe',
          role: 'CUSTOMER',
        },
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid social login credentials' })
  @ApiResponse({ status: 429, description: 'Too many login attempts' })
  @ApiBody({ type: SocialLoginDto })
  async socialLogin(@Body() socialLoginDto: SocialLoginDto, @Request() req: any) {
    return this.authService.socialLogin(socialLoginDto, req);
  }

  // Individual social login endpoints for frontend compatibility
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('google')
  @ApiOperation({
    summary: 'Login with Google',
    description: 'Authenticates user using Google OAuth token.',
  })
  @ApiResponse({ status: 200, description: 'Successfully authenticated with Google' })
  @ApiResponse({ status: 401, description: 'Invalid Google token' })
  @ApiBody({
    schema: {
      properties: {
        token: {
          type: 'string',
          description: 'Google OAuth access token',
          example: 'ya29.a0AfH6SMBx...',
        },
      },
    },
  })
  async googleLogin(@Body() body: { token: string }, @Request() req: any) {
    return this.authService.socialLogin({
      provider: SocialProvider.GOOGLE,
      accessToken: body.token,
    }, req);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('facebook')
  @ApiOperation({
    summary: 'Login with Facebook',
    description: 'Authenticates user using Facebook OAuth token.',
  })
  @ApiResponse({ status: 200, description: 'Successfully authenticated with Facebook' })
  @ApiResponse({ status: 401, description: 'Invalid Facebook token' })
  @ApiBody({
    schema: {
      properties: {
        token: {
          type: 'string',
          description: 'Facebook OAuth access token',
          example: 'EAABwz...',
        },
      },
    },
  })
  async facebookLogin(@Body() body: { token: string }, @Request() req: any) {
    return this.authService.socialLogin({
      provider: SocialProvider.FACEBOOK,
      accessToken: body.token,
    }, req);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('apple')
  @ApiOperation({
    summary: 'Login with Apple',
    description: 'Authenticates user using Apple Sign In token.',
  })
  @ApiResponse({ status: 200, description: 'Successfully authenticated with Apple' })
  @ApiResponse({ status: 401, description: 'Invalid Apple token' })
  @ApiBody({
    schema: {
      properties: {
        token: {
          type: 'string',
          description: 'Apple Sign In identity token',
          example: 'eyJraWQiOiJlWGF1bm1...',
        },
      },
    },
  })
  async appleLogin(@Body() body: { token: string }, @Request() req: any) {
    return this.authService.socialLogin({
      provider: SocialProvider.APPLE,
      accessToken: body.token,
    }, req);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('github')
  @ApiOperation({
    summary: 'Login with GitHub',
    description: 'Authenticates user using GitHub OAuth token.',
  })
  @ApiResponse({ status: 200, description: 'Successfully authenticated with GitHub' })
  @ApiResponse({ status: 401, description: 'Invalid GitHub token' })
  @ApiBody({
    schema: {
      properties: {
        token: {
          type: 'string',
          description: 'GitHub OAuth access token',
          example: 'gho_16C7e42F292c6912E7710c838347Ae178B4a',
        },
      },
    },
  })
  async githubLogin(@Body() body: { token: string }, @Request() req: any) {
    return this.authService.socialLogin({
      provider: SocialProvider.GITHUB,
      accessToken: body.token,
    }, req);
  }
}
