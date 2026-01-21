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
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { AdminGuard } from '@/modules/auth/guards/admin.guard';
import { ExperimentsService } from '../services/experiments.service';
import {
  CreateExperimentDto,
  UpdateExperimentDto,
  ExperimentQueryDto,
  ConcludeExperimentDto,
  ExperimentResponseDto,
  MutualExclusionGroupDto,
} from '../dto/experiment.dto';

@ApiTags('Experiments')
@Controller('experiments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ExperimentsController {
  constructor(private readonly experimentsService: ExperimentsService) {}

  @Post()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Create a new experiment' })
  @ApiResponse({
    status: 201,
    description: 'Experiment created successfully',
    type: ExperimentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid experiment configuration' })
  async create(
    @Body() dto: CreateExperimentDto,
    @Request() req: any,
  ) {
    return this.experimentsService.create(dto, req.user?.id);
  }

  @Get()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'List all experiments' })
  @ApiResponse({
    status: 200,
    description: 'List of experiments',
  })
  async findAll(@Query() query: ExperimentQueryDto) {
    return this.experimentsService.findAll(query);
  }

  @Get(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Get experiment by ID' })
  @ApiParam({ name: 'id', description: 'Experiment ID' })
  @ApiResponse({
    status: 200,
    description: 'Experiment details',
    type: ExperimentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Experiment not found' })
  async findOne(@Param('id') id: string) {
    return this.experimentsService.findOne(id);
  }

  @Put(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Update experiment' })
  @ApiParam({ name: 'id', description: 'Experiment ID' })
  @ApiResponse({
    status: 200,
    description: 'Experiment updated successfully',
    type: ExperimentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Cannot modify running experiment' })
  @ApiResponse({ status: 404, description: 'Experiment not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateExperimentDto,
    @Request() req: any,
  ) {
    return this.experimentsService.update(id, dto, req.user?.id);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Archive experiment' })
  @ApiParam({ name: 'id', description: 'Experiment ID' })
  @ApiResponse({ status: 200, description: 'Experiment archived successfully' })
  @ApiResponse({ status: 400, description: 'Cannot archive running experiment' })
  @ApiResponse({ status: 404, description: 'Experiment not found' })
  async archive(@Param('id') id: string, @Request() req: any) {
    return this.experimentsService.archive(id, req.user?.id);
  }

  @Post(':id/start')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start experiment' })
  @ApiParam({ name: 'id', description: 'Experiment ID' })
  @ApiResponse({ status: 200, description: 'Experiment started successfully' })
  @ApiResponse({ status: 400, description: 'Cannot start experiment' })
  @ApiResponse({ status: 409, description: 'Mutual exclusion conflict' })
  async start(@Param('id') id: string, @Request() req: any) {
    return this.experimentsService.start(id, req.user?.id);
  }

  @Post(':id/stop')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stop (pause) experiment' })
  @ApiParam({ name: 'id', description: 'Experiment ID' })
  @ApiResponse({ status: 200, description: 'Experiment stopped successfully' })
  @ApiResponse({ status: 400, description: 'Experiment is not running' })
  async stop(@Param('id') id: string, @Request() req: any) {
    return this.experimentsService.stop(id, req.user?.id);
  }

  @Post(':id/conclude')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Conclude experiment with winner' })
  @ApiParam({ name: 'id', description: 'Experiment ID' })
  @ApiResponse({ status: 200, description: 'Experiment concluded successfully' })
  @ApiResponse({ status: 400, description: 'Cannot conclude experiment' })
  @ApiResponse({ status: 404, description: 'Winner variant not found' })
  async conclude(
    @Param('id') id: string,
    @Body() dto: ConcludeExperimentDto,
    @Request() req: any,
  ) {
    return this.experimentsService.conclude(id, dto, req.user?.id);
  }

  @Get(':id/audit-logs')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Get experiment audit logs' })
  @ApiParam({ name: 'id', description: 'Experiment ID' })
  @ApiResponse({ status: 200, description: 'Audit logs' })
  async getAuditLogs(
    @Param('id') id: string,
    @Query('limit') limit?: number,
  ) {
    return this.experimentsService.getAuditLogs(id, limit);
  }

  // Mutual Exclusion Groups

  @Post('exclusion-groups')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Create mutual exclusion group' })
  @ApiResponse({ status: 201, description: 'Group created successfully' })
  @ApiResponse({ status: 409, description: 'Group name already exists' })
  async createExclusionGroup(@Body() dto: MutualExclusionGroupDto) {
    return this.experimentsService.createMutualExclusionGroup(dto);
  }

  @Get('exclusion-groups/list')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'List mutual exclusion groups' })
  @ApiResponse({ status: 200, description: 'List of exclusion groups' })
  async getExclusionGroups() {
    return this.experimentsService.getMutualExclusionGroups();
  }
}
