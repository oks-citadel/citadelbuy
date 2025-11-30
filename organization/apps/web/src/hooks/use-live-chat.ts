'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { tokenManager } from '@/lib/api-client';

interface ChatMessage {
  id: string;
  message: string;
  senderId: string | null;
  isFromStaff: boolean;
  isSystem: boolean;
  createdAt: string;
  sender?: {
    id: string;
    name: string;
  };
}

interface ChatSession {
  id: string;
  userId: string | null;
  guestName: string | null;
  guestEmail: string | null;
  status: 'WAITING' | 'ACTIVE' | 'ENDED';
  assignedToId: string | null;
  startedAt: string;
  endedAt: string | null;
}

interface TypingUser {
  userId: string | null;
  clientId: string;
  isStaff: boolean;
}

interface UseLiveChatOptions {
  autoConnect?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

interface UseLiveChatReturn {
  isConnected: boolean;
  isConnecting: boolean;
  session: ChatSession | null;
  messages: ChatMessage[];
  typingUsers: TypingUser[];
  error: string | null;
  connect: () => void;
  disconnect: () => void;
  startSession: (guestName?: string, guestEmail?: string, initialMessage?: string) => void;
  joinSession: (sessionId: string) => void;
  leaveSession: () => void;
  sendMessage: (message: string, attachments?: string[]) => void;
  setTyping: (isTyping: boolean) => void;
  endSession: () => void;
}

const SOCKET_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';

export function useLiveChat(options: UseLiveChatOptions = {}): UseLiveChatReturn {
  const { autoConnect = false, onConnect, onDisconnect, onError } = options;

  const socketRef = useRef<Socket | null>(null);
  const accessToken = tokenManager.getAccessToken();

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    setIsConnecting(true);
    setError(null);

    const socket = io(`${SOCKET_URL}/support-chat`, {
      transports: ['websocket', 'polling'],
      auth: accessToken ? { token: accessToken } : undefined,
      autoConnect: true,
    });

    socket.on('connect', () => {
      setIsConnected(true);
      setIsConnecting(false);
      onConnect?.();
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      onDisconnect?.();
    });

    socket.on('connect_error', (err) => {
      setIsConnecting(false);
      setError(err.message);
      onError?.(err);
    });

    socket.on('error', (data: { message: string }) => {
      setError(data.message);
    });

    socket.on('connected', (data: { clientId: string; authenticated: boolean }) => {
      console.log('Connected to support chat:', data);
    });

    socket.on('session-started', (data: { session: ChatSession }) => {
      setSession(data.session);
      setMessages([]);
    });

    socket.on('session-joined', (data: { sessionId: string; messages: ChatMessage[]; participantCount: number }) => {
      setMessages(data.messages);
    });

    socket.on('new-message', (data: { sessionId: string; message: ChatMessage }) => {
      setMessages((prev) => [...prev, data.message]);
    });

    socket.on('message-sent', (data: { success: boolean; messageId: string }) => {
      // Message confirmed
    });

    socket.on('user-typing', (data: { sessionId: string; userId: string | null; clientId: string; isTyping: boolean; isStaff: boolean }) => {
      if (data.isTyping) {
        setTypingUsers((prev) => {
          const exists = prev.find((u) => u.clientId === data.clientId);
          if (exists) return prev;
          return [...prev, { userId: data.userId, clientId: data.clientId, isStaff: data.isStaff }];
        });
      } else {
        setTypingUsers((prev) => prev.filter((u) => u.clientId !== data.clientId));
      }
    });

    socket.on('chat-assigned', (data: { session: ChatSession; staffId: string }) => {
      setSession(data.session);
    });

    socket.on('session-ended', (data: { session: ChatSession }) => {
      setSession(data.session);
    });

    socket.on('participant-joined', (data: { sessionId: string; clientId: string; userId: string; isStaff: boolean }) => {
      // Handle participant joining
    });

    socket.on('participant-left', (data: { sessionId: string; clientId: string; userId: string }) => {
      setTypingUsers((prev) => prev.filter((u) => u.clientId !== data.clientId));
    });

    socketRef.current = socket;
  }, [accessToken, onConnect, onDisconnect, onError]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      setSession(null);
      setMessages([]);
      setTypingUsers([]);
    }
  }, []);

  const startSession = useCallback((guestName?: string, guestEmail?: string, initialMessage?: string) => {
    if (!socketRef.current?.connected) {
      setError('Not connected to chat server');
      return;
    }

    socketRef.current.emit('start-session', {
      guestName,
      guestEmail,
      initialMessage,
    });
  }, []);

  const joinSession = useCallback((sessionId: string) => {
    if (!socketRef.current?.connected) {
      setError('Not connected to chat server');
      return;
    }

    socketRef.current.emit('join-session', { sessionId });
  }, []);

  const leaveSession = useCallback(() => {
    if (!socketRef.current?.connected || !session) return;

    socketRef.current.emit('leave-session', { sessionId: session.id });
    setSession(null);
    setMessages([]);
    setTypingUsers([]);
  }, [session]);

  const sendMessage = useCallback((message: string, attachments?: string[]) => {
    if (!socketRef.current?.connected || !session) {
      setError('Not connected to chat or no active session');
      return;
    }

    socketRef.current.emit('send-message', {
      sessionId: session.id,
      message,
      attachments,
    });
  }, [session]);

  const setTyping = useCallback((isTyping: boolean) => {
    if (!socketRef.current?.connected || !session) return;

    socketRef.current.emit('typing', {
      sessionId: session.id,
      isTyping,
    });
  }, [session]);

  const endSession = useCallback(() => {
    if (!socketRef.current?.connected || !session) return;

    socketRef.current.emit('end-session', { sessionId: session.id });
  }, [session]);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    isConnected,
    isConnecting,
    session,
    messages,
    typingUsers,
    error,
    connect,
    disconnect,
    startSession,
    joinSession,
    leaveSession,
    sendMessage,
    setTyping,
    endSession,
  };
}

// Staff-specific hook
export function useStaffLiveChat(options: UseLiveChatOptions = {}) {
  const baseChat = useLiveChat(options);
  const socketRef = useRef<Socket | null>(null);
  const [activeSessions, setActiveSessions] = useState<ChatSession[]>([]);

  const getActiveSessions = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('get-active-sessions');
    }
  }, []);

  const assignChat = useCallback((sessionId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('assign-chat', { sessionId });
    }
  }, []);

  useEffect(() => {
    if (baseChat.isConnected) {
      // Listen for new sessions
      const socket = (baseChat as any).socketRef?.current;
      if (socket) {
        socketRef.current = socket;

        socket.on('new-chat-session', (data: { session: ChatSession }) => {
          setActiveSessions((prev) => [data.session, ...prev]);
        });

        socket.on('active-sessions', (data: { sessions: ChatSession[] }) => {
          setActiveSessions(data.sessions);
        });

        socket.on('session-ended', () => {
          getActiveSessions();
        });
      }
    }
  }, [baseChat.isConnected, getActiveSessions]);

  return {
    ...baseChat,
    activeSessions,
    getActiveSessions,
    assignChat,
  };
}
