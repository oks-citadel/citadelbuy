import { Test, TestingModule } from '@nestjs/testing';
import { SupportService } from './support.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { TicketStatus, TicketPriority, ChatStatus } from '@prisma/client';

describe('SupportService', () => {
  let service: SupportService;

  const mockPrismaService = {
    supportTicket: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    ticketMessage: {
      create: jest.fn(),
    },
    ticketNote: {
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    knowledgeBaseArticle: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    knowledgeBaseCategory: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    cannedResponse: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    liveChatSession: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    chatMessage: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupportService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SupportService>(SupportService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==================== Support Tickets ====================

  describe('createTicket', () => {
    it('should create a ticket successfully', async () => {
      const dto = {
        subject: 'Test Ticket',
        description: 'Test description',
        priority: TicketPriority.HIGH,
        category: 'billing',
        tags: ['urgent'],
      };

      const mockTicket = {
        id: 'ticket-123',
        ticketNumber: 'TKT-12345678-001',
        userId: 'user-123',
        ...dto,
        slaDeadline: expect.any(Date),
        user: { id: 'user-123', email: 'test@example.com', name: 'Test User' },
        relatedOrder: null,
      };

      mockPrismaService.supportTicket.create.mockResolvedValue(mockTicket);

      const result = await service.createTicket('user-123', dto);

      expect(result).toEqual(mockTicket);
      expect(mockPrismaService.supportTicket.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          subject: 'Test Ticket',
          description: 'Test description',
          priority: TicketPriority.HIGH,
          category: 'billing',
          tags: ['urgent'],
        }),
        include: expect.any(Object),
      });
    });

    it('should create a ticket with default priority MEDIUM', async () => {
      const dto = {
        subject: 'Test Ticket',
        description: 'Test description',
        category: 'general',
      };

      const mockTicket = {
        id: 'ticket-123',
        ticketNumber: 'TKT-12345678-001',
        userId: 'user-123',
        ...dto,
        priority: TicketPriority.MEDIUM,
        slaDeadline: expect.any(Date),
      };

      mockPrismaService.supportTicket.create.mockResolvedValue(mockTicket);

      await service.createTicket('user-123', dto);

      expect(mockPrismaService.supportTicket.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          priority: TicketPriority.MEDIUM,
        }),
        include: expect.any(Object),
      });
    });

    it('should create a ticket for guest users with guestEmail', async () => {
      const dto = {
        subject: 'Guest Ticket',
        description: 'Guest description',
        guestEmail: 'guest@example.com',
        category: 'inquiry',
      };

      const mockTicket = {
        id: 'ticket-124',
        ticketNumber: 'TKT-12345678-002',
        userId: null,
        guestEmail: 'guest@example.com',
        ...dto,
      };

      mockPrismaService.supportTicket.create.mockResolvedValue(mockTicket);

      const result = await service.createTicket(null, dto);

      expect(result.guestEmail).toBe('guest@example.com');
      expect(result.userId).toBeNull();
    });
  });

  describe('getTickets', () => {
    it('should return paginated tickets', async () => {
      const mockTickets = [
        { id: 'ticket-1', subject: 'Ticket 1' },
        { id: 'ticket-2', subject: 'Ticket 2' },
      ];

      mockPrismaService.supportTicket.findMany.mockResolvedValue(mockTickets);
      mockPrismaService.supportTicket.count.mockResolvedValue(10);

      const result = await service.getTickets({ page: 1, limit: 20 });

      expect(result.tickets).toEqual(mockTickets);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 10,
        totalPages: 1,
      });
    });

    it('should filter tickets by userId', async () => {
      mockPrismaService.supportTicket.findMany.mockResolvedValue([]);
      mockPrismaService.supportTicket.count.mockResolvedValue(0);

      await service.getTickets({ userId: 'user-123' });

      expect(mockPrismaService.supportTicket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user-123' }),
        }),
      );
    });

    it('should filter tickets by status and priority', async () => {
      mockPrismaService.supportTicket.findMany.mockResolvedValue([]);
      mockPrismaService.supportTicket.count.mockResolvedValue(0);

      await service.getTickets({
        status: TicketStatus.OPEN,
        priority: TicketPriority.HIGH,
      });

      expect(mockPrismaService.supportTicket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: TicketStatus.OPEN,
            priority: TicketPriority.HIGH,
          }),
        }),
      );
    });
  });

  describe('getTicketById', () => {
    it('should return a ticket by id', async () => {
      const mockTicket = {
        id: 'ticket-123',
        userId: 'user-123',
        subject: 'Test Ticket',
        messages: [],
        attachments: [],
        internalNotes: [],
      };

      mockPrismaService.supportTicket.findUnique.mockResolvedValue(mockTicket);

      const result = await service.getTicketById('ticket-123');

      expect(result).toEqual(mockTicket);
    });

    it('should throw NotFoundException if ticket not found', async () => {
      mockPrismaService.supportTicket.findUnique.mockResolvedValue(null);

      await expect(service.getTicketById('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should throw UnauthorizedException if user is not authorized', async () => {
      const mockTicket = {
        id: 'ticket-123',
        userId: 'user-123',
        subject: 'Test Ticket',
      };

      mockPrismaService.supportTicket.findUnique.mockResolvedValue(mockTicket);

      await expect(service.getTicketById('ticket-123', 'different-user')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should allow access if userId matches ticket userId', async () => {
      const mockTicket = {
        id: 'ticket-123',
        userId: 'user-123',
        subject: 'Test Ticket',
      };

      mockPrismaService.supportTicket.findUnique.mockResolvedValue(mockTicket);

      const result = await service.getTicketById('ticket-123', 'user-123');

      expect(result).toEqual(mockTicket);
    });
  });

  describe('updateTicket', () => {
    it('should update a ticket successfully', async () => {
      const existingTicket = {
        id: 'ticket-123',
        status: TicketStatus.OPEN,
        resolvedAt: null,
        closedAt: null,
      };

      const updatedTicket = {
        ...existingTicket,
        status: TicketStatus.IN_PROGRESS,
      };

      mockPrismaService.supportTicket.findUnique.mockResolvedValue(existingTicket);
      mockPrismaService.supportTicket.update.mockResolvedValue(updatedTicket);

      const result = await service.updateTicket('ticket-123', {
        status: TicketStatus.IN_PROGRESS,
      });

      expect(result.status).toBe(TicketStatus.IN_PROGRESS);
    });

    it('should set resolvedAt when status changes to RESOLVED', async () => {
      const existingTicket = {
        id: 'ticket-123',
        status: TicketStatus.OPEN,
        resolvedAt: null,
        closedAt: null,
      };

      mockPrismaService.supportTicket.findUnique.mockResolvedValue(existingTicket);
      mockPrismaService.supportTicket.update.mockResolvedValue({
        ...existingTicket,
        status: TicketStatus.RESOLVED,
        resolvedAt: new Date(),
      });

      await service.updateTicket('ticket-123', { status: TicketStatus.RESOLVED });

      expect(mockPrismaService.supportTicket.update).toHaveBeenCalledWith({
        where: { id: 'ticket-123' },
        data: expect.objectContaining({
          status: TicketStatus.RESOLVED,
          resolvedAt: expect.any(Date),
        }),
        include: expect.any(Object),
      });
    });

    it('should set closedAt when status changes to CLOSED', async () => {
      const existingTicket = {
        id: 'ticket-123',
        status: TicketStatus.RESOLVED,
        resolvedAt: new Date(),
        closedAt: null,
      };

      mockPrismaService.supportTicket.findUnique.mockResolvedValue(existingTicket);
      mockPrismaService.supportTicket.update.mockResolvedValue({
        ...existingTicket,
        status: TicketStatus.CLOSED,
        closedAt: new Date(),
      });

      await service.updateTicket('ticket-123', { status: TicketStatus.CLOSED });

      expect(mockPrismaService.supportTicket.update).toHaveBeenCalledWith({
        where: { id: 'ticket-123' },
        data: expect.objectContaining({
          closedAt: expect.any(Date),
        }),
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if ticket not found', async () => {
      mockPrismaService.supportTicket.findUnique.mockResolvedValue(null);

      await expect(
        service.updateTicket('non-existent', { status: TicketStatus.IN_PROGRESS }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('assignTicket', () => {
    it('should assign a ticket to a staff member', async () => {
      const mockTicket = { id: 'ticket-123', status: TicketStatus.OPEN };
      const mockStaff = { id: 'staff-123', name: 'Staff Member' };

      mockPrismaService.supportTicket.findUnique.mockResolvedValue(mockTicket);
      mockPrismaService.user.findUnique.mockResolvedValue(mockStaff);
      mockPrismaService.supportTicket.update.mockResolvedValue({
        ...mockTicket,
        assignedToId: 'staff-123',
        status: TicketStatus.IN_PROGRESS,
        assignedTo: mockStaff,
      });

      const result = await service.assignTicket('ticket-123', 'staff-123');

      expect(result.assignedToId).toBe('staff-123');
      expect(result.status).toBe(TicketStatus.IN_PROGRESS);
    });

    it('should throw NotFoundException if ticket not found', async () => {
      mockPrismaService.supportTicket.findUnique.mockResolvedValue(null);

      await expect(service.assignTicket('non-existent', 'staff-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if staff member not found', async () => {
      mockPrismaService.supportTicket.findUnique.mockResolvedValue({ id: 'ticket-123' });
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.assignTicket('ticket-123', 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('addTicketMessage', () => {
    it('should add a message to a ticket', async () => {
      const mockTicket = {
        id: 'ticket-123',
        userId: 'user-123',
        guestEmail: null,
        firstResponseAt: null,
        status: TicketStatus.OPEN,
        user: { name: 'Test User', email: 'test@example.com' },
      };
      const mockUser = { id: 'user-123', name: 'Test User', email: 'test@example.com' };
      const mockMessage = {
        id: 'msg-123',
        ticketId: 'ticket-123',
        message: 'Test message',
        isInternal: false,
        isFromStaff: false,
      };

      mockPrismaService.supportTicket.findUnique.mockResolvedValue(mockTicket);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.ticketMessage.create.mockResolvedValue(mockMessage);
      mockPrismaService.supportTicket.update.mockResolvedValue(mockTicket);

      const result = await service.addTicketMessage('ticket-123', 'user-123', {
        message: 'Test message',
      });

      expect(result).toEqual(mockMessage);
    });

    it('should set firstResponseAt when staff replies first time', async () => {
      const mockTicket = {
        id: 'ticket-123',
        userId: 'user-123',
        guestEmail: null,
        firstResponseAt: null,
        status: TicketStatus.OPEN,
      };
      const mockStaff = { id: 'staff-123', name: 'Staff', email: 'staff@example.com' };

      mockPrismaService.supportTicket.findUnique.mockResolvedValue(mockTicket);
      mockPrismaService.user.findUnique.mockResolvedValue(mockStaff);
      mockPrismaService.ticketMessage.create.mockResolvedValue({ id: 'msg-123' });
      mockPrismaService.supportTicket.update.mockResolvedValue(mockTicket);

      await service.addTicketMessage('ticket-123', 'staff-123', { message: 'Staff reply' }, true);

      expect(mockPrismaService.supportTicket.update).toHaveBeenCalledWith({
        where: { id: 'ticket-123' },
        data: { firstResponseAt: expect.any(Date) },
      });
    });

    it('should throw NotFoundException if ticket not found', async () => {
      mockPrismaService.supportTicket.findUnique.mockResolvedValue(null);

      await expect(
        service.addTicketMessage('non-existent', 'user-123', { message: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('addInternalNote', () => {
    it('should add an internal note to a ticket', async () => {
      const mockTicket = { id: 'ticket-123' };
      const mockNote = {
        id: 'note-123',
        ticketId: 'ticket-123',
        authorId: 'staff-123',
        note: 'Internal note',
        author: { id: 'staff-123', name: 'Staff', email: 'staff@example.com' },
      };

      mockPrismaService.supportTicket.findUnique.mockResolvedValue(mockTicket);
      mockPrismaService.ticketNote.create.mockResolvedValue(mockNote);

      const result = await service.addInternalNote('ticket-123', 'staff-123', 'Internal note');

      expect(result).toEqual(mockNote);
    });

    it('should throw NotFoundException if ticket not found', async () => {
      mockPrismaService.supportTicket.findUnique.mockResolvedValue(null);

      await expect(
        service.addInternalNote('non-existent', 'staff-123', 'Note'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==================== Knowledge Base ====================

  describe('createArticle', () => {
    it('should create a knowledge base article', async () => {
      const dto = {
        title: 'Test Article',
        slug: 'test-article',
        content: 'Article content',
        excerpt: 'Excerpt',
        categoryId: 'cat-123',
        status: 'DRAFT',
        isPublished: false,
      };

      const mockArticle = {
        id: 'article-123',
        ...dto,
        authorId: 'author-123',
        author: { id: 'author-123', name: 'Author' },
        category: { id: 'cat-123', name: 'Category' },
      };

      mockPrismaService.knowledgeBaseArticle.findUnique.mockResolvedValue(null);
      mockPrismaService.knowledgeBaseArticle.create.mockResolvedValue(mockArticle);

      const result = await service.createArticle('author-123', dto);

      expect(result).toEqual(mockArticle);
    });

    it('should throw BadRequestException if slug already exists', async () => {
      mockPrismaService.knowledgeBaseArticle.findUnique.mockResolvedValue({
        id: 'existing',
        slug: 'test-article',
      });

      await expect(
        service.createArticle('author-123', {
          title: 'Test',
          slug: 'test-article',
          content: 'Content',
          status: 'DRAFT',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getArticles', () => {
    it('should return paginated articles', async () => {
      const mockArticles = [
        { id: 'article-1', title: 'Article 1' },
        { id: 'article-2', title: 'Article 2' },
      ];

      mockPrismaService.knowledgeBaseArticle.findMany.mockResolvedValue(mockArticles);
      mockPrismaService.knowledgeBaseArticle.count.mockResolvedValue(2);

      const result = await service.getArticles({ page: 1, limit: 20 });

      expect(result.articles).toEqual(mockArticles);
      expect(result.pagination.total).toBe(2);
    });

    it('should filter articles by search term', async () => {
      mockPrismaService.knowledgeBaseArticle.findMany.mockResolvedValue([]);
      mockPrismaService.knowledgeBaseArticle.count.mockResolvedValue(0);

      await service.getArticles({ search: 'test' });

      expect(mockPrismaService.knowledgeBaseArticle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ title: expect.any(Object) }),
              expect.objectContaining({ content: expect.any(Object) }),
            ]),
          }),
        }),
      );
    });
  });

  describe('getArticleBySlug', () => {
    it('should return article and increment view count', async () => {
      const mockArticle = {
        id: 'article-123',
        slug: 'test-article',
        title: 'Test',
        views: 10,
      };

      mockPrismaService.knowledgeBaseArticle.findUnique.mockResolvedValue(mockArticle);
      mockPrismaService.knowledgeBaseArticle.update.mockResolvedValue({
        ...mockArticle,
        views: 11,
      });

      const result = await service.getArticleBySlug('test-article');

      expect(result).toEqual(mockArticle);
      expect(mockPrismaService.knowledgeBaseArticle.update).toHaveBeenCalledWith({
        where: { id: 'article-123' },
        data: { views: { increment: 1 } },
      });
    });

    it('should throw NotFoundException if article not found', async () => {
      mockPrismaService.knowledgeBaseArticle.findUnique.mockResolvedValue(null);

      await expect(service.getArticleBySlug('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('markArticleHelpful', () => {
    it('should increment helpfulCount when helpful is true', async () => {
      mockPrismaService.knowledgeBaseArticle.update.mockResolvedValue({
        id: 'article-123',
        helpfulCount: 6,
      });

      await service.markArticleHelpful('article-123', true);

      expect(mockPrismaService.knowledgeBaseArticle.update).toHaveBeenCalledWith({
        where: { id: 'article-123' },
        data: { helpfulCount: { increment: 1 } },
      });
    });

    it('should increment notHelpfulCount when helpful is false', async () => {
      mockPrismaService.knowledgeBaseArticle.update.mockResolvedValue({
        id: 'article-123',
        notHelpfulCount: 3,
      });

      await service.markArticleHelpful('article-123', false);

      expect(mockPrismaService.knowledgeBaseArticle.update).toHaveBeenCalledWith({
        where: { id: 'article-123' },
        data: { notHelpfulCount: { increment: 1 } },
      });
    });
  });

  describe('createCategory', () => {
    it('should create a knowledge base category', async () => {
      const data = {
        name: 'Test Category',
        slug: 'test-category',
        description: 'Description',
      };

      const mockCategory = { id: 'cat-123', ...data };

      mockPrismaService.knowledgeBaseCategory.findUnique.mockResolvedValue(null);
      mockPrismaService.knowledgeBaseCategory.create.mockResolvedValue(mockCategory);

      const result = await service.createCategory(data);

      expect(result).toEqual(mockCategory);
    });

    it('should throw BadRequestException if category slug exists', async () => {
      mockPrismaService.knowledgeBaseCategory.findUnique.mockResolvedValue({
        id: 'existing',
        slug: 'test-category',
      });

      await expect(
        service.createCategory({ name: 'Test', slug: 'test-category' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getCategories', () => {
    it('should return active categories', async () => {
      const mockCategories = [
        { id: 'cat-1', name: 'Category 1', children: [], _count: { articles: 5 } },
        { id: 'cat-2', name: 'Category 2', children: [], _count: { articles: 3 } },
      ];

      mockPrismaService.knowledgeBaseCategory.findMany.mockResolvedValue(mockCategories);

      const result = await service.getCategories();

      expect(result).toEqual(mockCategories);
      expect(mockPrismaService.knowledgeBaseCategory.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        include: expect.any(Object),
        orderBy: { order: 'asc' },
      });
    });
  });

  // ==================== Canned Responses ====================

  describe('createCannedResponse', () => {
    it('should create a canned response', async () => {
      const dto = {
        title: 'Greeting',
        shortcut: '/greet',
        content: 'Hello! How can I help you?',
        category: 'general',
        tags: ['greeting'],
      };

      const mockResponse = {
        id: 'canned-123',
        ...dto,
        createdBy: 'staff-123',
      };

      mockPrismaService.cannedResponse.findUnique.mockResolvedValue(null);
      mockPrismaService.cannedResponse.create.mockResolvedValue(mockResponse);

      const result = await service.createCannedResponse('staff-123', dto);

      expect(result).toEqual(mockResponse);
    });

    it('should throw BadRequestException if shortcut exists', async () => {
      mockPrismaService.cannedResponse.findUnique.mockResolvedValue({
        id: 'existing',
        shortcut: '/greet',
      });

      await expect(
        service.createCannedResponse('staff-123', {
          title: 'Greeting',
          shortcut: '/greet',
          content: 'Hello!',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getCannedResponses', () => {
    it('should return active canned responses', async () => {
      const mockResponses = [
        { id: 'canned-1', title: 'Response 1' },
        { id: 'canned-2', title: 'Response 2' },
      ];

      mockPrismaService.cannedResponse.findMany.mockResolvedValue(mockResponses);

      const result = await service.getCannedResponses();

      expect(result).toEqual(mockResponses);
    });

    it('should filter by category', async () => {
      mockPrismaService.cannedResponse.findMany.mockResolvedValue([]);

      await service.getCannedResponses('billing');

      expect(mockPrismaService.cannedResponse.findMany).toHaveBeenCalledWith({
        where: { isActive: true, category: 'billing' },
        orderBy: { title: 'asc' },
      });
    });
  });

  describe('getCannedResponseByShortcut', () => {
    it('should return a canned response by shortcut', async () => {
      const mockResponse = {
        id: 'canned-123',
        shortcut: '/greet',
        isActive: true,
      };

      mockPrismaService.cannedResponse.findUnique.mockResolvedValue(mockResponse);

      const result = await service.getCannedResponseByShortcut('/greet');

      expect(result).toEqual(mockResponse);
    });

    it('should throw NotFoundException if response not found', async () => {
      mockPrismaService.cannedResponse.findUnique.mockResolvedValue(null);

      await expect(service.getCannedResponseByShortcut('/non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if response is inactive', async () => {
      mockPrismaService.cannedResponse.findUnique.mockResolvedValue({
        id: 'canned-123',
        shortcut: '/greet',
        isActive: false,
      });

      await expect(service.getCannedResponseByShortcut('/greet')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==================== Live Chat ====================

  describe('startChatSession', () => {
    it('should start a new chat session', async () => {
      const dto = {
        guestName: 'Guest',
        guestEmail: 'guest@example.com',
        initialMessage: 'Hello',
      };

      const mockSession = {
        id: 'session-123',
        userId: null,
        guestName: 'Guest',
        guestEmail: 'guest@example.com',
        status: ChatStatus.WAITING,
      };

      mockPrismaService.liveChatSession.create.mockResolvedValue(mockSession);
      mockPrismaService.liveChatSession.findUnique.mockResolvedValue(mockSession);
      mockPrismaService.chatMessage.create.mockResolvedValue({ id: 'msg-123' });

      const result = await service.startChatSession(null, dto);

      expect(result).toEqual(mockSession);
    });

    it('should start a chat session for authenticated user', async () => {
      const dto = {};

      const mockSession = {
        id: 'session-124',
        userId: 'user-123',
        status: ChatStatus.WAITING,
      };

      mockPrismaService.liveChatSession.create.mockResolvedValue(mockSession);

      const result = await service.startChatSession('user-123', dto);

      expect(result.userId).toBe('user-123');
    });
  });

  describe('assignChat', () => {
    it('should assign a chat to a staff member', async () => {
      const mockSession = { id: 'session-123', status: ChatStatus.WAITING };

      mockPrismaService.liveChatSession.findUnique.mockResolvedValue(mockSession);
      mockPrismaService.liveChatSession.update.mockResolvedValue({
        ...mockSession,
        assignedToId: 'staff-123',
        status: ChatStatus.ACTIVE,
      });

      const result = await service.assignChat('session-123', 'staff-123');

      expect(result.assignedToId).toBe('staff-123');
      expect(result.status).toBe(ChatStatus.ACTIVE);
    });

    it('should throw NotFoundException if session not found', async () => {
      mockPrismaService.liveChatSession.findUnique.mockResolvedValue(null);

      await expect(service.assignChat('non-existent', 'staff-123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('sendChatMessage', () => {
    it('should send a chat message', async () => {
      const mockSession = {
        id: 'session-123',
        status: ChatStatus.ACTIVE,
      };

      const mockMessage = {
        id: 'msg-123',
        sessionId: 'session-123',
        message: 'Hello',
        isFromStaff: false,
      };

      mockPrismaService.liveChatSession.findUnique.mockResolvedValue(mockSession);
      mockPrismaService.chatMessage.create.mockResolvedValue(mockMessage);

      const result = await service.sendChatMessage('session-123', 'user-123', {
        message: 'Hello',
      });

      expect(result).toEqual(mockMessage);
    });

    it('should throw NotFoundException if session not found', async () => {
      mockPrismaService.liveChatSession.findUnique.mockResolvedValue(null);

      await expect(
        service.sendChatMessage('non-existent', 'user-123', { message: 'Hello' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if session has ended', async () => {
      mockPrismaService.liveChatSession.findUnique.mockResolvedValue({
        id: 'session-123',
        status: ChatStatus.ENDED,
      });

      await expect(
        service.sendChatMessage('session-123', 'user-123', { message: 'Hello' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getChatMessages', () => {
    it('should return chat messages for a session', async () => {
      const mockMessages = [
        { id: 'msg-1', message: 'Hello' },
        { id: 'msg-2', message: 'Hi there' },
      ];

      mockPrismaService.chatMessage.findMany.mockResolvedValue(mockMessages);

      const result = await service.getChatMessages('session-123');

      expect(result).toEqual(mockMessages);
      expect(mockPrismaService.chatMessage.findMany).toHaveBeenCalledWith({
        where: { sessionId: 'session-123' },
        orderBy: { createdAt: 'asc' },
        include: expect.any(Object),
      });
    });
  });

  describe('endChatSession', () => {
    it('should end a chat session', async () => {
      const mockSession = { id: 'session-123', status: ChatStatus.ACTIVE };

      mockPrismaService.liveChatSession.findUnique.mockResolvedValue(mockSession);
      mockPrismaService.liveChatSession.update.mockResolvedValue({
        ...mockSession,
        status: ChatStatus.ENDED,
        endedAt: new Date(),
      });

      const result = await service.endChatSession('session-123');

      expect(result.status).toBe(ChatStatus.ENDED);
    });

    it('should throw NotFoundException if session not found', async () => {
      mockPrismaService.liveChatSession.findUnique.mockResolvedValue(null);

      await expect(service.endChatSession('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getActiveChatSessions', () => {
    it('should return active chat sessions', async () => {
      const mockSessions = [
        { id: 'session-1', status: ChatStatus.WAITING },
        { id: 'session-2', status: ChatStatus.ACTIVE },
      ];

      mockPrismaService.liveChatSession.findMany.mockResolvedValue(mockSessions);

      const result = await service.getActiveChatSessions();

      expect(result).toEqual(mockSessions);
    });

    it('should filter by assignedToId', async () => {
      mockPrismaService.liveChatSession.findMany.mockResolvedValue([]);

      await service.getActiveChatSessions('staff-123');

      expect(mockPrismaService.liveChatSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assignedToId: 'staff-123',
          }),
        }),
      );
    });
  });

  describe('getTicketStats', () => {
    it('should return ticket statistics', async () => {
      mockPrismaService.supportTicket.count
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(20)
        .mockResolvedValueOnce(30)
        .mockResolvedValueOnce(45)
        .mockResolvedValueOnce(5);

      const result = await service.getTicketStats();

      expect(result).toEqual({
        total: 100,
        open: 20,
        inProgress: 30,
        resolved: 45,
        breached: 5,
        slaComplianceRate: 95,
      });
    });

    it('should filter by date range and assignedToId', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      mockPrismaService.supportTicket.count.mockResolvedValue(10);

      await service.getTicketStats({
        startDate,
        endDate,
        assignedToId: 'staff-123',
      });

      expect(mockPrismaService.supportTicket.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { gte: startDate, lte: endDate },
            assignedToId: 'staff-123',
          }),
        }),
      );
    });

    it('should return 100% SLA compliance when no tickets', async () => {
      mockPrismaService.supportTicket.count.mockResolvedValue(0);

      const result = await service.getTicketStats();

      expect(result.slaComplianceRate).toBe(100);
    });
  });
});
