import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
  HttpStatus,
  HttpCode,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AffiliateLinksService } from './affiliate-links.service';

/**
 * DTO for creating an affiliate link
 */
class CreateAffiliateLinkDto {
  productId?: string;
  productSlug?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  customParams?: Record<string, string>;
  expiresAt?: Date;
}

/**
 * DTO for tracking a click
 */
class TrackClickDto {
  linkId?: string;
  affiliateCode: string;
  productSlug?: string;
}

/**
 * DTO for tracking a conversion
 */
class TrackConversionDto {
  affiliateCode: string;
  orderId: string;
  productId: string;
  amount: number;
  currency: string;
  customerId?: string;
}

@ApiTags('Affiliate Links')
@Controller('affiliate')
export class AffiliateLinksController {
  constructor(private readonly affiliateLinksService: AffiliateLinksService) {}

  /**
   * Redirect handler for affiliate short links
   * GET /go/:affiliateCode/:productSlug?
   */
  @Get('go/:affiliateCode/:productSlug?')
  @ApiOperation({ summary: 'Redirect affiliate link to destination' })
  @ApiParam({ name: 'affiliateCode', description: 'Affiliate code' })
  @ApiParam({ name: 'productSlug', description: 'Product slug (optional)', required: false })
  @ApiResponse({ status: 302, description: 'Redirects to destination URL' })
  async redirectAffiliateLink(
    @Param('affiliateCode') affiliateCode: string,
    @Param('productSlug') productSlug: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    // Resolve the affiliate link
    const result = await this.affiliateLinksService.resolveAffiliateLink(
      affiliateCode,
      productSlug,
    );

    // Track the click asynchronously
    this.affiliateLinksService.trackClick({
      linkId: result.linkId,
      affiliateCode,
      productSlug: productSlug || '',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      referrer: req.headers['referer'] as string,
      country: req.headers['cf-ipcountry'] as string, // Cloudflare header
      timestamp: new Date(),
    }).catch(() => {
      // Silently fail click tracking
    });

    // Set affiliate tracking cookie (30 days)
    res.cookie('affiliate_ref', affiliateCode, {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    // Redirect to destination
    res.redirect(HttpStatus.FOUND, result.destinationUrl);
  }

  /**
   * Create an affiliate link
   */
  @Post('links')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new affiliate link' })
  @ApiResponse({ status: 201, description: 'Affiliate link created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createLink(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateAffiliateLinkDto,
  ) {
    const link = await this.affiliateLinksService.generateAffiliateLink({
      affiliateId: user.id,
      productId: dto.productId,
      productSlug: dto.productSlug,
      utmSource: dto.utmSource,
      utmMedium: dto.utmMedium,
      utmCampaign: dto.utmCampaign,
      customParams: dto.customParams,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    });

    return {
      success: true,
      data: link,
    };
  }

  /**
   * Get affiliate's statistics
   */
  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get affiliate statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStats(@CurrentUser() user: { id: string }) {
    const stats = await this.affiliateLinksService.getAffiliateStats(user.id);

    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Get all affiliate links
   */
  @Get('links')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all affiliate links' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'active', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Links retrieved successfully' })
  async getLinks(
    @CurrentUser() user: { id: string },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('active') active?: string,
  ) {
    const result = await this.affiliateLinksService.getAffiliateLinks(user.id, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      isActive: active !== undefined ? active === 'true' : undefined,
    });

    return {
      success: true,
      data: result.links,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit),
      },
    };
  }

  /**
   * Deactivate an affiliate link
   */
  @Delete('links/:linkId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deactivate an affiliate link' })
  @ApiParam({ name: 'linkId', description: 'Link ID' })
  @ApiResponse({ status: 204, description: 'Link deactivated successfully' })
  async deactivateLink(
    @CurrentUser() user: { id: string },
    @Param('linkId') linkId: string,
  ) {
    await this.affiliateLinksService.deactivateLink(linkId, user.id);
  }

  /**
   * Track a click (for client-side tracking)
   */
  @Post('track/click')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Track an affiliate link click' })
  @ApiResponse({ status: 204, description: 'Click tracked successfully' })
  async trackClick(@Body() dto: TrackClickDto, @Req() req: Request) {
    await this.affiliateLinksService.trackClick({
      linkId: dto.linkId,
      affiliateCode: dto.affiliateCode,
      productSlug: dto.productSlug || '',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      referrer: req.headers['referer'] as string,
      country: req.headers['cf-ipcountry'] as string,
      timestamp: new Date(),
    });
  }

  /**
   * Track a conversion (webhook endpoint)
   */
  @Post('track/conversion')
  @ApiOperation({ summary: 'Track an affiliate conversion' })
  @ApiResponse({ status: 200, description: 'Conversion tracked successfully' })
  async trackConversion(@Body() dto: TrackConversionDto) {
    if (!dto.affiliateCode || !dto.orderId) {
      throw new BadRequestException('Missing required fields');
    }

    const result = await this.affiliateLinksService.trackConversion({
      affiliateCode: dto.affiliateCode,
      orderId: dto.orderId,
      productId: dto.productId,
      amount: dto.amount,
      currency: dto.currency,
      customerId: dto.customerId,
    });

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Get commission structure
   */
  @Get('commission')
  @ApiOperation({ summary: 'Get commission structure' })
  @ApiQuery({ name: 'productId', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiResponse({ status: 200, description: 'Commission structure retrieved' })
  async getCommission(
    @Query('productId') productId?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    const commission = await this.affiliateLinksService.getCommissionStructure(
      productId,
      categoryId,
    );

    return {
      success: true,
      data: commission,
    };
  }

  /**
   * Generate a shareable link (public endpoint)
   */
  @Get('share/:affiliateCode')
  @ApiOperation({ summary: 'Get shareable link info' })
  @ApiParam({ name: 'affiliateCode', description: 'Affiliate code' })
  @ApiResponse({ status: 200, description: 'Share link info retrieved' })
  async getShareLink(@Param('affiliateCode') affiliateCode: string) {
    // Return base share URLs for different platforms
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://broxiva.com';

    return {
      success: true,
      data: {
        affiliateCode,
        links: {
          direct: `${baseUrl}/go/${affiliateCode}`,
          facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${baseUrl}/go/${affiliateCode}`)}`,
          twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(`${baseUrl}/go/${affiliateCode}`)}&text=${encodeURIComponent('Check out Broxiva!')}`,
          linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`${baseUrl}/go/${affiliateCode}`)}`,
          whatsapp: `https://wa.me/?text=${encodeURIComponent(`Check out Broxiva! ${baseUrl}/go/${affiliateCode}`)}`,
          email: `mailto:?subject=${encodeURIComponent('Check out Broxiva')}&body=${encodeURIComponent(`I thought you might be interested: ${baseUrl}/go/${affiliateCode}`)}`,
        },
      },
    };
  }
}
