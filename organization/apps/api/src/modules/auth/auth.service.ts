import { Injectable, UnauthorizedException, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ServerTrackingService } from '../tracking/server-tracking.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private prisma: PrismaService,
    private configService: ConfigService,
    private serverTrackingService: ServerTrackingService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { password: _, ...result } = user;
    return result;
  }

  async register(email: string, password: string, name: string, request?: any) {
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.usersService.create({
      email,
      password: hashedPassword,
      name,
    });

    // Send welcome email (async, don't block registration)
    this.emailService.sendWelcomeEmail(user.email, user.name).catch((error) => {
      console.error('Failed to send welcome email:', error);
      // Don't throw error - email failure shouldn't block registration
    });

    // Track registration event (async, don't block registration)
    if (request && this.serverTrackingService.isEnabled()) {
      // Extract name parts
      const nameParts = name.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Extract tracking data from request
      const ipAddress = this.serverTrackingService.getClientIp(request);
      const userAgent = this.serverTrackingService.getUserAgent(request);

      // Get click IDs from query parameters or cookies
      const fbc = request.query?.fbclid ? `fb.1.${Date.now()}.${request.query.fbclid}` : request.cookies?._fbc;
      const fbp = request.cookies?._fbp;
      const ttclid = request.query?.ttclid || request.cookies?.ttclid;

      // Track registration
      this.serverTrackingService.trackRegistration({
        userId: user.id,
        email: user.email,
        phone: undefined, // User model doesn't have phone field yet
        firstName,
        lastName,
        ipAddress,
        userAgent,
        fbc,
        fbp,
        ttclid,
        pageUrl: request.headers?.origin ? `${request.headers.origin}/auth/register` : undefined,
      }).catch((error) => {
        console.error('Failed to track registration:', error);
        // Don't throw error - tracking failure shouldn't block registration
      });
    }

    const { password: _, ...result } = user;
    return {
      user: result,
      access_token: this.jwtService.sign({ sub: user.id, email: user.email, role: user.role }),
    };
  }

  async login(user: any) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      user,
      access_token: this.jwtService.sign(payload),
    };
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    // Check if user exists
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists - security best practice
      return { message: 'If the email exists, a password reset link has been sent' };
    }

    // Generate secure random token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour

    // Save token to database
    await this.prisma.passwordReset.create({
      data: {
        email,
        token,
        expiresAt,
      },
    });

    // Create reset URL
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${token}`;

    // Send email
    await this.emailService.sendPasswordResetEmail(user.email, {
      customerName: user.name,
      resetToken: token,
      resetUrl,
    });

    return { message: 'If the email exists, a password reset link has been sent' };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    // Find valid token
    const resetRecord = await this.prisma.passwordReset.findUnique({
      where: { token },
    });

    if (!resetRecord) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Check if token is expired
    if (new Date() > resetRecord.expiresAt) {
      throw new BadRequestException('Reset token has expired');
    }

    // Check if token was already used
    if (resetRecord.used) {
      throw new BadRequestException('Reset token has already been used');
    }

    // Find user
    const user = await this.usersService.findByEmail(resetRecord.email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Mark token as used
    await this.prisma.passwordReset.update({
      where: { token },
      data: { used: true },
    });

    return { message: 'Password has been reset successfully' };
  }
}
