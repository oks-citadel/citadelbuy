import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';

// Controllers
import { OrganizationController } from './controllers/organization.controller';
// import { OrganizationMemberController } from './controllers/organization-member.controller';
import { OrganizationTeamController } from './controllers/organization-team.controller';
import { OrganizationDepartmentController } from './controllers/organization-department.controller';
// import { OrganizationInvitationController } from './controllers/organization-invitation.controller';
// import { OrganizationApiKeyController } from './controllers/organization-api-key.controller';

// Services
import { OrganizationService } from './services/organization.service';
// import { OrganizationMemberService } from './services/organization-member.service';
import { OrganizationTeamService } from './services/organization-team.service';
import { OrganizationDepartmentService } from './services/organization-department.service';
// import { OrganizationInvitationService } from './services/organization-invitation.service';
// import { OrganizationApiKeyService } from './services/organization-api-key.service';

// Common
import { PrismaModule } from '@/common/prisma/prisma.module';
import { RedisModule } from '@/common/redis/redis.module';

// Related Modules
import { OrganizationRolesModule } from '../organization-roles/organization-roles.module';
import { OrganizationAuditModule } from '../organization-audit/organization-audit.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    ConfigModule,
    OrganizationRolesModule,
    OrganizationAuditModule,
    EmailModule,
    
    BullModule.registerQueue({
      name: 'organization-events',
    }),
  ],
  controllers: [
    OrganizationController,
    // OrganizationMemberController,
    OrganizationTeamController,
    OrganizationDepartmentController,
    // OrganizationInvitationController,
    // OrganizationApiKeyController,
  ],
  providers: [
    OrganizationService,
    // OrganizationMemberService,
    OrganizationTeamService,
    OrganizationDepartmentService,
    // OrganizationInvitationService,
    // OrganizationApiKeyService,
  ],
  exports: [
    OrganizationService,
    // OrganizationMemberService,
    OrganizationTeamService,
    OrganizationDepartmentService,
    // OrganizationInvitationService,
    // OrganizationApiKeyService,
  ],
})
export class OrganizationModule {}
