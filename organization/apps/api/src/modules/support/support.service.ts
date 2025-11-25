import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { AddTicketMessageDto } from './dto/add-ticket-message.dto';
import { CreateArticleDto } from './dto/create-article.dto';
import { CreateCannedResponseDto } from './dto/create-canned-response.dto';
import { StartChatDto } from './dto/start-chat.dto';
import { SendChatMessageDto } from './dto/send-chat-message.dto';
import { TicketStatus, TicketPriority, ChatStatus } from '@prisma/client';

@Injectable()
export class SupportService {
  constructor(private prisma: PrismaService) {}

  // ==================== Support Tickets ====================

  async createTicket(userId: string | null, dto: CreateTicketDto) {
    const ticketNumber = await this.generateTicketNumber();

    const slaDeadline = this.calculateSLADeadline(dto.priority || TicketPriority.MEDIUM);

    const ticket = await this.prisma.supportTicket.create({
      data: {
        ticketNumber,
        userId,
        guestEmail: dto.guestEmail,
        subject: dto.subject,
        description: dto.description,
        priority: dto.priority || TicketPriority.MEDIUM,
        category: dto.category,
        relatedOrderId: dto.relatedOrderId,
        tags: dto.tags || [],
        slaDeadline,
      },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
        relatedOrder: true,
      },
    });

