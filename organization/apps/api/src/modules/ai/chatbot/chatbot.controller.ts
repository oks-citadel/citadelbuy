import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ChatbotService } from './chatbot.service';
import {
  StartSessionDto,
  SendMessageDto,
  AnalyzeSentimentDto,
  SubmitFeedbackDto,
  SuggestedQuestionsDto,
  AnalyzeIntentDto,
  RequestHandoffDto,
  MobileChatDto,
  SessionResponseDto,
  MessageResponseDto,
  ConversationHistoryResponseDto,
  FeedbackResponseDto,
  SuggestedQuestionsResponseDto,
  IntentAnalysisResponseDto,
  MobileChatResponseDto,
  HandoffResponseDto,
} from './dto/chatbot.dto';

@ApiTags('AI - Intelligent Chatbot')
@Controller('ai/chatbot')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post('start')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Start a new chat session',
    description: 'Creates a new chat session and returns a unique session ID for tracking the conversation.',
  })
  @ApiResponse({
    status: 201,
    description: 'Chat session started successfully',
    type: SessionResponseDto,
  })
  async startSession(@Body() dto: StartSessionDto): Promise<SessionResponseDto> {
    return this.chatbotService.startSession(dto);
  }

  @Post('end/:sessionId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'End a chat session',
    description: 'Ends an active chat session and returns session summary.',
  })
  @ApiParam({ name: 'sessionId', description: 'The session ID to end' })
  @ApiResponse({
    status: 200,
    description: 'Chat session ended successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
  })
  async endSession(@Param('sessionId') sessionId: string) {
    return this.chatbotService.endSession(sessionId);
  }

  @Get('history/:sessionId')
  @ApiOperation({
    summary: 'Get conversation history by session',
    description: 'Retrieves the full conversation history for a specific session.',
  })
  @ApiParam({ name: 'sessionId', description: 'The session ID to get history for' })
  @ApiResponse({
    status: 200,
    description: 'Conversation history retrieved successfully',
    type: ConversationHistoryResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
  })
  async getSessionHistory(@Param('sessionId') sessionId: string): Promise<ConversationHistoryResponseDto> {
    return this.chatbotService.getSessionHistory(sessionId);
  }

  @Post('message')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send message to chatbot',
    description: 'Sends a message to the chatbot and receives a response with sentiment and intent analysis.',
  })
  @ApiResponse({
    status: 200,
    description: 'Message processed successfully',
    type: MessageResponseDto,
  })
  async sendMessage(@Body() dto: SendMessageDto): Promise<MessageResponseDto> {
    return this.chatbotService.processMessage(dto);
  }

  @Post('feedback')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Submit feedback on chatbot response',
    description: 'Allows users to rate and provide feedback on chatbot responses.',
  })
  @ApiResponse({
    status: 201,
    description: 'Feedback submitted successfully',
    type: FeedbackResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
  })
  async submitFeedback(@Body() dto: SubmitFeedbackDto): Promise<FeedbackResponseDto> {
    return this.chatbotService.submitFeedback(dto);
  }

  @Post('suggested-questions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get suggested questions',
    description: 'Returns a list of suggested questions based on context and conversation history.',
  })
  @ApiResponse({
    status: 200,
    description: 'Suggested questions retrieved successfully',
    type: SuggestedQuestionsResponseDto,
  })
  async getSuggestedQuestions(@Body() dto: SuggestedQuestionsDto): Promise<SuggestedQuestionsResponseDto> {
    return this.chatbotService.getSuggestedQuestions(dto);
  }

  @Post('analyze-intent')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Analyze message intent',
    description: 'Analyzes a message to determine user intent and extract entities.',
  })
  @ApiResponse({
    status: 200,
    description: 'Intent analysis completed successfully',
    type: IntentAnalysisResponseDto,
  })
  async analyzeIntent(@Body() dto: AnalyzeIntentDto): Promise<IntentAnalysisResponseDto> {
    return this.chatbotService.analyzeIntent(dto);
  }

  @Post('analyze-sentiment')
  @ApiOperation({
    summary: 'Analyze message sentiment',
    description: 'Analyzes the sentiment of a message (positive, negative, neutral).',
  })
  @ApiResponse({
    status: 200,
    description: 'Sentiment analysis completed successfully',
  })
  async analyzeSentiment(@Body() dto: AnalyzeSentimentDto) {
    return this.chatbotService.analyzeSentiment(dto.message);
  }

  @Get('conversation/:userId')
  @ApiOperation({
    summary: 'Get conversation history by user ID',
    description: 'Retrieves conversation history for a specific user (legacy endpoint).',
  })
  @ApiParam({ name: 'userId', description: 'The user ID to get conversation for' })
  @ApiResponse({
    status: 200,
    description: 'Conversation history retrieved successfully',
  })
  async getConversation(@Param('userId') userId: string) {
    return this.chatbotService.getConversationHistory(userId);
  }

  @Post('handoff')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Request human agent handoff',
    description: 'Requests a handoff from the chatbot to a human support agent.',
  })
  @ApiResponse({
    status: 201,
    description: 'Handoff request created successfully',
    type: HandoffResponseDto,
  })
  async requestHandoff(@Body() dto: RequestHandoffDto): Promise<HandoffResponseDto> {
    return this.chatbotService.requestHumanHandoff(dto);
  }
}

/**
 * Separate controller for the simplified mobile chat endpoint
 * This provides a simpler interface for mobile apps
 */
@ApiTags('AI - Mobile Chat')
@Controller('ai')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MobileChatController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Simple chat endpoint for mobile apps',
    description: 'A simplified chat interface that returns a response with optional product recommendations and follow-up suggestions.',
  })
  @ApiResponse({
    status: 200,
    description: 'Chat response returned successfully',
    type: MobileChatResponseDto,
  })
  async chat(@Body() dto: MobileChatDto): Promise<MobileChatResponseDto> {
    return this.chatbotService.mobileChatMessage(dto);
  }
}
