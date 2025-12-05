import { Injectable, UnauthorizedException, ConflictException, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import * as jwksClient from 'jwks-rsa';
import { OAuth2Client } from 'google-auth-library';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ServerTrackingService } from '../tracking/server-tracking.service';
import { SocialProvider, SocialLoginDto } from './dto/social-login.dto';
import { AccountLockoutService } from './account-lockout.service';
import { TokenBlacklistService } from './token-blacklist.service';

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
  ) {
    // Initialize Google OAuth2 client for token verification
    const googleClientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    if (!googleClientId) {
      this.logger.warn('GOOGLE_CLIENT_ID not configured. Google login verification will use fallback method.');
    }
    this.googleClient = new OAuth2Client(googleClientId);
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

    const { password: _, ...result } = user;
    return {
      user: result,
      access_token: this.generateToken({ sub: user.id, email: user.email, role: user.role }),
    };
  }

  async login(user: any) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const refreshPayload = { sub: user.id, type: 'refresh' };

    return {
      user,
      access_token: this.generateToken(payload),
      refresh_token: this.generateToken(refreshPayload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') || this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '30d',
      }),
    };
  }

  /**
   * Logout - Blacklist the current token
   * SECURITY: This makes the token invalid immediately, even though JWTs are stateless
   */
  async logout(token: string): Promise<{ message: string }> {
    try {
      const success = await this.tokenBlacklistService.blacklistToken(token);

      if (success) {
        this.logger.log('User logged out successfully, token blacklisted');
        return { message: 'Logged out successfully' };
      } else {
        this.logger.warn('Token blacklist failed during logout');
        // Still return success to user - they've done their part
        return { message: 'Logged out successfully' };
      }
    } catch (error) {
      this.logger.error('Error during logout:', error);
      // Don't fail the logout request
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
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      user = await this.usersService.create({
        email: profile.email,
        password: hashedPassword,
        name: profile.name,
      });

      // Send welcome email (async, don't block login)
      this.emailService.sendWelcomeEmail(user.email, user.name).catch((error) => {
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
          userId: user.id,
          email: user.email,
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

    // Step 3: Generate JWT tokens
    const { password: _, ...result } = user;

    const payload = { sub: user.id, email: user.email, role: user.role };
    const refreshPayload = { sub: user.id, type: 'refresh' };

    return {
      user: result,
      access_token: this.generateToken(payload),
      refresh_token: this.generateToken(refreshPayload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') || this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '30d',
      }),
    };
  }

  // NOTE: The rest of the methods (verifySocialToken, verifyGoogleToken, etc.) remain unchanged
  // They are omitted here for brevity but should be copied from the original file

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

  private async verifyGoogleToken(idToken: string): Promise<SocialUserProfile> {
    try {
      const googleClientId = this.configService.get<string>('GOOGLE_CLIENT_ID');

      if (googleClientId) {
        const ticket = await this.googleClient.verifyIdToken({
          idToken: idToken,
          audience: googleClientId,
        });

        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
          throw new UnauthorizedException('Invalid Google token - missing email');
        }

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
        this.logger.warn('Using fallback Google token verification. Configure GOOGLE_CLIENT_ID for better security.');
        const url = 'https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=' + idToken;
        const response = await fetch(url);

        if (!response.ok) {
          throw new UnauthorizedException('Invalid Google token');
        }

        const data = await response.json();

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

  private async verifyFacebookToken(accessToken: string): Promise<SocialUserProfile> {
    try {
      const appId = this.configService.get<string>('FACEBOOK_APP_ID');
      const appSecret = this.configService.get<string>('FACEBOOK_APP_SECRET');

      if (appId && appSecret) {
        const debugUrl = `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${appId}|${appSecret}`;
        const debugResponse = await fetch(debugUrl);

        if (!debugResponse.ok) {
          throw new UnauthorizedException('Failed to verify Facebook token');
        }

        const debugData = await debugResponse.json();

        if (!debugData.data.is_valid) {
          throw new UnauthorizedException('Invalid Facebook access token');
        }

        if (debugData.data.app_id !== appId) {
          throw new UnauthorizedException('Facebook token was issued for a different app');
        }

        if (debugData.data.expires_at && debugData.data.expires_at < Date.now() / 1000) {
          throw new UnauthorizedException('Facebook access token has expired');
        }
      } else {
        this.logger.warn('Facebook app credentials not configured. Skipping token validation. Configure FACEBOOK_APP_ID and FACEBOOK_APP_SECRET.');
      }

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

  private async verifyAppleToken(identityToken: string): Promise<SocialUserProfile> {
    try {
      const decodedHeader = jwt.decode(identityToken, { complete: true });
      if (!decodedHeader || !decodedHeader.header) {
        throw new UnauthorizedException('Invalid Apple identity token format');
      }

      const kid = decodedHeader.header.kid;
      if (!kid) {
        throw new UnauthorizedException('Invalid Apple token - missing key ID');
      }

      const publicKey = await this.getApplePublicKey(kid);
      if (!publicKey) {
        throw new UnauthorizedException('Unable to verify Apple token - key not found');
      }

      const appBundleId = this.configService.get<string>('APPLE_CLIENT_ID');
      if (!appBundleId) {
        this.logger.warn('APPLE_CLIENT_ID not configured. Using default. Configure APPLE_CLIENT_ID for production.');
      }

      const payload = jwt.verify(identityToken, publicKey, {
        algorithms: ['RS256'],
        issuer: 'https://appleid.apple.com',
        audience: appBundleId || 'com.citadelbuy.app',
      }) as jwt.JwtPayload;

      if (!payload.sub) {
        throw new UnauthorizedException('Invalid Apple token - missing subject');
      }

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

  private async getApplePublicKey(kid: string): Promise<string | null> {
    try {
      if (appleKeyCache && Date.now() - appleKeyCache.fetchedAt < APPLE_KEY_CACHE_TTL) {
        const key = appleKeyCache.keys.find((k: any) => k.kid === kid);
        if (key) {
          return this.jwkToPem(key);
        }
      }

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

  private jwkToPem(jwk: any): string {
    const client = jwksClient({
      jwksUri: APPLE_KEYS_URL,
    });

    const modulus = Buffer.from(jwk.n, 'base64url');
    const exponent = Buffer.from(jwk.e, 'base64url');

    const modulusLength = modulus.length;
    const exponentLength = exponent.length;

    const modulusPrefix = modulusLength > 128 ? [0x02, 0x82, (modulusLength >> 8) & 0xff, modulusLength & 0xff] : [0x02, 0x81, modulusLength];
    const exponentPrefix = [0x02, exponentLength];

    const sequenceLength = modulusPrefix.length + modulusLength + exponentPrefix.length + exponentLength;
    const sequencePrefix = sequenceLength > 128 ? [0x30, 0x82, (sequenceLength >> 8) & 0xff, sequenceLength & 0xff] : [0x30, 0x81, sequenceLength];

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

  private async verifyGitHubToken(accessToken: string): Promise<SocialUserProfile> {
    try {
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

      let email = userData.email;

      if (!email) {
        const emailsResponse = await fetch('https://api.github.com/user/emails', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        });

        if (emailsResponse.ok) {
          const emails = await emailsResponse.json();

          const primaryEmail = emails.find((e: any) => e.primary && e.verified);
          const verifiedEmail = emails.find((e: any) => e.verified);

          email = primaryEmail?.email || verifiedEmail?.email;
        }
      }

      if (!email) {
        email = `${userData.id}+${userData.login}@users.noreply.github.com`;
        this.logger.warn(`GitHub user ${userData.login} has hidden email. Using noreply: ${email}`);
      }

      if (userData.suspended_at) {
        throw new UnauthorizedException('GitHub account is suspended');
      }

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
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return { message: 'If the email exists, a password reset link has been sent' };
    }

    const plainToken = crypto.randomBytes(32).toString('hex');

    const hashedToken = await bcrypt.hash(plainToken, 10);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await this.prisma.passwordReset.create({
      data: {
        email,
        token: hashedToken,
        expiresAt,
      },
    });

    await this.emailService.sendPasswordResetEmail(user.email, {
      name: user.name,
      resetToken: plainToken,
    });

    return { message: 'If the email exists, a password reset link has been sent' };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const resetRecords = await this.prisma.passwordReset.findMany({
      where: {
        used: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

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

    const user = await this.usersService.findByEmail(matchingRecord.email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    await this.prisma.passwordReset.update({
      where: { id: matchingRecord.id },
      data: { used: true },
    });

    // SECURITY: Invalidate all existing tokens when password changes
    await this.invalidateAllUserTokens(user.id);
    this.logger.log(`Password reset complete for user ${user.id}. All tokens invalidated.`);

    return { message: 'Password has been reset successfully' };
  }
}
