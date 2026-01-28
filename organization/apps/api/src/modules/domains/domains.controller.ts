import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Idempotent } from '@/common/idempotency';
import { DomainsService } from './domains.service';
import {
  CreateDomainDto,
  CreateSubdomainDto,
  UpdateDomainDto,
  DomainQueryDto,
  VerifyDomainDto,
} from './dto';

/**
 * Controller for tenant domain management
 * Handles domain CRUD operations and verification
 */
@ApiTags('Domains')
@Controller('domains')
export class DomainsController {
  constructor(private readonly domainsService: DomainsService) {}

  // ==================== PUBLIC ENDPOINTS ====================

  /**
   * Resolve tenant from host header
   * This is a public endpoint used for tenant resolution
   */
  @Get('resolve')
  @ApiOperation({
    summary: 'Resolve tenant from host',
    description: 'Public endpoint to resolve organization/tenant from a hostname',
  })
  @ApiQuery({
    name: 'host',
    required: true,
    description: 'The hostname to resolve (e.g., shop.vendor.com)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tenant resolved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No tenant found for this host',
  })
  async resolveTenant(@Query('host') host: string) {
    const resolution = await this.domainsService.resolveTenant(host);

    if (!resolution) {
      return {
        success: false,
        message: 'No tenant found for this host',
        host,
      };
    }

    return {
      success: true,
      data: resolution,
    };
  }

  // ==================== AUTHENTICATED ENDPOINTS ====================

  /**
   * Create a new custom domain
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Idempotent({ scope: 'domains', ttlSeconds: 3600 })
  @ApiOperation({
    summary: 'Create a new domain',
    description: 'Add a custom domain for your organization',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Domain created successfully',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Domain already exists',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid domain format or reserved domain',
  })
  async create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateDomainDto,
  ) {
    const domain = await this.domainsService.create(dto, user.id);

    // Get DNS instructions for custom domains
    const dnsInstructions = domain.domainType === 'CUSTOM'
      ? await this.domainsService.getDnsInstructions(domain.id)
      : null;

    return {
      success: true,
      data: domain,
      dnsInstructions,
      message: domain.domainType === 'CUSTOM'
        ? 'Domain created. Please configure your DNS records to complete verification.'
        : 'Subdomain created and activated.',
    };
  }

  /**
   * Create a subdomain under the platform domain
   */
  @Post('subdomain')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Idempotent({ scope: 'domains', ttlSeconds: 3600 })
  @ApiOperation({
    summary: 'Create a subdomain',
    description: 'Create a subdomain under the platform domain (e.g., mystore.broxiva.com)',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Subdomain created and activated',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Subdomain already taken',
  })
  async createSubdomain(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateSubdomainDto,
  ) {
    const domain = await this.domainsService.createSubdomain(dto, user.id);

    return {
      success: true,
      data: domain,
      message: 'Subdomain created and activated.',
    };
  }

  /**
   * List domains for an organization
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List domains',
    description: 'Get all domains for an organization with filtering and pagination',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of domains',
  })
  async findAll(@Query() query: DomainQueryDto) {
    const result = await this.domainsService.findAll(query);

    return {
      success: true,
      ...result,
    };
  }

  /**
   * Get domain by ID
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get domain details',
    description: 'Get detailed information about a specific domain',
  })
  @ApiParam({
    name: 'id',
    description: 'Domain ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Domain details',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Domain not found',
  })
  async findOne(@Param('id') id: string) {
    const domain = await this.domainsService.findOne(id);

    return {
      success: true,
      data: domain,
    };
  }

  /**
   * Get DNS configuration instructions
   */
  @Get(':id/dns-instructions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get DNS instructions',
    description: 'Get DNS configuration instructions for domain verification',
  })
  @ApiParam({
    name: 'id',
    description: 'Domain ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'DNS configuration instructions',
  })
  async getDnsInstructions(@Param('id') id: string) {
    const instructions = await this.domainsService.getDnsInstructions(id);

    return {
      success: true,
      data: instructions,
    };
  }

  /**
   * Trigger domain verification
   */
  @Post(':id/verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Verify domain',
    description: 'Trigger DNS verification for a domain',
  })
  @ApiParam({
    name: 'id',
    description: 'Domain ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Verification result',
  })
  async verify(
    @Param('id') id: string,
    @Body() dto: VerifyDomainDto,
  ) {
    const result = await this.domainsService.verify(id, dto.force);

    return {
      success: result.success,
      data: {
        status: result.status,
        details: result.details,
        errors: result.errors,
      },
      dnsInstructions: result.dnsInstructions,
      message: result.success
        ? 'Domain verified and activated successfully.'
        : 'Domain verification failed. Please check your DNS configuration.',
    };
  }

  /**
   * Update domain settings
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update domain',
    description: 'Update domain settings like primary status or redirect settings',
  })
  @ApiParam({
    name: 'id',
    description: 'Domain ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Domain updated',
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDomainDto,
  ) {
    const domain = await this.domainsService.update(id, dto);

    return {
      success: true,
      data: domain,
      message: 'Domain updated successfully.',
    };
  }

  /**
   * Delete a domain
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete domain',
    description: 'Remove a domain from your organization',
  })
  @ApiParam({
    name: 'id',
    description: 'Domain ID',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Domain deleted',
  })
  async remove(@Param('id') id: string) {
    await this.domainsService.remove(id);
  }
}

/**
 * Controller for tenant resolution endpoint
 * Separate controller to avoid auth requirements on public endpoint
 */
@ApiTags('Tenant')
@Controller('tenant')
export class TenantResolutionController {
  constructor(private readonly domainsService: DomainsService) {}

  /**
   * Resolve tenant from host header
   * This is a public endpoint used for tenant resolution
   */
  @Get('resolve')
  @ApiOperation({
    summary: 'Resolve tenant from host',
    description: 'Public endpoint to resolve organization/tenant from a hostname',
  })
  @ApiQuery({
    name: 'host',
    required: true,
    description: 'The hostname to resolve (e.g., shop.vendor.com)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tenant resolved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No tenant found for this host',
  })
  async resolveTenant(@Query('host') host: string) {
    const resolution = await this.domainsService.resolveTenant(host);

    if (!resolution) {
      return {
        success: false,
        message: 'No tenant found for this host',
        host,
      };
    }

    return {
      success: true,
      data: resolution,
    };
  }
}
