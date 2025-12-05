import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { TokenBlacklistService } from '../token-blacklist.service';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private configService: ConfigService,
    private tokenBlacklistService: TokenBlacklistService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');

    // In production, JWT_SECRET is required
    if (!jwtSecret && process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET environment variable is required in production');
    }

    // In development, warn but use fallback
    if (!jwtSecret) {
      const logger = new Logger(JwtStrategy.name);
      logger.warn('JWT_SECRET not set. Using development fallback. DO NOT use in production!');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret || 'dev-only-secret-change-in-production',
      // Pass the request to validate() so we can access the raw token
      passReqToCallback: true,
    });
  }

  async validate(request: Request, payload: { sub: string; email: string; role: string; iat?: number; jti?: string }) {
    // SECURITY: Check if token is blacklisted before allowing access
    // This prevents use of tokens after logout, password change, or security incidents
    try {
      // Extract the token from the Authorization header
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        throw new UnauthorizedException('No authorization token provided');
      }

      const token = authHeader.replace('Bearer ', '');

      // Check if token is blacklisted
      const isBlacklisted = await this.tokenBlacklistService.isTokenBlacklisted(token);

      if (isBlacklisted) {
        this.logger.warn(`Blacklisted token attempted access (User: ${payload.sub})`);
        throw new UnauthorizedException('Token has been revoked');
      }

      // Token is valid and not blacklisted
      return {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        iat: payload.iat,
        jti: payload.jti,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      // Log unexpected errors but still deny access
      this.logger.error('Error validating token:', error);
      throw new UnauthorizedException('Token validation failed');
    }
  }
}
