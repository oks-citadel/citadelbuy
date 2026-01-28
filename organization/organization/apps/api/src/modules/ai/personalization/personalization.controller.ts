import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PersonalizationService } from './personalization.service';

@ApiTags('AI - Personalization Engine')
@Controller('ai/personalization')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PersonalizationController {
  constructor(
    private readonly personalizationService: PersonalizationService,
  ) {}

  @Get('recommendations/:userId')
  @ApiOperation({ summary: 'Get personalized product recommendations' })
  async getRecommendations(@Param('userId') userId: string) {
    return this.personalizationService.getPersonalizedRecommendations(userId);
  }

  @Post('track-behavior')
  @ApiOperation({ summary: 'Track user behavior for personalization' })
  async trackBehavior(@Body() behaviorData: any) {
    return this.personalizationService.trackUserBehavior(behaviorData);
  }

  @Get('homepage/:userId')
  @ApiOperation({ summary: 'Get personalized homepage layout' })
  async getPersonalizedHomepage(@Param('userId') userId: string) {
    return this.personalizationService.getPersonalizedHomepage(userId);
  }

  @Get('email-content/:userId')
  @ApiOperation({ summary: 'Get personalized email content' })
  async getPersonalizedEmail(@Param('userId') userId: string) {
    return this.personalizationService.getPersonalizedEmailContent(userId);
  }
}
