import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody, ApiQuery } from '@nestjs/swagger';
import { BulkUploadService, BulkProductRow } from './bulk-upload.service';

interface UploadedFileType {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { AuthRequest } from '@/common/types/auth-request.types';
import { VendorsService } from './vendors.service';
import { IsString, IsNumber, IsOptional, IsArray, ValidateNested, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

// ==================== DTOs ====================

class BulkProductDto implements BulkProductRow {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @MinLength(10)
  description: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @Min(0)
  stock: number;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  categoryName?: string;

  @IsString()
  @IsOptional()
  sku?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsNumber()
  @IsOptional()
  weight?: number;
}

class BulkUploadDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkProductDto)
  products: BulkProductDto[];
}

@ApiTags('Vendor Bulk Upload')
@Controller('vendor/bulk-upload')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.VENDOR)
@ApiBearerAuth()
export class BulkUploadController {
  constructor(
    private readonly bulkUploadService: BulkUploadService,
    private readonly vendorsService: VendorsService,
  ) {}

  @Get('template')
  @ApiOperation({ summary: 'Download CSV template for bulk upload' })
  @ApiResponse({ status: 200, description: 'CSV template content' })
  async getTemplate() {
    const template = this.bulkUploadService.generateTemplate();
    return {
      content: template,
      filename: 'product_upload_template.csv',
      contentType: 'text/csv',
    };
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate products before bulk upload' })
  @ApiResponse({ status: 200, description: 'Validation results' })
  async validateProducts(@Request() req: AuthRequest, @Body() dto: BulkUploadDto) {
    const profile = await this.vendorsService.getVendorProfile(req.user.id);
    return this.bulkUploadService.validateProducts(profile.id, dto.products);
  }

  @Post('csv')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload CSV file for bulk product creation' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Upload job created' })
  async uploadCSV(
    @Request() req: AuthRequest,
    @UploadedFile() file: UploadedFileType,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!file.originalname.endsWith('.csv')) {
      throw new BadRequestException('Only CSV files are allowed');
    }

    const profile = await this.vendorsService.getVendorProfile(req.user.id);
    const content = file.buffer.toString('utf-8');
    const products = this.bulkUploadService.parseCSV(content);

    if (products.length === 0) {
      throw new BadRequestException('No valid products found in CSV');
    }

    // Initialize job
    const job = await this.bulkUploadService.initializeBulkUpload(
      profile.id,
      file.originalname,
      products.length,
    );

    // Process in background
    this.bulkUploadService.processBulkUpload(job.id, profile.id, products).catch((err) => {
      console.error('Bulk upload failed:', err);
    });

    return {
      jobId: job.id,
      message: 'Upload started',
      totalRows: products.length,
    };
  }

  @Post()
  @ApiOperation({ summary: 'Bulk upload products from JSON data' })
  @ApiResponse({ status: 200, description: 'Upload job created' })
  async bulkUpload(@Request() req: AuthRequest, @Body() dto: BulkUploadDto) {
    const profile = await this.vendorsService.getVendorProfile(req.user.id);

    if (dto.products.length === 0) {
      throw new BadRequestException('No products provided');
    }

    // Initialize job
    const job = await this.bulkUploadService.initializeBulkUpload(
      profile.id,
      'json_upload',
      dto.products.length,
    );

    // Process in background
    this.bulkUploadService.processBulkUpload(job.id, profile.id, dto.products).catch((err) => {
      console.error('Bulk upload failed:', err);
    });

    return {
      jobId: job.id,
      message: 'Upload started',
      totalRows: dto.products.length,
    };
  }

  @Get('jobs')
  @ApiOperation({ summary: 'Get all bulk upload jobs' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of upload jobs' })
  async getJobs(
    @Request() req: AuthRequest,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const profile = await this.vendorsService.getVendorProfile(req.user.id);
    return this.bulkUploadService.getVendorJobs(
      profile.id,
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
    );
  }

  @Get('jobs/:id')
  @ApiOperation({ summary: 'Get bulk upload job status' })
  @ApiResponse({ status: 200, description: 'Job details' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async getJobStatus(@Request() req: AuthRequest, @Param('id') jobId: string) {
    const profile = await this.vendorsService.getVendorProfile(req.user.id);
    return this.bulkUploadService.getJobStatus(jobId, profile.id);
  }

  @Delete('jobs/:id')
  @ApiOperation({ summary: 'Cancel a pending/processing upload job' })
  @ApiResponse({ status: 200, description: 'Job cancelled' })
  @ApiResponse({ status: 400, description: 'Cannot cancel job' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async cancelJob(@Request() req: AuthRequest, @Param('id') jobId: string) {
    const profile = await this.vendorsService.getVendorProfile(req.user.id);
    await this.bulkUploadService.cancelJob(jobId, profile.id);
    return { message: 'Job cancelled successfully' };
  }
}
