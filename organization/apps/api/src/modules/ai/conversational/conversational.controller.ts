import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConversationalService } from './conversational.service';
import { QueryDto, ConversationDto } from './dto/conversational.dto';

@ApiTags('AI - Conversational Commerce')
@Controller('ai/conversational')
export class ConversationalController {
  constructor(
    private readonly conversationalService: ConversationalService,
  ) {}

  @Post('query')
  @ApiOperation({ summary: 'Process natural language product query' })
  async processQuery(@Body() queryDto: QueryDto) {
    return this.conversationalService.processQuery(queryDto);
  }

  @Post('conversation')
  @ApiOperation({ summary: 'Continue multi-turn conversation' })
  async continueConversation(@Body() conversationDto: ConversationDto) {
    return this.conversationalService.continueConversation(conversationDto);
  }

  @Get('suggestions/:query')
  @ApiOperation({ summary: 'Get query suggestions' })
  async getQuerySuggestions(@Param('query') query: string) {
    return this.conversationalService.getQuerySuggestions(query);
  }

  @Post('voice')
  @ApiOperation({ summary: 'Process voice search query' })
  async processVoiceQuery(@Body('transcript') transcript: string) {
    return this.conversationalService.processQuery({ query: transcript });
  }
}
