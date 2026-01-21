import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SupportService } from './support.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { OptionalJwtAuthGuard } from '@/common/guards/optional-jwt-auth.guard';
import { UserRole, TicketStatus, TicketPriority } from '@prisma/client';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { AuthRequest, OptionalAuthRequest } from '@/common/types/auth-request.types';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { AddTicketMessageDto } from './dto/add-ticket-message.dto';
import { CreateArticleDto } from './dto/create-article.dto';
import { CreateCannedResponseDto } from './dto/create-canned-response.dto';
import { StartChatDto } from './dto/start-chat.dto';
import { SendChatMessageDto } from './dto/send-chat-message.dto';

@ApiTags('Customer Support')
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  // ==================== Support Tickets ====================

  @Post('tickets')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Create a support ticket' })
  async createTicket(@Request() req: AuthRequest, @Body() dto: CreateTicketDto) {
    const userId = req.user?.id || null;
    return this.supportService.createTicket(userId, dto);
  }

  @Get('tickets')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get support tickets' })
  async getTickets(
    @Request() req: AuthRequest,
    @Query('status') status?: TicketStatus,
    @Query('priority') priority?: TicketPriority,
    @Query('category') category?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const params: any = {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status,
      priority,
      category,
    };

    if (req.user.role === UserRole.CUSTOMER) {
      params.userId = req.user.id;
    }

    return this.supportService.getTickets(params);
  }

  @Get('tickets/assigned')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get assigned tickets (Admin)' })
  async getAssignedTickets(
    @Request() req: AuthRequest,
    @Query('status') status?: TicketStatus,
    @Query('priority') priority?: TicketPriority,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.supportService.getTickets({
      assignedToId: req.user.id,
      status,
      priority,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('tickets/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get ticket statistics (Admin)' })
  async getTicketStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('assignedToId') assignedToId?: string,
  ) {
    return this.supportService.getTicketStats({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      assignedToId,
    });
  }

  @Get('tickets/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get ticket by ID' })
  async getTicketById(@Request() req: AuthRequest, @Param('id') id: string) {
    const userId = req.user.role === UserRole.CUSTOMER ? req.user.id : undefined;
    return this.supportService.getTicketById(id, userId);
  }

  @Put('tickets/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update ticket (Admin)' })
  async updateTicket(@Request() req: AuthRequest, @Param('id') id: string, @Body() dto: UpdateTicketDto) {
    return this.supportService.updateTicket(id, dto, req.user.id);
  }

  @Post('tickets/:id/assign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign ticket to staff (Admin)' })
  async assignTicket(@Param('id') id: string, @Body() body: { assignedToId: string }) {
    return this.supportService.assignTicket(id, body.assignedToId);
  }

  @Post('tickets/:id/messages')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add message to ticket' })
  async addTicketMessage(@Request() req: AuthRequest, @Param('id') id: string, @Body() dto: AddTicketMessageDto) {
    const isStaff = req.user.role === UserRole.ADMIN;
    return this.supportService.addTicketMessage(id, req.user.id, dto, isStaff);
  }

  @Post('tickets/:id/notes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add internal note to ticket (Admin)' })
  async addInternalNote(@Request() req: AuthRequest, @Param('id') id: string, @Body() body: { note: string }) {
    return this.supportService.addInternalNote(id, req.user.id, body.note);
  }

  // ==================== Knowledge Base ====================

  @Post('knowledge-base/articles')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create knowledge base article (Admin)' })
  async createArticle(@Request() req: AuthRequest, @Body() dto: CreateArticleDto) {
    return this.supportService.createArticle(req.user.id, dto);
  }

  @Get('knowledge-base/articles')
  @ApiOperation({ summary: 'Get knowledge base articles' })
  async getArticles(
    @Query('categoryId') categoryId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.supportService.getArticles({
      categoryId,
      status,
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('knowledge-base/articles/:slug')
  @ApiOperation({ summary: 'Get article by slug' })
  async getArticleBySlug(@Param('slug') slug: string) {
    return this.supportService.getArticleBySlug(slug);
  }

  @Post('knowledge-base/articles/:id/helpful')
  @ApiOperation({ summary: 'Mark article as helpful/not helpful' })
  async markArticleHelpful(@Param('id') id: string, @Body() body: { helpful: boolean }) {
    return this.supportService.markArticleHelpful(id, body.helpful);
  }

  @Post('knowledge-base/categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create knowledge base category (Admin)' })
  async createCategory(@Body() dto: { name: string; slug: string; description?: string; parentId?: string }) {
    return this.supportService.createCategory(dto);
  }

  @Get('knowledge-base/categories')
  @ApiOperation({ summary: 'Get knowledge base categories' })
  async getCategories() {
    return this.supportService.getCategories();
  }

  // ==================== Canned Responses ====================

  @Post('canned-responses')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create canned response (Admin)' })
  async createCannedResponse(@Request() req: AuthRequest, @Body() dto: CreateCannedResponseDto) {
    return this.supportService.createCannedResponse(req.user.id, dto);
  }

  @Get('canned-responses')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get canned responses (Admin)' })
  async getCannedResponses(@Query('category') category?: string) {
    return this.supportService.getCannedResponses(category);
  }

  @Get('canned-responses/:shortcut')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get canned response by shortcut (Admin)' })
  async getCannedResponseByShortcut(@Param('shortcut') shortcut: string) {
    return this.supportService.getCannedResponseByShortcut(shortcut);
  }

  // ==================== Live Chat ====================

  @Post('chat/sessions')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Start chat session' })
  async startChatSession(@Request() req: AuthRequest, @Body() dto: StartChatDto) {
    const userId = req.user?.id || null;
    return this.supportService.startChatSession(userId, dto);
  }

  @Get('chat/sessions/active')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get active chat sessions (Admin)' })
  async getActiveChatSessions(@Request() req: AuthRequest, @Query('assignedToId') assignedToId?: string) {
    return this.supportService.getActiveChatSessions(assignedToId);
  }

  @Post('chat/sessions/:id/assign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign chat to staff (Admin)' })
  async assignChat(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.supportService.assignChat(id, req.user.id);
  }

  @Post('chat/sessions/:id/messages')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Send chat message' })
  async sendChatMessage(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: SendChatMessageDto,
    @Headers('x-chat-session-token') sessionToken?: string,
  ) {
    const userId = req.user?.id || null;
    const isStaff = req.user?.role === UserRole.ADMIN;
    return this.supportService.sendChatMessage(id, userId, dto, isStaff, sessionToken);
  }

  @Get('chat/sessions/:id/messages')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get chat messages' })
  async getChatMessages(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Headers('x-chat-session-token') sessionToken?: string,
  ) {
    const userId = req.user?.id || null;
    const isStaff = req.user?.role === UserRole.ADMIN;
    return this.supportService.getChatMessages(id, userId, isStaff, sessionToken);
  }

  @Post('chat/sessions/:id/end')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'End chat session (Admin)' })
  async endChatSession(@Param('id') id: string) {
    return this.supportService.endChatSession(id);
  }
}
