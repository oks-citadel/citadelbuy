import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Find all users (admin only)
   */
  async findAll(options?: { skip?: number; take?: number; role?: string }) {
    // Cast role to any to handle Prisma's strict enum typing
    const where: any = options?.role ? { role: options.role } : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: options?.skip || 0,
        take: options?.take || 50,
        select: {
          id: true,
          email: true,
          phoneNumber: true,
          phoneVerified: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      total,
      skip: options?.skip || 0,
      take: options?.take || 50,
    };
  }

  /**
   * Find user by ID
   */
  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        phoneNumber: true,
        phoneVerified: true,
        phoneVerifiedAt: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Create a new user
   */
  async create(data: CreateUserDto) {
    // Check if user already exists
    const existingUser = await this.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    return this.prisma.user.create({
      data: {
        email: data.email,
        password: data.password,
        name: data.name,
        role: data.role || 'CUSTOMER',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Update user profile
   */
  async updateProfile(id: string, data: UpdateProfileDto) {
    // Verify user exists
    await this.findById(id);

    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        phoneVerified: true,
        phoneVerifiedAt: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Update user preferences
   */
  async updatePreferences(id: string, preferences: UpdatePreferencesDto) {
    // Verify user exists
    await this.findById(id);

    // Note: This assumes preferences are stored as JSON in the user table
    // Adjust based on your actual schema implementation
    return this.prisma.user.update({
      where: { id },
      data: {
        // If you have a preferences JSON field, use it
        // Otherwise, these would need to be in separate preference fields
        // preferences: preferences as any,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Get user preferences
   */
  async getPreferences(id: string) {
    const user = await this.findById(id);

    // Return default preferences structure
    // Adjust based on your actual schema
    return {
      userId: user.id,
      newsletter: false,
      notifications: true,
      emailNotifications: true,
      smsNotifications: false,
      language: 'en',
      currency: 'USD',
      timezone: 'UTC',
    };
  }

  /**
   * Delete user (soft delete - anonymize)
   */
  async remove(id: string) {
    // Verify user exists
    await this.findById(id);

    // Anonymize user data instead of hard delete to maintain referential integrity
    await this.prisma.user.update({
      where: { id },
      data: {
        email: `deleted_${id}@deleted.local`,
        name: 'Deleted User',
        password: 'DELETED',
      },
    });

    return { message: 'User account deleted successfully' };
  }

  /**
   * Update user phone number
   */
  async updatePhoneNumber(id: string, phoneNumber: string) {
    await this.findById(id);

    return this.prisma.user.update({
      where: { id },
      data: {
        phoneNumber,
        phoneVerified: false, // Reset verification when phone changes
        phoneVerifiedAt: null,
      },
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        phoneVerified: true,
        phoneVerifiedAt: true,
        name: true,
        role: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Mark phone as verified
   */
  async markPhoneAsVerified(id: string) {
    await this.findById(id);

    return this.prisma.user.update({
      where: { id },
      data: {
        phoneVerified: true,
        phoneVerifiedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        phoneVerified: true,
        phoneVerifiedAt: true,
        name: true,
        role: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Verify phone number with verification code
   */
  async verifyPhoneWithCode(userId: string, code: string) {
    // Verify user exists
    await this.findById(userId);

    // Find the most recent verification code for this user
    const verificationRecord = await this.prisma.phoneVerificationCode.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // Check if verification code exists
    if (!verificationRecord) {
      throw new BadRequestException('No verification code found. Please request a new code.');
    }

    // Check if already verified
    if (verificationRecord.verified) {
      throw new BadRequestException('This verification code has already been used.');
    }

    // Check if code has expired
    if (new Date() > verificationRecord.expiresAt) {
      throw new BadRequestException('Verification code has expired. Please request a new code.');
    }

    // Check if max attempts exceeded
    if (verificationRecord.attempts >= verificationRecord.maxAttempts) {
      throw new BadRequestException('Maximum verification attempts exceeded. Please request a new code.');
    }

    // Check if code matches
    if (verificationRecord.code !== code) {
      // Increment attempts counter
      await this.prisma.phoneVerificationCode.update({
        where: { id: verificationRecord.id },
        data: { attempts: verificationRecord.attempts + 1 },
      });

      const attemptsLeft = verificationRecord.maxAttempts - (verificationRecord.attempts + 1);
      throw new BadRequestException(
        `Invalid verification code. ${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} remaining.`
      );
    }

    // Code is valid - update verification record and user
    await this.prisma.phoneVerificationCode.update({
      where: { id: verificationRecord.id },
      data: { verified: true },
    });

    // Update user's phone verification status
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        phoneVerified: true,
        phoneVerifiedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        phoneVerified: true,
        phoneVerifiedAt: true,
        name: true,
        role: true,
        updatedAt: true,
      },
    });
  }


  /**
   * Hard delete user (admin only, use with caution)
   */
  async hardDelete(id: string) {
    // Verify user exists
    await this.findById(id);

    await this.prisma.user.delete({
      where: { id },
    });

    return { message: 'User permanently deleted' };
  }

  /**
   * Update user role (admin only)
   */
  async updateRole(id: string, role: 'CUSTOMER' | 'VENDOR' | 'ADMIN') {
    await this.findById(id);

    return this.prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        updatedAt: true,
      },
    });
  }
}
