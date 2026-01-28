import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { ReputationService } from './reputation.service';
import {
  CreateReviewDto,
  ReviewResponseDto,
  CreateTestimonialDto,
  CreateSurveyDto,
  SubmitSurveyResponseDto,
  CreateTrustBadgeDto,
  ReviewQueryDto,
} from './dto/reputation.dto';

@ApiTags('Marketing - Reputation')
@Controller('marketing/reputation')
export class ReputationController {
  constructor(private readonly reputationService: ReputationService) {}

  // Review Endpoints
  @Post('reviews')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create review' })
  @ApiResponse({ status: 201, description: 'Review created' })
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async createReview(@CurrentUser() user: any, @Body() dto: CreateReviewDto) {
    return this.reputationService.createReview(user.id, dto);
  }

  @Get('reviews')
  @ApiOperation({ summary: 'Get reviews' })
  @ApiResponse({ status: 200, description: 'Reviews retrieved' })
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async getReviews(@Query() query: ReviewQueryDto) {
    return this.reputationService.getReviews(query);
  }

  @Post('reviews/:id/respond')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Respond to review' })
  @ApiParam({ name: 'id', description: 'Review ID' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async respondToReview(@Param('id') id: string, @Body() dto: ReviewResponseDto) {
    return this.reputationService.respondToReview(id, dto.content);
  }

  @Post('reviews/:id/helpful')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark review as helpful' })
  @ApiParam({ name: 'id', description: 'Review ID' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async markReviewHelpful(@Param('id') id: string) {
    return this.reputationService.markReviewHelpful(id);
  }

  @Put('reviews/:id/moderate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Moderate review' })
  @ApiParam({ name: 'id', description: 'Review ID' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async moderateReview(@Param('id') id: string, @Body() body: { status: 'approved' | 'rejected' }) {
    return this.reputationService.moderateReview(id, body.status);
  }

  // Testimonial Endpoints
  @Post('testimonials')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create testimonial' })
  @ApiResponse({ status: 201, description: 'Testimonial created' })
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async createTestimonial(@Body() dto: CreateTestimonialDto) {
    return this.reputationService.createTestimonial(dto);
  }

  @Get('testimonials')
  @ApiOperation({ summary: 'Get testimonials' })
  @ApiResponse({ status: 200, description: 'Testimonials retrieved' })
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async getTestimonials(
    @Query('organizationId') organizationId: string,
    @Query('featured') featured?: boolean,
  ) {
    return this.reputationService.getTestimonials(organizationId, featured);
  }

  @Put('testimonials/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve testimonial' })
  @ApiParam({ name: 'id', description: 'Testimonial ID' })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async approveTestimonial(@Param('id') id: string, @Body() body: { approved: boolean }) {
    return this.reputationService.approveTestimonial(id, body.approved);
  }

  // Survey Endpoints
  @Post('surveys')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create NPS/CSAT survey' })
  @ApiResponse({ status: 201, description: 'Survey created' })
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async createSurvey(@Body() dto: CreateSurveyDto) {
    return this.reputationService.createSurvey(dto);
  }

  @Post('surveys/respond')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit survey response' })
  @ApiResponse({ status: 201, description: 'Response submitted' })
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async submitSurveyResponse(@Body() dto: SubmitSurveyResponseDto) {
    await this.reputationService.submitSurveyResponse(dto);
    return { success: true };
  }

  @Get('surveys/:id/results')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get survey results' })
  @ApiParam({ name: 'id', description: 'Survey ID' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getSurveyResults(@Param('id') id: string) {
    return this.reputationService.getSurveyResults(id);
  }

  // Trust Badge Endpoints
  @Post('badges')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create trust badge' })
  @ApiResponse({ status: 201, description: 'Badge created' })
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async createTrustBadge(@Body() dto: CreateTrustBadgeDto) {
    return this.reputationService.createTrustBadge(dto);
  }

  @Get('badges')
  @ApiOperation({ summary: 'Get trust badges' })
  @ApiResponse({ status: 200, description: 'Badges retrieved' })
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async getTrustBadges(@Query('organizationId') organizationId: string) {
    return this.reputationService.getTrustBadges(organizationId);
  }

  @Put('badges/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update trust badge' })
  @ApiParam({ name: 'id', description: 'Badge ID' })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async updateTrustBadge(@Param('id') id: string, @Body() dto: Partial<CreateTrustBadgeDto>) {
    return this.reputationService.updateTrustBadge(id, dto);
  }

  @Delete('badges/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete trust badge' })
  @ApiParam({ name: 'id', description: 'Badge ID' })
  @ApiResponse({ status: 204, description: 'Badge deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async deleteTrustBadge(@Param('id') id: string) {
    await this.reputationService.deleteTrustBadge(id);
  }
}
