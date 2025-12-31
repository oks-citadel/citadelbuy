import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ChatbotService } from './chatbot.service';

@ApiTags('AI - Intelligent Chatbot')
@Controller('ai/chatbot')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post('message')
  @ApiOperation({ summary: 'Send message to chatbot' })
  async sendMessage(@Body() messageData: any) {
    return this.chatbotService.processMessage(messageData);
  }

  @Post('analyze-sentiment')
  @ApiOperation({ summary: 'Analyze message sentiment' })
  async analyzeSentiment(@Body('message') message: string) {
    return this.chatbotService.analyzeSentiment(message);
  }

  @Get('conversation/:userId')
  @ApiOperation({ summary: 'Get conversation history' })
  async getConversation(@Param('userId') userId: string) {
    return this.chatbotService.getConversationHistory(userId);
  }

  @Post('handoff')
  @ApiOperation({ summary: 'Request human agent handoff' })
  async requestHandoff(@Body() handoffData: any) {
    return this.chatbotService.requestHumanHandoff(handoffData);
  }
}
