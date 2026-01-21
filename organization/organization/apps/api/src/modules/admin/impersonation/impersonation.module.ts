import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ImpersonationController } from './impersonation.controller';
import { ImpersonationService } from './impersonation.service';
import { ImpersonationAuditGuard, ImpersonationBlockGuard } from './impersonation.guard';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { EmailService } from '../../email/email.service';
import { UsersService } from '../../users/users.service';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '1h',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [ImpersonationController],
  providers: [
    ImpersonationService,
    ImpersonationAuditGuard,
    ImpersonationBlockGuard,
    PrismaService,
    EmailService,
    UsersService,
  ],
  exports: [ImpersonationService, ImpersonationAuditGuard, ImpersonationBlockGuard],
})
export class ImpersonationModule {}
