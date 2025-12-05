import { Module, Logger } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AdminAuthController } from './admin-auth.controller';
import { AuthService } from './auth.service';
import { AccountLockoutService } from './account-lockout.service';
import { TokenBlacklistService } from './token-blacklist.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { UsersModule } from '../users/users.module';
import { EmailModule } from '../email/email.module';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { RedisModule } from '../../common/redis/redis.module';
import { TrackingModule } from '../tracking/tracking.module';

@Module({
  imports: [
    UsersModule,
    EmailModule,
    PrismaModule,
    RedisModule,
    TrackingModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const jwtSecret = config.get<string>('JWT_SECRET');
        const isProduction = config.get<string>('NODE_ENV') === 'production';
        const logger = new Logger('AuthModule');

        if (!jwtSecret) {
          logger.error('JWT_SECRET environment variable is not set. This is a critical security requirement.');
          throw new Error(
            'JWT_SECRET environment variable is required. ' +
            'Please set a strong, randomly generated secret in your .env file. ' +
            'Generate with: openssl rand -base64 64'
          );
        }

        if (isProduction) {
          if (jwtSecret.length < 64) {
            logger.error(
              \`JWT_SECRET is too short for production (\${jwtSecret.length} chars). \` +
              'Minimum required: 64 characters. Generate a secure secret with: openssl rand -base64 64'
            );
            throw new Error(
              'JWT_SECRET must be at least 64 characters in production. ' +
              'Generate a secure secret with: openssl rand -base64 64'
            );
          }

          const insecurePatterns = [
            'secret',
            'password',
            'changeme',
            'default',
            'example',
            'test',
            '123456',
            'your-',
            'placeholder',
          ];

          const lowerSecret = jwtSecret.toLowerCase();
          const foundInsecurePattern = insecurePatterns.find(pattern => lowerSecret.includes(pattern));

          if (foundInsecurePattern) {
            logger.error(
              \`JWT_SECRET contains insecure pattern "\${foundInsecurePattern}". \` +
              'Use a cryptographically random secret. Generate with: openssl rand -base64 64'
            );
            throw new Error(
              'JWT_SECRET contains insecure patterns. ' +
              'Use a cryptographically random secret generated with: openssl rand -base64 64'
            );
          }

          const hasUpperCase = /[A-Z]/.test(jwtSecret);
          const hasLowerCase = /[a-z]/.test(jwtSecret);
          const hasNumbers = /[0-9]/.test(jwtSecret);

          if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
            logger.error(
              'JWT_SECRET lacks complexity (missing uppercase, lowercase, or numbers). ' +
              'Generate a secure secret with: openssl rand -base64 64'
            );
            throw new Error(
              'JWT_SECRET lacks sufficient complexity. ' +
              'Generate a secure secret with: openssl rand -base64 64'
            );
          }

          logger.log('JWT_SECRET validation passed - secret meets production security requirements');
        } else {
          if (jwtSecret.length < 32) {
            logger.warn(
              'JWT_SECRET is shorter than recommended (< 32 characters). ' +
              'Consider using a longer, randomly generated secret for better security. ' +
              'Generate with: openssl rand -base64 64'
            );
          }
        }

        return {
          secret: jwtSecret,
          signOptions: {
            expiresIn: config.get('JWT_EXPIRATION') || '7d',
          },
        };
      },
    }),
  ],
  controllers: [AuthController, AdminAuthController],
  providers: [AuthService, AccountLockoutService, TokenBlacklistService, JwtStrategy, LocalStrategy],
  exports: [AuthService, AccountLockoutService],
})
export class AuthModule {}
