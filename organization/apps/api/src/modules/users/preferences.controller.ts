import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { PreferencesService } from './preferences.service';
import { getCurrentTraceId } from '@/common/interceptors/trace.interceptor';

/**
 * User Preferences DTO
 */
class SavePreferencesDto {
  country?: string;
  language?: string;
  currency?: string;
  timezone?: string;
  theme?: 'light' | 'dark' | 'system';
  notifications?: {
    email?: boolean;
    push?: boolean;
    sms?: boolean;
    marketing?: boolean;
  };
}

/**
 * Preferences Controller (API v1)
 *
 * Handles user preferences for country, language, currency, etc.
 * Sets response cookies for preferences to enable client-side caching.
 */
@ApiTags('Preferences')
@Controller('api/v1/preferences')
export class PreferencesController {
  private readonly logger = new Logger(PreferencesController.name);

  // Cookie configuration
  private readonly COOKIE_OPTIONS = {
    httpOnly: false, // Preferences need to be accessible to JS
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
    path: '/',
  };

  constructor(
    private readonly usersService: UsersService,
    private readonly preferencesService: PreferencesService,
  ) {}

  /**
   * Save user preferences
   *
   * - Stores preferences in user_preferences table
   * - Sets response cookies for client-side access
   * - Works for both authenticated and anonymous users
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Save user preferences',
    description: 'Save user preferences (country, language, currency). Sets response cookies.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        country: { type: 'string', example: 'US', description: 'ISO 3166-1 alpha-2 country code' },
        language: { type: 'string', example: 'en', description: 'ISO 639-1 language code' },
        currency: { type: 'string', example: 'USD', description: 'ISO 4217 currency code' },
        timezone: { type: 'string', example: 'America/New_York', description: 'IANA timezone' },
        theme: { type: 'string', enum: ['light', 'dark', 'system'], example: 'system' },
        notifications: {
          type: 'object',
          properties: {
            email: { type: 'boolean', example: true },
            push: { type: 'boolean', example: true },
            sms: { type: 'boolean', example: false },
            marketing: { type: 'boolean', example: false },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Preferences saved successfully',
    schema: {
      example: {
        success: true,
        preferences: {
          country: 'US',
          language: 'en',
          currency: 'USD',
          timezone: 'America/New_York',
          theme: 'system',
        },
        message: 'Preferences saved successfully',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async savePreferences(
    @Request() req: { user: { id: string } },
    @Body() preferences: SavePreferencesDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const traceId = getCurrentTraceId();
    const userId = req.user.id;

    this.logger.log('Saving user preferences', {
      traceId,
      userId,
      preferences: {
        country: preferences.country,
        language: preferences.language,
        currency: preferences.currency,
      },
    });

    // Save to database
    const savedPreferences = await this.preferencesService.savePreferences(
      userId,
      preferences,
    );

    // Set cookies for client-side access
    this.setPreferenceCookies(res, savedPreferences);

    return {
      success: true,
      preferences: savedPreferences,
      message: 'Preferences saved successfully',
    };
  }

  /**
   * Get user preferences
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get user preferences',
    description: 'Retrieve stored user preferences.',
  })
  @ApiResponse({
    status: 200,
    description: 'User preferences',
    schema: {
      example: {
        country: 'US',
        language: 'en',
        currency: 'USD',
        timezone: 'America/New_York',
        theme: 'system',
        notifications: {
          email: true,
          push: true,
          sms: false,
          marketing: false,
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getPreferences(@Request() req: { user: { id: string } }) {
    const userId = req.user.id;
    return this.preferencesService.getPreferences(userId);
  }

  /**
   * Set preference cookies
   */
  private setPreferenceCookies(res: Response, preferences: SavePreferencesDto): void {
    if (preferences.country) {
      res.cookie('bx_country', preferences.country, this.COOKIE_OPTIONS);
    }

    if (preferences.language) {
      res.cookie('bx_language', preferences.language, this.COOKIE_OPTIONS);
    }

    if (preferences.currency) {
      res.cookie('bx_currency', preferences.currency, this.COOKIE_OPTIONS);
    }

    if (preferences.timezone) {
      res.cookie('bx_timezone', preferences.timezone, this.COOKIE_OPTIONS);
    }

    if (preferences.theme) {
      res.cookie('bx_theme', preferences.theme, this.COOKIE_OPTIONS);
    }
  }
}
