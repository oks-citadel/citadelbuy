import { Test, TestingModule } from '@nestjs/testing';
import { SupportGateway } from './support.gateway';
import { SupportService } from './support.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

describe('SupportGateway', () => {
  let gateway: SupportGateway;
  let supportService: SupportService;
  let jwtService: JwtService;
  let configService: ConfigService;

  const mockSupportService = {
    getChatMessages: jest.fn(),
    sendChatMessage: jest.fn(),
    startChatSession: jest.fn(),
    assignChat: jest.fn(),
    endChatSession: jest.fn(),
    getActiveChatSessions: jest.fn(),
  };

  const mockJwtService = {
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const createMockClient = (overrides = {}) => ({
    id: 'client-123',
    userId: undefined,
    userRole: undefined,
    sessionId: undefined,
    handshake: {
      headers: { authorization: undefined },
      auth: { token: undefined },
    },
    emit: jest.fn(),
    join: jest.fn(),
    leave: jest.fn(),
    to: jest.fn().mockReturnThis(),
    ...overrides,
  });

  const createMockServer = () => ({
    to: jest.fn().mockReturnValue({
      emit: jest.fn(),
    }),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupportGateway,
        {
          provide: SupportService,
          useValue: mockSupportService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    gateway = module.get<SupportGateway>(SupportGateway);
    supportService = module.get<SupportService>(SupportService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);

    // Initialize the server mock
    (gateway as any).server = createMockServer();
    (gateway as any).connectedClients = new Map();
    (gateway as any).sessionParticipants = new Map();

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('afterInit', () => {
    it('should log initialization message', () => {
      const logSpy = jest.spyOn((gateway as any).logger, 'log');

      gateway.afterInit({});

      expect(logSpy).toHaveBeenCalledWith('Support Chat WebSocket Gateway initialized');
    });
  });

  describe('handleConnection', () => {
    it('should handle connection without authentication', async () => {
      const client = createMockClient();

      await gateway.handleConnection(client);

      expect(client.emit).toHaveBeenCalledWith('connected', {
        clientId: 'client-123',
        authenticated: false,
      });
      expect((gateway as any).connectedClients.get('client-123')).toBe(client);
    });

    it('should authenticate user with Bearer token', async () => {
      const client = createMockClient({
        handshake: {
          headers: { authorization: 'Bearer valid-token' },
          auth: {},
        },
      });

      mockConfigService.get.mockReturnValue('jwt-secret');
      mockJwtService.verify.mockReturnValue({ sub: 'user-123', role: 'CUSTOMER' });

      await gateway.handleConnection(client);

      expect(client.userId).toBe('user-123');
      expect(client.userRole).toBe('CUSTOMER');
      expect(client.emit).toHaveBeenCalledWith('connected', {
        clientId: 'client-123',
        authenticated: true,
      });
    });

    it('should authenticate user with auth token', async () => {
      const client = createMockClient({
        handshake: {
          headers: {},
          auth: { token: 'valid-token' },
        },
      });

      mockConfigService.get.mockReturnValue('jwt-secret');
      mockJwtService.verify.mockReturnValue({ sub: 'user-456', role: 'ADMIN' });

      await gateway.handleConnection(client);

      expect(client.userId).toBe('user-456');
      expect(client.userRole).toBe('ADMIN');
    });

    it('should handle invalid token gracefully', async () => {
      const client = createMockClient({
        handshake: {
          headers: { authorization: 'Bearer invalid-token' },
          auth: {},
        },
      });

      mockConfigService.get.mockReturnValue('jwt-secret');
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await gateway.handleConnection(client);

      expect(client.userId).toBeUndefined();
      expect(client.emit).toHaveBeenCalledWith('connected', {
        clientId: 'client-123',
        authenticated: false,
      });
    });

    it('should emit error on connection failure', async () => {
      const client = createMockClient();
      const error = new Error('Connection error');

      jest.spyOn((gateway as any), 'extractToken').mockImplementation(() => {
        throw error;
      });

      await gateway.handleConnection(client);

      expect(client.emit).toHaveBeenCalledWith('error', { message: 'Connection failed' });
    });
  });

  describe('handleDisconnect', () => {
    it('should remove client from connected clients', () => {
      const client = createMockClient();
      (gateway as any).connectedClients.set('client-123', client);

      gateway.handleDisconnect(client);

      expect((gateway as any).connectedClients.has('client-123')).toBe(false);
    });

    it('should notify other participants when leaving sessions', () => {
      const client = createMockClient({ userId: 'user-123' });
      (gateway as any).connectedClients.set('client-123', client);
      (gateway as any).sessionParticipants.set('session-123', new Set(['client-123']));

      gateway.handleDisconnect(client);

      expect((gateway as any).server.to).toHaveBeenCalledWith('session-123');
    });
  });

  describe('handleJoinSession', () => {
    it('should join a session successfully', async () => {
      const client = createMockClient();
      const messages = [{ id: 'msg-1', message: 'Hello' }];

      mockSupportService.getChatMessages.mockResolvedValue(messages);

      await gateway.handleJoinSession(client, { sessionId: 'session-123' });

      expect(client.join).toHaveBeenCalledWith('session-123');
      expect(client.sessionId).toBe('session-123');
      expect(client.emit).toHaveBeenCalledWith('session-joined', {
        sessionId: 'session-123',
        messages,
        participantCount: 1,
      });
    });

    it('should notify other participants when joining', async () => {
      const client = createMockClient({ userId: 'user-123', userRole: 'ADMIN' });
      const mockTo = { emit: jest.fn() };
      client.to = jest.fn().mockReturnValue(mockTo);

      mockSupportService.getChatMessages.mockResolvedValue([]);

      await gateway.handleJoinSession(client, { sessionId: 'session-123' });

      expect(client.to).toHaveBeenCalledWith('session-123');
      expect(mockTo.emit).toHaveBeenCalledWith('participant-joined', {
        sessionId: 'session-123',
        clientId: 'client-123',
        userId: 'user-123',
        isStaff: true,
      });
    });

    it('should emit error on failure', async () => {
      const client = createMockClient();

      mockSupportService.getChatMessages.mockRejectedValue(new Error('Session not found'));

      await gateway.handleJoinSession(client, { sessionId: 'session-123' });

      expect(client.emit).toHaveBeenCalledWith('error', {
        message: 'Failed to join session',
        error: 'Session not found',
      });
    });
  });

  describe('handleLeaveSession', () => {
    it('should leave a session', async () => {
      const client = createMockClient({ sessionId: 'session-123' });
      (gateway as any).sessionParticipants.set('session-123', new Set(['client-123']));

      await gateway.handleLeaveSession(client, { sessionId: 'session-123' });

      expect(client.leave).toHaveBeenCalledWith('session-123');
      expect(client.sessionId).toBeUndefined();
      expect((gateway as any).sessionParticipants.get('session-123').has('client-123')).toBe(false);
    });

    it('should notify other participants', async () => {
      const client = createMockClient({ userId: 'user-123' });
      (gateway as any).sessionParticipants.set('session-123', new Set(['client-123']));

      await gateway.handleLeaveSession(client, { sessionId: 'session-123' });

      expect((gateway as any).server.to).toHaveBeenCalledWith('session-123');
    });
  });

  describe('handleSendMessage', () => {
    it('should send a message as customer', async () => {
      const client = createMockClient({ userId: 'user-123', userRole: 'CUSTOMER' });
      const savedMessage = { id: 'msg-123', message: 'Hello' };

      mockSupportService.sendChatMessage.mockResolvedValue(savedMessage);

      await gateway.handleSendMessage(client, {
        sessionId: 'session-123',
        message: 'Hello',
      });

      expect(mockSupportService.sendChatMessage).toHaveBeenCalledWith(
        'session-123',
        'user-123',
        { message: 'Hello', attachments: undefined },
        false,
      );
      expect((gateway as any).server.to).toHaveBeenCalledWith('session-123');
      expect(client.emit).toHaveBeenCalledWith('message-sent', {
        success: true,
        messageId: 'msg-123',
      });
    });

    it('should send a message as staff', async () => {
      const client = createMockClient({ userId: 'staff-123', userRole: 'ADMIN' });
      const savedMessage = { id: 'msg-124', message: 'Staff reply' };

      mockSupportService.sendChatMessage.mockResolvedValue(savedMessage);

      await gateway.handleSendMessage(client, {
        sessionId: 'session-123',
        message: 'Staff reply',
      });

      expect(mockSupportService.sendChatMessage).toHaveBeenCalledWith(
        'session-123',
        'staff-123',
        expect.any(Object),
        true,
      );
    });

    it('should handle unauthenticated user', async () => {
      const client = createMockClient();
      const savedMessage = { id: 'msg-125', message: 'Guest message' };

      mockSupportService.sendChatMessage.mockResolvedValue(savedMessage);

      await gateway.handleSendMessage(client, {
        sessionId: 'session-123',
        message: 'Guest message',
      });

      expect(mockSupportService.sendChatMessage).toHaveBeenCalledWith(
        'session-123',
        null,
        expect.any(Object),
        false,
      );
    });

    it('should emit error on failure', async () => {
      const client = createMockClient({ userId: 'user-123' });

      mockSupportService.sendChatMessage.mockRejectedValue(new Error('Send failed'));

      await gateway.handleSendMessage(client, {
        sessionId: 'session-123',
        message: 'Hello',
      });

      expect(client.emit).toHaveBeenCalledWith('error', {
        message: 'Failed to send message',
        error: 'Send failed',
      });
    });
  });

  describe('handleTyping', () => {
    it('should broadcast typing status', () => {
      const client = createMockClient({ userId: 'user-123', userRole: 'CUSTOMER' });
      const mockTo = { emit: jest.fn() };
      client.to = jest.fn().mockReturnValue(mockTo);

      gateway.handleTyping(client, { sessionId: 'session-123', isTyping: true });

      expect(client.to).toHaveBeenCalledWith('session-123');
      expect(mockTo.emit).toHaveBeenCalledWith('user-typing', {
        sessionId: 'session-123',
        userId: 'user-123',
        clientId: 'client-123',
        isTyping: true,
        isStaff: false,
      });
    });

    it('should indicate staff typing', () => {
      const client = createMockClient({ userId: 'staff-123', userRole: 'ADMIN' });
      const mockTo = { emit: jest.fn() };
      client.to = jest.fn().mockReturnValue(mockTo);

      gateway.handleTyping(client, { sessionId: 'session-123', isTyping: true });

      expect(mockTo.emit).toHaveBeenCalledWith('user-typing', expect.objectContaining({
        isStaff: true,
      }));
    });
  });

  describe('handleStartSession', () => {
    it('should start a new chat session', async () => {
      const client = createMockClient({ userId: 'user-123' });
      const session = { id: 'session-new', userId: 'user-123' };

      mockSupportService.startChatSession.mockResolvedValue(session);

      await gateway.handleStartSession(client, {
        initialMessage: 'Hello, I need help',
      });

      expect(mockSupportService.startChatSession).toHaveBeenCalledWith(
        'user-123',
        {
          guestName: undefined,
          guestEmail: undefined,
          initialMessage: 'Hello, I need help',
        },
      );
      expect(client.join).toHaveBeenCalledWith('session-new');
      expect(client.emit).toHaveBeenCalledWith('session-started', { session });
    });

    it('should start a guest session', async () => {
      const client = createMockClient();
      const session = { id: 'session-guest', userId: null };

      mockSupportService.startChatSession.mockResolvedValue(session);

      await gateway.handleStartSession(client, {
        guestName: 'Guest User',
        guestEmail: 'guest@example.com',
        initialMessage: 'Hello',
      });

      expect(mockSupportService.startChatSession).toHaveBeenCalledWith(
        null,
        {
          guestName: 'Guest User',
          guestEmail: 'guest@example.com',
          initialMessage: 'Hello',
        },
      );
    });

    it('should notify staff about new session', async () => {
      const client = createMockClient({ userId: 'user-123' });
      const staffClient = createMockClient({ id: 'staff-client', userRole: 'ADMIN' });
      const session = { id: 'session-new', userId: 'user-123' };

      (gateway as any).connectedClients.set('staff-client', staffClient);
      mockSupportService.startChatSession.mockResolvedValue(session);

      await gateway.handleStartSession(client, {});

      expect(staffClient.emit).toHaveBeenCalledWith('new-chat-session', {
        session,
        message: 'New customer waiting for support',
      });
    });

    it('should emit error on failure', async () => {
      const client = createMockClient();

      mockSupportService.startChatSession.mockRejectedValue(new Error('Start failed'));

      await gateway.handleStartSession(client, {});

      expect(client.emit).toHaveBeenCalledWith('error', {
        message: 'Failed to start session',
        error: 'Start failed',
      });
    });
  });

  describe('handleAssignChat', () => {
    it('should allow staff to assign chat', async () => {
      const client = createMockClient({ userId: 'staff-123', userRole: 'ADMIN' });
      const session = { id: 'session-123', assignedToId: 'staff-123' };

      (gateway as any).sessionParticipants.set('session-123', new Set());
      mockSupportService.assignChat.mockResolvedValue(session);

      await gateway.handleAssignChat(client, { sessionId: 'session-123' });

      expect(mockSupportService.assignChat).toHaveBeenCalledWith('session-123', 'staff-123');
      expect(client.join).toHaveBeenCalledWith('session-123');
      expect((gateway as any).server.to).toHaveBeenCalledWith('session-123');
    });

    it('should reject non-staff assignment', async () => {
      const client = createMockClient({ userId: 'user-123', userRole: 'CUSTOMER' });

      await gateway.handleAssignChat(client, { sessionId: 'session-123' });

      expect(client.emit).toHaveBeenCalledWith('error', { message: 'Only staff can assign chats' });
      expect(mockSupportService.assignChat).not.toHaveBeenCalled();
    });

    it('should emit error on failure', async () => {
      const client = createMockClient({ userId: 'staff-123', userRole: 'ADMIN' });

      mockSupportService.assignChat.mockRejectedValue(new Error('Assign failed'));

      await gateway.handleAssignChat(client, { sessionId: 'session-123' });

      expect(client.emit).toHaveBeenCalledWith('error', {
        message: 'Failed to assign chat',
        error: 'Assign failed',
      });
    });
  });

  describe('handleEndSession', () => {
    it('should allow staff to end session', async () => {
      const client = createMockClient({ userId: 'staff-123', userRole: 'ADMIN' });
      const session = { id: 'session-123', status: 'ENDED' };

      (gateway as any).sessionParticipants.set('session-123', new Set(['client-1']));
      mockSupportService.endChatSession.mockResolvedValue(session);

      await gateway.handleEndSession(client, { sessionId: 'session-123' });

      expect(mockSupportService.endChatSession).toHaveBeenCalledWith('session-123');
      expect((gateway as any).server.to).toHaveBeenCalledWith('session-123');
      expect((gateway as any).sessionParticipants.has('session-123')).toBe(false);
    });

    it('should reject non-staff ending session', async () => {
      const client = createMockClient({ userId: 'user-123', userRole: 'CUSTOMER' });

      await gateway.handleEndSession(client, { sessionId: 'session-123' });

      expect(client.emit).toHaveBeenCalledWith('error', { message: 'Only staff can end chats' });
      expect(mockSupportService.endChatSession).not.toHaveBeenCalled();
    });

    it('should emit error on failure', async () => {
      const client = createMockClient({ userId: 'staff-123', userRole: 'ADMIN' });

      mockSupportService.endChatSession.mockRejectedValue(new Error('End failed'));

      await gateway.handleEndSession(client, { sessionId: 'session-123' });

      expect(client.emit).toHaveBeenCalledWith('error', {
        message: 'Failed to end session',
        error: 'End failed',
      });
    });
  });

  describe('handleGetActiveSessions', () => {
    it('should allow staff to get active sessions', async () => {
      const client = createMockClient({ userId: 'staff-123', userRole: 'ADMIN' });
      const sessions = [
        { id: 'session-1', status: 'ACTIVE' },
        { id: 'session-2', status: 'WAITING' },
      ];

      mockSupportService.getActiveChatSessions.mockResolvedValue(sessions);

      await gateway.handleGetActiveSessions(client);

      expect(mockSupportService.getActiveChatSessions).toHaveBeenCalled();
      expect(client.emit).toHaveBeenCalledWith('active-sessions', { sessions });
    });

    it('should reject non-staff access', async () => {
      const client = createMockClient({ userId: 'user-123', userRole: 'CUSTOMER' });

      await gateway.handleGetActiveSessions(client);

      expect(client.emit).toHaveBeenCalledWith('error', { message: 'Only staff can view active sessions' });
      expect(mockSupportService.getActiveChatSessions).not.toHaveBeenCalled();
    });

    it('should emit error on failure', async () => {
      const client = createMockClient({ userId: 'staff-123', userRole: 'ADMIN' });

      mockSupportService.getActiveChatSessions.mockRejectedValue(new Error('Get failed'));

      await gateway.handleGetActiveSessions(client);

      expect(client.emit).toHaveBeenCalledWith('error', {
        message: 'Failed to get sessions',
        error: 'Get failed',
      });
    });
  });

  describe('emitToSession', () => {
    it('should emit event to a session', () => {
      const mockEmit = jest.fn();
      (gateway as any).server = {
        to: jest.fn().mockReturnValue({ emit: mockEmit }),
      };

      gateway.emitToSession('session-123', 'test-event', { data: 'test' });

      expect((gateway as any).server.to).toHaveBeenCalledWith('session-123');
      expect(mockEmit).toHaveBeenCalledWith('test-event', { data: 'test' });
    });
  });

  describe('getOnlineStaffCount', () => {
    it('should return count of online staff', () => {
      const staffClient1 = createMockClient({ id: 'staff-1', userRole: 'ADMIN' });
      const staffClient2 = createMockClient({ id: 'staff-2', userRole: 'ADMIN' });
      const customerClient = createMockClient({ id: 'customer-1', userRole: 'CUSTOMER' });

      (gateway as any).connectedClients.set('staff-1', staffClient1);
      (gateway as any).connectedClients.set('staff-2', staffClient2);
      (gateway as any).connectedClients.set('customer-1', customerClient);

      const count = gateway.getOnlineStaffCount();

      expect(count).toBe(2);
    });

    it('should return 0 when no staff online', () => {
      const customerClient = createMockClient({ id: 'customer-1', userRole: 'CUSTOMER' });

      (gateway as any).connectedClients.set('customer-1', customerClient);

      const count = gateway.getOnlineStaffCount();

      expect(count).toBe(0);
    });
  });
});
