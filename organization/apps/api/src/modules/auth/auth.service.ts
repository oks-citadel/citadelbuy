import { Injectable, UnauthorizedException, ConflictException, BadRequestException, NotFoundException, Logger, NotImplementedException, Inject, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import * as jwksClient from 'jwks-rsa';
import { OAuth2Client } from 'google-auth-library';
import { DevicePlatform } from '@prisma/client';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ServerTrackingService } from '../tracking/server-tracking.service';
import { SessionManagerService } from '../security/session-manager.service';
import { SocialProvider, SocialLoginDto } from './dto/social-login.dto';
import { AccountLockoutService } from './account-lockout.service';
import { TokenBlacklistService } from './token-blacklist.service';
import { MfaEnforcementService } from './mfa-enforcement.service';
import { MFA_ENFORCEMENT } from '../../common/constants';

interface SocialUserProfile {
  email: string;
  name: string;
  providerId: string;
  avatar?: string;
}

// Cache for Apple's public keys
interface AppleKeyCache {
  keys: jwt.JwtHeader[];
  fetchedAt: number;
}

const APPLE_KEYS_URL = 'https://appleid.apple.com/auth/keys';
let appleKeyCache: AppleKeyCache | null = null;
const APPLE_KEY_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;
  private logger = new Logger('AuthService');

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private prisma: PrismaService,
    private configService: ConfigService,
    private serverTrackingService: ServerTrackingService,
    private accountLockoutService: AccountLockoutService,
    private tokenBlacklistService: TokenBlacklistService,
    private mfaEnforcementService: MfaEnforcementService,
    @Inject(forwardRef(() => SessionManagerService))
    private sessionManagerService: SessionManagerService,
  ) {
    // Initialize Google OAuth2 client for token verification
    const googleClientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    if (!googleClientId) {
      this.logger.warn('GOOGLE_CLIENT_ID not configured. Google login verification will use fallback method.');
    }
    this.googleClient = new OAuth2Client(googleClientId);
  }

  /**
   * Logout - Blacklist the current token
   * SECURITY: This makes the token invalid immediately
   */
  async logout(token: string): Promise<{ message: string }> {
    try {
      const success = await this.tokenBlacklistService.blacklistToken(token);

      if (success) {
        this.logger.log('User logged out successfully, token blacklisted');
        return { message: 'Logged out successfully' };
      } else {
        this.logger.warn('Token blacklist failed during logout');
        return { message: 'Logged out successfully' };
      }
    } catch (error) {
      this.logger.error('Error during logout:', error);
      return { message: 'Logged out successfully' };
    }
  }

  /**
   * Invalidate all tokens for a user
   * Use cases: password change, security breach, admin action
   */
  async invalidateAllUserTokens(userId: string): Promise<boolean> {
    try {
      const success = await this.tokenBlacklistService.invalidateAllUserTokens(userId);

      if (success) {
        this.logger.log(`All tokens invalidated for user ${userId}`);
      }

      return success;
    } catch (error) {
      this.logger.error(`Error invalidating tokens for user ${userId}:`, error);
      return false;
    }
  }


  /**
   * Generate JWT token with unique ID (jti) for blacklist tracking
   * SECURITY: jti enables us to blacklist specific tokens
   */
  private generateToken(payload: any, options?: any): string {
    const tokenPayload = {
      ...payload,
      jti: crypto.randomUUID(), // Add unique token ID
    };

    return this.jwtService.sign(tokenPayload, options);
  }

  async validateUser(email: string, password: string, request?: any): Promise<any> {
    // Extract IP address and user agent for security logging
    const ipAddress = this.getClientIp(request);
    const userAgent = request?.headers?.['user-agent'];

    // SECURITY: Check if account is locked before attempting validation
    await this.accountLockoutService.checkLockout(email, ipAddress);

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // Record failed attempt even if user doesn't exist (prevents user enumeration timing attacks)
      await this.accountLockoutService.recordFailedAttempt(email, ipAddress, userAgent);
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      // Record failed login attempt
      await this.accountLockoutService.recordFailedAttempt(email, ipAddress, userAgent);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Clear any failed attempts on successful login
    await this.accountLockoutService.clearLockout(email, ipAddress);

    const { password: _, ...result } = user;
    return result;
  }

  /**
   * Extract client IP address from request
   */
  private getClientIp(request?: any): string {
    if (!request) {
      return 'unknown';
    }

    // Try various headers (in order of preference)
    const ipHeaders = [
      'x-forwarded-for',
      'x-real-ip',
      'cf-connecting-ip', // Cloudflare
      'x-client-ip',
      'x-cluster-client-ip',
    ];

    for (const header of ipHeaders) {
      const value = request.headers?.[header];
      if (value) {
        // x-forwarded-for can contain multiple IPs, take the first one
        return value.split(',')[0].trim();
      }
    }

    // Fallback to connection remote address
    return request.connection?.remoteAddress ||
           request.socket?.remoteAddress ||
           request.ip ||
           'unknown';
  }

  async register(email: string, password: string, name: string, request?: any) {
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await this.usersService.create({
      email,
      password: hashedPassword,
      name,
    });

    // Send welcome email (async, don't block registration)
    this.emailService.sendWelcomeEmail(user.email, user.name).catch((error) => {
      this.logger.error('Failed to send welcome email:', error);
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
        this.logger.error('Failed to track registration:', error);
        // Don't throw error - tracking failure shouldn't block registration
      });
    }

    // The user from create() is already sanitized (no password in select)
    return {
      user,
      access_token: this.generateToken({ sub: user.id, email: user.email, role: user.role }),
    };
  }

  async login(user: any, request?: any) {
    // Log successful login after previous failures if any
    const ipAddress = this.getClientIp(request);
    const userAgent = request?.headers?.['user-agent'];
    const status = await this.accountLockoutService.getLockoutStatus(user.email);

    if (status.attempts > 0) {
      this.logger.log(
        `Successful login for ${user.email} after ${status.attempts} failed attempts`
      );
    }

    // Check MFA enforcement requirements
    const mfaCheck = await this.mfaEnforcementService.checkLoginMfaRequirements(
      user.id,
      user.role,
      user.createdAt,
    );

    // If grace period has expired and MFA not set up, block login
    if (!mfaCheck.canLogin) {
      this.logger.warn(`Login blocked for user ${user.id} - MFA grace period expired`);
      throw new UnauthorizedException({
        message: mfaCheck.message,
        errorCode: mfaCheck.errorCode,
        mfaRequired: true,
        requiresMfaSetup: true,
        gracePeriodExpired: true,
      });
    }

    // Determine device type from request headers or body
    const deviceType = this.detectDeviceType(request);
    const deviceId = request?.body?.deviceId || request?.headers?.['x-device-id'];
    const deviceName = request?.body?.deviceName || request?.headers?.['x-device-name'];

    // Enforce session limits and create a new session
    let sessionInfo: { session: any; plainToken: string; evictedSessionId: string | null } | null = null;
    try {
      sessionInfo = await this.sessionManagerService.createSession(user.id, {
        ipAddress,
        userAgent,
        deviceType,
        deviceId,
        deviceName,
      });
    } catch (error) {
      // If session limit is reached in 'block' mode, propagate the error
      if (error instanceof ConflictException) {
        throw error;
      }
      // For other errors, log and continue without session management
      this.logger.error(`Failed to create session for user ${user.id}:`, error);
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const refreshPayload = { sub: user.id, type: 'refresh' };

    // Build the response with MFA status information
    const response: any = {
      user,
      access_token: this.generateToken(payload),
      refresh_token: this.generateToken(refreshPayload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') || this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '30d',
      }),
    };

    // Add session info to response if created
    if (sessionInfo) {
      response.sessionId = sessionInfo.session.id;
      response.sessionToken = sessionInfo.plainToken;
      if (sessionInfo.evictedSessionId) {
        response.evictedSessionId = sessionInfo.evictedSessionId;
        response.sessionEvicted = true;
        this.logger.log(`Session ${sessionInfo.evictedSessionId} evicted for user ${user.id} due to session limit`);
      }
    }

    // Add MFA status information to the response
    if (mfaCheck.requiresMfaVerification) {
      // User has MFA enabled - they need to verify with TOTP code
      response.mfaRequired = true;
      response.requiresMfaVerification = true;
      response.message = mfaCheck.message;
    } else if (mfaCheck.requiresMfaSetup) {
      // User needs to set up MFA (within grace period)
      const mfaStatus = await this.mfaEnforcementService.checkMfaStatus(user.id);
      response.mfaRequired = true;
      response.requiresMfaSetup = true;
      response.mfaGracePeriodDaysRemaining = mfaStatus.gracePeriodDaysRemaining;
      response.mfaMessage = mfaStatus.message;
    }

    return response;
  }

  /**
   * Detect device type from request headers or user agent
   * Supports: IOS, ANDROID, WEB, DESKTOP
   */
  private detectDeviceType(request?: any): DevicePlatform {
    if (!request) {
      return DevicePlatform.WEB;
    }

    // Check explicit device type header
    const explicitType = request.headers?.['x-device-type']?.toUpperCase();
    if (explicitType === 'IOS') return DevicePlatform.IOS;
    if (explicitType === 'ANDROID') return DevicePlatform.ANDROID;
    if (explicitType === 'WEB') return DevicePlatform.WEB;
    if (explicitType === 'DESKTOP') return DevicePlatform.DESKTOP;

    // Check body for device type (mobile apps may send this)
    const bodyDeviceType = request.body?.deviceType?.toUpperCase();
    if (bodyDeviceType === 'IOS') return DevicePlatform.IOS;
    if (bodyDeviceType === 'ANDROID') return DevicePlatform.ANDROID;
    if (bodyDeviceType === 'DESKTOP') return DevicePlatform.DESKTOP;

    // Infer from user agent
    const userAgent = request.headers?.['user-agent']?.toLowerCase() || '';

    // Check for mobile app specific identifiers first
    if (userAgent.includes('broxiva-ios') || userAgent.includes('darwin') && userAgent.includes('mobile')) {
      return DevicePlatform.IOS;
    }
    if (userAgent.includes('broxiva-android') || userAgent.includes('android') && userAgent.includes('mobile')) {
      return DevicePlatform.ANDROID;
    }

    // Check for desktop app specific identifiers
    if (userAgent.includes('broxiva-desktop') || userAgent.includes('electron')) {
      return DevicePlatform.DESKTOP;
    }

    // Check for generic mobile patterns
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
      return DevicePlatform.IOS;
    }
    if (userAgent.includes('android')) {
      return DevicePlatform.ANDROID;
    }

    // Default to web
    return DevicePlatform.WEB;
  }

  async refreshToken(refreshToken: string): Promise<{ user: any; access_token: string; refresh_token: string }> {
    try {
      // Check if refresh token is blacklisted
      const isBlacklisted = await this.tokenBlacklistService.isTokenBlacklisted(refreshToken);
      if (isBlacklisted) {
        throw new UnauthorizedException('Refresh token has been revoked');
      }

      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') || this.configService.get<string>('JWT_SECRET'),
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const newPayload = { sub: user.id, email: user.email, role: user.role };
      const newRefreshPayload = { sub: user.id, type: 'refresh' };

      return {
        user,
        access_token: this.generateToken(newPayload),
        refresh_token: this.generateToken(newRefreshPayload, {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET') || this.configService.get<string>('JWT_SECRET'),
          expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '30d',
        }),
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Handle social login (Google, Facebook, Apple, GitHub)
   * SECURITY: All tokens are verified server-side before creating/accessing user accounts
   *
   * Flow:
   * 1. Verify the social token with the provider's API
   * 2. Extract user profile (email, name, avatar)
   * 3. Find or create user account
   * 4. Issue JWT tokens for our application
   */
  async socialLogin(socialLoginDto: SocialLoginDto, request?: any): Promise<{ user: any; access_token: string; refresh_token: string }> {
    const { provider, accessToken } = socialLoginDto;

    // Step 1: Verify token with social provider
    const profile = await this.verifySocialToken(provider, accessToken);
    if (!profile || !profile.email) {
      throw new UnauthorizedException('Invalid social login credentials');
    }

    // Step 2: Find or create user
    let user = await this.usersService.findByEmail(profile.email);
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      // Generate secure random password (user won't use it for social login)
      const randomPassword = crypto.randomBytes(32).toString('hex');
      const hashedPassword = await bcrypt.hash(randomPassword, 12);

      const createdUser = await this.usersService.create({
        email: profile.email,
        password: hashedPassword,
        name: profile.name,
      });
      user = createdUser as NonNullable<typeof user>;

      // Send welcome email (async, don't block login)
      this.emailService.sendWelcomeEmail(createdUser.email, createdUser.name).catch((error) => {
        this.logger.error('Failed to send welcome email:', error);
      });

      // Track registration event for new social users
      if (request && this.serverTrackingService.isEnabled()) {
        const nameParts = profile.name.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        const ipAddress = this.serverTrackingService.getClientIp(request);
        const userAgent = this.serverTrackingService.getUserAgent(request);

        const fbc = request.query?.fbclid ? `fb.1.${Date.now()}.${request.query.fbclid}` : request.cookies?._fbc;
        const fbp = request.cookies?._fbp;
        const ttclid = request.query?.ttclid || request.cookies?.ttclid;

        this.serverTrackingService.trackRegistration({
          userId: createdUser.id,
          email: createdUser.email,
          phone: undefined,
          firstName,
          lastName,
          ipAddress,
          userAgent,
          fbc,
          fbp,
          ttclid,
          pageUrl: request.headers?.origin ? `${request.headers.origin}/auth/${provider}` : undefined,
        }).catch((error) => {
          this.logger.error('Failed to track social registration:', error);
        });
      }
    }

    // Step 3: Check MFA requirements (skip for new users)
    if (!isNewUser) {
      const mfaCheck = await this.mfaEnforcementService.checkLoginMfaRequirements(
        user!.id,
        user!.role,
        user!.createdAt,
      );

      // If grace period has expired and MFA not set up, block login
      if (!mfaCheck.canLogin) {
        this.logger.warn(`Social login blocked for user ${user!.id} - MFA grace period expired`);
        throw new UnauthorizedException({
          message: mfaCheck.message,
          errorCode: mfaCheck.errorCode,
          mfaRequired: true,
          requiresMfaSetup: true,
          gracePeriodExpired: true,
        });
      }
    }

    // Step 4: Generate JWT tokens
    // User from create() is already sanitized (no password in select)
    // User from findByEmail() includes password but we can safely spread
    const safeUser = { id: user!.id, email: user!.email, name: user!.name, role: user!.role, createdAt: user!.createdAt, updatedAt: user!.updatedAt };

    const payload = { sub: user!.id, email: user!.email, role: user!.role };
    const refreshPayload = { sub: user!.id, type: 'refresh' };

    const response: any = {
      user: safeUser,
      access_token: this.generateToken(payload),
      refresh_token: this.generateToken(refreshPayload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') || this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '30d',
      }),
    };

    // Add MFA status for existing users with MFA-required roles
    if (!isNewUser && this.mfaEnforcementService.roleRequiresMfa(user!.role)) {
      const mfaStatus = await this.mfaEnforcementService.checkMfaStatus(user!.id);
      if (mfaStatus.mfaEnabled) {
        response.mfaRequired = true;
        response.requiresMfaVerification = true;
        response.message = 'MFA verification required';
      } else if (mfaStatus.withinGracePeriod && mfaStatus.gracePeriodDaysRemaining > 0) {
        response.mfaRequired = true;
        response.requiresMfaSetup = true;
        response.mfaGracePeriodDaysRemaining = mfaStatus.gracePeriodDaysRemaining;
        response.mfaMessage = mfaStatus.message;
      }
    }

    return response;
  }

  private async verifySocialToken(provider: SocialProvider, accessToken: string): Promise<SocialUserProfile | null> {
    try {
      switch (provider) {
        case SocialProvider.GOOGLE: return await this.verifyGoogleToken(accessToken);
        case SocialProvider.FACEBOOK: return await this.verifyFacebookToken(accessToken);
        case SocialProvider.APPLE: return await this.verifyAppleToken(accessToken);
        case SocialProvider.GITHUB: return await this.verifyGitHubToken(accessToken);
        default: throw new BadRequestException('Unsupported social provider');
      }
    } catch (error) {
      this.logger.error('Social token verification failed:', error);
      throw new UnauthorizedException('Failed to verify social login credentials');
    }
  }

  /**
   * Verify Google ID token using official google-auth-library
   * SECURITY: This properly verifies the token signature server-side
   */
  private async verifyGoogleToken(idToken: string): Promise<SocialUserProfile> {
    try {
      // If GOOGLE_CLIENT_ID is configured, use proper ID token verification
      const googleClientId = this.configService.get<string>('GOOGLE_CLIENT_ID');

      if (googleClientId) {
        // SECURE: Verify ID token signature using Google's public keys
        const ticket = await this.googleClient.verifyIdToken({
          idToken: idToken,
          audience: googleClientId,
        });

        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
          throw new UnauthorizedException('Invalid Google token - missing email');
        }

        // Additional security checks
        if (!payload.email_verified) {
          throw new UnauthorizedException('Google email not verified');
        }

        return {
          email: payload.email,
          name: payload.name || payload.email.split('@')[0],
          providerId: payload.sub!,
          avatar: payload.picture,
        };
      } else {
        // Fallback: Verify access token by calling Google API
        // This is less secure than ID token verification but works if client ID is not configured
        this.logger.warn('Using fallback Google token verification. Configure GOOGLE_CLIENT_ID for better security.');
        const url = 'https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=' + idToken;
        const response = await fetch(url);

        if (!response.ok) {
          throw new UnauthorizedException('Invalid Google token');
        }

        const data = await response.json();

        // Verify the token hasn't expired
        if (data.exp && Date.now() >= data.exp * 1000) {
          throw new UnauthorizedException('Google token has expired');
        }

        if (!data.email) {
          throw new UnauthorizedException('Invalid Google token - missing email');
        }

        return {
          email: data.email,
          name: data.name || data.email.split('@')[0],
          providerId: data.sub,
          avatar: data.picture,
        };
      }
    } catch (error: any) {
      this.logger.error('Google token verification failed:', error.message);
      throw new UnauthorizedException('Failed to verify Google token');
    }
  }

  /**
   * Verify Facebook access token using Facebook Graph API
   * SECURITY: Validates token server-side with Facebook's API
   */
  private async verifyFacebookToken(accessToken: string): Promise<SocialUserProfile> {
    try {
      const appId = this.configService.get<string>('FACEBOOK_APP_ID');
      const appSecret = this.configService.get<string>('FACEBOOK_APP_SECRET');

      // Step 1: Verify the access token with Facebook's debug endpoint
      if (appId && appSecret) {
        const debugUrl = `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${appId}|${appSecret}`;
        const debugResponse = await fetch(debugUrl);

        if (!debugResponse.ok) {
          throw new UnauthorizedException('Failed to verify Facebook token');
        }

        const debugData = await debugResponse.json();

        // Verify the token is valid and belongs to our app
        if (!debugData.data.is_valid) {
          throw new UnauthorizedException('Invalid Facebook access token');
        }

        if (debugData.data.app_id !== appId) {
          throw new UnauthorizedException('Facebook token was issued for a different app');
        }

        // Verify token hasn't expired
        if (debugData.data.expires_at && debugData.data.expires_at < Date.now() / 1000) {
          throw new UnauthorizedException('Facebook access token has expired');
        }
      } else {
        this.logger.warn('Facebook app credentials not configured. Skipping token validation. Configure FACEBOOK_APP_ID and FACEBOOK_APP_SECRET.');
      }

      // Step 2: Fetch user data
      const url = `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${accessToken}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new UnauthorizedException('Invalid Facebook access token');
      }

      const data = await response.json();

      if (!data.email) {
        throw new UnauthorizedException('Facebook account must have an email address');
      }

      return {
        email: data.email,
        name: data.name || 'Facebook User',
        providerId: data.id,
        avatar: data.picture?.data?.url,
      };
    } catch (error: any) {
      this.logger.error('Facebook token verification failed:', error.message);
      throw new UnauthorizedException('Failed to verify Facebook token');
    }
  }

  /**
   * Verify Apple identity token using JWT verification with Apple's public keys
   * SECURITY: Uses RSA signature verification with Apple's published public keys
   */
  private async verifyAppleToken(identityToken: string): Promise<SocialUserProfile> {
    try {
      // Decode the token header to get the key ID
      const decodedHeader = jwt.decode(identityToken, { complete: true });
      if (!decodedHeader || !decodedHeader.header) {
        throw new UnauthorizedException('Invalid Apple identity token format');
      }

      const kid = decodedHeader.header.kid;
      if (!kid) {
        throw new UnauthorizedException('Invalid Apple token - missing key ID');
      }

      // Get Apple's public keys
      const publicKey = await this.getApplePublicKey(kid);
      if (!publicKey) {
        throw new UnauthorizedException('Unable to verify Apple token - key not found');
      }

      // Verify the token signature and claims
      const appBundleId = this.configService.get<string>('APPLE_CLIENT_ID');
      if (!appBundleId) {
        this.logger.warn('APPLE_CLIENT_ID not configured. Using default. Configure APPLE_CLIENT_ID for production.');
      }

      const payload = jwt.verify(identityToken, publicKey, {
        algorithms: ['RS256'],
        issuer: 'https://appleid.apple.com',
        audience: appBundleId || 'com.broxiva.app',
      }) as jwt.JwtPayload;

      if (!payload.sub) {
        throw new UnauthorizedException('Invalid Apple token - missing subject');
      }

      // Extract user info
      // Note: Apple only provides email on first sign-in, after that it may be null
      // The 'sub' is a unique, stable identifier for the user
      const email = payload.email || `apple_${payload.sub.substring(0, 8)}@privaterelay.appleid.com`;

      return {
        email,
        name: payload.email?.split('@')[0] || 'Apple User',
        providerId: payload.sub,
      };
    } catch (error: any) {
      this.logger.error('Apple token verification failed:', error.message);
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedException(`Invalid Apple identity token: ${error.message}`);
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedException('Apple identity token has expired');
      }
      throw new UnauthorizedException('Failed to verify Apple identity token');
    }
  }

  /**
   * Fetch Apple's public keys for JWT verification
   */
  private async getApplePublicKey(kid: string): Promise<string | null> {
    try {
      // Check cache first
      if (appleKeyCache && Date.now() - appleKeyCache.fetchedAt < APPLE_KEY_CACHE_TTL) {
        const key = appleKeyCache.keys.find((k: any) => k.kid === kid);
        if (key) {
          return this.jwkToPem(key);
        }
      }

      // Fetch fresh keys from Apple
      const response = await fetch(APPLE_KEYS_URL);
      if (!response.ok) {
        throw new Error(`Failed to fetch Apple public keys: ${response.statusText}`);
      }

      const data = await response.json();
      appleKeyCache = {
        keys: data.keys,
        fetchedAt: Date.now(),
      };

      const key = data.keys.find((k: any) => k.kid === kid);
      if (!key) {
        return null;
      }

      return this.jwkToPem(key);
    } catch (error) {
      this.logger.error('Failed to fetch Apple public keys:', error);
      return null;
    }
  }

  /**
   * Convert JWK to PEM format for JWT verification
   */
  private jwkToPem(jwk: any): string {
    // Use the jwks-rsa library to convert JWK to PEM
    const client = jwksClient({
      jwksUri: APPLE_KEYS_URL,
    });

    // Manual JWK to PEM conversion for RSA keys
    const modulus = Buffer.from(jwk.n, 'base64url');
    const exponent = Buffer.from(jwk.e, 'base64url');

    // Create ASN.1 structure for RSA public key
    const modulusLength = modulus.length;
    const exponentLength = exponent.length;

    const modulusPrefix = modulusLength > 128 ? [0x02, 0x82, (modulusLength >> 8) & 0xff, modulusLength & 0xff] : [0x02, 0x81, modulusLength];
    const exponentPrefix = [0x02, exponentLength];

    const sequenceLength = modulusPrefix.length + modulusLength + exponentPrefix.length + exponentLength;
    const sequencePrefix = sequenceLength > 128 ? [0x30, 0x82, (sequenceLength >> 8) & 0xff, sequenceLength & 0xff] : [0x30, 0x81, sequenceLength];

    // RSA OID: 1.2.840.113549.1.1.1
    const rsaOid = Buffer.from([0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00]);
    const algorithmIdentifier = Buffer.concat([Buffer.from([0x30, rsaOid.length]), rsaOid]);

    const bitString = Buffer.concat([
      Buffer.from(sequencePrefix),
      Buffer.from(modulusPrefix),
      modulus,
      Buffer.from(exponentPrefix),
      exponent,
    ]);

    const bitStringWithPadding = Buffer.concat([Buffer.from([0x03, bitString.length + 1, 0x00]), bitString]);

    const publicKeyInfo = Buffer.concat([algorithmIdentifier, bitStringWithPadding]);
    const publicKeyInfoLength = publicKeyInfo.length;
    const publicKeyInfoPrefix = publicKeyInfoLength > 128
      ? [0x30, 0x82, (publicKeyInfoLength >> 8) & 0xff, publicKeyInfoLength & 0xff]
      : [0x30, 0x81, publicKeyInfoLength];

    const der = Buffer.concat([Buffer.from(publicKeyInfoPrefix), publicKeyInfo]);

    const base64 = der.toString('base64');
    const pemLines = base64.match(/.{1,64}/g) || [];

    return `-----BEGIN PUBLIC KEY-----\n${pemLines.join('\n')}\n-----END PUBLIC KEY-----`;
  }

  /**
   * Verify GitHub access token and fetch user profile
   * SECURITY: Validates token server-side with GitHub's API
   *
   * GitHub OAuth Flow:
   * 1. Client exchanges authorization code for access token (client-side or server-side)
   * 2. Client sends access token to our server
   * 3. We verify token by fetching user profile from GitHub API
   * 4. We handle email privacy (some GitHub users hide their email)
   */
  private async verifyGitHubToken(accessToken: string): Promise<SocialUserProfile> {
    try {
      // Step 1: Verify the token by fetching authenticated user info
      const userResponse = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });

      if (!userResponse.ok) {
        const errorData = await userResponse.json().catch(() => ({}));
        this.logger.error('GitHub user fetch failed:', errorData);
        throw new UnauthorizedException('Invalid GitHub access token');
      }

      const userData = await userResponse.json();

      // Step 2: Fetch user's email addresses (may require additional API call)
      // GitHub users can hide their primary email, so we need to check the emails endpoint
      let email = userData.email;

      if (!email) {
        // Fetch emails from the dedicated endpoint
        const emailsResponse = await fetch('https://api.github.com/user/emails', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        });

        if (emailsResponse.ok) {
          const emails = await emailsResponse.json();

          // Find primary verified email, or first verified email
          const primaryEmail = emails.find((e: any) => e.primary && e.verified);
          const verifiedEmail = emails.find((e: any) => e.verified);

          email = primaryEmail?.email || verifiedEmail?.email;
        }
      }

      // Step 3: Handle case where user has completely hidden their email
      if (!email) {
        // Use GitHub's noreply email as a fallback
        // Format: {id}+{username}@users.noreply.github.com
        email = `${userData.id}+${userData.login}@users.noreply.github.com`;
        this.logger.warn(`GitHub user ${userData.login} has hidden email. Using noreply: ${email}`);
      }

      // Step 4: Verify the account is active and not suspicious
      if (userData.suspended_at) {
        throw new UnauthorizedException('GitHub account is suspended');
      }

      // Step 5: Return verified user profile
      return {
        email,
        name: userData.name || userData.login,
        providerId: userData.id.toString(),
        avatar: userData.avatar_url,
      };
    } catch (error: any) {
      this.logger.error('GitHub token verification failed:', error.message);

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Failed to verify GitHub token');
    }
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    // Check if user exists
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists - security best practice
      return { message: 'If the email exists, a password reset link has been sent' };
    }

    // Generate secure random token for the email link
    const plainToken = crypto.randomBytes(32).toString('hex');

    // Hash the token before storing in database
    // This prevents token theft if database is compromised
    const hashedToken = await bcrypt.hash(plainToken, 12);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour

    // Save hashed token to database
    await this.prisma.passwordReset.create({
      data: {
        email,
        token: hashedToken,
        expiresAt,
      },
    });

    // Send plaintext token in email (user needs this to reset password)
    await this.emailService.sendPasswordResetEmail(user.email, {
      name: user.name,
      resetToken: plainToken,
    });

    return { message: 'If the email exists, a password reset link has been sent' };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    // Since tokens are now hashed, we need to find all unused, non-expired tokens
    // for comparison (this is a security trade-off for better token protection)
    const resetRecords = await this.prisma.passwordReset.findMany({
      where: {
        used: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    // Find the matching token by comparing hashes
    let matchingRecord = null;
    for (const record of resetRecords) {
      const isMatch = await bcrypt.compare(token, record.token);
      if (isMatch) {
        matchingRecord = record;
        break;
      }
    }

    if (!matchingRecord) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Find user
    const user = await this.usersService.findByEmail(matchingRecord.email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user password
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Mark token as used
    await this.prisma.passwordReset.update({
      where: { id: matchingRecord.id },
      data: { used: true },
    });

    // SECURITY: Invalidate all existing tokens when password changes
    await this.invalidateAllUserTokens(user.id);
    this.logger.log(`Password reset complete for user ${user.id}. All tokens invalidated.`);

    return { message: 'Password has been reset successfully' };
  }

  // ==================== MFA Methods ====================

  /**
   * Setup MFA for a user - generates TOTP secret and QR code
   */
  async setupMfa(userId: string): Promise<{
    secret: string;
    qrCode: string;
    backupCodes: string[];
  }> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if MFA is already enabled
    const existingMfa = await this.prisma.userMfa.findUnique({
      where: { userId },
    });

    if (existingMfa?.enabled) {
      throw new BadRequestException('MFA is already enabled for this account');
    }

    // Generate a base32 secret (20 bytes = 160 bits, encoded as base32)
    const secretBuffer = crypto.randomBytes(20);
    const secret = this.encodeBase32(secretBuffer);

    // Generate backup codes
    const backupCodes = Array.from({ length: 8 }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );

    // Hash backup codes for storage
    const hashedBackupCodes = await Promise.all(
      backupCodes.map((code) => bcrypt.hash(code, 12))
    );

    // Store or update MFA setup (not enabled yet)
    await this.prisma.userMfa.upsert({
      where: { userId },
      update: {
        secret,
        backupCodes: hashedBackupCodes,
        enabled: false,
        updatedAt: new Date(),
      },
      create: {
        userId,
        secret,
        backupCodes: hashedBackupCodes,
        enabled: false,
      },
    });

    // Generate QR code URL (otpauth://totp/...)
    const issuer = 'Broxiva';
    const accountName = user.email;
    const otpauthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

    // Generate QR code as data URL (simplified - in production use qrcode library)
    const qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`;

    this.logger.log(`MFA setup initiated for user ${userId}`);

    return {
      secret,
      qrCode,
      backupCodes,
    };
  }

  /**
   * Verify TOTP code and enable MFA
   */
  async verifyMfa(userId: string, code: string): Promise<{
    message: string;
    mfaEnabled: boolean;
  }> {
    const mfa = await this.prisma.userMfa.findUnique({
      where: { userId },
    });

    if (!mfa || !mfa.secret) {
      throw new BadRequestException('MFA has not been set up. Please call /auth/mfa/setup first.');
    }

    // Verify the TOTP code
    const isValid = this.verifyTotpCode(mfa.secret, code);

    if (!isValid) {
      throw new BadRequestException('Invalid verification code');
    }

    // Enable MFA
    await this.prisma.userMfa.update({
      where: { userId },
      data: {
        enabled: true,
        verifiedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    this.logger.log(`MFA enabled for user ${userId}`);

    return {
      message: 'MFA enabled successfully',
      mfaEnabled: true,
    };
  }

  /**
   * Get MFA status for a user
   */
  async getMfaStatus(userId: string): Promise<{
    mfaEnabled: boolean;
    mfaMethod: string | null;
  }> {
    const mfa = await this.prisma.userMfa.findUnique({
      where: { userId },
    });

    return {
      mfaEnabled: mfa?.enabled ?? false,
      mfaMethod: mfa?.enabled ? 'totp' : null,
    };
  }

  /**
   * Disable MFA for a user
   * Note: Users with roles that require MFA cannot disable it
   */
  async disableMfa(userId: string, code: string): Promise<{
    message: string;
    mfaEnabled: boolean;
  }> {
    // First check if user's role requires MFA
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user's role requires MFA - if so, prevent disabling
    if (this.mfaEnforcementService.roleRequiresMfa(user.role)) {
      throw new BadRequestException(
        `MFA cannot be disabled for ${user.role} accounts. MFA is required for your role for security purposes.`
      );
    }

    const mfa = await this.prisma.userMfa.findUnique({
      where: { userId },
    });

    if (!mfa || !mfa.enabled) {
      throw new BadRequestException('MFA is not enabled for this account');
    }

    // Verify the code (TOTP or backup code)
    const isValidTotp = this.verifyTotpCode(mfa.secret!, code);
    let isValidBackup = false;

    if (!isValidTotp && mfa.backupCodes) {
      // Check backup codes
      const backupCodes = mfa.backupCodes as string[];
      for (const hashedCode of backupCodes) {
        if (await bcrypt.compare(code.toUpperCase(), hashedCode)) {
          isValidBackup = true;
          break;
        }
      }
    }

    if (!isValidTotp && !isValidBackup) {
      throw new BadRequestException('Invalid verification code');
    }

    // Disable MFA
    await this.prisma.userMfa.update({
      where: { userId },
      data: {
        enabled: false,
        secret: null,
        backupCodes: [],
        updatedAt: new Date(),
      },
    });

    this.logger.log(`MFA disabled for user ${userId}`);

    return {
      message: 'MFA disabled successfully',
      mfaEnabled: false,
    };
  }

  /**
   * Verify MFA challenge during login
   * This is called after initial login when user has MFA enabled
   *
   * @param userId - The user ID from the initial login
   * @param code - The TOTP code or backup code
   * @param deviceInfo - Optional device information for trusted device feature
   * @param trustDevice - Whether to trust this device for future logins
   * @returns Full login response with tokens if verification succeeds
   */
  async verifyMfaChallenge(
    userId: string,
    code: string,
    deviceInfo?: {
      deviceId?: string;
      deviceName?: string;
      userAgent?: string;
      ipAddress?: string;
      platform?: string;
    },
    trustDevice: boolean = false,
  ): Promise<{
    user: any;
    access_token: string;
    refresh_token: string;
    trustedDevice?: {
      deviceId: string;
      expiresAt: Date;
    };
  }> {
    // Get user with MFA info
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { userMfa: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const mfa = user.userMfa;
    if (!mfa || !mfa.enabled || !mfa.secret) {
      throw new BadRequestException('MFA is not enabled for this account');
    }

    // Verify the code (TOTP or backup code)
    const isValidTotp = this.verifyTotpCode(mfa.secret, code);
    let usedBackupCode = false;

    if (!isValidTotp && mfa.backupCodes) {
      // Check backup codes
      const backupCodes = mfa.backupCodes as string[];
      const updatedBackupCodes: string[] = [];
      let foundMatch = false;

      for (const hashedCode of backupCodes) {
        if (!foundMatch && await bcrypt.compare(code.toUpperCase(), hashedCode)) {
          foundMatch = true;
          usedBackupCode = true;
          // Don't add this code to updated list (consuming it)
          this.logger.log(`Backup code used for user ${userId}`);
        } else {
          updatedBackupCodes.push(hashedCode);
        }
      }

      if (foundMatch) {
        // Update backup codes to remove the used one
        await this.prisma.userMfa.update({
          where: { userId },
          data: { backupCodes: updatedBackupCodes },
        });
      }

      if (!foundMatch) {
        throw new UnauthorizedException('Invalid MFA code');
      }
    } else if (!isValidTotp) {
      throw new UnauthorizedException('Invalid MFA code');
    }

    // Handle trusted device registration
    let trustedDeviceResponse: { deviceId: string; expiresAt: Date } | undefined;
    if (trustDevice && deviceInfo?.deviceId) {
      const trustedDeviceDays = this.configService.get<number>('MFA_TRUSTED_DEVICE_DAYS') || 30;
      const enableTrustedDevices = this.configService.get<string>('MFA_ENABLE_TRUSTED_DEVICES') !== 'false';

      if (enableTrustedDevices) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + trustedDeviceDays);

        await this.prisma.trustedDevice.upsert({
          where: {
            userId_deviceId: {
              userId,
              deviceId: deviceInfo.deviceId,
            },
          },
          update: {
            lastUsedAt: new Date(),
            useCount: { increment: 1 },
            lastIpAddress: deviceInfo.ipAddress,
            expiresAt,
            isActive: true,
            revokedAt: null,
            revokeReason: null,
          },
          create: {
            userId,
            deviceId: deviceInfo.deviceId,
            deviceName: deviceInfo.deviceName,
            userAgent: deviceInfo.userAgent,
            ipAddress: deviceInfo.ipAddress,
            platform: deviceInfo.platform,
            expiresAt,
          },
        });

        trustedDeviceResponse = {
          deviceId: deviceInfo.deviceId,
          expiresAt,
        };

        this.logger.log(`Trusted device registered for user ${userId}: ${deviceInfo.deviceId}`);
      }
    }

    // Generate tokens
    const payload = { sub: user.id, email: user.email, role: user.role };
    const refreshPayload = { sub: user.id, type: 'refresh' };

    // Prepare safe user object (no password)
    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    this.logger.log(`MFA verification successful for user ${userId}${usedBackupCode ? ' (backup code used)' : ''}`);

    const response: {
      user: typeof safeUser;
      access_token: string;
      refresh_token: string;
      trustedDevice?: { deviceId: string; expiresAt: Date };
      backupCodesRemaining?: number;
    } = {
      user: safeUser,
      access_token: this.generateToken(payload),
      refresh_token: this.generateToken(refreshPayload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') || this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '30d',
      }),
    };

    if (trustedDeviceResponse) {
      response.trustedDevice = trustedDeviceResponse;
    }

    // If backup code was used, include remaining count as a warning
    if (usedBackupCode && mfa.backupCodes) {
      const remainingCodes = (mfa.backupCodes as string[]).length - 1;
      response.backupCodesRemaining = remainingCodes;
      this.logger.warn(`User ${userId} has ${remainingCodes} backup codes remaining`);
    }

    return response;
  }

  /**
   * Check if a device is trusted for MFA bypass
   * @param userId - User ID
   * @param deviceId - Device fingerprint hash
   * @returns Whether the device is trusted and can skip MFA
   */
  async isTrustedDevice(userId: string, deviceId: string): Promise<boolean> {
    const enableTrustedDevices = this.configService.get<string>('MFA_ENABLE_TRUSTED_DEVICES') !== 'false';
    if (!enableTrustedDevices) {
      return false;
    }

    const trustedDevice = await this.prisma.trustedDevice.findUnique({
      where: {
        userId_deviceId: {
          userId,
          deviceId,
        },
      },
    });

    if (!trustedDevice) {
      return false;
    }

    // Check if device is active and not expired
    if (!trustedDevice.isActive || trustedDevice.expiresAt < new Date()) {
      return false;
    }

    // Update last used timestamp
    await this.prisma.trustedDevice.update({
      where: { id: trustedDevice.id },
      data: {
        lastUsedAt: new Date(),
        useCount: { increment: 1 },
      },
    });

    return true;
  }

  /**
   * Get list of trusted devices for a user
   */
  async getTrustedDevices(userId: string): Promise<Array<{
    id: string;
    deviceId: string;
    deviceName: string | null;
    platform: string | null;
    lastUsedAt: Date;
    expiresAt: Date;
    isActive: boolean;
  }>> {
    const devices = await this.prisma.trustedDevice.findMany({
      where: {
        userId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        deviceId: true,
        deviceName: true,
        platform: true,
        lastUsedAt: true,
        expiresAt: true,
        isActive: true,
      },
      orderBy: { lastUsedAt: 'desc' },
    });

    return devices;
  }

  /**
   * Revoke a trusted device
   */
  async revokeTrustedDevice(
    userId: string,
    deviceId: string,
    reason?: string,
  ): Promise<{ message: string }> {
    const device = await this.prisma.trustedDevice.findUnique({
      where: {
        userId_deviceId: {
          userId,
          deviceId,
        },
      },
    });

    if (!device) {
      throw new NotFoundException('Trusted device not found');
    }

    await this.prisma.trustedDevice.update({
      where: { id: device.id },
      data: {
        isActive: false,
        revokedAt: new Date(),
        revokeReason: reason || 'User revoked',
      },
    });

    this.logger.log(`Trusted device revoked for user ${userId}: ${deviceId}`);

    return { message: 'Device trust revoked successfully' };
  }

  /**
   * Revoke all trusted devices for a user
   */
  async revokeAllTrustedDevices(userId: string, reason?: string): Promise<{ message: string; count: number }> {
    const result = await this.prisma.trustedDevice.updateMany({
      where: {
        userId,
        isActive: true,
      },
      data: {
        isActive: false,
        revokedAt: new Date(),
        revokeReason: reason || 'User revoked all devices',
      },
    });

    this.logger.log(`All trusted devices revoked for user ${userId}: ${result.count} devices`);

    return {
      message: 'All trusted devices revoked successfully',
      count: result.count,
    };
  }

  /**
   * Verify a TOTP code against a secret
   */
  private verifyTotpCode(secret: string, code: string): boolean {
    const window = 1; // Allow 1 period before/after for clock skew
    const period = 30; // TOTP period in seconds

    for (let i = -window; i <= window; i++) {
      const counter = Math.floor((Date.now() / 1000 + i * period) / period);
      const expectedCode = this.generateTotpCode(secret, counter);
      if (expectedCode === code) {
        return true;
      }
    }

    return false;
  }

  /**
   * Generate a TOTP code for a given counter
   */
  private generateTotpCode(secret: string, counter: number): string {
    // Decode base32 secret
    const secretBuffer = this.decodeBase32(secret);

    // Create counter buffer (8 bytes, big-endian)
    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigUInt64BE(BigInt(counter));

    // Generate HMAC-SHA1
    const hmac = crypto.createHmac('sha1', secretBuffer);
    hmac.update(counterBuffer);
    const hmacResult = hmac.digest();

    // Dynamic truncation
    const offset = hmacResult[hmacResult.length - 1] & 0x0f;
    const truncatedHash =
      ((hmacResult[offset] & 0x7f) << 24) |
      ((hmacResult[offset + 1] & 0xff) << 16) |
      ((hmacResult[offset + 2] & 0xff) << 8) |
      (hmacResult[offset + 3] & 0xff);

    // Get 6-digit code
    const otp = truncatedHash % 1000000;
    return otp.toString().padStart(6, '0');
  }

  /**
   * Encode buffer to base32
   */
  private encodeBase32(buffer: Buffer): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let result = '';
    let bits = 0;
    let value = 0;

    for (const byte of buffer) {
      value = (value << 8) | byte;
      bits += 8;

      while (bits >= 5) {
        result += alphabet[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }

    if (bits > 0) {
      result += alphabet[(value << (5 - bits)) & 31];
    }

    return result;
  }

  /**
   * Decode base32 to buffer
   */
  private decodeBase32(str: string): Buffer {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const cleanStr = str.toUpperCase().replace(/[^A-Z2-7]/g, '');
    const bytes: number[] = [];
    let bits = 0;
    let value = 0;

    for (const char of cleanStr) {
      const idx = alphabet.indexOf(char);
      if (idx === -1) continue;

      value = (value << 5) | idx;
      bits += 5;

      if (bits >= 8) {
        bytes.push((value >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }

    return Buffer.from(bytes);
  }

  // ==================== Email Verification Methods ====================

  /**
   * Send email verification link to a user
   */
  async sendVerificationEmail(userId: string): Promise<{ message: string }> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Invalidate any existing tokens
    await this.prisma.emailVerificationToken.updateMany({
      where: {
        userId,
        used: false,
      },
      data: {
        used: true,
      },
    });

    // Generate verification token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store token
    await this.prisma.emailVerificationToken.create({
      data: {
        userId,
        email: user.email,
        token,
        expiresAt,
      },
    });

    // Send verification email
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;

    await this.emailService.sendEmail({
      to: user.email,
      subject: 'Verify your email address',
      template: 'email-verification',
      context: {
        name: user.name,
        verificationUrl,
      },
    });

    this.logger.log(`Verification email sent to ${user.email}`);

    return { message: 'Verification email sent successfully' };
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<{ message: string; verified: boolean }> {
    const verificationToken = await this.prisma.emailVerificationToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!verificationToken) {
      throw new BadRequestException('Invalid verification token');
    }

    if (verificationToken.used) {
      throw new BadRequestException('Verification token has already been used');
    }

    if (verificationToken.expiresAt < new Date()) {
      throw new BadRequestException('Verification token has expired');
    }

    // Mark email as verified
    await this.prisma.user.update({
      where: { id: verificationToken.userId },
      data: { emailVerified: true },
    });

    // Mark token as used
    await this.prisma.emailVerificationToken.update({
      where: { token },
      data: { used: true },
    });

    this.logger.log(`Email verified for user ${verificationToken.userId}`);

    return {
      message: 'Email verified successfully',
      verified: true,
    };
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(email: string): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(email);

    // Always return success to prevent email enumeration
    if (!user) {
      return { message: 'If your email is registered, you will receive a verification email shortly' };
    }

    if (user.emailVerified) {
      return { message: 'If your email is registered, you will receive a verification email shortly' };
    }

    // Rate limit: Check if a verification email was sent recently
    const recentToken = await this.prisma.emailVerificationToken.findFirst({
      where: {
        userId: user.id,
        used: false,
        createdAt: {
          gt: new Date(Date.now() - 60 * 1000), // Within last minute
        },
      },
    });

    if (recentToken) {
      throw new BadRequestException('Please wait before requesting another verification email');
    }

    // Send verification email
    await this.sendVerificationEmail(user.id);

    return { message: 'If your email is registered, you will receive a verification email shortly' };
  }
}
