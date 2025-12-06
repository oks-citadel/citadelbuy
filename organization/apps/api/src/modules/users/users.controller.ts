import { Controller, Get, Post, Patch, Delete, Body, UseGuards, Request, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { UsersService } from './users.service';
import { AddressService } from './address.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';
import { UpdatePhoneDto, VerifyPhoneDto } from './dto/update-phone.dto';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    private usersService: UsersService,
    private addressService: AddressService,
  ) {}

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

  @UseGuards(JwtAuthGuard)
  @Delete('profile')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete current user account',
    description: 'Deletes the authenticated user account (soft delete - anonymizes data).',
  })
  @ApiResponse({ status: 200, description: 'Account deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteAccount(@Request() req: any) {
    return this.usersService.remove(req.user.id);
  }

  // ===== PREFERENCES ENDPOINTS =====

  @UseGuards(JwtAuthGuard)
  @Get('preferences')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get user preferences',
    description: 'Retrieve the current user preferences including notification settings, language, currency, etc.',
  })
  @ApiResponse({
    status: 200,
    description: 'User preferences retrieved',
    schema: {
      example: {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        newsletter: true,
        notifications: true,
        emailNotifications: true,
        smsNotifications: false,
        language: 'en',
        currency: 'USD',
        timezone: 'America/New_York',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getPreferences(@Request() req: any) {
    return this.usersService.getPreferences(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('preferences')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update user preferences',
    description: 'Update user preferences for notifications, language, currency, timezone, etc.',
  })
  @ApiResponse({ status: 200, description: 'Preferences updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updatePreferences(@Request() req: any, @Body() preferences: UpdatePreferencesDto) {
    return this.usersService.updatePreferences(req.user.id, preferences);
  }

  // ===== PHONE NUMBER MANAGEMENT ENDPOINTS =====

  @UseGuards(JwtAuthGuard)
  @Patch('phone')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update phone number',
    description: 'Update the user phone number. This will reset phone verification status.',
  })
  @ApiResponse({
    status: 200,
    description: 'Phone number updated successfully',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'john.doe@example.com',
        phoneNumber: '+15551234567',
        phoneVerified: false,
        phoneVerifiedAt: null,
        name: 'John Doe',
        role: 'CUSTOMER',
        updatedAt: '2024-02-20T15:45:00Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid phone number' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updatePhoneNumber(@Request() req: any, @Body() updatePhoneDto: UpdatePhoneDto) {
    return this.usersService.updatePhoneNumber(req.user.id, updatePhoneDto.phoneNumber);
  }

  @UseGuards(JwtAuthGuard)
  @Post('phone/verify')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Verify phone number',
    description: 'Verify phone number with a verification code sent via SMS.',
  })
  @ApiResponse({
    status: 200,
    description: 'Phone number verified successfully',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'john.doe@example.com',
        phoneNumber: '+15551234567',
        phoneVerified: true,
        phoneVerifiedAt: '2024-02-20T15:45:00Z',
        name: 'John Doe',
        role: 'CUSTOMER',
        updatedAt: '2024-02-20T15:45:00Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid verification code' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async verifyPhoneNumber(@Request() req: any, @Body() verifyPhoneDto: VerifyPhoneDto) {
    // TODO: Implement verification code validation
    // For now, just mark as verified
    return this.usersService.markPhoneAsVerified(req.user.id);
  }

  // ===== ADDRESS MANAGEMENT ENDPOINTS =====

  @UseGuards(JwtAuthGuard)
  @Get('addresses')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all user addresses',
    description: 'Retrieve all saved addresses for the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Addresses retrieved successfully',
    schema: {
      example: [
        {
          id: 'addr_123',
          fullName: 'John Doe',
          email: 'john@example.com',
          phone: '+1 555-1234',
          street: '123 Main St, Apt 4B',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'United States',
          label: 'Home',
          type: 'SHIPPING',
          isDefault: true,
        },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAddresses(@Request() req: any) {
    return this.addressService.findAllByUserId(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('addresses/default')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get default address',
    description: 'Retrieve the default address for the authenticated user.',
  })
  @ApiResponse({ status: 200, description: 'Default address retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'No default address found' })
  async getDefaultAddress(@Request() req: any) {
    return this.addressService.findDefault(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('addresses/:id')
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'Address ID' })
  @ApiOperation({
    summary: 'Get address by ID',
    description: 'Retrieve a specific address by its ID.',
  })
  @ApiResponse({ status: 200, description: 'Address retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  async getAddress(@Request() req: any, @Param('id') id: string) {
    return this.addressService.findOne(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('addresses')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create new address',
    description: 'Add a new shipping or billing address for the authenticated user.',
  })
  @ApiResponse({ status: 201, description: 'Address created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createAddress(@Request() req: any, @Body() createAddressDto: CreateAddressDto) {
    return this.addressService.create(req.user.id, createAddressDto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('addresses/:id')
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'Address ID' })
  @ApiOperation({
    summary: 'Update address',
    description: 'Update an existing address.',
  })
  @ApiResponse({ status: 200, description: 'Address updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  async updateAddress(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateAddressDto: UpdateAddressDto,
  ) {
    return this.addressService.update(id, req.user.id, updateAddressDto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('addresses/:id/set-default')
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'Address ID' })
  @ApiOperation({
    summary: 'Set address as default',
    description: 'Set a specific address as the default address.',
  })
  @ApiResponse({ status: 200, description: 'Address set as default' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  async setDefaultAddress(@Request() req: any, @Param('id') id: string) {
    return this.addressService.setDefault(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('addresses/:id')
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'Address ID' })
  @ApiOperation({
    summary: 'Delete address',
    description: 'Delete an address from the user account.',
  })
  @ApiResponse({ status: 200, description: 'Address deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  async deleteAddress(@Request() req: any, @Param('id') id: string) {
    return this.addressService.remove(id, req.user.id);
  }

  // ===== ADMIN ENDPOINTS =====

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all users (Admin only)',
    description: 'Retrieve a paginated list of all users. Admin access required.',
  })
  @ApiQuery({ name: 'skip', required: false, description: 'Number of records to skip' })
  @ApiQuery({ name: 'take', required: false, description: 'Number of records to take' })
  @ApiQuery({ name: 'role', required: false, description: 'Filter by user role' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async getAllUsers(
    @Query('skip') skip?: number,
    @Query('take') take?: number,
    @Query('role') role?: string,
  ) {
    return this.usersService.findAll({
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
      role,
    });
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get(':id')
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiOperation({
    summary: 'Get user by ID (Admin only)',
    description: 'Retrieve a specific user by their ID. Admin access required.',
  })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id/role')
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiOperation({
    summary: 'Update user role (Admin only)',
    description: 'Update the role of a user. Admin access required.',
  })
  @ApiBody({
    schema: {
      properties: {
        role: {
          type: 'string',
          enum: ['CUSTOMER', 'VENDOR', 'ADMIN'],
          example: 'VENDOR',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'User role updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid role' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUserRole(@Param('id') id: string, @Body('role') role: 'CUSTOMER' | 'VENDOR' | 'ADMIN') {
    return this.usersService.updateRole(id, role);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete(':id')
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiOperation({
    summary: 'Delete user (Admin only)',
    description: 'Soft delete a user account (anonymizes data). Admin access required.',
  })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deleteUser(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
