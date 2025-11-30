import { Injectable, UnauthorizedException, ConflictException, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import * as jwksClient from 'jwks-rsa';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ServerTrackingService } from '../tracking/server-tracking.service';
import { SocialProvider, SocialLoginDto } from './dto/social-login.dto';

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

  async socialLogin(socialLoginDto: SocialLoginDto): Promise<{ user: any; access_token: string }> {
    const { provider, accessToken } = socialLoginDto;
    const profile = await this.verifySocialToken(provider, accessToken);
    if (!profile || !profile.email) {
      throw new UnauthorizedException('Invalid social login credentials');
    }
    let user = await this.usersService.findByEmail(profile.email);
    if (!user) {
      const randomPassword = crypto.randomBytes(32).toString('hex');
      const hashedPassword = await bcrypt.hash(randomPassword, 10);
      user = await this.usersService.create({ email: profile.email, password: hashedPassword, name: profile.name });
      this.emailService.sendWelcomeEmail(user.email, user.name).catch((e) => console.error('Welcome email failed:', e));
    }
    const { password: _, ...result } = user;
    return { user: result, access_token: this.jwtService.sign({ sub: user.id, email: user.email, role: user.role }) };
  }

  private async verifySocialToken(provider: SocialProvider, accessToken: string): Promise<SocialUserProfile | null> {
    try {
      switch (provider) {
        case SocialProvider.GOOGLE: return await this.verifyGoogleToken(accessToken);
        case SocialProvider.FACEBOOK: return await this.verifyFacebookToken(accessToken);
        case SocialProvider.APPLE: return await this.verifyAppleToken(accessToken);
        default: throw new BadRequestException('Unsupported social provider');
      }
    } catch (error) {
      console.error('Social token verification failed:', error);
      throw new UnauthorizedException('Failed to verify social login credentials');
    }
  }

  private async verifyGoogleToken(accessToken: string): Promise<SocialUserProfile> {
    const url = 'https://www.googleapis.com/oauth2/v3/userinfo?access_token=' + accessToken;
    const response = await fetch(url);
    if (!response.ok) throw new UnauthorizedException('Invalid Google access token');
    const data = await response.json();
    return { email: data.email, name: data.name || data.email.split('@')[0], providerId: data.sub, avatar: data.picture };
  }

  private async verifyFacebookToken(accessToken: string): Promise<SocialUserProfile> {
    const url = 'https://graph.facebook.com/me?fields=id,name,email,picture&access_token=' + accessToken;
    const response = await fetch(url);
    if (!response.ok) throw new UnauthorizedException('Invalid Facebook access token');
    const data = await response.json();
    return { email: data.email, name: data.name || 'Facebook User', providerId: data.id, avatar: data.picture?.data?.url };
  }

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

      // Verify the token
      const appBundleId = this.configService.get<string>('APPLE_CLIENT_ID') || 'com.citadelbuy.app';

      const payload = jwt.verify(identityToken, publicKey, {
        algorithms: ['RS256'],
        issuer: 'https://appleid.apple.com',
        audience: appBundleId,
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
      console.error('Failed to fetch Apple public keys:', error);
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

    // Send email
    await this.emailService.sendPasswordResetEmail(user.email, {
      name: user.name,
      resetToken: token,
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