    return ticket;
  }

  async getTickets(params: {
    userId?: string;
    assignedToId?: string;
    status?: TicketStatus;
    priority?: TicketPriority;
    category?: string;
    page?: number;
    limit?: number;
  }) {
    const { userId, assignedToId, status, priority, category, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (userId) where.userId = userId;
    if (assignedToId) where.assignedToId = assignedToId;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (category) where.category = category;

    const [tickets, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, email: true, name: true },
          },
          assignedTo: {
            select: { id: true, email: true, name: true },
          },
          _count: {
            select: { messages: true },
          },
        },
      }),
      this.prisma.supportTicket.count({ where }),
    ]);

    return {
      tickets,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getTicketById(id: string, userId?: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
        assignedTo: {
          select: { id: true, email: true, name: true },
        },
        relatedOrder: true,
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        attachments: true,
        internalNotes: {
          orderBy: { createdAt: 'desc' },
          include: {
            author: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (userId && ticket.userId !== userId) {
      throw new UnauthorizedException('Not authorized to view this ticket');
    }

    return ticket;
  }

  async updateTicket(id: string, dto: UpdateTicketDto, staffId?: string) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const updateData: any = { ...dto };

    if (dto.status === TicketStatus.RESOLVED && !ticket.resolvedAt) {
      updateData.resolvedAt = new Date();
    }

    if (dto.status === TicketStatus.CLOSED && !ticket.closedAt) {
      updateData.closedAt = new Date();
    }

    return this.prisma.supportTicket.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
        assignedTo: {
          select: { id: true, email: true, name: true },
        },
      },
    });
  }

  async assignTicket(ticketId: string, assignedToId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const staff = await this.prisma.user.findUnique({ where: { id: assignedToId } });
    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }

    return this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        assignedToId,
        status: TicketStatus.IN_PROGRESS,
      },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async addTicketMessage(ticketId: string, userId: string | null, dto: AddTicketMessageDto, isStaff: boolean = false) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: { user: true },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const user = userId ? await this.prisma.user.findUnique({ where: { id: userId } }) : null;

    const message = await this.prisma.ticketMessage.create({
      data: {
        ticketId,
        userId,
        senderName: user?.name || ticket.guestEmail || 'Guest',
        senderEmail: user?.email || ticket.guestEmail,
        message: dto.message,
        isInternal: dto.isInternal || false,
        isFromStaff: isStaff,
        attachments: dto.attachments || [],
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!ticket.firstResponseAt && isStaff) {
      await this.prisma.supportTicket.update({
        where: { id: ticketId },
        data: { firstResponseAt: new Date() },
      });
    }

    const newStatus = isStaff ? TicketStatus.WAITING_FOR_CUSTOMER : TicketStatus.WAITING_FOR_STAFF;
    if (ticket.status !== TicketStatus.RESOLVED && ticket.status !== TicketStatus.CLOSED) {
      await this.prisma.supportTicket.update({
        where: { id: ticketId },
        data: { status: newStatus },
      });
    }

    return message;
  }

  async addInternalNote(ticketId: string, authorId: string, note: string) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return this.prisma.ticketNote.create({
      data: {
        ticketId,
        authorId,
        note,
      },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  // ==================== Knowledge Base ====================

  async createArticle(authorId: string, dto: CreateArticleDto) {
    const existing = await this.prisma.knowledgeBaseArticle.findUnique({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new BadRequestException('Article with this slug already exists');
    }

    return this.prisma.knowledgeBaseArticle.create({
      data: {
        title: dto.title,
        slug: dto.slug,
        content: dto.content,
        excerpt: dto.excerpt,
        categoryId: dto.categoryId,
        tags: dto.tags || [],
        authorId,
        status: dto.status,
        isPublished: dto.isPublished || false,
        publishedAt: dto.isPublished ? new Date() : null,
      },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
        category: true,
      },
    });
  }

  async getArticles(params: {
    categoryId?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { categoryId, status, search, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (categoryId) where.categoryId = categoryId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [articles, total] = await Promise.all([
      this.prisma.knowledgeBaseArticle.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: { id: true, name: true },
          },
          category: true,
        },
      }),
      this.prisma.knowledgeBaseArticle.count({ where }),
    ]);

    return {
      articles,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getArticleBySlug(slug: string) {
    const article = await this.prisma.knowledgeBaseArticle.findUnique({
      where: { slug },
      include: {
        author: {
          select: { id: true, name: true },
        },
        category: true,
      },
    });

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    await this.prisma.knowledgeBaseArticle.update({
      where: { id: article.id },
      data: { views: { increment: 1 } },
    });

    return article;
  }

  async markArticleHelpful(id: string, helpful: boolean) {
    return this.prisma.knowledgeBaseArticle.update({
      where: { id },
      data: helpful
        ? { helpfulCount: { increment: 1 } }
        : { notHelpfulCount: { increment: 1 } },
    });
  }

  async createCategory(data: { name: string; slug: string; description?: string; parentId?: string }) {
    const existing = await this.prisma.knowledgeBaseCategory.findUnique({
      where: { slug: data.slug },
    });

    if (existing) {
      throw new BadRequestException('Category with this slug already exists');
    }

    return this.prisma.knowledgeBaseCategory.create({
      data,
    });
  }

  async getCategories() {
    return this.prisma.knowledgeBaseCategory.findMany({
      where: { isActive: true },
      include: {
        children: true,
        _count: {
          select: { articles: true },
        },
      },
      orderBy: { order: 'asc' },
    });
  }

  // ==================== Canned Responses ====================

  async createCannedResponse(createdBy: string, dto: CreateCannedResponseDto) {
    const existing = await this.prisma.cannedResponse.findUnique({
      where: { shortcut: dto.shortcut },
    });

    if (existing) {
      throw new BadRequestException('Canned response with this shortcut already exists');
    }

    return this.prisma.cannedResponse.create({
      data: {
        title: dto.title,
        shortcut: dto.shortcut,
        content: dto.content,
        category: dto.category,
        tags: dto.tags || [],
        createdBy,
      },
    });
  }

  async getCannedResponses(category?: string) {
    const where: any = { isActive: true };
    if (category) where.category = category;

    return this.prisma.cannedResponse.findMany({
      where,
      orderBy: { title: 'asc' },
    });
  }

  async getCannedResponseByShortcut(shortcut: string) {
    const response = await this.prisma.cannedResponse.findUnique({
      where: { shortcut },
    });

    if (!response || !response.isActive) {
      throw new NotFoundException('Canned response not found');
    }

    return response;
  }

  // ==================== Live Chat ====================

  async startChatSession(userId: string | null, dto: StartChatDto) {
    const session = await this.prisma.liveChatSession.create({
      data: {
        userId,
        guestName: dto.guestName,
        guestEmail: dto.guestEmail,
        status: ChatStatus.WAITING,
      },
    });

    if (dto.initialMessage) {
      await this.sendChatMessage(session.id, userId, { message: dto.initialMessage }, false);
    }

    return session;
  }

  async assignChat(sessionId: string, assignedToId: string) {
    const session = await this.prisma.liveChatSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Chat session not found');
    }

    return this.prisma.liveChatSession.update({
      where: { id: sessionId },
      data: {
        assignedToId,
        status: ChatStatus.ACTIVE,
      },
    });
  }

  async sendChatMessage(sessionId: string, senderId: string | null, dto: SendChatMessageDto, isStaff: boolean = false) {
    const session = await this.prisma.liveChatSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Chat session not found');
    }

    if (session.status === ChatStatus.ENDED) {
      throw new BadRequestException('Chat session has ended');
    }

    return this.prisma.chatMessage.create({
      data: {
        sessionId,
        senderId,
        message: dto.message,
        isFromStaff: isStaff,
        isSystem: false,
      },
      include: {
        sender: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async getChatMessages(sessionId: string) {
    return this.prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async endChatSession(sessionId: string) {
    const session = await this.prisma.liveChatSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Chat session not found');
    }

    return this.prisma.liveChatSession.update({
      where: { id: sessionId },
      data: {
        status: ChatStatus.ENDED,
        endedAt: new Date(),
      },
    });
  }

  async getActiveChatSessions(assignedToId?: string) {
    const where: any = {
      status: { in: [ChatStatus.WAITING, ChatStatus.ACTIVE] },
    };

    if (assignedToId) {
      where.assignedToId = assignedToId;
    }

    return this.prisma.liveChatSession.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        assignedTo: {
          select: { id: true, name: true },
        },
        _count: {
          select: { messages: true },
        },
      },
    });
  }

  // ==================== Helper Methods ====================

  private async generateTicketNumber(): Promise<string> {
    const prefix = 'TKT';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${timestamp}-${random}`;
  }

  private calculateSLADeadline(priority: TicketPriority): Date {
    const now = new Date();
    const hours = {
      [TicketPriority.URGENT]: 4,
      [TicketPriority.HIGH]: 24,
      [TicketPriority.MEDIUM]: 48,
      [TicketPriority.LOW]: 72,
    };

    return new Date(now.getTime() + hours[priority] * 60 * 60 * 1000);
  }

  async getTicketStats(params?: { startDate?: Date; endDate?: Date; assignedToId?: string }) {
    const where: any = {};
    if (params?.startDate || params?.endDate) {
      where.createdAt = {};
      if (params.startDate) where.createdAt.gte = params.startDate;
      if (params.endDate) where.createdAt.lte = params.endDate;
    }
    if (params?.assignedToId) {
      where.assignedToId = params.assignedToId;
    }

    const [total, open, inProgress, resolved, breached] = await Promise.all([
      this.prisma.supportTicket.count({ where }),
      this.prisma.supportTicket.count({ where: { ...where, status: TicketStatus.OPEN } }),
      this.prisma.supportTicket.count({ where: { ...where, status: TicketStatus.IN_PROGRESS } }),
      this.prisma.supportTicket.count({ where: { ...where, status: TicketStatus.RESOLVED } }),
      this.prisma.supportTicket.count({ where: { ...where, slaBreached: true } }),
    ]);

    return {
      total,
      open,
      inProgress,
      resolved,
      breached,
      slaComplianceRate: total > 0 ? ((total - breached) / total) * 100 : 100,
    };
  }
}
