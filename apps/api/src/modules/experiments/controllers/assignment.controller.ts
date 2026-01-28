import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
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
import { AssignmentService } from '../services/assignment.service';
import {
  AssignUserDto,
  BulkAssignDto,
  GetAssignmentDto,
  AssignmentResponseDto,
  BulkAssignmentResponseDto,
  UserExperimentsDto,
} from '../dto/assignment.dto';

@ApiTags('Experiment Assignments')
@Controller('experiments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AssignmentController {
  constructor(private readonly assignmentService: AssignmentService) {}

  @Post(':id/assign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign user to experiment variant' })
  @ApiParam({ name: 'id', description: 'Experiment ID' })
  @ApiResponse({
    status: 200,
    description: 'User assigned successfully (or existing assignment returned)',
    type: AssignmentResponseDto,
  })
  @ApiResponse({
    status: 200,
    description: 'User not eligible for experiment (null returned)',
  })
  @ApiResponse({ status: 400, description: 'Experiment is not running' })
  @ApiResponse({ status: 404, description: 'Experiment not found' })
  async assignUser(
    @Param('id') experimentId: string,
    @Body() dto: AssignUserDto,
  ): Promise<AssignmentResponseDto | null> {
    return this.assignmentService.assignUser(experimentId, dto);
  }

  @Get(':id/assignment/:userId')
  @ApiOperation({ summary: 'Get user\'s assignment for an experiment' })
  @ApiParam({ name: 'id', description: 'Experiment ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Assignment details',
    type: AssignmentResponseDto,
  })
  @ApiResponse({
    status: 200,
    description: 'User not assigned to experiment (null returned)',
  })
  async getAssignment(
    @Param('id') experimentId: string,
    @Param('userId') userId: string,
  ): Promise<AssignmentResponseDto | null> {
    return this.assignmentService.getAssignment(experimentId, userId);
  }

  @Post('bulk-assign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign user to multiple experiments at once' })
  @ApiResponse({
    status: 200,
    description: 'Bulk assignment results',
    type: BulkAssignmentResponseDto,
  })
  async bulkAssign(@Body() dto: BulkAssignDto): Promise<BulkAssignmentResponseDto> {
    return this.assignmentService.bulkAssign(dto);
  }

  @Get('user/:userId/active')
  @ApiOperation({ summary: 'Get all active experiment assignments for a user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User\'s active experiments',
    type: UserExperimentsDto,
  })
  async getUserExperiments(
    @Param('userId') userId: string,
  ): Promise<UserExperimentsDto> {
    return this.assignmentService.getUserExperiments(userId);
  }
}
