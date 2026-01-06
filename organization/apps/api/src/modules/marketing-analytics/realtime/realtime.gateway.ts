import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { OnEvent } from '@nestjs/event-emitter';
import { RealtimeService } from './realtime.service';
import { WsMessageType, WsSubscribeDto } from './dto/realtime.dto';

/**
 * Real-time Analytics WebSocket Gateway
 *
 * Provides real-time event streaming and metrics updates via WebSocket.
 *
 * Channels:
 * - events: Real-time event stream
 * - users: Active users updates
 * - metrics: Metrics snapshots
 */
@WebSocketGateway({
  namespace: '/analytics/realtime',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);
  private readonly connectedClients = new Map<string, Set<string>>(); // clientId -> subscribed channels

  constructor(private readonly realtimeService: RealtimeService) {}

  afterInit(server: Server) {
    this.logger.log('Real-time Analytics WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.debug(`Client connected: ${client.id}`);
    this.connectedClients.set(client.id, new Set());

    // Send welcome message
    client.emit('message', {
      type: WsMessageType.EVENT,
      channel: 'system',
      data: { message: 'Connected to Real-time Analytics' },
      timestamp: new Date().toISOString(),
    });
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
    this.connectedClients.delete(client.id);
  }

  /**
   * Handle channel subscription
   */
  @SubscribeMessage('subscribe')
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: WsSubscribeDto,
  ) {
    const clientChannels = this.connectedClients.get(client.id) || new Set();
    const validChannels = ['events', 'users', 'metrics'];

    for (const channel of data.channels) {
      if (validChannels.includes(channel)) {
        clientChannels.add(channel);
        client.join(channel);
        this.logger.debug(`Client ${client.id} subscribed to ${channel}`);
      }
    }

    this.connectedClients.set(client.id, clientChannels);

    client.emit('message', {
      type: WsMessageType.SUBSCRIBE,
      data: { channels: Array.from(clientChannels) },
      timestamp: new Date().toISOString(),
    });

    return { success: true, channels: Array.from(clientChannels) };
  }

  /**
   * Handle channel unsubscription
   */
  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: WsSubscribeDto,
  ) {
    const clientChannels = this.connectedClients.get(client.id) || new Set();

    for (const channel of data.channels) {
      clientChannels.delete(channel);
      client.leave(channel);
      this.logger.debug(`Client ${client.id} unsubscribed from ${channel}`);
    }

    this.connectedClients.set(client.id, clientChannels);

    return { success: true, channels: Array.from(clientChannels) };
  }

  /**
   * Handle ping for connection keep-alive
   */
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('message', {
      type: WsMessageType.PONG,
      timestamp: new Date().toISOString(),
    });

    return { type: 'pong' };
  }

  /**
   * Broadcast new event to subscribers
   */
  @OnEvent('analytics.*')
  handleAnalyticsEvent(event: any) {
    this.server.to('events').emit('message', {
      type: WsMessageType.EVENT,
      channel: 'events',
      data: {
        eventId: event.eventId,
        eventType: event.eventType,
        userId: event.userId,
        sessionId: event.sessionId,
        timestamp: event.timestamp,
        page: event.context?.page,
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast active users update every 10 seconds
   */
  @Interval(10000)
  async broadcastActiveUsers() {
    try {
      const activeUsers = await this.realtimeService.getActiveUsers({ windowMinutes: 5 });

      this.server.to('users').emit('message', {
        type: WsMessageType.USERS,
        channel: 'users',
        data: {
          activeUsers: activeUsers.activeUsers,
          authenticatedUsers: activeUsers.authenticatedUsers,
          anonymousUsers: activeUsers.anonymousUsers,
          byPage: activeUsers.byPage,
          byDeviceType: activeUsers.byDeviceType,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Error broadcasting active users:', error);
    }
  }

  /**
   * Broadcast metrics snapshot every 30 seconds
   */
  @Interval(30000)
  async broadcastMetrics() {
    try {
      const metrics = await this.realtimeService.getMetricsSnapshot();

      this.server.to('metrics').emit('message', {
        type: WsMessageType.METRICS,
        channel: 'metrics',
        data: metrics,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Error broadcasting metrics:', error);
    }
  }

  /**
   * Get connected clients count
   */
  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  /**
   * Get subscribers per channel
   */
  getSubscribersPerChannel(): Record<string, number> {
    const counts: Record<string, number> = {
      events: 0,
      users: 0,
      metrics: 0,
    };

    for (const channels of this.connectedClients.values()) {
      for (const channel of channels) {
        if (counts[channel] !== undefined) {
          counts[channel]++;
        }
      }
    }

    return counts;
  }
}
