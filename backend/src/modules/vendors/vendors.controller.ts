import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { VendorsService } from './vendors.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import {
  VendorRegistrationDto,
  UpdateVendorProfileDto,
  UpdateBankingInfoDto,
  ApproveApplicationDto,
  VendorQueryDto,
} from './dto';
import { AuthRequest } from '@/common/types/auth-request.types';

@ApiTags('Vendors')
@Controller('vendors')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  // ==================== VENDOR ENDPOINTS ====================

  @Post('register')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register as a vendor' })
  async register(@Request() req: AuthRequest, @Body() dto: VendorRegistrationDto) {
    return this.vendorsService.registerVendor(req.user.userId, dto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get vendor profile' })
  async getProfile(@Request() req: AuthRequest) {
    return this.vendorsService.getVendorProfile(req.user.userId);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update vendor profile' })
  async updateProfile(@Request() req: AuthRequest, @Body() dto: UpdateVendorProfileDto) {
    return this.vendorsService.updateVendorProfile(req.user.userId, dto);
  }

  @Get('dashboard')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get vendor dashboard metrics' })
  async getDashboard(@Request() req: AuthRequest) {
    return this.vendorsService.getVendorDashboard(req.user.userId);
  }

  @Patch('banking')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update banking information' })
  async updateBanking(@Request() req: AuthRequest, @Body() dto: UpdateBankingInfoDto) {
    return this.vendorsService.updateBankingInfo(req.user.userId, dto);
  }

  @Get('payouts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get vendor payouts' })
  async getPayouts(
    @Request() req: AuthRequest,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.vendorsService.getPayouts(req.user.userId, limit, offset);
  }

  // ==================== ADMIN ENDPOINTS ====================

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all vendors (Admin only)' })
  async getAllVendors(@Query() query: VendorQueryDto) {
    return this.vendorsService.getAllVendors(query);
  }

  @Patch('applications/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve vendor application (Admin only)' })
  async approveApplication(
    @Param('id') id: string,
    @Body() dto: ApproveApplicationDto,
  ) {
    return this.vendorsService.approveVendorApplication(id, dto);
  }
}
