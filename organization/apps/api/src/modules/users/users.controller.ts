import { Controller, Get, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService, UpdateProfileDto } from './users.service';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Retrieves the profile information of the currently authenticated user including email, name, role, and preferences.',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved user profile',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'john.doe@example.com',
        name: 'John Doe',
        phone: '+1 (555) 123-4567',
        role: 'CUSTOMER',
        emailVerified: true,
        avatar: 'https://cdn.citadelbuy.com/avatars/user-123.jpg',
        preferences: {
          newsletter: true,
          notifications: true,
          language: 'en',
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-02-15T10:30:00Z',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing token' })
  async getProfile(@Request() req: any) {
    return this.usersService.findById(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update current user profile',
    description: 'Updates profile information for the authenticated user. Allows updating name, phone, and preferences.',
  })
  @ApiBody({
    schema: {
      properties: {
        name: {
          type: 'string',
          description: 'Full name',
          example: 'John Doe',
        },
        phone: {
          type: 'string',
          description: 'Phone number',
          example: '+1 (555) 123-4567',
        },
        avatar: {
          type: 'string',
          description: 'Avatar URL',
          example: 'https://cdn.citadelbuy.com/avatars/user-123.jpg',
        },
        preferences: {
          type: 'object',
          description: 'User preferences',
          properties: {
            newsletter: { type: 'boolean', example: true },
            notifications: { type: 'boolean', example: true },
            language: { type: 'string', example: 'en' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'john.doe@example.com',
        name: 'John Doe Updated',
        phone: '+1 (555) 987-6543',
        role: 'CUSTOMER',
        updatedAt: '2024-02-20T15:45:00Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing token' })
  async updateProfile(@Request() req: any, @Body() updateData: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.id, updateData);
  }
}
