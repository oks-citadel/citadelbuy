import { Module } from '@nestjs/common';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { RedisModule } from '@/common/redis/redis.module';

// Controllers
import {
  ExperimentsController,
  AssignmentController,
  ResultsController,
  TrackingController,
  FeatureFlagsController,
} from './controllers';

// Services
import {
  ExperimentsService,
  AssignmentService,
  ResultsService,
  TrackingService,
  FeatureFlagsService,
  TargetingService,
  FlagCacheService,
} from './services';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [
    ExperimentsController,
    AssignmentController,
    ResultsController,
    TrackingController,
    FeatureFlagsController,
  ],
  providers: [
    ExperimentsService,
    AssignmentService,
    ResultsService,
    TrackingService,
    FeatureFlagsService,
    TargetingService,
    FlagCacheService,
  ],
  exports: [
    ExperimentsService,
    AssignmentService,
    ResultsService,
    TrackingService,
    FeatureFlagsService,
    TargetingService,
    FlagCacheService,
  ],
})
export class ExperimentsModule {}
