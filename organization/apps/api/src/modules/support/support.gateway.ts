import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { SupportService } from './support.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
  sessionId?: string;
}

interface ChatMessage {
  sessionId: string;
  message: string;
  attachments?: string[];
}

interface JoinSessionPayload {
  sessionId: string;
}

interface TypingPayload {
  sessionId: string;
  isTyping: boolean;
}

@WebSocketGateway({
  namespace: '/support-chat',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class SupportGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SupportGateway.name);
  private connectedClients: Map<string, AuthenticatedSocket> = new Map();
  private sessionParticipants: Map<string, Set<string>> = new Map();

  constructor(
    private readonly supportService: SupportService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('Support Chat WebSocket Gateway initialized');
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = this.extractToken(client);

      if (token) {
        const payload = await this.verifyToken(token);
        if (payload) {
          client.userId = payload.sub;
          client.userRole = payload.role;
          this.logger.log(`Authenticated user connected: ${payload.sub}`);
        }
      }

      this.connectedClients.set(client.id, client);
      this.logger.log(`Client connected: ${client.id}`);

      client.emit('connected', {
        clientId: client.id,
        authenticated: !!client.userId,
      });
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.emit('error', { message: 'Connection failed' });
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.connectedClients.delete(client.id);

    // Remove from all sessions
    this.sessionParticipants.forEach((participants, sessionId) => {
      if (participants.has(client.id)) {
        participants.delete(client.id);
        // Notify others in session
        this.server.to(sessionId).emit('participant-left', {
          sessionId,
          clientId: client.id,
          userId: client.userId,
        });
      }
    });

    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-session')
  async handleJoinSession(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: JoinSessionPayload,
  ) {
    const { sessionId } = payload;

    try {
      // Verify session exists
      const messages = await this.supportService.getChatMessages(sessionId);

      // Join the socket room
      client.join(sessionId);
      client.sessionId = sessionId;

      // Track participants
      if (!this.sessionParticipants.has(sessionId)) {
        this.sessionParticipants.set(sessionId, new Set());
      }
      this.sessionParticipants.get(sessionId)?.add(client.id);

      // Notify others in the session
      client.to(sessionId).emit('participant-joined', {
        sessionId,
        clientId: client.id,
        userId: client.userId,
        isStaff: client.userRole === 'ADMIN',
      });

      // Send chat history to the joining client
      client.emit('session-joined', {
        sessionId,
        messages,
        participantCount: this.sessionParticipants.get(sessionId)?.size || 1,
      });

      this.logger.log(`Client ${client.id} joined session ${sessionId}`);
    } catch (error) {
      client.emit('error', { message: 'Failed to join session', error: error.message });
    }
  }

  @SubscribeMessage('leave-session')
  async handleLeaveSession(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: JoinSessionPayload,
  ) {
    const { sessionId } = payload;

    client.leave(sessionId);
    client.sessionId = undefined;

    // Remove from participants
    this.sessionParticipants.get(sessionId)?.delete(client.id);

    // Notify others
    this.server.to(sessionId).emit('participant-left', {
      sessionId,
      clientId: client.id,
      userId: client.userId,
    });

    this.logger.log(`Client ${client.id} left session ${sessionId}`);
  }

  @SubscribeMessage('send-message')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: ChatMessage,
  ) {
    const { sessionId, message, attachments } = payload;

    try {
      const isStaff = client.userRole === 'ADMIN';

      // Save message to database
      const savedMessage = await this.supportService.sendChatMessage(
        sessionId,
        client.userId || null,
        { message, attachments },
        isStaff,
      );

      // Broadcast to all participants in the session
      this.server.to(sessionId).emit('new-message', {
        sessionId,
        message: savedMessage,
        timestamp: new Date().toISOString(),
      });

      // Acknowledge to sender
      client.emit('message-sent', {
        success: true,
        messageId: savedMessage.id,
      });

      this.logger.log(`Message sent in session ${sessionId} by ${client.id}`);
    } catch (error) {
      client.emit('error', { message: 'Failed to send message', error: error.message });
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: TypingPayload,
  ) {
    const { sessionId, isTyping } = payload;

    // Broadcast typing status to others in the session
    client.to(sessionId).emit('user-typing', {
      sessionId,
      userId: client.userId,
      clientId: client.id,
      isTyping,
      isStaff: client.userRole === 'ADMIN',
    });
  }

  @SubscribeMessage('start-session')
  async handleStartSession(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { guestName?: string; guestEmail?: string; initialMessage?: string },
  ) {
    try {
      const session = await this.supportService.startChatSession(
        client.userId || null,
        {
          guestName: payload.guestName,
          guestEmail: payload.guestEmail,
          initialMessage: payload.initialMessage,
        },
      );

      // Join the new session room
      client.join(session.id);
      client.sessionId = session.id;

      // Track participant
      this.sessionParticipants.set(session.id, new Set([client.id]));

      // Notify the client
      client.emit('session-started', {
        session,
      });

      // Notify staff about new waiting session
      this.notifyStaff('new-chat-session', {
        session,
        message: 'New customer waiting for support',
      });

      this.logger.log(`New chat session started: ${session.id}`);
    } catch (error) {
      client.emit('error', { message: 'Failed to start session', error: error.message });
    }
  }

  @SubscribeMessage('assign-chat')
  async handleAssignChat(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { sessionId: string },
  ) {
    if (client.userRole !== 'ADMIN') {
      client.emit('error', { message: 'Only staff can assign chats' });
      return;
    }

    try {
      const session = await this.supportService.assignChat(payload.sessionId, client.userId!);

      // Join the session
      client.join(payload.sessionId);
      client.sessionId = payload.sessionId;

      // Track participant
      this.sessionParticipants.get(payload.sessionId)?.add(client.id);

      // Notify all in session
      this.server.to(payload.sessionId).emit('chat-assigned', {
        session,
        staffId: client.userId,
      });

      this.logger.log(`Chat ${payload.sessionId} assigned to ${client.userId}`);
    } catch (error) {
      client.emit('error', { message: 'Failed to assign chat', error: error.message });
    }
  }

  @SubscribeMessage('end-session')
  async handleEndSession(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { sessionId: string },
  ) {
    if (client.userRole !== 'ADMIN') {
      client.emit('error', { message: 'Only staff can end chats' });
      return;
    }

    try {
      const session = await this.supportService.endChatSession(payload.sessionId);

      // Notify all participants
      this.server.to(payload.sessionId).emit('session-ended', {
        session,
        endedBy: client.userId,
      });

      // Cleanup
      this.sessionParticipants.delete(payload.sessionId);

      this.logger.log(`Chat session ${payload.sessionId} ended by ${client.userId}`);
    } catch (error) {
      client.emit('error', { message: 'Failed to end session', error: error.message });
    }
  }

  @SubscribeMessage('get-active-sessions')
  async handleGetActiveSessions(
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (client.userRole !== 'ADMIN') {
      client.emit('error', { message: 'Only staff can view active sessions' });
      return;
    }

    try {
      const sessions = await this.supportService.getActiveChatSessions();

      client.emit('active-sessions', {
        sessions,
      });
    } catch (error) {
      client.emit('error', { message: 'Failed to get sessions', error: error.message });
    }
  }

  // Helper methods
  private extractToken(client: Socket): string | null {
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    const token = client.handshake.auth?.token;
    if (token) {
      return token;
    }

    return null;
  }

  private async verifyToken(token: string): Promise<any> {
    try {
      const secret = this.configService.get<string>('JWT_SECRET');
      return this.jwtService.verify(token, { secret });
    } catch {
      return null;
    }
  }

  private notifyStaff(event: string, data: any) {
    // Notify all connected staff members
    this.connectedClients.forEach((client) => {
      if (client.userRole === 'ADMIN') {
        client.emit(event, data);
      }
    });
  }

  // Public method to emit events from other services
  emitToSession(sessionId: string, event: string, data: any) {
    this.server.to(sessionId).emit(event, data);
  }

  // Get online staff count
  getOnlineStaffCount(): number {
    let count = 0;
    this.connectedClients.forEach((client) => {
      if (client.userRole === 'ADMIN') {
        count++;
      }
    });
    return count;
  }
}
