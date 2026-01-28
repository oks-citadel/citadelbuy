import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpStatus,
  HttpCode,
  Req,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { OrganizationPermissionGuard } from '../../organization-roles/guards/permission.guard';
import { RequirePermission } from '../../organization-roles/decorators/require-permission.decorator';
import { KycService } from '../services/kyc.service';
import { KycProviderService } from '../services/kyc-provider.service';
import {
  SubmitKycDto,
  UploadDocumentDto,
} from '../dto/submit-kyc.dto';
import {
  ReviewKycDto,
  GetKycStatusResponseDto,
} from '../dto/review-kyc.dto';

@ApiTags('Organization KYC')
@Controller('organizations/:orgId/kyc')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OrganizationPermissionGuard)
export class KycController {
  constructor(
    private readonly kycService: KycService,
    private readonly kycProviderService: KycProviderService,
  ) {}

  /**
   * Submit KYC application
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('org:admin')
  @ApiOperation({
    summary: 'Submit KYC application',
    description: 'Submit KYC verification application for the organization',
  })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'KYC application submitted successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input or KYC already submitted',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Organization not found',
  })
  async submitKyc(
    @Param('orgId') orgId: string,
    @Body() dto: SubmitKycDto,
    @Req() req: Request,
  ) {
    const userId = (req.user as any)?.id;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] as string;

    return this.kycService.submitKyc(orgId, userId, dto, ipAddress);
  }

  /**
   * Get KYC status
   */
  @Get()
  @RequirePermission('org:read')
  @ApiOperation({
    summary: 'Get KYC status',
    description: 'Retrieve the current KYC verification status for the organization',
  })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'KYC status retrieved successfully',
    type: GetKycStatusResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'KYC application not found',
  })
  async getKycStatus(@Param('orgId') orgId: string) {
    return this.kycService.getKycStatus(orgId);
  }

  /**
   * Upload document
   */
  @Post('documents')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('org:admin')
  @ApiOperation({
    summary: 'Upload KYC document',
    description: 'Generate a secure pre-signed URL for uploading KYC documents',
  })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Upload URL generated successfully',
    schema: {
      properties: {
        uploadUrl: { type: 'string', example: 'https://secure-upload-url.com/token' },
        expiresAt: { type: 'string', format: 'date-time' },
        documentType: { type: 'string', example: 'id_document' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid document type or file format',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'KYC application not found',
  })
  async uploadDocument(
    @Param('orgId') orgId: string,
    @Body() dto: UploadDocumentDto,
    @Req() req: Request,
  ) {
    const userId = (req.user as any)?.id;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] as string;

    return this.kycService.uploadDocument(orgId, userId, dto, undefined, ipAddress);
  }

  /**
   * Review KYC application (Admin only)
   */
  @Post('review')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('kyc:review')
  @ApiOperation({
    summary: 'Review KYC application',
    description: 'Admin endpoint to approve, reject, or request more information for KYC applications',
  })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'KYC review completed successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid review decision or missing required fields',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'KYC application not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions to review KYC',
  })
  async reviewKyc(
    @Param('orgId') orgId: string,
    @Body() dto: ReviewKycDto,
    @Req() req: Request,
  ) {
    const reviewerId = (req.user as any)?.id;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] as string;

    return this.kycService.reviewKyc(orgId, reviewerId, dto, ipAddress);
  }

  /**
   * Get pending KYC applications (Admin only)
   */
  @Get('admin/pending')
  @RequirePermission('kyc:review')
  @ApiOperation({
    summary: 'Get pending KYC applications',
    description: 'Admin endpoint to retrieve all pending KYC applications',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pending KYC applications retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async getPendingApplications(
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.kycService.getPendingApplications(
      limit ? parseInt(limit.toString(), 10) : 50,
      offset ? parseInt(offset.toString(), 10) : 0,
    );
  }

  /**
   * Initiate external KYC verification
   */
  @Post('provider/initiate')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('org:admin')
  @ApiOperation({
    summary: 'Initiate external KYC verification',
    description: 'Start verification process with external KYC provider (Onfido, Jumio, etc.)',
  })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Verification initiated successfully',
    schema: {
      properties: {
        applicantId: { type: 'string', example: 'onfido_applicant_abc123' },
        provider: { type: 'string', example: 'onfido' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'KYC application not found or already initiated',
  })
  async initiateProviderVerification(
    @Param('orgId') orgId: string,
    @Req() req: Request,
  ) {
    const userId = (req.user as any)?.id;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] as string;

    const result = await this.kycProviderService.initiateVerification(
      orgId,
      userId,
      ipAddress,
    );

    return {
      ...result,
      provider: this.kycProviderService.getProviderType(),
    };
  }

  /**
   * Submit document to external provider
   */
  @Post('provider/document/:documentType')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('org:admin')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Submit document to KYC provider',
    description: 'Upload verification document directly to external KYC provider',
  })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({
    name: 'documentType',
    description: 'Document type',
    enum: ['id_document', 'address_proof', 'business_document'],
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Document submitted successfully',
    schema: {
      properties: {
        documentId: { type: 'string', example: 'doc_abc123' },
        provider: { type: 'string', example: 'onfido' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid document or verification not initiated',
  })
  async submitDocumentToProvider(
    @Param('orgId') orgId: string,
    @Param('documentType') documentType: 'id_document' | 'address_proof' | 'business_document',
    @UploadedFile() file: any,
    @Req() req: Request,
  ) {
    const userId = (req.user as any)?.id;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] as string;

    if (!file) {
      throw new BadRequestException('File is required');
    }

    const result = await this.kycProviderService.submitDocument(
      orgId,
      userId,
      documentType,
      file.buffer,
      file.originalname,
      file.mimetype,
      ipAddress,
    );

    return {
      ...result,
      provider: this.kycProviderService.getProviderType(),
    };
  }

  /**
   * Create verification check with provider
   */
  @Post('provider/check')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('org:admin')
  @ApiOperation({
    summary: 'Create verification check',
    description: 'Initiate verification check with external KYC provider',
  })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Verification check created successfully',
    schema: {
      properties: {
        checkId: { type: 'string', example: 'check_abc123' },
        status: { type: 'string', example: 'in_progress' },
        provider: { type: 'string', example: 'onfido' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Documents not uploaded or verification not initiated',
  })
  async createProviderCheck(
    @Param('orgId') orgId: string,
    @Req() req: Request,
  ) {
    const userId = (req.user as any)?.id;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] as string;

    const result = await this.kycProviderService.createVerificationCheck(
      orgId,
      userId,
      ipAddress,
    );

    return {
      ...result,
      provider: this.kycProviderService.getProviderType(),
    };
  }

  /**
   * Get verification check status
   */
  @Get('provider/check/:checkId')
  @RequirePermission('org:read')
  @ApiOperation({
    summary: 'Get verification check status',
    description: 'Retrieve current status of a verification check from provider',
  })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'checkId', description: 'Check ID from provider' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Check status retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Check not found',
  })
  async getProviderCheckStatus(
    @Param('orgId') orgId: string,
    @Param('checkId') checkId: string,
  ) {
    const result = await this.kycProviderService.getCheckStatus(checkId);

    return {
      ...result,
      provider: this.kycProviderService.getProviderType(),
    };
  }
}
