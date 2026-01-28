import { Controller, Get, Post, Body, Query, Res, Header, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { RobotsService } from './robots.service';
import { UpdateRobotsDto, CrawlAccessCheckDto, CrawlAccessResponseDto } from '../dto/robots.dto';

@ApiTags('SEO - Robots')
@Controller('seo')
export class RobotsController {
  constructor(private readonly robotsService: RobotsService) {}

  @Get('robots.txt')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @Header('Content-Type', 'text/plain')
  @Header('Cache-Control', 'public, max-age=86400') // 24 hours
  @ApiOperation({
    summary: 'Get robots.txt',
    description: 'Returns the robots.txt file for search engine crawlers.',
  })
  @ApiResponse({
    status: 200,
    description: 'Robots.txt content',
    content: {
      'text/plain': {
        schema: { type: 'string' },
      },
    },
  })
  async getRobotsTxt(@Res() res: Response): Promise<void> {
    const content = await this.robotsService.generateRobotsTxt();
    res.send(content);
  }

  @Get('robots/config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get robots.txt configuration',
    description: 'Returns the current robots.txt configuration (Admin only).',
  })
  @ApiResponse({
    status: 200,
    description: 'Robots configuration',
  })
  async getRobotsConfig() {
    return this.robotsService.getConfig();
  }

  @Post('robots/config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update robots.txt configuration',
    description: 'Updates the robots.txt configuration (Admin only).',
  })
  @ApiResponse({
    status: 200,
    description: 'Updated robots configuration',
  })
  async updateRobotsConfig(@Body() updateDto: UpdateRobotsDto) {
    return this.robotsService.updateConfig(updateDto);
  }

  @Get('robots/check-access')
  @ApiOperation({
    summary: 'Check if a path is allowed for crawling',
    description: 'Checks whether a specific path would be allowed or blocked for a given user-agent.',
  })
  @ApiQuery({ name: 'path', description: 'Path to check', example: '/products/sample-product' })
  @ApiQuery({ name: 'userAgent', description: 'User-agent to check', required: false, example: 'Googlebot' })
  @ApiResponse({
    status: 200,
    description: 'Access check result',
    type: CrawlAccessResponseDto,
  })
  async checkAccess(
    @Query('path') path: string,
    @Query('userAgent') userAgent?: string,
  ): Promise<CrawlAccessResponseDto> {
    return this.robotsService.checkAccess({ path, userAgent });
  }

  @Get('robots/blocked-paths')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get all blocked paths',
    description: 'Returns a summary of all blocked paths per user-agent (Admin only).',
  })
  @ApiResponse({
    status: 200,
    description: 'Blocked paths by user-agent',
  })
  async getBlockedPaths() {
    return this.robotsService.getBlockedPaths();
  }

  @Post('robots/cache/invalidate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Invalidate robots.txt cache',
    description: 'Clears the robots.txt cache to force regeneration (Admin only).',
  })
  @ApiResponse({
    status: 200,
    description: 'Cache invalidated successfully',
  })
  async invalidateCache() {
    await this.robotsService.invalidateCache();
    return { success: true, message: 'Robots.txt cache invalidated' };
  }
}
