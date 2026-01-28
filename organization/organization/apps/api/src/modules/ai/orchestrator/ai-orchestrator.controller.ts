/**
 * AI Orchestrator Controller
 *
 * Exposes REST endpoints for executing and managing AI workflows.
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { AIOrchestratorService } from './ai-orchestrator.service';
import {
  ExecuteWorkflowDto,
  ParallelExecutionDto,
  ChainExecutionDto,
  RegisterWorkflowDto,
} from './dto/ai-orchestrator.dto';

@ApiTags('AI Orchestrator')
@Controller('ai/orchestrator')
export class AIOrchestratorController {
  constructor(private readonly orchestrator: AIOrchestratorService) {}

  @Post('workflow/:workflowId/execute')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Execute an AI workflow' })
  @ApiResponse({ status: 200, description: 'Workflow execution result' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async executeWorkflow(
    @Param('workflowId') workflowId: string,
    @Body() dto: ExecuteWorkflowDto,
  ) {
    return this.orchestrator.executeWorkflow(workflowId, dto.input, dto.options);
  }

  @Post('parallel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Execute multiple AI services in parallel' })
  @ApiResponse({ status: 200, description: 'Parallel execution results' })
  async executeParallel(@Body() dto: ParallelExecutionDto) {
    return this.orchestrator.parallel(dto.tasks);
  }

  @Post('chain')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Chain multiple AI services sequentially' })
  @ApiResponse({ status: 200, description: 'Chain execution result' })
  async executeChain(@Body() dto: ChainExecutionDto) {
    return this.orchestrator.chain(dto.steps, dto.initialInput);
  }

  @Get('workflows')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all registered workflows' })
  @ApiResponse({ status: 200, description: 'List of workflows' })
  async listWorkflows() {
    return {
      success: true,
      workflows: this.orchestrator.getRegisteredWorkflows().map(w => ({
        id: w.id,
        name: w.name,
        description: w.description,
        version: w.version,
        stepCount: w.steps.length,
      })),
    };
  }

  @Get('execution/:executionId/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get workflow execution status' })
  @ApiResponse({ status: 200, description: 'Execution status' })
  @ApiResponse({ status: 404, description: 'Execution not found' })
  async getExecutionStatus(@Param('executionId') executionId: string) {
    const status = this.orchestrator.getExecutionStatus(executionId);
    if (!status) {
      return {
        success: false,
        error: 'Execution not found or already completed',
      };
    }
    return {
      success: true,
      executionId,
      workflowId: status.workflowId,
      startedAt: status.startedAt,
      stepResults: Array.from(status.stepResults.entries()).map(([id, result]) => ({
        stepId: id,
        status: result.status,
        duration: result.duration,
      })),
    };
  }

  @Post('workflows/register')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a custom workflow' })
  @ApiResponse({ status: 201, description: 'Workflow registered' })
  async registerWorkflow(@Body() dto: RegisterWorkflowDto) {
    this.orchestrator.registerWorkflow(dto.workflow);
    return {
      success: true,
      message: `Workflow ${dto.workflow.id} registered successfully`,
    };
  }

  // Quick action endpoints for common workflows

  @Post('quick/shopping-assistant')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Quick: Execute shopping assistant workflow' })
  async shoppingAssistant(
    @Body() body: { userId: string; message: string; sessionId?: string },
  ) {
    return this.orchestrator.executeWorkflow('shopping-assistant', body);
  }

  @Post('quick/cart-recovery')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Quick: Execute cart recovery workflow' })
  async cartRecovery(@Body() body: { userId: string; cartId?: string }) {
    return this.orchestrator.executeWorkflow('cart-recovery', body);
  }

  @Post('quick/personalized-feed')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Quick: Get personalized product feed' })
  async personalizedFeed(@Body() body: { userId: string; limit?: number }) {
    return this.orchestrator.executeWorkflow('personalized-feed', body);
  }

  @Post('quick/fraud-check')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Quick: Run fraud check workflow' })
  async fraudCheck(
    @Body() body: { userId: string; deviceInfo: Record<string, unknown>; transactionId?: string },
  ) {
    return this.orchestrator.executeWorkflow('fraud-check', body);
  }
}
