import { Module, Logger } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { UsersModule } from '../users/users.module';
import { EmailModule } from '../email/email.module';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { TrackingModule } from '../tracking/tracking.module';

@Module({
  imports: [
    UsersModule,
    EmailModule,
    PrismaModule,
    TrackingModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const jwtSecret = config.get<string>('JWT_SECRET');
        const logger = new Logger('AuthModule');

        // Enforce JWT_SECRET in production
        if (!jwtSecret && process.env.NODE_ENV === 'production') {
          throw new Error('JWT_SECRET environment variable is required in production');
        }

        if (!jwtSecret) {
          logger.warn('JWT_SECRET not set. Using development fallback. DO NOT use in production!');
        }

        return {
          secret: jwtSecret || 'dev-only-secret-change-in-production',
          signOptions: {
            expiresIn: config.get('JWT_EXPIRATION') || '7d',
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, LocalStrategy],
  exports: [AuthService],
})
export class AuthModule {}
