import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  UseGuards,
  Request,
  Query,
  HttpCode,
  HttpStatus,
  Headers,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrivacyService } from './privacy.service';
import { ConsentDto, DataExportRequestDto, DataDeletionRequestDto } from './dto/consent.dto';

@ApiTags('Privacy & Data Rights')
@Controller('privacy')
export class PrivacyController {
  constructor(private privacyService: PrivacyService) {}

  /**
   * GDPR Article 15: Right of access
   * CCPA Section 1798.100: Right to know
   */
  @UseGuards(JwtAuthGuard)
  @Get('data')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'View all stored personal data',
    description:
      'Retrieve a comprehensive overview of all personal data stored about the user. Complies with GDPR Article 15 (Right of Access) and CCPA Section 1798.100 (Right to Know).',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved user data overview',
    schema: {
      example: {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'user@example.com',
        exportDate: '2024-02-20T10:30:00Z',
        dataCategories: {
          personalInformation: 1,
          orders: 15,
          reviews: 8,
          wishlist: 12,
          searchQueries: 145,
          productViews: 234,
          subscriptions: 2,
          paymentPlans: 1,
          adCampaigns: 0,
        },
        consentStatus: {
          dataProcessing: true,
          marketing: true,
          analytics: true,
          thirdPartySharing: false,
          lastUpdated: '2024-01-15T08:00:00Z',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async viewStoredData(@Request() req: any) {
    return this.privacyService.getStoredDataOverview(req.user.id);
  }

  /**
   * GDPR Article 20: Right to data portability
   * CCPA Section 1798.110: Right to access
   */
  @UseGuards(JwtAuthGuard)
  @Post('export')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Request data export',
    description:
      'Export all personal data in machine-readable format (JSON or CSV). Complies with GDPR Article 20 (Right to Data Portability) and CCPA Section 1798.110.',
  })
  @ApiResponse({
    status: 200,
    description: 'Data export initiated successfully',
    schema: {
      example: {
        message: 'Data export has been initiated',
        exportId: 'export_123e4567',
        format: 'json',
        estimatedCompletionTime: '2024-02-20T10:35:00Z',
        downloadUrl: '/privacy/export/download/export_123e4567',
        expiresAt: '2024-02-27T10:30:00Z',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async requestDataExport(@Request() req: any, @Body() exportRequest: DataExportRequestDto) {
    return this.privacyService.initiateDataExport(req.user.id, exportRequest.format || 'json');
  }

  /**
   * Download the exported data
   */
  @UseGuards(JwtAuthGuard)
  @Get('export/download')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Download exported data',
    description: 'Download the previously requested data export file.',
  })
  @ApiQuery({
    name: 'format',
    enum: ['json', 'csv'],
    required: false,
    description: 'Format of the export file',
  })
  @ApiResponse({
    status: 200,
    description: 'Export file download',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Export not found' })
  async downloadDataExport(
    @Request() req: any,
    @Query('format') format: 'json' | 'csv' = 'json',
    @Res() res: Response,
  ) {
    const exportData = await this.privacyService.generateDataExport(req.user.id, format);

    const filename = `citadelbuy-data-export-${req.user.id}-${new Date().toISOString().split('T')[0]}.${format}`;
    const contentType = format === 'json' ? 'application/json' : 'text/csv';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(exportData);
  }

  /**
   * GDPR Article 17: Right to erasure (Right to be forgotten)
   * CCPA Section 1798.105: Right to delete
   */
  @UseGuards(JwtAuthGuard)
  @Delete('delete-account')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Request account deletion',
    description:
      'Request deletion of user account and associated data. Complies with GDPR Article 17 (Right to Erasure) and CCPA Section 1798.105 (Right to Delete). Supports soft delete, hard delete, and anonymization strategies.',
  })
  @ApiResponse({
    status: 202,
    description: 'Deletion request accepted and scheduled',
    schema: {
      example: {
        message: 'Account deletion request has been received',
        userId: '123e4567-e89b-12d3-a456-426614174000',
        strategy: 'ANONYMIZE',
        scheduledDate: '2024-03-20T10:30:00Z',
        cancellationDeadline: '2024-03-19T10:30:00Z',
        dataRetentionInfo: {
          ordersRetained: true,
          retentionPeriod: '7 years',
          reason: 'Legal and tax compliance',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid deletion request or active orders prevent deletion' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async requestAccountDeletion(@Request() req: any, @Body() deletionRequest: DataDeletionRequestDto) {
    return this.privacyService.requestDeletion(req.user.id, deletionRequest);
  }

  /**
   * Check data retention requirements before deletion
   */
  @UseGuards(JwtAuthGuard)
  @Get('retention-info')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get data retention information',
    description:
      'View what data must be retained for legal compliance and available deletion options for your account.',
  })
  @ApiResponse({
    status: 200,
    description: 'Data retention information',
    schema: {
      example: {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        retentionRequirements: {
          taxRecords: {
            required: true,
            period: '7 years',
            recordsCount: 15,
            reason: 'Tax law compliance',
          },
          activePaymentPlans: {
            required: false,
            count: 0,
            reason: 'Contractual obligation',
          },
          fraudPrevention: {
            required: true,
            period: '5 years',
            reason: 'Anti-fraud and dispute resolution',
          },
        },
        deletionOptions: {
          hardDelete: true,
          softDelete: true,
          anonymize: true,
        },
        recommendation: 'All deletion strategies available',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getRetentionInfo(@Request() req: any) {
    return this.privacyService.getRetentionInfo(req.user.id);
  }

  /**
   * GDPR Article 7: Consent management
   * CCPA: Opt-in/Opt-out rights
   */
  @UseGuards(JwtAuthGuard)
  @Post('consent')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Manage privacy consent',
    description:
      'Update consent preferences for data processing, marketing, analytics, and third-party sharing. Complies with GDPR Article 7 (Consent) and CCPA opt-in/opt-out requirements.',
  })
  @ApiResponse({
    status: 200,
    description: 'Consent preferences updated successfully',
    schema: {
      example: {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        consent: {
          dataProcessing: true,
          marketing: false,
          analytics: true,
          thirdPartySharing: false,
        },
        updatedAt: '2024-02-20T10:30:00Z',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid consent data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateConsent(
    @Request() req: any,
    @Body() consentDto: ConsentDto,
    @Headers('x-forwarded-for') forwardedFor: string,
    @Headers('user-agent') userAgent: string,
  ) {
    // Get real IP address
    const ipAddress = forwardedFor?.split(',')[0] || consentDto.ipAddress || req.ip || 'unknown';

    return this.privacyService.updateConsent(req.user.id, {
      ...consentDto,
      ipAddress,
      userAgent: userAgent || consentDto.userAgent || 'unknown',
    });
  }

  /**
   * Get current consent status
   */
  @UseGuards(JwtAuthGuard)
  @Get('consent')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current consent preferences',
    description: 'Retrieve the current consent preferences for the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Current consent preferences',
    schema: {
      example: {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        consent: {
          dataProcessing: true,
          marketing: true,
          analytics: true,
          thirdPartySharing: false,
        },
        grantedAt: '2024-01-15T08:00:00Z',
        lastUpdatedAt: '2024-02-10T14:30:00Z',
        ipAddress: '192.168.1.1',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getConsent(@Request() req: any) {
    return this.privacyService.getConsent(req.user.id);
  }

  /**
   * GDPR Article 16: Right to rectification
   */
  @UseGuards(JwtAuthGuard)
  @Get('data-accuracy')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Verify data accuracy',
    description:
      'Review stored data for accuracy. Users can update inaccurate data through profile settings. Supports GDPR Article 16 (Right to Rectification).',
  })
  @ApiResponse({
    status: 200,
    description: 'Data accuracy information',
    schema: {
      example: {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        lastVerified: '2024-01-15T08:00:00Z',
        dataFields: {
          email: { value: 'user@example.com', verified: true, lastUpdated: '2024-01-15T08:00:00Z' },
          name: { value: 'John Doe', verified: false, lastUpdated: '2024-01-01T00:00:00Z' },
          phone: { value: '+1234567890', verified: false, lastUpdated: '2024-01-01T00:00:00Z' },
        },
        message: 'You can update your personal information through the profile settings page.',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async verifyDataAccuracy(@Request() req: any) {
    return this.privacyService.verifyDataAccuracy(req.user.id);
  }

  /**
   * GDPR Article 18: Right to restriction of processing
   */
  @UseGuards(JwtAuthGuard)
  @Post('restrict-processing')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Restrict data processing',
    description:
      'Request restriction of data processing while maintaining your account. Complies with GDPR Article 18 (Right to Restriction of Processing).',
  })
  @ApiResponse({
    status: 200,
    description: 'Processing restriction applied',
    schema: {
      example: {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        processingRestricted: true,
        restrictedActivities: ['marketing', 'analytics', 'recommendations'],
        appliedAt: '2024-02-20T10:30:00Z',
        message:
          'Your data will only be stored and processed for essential account functions and legal compliance.',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async restrictProcessing(@Request() req: any) {
    return this.privacyService.restrictProcessing(req.user.id);
  }

  /**
   * Get privacy policy and terms version that user agreed to
   */
  @UseGuards(JwtAuthGuard)
  @Get('agreed-terms')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get agreed terms and privacy policy version',
    description: 'Retrieve information about which version of terms and privacy policy the user agreed to.',
  })
  @ApiResponse({
    status: 200,
    description: 'Agreed terms information',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAgreedTerms(@Request() req: any) {
    return this.privacyService.getAgreedTerms(req.user.id);
  }
}
