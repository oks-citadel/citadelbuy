/**
 * AI Shopping Concierge Controller
 *
 * REST API endpoints for the AI Shopping Concierge feature.
 * All endpoints are gated behind the 'ai-shopping-concierge' feature flag.
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { UseFeatureFlag } from '@/common/feature-flags/feature-flag.decorator';
import { FEATURE_FLAGS } from '@/common/feature-flags/feature-flags.interface';
import { AIConciergeService } from './ai-concierge.service';
import {
  StartConciergeSessionDto,
  SendConciergeMessageDto,
  GetRecommendationsDto,
  OrderAssistanceDto,
  SizeGuidanceDto,
  GiftFinderDto,
  CheckoutAssistanceDto,
  SubmitConciergeFeedbackDto,
  EndConciergeSessionDto,
  RequestHumanHandoffDto,
  ConciergeSessionResponseDto,
  ConciergeMessageResponseDto,
  RecommendationsResponseDto,
  OrderAssistanceResponseDto,
  SizeGuidanceResponseDto,
  GiftFinderResponseDto,
  CheckoutAssistanceResponseDto,
  ConciergeFeedbackResponseDto,
  EndSessionResponseDto,
  HumanHandoffResponseDto,
  ConversationHistoryResponseDto,
} from './dto/ai-concierge.dto';

@ApiTags('AI - Shopping Concierge')
@Controller('ai/concierge')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@UseFeatureFlag(FEATURE_FLAGS.AI_SHOPPING_CONCIERGE, {
  onDisabled: 'throw',
  errorMessage: 'AI Shopping Concierge feature is not currently available',
  statusCode: HttpStatus.FORBIDDEN,
})
export class AIConciergeController {
  constructor(private readonly conciergeService: AIConciergeService) {}

  // ==================== Session Management ====================

  @Post('session/start')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Start a new concierge session',
    description: 'Creates a new AI Shopping Concierge session with optional personalization based on user ID.',
  })
  @ApiResponse({
    status: 201,
    description: 'Concierge session started successfully',
    type: ConciergeSessionResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Feature not available',
  })
  async startSession(@Body() dto: StartConciergeSessionDto): Promise<ConciergeSessionResponseDto> {
    return this.conciergeService.startSession(dto);
  }

  @Post('session/end')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'End a concierge session',
    description: 'Ends an active concierge session and returns a summary of the interaction.',
  })
  @ApiResponse({
    status: 200,
    description: 'Session ended successfully',
    type: EndSessionResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
  })
  async endSession(@Body() dto: EndConciergeSessionDto): Promise<EndSessionResponseDto> {
    return this.conciergeService.endSession(dto);
  }

  @Get('session/:sessionId/history')
  @ApiOperation({
    summary: 'Get conversation history',
    description: 'Retrieves the full conversation history for a concierge session.',
  })
  @ApiParam({ name: 'sessionId', description: 'The session ID' })
  @ApiResponse({
    status: 200,
    description: 'Conversation history retrieved successfully',
    type: ConversationHistoryResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
  })
  async getConversationHistory(
    @Param('sessionId') sessionId: string,
  ): Promise<ConversationHistoryResponseDto> {
    return this.conciergeService.getConversationHistory(sessionId);
  }

  // ==================== Chat & Messaging ====================

  @Post('message')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send a message to the concierge',
    description: 'Sends a message to the AI Shopping Concierge and receives an intelligent response with product recommendations and suggested actions.',
  })
  @ApiResponse({
    status: 200,
    description: 'Message processed successfully',
    type: ConciergeMessageResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
  })
  async sendMessage(@Body() dto: SendConciergeMessageDto): Promise<ConciergeMessageResponseDto> {
    return this.conciergeService.sendMessage(dto);
  }

  // ==================== Product Recommendations ====================

  @Post('recommendations')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get personalized product recommendations',
    description: 'Returns personalized product recommendations based on user preferences, browsing history, and conversation context.',
  })
  @ApiResponse({
    status: 200,
    description: 'Recommendations retrieved successfully',
    type: RecommendationsResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
  })
  async getRecommendations(@Body() dto: GetRecommendationsDto): Promise<RecommendationsResponseDto> {
    return this.conciergeService.getRecommendations(dto);
  }

  // ==================== Order Assistance ====================

  @Post('order/assist')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get order assistance',
    description: 'Provides assistance with order tracking, modifications, cancellations, returns, and refunds.',
  })
  @ApiResponse({
    status: 200,
    description: 'Order assistance provided',
    type: OrderAssistanceResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Session or order not found',
  })
  async getOrderAssistance(@Body() dto: OrderAssistanceDto): Promise<OrderAssistanceResponseDto> {
    return this.conciergeService.getOrderAssistance(dto);
  }

  // ==================== Size Guidance ====================

  @Post('size-guidance')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get size guidance',
    description: 'Provides intelligent size recommendations based on measurements, previous purchases, and product-specific sizing information.',
  })
  @ApiResponse({
    status: 200,
    description: 'Size guidance provided',
    type: SizeGuidanceResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Session or product not found',
  })
  async getSizeGuidance(@Body() dto: SizeGuidanceDto): Promise<SizeGuidanceResponseDto> {
    return this.conciergeService.getSizeGuidance(dto);
  }

  // ==================== Gift Finder ====================

  @Post('gift-finder')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Find gift recommendations',
    description: 'Provides personalized gift recommendations based on occasion, recipient details, and budget.',
  })
  @ApiResponse({
    status: 200,
    description: 'Gift recommendations retrieved',
    type: GiftFinderResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
  })
  async findGifts(@Body() dto: GiftFinderDto): Promise<GiftFinderResponseDto> {
    return this.conciergeService.findGifts(dto);
  }

  // ==================== Checkout Assistance ====================

  @Post('checkout/assist')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get checkout assistance',
    description: 'Provides assistance during checkout including payment help, shipping options, coupon suggestions, and cart review.',
  })
  @ApiResponse({
    status: 200,
    description: 'Checkout assistance provided',
    type: CheckoutAssistanceResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
  })
  async getCheckoutAssistance(@Body() dto: CheckoutAssistanceDto): Promise<CheckoutAssistanceResponseDto> {
    return this.conciergeService.getCheckoutAssistance(dto);
  }

  // ==================== Feedback ====================

  @Post('feedback')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Submit feedback',
    description: 'Allows users to submit feedback on their concierge experience.',
  })
  @ApiResponse({
    status: 201,
    description: 'Feedback submitted successfully',
    type: ConciergeFeedbackResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
  })
  async submitFeedback(@Body() dto: SubmitConciergeFeedbackDto): Promise<ConciergeFeedbackResponseDto> {
    return this.conciergeService.submitFeedback(dto);
  }

  // ==================== Human Handoff ====================

  @Post('handoff')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Request human agent handoff',
    description: 'Requests a transfer from the AI concierge to a human customer service agent.',
  })
  @ApiResponse({
    status: 201,
    description: 'Handoff request created successfully',
    type: HumanHandoffResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
  })
  async requestHandoff(@Body() dto: RequestHumanHandoffDto): Promise<HumanHandoffResponseDto> {
    return this.conciergeService.requestHumanHandoff(dto);
  }
}
