import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// Controllers
import { RoleController } from './controllers/role.controller';
import { PermissionController } from './controllers/permission.controller';

// Services
import { RoleService } from './services/role.service';
import { PermissionService } from './services/permission.service';

// Guards
import { OrganizationPermissionGuard } from './guards/permission.guard';

// Common
import { PrismaModule } from '@/common/prisma/prisma.module';
import { RedisModule } from '@/common/redis/redis.module';

@Global()
@Module({
  imports: [PrismaModule, RedisModule, ConfigModule],
  controllers: [RoleController, PermissionController],
  providers: [
    RoleService,
    PermissionService,
    OrganizationPermissionGuard,
  ],
  exports: [
    RoleService,
    PermissionService,
    OrganizationPermissionGuard,
  ],
})
export class OrganizationRolesModule {}
