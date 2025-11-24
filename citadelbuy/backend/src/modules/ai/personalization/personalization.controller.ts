import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PersonalizationService } from './personalization.service';

@ApiTags('AI - Personalization Engine')
@Controller('ai/personalization')
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
